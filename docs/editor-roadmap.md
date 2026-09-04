# Editor Roadmap — Tiptap UI in Looma

**Goal:** Replicate Confluence / Notion-like editor UX using **only open-source Tiptap extensions**, build the Vue UI ourselves, and **distribute it with Looma** so any app (e.g. Knit) can consume a first-class block editor without paying for Tiptap’s paid templates or Cloud.

**Last updated:** 2026-09-04

---

## Status snapshot

- **Shipped now:** a complete `LoomaEditor` component, the standalone table kit and slash-command extension, token-themed formatting and table controls, desktop selection/table affordances, and a visual-viewport-aware mobile editor surface. Mobile uses one touch-scrollable, snap-aligned dock above the software keyboard and switches that dock between formatting and table actions. Narrow tables scroll horizontally with useful minimum cell widths.
- **App integration status:** Knit embeds `LoomaEditor` and supplies persistence, upload transport, collaboration, and document-domain events. Editor lifecycle, command wiring, selection/focus behavior, slash commands, formatting, and table editing remain Looma-owned.
- **Current open defects:** see [Editor Bugs](./editor-bugs.md) for the remaining table overlay UX issues found during real Knit usage.
- **Next:** continue the documented block-menu, link-editing, mentions, and emoji roadmap without moving shared editor behavior back into an application.

## Release 1 Classification

The six implemented editor elements and the documented extension/helper exports
are published Candidate surface through `@threadlabs/looma/editor`; Vue is the supported R1
adapter. React integration remains internal/deferred even where repository code
already exists. All later phases and ecosystem-parity gaps below are deferred.

E-TBL-003 is not silently waived: release must either fix it or record explicit
owner acceptance after browser evidence establishes an adequate Candidate flow
and no content loss or corruption. See the
[Release 1 support matrix](./release-support-matrix.md).

---

## Base: Tiptap Vanilla JavaScript

The Looma editor is built on Tiptap’s **Vanilla JavaScript** API, not the Vue or React bindings. The contract for all editor web components and adapters is the core **`Editor`** instance from `@tiptap/core` (`new Editor({ extensions, content, ... })`).

- **Docs:** [Tiptap — Vanilla JavaScript](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript)
- **Why:** Looma is web-component-first and framework-agnostic. The editor core is the same in every environment. Looma supplies editor UI, presets, and commands; it does not wrap a framework's editor lifecycle.
- **In Vue apps:** Consumers install `@tiptap/vue-3@^2.11.5` and keep all `@tiptap/*` packages on the supported 2.x line. They use Tiptap's official `useEditor()` and `EditorContent` APIs, while `@threadlabs/looma/vue/editor` supplies Looma's editor UI wrappers and re-exports the framework-neutral Looma helpers. The consuming app connects wrapper events to commands on its Tiptap `Editor` instance. Our internal Knit harness exercises this contract deeply, but Looma's public surface is designed for arbitrary consuming applications.

---

## Technical foundation: Tiptap custom extensions

We build everything we need for the editor on top of Tiptap’s **custom extension** model. That’s the single source of truth for how we add and customize behavior.

**Docs:** [Custom extensions](https://tiptap.dev/docs/editor/extensions/custom-extensions) — extend existing nodes/marks, create new extensions, and (in adapters) framework-specific node views that can host our web components.

How we use it:

| What we need | How we build it (Tiptap docs) |
|--------------|------------------------------|
| **Extend existing** | List keymap (Enter/Backspace), Table config (resizable), Placeholder/Link/Image options. Use [Extend existing](https://tiptap.dev/docs/editor/extensions/custom-extensions/extend-existing). |
| **New extensions** | Slash suggestion, block-context state, table overlay state. Use [Extension API](https://tiptap.dev/docs/editor/extensions/custom-extensions/extension-api) / [Create new](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new). |
| **Custom block UI** | Block handle, table “+” overlays, custom image/code-block UI. Use [Node views → Vue](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/vue) in the **Vue adapter**; the UI itself is implemented as Looma **web components**. |
| **Marks** | Inline code, highlight, link. Use [Mark API](https://tiptap.dev/docs/editor/extensions/custom-extensions/mark-api) or stock extensions; extend only when we need different behavior. |

We **do not** depend on Tiptap’s paid UI or Cloud. We use only the open-source editor, extensions, and the custom-extension docs. In Looma we ship **web components** for editor UI; Vue is the supported R1 adapter and React is an internal/deferred preview.

---

## Why in Looma

- Editor **primitives** (slash menu, block handle, table overlay, context menus, toolbar shell) are reusable across apps—not Knit-specific.
- Keeps Looma as the place for shared UI; Knit (and others) wire domain behavior (save, image upload, presence) on top.
- **Web components first:** All Looma editor UI is implemented as **custom elements**.
  Vue is the supported R1 integration; React remains a repository preview.
  Token-styled, accessible; no dependency on Tiptap’s paid Notion-like template.

---

## Scope: Confluence / Notion parity (open source only)

All of the following are achievable with **open-source** Tiptap extensions + **Looma web components**. No Tiptap Cloud or paid templates. The supported Vue adapter connects the editor instance to these elements in R1; the React integration remains deferred.

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
| **Mentions** | `@user` autocomplete | Optional **web component** list + `@tiptap/extension-mention`; app provides items; adapter wires. |
| **Code block** | Syntax highlighting | The default Looma preset includes `@tiptap/extension-code-block-lowlight` with the common language set. |
| **Links** | Inline link with optional preview | Link extension; optional **web component** popover for edit/preview. |
| **Placeholder** | “Type / for commands…” | Placeholder extension; Looma styles. |
| **Dark/light** | Themed editor | Styles use Looma tokens; no hard-coded colors. |

Collaboration (cursors, presence), save, and image upload are **app responsibilities**; Looma stays domain-neutral (no “pageId”, “workspace”, or app APIs).

---

## What lives in Looma vs in the app

| Layer | Looma | App (e.g. Knit) |
|-------|-------|------------------|
| **Web components** | Slash menu, block/table context menus, table overlay (hover “+”), formatting toolbar, and insert-table grid picker | PageEditor layout, “Saving…” indicator, any app-specific blocks |
| **Framework adapters** | `LoomaEditor` owns the Vue Tiptap lifecycle, selection/focus behavior, command wiring, and all editor UI; primitive wrappers remain available for advanced composition | Renders `LoomaEditor`, supplies content/editability/upload callbacks, and receives content updates |
| **Extensions** | Turnkey preset plus standalone table and slash-command extensions/helpers | Adds only genuinely app-specific extensions when needed |
| **Styles** | Editor CSS (tokens-based): table, slash menu, block handle, selection | App theme; can override tokens |
| **Behavior** | Editing behavior, including tables, slash commands, formatting, image insertion UI, selection, and focus | Persistence, image-upload transport, collaboration/presence, and domain events |

Looma’s `/editor` subpath exposes the complete framework-neutral Tiptap-backed editor surface: **custom elements**, extension presets, and command helpers. `@threadlabs/looma/vue/editor` adds the turnkey `LoomaEditor` component and owns its Tiptap lifecycle. Advanced consumers can use the extension kit without the component, or import raw custom-element chrome from `/editor/ui` for fully custom composition.

---

## Public surface: `@threadlabs/looma/editor`

- **Location:** `packages/editor/`
- **Contents:** the Tiptap-backed Looma editor API with **web components**, the default extension preset, and shared commands. No Vue or React runtime is included. Core elements and tokens come from the same facade package. `/editor/ui` preserves a low-level Tiptap-independent boundary for custom composition; `/editor/extensions` preserves a focused deep import for presets and commands.
- **Exports:** Custom elements (e.g. slash menu, table overlay, toolbar, block handle, context menus, grid picker), editor styles (CSS using tokens), the extension preset, and shared command helpers.

Vue editor adapters live at `@threadlabs/looma/vue/editor`; the private React workspace is internal/deferred. They render the editor web components and connect a Tiptap `Editor` instance via props/events.

**Phased delivery:**

1. **Phase 1 — Tables + list behavior**  
   **Web components:** table overlay (hover “+”), table context menu, insert-table grid picker. List keymap/behavior doc or helper. Adapter wires Tiptap table commands. (Aligns with Knit’s table spec.)

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

- **Web components:** All editor UI in Looma is **custom elements**. The supported Vue editor adapter at `@threadlabs/looma/vue/editor` wraps them and wires Tiptap; the general `/vue` entry remains editor-free.
- **Domain-neutral:** No Knit/page/workspace in element attributes or adapter props. Use slots/events or callbacks (e.g. `onImageUpload?: (file: File) => Promise<string>`) for app-specific behavior in the adapter.
- **Token-based styling:** All colors, spacing, radius from Looma tokens; no raw hex or app-specific classes in the package.
- **Accessibility:** Keyboard nav, ARIA, 44px touch targets where applicable (per product steering).

---

## References

- **Tiptap:** [Vanilla JavaScript](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript) (base API for Looma editor), [Custom extensions](https://tiptap.dev/docs/editor/extensions/custom-extensions), [Table extension](https://tiptap.dev/docs/editor/extensions/nodes/table), [Extensions overview](https://tiptap.dev/docs/editor/extensions/overview).
- Knit: `docs/tiptap-notion-like-vs-knit.md` — why we build ourselves; `docs/feature-roadmap.md` — list + table parity.
- Knit: `specs/v1-editor-tables.md` — Confluence table feature list and Tiptap mapping.
- Looma: `docs/component-system.md` — when to add components; `docs/component-roadmap.md` — candidate queue.
