---
title: Allow new versions of an owner-controlled npm package through release preflight
date: 2026-09-02
category: build-errors
module: release-tooling
problem_type: build_error
component: development_workflow
symptoms:
  - "Candidate publication stopped with @threadlabs/looma already exists but 0.1.1 is not published."
  - "The release workflow failed before reaching either the npm credential or publish step."
root_cause: logic_error
resolution_type: code_fix
severity: high
related_components:
  - tooling
  - authentication
tags:
  - npm-publish
  - registry-preflight
  - release-workflow
  - immutable-artifacts
  - scope-ownership
---

# Allow new versions of an owner-controlled npm package through release preflight

## Problem

The npm Candidate workflow treated an existing package with an unpublished target version as a name-ownership conflict. That is valid only for a first-ever package publication; it blocks every normal follow-up version after `@threadlabs/looma@0.1.0` exists.

## Symptoms

- Registry preflight reported `@threadlabs/looma already exists but 0.1.1 is not published`.
- The failure occurred before `publish-release.mjs` ran, so changing npm authentication could not resolve it.

## What Didn't Work

- Replacing the publishing token did not address this failure because registry preflight uses a separate read-only credential and exits before publication.
- Treating any occupied package name as unsafe ignored the preceding proof that the authenticated npm identity owns the `@threadlabs` scope.

## Solution

Model package existence and version existence as separate states in `tools/scripts/registry-preflight-policy.mjs`:

```js
if (!packageExists) {
  return { name, version, state: "available" };
}
if (!registryIntegrity) {
  return { name, version, state: "version-available" };
}
```

The release remains fail-closed when the target version already exists with different bytes. When it exists with the approved integrity, the workflow reports `already-published` so an interrupted release can resume safely.

The regression test in `tools/scripts/registry-preflight-policy.test.mjs` covers all four meaningful registry states: unused package name, available new version, exactly published version, and published version with mismatched bytes.

## Why This Works

`registry-preflight.mjs` proves that the npm identity is the owner of the package scope before it evaluates package publication state. Once ownership is established, an existing package with an absent target version is the expected input for a normal new release, not evidence of namespace capture.

## Prevention

- Keep scope authorization, package-name availability, and target-version immutability as distinct release-policy decisions.
- Test the second-release path explicitly; first-publication-only tests cannot prove that subsequent versions are publishable.
- Diagnose workflow failures by the last executed step before rotating credentials.

## Related Issues

- [Treat an npm namespace change as an artifact-graph identity migration](../architecture-patterns/npm-namespace-is-artifact-graph-identity.md)
