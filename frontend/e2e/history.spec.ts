import {expect, test} from "@playwright/test";
import {
  authorizationFor,
  endActiveSessions,
  requestGrantViaApi,
  startSessionViaApi,
} from "./helpers/focusSessions";
import {API_URL, type TestUser, WEB_ORIGIN} from "./fixtures/testUsers";
import {loginAs} from "./helpers/login";

const createUser = async (request: Parameters<typeof authorizationFor>[0]): Promise<TestUser> => {
  const user = {
    email: `e2e-history-${crypto.randomUUID()}@example.com`,
    name: "E2E History",
    password: "testpassword123",
  };
  const signUp = await request.post(`${API_URL}/api/auth/sign-up/email`, {
    data: user,
    headers: {origin: WEB_ORIGIN},
  });
  expect(signUp.ok(), await signUp.text()).toBe(true);
  return user;
};

test.describe("History", () => {
  let historySession: Awaited<ReturnType<typeof startSessionViaApi>>;
  let user: TestUser;

  test.beforeEach(async ({page, request}) => {
    user = await createUser(request);
    await endActiveSessions(request, user);
    historySession = await startSessionViaApi(
      request,
      ["youtube.com", "x.com"],
      user,
      "Review the dashboard"
    );
    await requestGrantViaApi(request, historySession._id, user);
    await endActiveSessions(request, user);
    await loginAs(page, user);
    await page.goto("/history");
    await page.getByTestId("history-screen").waitFor({state: "visible"});
  });

  test("user can review weekly focus hours and past sessions", async ({page}) => {
    await page.getByTestId("history-focus-hours-chart").waitFor({state: "visible"});
    await expect(page.getByTestId("history-week-total")).toContainText("0.00 h this week");
    for (let index = 0; index < 8; index += 1) {
      await expect(page.getByTestId(`history-week-${index}`)).toBeVisible();
    }
    await expect(page.getByTestId("history-week-8")).toHaveCount(0);

    await page.getByTestId("history-sessions-table").waitFor({state: "visible"});
    const row = page.getByTestId(`history-sessions-data-table.row-${historySession._id}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText("Review the dashboard");
    await expect(row).toContainText("youtube.com, x.com");
    await expect(row).toContainText("0 min");
    await expect(row).toContainText("1");
    await expect(row).toContainText("Not reviewed");
  });
});
