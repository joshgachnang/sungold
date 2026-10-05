import {expect, test as setup} from "@playwright/test";
import {API_URL, TEST_USER, WEB_ORIGIN} from "./fixtures/testUsers";

// Creates the e2e user through Better Auth. An existing user is fine.
setup("create test user", async ({request}) => {
  const signUp = await request.post(`${API_URL}/api/auth/sign-up/email`, {
    data: {email: TEST_USER.email, name: TEST_USER.name, password: TEST_USER.password},
    headers: {origin: WEB_ORIGIN},
  });
  if (signUp.ok()) {
    return;
  }
  const signIn = await request.post(`${API_URL}/api/auth/sign-in/email`, {
    data: {email: TEST_USER.email, password: TEST_USER.password},
    headers: {origin: WEB_ORIGIN},
  });
  expect(signIn.ok(), await signIn.text()).toBe(true);
});
