import {expect, test} from "@playwright/test";
import {API_URL, type TestUser, WEB_ORIGIN} from "./fixtures/testUsers";
import {authorizationFor} from "./helpers/focusSessions";
import {loginAs} from "./helpers/login";

const createUser = async (request: Parameters<typeof authorizationFor>[0]): Promise<TestUser> => {
  const user = {
    email: `e2e-profile-${crypto.randomUUID()}@example.com`,
    name: "E2E Profile",
    password: "testpassword123",
  };
  const signUp = await request.post(`${API_URL}/api/auth/sign-up/email`, {
    data: user,
    headers: {origin: WEB_ORIGIN},
  });
  expect(signUp.ok(), await signUp.text()).toBe(true);
  return user;
};

test.describe("Profile calendar settings", () => {
  let user: TestUser;

  test.beforeEach(async ({page, request}) => {
    user = await createUser(request);
    await loginAs(page, user);
    await page.goto("/profile");
    await page.getByTestId("profile-screen").waitFor({state: "visible"});
  });

  test("user can save week start day and timezone", async ({page, request}) => {
    await page.getByTestId("profile-week-start-field").getByRole("textbox").click();
    await page.getByTestId("web_dropdown_option_0").click();
    await page.getByTestId("profile-timezone-field").getByRole("textbox").click();
    await page.getByTestId("web_dropdown_option_America/New_York").click();
    await page.getByTestId("profile-calendar-save-button").click();
    await expect(page.getByTestId("profile-calendar-saved")).toBeVisible();

    const me = await request.get(`${API_URL}/auth/me`, {
      headers: {authorization: await authorizationFor(request, user)},
    });
    expect(me.ok(), await me.text()).toBe(true);
    const body = (await me.json()) as {data: {timezone?: string; weekStartDay?: number}};
    expect(body.data.weekStartDay).toBe(0);
    expect(body.data.timezone).toBe("America/New_York");
  });
});

test.describe("Dashboard calendar defaults", () => {
  test("visiting Today saves default calendar settings when unset", async ({page, request}) => {
    const user = await createUser(request);
    await loginAs(page, user);
    const browserTimezone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    await page.goto("/today");
    await page.getByTestId("today-screen").waitFor({state: "visible"});

    await expect
      .poll(async () => {
        const me = await request.get(`${API_URL}/auth/me`, {
          headers: {authorization: await authorizationFor(request, user)},
        });
        const body = (await me.json()) as {data: {timezone?: string; weekStartDay?: number}};
        return body.data;
      })
      .toEqual(expect.objectContaining({timezone: browserTimezone, weekStartDay: 1}));
  });
});
