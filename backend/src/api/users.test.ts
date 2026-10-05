import {beforeAll, describe, it} from "bun:test";
import {
  BetterAuthApp,
  configureOpenApiValidator,
  createBetterAuth,
  getMongoClientFromMongoose,
  TerrenoApp,
  type UserModel as TerrenoAuthUserModel,
} from "@terreno/api";
import {assert} from "chai";
import supertest from "supertest";
import {User} from "../models/user";
import {buildBetterAuthConfig} from "../utils/betterAuthConfig";

const WEB_ORIGIN = "http://localhost:8093";

describe("profile settings", () => {
  let app: ReturnType<TerrenoApp["build"]>;

  beforeAll(() => {
    configureOpenApiValidator();
    const config = buildBetterAuthConfig();
    if (!config) {
      throw new Error("Better Auth config is required for profile settings tests");
    }
    createBetterAuth({
      config,
      mongoClient: getMongoClientFromMongoose(),
      userModel: User as unknown as TerrenoAuthUserModel,
    });
    app = new TerrenoApp({skipListen: true, userModel: User as never})
      .register(new BetterAuthApp({config, userModel: User as unknown as TerrenoAuthUserModel}))
      .build();
  });

  const signUp = async (label: string): Promise<string> => {
    const email = `${label}-${crypto.randomUUID()}@example.com`;
    const res = await supertest(app)
      .post("/api/auth/sign-up/email")
      .set("Origin", WEB_ORIGIN)
      .send({email, name: label, password: "password12345"});
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const token = res.headers["set-auth-token"];
    assert.isString(token);
    return `Bearer ${token}`;
  };

  it("lets users save week start day and timezone on their profile", async () => {
    const authorization = await signUp("profile-settings");

    const patched = await supertest(app)
      .patch("/auth/me")
      .set("Authorization", authorization)
      .send({timezone: "America/Los_Angeles", weekStartDay: 1});

    assert.equal(patched.status, 200, JSON.stringify(patched.body));
    assert.equal(patched.body.data.timezone, "America/Los_Angeles");
    assert.equal(patched.body.data.weekStartDay, 1);

    const me = await supertest(app).get("/auth/me").set("Authorization", authorization);
    assert.equal(me.status, 200, JSON.stringify(me.body));
    assert.equal(me.body.data.timezone, "America/Los_Angeles");
    assert.equal(me.body.data.weekStartDay, 1);
  });

  it("rejects invalid profile calendar settings", async () => {
    const authorization = await signUp("profile-invalid-settings");

    const badWeekStart = await supertest(app)
      .patch("/auth/me")
      .set("Authorization", authorization)
      .send({timezone: "America/New_York", weekStartDay: 7});
    assert.equal(badWeekStart.status, 403, JSON.stringify(badWeekStart.body));

    const badTimezone = await supertest(app)
      .patch("/auth/me")
      .set("Authorization", authorization)
      .send({timezone: "Not/AZone", weekStartDay: 1});
    assert.equal(badTimezone.status, 403, JSON.stringify(badTimezone.body));
  });
});
