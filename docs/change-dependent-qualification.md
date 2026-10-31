# Change-dependent qualification

Routine fixes target five minutes of CI elapsed time. Automatic qualification runs
in parallel and has a seven-minute execution ceiling; release preparation,
publication, and tagging have another nine minutes. The longest configured path
of runner work from checks through publication is sixteen minutes. Queue delays, runner
provisioning, workflow handoff delays, protected-environment approvals, and npm's
availability wait after the upload are outside these execution limits. Hosted timing
must be confirmed after rollout.

## Automatic checks

| Check | Work | Job timeout |
| --- | --- | --- |
| `quality` | Selected tooling tests, package build and affected unit/SSR tests | 6 minutes |
| `browser` | Affected Looma regressions in Chromium, including HTML and Vue | 6 minutes |
| `release-package` | Package-only build, tarball integrity, packed component and documentation consumer matrix | 6 minutes |
| `visual` | Affected base/candidate state-sheet captures in parallel, using the pinned rendering container | 6 minutes |
| `docs-parity` | Docs build, test typecheck and route/example coverage, then the Markupress site's build and its check that copied pages match, when docs inputs change | 10 minutes |
| `verify` | Require complete successful checks and attach the source-to-source visual diff report | 1 minute after CI jobs |

On the 0.37 integration, all 56 documentation browser checks and the site artifact upload finished before the former nine-minute limit, but dependency-cache cleanup exhausted it. Documentation parity now has ten minutes, retaining the same checks and remaining within its fifteen-minute policy ceiling.

The first four jobs run independently. `quality`, `release-package`, `verify`, and
`docs-parity` retain their branch-protection check names. A stage with no affected
inputs reports its selection and succeeds without installing dependencies.
The package build checks framework-neutral source types. The framework-consumer fixture checks generated Vue declarations and compiles Vue, React and Svelte through their Vite plugins; repeating the same source lint/typecheck adds no proof. Style-source restrictions remain enforced by that build.
Compact component state screenshots run automatically; they replace the redundant full-viewport Storywright gallery. Every published component has light/dark state coverage, and core controls also cover each starter theme. Formatting, comment documentation checks, exhaustive documentation page screenshot/axe sweeps, Firefox and WebKit remain outside automatic release qualification. Package packing builds only the published package.

Release preparation has six minutes of runner work for the complete packed
consumer matrix, publication has two minutes, and recording the tag has one minute.
The main-branch run measured quality at 2m31s, browser at 3m34s, visual at 4m07s
and package qualification at 4m42s; each CI job has six minutes. This allocation
keeps the configured checks-to-publication path within sixteen minutes. Between upload and the registry checks, publication waits for
npm to serve the version in its own step with a ten-minute timeout (measured maximum
311 seconds), so its job timeout is twelve minutes. If that wait times out, re-run the
publish job: it skips the upload because npm has the version, waits again, and the
tag is recorded after it succeeds. Documentation builds have five minutes, followed
by a separate two-minute Pages deployment job, alongside publication. In the first
0.34 deployment the build took 3m51s and Pages needed another 26s; combining setup,
build and publishing exhausted the former five-minute job as Pages finished. Separate
jobs keep build time from consuming the deployment allowance.

Documentation building, CI package-consumer checks and release preparation use the Ubuntu 24.04 ARM runner
already qualifying documentation parity. The 0.37 x64 package-consumer check repeatedly reached its six-minute
job limit during or just after the full documentation consumer flow; CI now uses the same runner as release
preparation. The complete matrix and six-minute limit remain in place. On the 0.35 source, the 483-route build
measured 3m56s there versus 4m26s on x64; the package build measured 15s versus 22s.
The x64 jobs finished their work just after the five-minute deadline, before
artifact upload. Documentation retains its five-minute limit. Release preparation
completed the full installed-consumer matrix at approximately 5m12s on both x64
and ARM, before its job was cancelled without uploading the artifact. It now has
six minutes, making the configured maximum path sixteen minutes. Publishing and
registry-consumer verification remain on x64. Trusted publishing,
exact release-byte identity, packed consumers, public
registry integrity/provenance and the public-registry consumer remain required.

## Selection and priority

`tools/scripts/ci-selection.mjs` follows relative JS/TS imports, HTML controller
references and composed components. A PR compares its tested merge to its merge
base; a main push compares to its `before` revision. Selection does not query past
Actions runs, download receipts or require an expiring successful baseline.

Named cases in shared suites use their complete suite and case name. Edited
assertions select their case; edited helpers select their enclosing suite. Imports
or file setup select the file. All suites importing Playwright count as browser
work, including `tree.test.ts` and `editor-table.test.ts`.

Browser priority is edited regressions, integration smoke checks, direct component
behavior, then composed consumers. Automatic browser work is capped at 80 estimated
instances; a parameterized case reserves three. Every deferred case is listed in
`.qualification/plan.json` and the job log. The cap bounds the scope, not a claim
that every test costs the same time; job timeouts enforce the execution ceiling.
Unit/SSR and selected tooling tests are retained independently of the browser cap.

Dependency, compiler, theme and automatic CI recipe changes run all unit/tooling tests and an explicit
integration smoke set: HTML registration, Vue rendering/model updates, modal
focus/events, keyboard search, mobile chip geometry and editor table operations.
Explicit component edits and changed browser regressions retain priority even
when a global input also changes. Unknown executable inputs fail with an owner
mapping error; there is no automatic full browser sweep.

## Ownership and extended verification

Looma owns its authored definitions, controllers, CSS, accessible interactions,
editor data operations and HTML/Vue integration. These need real-browser tests.
HTML Next owns generic lowering, binding, slot, event and converter conformance;
its [runtime and framework parity suites](https://github.com/nextwebwg/html-next/blob/main/.github/workflows/ci.yml)
are the platform's proof. Looma retains representative integration checks against
its pinned dependency instead of multiplying every example across three engines.

One engine is sufficient for routine qualification. Firefox/WebKit remain useful
for platform-specific CSS, focus, selection and editing changes; run them explicitly
when a change needs that evidence. The manual **Extended verification** workflow
runs the complete package suite and documentation behavior in Chromium, Firefox
and WebKit, the Markupress customizer with Safari touch input, the Markupress site's text and JavaScript-off checks against the Docusaurus
pages, and canonical visual comparisons. It has no push, PR or schedule
trigger and does not block routine publication.

Local commands remain available:

```sh
pnpm --filter @threadlabs/looma build
pnpm --filter @threadlabs/looma test:browser
pnpm --filter @threadlabs/looma-docs test:parity
pnpm --filter @threadlabs/looma-docs-next test:safari
pnpm --filter @threadlabs/looma-docs test:visual
```

Use one local browser worker. Inspect the automatic selection with
`LOOMA_CI_BASE=<base-revision> node tools/scripts/ci-qualification.mjs plan`.
