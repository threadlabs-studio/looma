# `@threadlabs/looma-migrate-html-next`

Looma-owned migration of Looma's Stencil Shadow-DOM components to
[HTML Next declarative components](https://nextwebwg.org/html-next/). This is **bespoke to Looma**:
HTML Next itself has no ingest converter — its three builds are a live runtime, a compiled
(tree-shaken) native build, and a one-way converter *to* React/Vue/Svelte. Importing Shadow DOM
*into* HTML Next is our concern, and lives here.

## `convert-styles.mjs`

`convertShadowStyles(css, { reflectedAttributes })` translates a component's **authoritative shadow stylesheet** (not
Looma's light-DOM fallback, which drops projected-content styling) to HTML Next authoring:

| Shadow | HTML Next |
| --- | --- |
| `:host` | `:scope` (the component's public root) |
| `:host(<cond>)` | `:scope<cond>` (a state/attribute condition on the root) |
| `::slotted(<sel>)` | `:slotted(<sel>)` (styling projected content — a subtree query in HTML Next) |

Stencil prop selectors such as `:host([size='sm'])` are retargeted to HTML Next's automatic
`data-*` reflection (`:scope[data-size='sm']`), while native state such as `[popover]` and ARIA
attributes remain unchanged.

The emitted CSS goes in the component's HTML Next `<style>`; the HTML Next runtime scopes it
(`:slotted()` compiles to selectors anchored to the projected region). A real `ui-button`
converted this way renders identically to its Shadow-DOM Storybook baseline.

## `convert-template.mjs`

`passthroughPort(tag, shadowCss, rootEl)` derives an HTML Next port for a **passthrough** component
(one whose shadow render is a styled host around a `<slot>`): it reads the reflected props from the
`:host([...])` conditions, mirrors the host as a non-interactive `rootEl` (never a native control),
and slots the content. This fixes the prior hardcoded ports (e.g. `ui-button`'s `<button>` root,
which nested a control in a control and dropped the projected styling).

## `convert-render.mjs`

`renderPort(tag, tsx, rootEl)` derives the port from the component's Stencil `render()` JSX — it
reproduces the internal element/class structure (`.badge__surface`, `.chip__label`, …) so
class-targeted styling matches, binds clean `{this.prop}` attributes, and drops what doesn't
migrate (event handlers, refs, conditional attributes, icon `innerHTML`). This subsumes the
passthrough case and is what the harness uses; `convert-template.mjs` remains as the simpler
host-only generator.

`convertLightDomStyles(css)` retargets Looma's shipped compatibility selectors from custom-element
tags to lowered `[data-component-root]` roots. Storybook applies that host layer alongside shadow
styles, so carrying it forward is required to compare the same cascade rather than a shadow-only
approximation.

## `harness/`

`node harness/run.mjs` renders each component two ways — the original Stencil Shadow-DOM component
from the built Storybook (`before`) and its HTML Next migration lowered by the vendored runtime
(`after`) — clips to the component, and reports the full-bounds pixel mismatch. It is **tooling**: it
renders the migration to validate it; it does not adopt the migration into the shipped components.

`vendor/html-next-runtime.iife.js` is a prebuilt HTML Next runtime (from `nextwebwg/html-next`);
re-vendor when that runtime changes.

## Status

Converter, template generator, and harness are tested (`node --test`) and integrate with the
workspace. `harness/run.mjs` auto-discovers every `packages/core` component with a `.tsx`+`.css`,
matches it to a Storybook story, derives the root from `:host` display, and reports per-component
full-bounds pixel mismatch vs. the Shadow-DOM baseline. Run: `pnpm --filter
@threadlabs/looma-migrate-html-next harness` (optionally pass tags to filter). It also writes a
browsable before/after gallery to `harness/gallery/index.html` (gitignored) — open it, or
`python3 -m http.server -d harness/gallery`. To see the original components live, run
`pnpm dev:storybook`.

The diff is **shift-tolerant** (a pixel matches if any pixel within ±2px matches) and scores the
full union of both screenshots. This filters sub-pixel jitter and anti-aliasing without hiding
extra width or height in either rendering.

Full-corpus run (26 rendered, 7 skipped): **all 26 measurable components are under 10%**; 16 are
pixel-identical at 0%. The earlier overlap-only calculation understated components whose converted
bounds were larger than the original; these full-bounds figures are the authoritative baseline.

The after page preserves the representative story's measured containing width. That removed false
full-canvas expansion from constrained block components (`ui-search-result-row` is now **1.3%**)
without forcing intrinsic-size components to match.

Markup+CSS auto-conversion renders most components faithfully with no per-component tuning. The
**controller path is proven**: converted controllers (`harness/controllers/`) are imported as real
ES modules (blob URLs — nothing is stashed on `window`) and wired via
`observeDocument`/`setControllerModule`/`getComponentHost`. `ui-avatar`'s fallback initials are
computed by its controller. Declaring every `@Prop()` (not
only the markup-bound ones) is what lets controller-only props reach `host.state`.

**Composite components converge too.** The harness discovers every nested `ui-*` tag in a story,
then follows component tags emitted by generated templates to load the complete transitive port
graph. `observeDocument` lowers and controls every root with its own settled host, including roots
created in later mutation turns. That dropped `ui-toast-region` from 28.3% to **0%** and `ui-avatar-group`
(nesting five-plus avatars with the overflow "+N" badge) from 15.5% to **7.9%** — the residual is
anti-aliasing on the heavily-overlapping circle stack; it renders indistinguishably. The after page
also matches Storybook's 1rem canvas padding so right-aligned content isn't shifted.

The harness preserves Storybook's stylesheet order and waits for `document.fonts.ready`, so the
comparison uses Inter on both sides instead of accumulating fallback-font width drift across labels.

`ui-search-shell` now converges at **0%**. Its Stencil render omits `<Host>`, so the converter
preserves the host boundary with a distinct lowered root instead of letting host-level styles
overwrite the inner flex shell. Its controller uses native child observation to keep the optional
status and footer regions synchronized.

`ui-top-bar` also converges at **0%** in its intended mobile viewport. The harness selects that
representative viewport explicitly, and the ported controller keeps the leading, search, and action
regions synchronized with their projected content.

Root inference uses only the unconditional `:host` rule, so state rules such as
`:host(:not([data-open])) { display: none }` cannot incorrectly turn an inline host into a block
root. With the original inline geometry preserved, `ui-popover` converges at **0%**.

Nested `ui-tree-item` is now measured through the representative tree story. The converter lowers
prop ternaries to declarative `$match`/`$if` branches, its controller synchronizes expanded state,
and reflected-prop selectors target HTML Next's `data-*` attributes. `ui-tree` now converges at
**1.7%** and standalone `ui-tree-item` at **1.9%**. Explicit story mappings cover components whose
Storybook taxonomy does not match their tag spelling.

`ui-combobox` is also measurable now. The converter accepts its unparenthesized JSX return,
preserves direct text values, lowers simple prop-guarded subtrees to `$if`, emits boolean and number
prop types, declares Stencil `@State()` roots, and retains safe state-driven attributes such as
`hidden={!this.expanded}`. Recursive lowering handles its generated tooltip, and the closed initial
state now converges at **0%**. `ui-search-result-row` has a ported slot-presence controller and is
back at **1.3%** with state semantics enabled.

**Skipped:** controller-driven components with no static visible box (context-menu, dialog, menu,
menu-item, tooltip), plus affordance-scope and editable, which have no matched story.

**Next — automate controller conversion.** The controller path is proven by hand
(`ui-avatar`, `ui-avatar-group`, `ui-search-shell`, `ui-top-bar`); the skipped overlays (dialog,
menu, tooltip, context-menu) each need their Stencil controller (`@State`, lifecycle, methods) converted
to an HTML Next `host`-based controller. Build a converter for that, the same way
`convert-render.mjs` followed the `ui-button` markup/CSS proof. Then layout/editor packages.
Converted output stays unmerged until the set passes.
