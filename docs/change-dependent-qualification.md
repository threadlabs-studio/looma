# Change-dependent qualification

Routine fixes target five minutes of CI elapsed time. Automatic qualification runs
in parallel and has a ten-minute execution ceiling; release preparation,
publication, and tagging have another five minutes. The longest configured path
from checks through publication is fifteen minutes. Queue delays, runner provisioning,
workflow handoff delays, and protected-environment approvals are outside these
execution limits. Hosted timing must be confirmed after rollout.

## Automatic checks

| Check | Work | Job timeout |
| --- | --- | --- |
| `quality` | Selected tooling tests, package build and affected unit/SSR tests | 9 minutes |
| `browser` | Affected Looma regressions in Chromium, including HTML and Vue | 9 minutes |
| `release-package` | Package-only build, tarball integrity, packed consumer matrix | 4 minutes |
| `docs-parity` | Docs build, test typecheck and route/example coverage when docs inputs change | 9 minutes |
| `verify` | Require successful quality, browser and package checks | 1 minute after CI jobs |

The first four jobs run independently. `quality`, `release-package`, `verify`, and
`docs-parity` retain their branch-protection check names. A stage with no affected
inputs reports its selection and succeeds without installing dependencies.
The package build checks source types and generated Vue declarations; repeating
lint/typecheck adds no proof. Style-source restrictions remain enforced by that build.
Formatting, comment documentation checks, Storybook builds, documentation browser
parity, full screenshot/axe sweeps, Firefox and WebKit are outside automatic release
qualification. Package packing builds only the published package.

Release preparation and publication each have two-minute timeouts; recording the
tag has one minute. Docs deployment runs beside publication with a five-minute
timeout. Trusted publishing, exact release-byte identity, packed consumers, public
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
and WebKit, followed by canonical visual comparisons. It has no push, PR or schedule
trigger and does not block routine publication.

Local commands remain available:

```sh
pnpm --filter @threadlabs/looma build
pnpm --filter @threadlabs/looma test:browser
pnpm --filter @threadlabs/looma-docs test:parity
pnpm --filter @threadlabs/looma-docs test:visual
```

Use one local browser worker. Inspect the automatic selection with
`LOOMA_CI_BASE=<base-revision> node tools/scripts/ci-qualification.mjs plan`.
