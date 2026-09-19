# `@threadlabs/looma-migrate-html-next`

Looma-owned migration of Looma's Stencil Shadow-DOM components to
[HTML Next declarative components](https://nextwebwg.org/html-next/). This is **bespoke to Looma**:
HTML Next itself has no ingest converter — its three builds are a live runtime, a compiled
(tree-shaken) native build, and a one-way converter *to* React/Vue/Svelte. Importing Shadow DOM
*into* HTML Next is our concern, and lives here.

## `convert-styles.mjs`

`convertShadowStyles(css)` translates a component's **authoritative shadow stylesheet** (not
Looma's light-DOM fallback, which drops projected-content styling) to HTML Next authoring:

| Shadow | HTML Next |
| --- | --- |
| `:host` | `:scope` (the component's public root) |
| `:host(<cond>)` | `:scope<cond>` (a state/attribute condition on the root) |
| `::slotted(<sel>)` | `:slotted(<sel>)` (styling projected content — a subtree query in HTML Next) |

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

## `harness/`

`node harness/run.mjs` renders each component two ways — the original Stencil Shadow-DOM component
from the built Storybook (`before`) and its HTML Next migration lowered by the vendored runtime
(`after`) — clips to the component, and reports the overlap pixel-mismatch. It is **tooling**: it
renders the migration to validate it; it does not adopt the migration into the shipped components.

`vendor/html-next-runtime.iife.js` is a prebuilt HTML Next runtime (from `nextwebwg/html-next`);
re-vendor when that runtime changes.

## Status

Converter, template generator, and harness are tested (`node --test`) and integrate with the
workspace. `harness/run.mjs` auto-discovers every `packages/core` component with a `.tsx`+`.css`,
matches it to a Storybook story, derives the root from `:host` display, and reports per-component
overlap pixel-mismatch vs. the Shadow-DOM baseline. Run: `pnpm --filter
@threadlabs/looma-migrate-html-next harness` (optionally pass tags to filter). It also writes a
browsable before/after gallery to `harness/gallery/index.html` (gitignored) — open it, or
`python3 -m http.server -d harness/gallery`. To see the original components live, run
`pnpm dev:storybook`.

The diff is **shift-tolerant** (a pixel matches if any pixel within ±2px matches), so the score
reflects real visual difference rather than sub-pixel layout jitter or anti-aliasing.

Full-corpus run (23 rendered, 10 skipped): **20 components under 10%**, 1 in 10–25%, 2 at ≥25%.

| Bucket | Components |
| --- | --- |
| **< 10%** | fab 0%, icon-button 0%, select 0.9%, textarea 1.1%, button 1.2%, search-result-row 1.4%, tabs 2%, chip 2.1%, callout 2.4%, form-field 2.4%, tree 2.9%, radio 3.8%, input 4.3%, avatar 4.4%, checkbox 6.1%, popover 6.4%, switch 8%, radio-group 8.5%, badge 8.7%, disclosure 9.1% |
| 10–25% | avatar-group 14.8% |
| ≥ 25% | toast-region 28.3%, search-shell 33.7% |

Markup+CSS auto-conversion renders most components faithfully with no per-component tuning. The
**controller path is proven**: a converted controller (`harness/controllers/`) is wired via
`observeDocument`/`setControllerModule`/`getComponentHost`, and `ui-avatar` — whose fallback
initials are computed by its controller — converges from 15.5% to **4.4%** with a hand-converted
controller. Declaring every `@Prop()` (not only the markup-bound ones) is what lets controller-only
props reach `host.state`.

**Skipped:** controller-driven components with no static visible box (dialog, menu, tooltip,
top-bar), components with no matched story (affordance-scope, context-menu, editable, menu-item,
tree-item), a non-`render()` method (combobox), and a hidden lowered root (popover).

**Next — automate controller conversion.** The controller path is proven by hand (`ui-avatar`); the
remaining residuals (avatar-group's overflow, toast-region, search-shell) and the skipped overlays
(dialog, menu, tooltip, context-menu, top-bar) each need their Stencil controller (`@State`,
lifecycle, methods) converted to an HTML Next `host`-based controller. Build a converter for that,
the same way `convert-render.mjs` followed the `ui-button` markup/CSS proof. Then layout/editor
packages. Converted output stays unmerged until the set passes.
