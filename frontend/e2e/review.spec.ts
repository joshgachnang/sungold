import {expect, test} from "@playwright/test";
import {
  authorizationFor,
  createParkingLotItemViaApi,
  endActiveSessions,
  startSessionViaApi,
} from "./helpers/focusSessions";
import {API_URL, type TestUser, WEB_ORIGIN} from "./fixtures/testUsers";
import {loginAs} from "./helpers/login";

const createUser = async (request: Parameters<typeof authorizationFor>[0]): Promise<TestUser> => {
  const user = {
    email: `e2e-review-${crypto.randomUUID()}@example.com`,
    name: "E2E Review",
    password: "testpassword123",
  };
  const signUp = await request.post(`${API_URL}/api/auth/sign-up/email`, {
    data: user,
    headers: {origin: WEB_ORIGIN},
  });
  expect(signUp.ok(), await signUp.text()).toBe(true);
  return user;
};

test.describe("End-of-block review", () => {
  let user: TestUser;

  test.beforeEach(async ({request}) => {
    user = await createUser(request);
    await endActiveSessions(request, user);
  });

  test("user can review a locally ended session and carry a parked thought forward", async ({
    page,
  }) => {
    const doneThought = `Send summary ${crypto.randomUUID()}`;
    const carriedThought = `Ask about next block ${crypto.randomUUID()}`;
    await loginAs(page, user);
    await page.goto("/focus");
    await page.getByTestId("focus-screen").waitFor({state: "visible"});
    await page.getByTestId("focus-start-button").waitFor({state: "visible"});

    await page.getByTestId("focus-domain-input").fill("x.com");
    await page.getByTestId("focus-intention-input").fill("Write the review flow");
    await page.getByTestId("focus-start-button").click();
    await page.getByTestId("focus-active-session").waitFor({state: "visible"});
    await page.getByTestId("focus-parking-lot-input").fill(doneThought);
    await page.getByTestId("focus-parking-lot-add-button").click();
    await expect(page.getByTestId(/^focus-parking-lot-item-/).filter({hasText: doneThought})).toBeVisible();
    await page.getByTestId("focus-parking-lot-input").fill(carriedThought);
    await page.getByTestId("focus-parking-lot-add-button").click();
    await expect(
      page.getByTestId(/^focus-parking-lot-item-/).filter({hasText: carriedThought})
    ).toBeVisible();

    await page.getByTestId("focus-end-button").click();
    await page.getByTestId("review-sheet").waitFor({state: "visible"});
    await page.getByTestId("review-done-input").fill("Drafted the review flow");
    await page.getByTestId("review-note-input").fill("Keep the next step small");
    const doneReviewItem = page.getByTestId(/^review-item-/).filter({hasText: doneThought});
    await doneReviewItem.getByText("Done").click();
    await page.getByTestId("review-submit-button").click();
    await expect(page.getByTestId("review-sheet")).toBeHidden();

    await page.getByTestId("focus-domain-input").fill("reddit.com");
    await page.getByTestId("focus-start-button").click();
    await page.getByTestId("focus-active-session").waitFor({state: "visible"});
    await expect(
      page.getByTestId(/^focus-parking-lot-item-/).filter({hasText: carriedThought})
    ).toBeVisible();
    await expect(
      page.getByTestId(/^focus-parking-lot-item-/).filter({hasText: doneThought})
    ).toBeHidden();
  });

  test("user can skip the banner for a session ended from another device", async ({
    page,
    request,
  }) => {
    await startSessionViaApi(request, ["news.ycombinator.com"], user, "Remote session");
    await loginAs(page, user);
    await page.goto("/focus");
    await page.getByTestId("focus-active-session").waitFor({state: "visible"});

    await endActiveSessions(request, user);
    await page.getByTestId("review-banner").waitFor({state: "visible"});
    await page.getByTestId("review-banner-open-button").click();
    await page.getByTestId("review-sheet").waitFor({state: "visible"});
    await page.getByTestId("review-skip-button").click();
    await expect(page.getByTestId("review-sheet")).toBeHidden();
    await expect(page.getByTestId("review-banner")).toBeHidden();
  });

  test("user can open a pending review from History", async ({page, request}) => {
    const session = await startSessionViaApi(request, ["youtube.com"], user, "History review");
    await createParkingLotItemViaApi(request, session._id, "Follow up after history", user);
    await endActiveSessions(request, user);
    await loginAs(page, user);
    await page.goto("/history");
    await page.getByTestId("history-screen").waitFor({state: "visible"});

    await page.getByTestId(`history-review-button-${session._id}`).click();
    await page.getByTestId("review-sheet").waitFor({state: "visible"});
    await page.getByTestId("review-done-input").fill("Reviewed from History");
    await page.getByTestId("review-submit-button").click();
    await expect(page.getByTestId("review-sheet")).toBeHidden();
    const row = page.getByTestId(`history-sessions-data-table.row-${session._id}`);
    await expect(row).toContainText("Reviewed");
  });
});
