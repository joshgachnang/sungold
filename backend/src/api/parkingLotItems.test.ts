import {beforeAll, describe, it} from "bun:test";
import {configureOpenApiValidator, generateTokens, SyncApp, TerrenoApp} from "@terreno/api";
import {assert} from "chai";
import supertest from "supertest";
import {FocusSession} from "../models/focusSession";
import {User} from "../models/user";
import type {UserDocument} from "../types/models/userTypes";
import {focusSessionRouter} from "./focusSessions";
import {parkingLotItemRouter} from "./parkingLotItems";

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

const startSession = async (ownerId: UserDocument["_id"]): Promise<string> => {
  const session = await FocusSession.create({blockedDomains: ["x.com"], ownerId});
  return session._id;
};

describe("parking lot items", () => {
  let app: ReturnType<TerrenoApp["build"]>;

  beforeAll(() => {
    configureOpenApiValidator();
    app = new TerrenoApp({skipListen: true, userModel: User as never})
      .register(focusSessionRouter)
      .register(parkingLotItemRouter)
      .register(new SyncApp())
      .build();
  });

  it("captures an open item for the caller's active session", async () => {
    const user = await createUser("parking-owner");
    const auth = await authHeader(user);
    const sessionId = await startSession(user._id);

    const created = await supertest(app)
      .post("/parkingLotItems")
      .set("Authorization", auth)
      .send({sessionId, text: "Check whether the draft email sent"});

    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.ownerId, String(user._id));
    assert.equal(created.body.data.sessionId, sessionId);
    assert.equal(created.body.data.text, "Check whether the draft email sent");
    assert.equal(created.body.data.status, "open");
    assert.isUndefined(created.body.data.resolvedAt);
  });

  it("rejects invalid text, foreign sessions, and ended sessions", async () => {
    const user = await createUser("parking-invalid");
    const other = await createUser("parking-invalid-other");
    const auth = await authHeader(user);
    const otherSessionId = await startSession(other._id);
    const endedSessionId = await startSession(user._id);
    await FocusSession.updateOne({_id: endedSessionId}, {endedAt: new Date(), status: "ended"});

    const emptyText = await supertest(app)
      .post("/parkingLotItems")
      .set("Authorization", auth)
      .send({sessionId: endedSessionId, text: ""});
    assert.equal(emptyText.status, 400);

    const longText = await supertest(app)
      .post("/parkingLotItems")
      .set("Authorization", auth)
      .send({sessionId: endedSessionId, text: "x".repeat(281)});
    assert.equal(longText.status, 400);

    const foreign = await supertest(app)
      .post("/parkingLotItems")
      .set("Authorization", auth)
      .send({sessionId: otherSessionId, text: "This should not attach"});
    assert.equal(foreign.status, 400);

    const ended = await supertest(app)
      .post("/parkingLotItems")
      .set("Authorization", auth)
      .send({sessionId: endedSessionId, text: "Too late"});
    assert.equal(ended.status, 400);
  });

  it("lists only the owner's open parking lot items across sessions", async () => {
    const user = await createUser("parking-list-owner");
    const other = await createUser("parking-list-other");
    const auth = await authHeader(user);
    const otherAuth = await authHeader(other);
    const earlierSessionId = await startSession(user._id);
    const earlier = await supertest(app)
      .post("/parkingLotItems")
      .set("Authorization", auth)
      .send({sessionId: earlierSessionId, text: "Earlier carry-forward"});
    assert.equal(earlier.status, 201, JSON.stringify(earlier.body));
    await FocusSession.updateOne({_id: earlierSessionId}, {endedAt: new Date(), status: "ended"});
    const currentSessionId = await startSession(user._id);
    const current = await supertest(app)
      .post("/parkingLotItems")
      .set("Authorization", auth)
      .send({sessionId: currentSessionId, text: "Current item"});
    assert.equal(current.status, 201, JSON.stringify(current.body));

    const resolved = await supertest(app)
      .patch(`/parkingLotItems/${earlier.body.data._id}`)
      .set("Authorization", auth)
      .send({status: "dismissed"});
    assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
    assert.equal(resolved.body.data.status, "dismissed");
    assert.isString(resolved.body.data.resolvedAt);

    const list = await supertest(app)
      .get("/parkingLotItems?status=open")
      .set("Authorization", auth);
    assert.equal(list.status, 200, JSON.stringify(list.body));
    assert.sameMembers(
      list.body.data.map((item: {text: string}) => item.text),
      ["Current item"]
    );

    const foreignList = await supertest(app)
      .get("/parkingLotItems?status=open")
      .set("Authorization", otherAuth);
    assert.equal(foreignList.status, 200, JSON.stringify(foreignList.body));
    assert.lengthOf(foreignList.body.data, 0);
  });

  it("syncs parking lot items to the owner's stream only", async () => {
    const owner = await createUser("parking-stream-owner");
    const ownerAuth = await authHeader(owner);
    const otherAuth = await authHeader(await createUser("parking-stream-other"));
    const sessionId = await startSession(owner._id);
    const created = await supertest(app)
      .post("/parkingLotItems")
      .set("Authorization", ownerAuth)
      .send({sessionId, text: "Synced thought"});
    assert.equal(created.status, 201, JSON.stringify(created.body));

    const stream = `parkingLotItems|owner:${String(owner._id)}`;
    const snapshot = await supertest(app)
      .get("/sync/snapshot")
      .query({collection: "parkingLotItems", stream})
      .set("Authorization", ownerAuth);
    assert.equal(snapshot.status, 200, JSON.stringify(snapshot.body));
    assert.include(JSON.stringify(snapshot.body), created.body.data._id);

    const foreign = await supertest(app)
      .get("/sync/snapshot")
      .query({collection: "parkingLotItems", stream})
      .set("Authorization", otherAuth);
    assert.notEqual(foreign.status, 200);
  });
});
