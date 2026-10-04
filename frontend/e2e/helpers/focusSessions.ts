import {type APIRequestContext, expect} from "@playwright/test";
import {API_URL, TEST_USER, type TestUser, WEB_ORIGIN} from "../fixtures/testUsers";

// Ends every active focus session for the user through the API, so each test starts from
// "no active session" regardless of what a previous test or run left behind.
export const authorizationFor = async (
  request: APIRequestContext,
  user: TestUser = TEST_USER
): Promise<string> => {
  const signIn = await request.post(`${API_URL}/api/auth/sign-in/email`, {
    data: {email: user.email, password: user.password},
    headers: {origin: WEB_ORIGIN},
  });
  expect(signIn.ok(), await signIn.text()).toBe(true);
  return `Bearer ${signIn.headers()["set-auth-token"]}`;
};

export const createBlocklistViaApi = async (
  request: APIRequestContext,
  data: {domains: string[]; name: string},
  user: TestUser = TEST_USER
): Promise<{_id: string; domains: string[]; name: string}> => {
  const created = await request.post(`${API_URL}/blocklists`, {
    data,
    headers: {authorization: await authorizationFor(request, user)},
  });
  expect(created.status(), await created.text()).toBe(201);
  const body = (await created.json()) as {data: {_id: string; domains: string[]; name: string}};
  return body.data;
};

export const seedStarterBlocklistsViaApi = async (
  request: APIRequestContext,
  user: TestUser = TEST_USER
): Promise<{_id: string; domains: string[]; name: string; source: "starter" | "user"}[]> => {
  const seeded = await request.post(`${API_URL}/blocklists/starter`, {
    headers: {authorization: await authorizationFor(request, user)},
  });
  expect(seeded.ok(), await seeded.text()).toBe(true);
  const body = (await seeded.json()) as {
    data: {_id: string; domains: string[]; name: string; source: "starter" | "user"}[];
  };
  return body.data;
};

export const deleteBlocklistViaApi = async (
  request: APIRequestContext,
  id: string,
  user: TestUser = TEST_USER
): Promise<void> => {
  const deleted = await request.delete(`${API_URL}/blocklists/${id}`, {
    headers: {authorization: await authorizationFor(request, user)},
  });
  expect(deleted.ok(), await deleted.text()).toBe(true);
};

export const deleteUserBlocklistsViaApi = async (
  request: APIRequestContext,
  user: TestUser = TEST_USER
): Promise<void> => {
  const authorization = await authorizationFor(request, user);
  const list = await request.get(`${API_URL}/blocklists`, {headers: {authorization}});
  expect(list.ok(), await list.text()).toBe(true);
  const body = (await list.json()) as {data?: {_id: string; source: "starter" | "user"}[]};
  for (const blocklist of body.data ?? []) {
    if (blocklist.source !== "user") {
      continue;
    }
    const deleted = await request.delete(`${API_URL}/blocklists/${blocklist._id}`, {
      headers: {authorization},
    });
    expect(deleted.ok(), await deleted.text()).toBe(true);
  }
};

export const getActiveSessionsViaApi = async (
  request: APIRequestContext,
  user: TestUser = TEST_USER
): Promise<{_id: string; blockedDomains: string[]; blocklistIds?: string[]}[]> => {
  const list = await request.get(`${API_URL}/focusSessions?status=active`, {
    headers: {authorization: await authorizationFor(request, user)},
  });
  expect(list.ok(), await list.text()).toBe(true);
  const body = (await list.json()) as {
    data: {_id: string; blockedDomains: string[]; blocklistIds?: string[]}[];
  };
  return body.data;
};

// Starts a session through the API, as another device would.
export const startSessionViaApi = async (
  request: APIRequestContext,
  blockedDomains: string[],
  user: TestUser = TEST_USER
): Promise<void> => {
  const created = await request.post(`${API_URL}/focusSessions`, {
    data: {blockedDomains},
    headers: {authorization: await authorizationFor(request, user)},
  });
  expect(created.status(), await created.text()).toBe(201);
};

export const endActiveSessions = async (
  request: APIRequestContext,
  user: TestUser = TEST_USER
): Promise<void> => {
  const authorization = await authorizationFor(request, user);
  const list = await request.get(`${API_URL}/focusSessions?status=active`, {
    headers: {authorization},
  });
  expect(list.ok(), await list.text()).toBe(true);
  const {data} = (await list.json()) as {data: {_id: string}[]};
  for (const session of data) {
    const ended = await request.post(`${API_URL}/focusSessions/${session._id}/end`, {
      headers: {authorization},
    });
    expect(ended.ok(), await ended.text()).toBe(true);
  }
};

// Revokes every device session the user has, so e2e runs do not leave live device tokens.
export const revokeDeviceSessions = async (
  request: APIRequestContext,
  user: TestUser = TEST_USER
): Promise<void> => {
  const authorization = await authorizationFor(request, user);
  const list = await request.get(`${API_URL}/deviceSessions`, {headers: {authorization}});
  expect(list.ok(), await list.text()).toBe(true);
  const {data} = (await list.json()) as {data: {_id: string; revokedAt?: string}[]};
  for (const device of data.filter((item) => !item.revokedAt)) {
    const revoked = await request.post(`${API_URL}/deviceSessions/${device._id}/revoke`, {
      headers: {authorization},
    });
    expect(revoked.ok(), await revoked.text()).toBe(true);
  }
};
