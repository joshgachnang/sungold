import {beforeAll, describe, it} from "bun:test";
import {configureOpenApiValidator, generateTokens, TerrenoApp} from "@terreno/api";
import {assert} from "chai";
import supertest from "supertest";
import {User} from "../models/user";
import type {UserDocument} from "../types/models/userTypes";
import {blocklistRouter} from "./blocklists";
import {focusSessionRouter} from "./focusSessions";

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

describe("focus sessions", () => {
  let app: ReturnType<TerrenoApp["build"]>;

  beforeAll(() => {
    configureOpenApiValidator();
    app = new TerrenoApp({skipListen: true, userModel: User as never})
      .register(blocklistRouter)
      .register(focusSessionRouter)
      .build();
  });

  it("starts an active session owned by the caller with normalized domains", async () => {
    const user = await createUser("owner");
    const res = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", await authHeader(user))
      .send({
        blockedDomains: ["https://www.YouTube.com/feed", "x.com", "x.com"],
        intention: "Finish the auth migration",
      });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    const session = res.body.data;
    assert.equal(session.ownerId, String(user._id));
    assert.equal(session.status, "active");
    assert.deepEqual(session.blockedDomains, ["youtube.com", "x.com"]);
    assert.equal(session.intention, "Finish the auth migration");
    assert.isString(session.startedAt);
    assert.isString(session._id);
  });

  it("starts from the caller's blocklists plus extra typed domains", async () => {
    const auth = await authHeader(await createUser("blocklist-start"));
    const social = await supertest(app)
      .post("/blocklists")
      .set("Authorization", auth)
      .send({domains: ["x.com", "reddit.com"], name: "Social"});
    const video = await supertest(app)
      .post("/blocklists")
      .set("Authorization", auth)
      .send({domains: ["youtube.com", "reddit.com"], name: "Video"});

    const started = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", auth)
      .send({
        blockedDomains: ["https://www.YouTube.com/feed", "news.ycombinator.com"],
        blocklistIds: [social.body.data._id, video.body.data._id],
        intention: "Write the dashboard notes",
      });

    assert.equal(started.status, 201, JSON.stringify(started.body));
    assert.deepEqual(started.body.data.blocklistIds, [social.body.data._id, video.body.data._id]);
    assert.deepEqual(started.body.data.blockedDomains, [
      "x.com",
      "reddit.com",
      "youtube.com",
      "news.ycombinator.com",
    ]);
  });

  it("rejects blocklist ids the caller does not own", async () => {
    const ownerAuth = await authHeader(await createUser("blocklist-owner"));
    const otherAuth = await authHeader(await createUser("blocklist-other"));
    const otherList = await supertest(app)
      .post("/blocklists")
      .set("Authorization", otherAuth)
      .send({domains: ["example.com"], name: "Other"});

    const started = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", ownerAuth)
      .send({blockedDomains: ["x.com"], blocklistIds: [otherList.body.data._id]});

    assert.equal(started.status, 400, JSON.stringify(started.body));
  });

  it("rejects a session with no domains or an invalid domain", async () => {
    const auth = await authHeader(await createUser("invalid"));
    const empty = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", auth)
      .send({blockedDomains: []});
    assert.equal(empty.status, 400);

    const bad = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", auth)
      .send({blockedDomains: ["not a domain"]});
    assert.equal(bad.status, 400);
  });

  it("ignores client-supplied owner and status", async () => {
    const user = await createUser("spoof");
    const other = await createUser("victim");
    const res = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", await authHeader(user))
      .send({blockedDomains: ["x.com"], ownerId: String(other._id), status: "ended"});
    assert.oneOf(res.status, [201, 400]);
    if (res.status === 201) {
      assert.equal(res.body.data.ownerId, String(user._id));
      assert.equal(res.body.data.status, "active");
    }
  });

  it("allows only one active session per user", async () => {
    const auth = await authHeader(await createUser("single"));
    const first = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", auth)
      .send({blockedDomains: ["x.com"]});
    assert.equal(first.status, 201);

    const second = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", auth)
      .send({blockedDomains: ["reddit.com"]});
    assert.equal(second.status, 409);
  });

  it("ends a session and then allows a new one", async () => {
    const auth = await authHeader(await createUser("ender"));
    const started = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", auth)
      .send({blockedDomains: ["x.com"]});
    const id = started.body.data._id as string;

    const ended = await supertest(app).post(`/focusSessions/${id}/end`).set("Authorization", auth);
    assert.equal(ended.status, 200, JSON.stringify(ended.body));
    assert.equal(ended.body.data.status, "ended");
    assert.isString(ended.body.data.endedAt);

    const again = await supertest(app).post(`/focusSessions/${id}/end`).set("Authorization", auth);
    assert.equal(again.status, 409);

    const next = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", auth)
      .send({blockedDomains: ["reddit.com"]});
    assert.equal(next.status, 201);
  });

  it("does not let another user read, list, end, or delete a session", async () => {
    const ownerAuth = await authHeader(await createUser("private-owner"));
    const otherAuth = await authHeader(await createUser("private-other"));
    const started = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", ownerAuth)
      .send({blockedDomains: ["x.com"]});
    const id = started.body.data._id as string;

    const read = await supertest(app).get(`/focusSessions/${id}`).set("Authorization", otherAuth);
    assert.oneOf(read.status, [403, 404]);

    const list = await supertest(app).get("/focusSessions").set("Authorization", otherAuth);
    assert.equal(list.status, 200);
    assert.lengthOf(list.body.data, 0);

    const end = await supertest(app)
      .post(`/focusSessions/${id}/end`)
      .set("Authorization", otherAuth);
    assert.oneOf(end.status, [403, 404]);

    const del = await supertest(app).delete(`/focusSessions/${id}`).set("Authorization", otherAuth);
    assert.oneOf(del.status, [403, 404, 405]);

    const ownerRead = await supertest(app)
      .get(`/focusSessions/${id}`)
      .set("Authorization", ownerAuth);
    assert.equal(ownerRead.status, 200);
    assert.equal(ownerRead.body.data.status, "active");
  });

  it("lets the owner update domains with the same normalization, but not other users", async () => {
    const ownerAuth = await authHeader(await createUser("update-owner"));
    const otherAuth = await authHeader(await createUser("update-other"));
    const started = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", ownerAuth)
      .send({blockedDomains: ["x.com"]});
    const id = started.body.data._id as string;

    const updated = await supertest(app)
      .patch(`/focusSessions/${id}`)
      .set("Authorization", ownerAuth)
      .send({blockedDomains: ["https://Reddit.com/r/all", "x.com"]});
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    assert.deepEqual(updated.body.data.blockedDomains, ["reddit.com", "x.com"]);

    const invalid = await supertest(app)
      .patch(`/focusSessions/${id}`)
      .set("Authorization", ownerAuth)
      .send({blockedDomains: ["nope"]});
    assert.equal(invalid.status, 400);

    const status = await supertest(app)
      .patch(`/focusSessions/${id}`)
      .set("Authorization", ownerAuth)
      .send({status: "ended"});
    assert.oneOf(status.status, [200, 400]);
    const afterStatus = await supertest(app)
      .get(`/focusSessions/${id}`)
      .set("Authorization", ownerAuth);
    assert.equal(afterStatus.body.data.status, "active");

    const foreign = await supertest(app)
      .patch(`/focusSessions/${id}`)
      .set("Authorization", otherAuth)
      .send({blockedDomains: ["example.com"]});
    assert.oneOf(foreign.status, [403, 404]);
  });

  it("does not let the owner delete or end a session through PATCH", async () => {
    const auth = await authHeader(await createUser("soft-delete"));
    const started = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", auth)
      .send({blockedDomains: ["x.com"]});
    const id = started.body.data._id as string;

    await supertest(app)
      .patch(`/focusSessions/${id}`)
      .set("Authorization", auth)
      .send({deleted: true, endedAt: new Date().toISOString()});

    const read = await supertest(app).get(`/focusSessions/${id}`).set("Authorization", auth);
    assert.equal(read.status, 200);
    assert.equal(read.body.data.status, "active");
    assert.isFalse(read.body.data.deleted);
    assert.isUndefined(read.body.data.endedAt);

    const second = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", auth)
      .send({blockedDomains: ["reddit.com"]});
    assert.equal(second.status, 409);
  });

  it("ignores server-controlled fields on create", async () => {
    const auth = await authHeader(await createUser("create-fields"));
    const res = await supertest(app)
      .post("/focusSessions")
      .set("Authorization", auth)
      .send({blockedDomains: ["x.com"], deleted: true});
    assert.oneOf(res.status, [201, 400]);

    const list = await supertest(app).get("/focusSessions").set("Authorization", auth);
    for (const session of list.body.data) {
      assert.isFalse(session.deleted);
      assert.equal(session.status, "active");
    }
    if (res.status === 201) {
      assert.lengthOf(list.body.data, 1);
    }
  });

  it("returns 409 to every loser when sessions are started concurrently", async () => {
    const auth = await authHeader(await createUser("race"));
    const results = await Promise.all(
      ["a.com", "b.com", "c.com", "d.com"].map((domain) =>
        supertest(app)
          .post("/focusSessions")
          .set("Authorization", auth)
          .send({blockedDomains: [domain]})
      )
    );
    const statuses = results.map((res) => res.status).sort();
    assert.deepEqual(statuses, [201, 409, 409, 409]);
  });

  it("requires authentication", async () => {
    const res = await supertest(app)
      .post("/focusSessions")
      .send({blockedDomains: ["x.com"]});
    assert.oneOf(res.status, [401, 403]);
  });
});
