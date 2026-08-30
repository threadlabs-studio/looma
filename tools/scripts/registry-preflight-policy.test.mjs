import assert from "node:assert/strict";
import test from "node:test";

import { scopeAuthorization } from "./registry-preflight-policy.mjs";

test("accepts the matching user scope owner", () => {
  assert.deepEqual(
    scopeAuthorization({ username: "looma", scopeName: "looma" }),
    { kind: "user-scope", role: "owner" }
  );
});

test("accepts an npm organization owner", () => {
  assert.deepEqual(
    scopeAuthorization({
      username: "release-owner",
      scopeName: "looma",
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
        scopeName: "looma",
        membership: { "release-user": role }
      }),
      new RegExp(`must be an owner of @looma; reported role is ${role}`)
    );
  });
}

test("rejects membership without a reported role", () => {
  assert.throws(
    () => scopeAuthorization({ username: "release-user", scopeName: "looma", membership: {} }),
    /has no reported role in @looma/
  );
});
