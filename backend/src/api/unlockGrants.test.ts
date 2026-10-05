import {beforeAll, beforeEach, describe, it} from "bun:test";
import {createPublicKey, generateKeyPairSync, verify} from "node:crypto";
import {configureOpenApiValidator, generateTokens, SyncApp, TerrenoApp} from "@terreno/api";
import {assert} from "chai";
import supertest from "supertest";
import {User} from "../models/user";
import type {UserDocument} from "../types/models/userTypes";
import {focusSessionRouter} from "./focusSessions";
import {unlockGrantRouter} from "./unlockGrants";

const createUser = async (label: string): Promise<UserDocument> => {
  const email = `${label}-${crypto.randomUUID()}@example.com`;
  return User.register(
    {admin: false, email, name: label} as never,
    "password12345"
  ) as unknown as Promise<UserDocument>;
};

const authHeader = async (user: UserDocument): Promise<string> => {
  const {token} = await generateTokens(user);
  return `Bearer ${token}`;
};

const fromBase64Url = (value: string): Buffer => Buffer.from(value, "base64url");

// Verifies a grant the way a client does: raw Ed25519 public key + signature over the payload bytes.
const verifyGrant = (publicKeyRaw: string, payload: string, signature: string): boolean => {
  const key = createPublicKey({
    format: "jwk",
    key: {crv: "Ed25519", kty: "OKP", x: publicKeyRaw},
  });
  return verify(null, fromBase64Url(payload), key, fromBase64Url(signature));
};

describe("unlock grants", () => {
  let app: ReturnType<TerrenoApp["build"]>;
  let signingKey: string;

  beforeAll(() => {
    configureOpenApiValidator();
    const {privateKey} = generateKeyPairSync("ed25519");
    signingKey = privateKey.export({format: "der", type: "pkcs8"}).toString("base64url");
    app = new TerrenoApp({skipListen: true, userModel: User as never})
      .register(focusSessionRouter)
      .register(unlockGrantRouter)
      .register(new SyncApp())
      .build();
  });

  beforeEach(() => {
    process.env.GRANT_SIGNING_PRIVATE_KEY = signingKey;
  });

  const startSession = async (auth: string): Promise<string> => {
    const res = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", auth)
      .send({blockedDomains: ["x.com"]});
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.data._id as string;
  };

  it("issues a signed peek grant that verifies against the public key", async () => {
    const user = await createUser("grant-owner");
    const auth = await authHeader(user);
    const sessionId = await startSession(auth);

    const before = Date.now();
    const res = await supertest(app)
      .post(`/focusSessions/${sessionId}/grants`)
      .set("Authorization", auth)
      .send({minutes: 5, reason: "peek"});
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const grant = res.body.data;

    const keyRes = await supertest(app).get("/unlockGrants/publicKey");
    assert.equal(keyRes.status, 200, JSON.stringify(keyRes.body));
    const {algorithm, publicKey} = keyRes.body.data;
    assert.equal(algorithm, "Ed25519");
    assert.isTrue(verifyGrant(publicKey, grant.payload, grant.signature));

    const payload = JSON.parse(fromBase64Url(grant.payload).toString("utf8"));
    assert.equal(payload.v, 1);
    assert.equal(payload.grantId, grant._id);
    assert.equal(payload.userId, String(user._id));
    assert.equal(payload.sessionId, sessionId);
    assert.equal(payload.scope, "all");
    const lifetime = Date.parse(payload.expiresAt) - Date.parse(payload.issuedAt);
    assert.equal(lifetime, 5 * 60 * 1000);
    assert.isAtLeast(Date.parse(payload.issuedAt), before - 1000);
    assert.equal(grant.expiresAt, payload.expiresAt);
  });

  it("detects a tampered payload", async () => {
    const auth = await authHeader(await createUser("tamper"));
    const sessionId = await startSession(auth);
    const res = await supertest(app)
      .post(`/focusSessions/${sessionId}/grants`)
      .set("Authorization", auth)
      .send({minutes: 5});
    const grant = res.body.data;
    const keyRes = await supertest(app).get("/unlockGrants/publicKey");

    const payload = JSON.parse(fromBase64Url(grant.payload).toString("utf8"));
    payload.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const forged = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    assert.isFalse(verifyGrant(keyRes.body.data.publicKey, forged, grant.signature));
  });

  it("clamps minutes to 1-30 and rejects non-numeric minutes", async () => {
    const auth = await authHeader(await createUser("clamp"));
    const sessionId = await startSession(auth);
    const lifetime = async (minutes: unknown): Promise<number> => {
      const res = await supertest(app)
        .post(`/focusSessions/${sessionId}/grants`)
        .set("Authorization", auth)
        .send({minutes});
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const payload = JSON.parse(fromBase64Url(res.body.data.payload).toString("utf8"));
      return (Date.parse(payload.expiresAt) - Date.parse(payload.issuedAt)) / 60000;
    };
    assert.equal(await lifetime(90), 30);
    assert.equal(await lifetime(0), 1);

    const bad = await supertest(app)
      .post(`/focusSessions/${sessionId}/grants`)
      .set("Authorization", auth)
      .send({minutes: "lots"});
    assert.equal(bad.status, 400);
  });

  it("refuses grants for ended sessions and for other users' sessions", async () => {
    const ownerAuth = await authHeader(await createUser("ended-owner"));
    const otherAuth = await authHeader(await createUser("ended-other"));
    const sessionId = await startSession(ownerAuth);

    const foreign = await supertest(app)
      .post(`/focusSessions/${sessionId}/grants`)
      .set("Authorization", otherAuth)
      .send({minutes: 5});
    assert.oneOf(foreign.status, [403, 404]);

    await supertest(app).post(`/focusSessions/${sessionId}/end`).set("Authorization", ownerAuth);
    const ended = await supertest(app)
      .post(`/focusSessions/${sessionId}/grants`)
      .set("Authorization", ownerAuth)
      .send({minutes: 5});
    assert.equal(ended.status, 409);
  });

  it("fails closed when no signing key is configured", async () => {
    const auth = await authHeader(await createUser("no-key"));
    const sessionId = await startSession(auth);
    Reflect.deleteProperty(process.env, "GRANT_SIGNING_PRIVATE_KEY");
    const res = await supertest(app)
      .post(`/focusSessions/${sessionId}/grants`)
      .set("Authorization", auth)
      .send({minutes: 5});
    assert.equal(res.status, 500);
  });

  it("fails closed when the signing key is not an Ed25519 key", async () => {
    const auth = await authHeader(await createUser("wrong-key"));
    const sessionId = await startSession(auth);
    const wrongKeys = [
      generateKeyPairSync("ec", {namedCurve: "P-256"}).privateKey,
      generateKeyPairSync("rsa", {modulusLength: 2048}).privateKey,
    ];
    for (const key of wrongKeys) {
      process.env.GRANT_SIGNING_PRIVATE_KEY = key
        .export({format: "der", type: "pkcs8"})
        .toString("base64url");
      const grant = await supertest(app)
        .post(`/focusSessions/${sessionId}/grants`)
        .set("Authorization", auth)
        .send({minutes: 5});
      assert.equal(grant.status, 500, key.asymmetricKeyType);
      const publicKey = await supertest(app).get("/unlockGrants/publicKey");
      assert.equal(publicKey.status, 500, key.asymmetricKeyType);
    }
    process.env.GRANT_SIGNING_PRIVATE_KEY = "not-a-key";
    const garbage = await supertest(app).get("/unlockGrants/publicKey");
    assert.equal(garbage.status, 500);

    process.env.GRANT_SIGNING_PRIVATE_KEY = signingKey;
    const list = await supertest(app).get("/unlockGrants").set("Authorization", auth);
    assert.lengthOf(list.body.data, 0);
  });

  it("rounds fractional minutes", async () => {
    const auth = await authHeader(await createUser("round"));
    const sessionId = await startSession(auth);
    const res = await supertest(app)
      .post(`/focusSessions/${sessionId}/grants`)
      .set("Authorization", auth)
      .send({minutes: 2.6});
    const payload = JSON.parse(fromBase64Url(res.body.data.payload).toString("utf8"));
    assert.equal(Date.parse(payload.expiresAt) - Date.parse(payload.issuedAt), 3 * 60 * 1000);
  });

  it("rejects grant writes over the sync channel", async () => {
    const auth = await authHeader(await createUser("sync-write"));
    const sessionId = await startSession(auth);
    const issued = await supertest(app)
      .post(`/focusSessions/${sessionId}/grants`)
      .set("Authorization", auth)
      .send({minutes: 5});
    const grant = issued.body.data;
    const forgedId = "000000000000000000000abc";
    const later = new Date(Date.now() + 86400000).toISOString();
    const mutations = [
      {
        collection: "unlockGrants",
        data: {
          expiresAt: later,
          issuedAt: new Date().toISOString(),
          payload: grant.payload,
          reason: "peek",
          sessionId,
          signature: grant.signature,
        },
        id: forgedId,
        operation: "create",
      },
      {
        baseVersion: grant._syncSeq,
        collection: "unlockGrants",
        data: {expiresAt: later},
        id: grant._id,
        operation: "update",
      },
      {baseVersion: grant._syncSeq, collection: "unlockGrants", id: grant._id, operation: "delete"},
    ];
    for (const mutation of mutations) {
      const res = await supertest(app)
        .post("/sync/mutate")
        .set("Authorization", auth)
        .send({...mutation, mutationId: crypto.randomUUID()});
      assert.equal(res.status, 403, `${mutation.operation}: ${JSON.stringify(res.body)}`);
    }

    const read = await supertest(app).get(`/unlockGrants/${grant._id}`).set("Authorization", auth);
    assert.equal(read.status, 200);
    assert.equal(read.body.data.expiresAt, grant.expiresAt);
    const forged = await supertest(app).get(`/unlockGrants/${forgedId}`).set("Authorization", auth);
    assert.notEqual(forged.status, 200);
  });

  it("lets owners read their grants but not create, change, or delete them directly", async () => {
    const ownerAuth = await authHeader(await createUser("direct-owner"));
    const otherAuth = await authHeader(await createUser("direct-other"));
    const sessionId = await startSession(ownerAuth);
    const issued = await supertest(app)
      .post(`/focusSessions/${sessionId}/grants`)
      .set("Authorization", ownerAuth)
      .send({minutes: 5});
    const grantId = issued.body.data._id as string;

    const read = await supertest(app)
      .get(`/unlockGrants/${grantId}`)
      .set("Authorization", ownerAuth);
    assert.equal(read.status, 200);

    const foreignRead = await supertest(app)
      .get(`/unlockGrants/${grantId}`)
      .set("Authorization", otherAuth);
    assert.oneOf(foreignRead.status, [403, 404]);
    const foreignList = await supertest(app).get("/unlockGrants").set("Authorization", otherAuth);
    assert.lengthOf(foreignList.body.data, 0);

    const forged = await supertest(app)
      .post("/unlockGrants")
      .set("Authorization", ownerAuth)
      .send({expiresAt: new Date().toISOString(), sessionId});
    assert.oneOf(forged.status, [403, 405]);

    const patched = await supertest(app)
      .patch(`/unlockGrants/${grantId}`)
      .set("Authorization", ownerAuth)
      .send({expiresAt: new Date(Date.now() + 86400000).toISOString()});
    assert.oneOf(patched.status, [403, 405]);

    const deleted = await supertest(app)
      .delete(`/unlockGrants/${grantId}`)
      .set("Authorization", ownerAuth);
    assert.oneOf(deleted.status, [403, 405]);
  });

  it("requires sign-in for everything except the public key", async () => {
    const auth = await authHeader(await createUser("anon-owner"));
    const sessionId = await startSession(auth);
    const issued = await supertest(app)
      .post(`/focusSessions/${sessionId}/grants`)
      .set("Authorization", auth)
      .send({minutes: 5});
    const grantId = issued.body.data._id as string;

    const list = await supertest(app).get("/unlockGrants");
    assert.oneOf(list.status, [401, 403, 405], "list");
    const read = await supertest(app).get(`/unlockGrants/${grantId}`);
    assert.oneOf(read.status, [401, 403, 405], "read");
    const grant = await supertest(app)
      .post(`/focusSessions/${sessionId}/grants`)
      .send({minutes: 5});
    assert.oneOf(grant.status, [401, 403, 405], "grant");
  });

  it("syncs grants to the owner's stream only", async () => {
    const owner = await createUser("sync-owner");
    const ownerAuth = await authHeader(owner);
    const otherAuth = await authHeader(await createUser("sync-other"));
    const sessionId = await startSession(ownerAuth);
    const issued = await supertest(app)
      .post(`/focusSessions/${sessionId}/grants`)
      .set("Authorization", ownerAuth)
      .send({minutes: 5});
    const grantId = issued.body.data._id as string;
    const stream = `unlockGrants|owner:${String(owner._id)}`;

    const snapshot = await supertest(app)
      .get("/sync/snapshot")
      .query({collection: "unlockGrants", stream})
      .set("Authorization", ownerAuth);
    assert.equal(snapshot.status, 200, JSON.stringify(snapshot.body));
    assert.include(JSON.stringify(snapshot.body), grantId);

    const foreign = await supertest(app)
      .get("/sync/snapshot")
      .query({collection: "unlockGrants", stream})
      .set("Authorization", otherAuth);
    assert.notEqual(foreign.status, 200);
  });
});
