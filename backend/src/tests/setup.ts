import {registerSimpleMongoPreload, setTerrenoTestEnv} from "@terreno/test";
import mongoose from "mongoose";

// Tests run against an in-process MongoDB (mongodb-memory-server) so they do not depend on a
// local container or CI service. Set TERRENO_TEST_MONGODB_URI to use a specific server instead.
process.env.TERRENO_TEST_USE_MEMORY_MONGO ??= "true";

const defaultLocalMongoUri =
  process.env.TEST_MONGO_URI ||
  "mongodb://127.0.0.1:27017/sungold-test?directConnection=true&connectTimeoutMS=360000";

const testEnv = {
  extra: {
    MONGO_URI: defaultLocalMongoUri,
    TEST_MONGO_URI: defaultLocalMongoUri,
    TOKEN_EXPIRES_IN: "1h",
  },
  tokenIssuer: "sungold.test",
};

const applyAuthEnv = (): void => {
  process.env.AUTH_PROVIDER = "better-auth";
  process.env.BETTER_AUTH_SECRET = "sungold-test-better-auth-secret-000032";
  process.env.BETTER_AUTH_URL = "http://localhost:4093";
};

// The preload only applies the test env in beforeEach, but test files build their app in
// beforeAll, which runs first. TerrenoApp registers the JWT strategy at build time only when
// TOKEN_SECRET is set, so whichever file ran first built an app without it and answered
// anonymous requests with 500s. Apply the env now, before any file's beforeAll.
setTerrenoTestEnv(testEnv);
applyAuthEnv();

registerSimpleMongoPreload({
  defaultLocalMongoUri,
  onAfterEach: async () => {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  },
  onBeforeEach: applyAuthEnv,
  testEnv,
});
