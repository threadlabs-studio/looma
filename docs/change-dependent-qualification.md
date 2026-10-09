# Change-dependent qualification

CI qualifies changed package behavior and documentation against successful GitHub
provider proof. Unchanged stages reuse verified inputs, including after a test-only
revision or a merge into `main`. The `quality`, `release-package`, `verify`, and
`docs-parity` checks remain present on every revision.

## Selection

`tools/scripts/ci-selection.mjs` follows relative JavaScript/TypeScript imports,
HTML controller references, component definitions, and documentation imports.
Runtime consumers receive package tests. Example compositions receive their
documentation pages without treating an example as a dependency of the primitive.
Documentation routes come from the coverage inventory or authored slug.

Named cases in shared test files use the complete suite and case name. Changed
assertions select their case; changes to a shared helper select its enclosing
suite. A file's imports or setup own its complete test file. Parameterized names
retain their runtime instances. Browser runs use one worker.

Compiler/build, dependency, token/theme, and genuinely global shared inputs select
their complete dependent surface. Unknown executable inputs or unmapped discovery
stop qualification. Missing proof does not launch an automatic full sweep.

## Proof ownership

The four input fingerprints belong to package quality, packed package-consumer
verification, documentation behavior, and documentation visuals. Package test
edits do not invalidate package-consumer or documentation inputs. Behavior-only
documentation test edits do not invalidate visual proof.

A receipt binds the repository, provider run and attempt, immutable execution
head, actual tested checkout, stage inputs, and qualifier/workflow bytes. A PR's
tested merge must retain its execution head and main ancestry; GitHub's current
PR association is not an immutable checkout identity and may disappear after
merge. Native proof also binds Node, pnpm, and the hosted image version. Visual
proof binds the canonical browser container digest.

Qualification can bootstrap from the two approved historical full-workflow
digests. Each required job and execution step must have passed, and checkout logs
must identify the tested commit. Subsequent receipts use attempt-specific GitHub
artifacts. Empty, skipped, failed, mismatched, expired, or foreign proof is rejected.

## Runner-minute admission

Both planners evaluate the combined CI and documentation selection before starting
checks. The 15-minute estimate includes setup and proof across all six jobs,
dependency installation, builds, package consumers, and selected test cases. An
oversized or unknown selection stops and prints its estimate. Estimates are
conservative admission weights, not measured timing guarantees. A genuinely global
selection needs a separately authorized qualification decision; this workflow does
not dispatch one automatically.

Documentation builds once and serves that output to both selected stages. The
runner checks browser discovery against the completed JSON report, and checks
Vitest reports for every selected case before emitting proof.

Read-only provider inspection is available with `node
tools/scripts/ci-qualification.mjs inspect ci <run-id>` or `inspect docs <run-id>`.
Supply `GITHUB_REPOSITORY`, a read-only `GITHUB_TOKEN`, and, for native proof, the
intended `ImageOS` and `ImageVersion`. Inspection neither executes tests nor
dispatches Actions. Native image changes, expired anchors, or changed qualification
contracts can require fresh provider proof; they never silently reuse stale proof.
