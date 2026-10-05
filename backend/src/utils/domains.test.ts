import {describe, it} from "bun:test";
import {assert} from "chai";
import {normalizeDomain, normalizeDomains} from "./domains";

describe("normalizeDomain", () => {
  it("reduces URLs to bare lowercase hostnames", () => {
    assert.equal(normalizeDomain("https://www.YouTube.com/feed?x=1"), "youtube.com");
    assert.equal(normalizeDomain("  Reddit.com  "), "reddit.com");
    assert.equal(normalizeDomain("news.ycombinator.com:443/item"), "news.ycombinator.com");
    assert.equal(normalizeDomain("example.com."), "example.com");
  });

  it("keeps subdomains other than www", () => {
    assert.equal(normalizeDomain("m.youtube.com"), "m.youtube.com");
  });

  it("rejects values that are not hostnames", () => {
    assert.isUndefined(normalizeDomain(""));
    assert.isUndefined(normalizeDomain("not a domain"));
    assert.isUndefined(normalizeDomain("localhost"));
    assert.isUndefined(normalizeDomain("-bad.com"));
    assert.isUndefined(normalizeDomain(`${"a".repeat(64)}.com`));
  });
});

describe("normalizeDomains", () => {
  it("de-duplicates after normalizing and reports invalid inputs", () => {
    assert.deepEqual(normalizeDomains(["x.com", "https://X.com/home", "nope", "reddit.com"]), {
      domains: ["x.com", "reddit.com"],
      invalid: ["nope"],
    });
  });
});
