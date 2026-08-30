# Editor Roadmap — Tiptap UI in Looma

**Goal:** Replicate Confluence / Notion-like editor UX using **only open-source Tiptap extensions**, build the Vue UI ourselves, and **distribute it with Looma** so any app (e.g. Knit) can consume a first-class block editor without paying for Tiptap’s paid templates or Cloud.

**Last updated:** 2026-08-30

---

## Status snapshot

- **Shipped now:** default extension preset (including CodeBlock), inline code mark, list Enter/Backspace behavior extension, slash menu web component, toolbar shell, table context menu + table toolbar + insert-table grid + table overlay web components, table cell alignment/background formatting helpers, editor CSS, Vue/React editor event wiring for the shipped primitives, and `handleTableOverlayAction(editor, detail)` / `insertTableAtRange(editor, range, options)` helpers in `@threadlabs/looma-editor/extensions` for shared table behaviors. The floating table toolbar is now intentionally structural-only, with cell-specific actions staying in the shared context menu.
- **App integration status:** Knit now uses Looma’s editor preset plus Looma-owned toolbar/slash/table primitives in its page editor flow. Formatting toolbar command definitions and broader editor UX are still partly app-local.
- **Current open defects:** see [Editor Bugs](./editor-bugs.md) for the remaining table overlay UX issues found during real Knit usage.
- **Next in Phase 1:** close the open table UX defects from real Knit usage, then continue promoting block-menu and richer toolbar UI into Looma ownership.

## Release 1 Classification

The six implemented editor elements and the documented extension/helper exports
are published Candidate surface through `@threadlabs/looma-editor`; Vue is the supported R1
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
- **Why:** Looma is web-component-first and framework-agnostic. The editor core is the same in every environment; Vue and React **adapters** create or receive that vanilla `Editor` instance and pass it to the web components. No framework-specific editor API in Looma’s editor package.
- **In apps:** Knit (Vue) can still use `@tiptap/vue-3`’s `useEditor()` to create and manage the editor—it returns the same `Editor` instance. The adapter then passes that instance into Looma’s web components. The **base** we design and document against is vanilla; framework integrations are a thin layer on top.

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
| **Code block** | Syntax highlighting | Use `@tiptap/extension-code-block-lowlight`; app registers languages. |
| **Links** | Inline link with optional preview | Link extension; optional **web component** popover for edit/preview. |
| **Placeholder** | “Type / for commands…” | Placeholder extension; Looma styles. |
| **Dark/light** | Themed editor | Styles use Looma tokens; no hard-coded colors. |

Collaboration (cursors, presence), save, and image upload are **app responsibilities**; Looma stays domain-neutral (no “pageId”, “workspace”, or app APIs).

---

## What lives in Looma vs in the app

| Layer | Looma | App (e.g. Knit) |
|-------|-------|------------------|
| **Web components** | Slash menu, block handle, block/table context menus, table overlay (hover “+”), toolbar, insert-table grid picker, (optional) floating toolbar, emoji picker, mention list | PageEditor layout, “Saving…” indicator, any app-specific blocks |
| **Framework adapters** | `@threadlabs/looma-vue` supplies the supported R1 wrappers; `@threadlabs/looma-react` remains an internal preview | Uses an adapter when rendering editor UI (e.g. a Vue toolbar wrapper that mounts the web component and connects Tiptap) |
| **Extensions** | Document which extensions to use; optional “preset” that returns extension list (app still creates editor) | useEditor/createEditor: registers Looma-recommended extensions + app-specific (e.g. placeholder text from route) |
| **Styles** | Editor CSS (tokens-based): table, slash menu, block handle, selection | App theme; can override tokens |
| **Behavior** | None: no save, no upload, no presence | Save on delay, image upload to app API, presence (Supabase or other) |

Looma’s editor package exposes **custom elements** (and editor styles); **adapters** in `@threadlabs/looma-vue` / `@threadlabs/looma-react` wire the **vanilla** Tiptap `Editor` instance to them. The app creates the editor (vanilla `new Editor()` or framework `useEditor()`) and owns its lifecycle.

---

## Package: `@threadlabs/looma-editor`

- **Location:** `packages/editor/`
- **Contents:** **Web components** (custom elements) for editor UI only—no Vue/React in this package. Dependencies: `@threadlabs/looma-core`, `@threadlabs/looma-tokens`. **No** direct Tiptap dependency in the package. Adapters (in `@threadlabs/looma-vue` / `@threadlabs/looma-react`) create or receive the **Vanilla JavaScript** Tiptap `Editor` (from `@tiptap/core`) and wire it to these elements.
- **Exports:** Custom elements (e.g. slash menu, table overlay, toolbar, block handle, context menus, grid picker), editor styles (CSS using tokens), and optionally extension preset (documentation or a shared config the app imports).

Editor adapters live beside their framework packages: `@threadlabs/looma-vue` is the R1 supported surface, while `@threadlabs/looma-react` is internal/deferred. They render the editor web components and connect a Tiptap `Editor` instance via props/events.

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

- **Web components:** All editor UI in Looma is **custom elements**. Vue and React **adapters** (in `@threadlabs/looma-vue` / `@threadlabs/looma-react`) wrap them and wire Tiptap—same pattern as the rest of Looma (e.g. `ui-dialog` + Vue Dialog adapter).
- **Domain-neutral:** No Knit/page/workspace in element attributes or adapter props. Use slots/events or callbacks (e.g. `onImageUpload?: (file: File) => Promise<string>`) for app-specific behavior in the adapter.
- **Token-based styling:** All colors, spacing, radius from Looma tokens; no raw hex or app-specific classes in the package.
- **Accessibility:** Keyboard nav, ARIA, 44px touch targets where applicable (per product steering).

---

## References

- **Tiptap:** [Vanilla JavaScript](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript) (base API for Looma editor), [Custom extensions](https://tiptap.dev/docs/editor/extensions/custom-extensions), [Table extension](https://tiptap.dev/docs/editor/extensions/nodes/table), [Extensions overview](https://tiptap.dev/docs/editor/extensions/overview).
- Knit: `docs/tiptap-notion-like-vs-knit.md` — why we build ourselves; `docs/feature-roadmap.md` — list + table parity.
- Knit: `specs/v1-editor-tables.md` — Confluence table feature list and Tiptap mapping.
- Looma: `docs/component-system.md` — when to add components; `docs/component-roadmap.md` — candidate queue.
