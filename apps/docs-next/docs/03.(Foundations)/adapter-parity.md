---
order: 6
---

# Framework adapters

Looma publishes HTML Next definitions. Applications compile them with `@nextwebwg/html-next-unplugin/vite` and their framework's Vite compiler. The adapters project the same props, slots, native events, controllers and semantic roots; Looma does not publish a separate framework component library.

| Application | Vite plugins, in order | Component import |
| --- | --- | --- |
| Vue | `htmlNext({ target: "vue" })`, `vue()` | `import { UiButton, UiEditor } from "@threadlabs/looma"` |
| React | `htmlNext({ target: "react" })`, `react()` | Same prefixed names |
| Svelte 5 | `htmlNext({ target: "svelte" })`, `svelte()` | Same prefixed names |
| HTML Next | Resolve `<link rel="component">` definitions | `<ui-button>`, `<ui-editor>` |

See [Getting started](/getting-started/) for installation, plugin imports, themes and generated declarations. React declaration generation in HTML Next alpha.70 still has errors against the complete Looma graph; it is not yet qualified for release.

Component names follow the source tag: `ui-site-header` becomes `UiSiteHeader`, `ui-editor` becomes `UiEditor`, and `ui-compact-editor` becomes `UiCompactEditor`. Types and headless editor helpers remain at `@threadlabs/looma/editor`; compact schema helpers live at `/editor/compact`.

## Slots, events and server rendering

Vue uses named slots, React uses the `slots` prop, and Svelte uses snippets supplied through `slots`. Default content follows each framework's normal syntax. Declared event handlers receive native `CustomEvent`s; read `event.detail`. The editors use `content` and `change.detail.content` for controlled documents. Function-valued integration services answer declared HTML Next requests.

Public modules must import during SSR without browser globals. Controllers attach in the browser and preserve authored semantic fallback. The document editor has a `fallback` slot; compact content renders escaped semantic JSON during SSR. Native HTML invocations and framework components share the same sessions and behavior tests.
