import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyRegistryPublication,
  waitForRegistryIntegrity
} from "./publish-release.mjs";

test("treats a dist-tagged version as pending while npm scans it", () => {
  assert.deepEqual(
    classifyRegistryPublication({
      integrity: null,
      distTags: { candidate: "0.1.0", latest: "0.1.0" },
      version: "0.1.0"
    }),
    { status: "pending", integrity: null }
  );
});

test("treats a version with neither metadata nor a dist-tag as unpublished", () => {
  assert.deepEqual(
    classifyRegistryPublication({
      integrity: null,
      distTags: { candidate: "0.0.9" },
      version: "0.1.0"
    }),
    { status: "unpublished", integrity: null }
  );
});

test("waits for npm scanning before comparing published bytes", async () => {
  const observations = [null, null, "sha512-approved"];
  let delays = 0;

  const integrity = await waitForRegistryIntegrity({
    name: "@threadlabs/looma",
    version: "0.1.0",
    expectedIntegrity: "sha512-approved",
    attempts: 3,
    lookup: () => observations.shift(),
    delay: async () => {
      delays += 1;
    }
  });

  assert.equal(integrity, "sha512-approved");
  assert.equal(delays, 2);
});

test("fails immediately when npm exposes different immutable bytes", async () => {
  let delays = 0;

  await assert.rejects(
    waitForRegistryIntegrity({
      name: "@threadlabs/looma",
      version: "0.1.0",
      expectedIntegrity: "sha512-approved",
      attempts: 3,
      lookup: () => "sha512-different",
      delay: async () => {
        delays += 1;
      }
    }),
    /exists with different bytes/
  );

  assert.equal(delays, 0);
});

test("reports npm scanning when a published version never becomes visible", async () => {
  await assert.rejects(
    waitForRegistryIntegrity({
      name: "@threadlabs/looma",
      version: "0.1.0",
      expectedIntegrity: "sha512-approved",
      attempts: 2,
      lookup: () => null,
      delay: async () => {}
    }),
    /did not become available after npm scanning/
  );
});
