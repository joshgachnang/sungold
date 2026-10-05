import {beforeAll, describe, it} from "bun:test";
import {configureOpenApiValidator, generateTokens, SyncApp, TerrenoApp} from "@terreno/api";
import {assert} from "chai";
import supertest from "supertest";
import {User} from "../models/user";
import type {UserDocument} from "../types/models/userTypes";
import {blocklistRouter} from "./blocklists";

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

describe("blocklists", () => {
  let app: ReturnType<TerrenoApp["build"]>;

  beforeAll(() => {
    configureOpenApiValidator();
    app = new TerrenoApp({skipListen: true, userModel: User as never})
      .register(blocklistRouter)
      .register(new SyncApp())
      .build();
  });

  it("creates an owner blocklist with normalized domains", async () => {
    const user = await createUser("blocklist-owner");
    const res = await supertest(app)
      .post("/blocklists")
      .set("Authorization", await authHeader(user))
      .send({
        domains: ["https://www.YouTube.com/feed", "x.com", "x.com"],
        name: "Deep work",
        ownerId: crypto.randomUUID(),
        source: "starter",
      });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.ownerId, String(user._id));
    assert.equal(res.body.data.name, "Deep work");
    assert.deepEqual(res.body.data.domains, ["youtube.com", "x.com"]);
    assert.equal(res.body.data.source, "user");
  });

  it("rejects empty names, empty domains, invalid domains, and too many domains", async () => {
    const auth = await authHeader(await createUser("blocklist-invalid"));

    const emptyName = await supertest(app)
      .post("/blocklists")
      .set("Authorization", auth)
      .send({domains: ["x.com"], name: ""});
    assert.equal(emptyName.status, 400);

    const emptyDomains = await supertest(app)
      .post("/blocklists")
      .set("Authorization", auth)
      .send({domains: [], name: "Empty"});
    assert.equal(emptyDomains.status, 400);

    const invalidDomain = await supertest(app)
      .post("/blocklists")
      .set("Authorization", auth)
      .send({domains: ["not a domain"], name: "Bad"});
    assert.equal(invalidDomain.status, 400);

    const tooMany = await supertest(app)
      .post("/blocklists")
      .set("Authorization", auth)
      .send({
        domains: Array.from({length: 201}, (_, index) => `example-${index}.com`),
        name: "Too many",
      });
    assert.equal(tooMany.status, 400);
  });

  it("lets owners update and delete only their own blocklists", async () => {
    const ownerAuth = await authHeader(await createUser("blocklist-edit-owner"));
    const otherAuth = await authHeader(await createUser("blocklist-edit-other"));
    const created = await supertest(app)
      .post("/blocklists")
      .set("Authorization", ownerAuth)
      .send({domains: ["x.com"], name: "Social"});
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.data._id as string;

    const updated = await supertest(app)
      .patch(`/blocklists/${id}`)
      .set("Authorization", ownerAuth)
      .send({domains: ["https://Reddit.com/r/all", "x.com"], name: "Updated"});
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    assert.deepEqual(updated.body.data.domains, ["reddit.com", "x.com"]);
    assert.equal(updated.body.data.name, "Updated");

    const foreignUpdate = await supertest(app)
      .patch(`/blocklists/${id}`)
      .set("Authorization", otherAuth)
      .send({name: "Stolen"});
    assert.oneOf(foreignUpdate.status, [403, 404]);

    const foreignList = await supertest(app).get("/blocklists").set("Authorization", otherAuth);
    assert.equal(foreignList.status, 200);
    assert.lengthOf(foreignList.body.data, 0);

    const foreignRead = await supertest(app)
      .get(`/blocklists/${id}`)
      .set("Authorization", otherAuth);
    assert.oneOf(foreignRead.status, [403, 404]);

    const foreignDelete = await supertest(app)
      .delete(`/blocklists/${id}`)
      .set("Authorization", otherAuth);
    assert.oneOf(foreignDelete.status, [403, 404]);

    const deleted = await supertest(app)
      .delete(`/blocklists/${id}`)
      .set("Authorization", ownerAuth);
    assert.equal(deleted.status, 204, JSON.stringify(deleted.body));

    const readDeleted = await supertest(app)
      .get(`/blocklists/${id}`)
      .set("Authorization", ownerAuth);
    assert.oneOf(readDeleted.status, [403, 404]);
  });

  it("seeds editable starter blocklists once per user", async () => {
    const user = await createUser("blocklist-starter");
    const auth = await authHeader(user);

    const seeded = await supertest(app).post("/blocklists/starter").set("Authorization", auth);
    assert.equal(seeded.status, 200, JSON.stringify(seeded.body));
    assert.sameMembers(
      seeded.body.data.map((blocklist: {name: string}) => blocklist.name),
      ["Social", "News", "Video"]
    );
    const social = seeded.body.data.find(
      (blocklist: {name: string}) => blocklist.name === "Social"
    );
    assert.deepInclude(social, {
      name: "Social",
      source: "starter",
    });
    assert.deepEqual(social.domains, [
      "x.com",
      "facebook.com",
      "instagram.com",
      "tiktok.com",
      "reddit.com",
    ]);

    const again = await supertest(app).post("/blocklists/starter").set("Authorization", auth);
    assert.equal(again.status, 200, JSON.stringify(again.body));
    assert.lengthOf(again.body.data, 3);
    assert.sameMembers(
      again.body.data.map((blocklist: {_id: string}) => blocklist._id),
      seeded.body.data.map((blocklist: {_id: string}) => blocklist._id)
    );

    const renamed = await supertest(app)
      .patch(`/blocklists/${seeded.body.data[0]._id}`)
      .set("Authorization", auth)
      .send({name: "My social"});
    assert.equal(renamed.status, 200, JSON.stringify(renamed.body));

    const deleted = await supertest(app)
      .delete(`/blocklists/${seeded.body.data[1]._id}`)
      .set("Authorization", auth);
    assert.equal(deleted.status, 204, JSON.stringify(deleted.body));

    const afterEdit = await supertest(app).post("/blocklists/starter").set("Authorization", auth);
    assert.equal(afterEdit.status, 200, JSON.stringify(afterEdit.body));
    assert.lengthOf(afterEdit.body.data, 2);
    assert.include(
      afterEdit.body.data.map((blocklist: {name: string}) => blocklist.name),
      "My social"
    );
    assert.notInclude(
      afterEdit.body.data.map((blocklist: {name: string}) => blocklist.name),
      seeded.body.data[1].name
    );
  });

  it("allowlists blocklist fields written over the sync channel", async () => {
    const user = await createUser("blocklist-sync");
    const other = await createUser("blocklist-sync-other");
    const auth = await authHeader(user);
    const otherAuth = await authHeader(other);
    const created = await supertest(app)
      .post("/blocklists")
      .set("Authorization", auth)
      .send({domains: ["x.com"], name: "Sync safe"});
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const blocklist = created.body.data;

    const forgedId = "000000000000000000000abc";
    const createdViaSync = await supertest(app)
      .post("/sync/mutate")
      .set("Authorization", auth)
      .send({
        collection: "blocklists",
        data: {
          domains: ["https://www.Reddit.com/r/all"],
          name: "Forged",
          ownerId: String(user._id),
          source: "starter",
        },
        id: forgedId,
        mutationId: crypto.randomUUID(),
        operation: "create",
      });
    assert.equal(createdViaSync.status, 200, JSON.stringify(createdViaSync.body));
    const readForged = await supertest(app)
      .get(`/blocklists/${forgedId}`)
      .set("Authorization", auth);
    assert.equal(readForged.status, 200, JSON.stringify(readForged.body));
    assert.equal(readForged.body.data.ownerId, String(user._id));
    assert.equal(readForged.body.data.source, "user");
    assert.deepEqual(readForged.body.data.domains, ["reddit.com"]);

    const updatedViaSync = await supertest(app)
      .post("/sync/mutate")
      .set("Authorization", auth)
      .send({
        baseVersion: blocklist._syncSeq,
        collection: "blocklists",
        data: {domains: ["https://www.News.YCombinator.com/news"], source: "starter"},
        id: blocklist._id,
        mutationId: crypto.randomUUID(),
        operation: "update",
      });
    assert.equal(updatedViaSync.status, 200, JSON.stringify(updatedViaSync.body));
    const readUpdated = await supertest(app)
      .get(`/blocklists/${blocklist._id}`)
      .set("Authorization", auth);
    assert.deepEqual(readUpdated.body.data.domains, ["news.ycombinator.com"]);
    assert.equal(readUpdated.body.data.source, "user");

    const forgedOwner = await supertest(app)
      .post("/sync/mutate")
      .set("Authorization", auth)
      .send({
        collection: "blocklists",
        data: {
          domains: ["example.com"],
          name: "Other owner",
          ownerId: String(other._id),
          source: "user",
        },
        id: "000000000000000000000def",
        mutationId: crypto.randomUUID(),
        operation: "create",
      });
    assert.equal(forgedOwner.status, 403, JSON.stringify(forgedOwner.body));
    const foreignRead = await supertest(app)
      .get("/blocklists/000000000000000000000def")
      .set("Authorization", otherAuth);
    assert.oneOf(foreignRead.status, [403, 404]);

    const removed = await supertest(app).post("/sync/mutate").set("Authorization", auth).send({
      baseVersion: blocklist._syncSeq,
      collection: "blocklists",
      id: blocklist._id,
      mutationId: crypto.randomUUID(),
      operation: "delete",
    });
    assert.equal(removed.status, 200, JSON.stringify(removed.body));

    const readDeleted = await supertest(app)
      .get(`/blocklists/${blocklist._id}`)
      .set("Authorization", auth);
    assert.oneOf(readDeleted.status, [403, 404]);
  });

  it("syncs blocklists to the owner's stream only", async () => {
    const owner = await createUser("blocklist-stream-owner");
    const ownerAuth = await authHeader(owner);
    const otherAuth = await authHeader(await createUser("blocklist-stream-other"));
    const created = await supertest(app)
      .post("/blocklists")
      .set("Authorization", ownerAuth)
      .send({domains: ["x.com"], name: "Streamed"});
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const stream = `blocklists|owner:${String(owner._id)}`;

    const snapshot = await supertest(app)
      .get("/sync/snapshot")
      .query({collection: "blocklists", stream})
      .set("Authorization", ownerAuth);
    assert.equal(snapshot.status, 200, JSON.stringify(snapshot.body));
    assert.include(JSON.stringify(snapshot.body), created.body.data._id);

    const foreign = await supertest(app)
      .get("/sync/snapshot")
      .query({collection: "blocklists", stream})
      .set("Authorization", otherAuth);
    assert.notEqual(foreign.status, 200);
  });
});
