import {expect, test} from "@playwright/test";
import {endActiveSessions, startSessionViaApi} from "./helpers/focusSessions";
import {loginAs} from "./helpers/login";

test.describe("Parking lot", () => {
  test.beforeEach(async ({page, request}) => {
    await endActiveSessions(request);
    await startSessionViaApi(request, ["x.com"], undefined, "Write the proposal");
    await loginAs(page);
    await page.goto("/focus");
    await page.getByTestId("focus-screen").waitFor({state: "visible"});
    await page.getByTestId("focus-active-session").waitFor({state: "visible"});
  });

  test("user can capture a thought and see it after reload", async ({page}) => {
    const thought = `Ask Sam about the launch checklist ${crypto.randomUUID()}`;
    await page.getByTestId("focus-parking-lot-input").fill(thought);
    await page.getByTestId("focus-parking-lot-add-button").click();

    const item = page.getByTestId(/^focus-parking-lot-item-/).filter({
      hasText: thought,
    });
    await expect(item).toBeVisible();
    await expect(page.getByTestId("focus-parking-lot-input")).toHaveValue("");

    await page.reload();
    await page.getByTestId("focus-active-session").waitFor({state: "visible"});
    await expect(
      page.getByTestId(/^focus-parking-lot-item-/).filter({
        hasText: thought,
      })
    ).toBeVisible();
  });

  test("user sees validation when parking lot text is blank", async ({page}) => {
    await page.getByTestId("focus-parking-lot-add-button").click();
    await expect(page.getByTestId("focus-parking-lot-error")).toContainText("Add a thought");
  });
});
