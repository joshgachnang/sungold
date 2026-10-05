import {expect, test} from "@playwright/test";
import {
  authorizationFor,
  endActiveSessions,
  requestGrantViaApi,
  startSessionViaApi,
} from "./helpers/focusSessions";
import {API_URL, type TestUser, WEB_ORIGIN} from "./fixtures/testUsers";
import {loginAs} from "./helpers/login";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const createUser = async (request: Parameters<typeof authorizationFor>[0]): Promise<TestUser> => {
  const user = {
    email: `e2e-today-${crypto.randomUUID()}@example.com`,
    name: "E2E Today",
    password: "testpassword123",
  };
  const signUp = await request.post(`${API_URL}/api/auth/sign-up/email`, {
    data: user,
    headers: {origin: WEB_ORIGIN},
  });
  expect(signUp.ok(), await signUp.text()).toBe(true);
  return user;
};

test.describe("Today", () => {
  let user: TestUser;

  test.beforeEach(async ({request}) => {
    user = await createUser(request);
    await endActiveSessions(request, user);
  });

  test("user lands on Today and can start a session", async ({page}) => {
    await loginAs(page, user);
    await page.goto("/");
    await page.getByTestId("today-screen").waitFor({state: "visible"});
    await expect(page).toHaveURL(/\/today$/);

    await expect(page.getByTestId("today-start-session")).toBeVisible();
    await expect(page.getByTestId("today-week-comparison")).toContainText("this week");
    await expect(page.getByTestId("today-week-comparison")).toContainText("last week");

    await page.getByTestId("focus-domain-input").fill("youtube.com");
    await page.getByTestId("focus-intention-input").fill("Write the Today overview");
    await page.getByTestId("focus-start-button").click();
    await page.getByTestId("today-active-session").waitFor({state: "visible"});
    await expect(page.getByTestId("focus-intention")).toContainText("Write the Today overview");
  });

  test("user sees an active session summary", async ({page, request}) => {
    const session = await startSessionViaApi(request, ["x.com"], user, "Finish dashboard overview");
    await page.addInitScript((mockedNow) => {
      const RealDate = Date;
      class MockDate extends RealDate {
        constructor(value?: number | string | Date) {
          if (value === undefined) {
            super(mockedNow);
            return;
          }
          super(value);
        }

        static now() {
          return mockedNow;
        }
      }
      globalThis.Date = MockDate as DateConstructor;
    }, new Date(session.startedAt).getTime() + TWO_HOURS_MS);

    await loginAs(page, user);
    await page.getByTestId("today-screen").waitFor({state: "visible"});

    await expect(page.getByTestId("today-active-session")).toBeVisible();
    await expect(page.getByTestId("focus-intention")).toContainText("Finish dashboard overview");
    await expect(page.getByTestId("focus-blocked-domains")).toContainText("x.com");
    await expect(page.getByTestId("today-this-week-hours")).toContainText("2.00 h this week");
    await expect(page.getByTestId("today-this-week-hours")).toContainText("0.00 h last week");
    await expect(page.getByTestId("today-week-delta")).toContainText("2.00 h more than last week");
  });

  test("user sees a pending review banner", async ({page, request}) => {
    const session = await startSessionViaApi(request, ["news.ycombinator.com"], user, "Review me");
    await requestGrantViaApi(request, session._id, user);
    await endActiveSessions(request, user);

    await loginAs(page, user);
    await page.getByTestId("today-screen").waitFor({state: "visible"});

    await page.getByTestId("review-banner").waitFor({state: "visible"});
    await expect(page.getByTestId("review-banner")).toContainText("Review your last session");
    await expect(page.getByTestId("today-week-comparison")).toContainText("this week");
  });
});
