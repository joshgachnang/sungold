import {expect, test} from "@playwright/test";
import {
  authorizationFor,
  deleteBlocklistViaApi,
  deleteUserBlocklistsViaApi,
  seedStarterBlocklistsViaApi,
} from "./helpers/focusSessions";
import {API_URL, type TestUser, WEB_ORIGIN} from "./fixtures/testUsers";
import {loginAs} from "./helpers/login";

const createUser = async (request: Parameters<typeof authorizationFor>[0]): Promise<TestUser> => {
  const user = {
    email: `e2e-blocklists-${crypto.randomUUID()}@example.com`,
    name: "E2E Blocklists",
    password: "testpassword123",
  };
  const signUp = await request.post(`${API_URL}/api/auth/sign-up/email`, {
    data: user,
    headers: {origin: WEB_ORIGIN},
  });
  expect(signUp.ok(), await signUp.text()).toBe(true);
  return user;
};

test.describe("Blocklists CRUD", () => {
  test.beforeEach(async ({page, request}) => {
    await deleteUserBlocklistsViaApi(request);
    await seedStarterBlocklistsViaApi(request);
    await loginAs(page);
    await page.goto("/blocklists");
    await page.getByTestId("blocklists-screen").waitFor({state: "visible"});
    await page.getByTestId("blocklists-create-button").waitFor({state: "visible"});
  });

  test("user can create, edit, and delete a blocklist", async ({page}) => {
    const name = `Deep work ${crypto.randomUUID()}`;
    await page.getByTestId("blocklists-name-input").fill(name);
    await page.getByTestId("blocklists-domains-input").fill("https://www.YouTube.com/feed, x.com");
    await page.getByTestId("blocklists-create-button").click();

    const item = page
      .getByTestId("blocklists-list")
      .getByTestId(/^blocklists-item-[a-f0-9]+$/)
      .filter({hasText: name});
    await item.waitFor({state: "visible"});
    await expect(item).toContainText("youtube.com, x.com");

    await item.getByTestId(/^blocklists-edit-name-input-/).fill(`${name} updated`);
    await item.getByTestId(/^blocklists-edit-domains-input-/).fill("reddit.com\nnews.ycombinator.com");
    await item.getByTestId(/^blocklists-save-button-/).click();
    await expect(item).toContainText(`${name} updated`);
    await expect(item).toContainText("reddit.com, news.ycombinator.com");

    await item.getByTestId(/^blocklists-delete-button-/).click();
    await expect(page.getByText(`${name} updated`)).toBeHidden();
  });

  test("user sees server validation errors", async ({page}) => {
    await page.getByTestId("blocklists-name-input").fill("Invalid");
    await page.getByTestId("blocklists-domains-input").fill("localhost");
    await page.getByTestId("blocklists-create-button").click();
    await expect(page.getByTestId("blocklists-create-error")).toContainText(
      "Invalid domains: localhost"
    );
    await expect(page.getByTestId(/^blocklists-item-/).filter({hasText: "Invalid"})).toBeHidden();
  });
});

test.describe("Blocklists starter presets", () => {
  let user: TestUser;
  let starter: {_id: string};

  test.beforeEach(async ({page, request}) => {
    user = await createUser(request);
    [starter] = await seedStarterBlocklistsViaApi(request, user);
    await loginAs(page, user);
    await page.goto("/blocklists");
    await page.getByTestId("blocklists-screen").waitFor({state: "visible"});
  });

  test("user can edit and delete a starter blocklist", async ({page, request}) => {
    const item = page.getByTestId(`blocklists-item-${starter._id}`);
    await item.waitFor({state: "visible"});

    await item.getByTestId(`blocklists-edit-name-input-${starter._id}`).fill("Quiet Social");
    await item
      .getByTestId(`blocklists-edit-domains-input-${starter._id}`)
      .fill("instagram.com\ntiktok.com");
    await item.getByTestId(`blocklists-save-button-${starter._id}`).click();
    await expect(item).toContainText("Quiet Social");
    await expect(item).toContainText("instagram.com, tiktok.com");

    await deleteBlocklistViaApi(request, starter._id, user);
    await expect(item).toBeHidden();
  });
});
