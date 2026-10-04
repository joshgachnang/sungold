import {expect, test} from "@playwright/test";
import {
  createBlocklistViaApi,
  endActiveSessions,
  getActiveSessionsViaApi,
} from "./helpers/focusSessions";
import {loginAs} from "./helpers/login";

test.describe("Focus from blocklists", () => {
  let social: {_id: string; name: string};
  let video: {_id: string; name: string};

  test.beforeEach(async ({page, request}) => {
    await endActiveSessions(request);
    social = await createBlocklistViaApi(request, {
      domains: ["x.com", "reddit.com"],
      name: `Social ${crypto.randomUUID()}`,
    });
    video = await createBlocklistViaApi(request, {
      domains: ["youtube.com", "reddit.com"],
      name: `Video ${crypto.randomUUID()}`,
    });
    await loginAs(page);
    await page.goto("/focus");
    await page.getByTestId("focus-screen").waitFor({state: "visible"});
    await page.getByTestId("focus-start-button").waitFor({state: "visible"});
  });

  test("user can start from two blocklists plus an extra domain", async ({page, request}) => {
    await page.getByTestId(`focus-blocklist-option-${social._id}`).click();
    await page.getByTestId(`focus-blocklist-option-${video._id}`).click();
    await page.getByTestId("focus-domain-input").fill("https://news.ycombinator.com/item?id=1");
    await page.getByTestId("focus-intention-input").fill("Plan the dashboard");
    await page.getByTestId("focus-start-button").click();

    await page.getByTestId("focus-active-session").waitFor({state: "visible"});
    await expect(page.getByTestId("focus-intention")).toContainText("Plan the dashboard");
    await expect(page.getByTestId("focus-blocked-domains")).toContainText(
      "x.com, reddit.com, youtube.com, news.ycombinator.com"
    );
    const [session] = await getActiveSessionsViaApi(request);
    expect(session.blocklistIds).toEqual([social._id, video._id]);
    expect(session.blockedDomains).toEqual([
      "x.com",
      "reddit.com",
      "youtube.com",
      "news.ycombinator.com",
    ]);
  });
});
