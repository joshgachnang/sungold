import {expect, test} from "@playwright/test";
import {endActiveSessions, startSessionViaApi} from "./helpers/focusSessions";
import {loginAs} from "./helpers/login";

test.describe("Focus sessions", () => {
  test.beforeEach(async ({page, request}) => {
    await endActiveSessions(request);
    await loginAs(page);
    await page.goto("/focus");
    await page.getByTestId("focus-screen").waitFor({state: "visible"});
    await page.getByTestId("focus-start-button").waitFor({state: "visible"});
  });

  test("user can start a session, peek, and see the countdown", async ({page}) => {
    await page.getByTestId("focus-domain-input").fill("https://www.YouTube.com/feed, x.com");
    await page.getByTestId("focus-intention-input").fill("Finish the auth migration");
    await page.getByTestId("focus-start-button").click();

    await page.getByTestId("focus-active-session").waitFor({state: "visible"});
    await expect(page.getByTestId("focus-intention")).toContainText("Finish the auth migration");
    // The server normalizes domains; wait for its copy to sync back.
    await expect(page.getByTestId("focus-blocked-domains")).toContainText("youtube.com, x.com");

    await page.getByTestId("focus-peek-button").click();
    const countdown = page.getByTestId("focus-grant-countdown");
    await countdown.waitFor({state: "visible"});
    await expect(countdown).toContainText(/Unblocked for [45]:\d\d/);
    await expect(page.getByTestId("focus-peek-button")).toBeHidden();
  });

  test("user can end a session and start again", async ({page}) => {
    await page.getByTestId("focus-domain-input").fill("reddit.com");
    await page.getByTestId("focus-start-button").click();
    await page.getByTestId("focus-active-session").waitFor({state: "visible"});

    await page.getByTestId("focus-end-button").click();
    await page.getByTestId("focus-start-button").waitFor({state: "visible"});
    await expect(page.getByTestId("focus-active-session")).toBeHidden();
  });

  test("user with a session from another device never sees the start form", async ({
    page,
    request,
  }) => {
    await startSessionViaApi(request, ["news.ycombinator.com"]);
    // Record whether the start form renders at any point during the reload.
    await page.addInitScript(() => {
      const record = (): void => {
        if (document.querySelector('[data-testid="focus-start-button"]')) {
          (window as unknown as {sawStartForm: boolean}).sawStartForm = true;
        }
      };
      new MutationObserver(record).observe(document, {childList: true, subtree: true});
    });
    // Start from an empty local store, like a device opening the app for the first time.
    await page.goto("/login");
    await page.evaluate(async () => {
      for (const database of await indexedDB.databases()) {
        if (database.name) {
          indexedDB.deleteDatabase(database.name);
        }
      }
    });
    await page.goto("/focus");
    await page.getByTestId("focus-active-session").waitFor({state: "visible"});
    await expect(page.getByTestId("focus-blocked-domains")).toContainText("news.ycombinator.com");
    const sawStartForm = await page.evaluate(
      () => (window as unknown as {sawStartForm?: boolean}).sawStartForm === true
    );
    expect(sawStartForm).toBe(false);
  });

  test("user sees the server's error for an invalid domain", async ({page}) => {
    await page.getByTestId("focus-domain-input").fill("localhost");
    await page.getByTestId("focus-start-button").click();
    await expect(page.getByTestId("focus-domain-error")).toContainText("Invalid domains: localhost");
    await expect(page.getByTestId("focus-active-session")).toBeHidden();
  });

  test("user sees an error when starting without domains", async ({page}) => {
    await page.getByTestId("focus-start-button").click();
    await expect(page.getByTestId("focus-domain-error")).toContainText("at least one domain");
    await expect(page.getByTestId("focus-active-session")).toBeHidden();
  });
});
