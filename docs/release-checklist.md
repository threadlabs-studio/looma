# Release 1 Checklist

This is the go/no-go ledger for Looma Candidate `0.1.0`. A checked source or build
item is evidence, not permission to publish. Registry mutation requires all owner,
security, artifact, consumer, documentation, and rollback gates.

## Registry And Ownership Preflight

- [x] Canonical source repository identified as `threadlabs-studio/looma` on GitHub.
- [x] Unauthenticated public lookup returns no existing package for the five planned names.
- [x] An authenticated npm owner confirms control of the `@threadlabs` scope.
- [ ] The release identity can publish all five exact package names.
- [x] The owner approves `@threadlabs/looma-*` as the permanent public namespace.
- [ ] npm account 2FA and the first-publication bootstrap method are approved.
- [ ] The bootstrap credential is short-lived, publish-only, environment-protected,
  absent from forks/PRs/logs, and scheduled for immediate revocation.

Namespace ownership is resolved: this host is authenticated as `matthew-dean`,
an owner of the `@threadlabs` organization, and the dedicated migration is owner
approved. Publication remains gated on the protected release identity proving it
can publish all five exact names and satisfying the bootstrap credential controls.

## Contract And Package Gates

- [x] Public R1 package set and deferred workspaces are classified.
- [x] DOM, SSR/no-JS, and module-format promises match current source/build output.
- [x] Layout's formerly false CommonJS export now points to a real CJS build required by the docs server bundle.
- [x] Source-derived classification enforces generated API, docs, navigation,
  supported Vue map/export, and required contract README coverage for all 38 published tags.
- [x] All five manifests use synchronized `0.1.0`, public access, complete metadata,
  correct peer/internal ranges, and exact export maps.
- [x] Every packed artifact contains runtime output, types, styles, README, and license,
  and excludes tests, local config, secrets, and source-only material.
- [x] Package DAG and dependency-first publish order are derived from the packed manifests.
- [x] Local inspection packs the five exact `0.1.0` artifacts, rewrites internal
  workspace ranges to exact `0.1.0`, rejects empty/forbidden/missing files, and
  records SHA-256, byte size, source commit, and toolchain.

Current artifact evidence: `release:verify` under Node 20 at Looma commit
`6bf39cd809c69e6f2f1fa1f37b7e48391a794829` produced an eligible five-package
manifest and checksummed tarballs. The run used explicitly labeled rehearsal
approver identities, so it proves the source and package mechanics but does not
replace the accountable owners required in the protected publication run.

## Verification Gates

- [ ] Declared Node/pnpm runtime passes clean build, lint, typecheck, and tests.
- [ ] Docs generation is deterministic and leaves a clean tree.
- [x] Unit, accessibility, adapter-render, SSR-import, and required Chromium browser gates pass locally without required skips.
- [x] A clean external fixture installs only approved tarballs and consumes every public entry/style.
- [ ] Knit installs only the approved tarballs and passes build plus release-critical browser/component gates.
- [x] E-TBL-003 is explicitly accepted as a Candidate visual limitation with
  browser accessibility/keyboard evidence and Tiptap data-integrity proof.

The remaining declared-runtime and clean-generation checks require the committed
release tree to pass the Node 20 CI job. Record the exact successful `ci.yml`
push run ID for `main`; its `head_sha` must equal the release workflow commit.
The job installs Chromium, checks generated
output immutability, rejects skipped required suites, and runs core, editor, and
Vue browser qualification. The exact Stencil CJS filename diagnostic is the sole
allowlisted build warning; any additional Stencil warning fails the build.

The eligible `release:verify-knit` gate publishes the five checksummed local
artifacts to a disposable loopback registry with no `@threadlabs/looma-*` public fallback,
then installs them into a detached clean Knit checkout with a fresh pnpm store.
Canonical Knit commit `3d2cfbb092a83ba0a053178f88a84baf33d548e9`
passes the production build, typecheck, SSR rendering for all eight consumed
Looma surfaces, and all 89 signup-critical tests, but its full unit gate fails in
four component-render tests. A temporary Git snapshot containing the five
existing owner edits (commit `652fb42fdddb045ab8490c0afab5dc16120a3bc8`)
passes the same complete artifact gate, including all 266 unit tests. The
temporary worktree was removed and the owner files were not staged or changed.
The gate above remains unchecked until those edits are committed on Knit and the
eligible command passes from that canonical commit. Evidence is written under
the ignored `.release/evidence/` directory.

## Documentation Gates

- [x] Getting Started begins with the supported registry install path, required
  styles/entry imports, a Vue example, and a time-stable Candidate availability guard.
- [x] Public docs and package READMEs distinguish the five Candidate packages
  from deferred React/Svelte previews and expose accepted editor limitations.
- [x] Package README links are absolute and identify the canonical repository,
  issue tracker, documentation, and Candidate support status.
- [x] Getting Started, Release 1 support, and ContextMenu pass Chromium axe and
  320-CSS-pixel reflow checks; install-path navigation is covered in the same suite.
- [x] A manual, protected `docs-preview` Pages workflow builds a no-index Candidate
  preview with every third-party action pinned to a full SHA.
- [x] A separate protected `docs-production` workflow downloads the exact prior
  Candidate artifacts, checks manifest/registry evidence against that source commit,
  builds indexable docs, verifies hosted routes, and uploads hashed JSON evidence.
- [x] The owner-approved MIT license exists and every package README links to it.
- [ ] The protected no-index preview has been deployed and reviewed at the
  recorded workflow URL.
- [ ] Production Candidate docs have been deployed and their hosted-docs evidence
  artifact URL and SHA-256 have been recorded for the promotion dispatch.

The preview configuration targets `https://threadlabs-studio.github.io/looma/`.
That address is not claimed as reachable evidence until the manual workflow runs;
production indexing and any canonical-domain cutover belong to U7.

## Publication Controls

Candidate publication and `latest` promotion are two separate manual workflow
dispatches. The Candidate dispatch sets `publish_candidate` and supplies
`ci_workflow_run_id` for the successful `ci.yml` push on `main` whose `head_sha`
is the exact release commit. Preparation-only and promotion-only dispatches may
leave that input empty. Record the successful Candidate workflow run ID after
the immutable artifact set, registry evidence, and public-consumer evidence
upload. The later promotion dispatch sets only `promote_latest` and supplies
that prior Candidate run ID, the SHA-256 and HTTPS location of the public-registry
Knit evidence, the SHA-256 and HTTPS location of the hosted-docs evidence (both
without embedded credentials), and the separately verified HTTPS production
docs URL. The workflow downloads the exact Candidate run artifacts, and the
promotion ledger records the canonical Actions run URL and all supplied evidence
hashes and locations before the first `latest` mutation.

- [x] The release workflow is manual, main-only, serialized, environment-gated,
  and declares minimal per-job permissions.
- [ ] The Candidate dispatch records the exact successful `ci.yml` push run ID
  for `main`, and that run's `head_sha` equals the release workflow commit.
- [x] Third-party actions are pinned to full commit SHAs and checkout credentials are not persisted.
- [x] The generated manifest captures approved tarballs, their sorted file
  inventories and SHA-256 hashes, source commit, toolchain, dependency-first
  package order, and planned tags.
- [x] Authenticated registry preflight requires a scope owner and resumes a
  partial Candidate publication only when existing package bytes match the
  approved tarballs exactly.
- [x] Candidate verification fails on public-access, integrity, license,
  repository, homepage, exact internal-dependency, dist-tag, or provenance drift.
- [x] Latest promotion snapshots every prior tag, runs in dependency order, and
  restores every changed tag if a command or post-promotion verification fails.
- [x] Before the first `latest` mutation, promotion durably writes the approved
  artifact graph, accountable approvals, exact prior tags, and planned operations;
  every mutation, verification, and rollback checkpoint updates that evidence,
  and the workflow uploads it even when promotion fails.
- [ ] The protected-run manifest also records evidence locations and accountable
  npm, documentation, and Knit approval owners.
- [ ] The repository owner configures the protected `npm-release` environment,
  required approvers, and first-publication credential or trusted publisher.
- [ ] Initial publication uses the non-default `candidate` dist-tag.
- [ ] Registry integrity matches the approved tarballs before any tag promotion.
- [ ] A fresh-store, credential-free public consumer installs the exact manifest
  versions from npm, passes typecheck and SSR/import proof, and records its lockfile
  after Candidate verification and again immediately before `latest` promotion.
- [ ] Knit installs the public registry versions and repeats its release-critical
  build, SSR, and signup-flow gates; local-registry proof does not satisfy this gate.
- [ ] Trusted publishing is configured for each package after bootstrap and bootstrap reuse fails after revocation.
- [ ] Public install docs and hosted component docs resolve and match the released contract.
- [ ] Owner approves promotion of the same immutable versions from `candidate` to `latest`.

## Immutable Release Record Gates

The release record job runs only after the promotion job succeeds. It downloads
the exact Candidate manifest from the recorded Candidate workflow run and the
promotion ledger from the same promotion workflow run, then validates both
before any tag or GitHub Release mutation. A retry may resume only when an
existing lightweight tag points to the manifest source commit and existing
release metadata or attachments match the approved record exactly.

- [ ] The promotion ledger reports `succeeded` / `registry-verified` for the
  exact five-package manifest and proves both `candidate` and `latest` at `0.1.0`.
- [ ] The ledger binds the public Knit evidence SHA-256 and URL, hosted-docs
  evidence SHA-256 and URL, production docs URL, and canonical Candidate run URL.
- [ ] Lightweight tag `v0.1.0` is absent or points directly to the exact manifest
  source commit; an annotated or mismatched tag is a hard stop.
- [ ] GitHub Release `Looma v0.1.0 Candidate` uses the matching tag and the
  `CHANGELOG.md` Candidate notes without replacing a mismatched existing record.
- [ ] The exact `release-manifest.json` and `registry-promotion.json` bytes are
  attached; retries skip matching assets and reject mismatched same-name assets.
- [ ] The workflow summary records the canonical GitHub Release URL.

These gates describe required remote evidence; none is complete until the
protected promotion and release-record jobs have run successfully.

## Current npm Platform Requirements

For the protected workflow, verify the current npm requirements immediately before
publication. The present design assumes a GitHub-hosted runner, exact repository
and workflow binding, `id-token: write` plus `contents: read`, npm CLI 11.5.1,
exact Node 20.19.6 for pack/publish/promotion jobs, and matching public repository
metadata for automatic provenance. Configure each trusted publisher with
`release.yml`, the `npm-release` environment, and the `npm publish` allowed action.
Scoped public packages require public access. npm commands other than publish
require traditional authentication, so `latest` promotion uses the protected,
short-expiry bootstrap credential before it is revoked; OIDC cannot authorize
`npm dist-tag` commands.

Authoritative references:

- [Creating and publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
- [Trusted publishers](https://docs.npmjs.com/trusted-publishers/)
- [Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements/)
- [Requiring two-factor authentication](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/)
- [Staged publishing](https://docs.npmjs.com/staged-publishing/)
