import {expect, type Page, test} from "@playwright/test";
import {API_URL} from "./fixtures/testUsers";
import {revokeDeviceSessions} from "./helpers/focusSessions";
import {loginAs} from "./helpers/login";

// A name no real device uses, so cleanup only revokes sessions these tests created.
const TEST_DEVICE_NAME = "Sungold e2e test device";
const DEVICE_LOGIN_PATH =
  "/device-login?client=mac&redirect=sungold-mac%3A%2F%2Fauth&state=e2e-state-123&name=Sungold%20e2e%20test%20device";

// Chromium does not navigate to sungold-mac://, but DevTools reports the attempt.
const captureAppRedirect = async (page: Page): Promise<() => Promise<string>> => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.enable");
  let resolveUrl: (url: string) => void = () => undefined;
  const redirect = new Promise<string>((resolve) => {
    resolveUrl = resolve;
  });
  cdp.on("Page.frameRequestedNavigation", (event: {url: string}) => {
    if (event.url.startsWith("sungold-mac://")) {
      resolveUrl(event.url);
    }
  });
  return () => redirect;
};

test.describe("Device sign-in", () => {
  test.afterEach(async ({request}) => {
    await revokeDeviceSessions(request, TEST_DEVICE_NAME);
  });

  test("signed-in user can approve the Mac and it receives a working token", async ({
    page,
    request,
  }) => {
    await loginAs(page);
    const waitForRedirect = await captureAppRedirect(page);
    await page.goto(DEVICE_LOGIN_PATH);
    await page.getByTestId("device-login-approve").waitFor({state: "visible"});
    await expect(page.getByTestId("device-login-approve")).toContainText(TEST_DEVICE_NAME);

    await page.getByTestId("device-login-approve-button").click();
    const redirectUrl = new URL(await waitForRedirect());
    expect(`${redirectUrl.protocol}//${redirectUrl.host}`).toBe("sungold-mac://auth");
    expect(redirectUrl.searchParams.get("state")).toBe("e2e-state-123");
    await page.getByTestId("device-login-done").waitFor({state: "visible"});

    const me = await request.get(`${API_URL}/auth/me`, {
      headers: {authorization: `Bearer ${redirectUrl.searchParams.get("token")}`},
    });
    expect(me.status()).toBe(200);
  });

  test("signed-out user signs in and returns to the approval step", async ({page}) => {
    await page.goto(DEVICE_LOGIN_PATH);
    await page.getByTestId("device-login-signin-button").click();
    await page.getByTestId("login-screen").waitFor({state: "visible"});
    await page.getByTestId("login-screen-email-input").fill("e2e-focus@example.com");
    await page.getByTestId("login-screen-password-input").fill("testpassword123");
    await page.getByTestId("login-screen-submit-button").click();
    await page.getByTestId("device-login-approve").waitFor({state: "visible"});
    await expect(page).toHaveURL(/state=e2e-state-123/);
  });

  test("user sees an error for an incomplete sign-in link", async ({page}) => {
    await loginAs(page);
    await page.goto("/device-login?client=mac");
    await expect(page.getByTestId("device-login-invalid")).toBeVisible();
  });
});
