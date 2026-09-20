# `@threadlabs/looma-migrate-html-next`

Looma-owned migration of Looma's components to
[HTML Next declarative components](https://nextwebwg.org/html-next/). HTML Next itself has no
ingest converter — its three builds are a live runtime, a compiled (tree-shaken) native build, and
a one-way converter *to* React/Vue/Svelte. Adapting the legacy implementations is Looma's concern
and lives here; the destination contracts are framework-neutral declarative component APIs, not a
model of Stencil decorators, custom-element callbacks, Tiptap commands, or Looma's old internals.

## `convert-styles.mjs`

`convertShadowStyles(css, { reflectedAttributes, booleanAttributes })` translates a component's **authoritative shadow stylesheet** (not
Looma's light-DOM fallback, which drops projected-content styling) to HTML Next authoring:

| Shadow | HTML Next |
| --- | --- |
| `:host` | `:scope` (the component's public root) |
| `:host(<cond>)` | `:scope<cond>` (a state/attribute condition on the root) |
| `::slotted(<sel>)` | `:slotted(<sel>)` (styling projected content — a subtree query in HTML Next) |

Stencil prop selectors such as `:host([size='sm'])` are retargeted to HTML Next's automatic
`data-*` reflection (`:scope[data-size='sm']`), while native state such as `[popover]` and ARIA
attributes remain unchanged. Boolean presence selectors become explicit true-value selectors
because HTML Next reflects both boolean values.

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

`renderPort(tag, tsx, rootEl, { contract })` uses the old Stencil `render()` JSX as a one-time
source-format adapter. It
reproduces the internal element/class structure (`.badge__surface`, `.chip__label`, …) so
class-targeted styling matches, binds clean `{this.prop}` attributes, and drops what doesn't
migrate (event handlers, refs, conditional attributes, icon `innerHTML`). This subsumes the
passthrough case and is what the harness uses; `convert-template.mjs` remains as the simpler
host-only generator.

`core-contracts.mjs` is the authoritative, framework-neutral Looma public contract. It declares
props, HTML attributes, defaults, typed events, methods, and explicit component dependencies for
all 33 core components. Generation fails if the legacy source's public names or attribute aliases
drift, but source decorators never determine the destination API. Stencil is an ingest format for
recovering the old implementation, not a design vocabulary for either Looma or HTML Next.

`convertLightDomStyles(css, { contracts })` retargets Looma's shipped compatibility selectors from
custom-element tags and public attributes to lowered `[data-component-root]`/`data-*` roots. It
also preserves boolean true/false semantics.

## `harness/`

`node harness/run.mjs` renders each component two ways — the original Stencil Shadow-DOM component
from the built Storybook (`before`) and its HTML Next migration lowered by the vendored runtime
(`after`) — clips to the component, and reports the full-bounds pixel mismatch. It is **tooling**: it
renders the migration to validate it; it does not adopt the migration into the shipped components.
After adoption, point `LOOMA_LEGACY_STORYBOOK_STATIC` at a Storybook build from the migration base
revision so the `before` side remains the retained legacy fixture rather than the migrated package.

`vendor/html-next-runtime.iife.js` and `vendor/html-next-generated-runtime.js` are prebuilt from
`nextwebwg/html-next` commit `96ad04e`. Re-vendor both, run the official CLI build for all 49
definitions, and rerun `materialize-adoption.mjs` whenever that upstream runtime/compiler changes.

## Generated component graph

`pnpm --filter @threadlabs/looma-migrate-html-next generate` writes deterministic candidate graphs
to `generated/core/`, `generated/layout/`, and `generated/editor/`: one definition per component,
its relative component edges, the available controller modules, converted styles, and a
machine-readable manifest. These definitions are the canonical source for the shipped declarative
registries and generated framework adapters. Keeping them materialized makes the complete graph
reviewable and prevents the visual harness and adoption build from generating different contracts.

`pnpm --filter @threadlabs/looma-migrate-html-next validate` loads all 49 materialized definitions
without Stencil or a custom-elements registry and requires every definition to parse and lower
through the vendored HTML Next runtime. The same graph passes the upstream HTML Next CLI's `check`.

`pnpm --filter @threadlabs/looma-migrate-html-next test:browser` exercises 20 migrated interaction
groups in Chromium: core form and overlay behavior, layout accessibility and sidebar resizing, and
editor menu bounds/positioning, table selection/preview, overflow dismissal, structured geometry,
intent events, and proximity affordances. Effective controller state uses a separate
`data-state-*` namespace so a rendered internal state change cannot be mistaken for an external
write to a controlled prop.

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

Full-corpus run (33 rendered, 0 skipped): **all 33 core components are under 10%**; 23 are
pixel-identical at 0%. The earlier overlap-only calculation understated components whose converted
bounds were larger than the original; these full-bounds figures are the authoritative baseline.

The layout and editor harnesses use the same full-bounds comparison. All nine layout primitives and
all seven published editor UI surfaces are pixel-identical at **0% mismatch**. The editor baseline
is bundled only for the legacy comparison page; migrated controllers remain direct browser ES
modules. Light-DOM conversion rewrites component tags only in selector preludes, so similarly named
classes and CSS values such as `.ui-editor-table-toolbar` and `ui-monospace` remain intact.

The after page preserves the representative story's measured containing width. That removed false
full-canvas expansion from constrained block components (`ui-search-result-row` is now **1.3%**)
without forcing intrinsic-size components to match.

Markup+CSS auto-conversion renders most components faithfully with no per-component tuning. The
**controller path is proven**: converted controllers (`harness/controllers/`) are imported as real
ES modules from the harness server (nothing is stashed on `window`) and wired via
`observeDocument`/`setControllerModule`/`getComponentHost`. `ui-avatar`'s fallback initials are
computed by its controller. Every controller reads a framework-neutral HTML Next host; the legacy
source adapter does not leak Stencil runtime concepts into those modules.

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

The formerly skipped controller-driven surfaces use explicit open-state captures. `ui-menu`,
`ui-menu-item`, `ui-tooltip`, and `ui-context-menu` converge at **0%**, and `ui-dialog`
at **6.2%**. Harness-owned representative fixtures cover `ui-affordance-scope` and `ui-editable`,
which have no dedicated Storybook stories; both converge at **0%**. The overlay controllers use
native dialog/popover APIs and synchronize generated nested menu roots across lowering turns.

**Adoption.** The core, layout, editor, React, Vue, and Svelte entry points now consume the same
materialized graph. Live HTML is lowered by document observation; framework adapters render native
roots and attach them through the already-registered declarative contract. Neither path registers
custom elements or exposes Stencil/Looma legacy internals as the public component API.
