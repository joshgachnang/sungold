import {expect, test} from "@playwright/test";
import {API_URL} from "./fixtures/testUsers";
import {authorizationFor, revokeDeviceSessions} from "./helpers/focusSessions";
import {loginAs} from "./helpers/login";

const issueDeviceSession = async (
  request: Parameters<typeof authorizationFor>[0],
  name: string
): Promise<{_id: string; token: string}> => {
  const authorization = await authorizationFor(request);
  const issued = await request.post(`${API_URL}/deviceSessions/issue`, {
    data: {
      client: "mac",
      name,
      redirect: "sungold-mac://auth",
      state: `devices-${crypto.randomUUID()}`,
    },
    headers: {authorization},
  });
  expect(issued.ok(), await issued.text()).toBe(true);
  const body = (await issued.json()) as {
    data: {deviceSession: {_id: string}; redirectUrl: string};
  };
  const redirectUrl = new URL(body.data.redirectUrl);
  const token = redirectUrl.searchParams.get("token") ?? "";
  expect(token.length).toBeGreaterThan(10);
  return {
    _id: body.data.deviceSession._id,
    token,
  };
};

test.describe("Devices", () => {
  test.beforeEach(async ({page, request}) => {
    await revokeDeviceSessions(request);
    await loginAs(page);
    await page.goto("/devices");
    await page.getByTestId("devices-screen").waitFor({state: "visible"});
  });

  test.afterEach(async ({request}) => {
    await revokeDeviceSessions(request);
  });

  test("user can revoke a signed-in device", async ({page, request}) => {
    const device = await issueDeviceSession(request, "Studio MacBook");
    await page.reload();
    await page.getByTestId("devices-screen").waitFor({state: "visible"});

    const row = page.getByTestId(`devices-item-${device._id}`);
    await row.waitFor({state: "visible"});
    await expect(row.getByTestId(`devices-item-name-${device._id}`)).toContainText("Studio MacBook");
    await expect(row.getByTestId(`devices-item-client-${device._id}`)).toContainText("Mac");
    await expect(row.getByTestId(`devices-item-status-${device._id}`)).toContainText("Signed in");
    await expect(row.getByTestId(`devices-item-created-${device._id}`)).toContainText("Signed in");

    const tokenWorksBeforeRevoke = await request.get(`${API_URL}/auth/me`, {
      headers: {authorization: `Bearer ${device.token}`},
    });
    expect(tokenWorksBeforeRevoke.status()).toBe(200);

    await row.getByTestId(`devices-revoke-button-${device._id}`).click();
    await page.getByTestId(`devices-confirm-${device._id}`).waitFor({state: "visible"});
    await page.getByTestId(`devices-confirm-revoke-button-${device._id}`).click();

    await expect(row.getByTestId(`devices-item-status-${device._id}`)).toContainText("Revoked");
    await expect(row.getByTestId(`devices-revoke-button-${device._id}`)).toBeHidden();

    const tokenCheck = await request.get(`${API_URL}/auth/me`, {
      headers: {authorization: `Bearer ${device.token}`},
    });
    expect([401, 403]).toContain(tokenCheck.status());
  });
});
