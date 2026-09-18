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

## `harness/`

`node harness/run.mjs` renders each component two ways — the original Stencil Shadow-DOM component
from the built Storybook (`before`) and its HTML Next migration lowered by the vendored runtime
(`after`) — clips to the component, and reports the overlap pixel-mismatch. It is **tooling**: it
renders the migration to validate it; it does not adopt the migration into the shipped components.

`vendor/html-next-runtime.iife.js` is a prebuilt HTML Next runtime (from `nextwebwg/html-next`);
re-vendor when that runtime changes.

## Status

Converter, template generator, and harness are tested (`node --test`) and integrate with the
workspace. Current convergence (overlap pixel-mismatch vs. the Shadow-DOM baseline):

| Component | Result | Note |
| --- | --- | --- |
| `ui-button` | **8.3%** | genuine passthrough + `:slotted` — converges |
| `ui-badge`, `ui-chip`, `ui-callout`, `ui-icon-button` | 20–37% | styling targets internal classed wrappers (`.badge__surface`, …); a bare passthrough port lacks them |

**Next:** structural template generation — derive the port's internal element/class structure from
the Stencil `render()` (not just the host), so components with classed wrappers converge. Then run
the full component set. The converted output stays unmerged until every component passes.
