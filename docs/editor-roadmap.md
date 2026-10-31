# Editor Roadmap — Tiptap UI in Looma

**Goal:** Provide a complete block editor with open-source Tiptap extensions and shared HTML Next controls, distributed with Looma for applications to consume without a framework-specific implementation.

**Last updated:** 2026-10-30

---

## Status snapshot

- **Implemented:** authored `ui-editor`, `ui-compact-editor` and `ui-compact-content` components, standalone table,
  slash-command, and mention extensions, token-themed formatting and table
  controls, desktop selection/table affordances, and a visual-viewport-aware
  mobile editor surface. Mention search accepts a bounded async host provider,
  keeps focus in the editor, and renders at most twenty results. Mobile uses one
  touch-scrollable, snap-aligned dock above the software keyboard and switches
  that dock between formatting and table actions. Narrow tables scroll
  horizontally with useful minimum cell widths.
- **App integration:** Hosts supply JSON content, persistence and authorized services. Looma owns editor lifecycle, commands, selection/focus, slash menus, formatting and table behavior.
- **Current open defects:** see [Editor Bugs](./editor-bugs.md) for the remaining table overlay UX issues found during consumer integration testing.
- **Next:** continue the documented block-menu, link-editing, and emoji roadmap
  without moving shared editor behavior back into an application.

## Release 1 Classification

Editor definitions ship under the package’s HTML Next source condition. Framework-neutral extension and session helpers ship through `@threadlabs/looma/editor`. The complete Vue, React and Svelte source graph requires HTML Next runtime alpha.74 or later and Vite adapter alpha.79 or later. Native and Vite-converted Vue browser parity is recorded in the [editor ledger](./editor-html-next-parity.md). All later phases and ecosystem-parity gaps below are deferred.

E-TBL-003 is not silently waived: release must either fix it or record explicit
owner acceptance after browser evidence establishes an adequate Candidate flow
and no content loss or corruption. See the
[Release 1 support matrix](./release-support-matrix.md).

---

## Base: Tiptap Vanilla JavaScript

The Looma editor is built on Tiptap’s **Vanilla JavaScript** API, not the Vue or React bindings. The contract for all editor web components and adapters is the core **`Editor`** instance from `@tiptap/core` (`new Editor({ extensions, content, ... })`).

- **Docs:** [Tiptap — Vanilla JavaScript](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript)
- **Why:** Looma is web-component-first and framework-agnostic. The editor core is the same in every environment. Looma supplies editor UI, presets, and commands; it does not wrap a framework's editor lifecycle.
- **In framework apps:** Use the HTML Next Vite plugin with the framework target and import `UiEditor` or `UiCompactEditor` from `@threadlabs/looma`. The shared session uses `@tiptap/core` and `@tiptap/pm` on the supported 2.x line. Pass JSON through `content`, handle `change.detail.content`, and answer integration requests. No Tiptap Vue binding is required.

---

## Technical foundation: Tiptap custom extensions

We build everything we need for the editor on top of Tiptap’s **custom extension** model. That’s the single source of truth for how we add and customize behavior.

**Docs:** [Custom extensions](https://tiptap.dev/docs/editor/extensions/custom-extensions) — extend existing nodes/marks, create new extensions, and (in adapters) framework-specific node views that can host our web components.

How we use it:

| What we need | How we build it (Tiptap docs) |
|--------------|------------------------------|
| **Extend existing** | List keymap (Enter/Backspace), Table config (resizable), Placeholder/Link/Image options. Use [Extend existing](https://tiptap.dev/docs/editor/extensions/custom-extensions/extend-existing). |
| **New extensions** | Slash suggestion, block-context state, table overlay state. Use [Extension API](https://tiptap.dev/docs/editor/extensions/custom-extensions/extension-api) / [Create new](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new). |
| **Custom block UI** | Block handle, table “+” overlays, custom image/code-block UI. Use framework-neutral Tiptap node views backed by Looma component factories. |
| **Marks** | Inline code, highlight, link. Use [Mark API](https://tiptap.dev/docs/editor/extensions/custom-extensions/mark-api) or stock extensions; extend only when we need different behavior. |

We **do not** depend on Tiptap’s paid UI or Cloud. We use only the open-source editor, extensions, and the custom-extension docs. Looma ships HTML Next definitions for editor UI; applications compile their framework projections through the Vite plugin.

---

## Why in Looma

- Editor **primitives** (slash menus, block actions, table controls and toolbar shells) are reusable across applications.
- Applications add persistence, upload transport and collaboration through supported requests and events.
- **Web components first:** All Looma editor UI is implemented as **custom elements**.
  Vue, React and Svelte consume the same authored definitions through their Vite targets.
  Token-styled, accessible; no dependency on Tiptap’s paid Notion-like template.

---

## Scope: Confluence / Notion parity (open source only)

All of the following are achievable with **open-source** Tiptap extensions + **Looma web components**. No Tiptap Cloud or paid templates. The shared session connects the editor instance to these elements; framework projections retain that controller behavior.

| Feature | Description | Looma delivers |
|--------|--------------|----------------|
| **Slash commands** | `/` menu for blocks (headings, lists, quote, code, table, image, etc.) | **Web component** (e.g. `ui-editor-slash-menu`) + adapter wires suggestion/commands. |
| **List behavior** | Enter = new list item (no paragraph gap); Backspace on empty item exits list | Extension config or keymap helper; doc’d in Looma, app registers with editor. |
| **Tables** | Insert table (grid picker), add/delete row & column, merge/split, resize, context menu | Table extensions (app/extension layer) + **web components**: table overlay (hover “+”), context menu, insert-table grid picker. Adapter wires Tiptap commands. |
| **Inline code** | Inline `code` span | Use `@tiptap/extension-code`; toolbar + optional slash. |
| **Block menu** | Per-block handle or “⋮” → duplicate, delete, “Turn into” (heading, list, quote, …) | **Web components**: block handle, context menu. Adapter passes editor + “turn into” items. |
| **Formatting toolbar** | Bold, italic, underline, strike, highlight, link, headings, lists | **Web component** toolbar (slot-based or default buttons). Adapter toggles marks/nodes on editor. |
| **Floating toolbar** | On selection: bubble with format actions | Optional **web component**; adapter positions and wires commands. |
| **Image** | Insert image; upload is app-provided | Image extension; app provides `onImageUpload`. Optional **web component** for upload trigger. |
| **Emoji** | Picker in slash or toolbar | Optional **web component** picker + `@tiptap/extension-emoji`; adapter wires insert. |
| **Mentions** | `@user` autocomplete | **Shipped:** accessible web-component list + `@tiptap/extension-mention`; app provides bounded static or async items and owns authorization. |
| **Code block** | Syntax highlighting | The default Looma preset includes `@tiptap/extension-code-block-lowlight` with the common language set. |
| **Links** | Inline link with optional preview | Link extension; optional **web component** popover for edit/preview. |
| **Placeholder** | “Type / for commands…” | Placeholder extension; Looma styles. |
| **Dark/light** | Themed editor | Styles use Looma tokens; no hard-coded colors. |

Collaboration (cursors, presence), save, and image upload are **app responsibilities**; Looma stays domain-neutral (no “pageId”, “workspace”, or app APIs).

---

## What lives in Looma vs in the app

| Layer | Looma | Application |
|-------|-------|------------------|
| **Web components** | Slash and mention menus, block/table context menus, table overlay (hover “+”), formatting toolbar, and insert-table grid picker | PageEditor layout, “Saving…” indicator, any app-specific blocks |
| **Framework adapters** | `UiEditor` and `UiCompactEditor` are compiled from HTML Next. The neutral session owns Tiptap lifecycle, selection/focus, commands and integration requests. |
| **Extensions** | Turnkey preset plus standalone table and slash-command extensions/helpers | Adds only genuinely app-specific extensions when needed |
| **Styles** | Editor CSS (tokens-based): table, slash menu, block handle, selection | App theme; can override tokens |
| **Behavior** | Editing behavior, including tables, slash commands, formatting, image insertion UI, selection, and focus | Persistence, image-upload transport, collaboration/presence, and domain events |

`@threadlabs/looma/editor` exposes framework-neutral sessions, contracts, extension presets and command helpers. The HTML Next `ui-editor` definition owns composition and the controller connects its declared mount to the session. Advanced consumers can use the extension kit without the complete component.

---

## Public surface: `@threadlabs/looma/editor`

- **Location:** `packages/looma/src/editor/`; the component definitions and controllers live under `src/components/ui-editor*` and `ui-compact-*`.
- **Contents:** the Tiptap-backed Looma editor API with **web components**, the default extension preset, and shared commands. No Vue or React runtime is included. Core elements and tokens come from the same facade package. `/editor/ui` preserves a low-level Tiptap-independent boundary for custom composition; `/editor/extensions` preserves a focused deep import for presets and commands.
- **Exports:** Custom elements (e.g. slash menu, table overlay, toolbar, block handle, context menus, grid picker), editor styles (CSS using tokens), the extension preset, and shared command helpers.

Vue, React and Svelte projections are compiled by the consuming application from the same HTML definitions. See [Loading Looma](framework-loading.md) for plugin configuration, real import names and qualification limits.

**Phased delivery:**

1. **Phase 1 — Tables + list behavior**  
   **Web components:** table overlay (hover “+”), table context menu, insert-table grid picker. List keymap/behavior doc or helper. Adapter wires Tiptap table commands.

2. **Phase 2 — Slash + toolbar**  
   **Web components:** slash menu, formatting toolbar. Adapter wires suggestion + default commands and format actions.

3. **Phase 3 — Block menu**  
   **Web components:** block handle, block context menu (“Turn into”, duplicate, delete). Optional drag-handle. Adapter wires editor commands.

4. **Phase 4 — Polish**  
   **Web components:** floating toolbar, emoji picker, mention list, link popover as needed. Adapters wire to Tiptap.

---

## Ecosystem parity gaps

Source: [Component Library Audit](./component-library-audit.md), benchmarked against Tiptap open-source docs, BlockNote, Plate, and Lexical.

The editor ecosystem splits into two broad camps:

- Tiptap and Lexical provide strong editing foundations but expect more UI to be app-owned
- BlockNote and Plate ship more ready-made menus, toolbars, and editor-side recipes

For Looma, the gap is not editor-core capability. The gap is reusable editor UI ownership.

### P0

- **Block menu / block side menu**
  - Strong recurrence in BlockNote and Plate
  - Looma should ship a reusable gutter-side block affordance for duplicate, delete, and "turn into"
- **Floating toolbar**
  - Strong recurrence in Tiptap examples, BlockNote, and Plate
  - Looma should ship a selection-driven toolbar primitive rather than keeping this app-local
- **Link editing UI**
  - Common in richer editors, often as a toolbar popover or hover toolbar
  - Looma should ship a domain-neutral link editing surface instead of leaving link edit UI entirely to apps

### P1

- **Mentions**
  - Common enough across richer ecosystems to stay on the Looma roadmap
  - Keep app-provided data; Looma owns the menu UI and event contract
- **Emoji**
  - Common enough to keep as a Looma-owned grid suggestion/menu primitive
  - BlockNote's emoji grid pattern is a useful benchmark for navigation and filtering
- **Table action depth**
  - Tables are partly shipped now, but parity is not complete until richer structural actions are consistently covered and documented

### P2

- **Default toolbar taxonomy**
  - Define a stable Looma default action grouping for mark buttons, block transforms, list controls, and link actions
- **Default slash grouping**
  - Add a grouped-item contract for slash menu sections, aliases, and richer metadata
- **Selection-aware table/link polish**
  - Keep deeper affordances in scope only after block menu and floating toolbar land

---

## Contract (Looma editor API)

- **Component UI:** Editor controls are HTML Next definitions. Native HTML invocations and framework projections use the same controllers and neutral sessions.
- **Domain-neutral:** Keep application identities and domain models out of component attributes and shared props. Hosts answer declared requests such as `image-upload` and handle native event details.
- **Token-based styling:** All colors, spacing, radius from Looma tokens; no raw hex or app-specific classes in the package.
- **Accessibility:** Keyboard nav, ARIA, 44px touch targets where applicable (per product steering).

---

## References

- **Tiptap:** [Vanilla JavaScript](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript) (base API for Looma editor), [Custom extensions](https://tiptap.dev/docs/editor/extensions/custom-extensions), [Table extension](https://tiptap.dev/docs/editor/extensions/nodes/table), [Extensions overview](https://tiptap.dev/docs/editor/extensions/overview).
- Looma: `docs/component-system.md` — when to add components; `docs/component-roadmap.md` — candidate queue.
