# Release 1 Checklist

This is the go/no-go ledger for Looma Candidate `0.1.0`. A checked source or build
item is evidence, not permission to publish. Registry mutation requires all owner,
security, artifact, consumer, documentation, and rollback gates.

## Registry And Ownership Preflight

- [x] Canonical source repository identified as `threadlabs-studio/looma` on GitHub.
- [x] Unauthenticated public lookup returns no existing package for the five planned names.
- [ ] An authenticated npm owner confirms control of the `@looma` scope.
- [ ] The release identity can publish all five exact package names.
- [ ] The owner approves `@looma` as the permanent public namespace.
- [ ] npm account 2FA and the first-publication bootstrap method are approved.
- [ ] The bootstrap credential is short-lived, publish-only, environment-protected,
  absent from forks/PRs/logs, and scheduled for immediate revocation.

Current blocker: this host is not authenticated to npm (`npm whoami` returns an
authorization error), so package-name absence does not prove scope ownership.

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
`82902f2a9201814e0bd753dbaf4eb75ba645977b` produced an eligible five-package
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
U4 tree to pass the Node 20 CI job. The job installs Chromium, checks generated
output immutability, rejects skipped required suites, and runs core, editor, and
Vue browser qualification. The exact Stencil CJS filename diagnostic is the sole
allowlisted build warning; any additional Stencil warning fails the build.

The eligible `release:verify-knit` gate publishes the five checksummed local
artifacts to a disposable loopback registry with no `@looma` public fallback,
then installs them into a detached clean Knit checkout with a fresh pnpm store.
Canonical Knit commit `61af185b6fbaa435c2b1d572dcfc78759b7aed0c`
passes the production build, typecheck, SSR rendering for all eight consumed
Looma surfaces, and all 85 signup-critical tests, but its full unit gate fails in
four component-render tests. A temporary Git snapshot containing the five
existing owner edits (tree `66492332afa5712b95be512aa483665c8bbcb1c8`)
passes the same complete artifact gate, including all 238 unit tests. The
temporary worktree was removed and the owner files were not staged or changed.
The gate above remains unchecked until those edits are committed on Knit and the
eligible command passes from that canonical commit. Evidence is written under
the ignored `.release/evidence/` directory.

## Documentation Gates

- [x] Getting Started begins with the supported registry install path, required
  styles/entry imports, a Vue example, and the pre-publication warning.
- [x] Public docs and package READMEs distinguish the five Candidate packages
  from deferred React/Svelte previews and expose accepted editor limitations.
- [x] Package README links are absolute and identify the canonical repository,
  issue tracker, documentation, and Candidate support status.
- [x] Getting Started, Release 1 support, and ContextMenu pass Chromium axe and
  320-CSS-pixel reflow checks; install-path navigation is covered in the same suite.
- [x] A manual, protected `docs-preview` Pages workflow builds a no-index Candidate
  preview with every third-party action pinned to a full SHA.
- [x] The owner-approved MIT license exists and every package README links to it.
- [ ] The protected no-index preview has been deployed and reviewed at the
  recorded workflow URL.

The preview configuration targets `https://threadlabs-studio.github.io/looma/`.
That address is not claimed as reachable evidence until the manual workflow runs;
production indexing and any canonical-domain cutover belong to U7.

## Publication Controls

Candidate publication and `latest` promotion are two separate manual workflow
dispatches. The Candidate dispatch may set only `publish_candidate`; record its
successful workflow run ID after the immutable artifact set, registry evidence,
and public-consumer evidence upload. The later promotion dispatch sets only
`promote_latest` and supplies that prior run ID, the SHA-256 and HTTPS location
of the public-registry Knit evidence, the SHA-256 and HTTPS location of the
hosted-docs evidence (both without embedded credentials), and the separately
verified HTTPS production docs URL. The workflow downloads the exact Candidate
run artifacts, and the promotion ledger records the canonical Actions run URL
and all supplied evidence hashes and locations before the first `latest`
mutation.

- [x] The release workflow is manual, main-only, serialized, environment-gated,
  and declares minimal per-job permissions.
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

## Current npm Platform Requirements

For the protected workflow, verify the current npm requirements immediately before
publication. The present design assumes a GitHub-hosted runner, exact repository
and workflow binding, `id-token: write` plus `contents: read`, npm CLI 11.5.1 or
newer, Node 22.14 or newer for trusted publishing, and matching public repository
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
