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

## Status

The style converter is complete and tested (`node --test`). Still to do for a full migration:
- **template generation** — many hardcoded ports introduced wrapper elements the shadow originals
  lacked (e.g. `ui-button`'s root should be a passthrough `<span>`, not a `<button>`); the port
  root must mirror the shadow `:host` element;
- run across the full component set and confirm visual convergence per component.
