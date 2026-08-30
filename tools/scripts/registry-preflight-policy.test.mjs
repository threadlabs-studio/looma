import assert from "node:assert/strict";
import test from "node:test";

import { packagePublicationState, scopeAuthorization } from "./registry-preflight-policy.mjs";

test("accepts the matching user scope owner", () => {
  assert.deepEqual(
    scopeAuthorization({ username: "threadlabs", scopeName: "threadlabs" }),
    { kind: "user-scope", role: "owner" }
  );
});

test("accepts an npm organization owner", () => {
  assert.deepEqual(
    scopeAuthorization({
      username: "release-owner",
      scopeName: "threadlabs",
      membership: { "release-owner": "owner" }
    }),
    { kind: "organization", role: "owner" }
  );
});

for (const role of ["developer", "member"]) {
  test(`rejects an npm organization ${role}`, () => {
    assert.throws(
      () => scopeAuthorization({
        username: "release-user",
        scopeName: "threadlabs",
        membership: { "release-user": role }
      }),
      new RegExp(`must be an owner of @threadlabs; reported role is ${role}`)
    );
  });
}

test("rejects membership without a reported role", () => {
  assert.throws(
    () => scopeAuthorization({ username: "release-user", scopeName: "threadlabs", membership: {} }),
    /has no reported role in @threadlabs/
  );
});

test("marks an unused package name as available", () => {
  assert.deepEqual(
    packagePublicationState({
      name: "@threadlabs/looma-tokens",
      version: "0.1.0",
      packageExists: false,
      approvedIntegrity: "sha512-approved",
      registryIntegrity: null
    }),
    { name: "@threadlabs/looma-tokens", version: "0.1.0", state: "available" }
  );
});

test("allows resume when an existing release has the approved bytes", () => {
  assert.deepEqual(
    packagePublicationState({
      name: "@threadlabs/looma-tokens",
      version: "0.1.0",
      packageExists: true,
      approvedIntegrity: "sha512-approved",
      registryIntegrity: "sha512-approved"
    }),
    {
      name: "@threadlabs/looma-tokens",
      version: "0.1.0",
      state: "already-published",
      integrity: "sha512-approved"
    }
  );
});

test("rejects an occupied package without the release version", () => {
  assert.throws(
    () => packagePublicationState({
      name: "@threadlabs/looma-tokens",
      version: "0.1.0",
      packageExists: true,
      approvedIntegrity: "sha512-approved",
      registryIntegrity: null
    }),
    /already exists but 0\.1\.0 is not published/
  );
});

test("rejects an existing release with different bytes", () => {
  assert.throws(
    () => packagePublicationState({
      name: "@threadlabs/looma-tokens",
      version: "0.1.0",
      packageExists: true,
      approvedIntegrity: "sha512-approved",
      registryIntegrity: "sha512-other"
    }),
    /exists with bytes that differ from the approved tarball/
  );
});
