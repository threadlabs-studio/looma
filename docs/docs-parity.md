# Documentation parity checks

The documentation baseline is the site built from main at `23c21932`, with the
Docusaurus iterable-spread correction in `apps/docs/babel.config.js` and the
catalog/editor MDX paragraph correction and shared Vue highlighting registration.
Nested paragraphs and server/browser Prism grammar differences previously
caused React hydration recovery. The open mobile navbar also removes its backdrop
filter so the fixed drawer fills the viewport instead of the navbar, and uses an
opaque theme background to keep underlying page text out of the open menu. The iterable correction
preserves Sets used by component controllers; a grouped disclosure
previously threw a browser error in the production docs build.
The Radio controller also leaves initial and reset selection to its owning
Radio Group, preventing a child's authored `checked` from winning a controller
startup race. HTML and Vue consumer tests reproduce the conflict; documentation
assertions check the disabled group's declared selection.
Group controllers coordinate the reactive checked binding through native input
references, so either controller startup order preserves native selection and
reset defaults. Ordinary ARIA fieldsets retain independently authored radios;
the coordination does not depend on compiler or adapter markers.

`apps/docs/tests/coverage.json` inventories the 84 built documentation routes and
258 authored scenarios. The inventory check compares built router metadata
and source example metadata with this reviewed file. It also checks the complete
built router against the docs metadata, so a custom page cannot bypass coverage.
The generated not-found fallback has no authored route metadata. Adding, removing, or
renaming a route or example requires an explicit inventory update. A normal
browser run checks the inventory after building; it never updates it.

## Coverage

| Surface | Assertions | Visual reference |
| --- | --- | --- |
| Every documentation route | Heading, internal routes and local heading links, page errors, same-origin asset failures | Full page at 1280×900 and 375×812, light and dark |
| Every authored example | Title, live stage, nonempty code, HTML Next/Vue lens, Examples/API navigation | Included in each full-page baseline, plus API and Vue views for every component page |
| Shared shell | Sidebar categories, mobile navigation, heading deep links, reload and history, theme/framework persistence | Shell on every route; open mobile navigation |
| Code controls | Copy requests the displayed snippet, mobile wrapping preserves it, existing overflow and authored-code assertions | Code panes in each example and Vue view |
| Catalog | Existing count/category/query assertions, keyboard search, empty results | Complete catalog, filtered results, empty state |
| Native fields and selection | Keyboard checkbox/switch, radio exclusivity, required validation, text/textarea editing, native select, editable commit/cancel, listbox and combobox selection | Authored disabled/invalid/readonly states; changed field and selection states |
| Overlays and navigation components | Context menu, checkable menu, dialog close/focus, popover, toggletip dismissal, toast commands, docked/mobile sidebar, disclosure groups, tabs and tree keyboard actions | Authored states and the resulting states in `interaction-cases.ts` |
| Editor guides | Existing toolbar placement, selection, mentions, HTML language menu, table capability and tree reorder assertions | Complete guide pages and authored editor-component examples |
| Accessibility and layout | Existing zero-violation/contrast/reflow/geometry assertions in all three browsers; reviewed axe finding sets for every route/viewport/theme in the visual suite | Finding snapshots retain existing debt instead of suppressing rules |

`page-parity.spec.ts` applies content/link assertions to every inventory entry,
and `visual.spec.ts` derives its route and image matrix from the same entries.
The 71 component-page entries also receive example-by-example checks and full
API/Vue views. `reader-journeys.spec.ts` covers the shared shell and code controls;
`interaction-cases.ts` names the additional component/state pairs used by
`component-interactions.spec.ts` and visual checks. `release-docs.spec.ts` and
`interactive-guides.spec.ts` retain the existing focused assertions, including
geometry, disabled controls, catalog categories, tree behavior, and editor tools.

The interaction cases are shared by behavior tests and screenshots. Static
layout/display examples need rendering and geometry checks; interactions are
asserted on the relevant controls and owning compound components. This inventory
is a migration coverage contract, not a claim that all possible application
compositions, inputs, or accessibility concerns are exhausted.

## Content boundaries at this revision

The package builds 73 components; the sidebar/catalog has 71 component pages.
`ui-icon` and `ui-floating-action-button` have no standalone docs route or authored
scenario directory. Icons appear in other covered demos. Standalone documentation
for these two primitives is an existing content gap.

Three `.snippet.html` files provide displayed source for existing button,
checkbox, and search-shell scenarios. Their code panes are captured along with
the live examples; they are not three additional rendered scenarios.

## Existing visual quirks

Some standalone editor mention/slash picker examples are open without an
application anchor and appear near the viewport corner rather than inside their
preview card. The catalog heading also wraps its last letter at 375px. References
retain those current layouts. Caret-anchored menus in the editor guide have
separate interaction/state coverage. Review intentional corrections through the
same targeted baseline update process. API tables can also wrap short type names
across lines, and API descriptions display embedded Markdown links as literal
text. Those are existing reference-rendering issues, retained in this baseline.

## Existing accessibility findings

The reviewed automated findings include color contrast in the token palette;
focusability of scrollable regions on the catalog, adapter parity, library audit,
editor, token, meter, scroll-area, and table pages; and landmark nesting or naming
in the catalog and sidebar, breadcrumb, nav-item, reel, and toast demos. Some
findings depend on viewport and theme. The 336 finding snapshots retain exact
rules and target selectors. This baseline protects against changes; it does not
certify these pages as free of accessibility defects.

## Run locally

Use Node 22.13 or 24 and pnpm through Corepack. Run browser commands sequentially,
with one worker; the package's ordinary test command also launches browsers.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @threadlabs/looma-docs typecheck:tests
corepack pnpm --filter @threadlabs/looma-docs test:parity:container
corepack pnpm --filter @threadlabs/looma-docs test:visual
```

For native browser runs, install the three engines with
`PLAYWRIGHT_SKIP_BROWSER_GC=1 corepack pnpm --filter @threadlabs/looma-docs exec playwright install chromium firefox webkit`
and run `test:parity` instead.

The existing `test:browser` command remains the Chromium compatibility check for
the main quality workflow. The new Documentation parity workflow runs all three
engines and the visual comparison, retaining separate behavior and visual HTML
reports, traces, and image differences on failure. The strict test typecheck
covers the new harness; the two older docs suites still have unchecked TypeScript
annotations and are exercised as browser tests.

The visual wrapper uses the digest-pinned Playwright 1.60.0 Linux ARM64 image, with
container-only dependency volumes. CI uses GitHub’s `ubuntu-24.04-arm` runner
([runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)). Tests replay the site's real Google Fonts
stylesheet and font binaries from `tests/fixtures/fonts`, with upstream sources
and OFL licenses. They wait for preview loading, scroll the lazy catalog into
view, and wait for controller imports, fonts/images, and native layout frames.
The native theme button must be enabled, Docusaurus's signal that its SSR tree
has completed hydration, including on static guides without live previews.
Captures move the pointer away from hover controls; full-page captures start at
the top without smooth scrolling. A native one-pixel scroll round trip lets
Docusaurus recalculate table-of-contents highlighting after lazy previews settle.
Visual assertions allow 15 seconds and visual cases 60 seconds for long pages;
the pixel comparison remains unchanged. Focus, open overlays, and selections remain
intact. Screenshots disable animations and hide the
caret without hiding content. Keep the Playwright version, image digest, font
fixtures, and baseline review together when changing the rendering environment.
Vue-code views reload the persisted lens before capture, matching the initial
HTML view's fresh paint. API/Examples transitions and lens persistence still
receive separate behavior assertions.

To review intentional changes, update only the affected cases:

```sh
corepack pnpm --filter @threadlabs/looma-docs test:visual --grep 'desktop-light.*components/ui-button:' --update-snapshots=all
```

Inspect the expected/actual/diff images and accessibility finding changes, then
run the same command without `--update-snapshots` and the complete comparison.
Ordinary runs disable snapshot creation, including missing references. Screenshots
use Playwright's default perceptual threshold (0.2) and allow zero changed pixels
above that threshold. The sole exception is `mobile-dark/components.png`: three
pixels on the search shortcut slash glyph vary across repeated Chromium captures,
so that image allows at most three changed pixels. No other image gets this
allowance. Force the targeted update above when even a subtler change
is intentional; inspect the result afterward. Never regenerate baselines as part
of an ordinary CI or migration build. New
routes and examples also require `docs:coverage:update` after a docs build.

## Exercise another build

`LOOMA_DOCS_TEST_URL` selects an already-running site, including its trailing
base-path slash, and disables the local build/server. The same route inventory,
reader actions, selectors, assertions, and expected images apply to that site.
For a container visual run, use an address reachable inside the container; the
wrapper forwards the URL when supplied. A migration must pass these checks
without routine baseline regeneration.

The migration gate is a green Documentation parity run on the baseline revision,
reviewed image/finding baselines, and a required `docs-parity` check in repository
branch protection. Adding the workflow file alone does not alter branch
protection. Keep generator migration blocked until that gate is established.
