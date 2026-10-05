import {expect, test} from "@playwright/test";
import {loginAs} from "./helpers/login";

const routes = [
  {label: "Today", path: "/today", screen: "today-screen", testID: "nav-today"},
  {label: "Focus", path: "/focus", screen: "focus-screen", testID: "nav-focus"},
  {label: "History", path: "/history", screen: "history-screen", testID: "nav-history"},
  {label: "Blocklists", path: "/blocklists", screen: "blocklists-screen", testID: "nav-blocklists"},
  {label: "Devices", path: "/devices", screen: "devices-screen", testID: "nav-devices"},
  {label: "Profile", path: "/profile", screen: "profile-screen", testID: "nav-profile"},
];

test.describe("Dashboard navigation", () => {
  test("wide screens show the sidebar destinations", async ({page}) => {
    await page.setViewportSize({height: 900, width: 1280});
    await loginAs(page);
    await page.goto("/today");
    await page.getByTestId("today-screen").waitFor({state: "visible"});

    for (const route of routes) {
      const sidebarItem = page.getByTestId(route.testID);
      await expect(page.getByRole("button", {exact: true, name: route.label})).toHaveCount(1);

      await expect(sidebarItem).toBeVisible();
      await sidebarItem.click();
      await page.getByTestId(route.screen).waitFor({state: "visible"});
      await expect(page).toHaveURL(new RegExp(`${route.path}$`));
    }
  });

  test("narrow screens show bottom tabs for the same destinations", async ({page}) => {
    await page.setViewportSize({height: 844, width: 390});
    await loginAs(page);
    await page.goto("/today");
    await page.getByTestId("today-screen").waitFor({state: "visible"});

    for (const route of routes) {
      await expect(page.getByTestId(route.testID)).toBeVisible();
      await page.getByTestId(route.testID).click();
      await page.getByTestId(route.screen).waitFor({state: "visible"});
      await expect(page).toHaveURL(new RegExp(`${route.path}$`));
    }
  });
});
