---
title: Verify npm dist-tag mutations through the dynamic dist-tag endpoint
date: 2026-09-02
category: build-errors
module: release-tooling
problem_type: build_error
component: development_workflow
symptoms:
  - "npm accepted a latest-tag promotion, but immediate post-write verification still observed the previous tag."
  - "The compensating rollback was also reported as unverified even though npm accepted it and the registry later showed the restored tag."
root_cause: wrong_api
resolution_type: code_fix
severity: high
related_components:
  - tooling
  - npm-registry
tags:
  - npm
  - dist-tags
  - registry-cache
  - release-promotion
  - rollback
  - verification
---

# Verify npm dist-tag mutations through the dynamic dist-tag endpoint

## Problem

The release promoter changed `latest` with `npm dist-tag add`, then verified the
result by fetching npm's full package document. npm accepted the write, but the
package document still returned the previous tag during the short verification
window. The promoter treated that stale read as a failed mutation and began a
rollback. The same stale-read behavior then made the successful rollback appear
unverified.

## Symptoms

- The promotion ledger recorded the `latest` operation as applied.
- The full package endpoint returned a Cloudflare cache hit with
  `cache-control: public, max-age=300`.
- npm's dedicated `/-/package/<encoded-name>/dist-tags` endpoint returned
  `cf-cache-status: DYNAMIC`.
- After propagation settled, the registry showed the original `latest` tag,
  confirming that both write commands had been accepted in sequence.

## What Didn't Work

Adding `cache: no-store` and `cache-control: no-cache` to the full-package fetch
did not bypass the registry CDN's public five-minute cache. Increasing the
six-second polling window would reduce the failure rate, but it would still
verify a mutable pointer through the wrong observation path and make every
promotion unnecessarily slow.

## Solution

Continue reading immutable package metadata, integrity, and provenance from the
full package document, but read mutable dist-tags from npm's dedicated dist-tag
endpoint. Merge the dynamic tag result into the registry-package model used by
Candidate verification, promotion verification, and rollback verification.

The regression test deliberately supplies a stale `latest` value in the full
package document and the current value in the dist-tag response. It asserts
that verification uses the current dist-tag value and requests both canonical
endpoints.

## Why This Works

Package versions and their tarball metadata are immutable after publication, so
a cached package document is appropriate for integrity and provenance checks.
Dist-tags are mutable pointers and must be observed through a read path whose
cache behavior matches that mutability. Separating those reads prevents a
successful write from being mistaken for failure and avoids unnecessary,
potentially confusing compensating writes.

## Prevention

- Do not verify a mutable registry pointer through an endpoint explicitly
  cacheable for several minutes.
- Test post-mutation verification with conflicting stale and current fixtures.
- Keep rollback evidence durable, but distinguish a rejected write from an
  observation-path failure.
- Inspect response cache headers whenever a registry write succeeds while an
  immediate read appears unchanged.

## Related Issues

- [Failed promotion run with durable rollback evidence](https://github.com/threadlabs-studio/looma/actions/runs/33698892684)
- [Bind release promotion to immutable Candidate source instead of moving main](../architecture-patterns/release-promotion-survives-moving-main.md)
