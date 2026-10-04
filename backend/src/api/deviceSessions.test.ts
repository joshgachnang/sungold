import {beforeAll, describe, it} from "bun:test";
import {
  BetterAuthApp,
  configureOpenApiValidator,
  createBetterAuth,
  getMongoClientFromMongoose,
  SyncApp,
  TerrenoApp,
  type UserModel as TerrenoAuthUserModel,
} from "@terreno/api";
import {assert} from "chai";
import supertest from "supertest";
import {User} from "../models/user";
import {buildBetterAuthConfig} from "../utils/betterAuthConfig";
import {configureDeviceAuth, deviceSessionRouter} from "./deviceSessions";
import {focusSessionRouter} from "./focusSessions";

const WEB_ORIGIN = "http://localhost:8093";
const MAC_REDIRECT = "sungold-mac://auth";

describe("device sessions", () => {
  let app: ReturnType<TerrenoApp["build"]>;

  beforeAll(() => {
    configureOpenApiValidator();
    const config = buildBetterAuthConfig();
    if (!config) {
      throw new Error("Better Auth config is required for device session tests");
    }
    configureDeviceAuth(
      createBetterAuth({
        config,
        mongoClient: getMongoClientFromMongoose(),
        userModel: User as unknown as TerrenoAuthUserModel,
      })
    );
    app = new TerrenoApp({skipListen: true, userModel: User as never})
      .register(new BetterAuthApp({config, userModel: User as unknown as TerrenoAuthUserModel}))
      .register(deviceSessionRouter)
      .register(focusSessionRouter)
      .register(new SyncApp())
      .build();
  });

  // Signs up through Better Auth like the web app does and returns the web session's bearer.
  const signUp = async (label: string): Promise<{email: string; authorization: string}> => {
    const email = `${label}-${crypto.randomUUID()}@example.com`;
    const res = await supertest(app)
      .post("/api/auth/sign-up/email")
      .set("Origin", WEB_ORIGIN)
      .send({email, name: label, password: "password12345"});
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const token = res.headers["set-auth-token"];
    assert.isString(token);
    return {authorization: `Bearer ${token}`, email};
  };

  const issue = async (
    authorization: string,
    body: Record<string, unknown>
  ): Promise<supertest.Response> =>
    supertest(app)
      .post("/deviceSessions/issue")
      .set("Authorization", authorization)
      .send({
        client: "mac",
        name: "Josh's MacBook",
        redirect: MAC_REDIRECT,
        state: "abc123",
        ...body,
      });

  const tokenFrom = (redirectUrl: string): string => {
    const url = new URL(redirectUrl);
    return url.searchParams.get("token") ?? "";
  };

  it("issues a device token in the allowlisted redirect that works as a bearer", async () => {
    const {email, authorization} = await signUp("mac-owner");
    const res = await issue(authorization, {state: "state-xyz"});
    assert.equal(res.status, 200, JSON.stringify(res.body));

    const redirectUrl = res.body.data.redirectUrl as string;
    assert.isTrue(redirectUrl.startsWith(`${MAC_REDIRECT}?`), redirectUrl);
    const url = new URL(redirectUrl);
    assert.equal(url.searchParams.get("state"), "state-xyz");
    const deviceToken = tokenFrom(redirectUrl);
    assert.isAbove(deviceToken.length, 10);
    assert.notEqual(`Bearer ${deviceToken}`, authorization);

    const me = await supertest(app).get("/auth/me").set("Authorization", `Bearer ${deviceToken}`);
    assert.equal(me.status, 200, JSON.stringify(me.body));
    assert.equal(me.body.data.email, email);

    const session = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", `Bearer ${deviceToken}`)
      .send({blockedDomains: ["x.com"]});
    assert.equal(session.status, 201, JSON.stringify(session.body));
  });

  it("lets the device token read the user's sync streams until it is revoked", async () => {
    const {authorization} = await signUp("mac-sync");
    const issued = await issue(authorization, {});
    const deviceToken = tokenFrom(issued.body.data.redirectUrl);
    const me = await supertest(app).get("/auth/me").set("Authorization", authorization);
    const stream = `focusSessions|owner:${me.body.data._id}`;

    const snapshot = await supertest(app)
      .get("/sync/snapshot")
      .query({collection: "focusSessions", stream})
      .set("Authorization", `Bearer ${deviceToken}`);
    assert.equal(snapshot.status, 200, JSON.stringify(snapshot.body));

    await supertest(app)
      .post(`/deviceSessions/${issued.body.data.deviceSession._id}/revoke`)
      .set("Authorization", authorization);
    const afterRevoke = await supertest(app)
      .get("/sync/snapshot")
      .query({collection: "focusSessions", stream})
      .set("Authorization", `Bearer ${deviceToken}`);
    assert.oneOf(afterRevoke.status, [401, 403]);
  });

  it("does not let a device token sign in further devices", async () => {
    const {authorization} = await signUp("mac-chain");
    const issued = await issue(authorization, {});
    const deviceToken = tokenFrom(issued.body.data.redirectUrl);
    const chained = await issue(`Bearer ${deviceToken}`, {state: "chained"});
    assert.equal(chained.status, 403, JSON.stringify(chained.body));
  });

  it("rejects redirects other than sungold-mac://auth", async () => {
    const {authorization} = await signUp("mac-redirect");
    for (const redirect of [
      "https://evil.example.com/auth",
      "sungold-mac://other",
      "sungold-mac://auth/extra",
      "sungold-mac://auth?token=injected",
      "sungold://auth",
    ]) {
      const res = await issue(authorization, {redirect});
      assert.equal(res.status, 400, `${redirect}: ${JSON.stringify(res.body)}`);
    }
  });

  it("requires a url-safe state", async () => {
    const {authorization} = await signUp("mac-state");
    for (const state of ["", "has space", "a&token=x", "x".repeat(257)]) {
      const res = await issue(authorization, {state});
      assert.equal(res.status, 400, `state=${JSON.stringify(state)}`);
    }
    const missing = await supertest(app)
      .post("/deviceSessions/issue")
      .set("Authorization", authorization)
      .send({client: "mac", redirect: MAC_REDIRECT});
    assert.equal(missing.status, 400);
  });

  it("requires sign-in to issue a device token", async () => {
    const res = await supertest(app)
      .post("/deviceSessions/issue")
      .send({client: "mac", redirect: MAC_REDIRECT, state: "abc"});
    assert.oneOf(res.status, [401, 403, 405]);
  });

  it("lists devices to their owner only and revokes a device token", async () => {
    const owner = await signUp("mac-revoke");
    const other = await signUp("mac-other");
    const issued = await issue(owner.authorization, {});
    const deviceToken = tokenFrom(issued.body.data.redirectUrl);
    const deviceId = issued.body.data.deviceSession._id as string;

    const list = await supertest(app)
      .get("/deviceSessions")
      .set("Authorization", owner.authorization);
    assert.equal(list.status, 200);
    assert.lengthOf(list.body.data, 1);
    assert.equal(list.body.data[0].client, "mac");
    assert.equal(list.body.data[0].name, "Josh's MacBook");
    assert.notInclude(JSON.stringify(list.body), deviceToken);

    const otherList = await supertest(app)
      .get("/deviceSessions")
      .set("Authorization", other.authorization);
    assert.lengthOf(otherList.body.data, 0);

    const foreignRevoke = await supertest(app)
      .post(`/deviceSessions/${deviceId}/revoke`)
      .set("Authorization", other.authorization);
    assert.oneOf(foreignRevoke.status, [403, 404]);
    const stillWorks = await supertest(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${deviceToken}`);
    assert.equal(stillWorks.status, 200);

    const revoked = await supertest(app)
      .post(`/deviceSessions/${deviceId}/revoke`)
      .set("Authorization", owner.authorization);
    assert.equal(revoked.status, 200, JSON.stringify(revoked.body));
    assert.isString(revoked.body.data.revokedAt);

    const after = await supertest(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${deviceToken}`);
    assert.oneOf(after.status, [401, 403]);

    const webStillWorks = await supertest(app)
      .get("/auth/me")
      .set("Authorization", owner.authorization);
    assert.equal(webStillWorks.status, 200);
  });

  it("does not allow creating, editing or deleting device sessions directly", async () => {
    const {authorization} = await signUp("mac-direct");
    const issued = await issue(authorization, {});
    const deviceId = issued.body.data.deviceSession._id as string;

    const created = await supertest(app)
      .post("/deviceSessions")
      .set("Authorization", authorization)
      .send({client: "mac", name: "forged"});
    assert.oneOf(created.status, [403, 405]);
    const patched = await supertest(app)
      .patch(`/deviceSessions/${deviceId}`)
      .set("Authorization", authorization)
      .send({revokedAt: null});
    assert.oneOf(patched.status, [403, 405]);
    const deleted = await supertest(app)
      .delete(`/deviceSessions/${deviceId}`)
      .set("Authorization", authorization);
    assert.oneOf(deleted.status, [403, 405]);
  });
});
