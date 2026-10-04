export interface TestUser {
  email: string;
  name: string;
  password: string;
}

export const TEST_USER: TestUser = {
  email: "e2e-focus@example.com",
  name: "E2E Focus",
  password: "testpassword123",
};

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:4000";
export const WEB_ORIGIN = process.env.E2E_BASE_URL ?? "http://localhost:8093";
