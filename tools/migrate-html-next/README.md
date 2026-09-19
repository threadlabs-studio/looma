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

Full-corpus run (19 rendered, 14 skipped): **11 components under 10%**, 5 in 10–25%, 3 at ≥25%.

| Bucket | Components |
| --- | --- |
| **< 10%** | icon-button 0%, floating-action-button 0.1%, search-result-row 1.4%, textarea 1.7%, select 2.9%, tree 4%, form-field 4.1%, input 4.9%, callout 6.3%, button 8.3%, disclosure 9.9% |
| 10–25% | chip 11.5%, badge 19.7%, checkbox 20.4%, radio 20.6%, switch 24.3% |
| ≥ 25% | search-shell 34.6%, avatar 35.1%, toast-region 35.4% |

**Skipped:** controller-driven components with no static visible box (dialog, menu, tooltip,
top-bar), components with no matched story (affordance-scope, context-menu, editable, menu-item,
tree-item), and render shapes the translator does not yet handle — list/fragment renders
(avatar-group, radio-group, tabs), a non-`render()` method (combobox), and a hidden lowered root
(popover).

**Next:** handle list/fragment renders and dynamic text bindings (`{this.label}` → `$value`);
controller wiring so overlay/interactive components can be measured; per-component residuals in the
10–25% and ≥25% buckets; then the layout/editor packages. Converted output stays unmerged until the
set passes.
