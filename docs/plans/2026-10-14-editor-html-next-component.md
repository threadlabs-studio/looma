# LoomaEditor as an HTML Next component

Status: accepted, 2026-10-14, with the owner's decisions recorded in §6.

## Goal

LoomaEditor becomes an HTML Next component. One definition (template, styles, and a controller
that mounts Tiptap) is the source; HTML/DOM registration and the Vue component come from the same
build that produces Looma's other components, and React and Svelte come from
`@nextwebwg/html-next-converter`. The hand-written Vue editor keeps working, and keeps passing its
tests, until the generated editor reaches parity. The work also hardens the HTML Next proposal,
runtime, and converters: each gap below becomes an `nextwebwg/html-next` issue or PR with a
regression test, or a proposal change in `nextwebwg/specs`.

The first consumer outside Looma is Markupress's Looma documentation migration. Its stage 4, the
editor guide, embeds the editor like any other HTML Next component, without a second component
runtime on the page.

Revisions referenced: Looma `main` at `132af3e3` (HTML Next pinned at `1.0.0-alpha.35`; #324
moves to `1.0.0-alpha.41`), HTML Next `main` at `a259d1b` (`1.0.0-alpha.48`), specs `main` at
`c382775`.

## 1. Current architecture

### Entry points

| Export | Source | Framework |
| --- | --- | --- |
| `@threadlabs/looma/vue/editor` | `src/vue/editor/index.ts`: `LoomaEditor`, node views, re-exports of `/editor` and the editor component wrappers | Vue |
| `@threadlabs/looma/vue/editor/compact` | `src/vue/editor/compact/`: `LoomaCompactEditor`, `LoomaCompactContent` (server-renderable JSON) | Vue |
| `@threadlabs/looma/editor`, `/editor/ui`, `/editor/extensions` | `src/editor/`: contracts, icons, viewport helper, Tiptap extensions and presets | none (no `vue` import anywhere under `src/editor/`) |
| `@threadlabs/looma` (DOM), `/vue`, `/vanilla` | the eleven `ui-editor-*` HTML Next components, assembled with every other component | HTML Next |

`build.mjs` assembles every `ui-*` component with `assembleComponentPackage`, then builds the Vue
library, which adds `src/vue/editor` as a hand-written entry, and builds `src/editor` separately.
No HTML Next definition exists for the editor itself; `/editor` registers no custom elements.

### LoomaEditor (`src/vue/editor/LoomaEditor.ts`, 2358 lines)

- Contract: 25 props in eight groups (document, slash, code, mentions, links, images, toolbar,
  host actions), nine emits (`update:modelValue`, `update`, `update:toolbarOpen`, `ready`,
  `selectionAction`, `rangeAction`, `uploadError`, `imageActivate`, `imageRenditionError`),
  `v-model` and `v-model:toolbar-open`, no slots, and `expose({ editor, focus })`. Seven props
  take functions or live objects: `extensions`, `slashCommands` (array or factory),
  `mentionProvider`, `linkSearch`, `linkResolve`, `uploadImage`, `resolveImageAttributes`.
- Vue-bound: `useEditor`, `EditorContent`, and three `BubbleMenu`s from `@tiptap/vue-3` (which
  bring tippy.js transitively); about 40 refs, 4 reactive objects, 11 watchers, `useId`,
  roughly 15 `nextTick`s; an `editorStateVersion` counter that re-renders on every transaction
  because the Tiptap `Editor` is not reactive; render-function composition of 17 Looma Vue
  components and 9 editor wrappers; wrapper workarounds (VNode hooks that copy `disabled` onto
  inner buttons; `Stack` hosts that keep tippy-moved menus anchored).
- Framework-neutral logic living in the Vue file: the link-editing state machine, block actions,
  table and code-block UI geometry, the mobile visual-viewport dock, held press and Escape,
  outside dismiss, image activation, rendition failure and upload, chip editing, hover tracking,
  selection and range action grouping, controlled-content sync (`sameDocument`), and lazy
  grammar loading. Roughly half the file is this material.

### Node views and other Vue files

`image.ts`, `divider.ts`, `expand.ts`, `table-of-contents.ts`, and `callout.ts` mount a Vue app per
node with `createApp`; `image-controls.ts` is a Vue component. `image-delivery.ts` and
`code-language-catalog.ts` are framework-neutral but live under `src/vue/editor/`.
`looma-editor.css` (711 lines) holds content and shell styles; part of it is frozen editor debt.

### Menus and overlays

| Surface | Today | Layer |
| --- | --- | --- |
| Formatting toolbar (bubble, popover, contextual), link card | `BubbleMenu` (tippy), wrapped in `createViewportSurface` | top layer |
| Image actions | `BubbleMenu` (tippy) | **not** top layer |
| Slash and mention menus | `ui-editor-slash-menu`, `ui-editor-mention-menu`; component controllers place them with `positionMenu` from an `anchorRect` | top layer |
| Table toolbar, code-language picker, mobile toolbar | editor-computed coordinates in raw shells, presented with `createViewportSurface` | top layer |
| Table context menu | editor-computed insets in a raw fixed shell; the component's `writtenPlace` and viewport nudge | top layer |
| Table overlay (handles) | editor-computed coordinates, plain `position: fixed` | **not** top layer |
| Toolbar popover, compact Format, link form, chip editor, insert-table grid, block actions, tooltips | Looma `ui-popover`, `ui-menu`, `ui-tooltip` anchored by `for` id | top layer |

Two surfaces break `docs/overlay-contract.md` (every open floating surface in the top layer; no
per-component ad hoc positioners), and the tippy surfaces keep their own Escape and outside
dismissal outside the shared overlay stack.

### Existing docs that disagree with the code

`docs/editor-roadmap.md` describes a vanilla-Tiptap, custom-elements-first editor that wraps no
framework lifecycle; `docs/adapters.md` says adapters are thin projections with no behavior of
their own. LoomaEditor is neither today. This plan is the route back to what those documents
describe.

## 2. Target

### Shape

```text
src/editor/session/            framework-neutral TypeScript, built into @threadlabs/looma/editor
  createEditorSession()        owns the @tiptap/core Editor, content sync, commands,
                               and a plain state snapshot with subscribe()
src/components/ui-editor/      HTML Next definition
  ui-editor.html               template: toolbar slot and parts, ui-editor-surface, the mount,
                               menus and overlays as parts; styles
  ui-editor.js                 controller: binds the session to host.state, host.dispatch,
                               and the mount element
src/components/ui-editor-*/    existing parts, plus new parts for the Vue-composed surfaces
```

- **The session** is where today's neutral logic goes. It creates a vanilla `@tiptap/core`
  `Editor` on an element it is given, keeps the `EditorState` across remounts, applies controlled
  content with an echo guard, and exposes commands and a snapshot (active marks, slash and
  mention snapshots, table, code, link, chip, and selection-action state). Nothing in it imports
  Vue or HTML Next.
- **The controller** is a thin adapter. In `host.on("connect")` it gives the session a child
  mount element (never the root, which the runtime writes attributes onto), copies snapshot
  fields into `host.state`, forwards session events through `host.dispatch`, and returns the
  session's detach as the connection cleanup. Because controllers ship as copied JavaScript
  modules, the controller imports the built session from `@threadlabs/looma/editor` rather than
  TypeScript sources.
- **Menus and overlays are parts in the editor's template**, outside the mount, opened from
  `host.state` and placed from an anchor rectangle the session computes (`coordsAtPos`, table
  and code-block rects), through Looma's shared overlay layer. tippy.js goes away. Every surface
  is in the top layer and on the shared dismissal stack, which fixes the two contract breaks.
- **New parts** replace the Vue compositions: link card, link form, chip editor, image controls,
  code-language picker, block actions, and the formatting toolbar's floating presentation
  (`ui-editor-toolbar` already exists). Each is an ordinary HTML Next component with examples
  and a docs page, like the existing seven editor parts.
- **Node views** render HTML Next components (image, separator, disclosure, table of contents)
  without a framework app per node. This depends on gap 8.
- **Outputs**: DOM registration and vanilla factory from `assembleComponentPackage`; the Vue
  component from the same build, which on HTML Next `1.0.0-alpha.41` and later is converted Vue;
  React and Svelte generated by the converter and published from Looma (D5); Looma ships no
  React or Svelte output today.

### Public API

The HTML Next contract keeps today's names where HTML Next allows them and states every change:

| Today (Vue) | HTML Next component |
| --- | --- |
| `modelValue` + `update:modelValue` / `update` | `content` prop + `change` event whose detail has `content` (Vue `v-model:content` is inferred from that field) |
| `toolbarOpen` + `update:toolbarOpen` | `toolbar-open` prop + `toolbar-open`/`toolbar-close` events |
| `selectionAction`, `rangeAction`, `uploadError`, `imageActivate`, `imageRenditionError` | `selection-action`, `range-action`, `upload-error`, `image-activate`, `image-rendition-error` (event names must be lowercase kebab case) |
| `ready` (Editor instance) | none; see gap 7 |
| `expose({ editor, focus })` | none; see gap 7 |
| function and object props (`extensions`, providers, uploaders, resolvers, slash factory) | not passed as functions; replaced by a controller-hook design (D3, gap 9) |

The Vue export stays `LoomaEditor` through the build's naming map (D1). The switch (step 10) ships
as a breaking minor with migration notes, without a hand-written compatibility layer (D2).

## 3. Expected HTML Next gaps

Each gap names the proposal (P), live runtime (R), assembled outputs (A), or converter (C) part
it touches, and the concrete editor need. The HTML Next side of each gap (issues or PRs with
regression tests in `nextwebwg/html-next`, proposal changes in `nextwebwg/specs`) is driven
separately from this plan; Looma supplies repros on request.

### 1. Imperative third-party DOM inside a component (P, R, C)

The proposal says the runtime owns bound nodes and the controller owns an unbound "foreign"
subtree, but nothing declares or enforces that subtree.

- R: the live runtime's document `MutationObserver` runs component discovery (`matches` and
  `querySelectorAll` over registered tags) for every element ProseMirror inserts, such as block
  splits, marks, and paste. Pasted HTML that keeps a registered tag or a `data-component`
  attribute would be lowered or hydrated inside `contenteditable`, replacing a node ProseMirror
  holds.
- C (Vue): every controller-bearing converted component re-checks its connection on every
  mutation batch in the document, so typing in the editor costs every such component on the page.
- C (Vue): converted styles are `<style scoped>`. Vue adds its scope attribute to each
  selector's last compound, and ProseMirror's own nodes never carry it, so the editor's
  `.ProseMirror p` rules do not apply in the Vue output. Svelte's output uses `:global()` and is
  unaffected.
- Example: `<div $ref="mount" foreign></div>` (spelling to be decided) should mean the runtime
  never patches, observes, or lowers inside it, and converters keep the component's styles
  reaching it (`:deep()` in Vue). Fallback without a change: a shadow root on the mount hides it
  from the observer, at the cost of shipping styles into the shadow root and ProseMirror's
  shadow-DOM selection quirks.

### 2. Controller lifecycle (P, R, C)

- The controller function runs once per instance; per-connection work belongs in
  `host.on("connect")`. A value returned by the controller itself is a one-shot cleanup at the
  first disconnect and is not re-armed; the proposal does not specify it at all.
- The editor must keep its `EditorState` in the controller's closure and rebuild the
  `EditorView` on each connect, or moving the editor between tasks (a reconnect) loses the
  document and undo history. The proposal's chart example creates its library in the controller
  body and destroys it on disconnect, the pattern that breaks here; the `map ??=` example is the
  right one.
- First-effect timing differs: synchronous in the DOM runtimes, deferred (`flush: "post"`) in
  Vue. The controller must not depend on either.
- Spec and runtime disagree: `on:connect`/`on:disconnect` are specified but rejected by the
  parser; the host reference box lists members the interface does not.
- Controllers may be async and use literal `import()`; lazy Tiptap and grammar loading fit, and
  demand-driven loading tied to state remains open in the proposal.

### 3. Events out (P, C)

- Vue: converted components emit the `CustomEvent`, not its detail. Today's Vue listeners receive
  the payload, so every emit changes shape for Vue consumers at the switch (D2).
- React: generated props are `HTMLAttributes` plus an index signature, with no typed callback
  props; consumers attach listeners through a ref. Svelte gets typed `on<name>` props.
- `host.dispatch` validates the detail against its declaration on every dispatch and throws
  `HR002` on a mismatch. A `change` event carrying the whole document re-validates it on every
  edit unless the field is untyped, which a declared payload field cannot be.
- Example: `<event name="selection-action">` with `id`, `from`, `to`, `text`, `before`, `after`
  works today; `<event name="change">` with a ProseMirror document needs a cheap validation path
  for large structured payloads.

### 4. Two-way content binding (P, R, C)

- P: there is no model declaration; two-way binding is a bindable prop plus a change event, and
  feedback loops are listed as unsolved.
- R: `bind:` on a component root listens for native `input`/`change` and reads a form-control
  value, so `bind:content` on the editor cannot work; consumers write `from:content` plus
  `on:change` and a `<set>`.
- A: every explicitly passed prop is serialized into a `data-<name>` attribute on the root and
  re-serialized on each change (the Vue output uses `JSON.stringify`), and the rendered form
  embeds props for hydration. A document of a few hundred kilobytes would be rewritten into an
  attribute on every keystroke.
- Types: bare `type="object"` is `record(unknown)` and fails `HC017`; the document needs an open
  object type such as `object({ type: string, ... })`, written in HTML Next object syntax rather
  than JSON in markup.
- No echo guard: through Vue proxies, identity checks fail, so the session keeps a deep-equality
  or version check, as `sameDocument` does today.
- Example: a `content` prop declared as model and not reflected (spelling to be decided), so
  `bind:content` works in HTML Next, `v-model:content` in Vue, `value`/`onChange` in React, and
  `bind:content` in Svelte, with the document never written to an attribute.

### 5. Slots for toolbars (P, R, C)

- Slots project app-supplied buttons, and scoped slots can pass state back. But `host.slots` is
  not reactive (the controller needs its own observer), the Vue `host.slots` path has no test,
  and active state ("bold is on") reaches slotted buttons only through a template-only scoped
  slot that re-renders.
- The proposal forbids a controller from querying projected content; `ui-editor-toolbar`'s
  roving tabindex does exactly that today. The conformant route is delegation checked against
  `host.slots`.
- Example: `<button slot="toolbar-end" command="--insert-snippet">` should reach the editor
  through invoker commands (custom `--` commands are an inference from the proposal's invoker
  section, not a stated feature), and a scoped `toolbar` slot should receive `{ active }`.

### 6. Top-layer menus (P, R)

- P: `<portal>` is Level 2 and unimplemented; nothing covers anchoring or CSS anchor
  positioning. Invoker commands cover only opening.
- Looma's overlay layer already works within HTML Next: a component promotes its own root to the
  top layer (`popover="manual"`), so the DOM never moves and scoping and event bubbling stay
  intact; positioning is JavaScript, aware of the visual viewport.
- The editor needs anchors that are not elements (a caret position, a table rectangle). The slash
  and mention menus already take `anchorRect`; the other parts need the same.
- Instance ids for ARIA relationships (`aria-controls`, `aria-activedescendant`) cannot come from
  the template, because lowering must be deterministic; the controller writes them.
- Example: the formatting toolbar as `<ui-editor-toolbar floating from:open="$toolbarOpen"
  from:anchor-rect="$selectionRect">` in the editor's template, outside the mount.

### 7. Imperative API (P, C)

There are no component methods: `<method>` is unsupported, and page code cannot reach `host`.
Today's consumers call `focus("end")` and read the Tiptap `Editor` from `ready` or `expose`.
Example need: an application focuses the editor after inserting a template, or runs a Tiptap
command from its own UI. Options: declared methods mapped to each target's ref API, or invoker
commands with arguments.

### 8. Imperative child components, for node views (P, R, C)

ProseMirror node views create DOM imperatively, but HTML Next has no target-neutral way for a
controller to instantiate a child component and update its props. The live observer replaces an
inserted element when it lowers it, which breaks ProseMirror's reference; vanilla factories exist,
but their prop update (`updateComponentProps`) is documented as not a page-authoring API; the Vue
output has no lowering at all. Example: the image node view needs `ui-image` with `resizable`,
`selected`, and `placement` updated on selection, and a `resize` commit back. A host API such as
`host.create("ui-image", props)` returning `{ element, update(props), destroy() }`, implemented by
each target's host shim from the component graph the definition already declares, would cover
image, separator, disclosure, table of contents, and mention chips.

### 9. Function and object inputs (P)

`isAttributeType` rejects `function`, `unknown`, and `event` as prop types: every prop must have a
text form. Seven LoomaEditor props are functions or live objects. Request and response through
events (a `mention-query` event whose detail carries `query` and a `respond` callback) covers
providers and uploaders if event payloads may hold functions; `extensions` (Tiptap extension
objects) has no declarative form at all. Example need: an application adds its own Tiptap
extension, or supplies mentions from a server. Decision D3: functions are not passed; the
replacement is a controller-hook design, settled in the proposal first.

### 10. Server rendering and pages without JavaScript (P, R)

Controllers never run on the server, so a server-rendered editor would be its template without a
document. Markupress pages must render with JavaScript off. The document body can be rendered
statically from JSON (`LoomaCompactContent` already does this for the compact editor), but it then
sits inside the foreign mount, and hydration must adopt it and hand it to the controller.
Explicit prop recovery and the hydration format are still open in the proposal's rendered-form
section.

### Already known

- Vue output drops ancestor-prefixed `:host` rules on `1.0.0-alpha.41` (#324's blocker). It
  affects the editor's `.looma-editor__sticky-toolbar-shell :host` reset and the table toolbar's
  mobile shell rule.
- Converted Vue marks component roots with the tag as a class instead of `data-component`, so
  `[data-component~="ui-editor-surface"] .ProseMirror` rules match only on older releases.

## 4. Steps

Each step is one pull request that ships on its own and leaves the Vue editor working. Steps 3–6
change the Vue editor's internals only and must keep every editor test passing with no reference
changes unless a step says otherwise.

| # | Step | Ships | Depends on |
| --- | --- | --- | --- |
| 0 | Bring Looma to current HTML Next (in progress separately: Looma moves directly to `1.0.0-alpha.48`) | build on current HTML Next | — |
| 1 | This plan | review | — |
| 2 | Move framework-neutral helpers out of `LoomaEditor.ts` and `src/vue/editor` into `src/editor`: link and shortcut helpers, table and anchor geometry, `sameDocument`, `image-delivery.ts`, `code-language-catalog.ts` and the grammar loader; unit tests for each | smaller Vue file, neutral modules | — |
| 3 | `createEditorSession()` in `src/editor/session`: vanilla `@tiptap/core` `Editor`, mount and remount, content sync with echo guard, commands, snapshot and `subscribe()`; LoomaEditor replaces `useEditor`/`EditorContent` with it | session API, unit and browser tests | 2 |
| 4 | Replace `BubbleMenu`/tippy with Looma's overlay layer for the formatting toolbar, link card, and image actions, placed from session rectangles; put the table overlay in the top layer; register all of them on the shared dismissal stack | overlay contract met; tippy.js dropped | 3 |
| 5 | New parts, one or two per PR: link card, link form, chip editor, image controls, code-language picker, block actions; LoomaEditor composes their generated Vue wrappers | new components with examples, API docs, docs coverage entries, visual references | 3 |
| 6 | Move the rest of the editor's behavior into the session (link state machine, block and table actions, mobile dock, held press, uploads, chips, hover, host actions) until `LoomaEditor.ts` only maps props, events, and session state | thin Vue editor | 3–5 |
| 7 | Node views without Vue apps, built on HTML Next's child-component API (or a decided interim) | DOM node views for image, separator, expand, table of contents | 6, gap 8 |
| 8 | `ui-editor` HTML Next definition and controller over the session, marked experimental; HTML and vanilla examples; docs page; HTML-target browser tests for the core flows | DOM and generated Vue editor, experimental | 6, 7; gaps 1, 2, 4 settled in the proposal; the D3 design |
| 9 | Parity: run the editor suites against the generated Vue editor and the DOM editor (see §5); fix gaps in Looma or upstream until the ledger is clean | parity ledger, all suites on three mounts | 8 |
| 10 | Switch `@threadlabs/looma/vue/editor` to the generated component as a breaking minor with migration notes (D2); delete the hand-written editor | one editor source | 9 |
| 11 | Publish generated React and Svelte editors from Looma (D5); Markupress stage 4 embeds `<ui-editor>` | framework parity; editor guide on Markupress | 10, gap 10 |

HTML Next work runs alongside: gaps 1, 4, 8, and 9 (the D3 design) block step 8, and gap 10 blocks step 11's
editor guide. The earliest upstream PRs are the foreign region (gap 1) and the Vue scoped-style
reach for controller-created DOM, because both are needed before a generated editor renders
correctly in Vue at all.

## 5. Parity test plan

The current editor tests are the parity contract. Framework-neutral unit tests are unaffected;
the browser suites gain a mount switch.

| Suite | Cases | Runner today | Parity treatment |
| --- | --- | --- | --- |
| `packages/looma/tests/editor-table.test.ts` | 56 | Playwright against a bundle of the built Vue package | `openEditor` already mounts through one bundle entry; parameterize it over Vue `LoomaEditor`, generated Vue editor, and DOM `<ui-editor>` |
| `packages/looma/tests/browser.test.ts` (editor cases) | about 17 | same harness | same switch for the LoomaEditor cases; component-part cases already cover HTML and Vue |
| `looma-editor-history.browser.test.ts` | 27 | vitest browser mode, imports the Vue source | add a mount factory per target |
| `looma-editor-selection-actions`, `-mention`, `-active-block`, `-chip` browser tests | 6, 4, 4, 2 | browser mode | same |
| `looma-editor-table-layout`, `mention-typing` browser tests | 5, 3 | browser mode, plain Tiptap | unchanged (no LoomaEditor) |
| `compact-editor.browser.test.ts` | 2 | browser mode | out of scope; the compact editor moves later (D6) |
| `editor-extensions`, `editor-expand`, `editor-table-of-contents`, `editor-slash-discovery`, `editor-image`, `compact-editor`, `relative-links` | 49, 7, 7, 7, 3, 1, 3 | jsdom or Node | unchanged; session gets its own unit tests in step 3 |
| `apps/docs/tests/interactive-guides.spec.ts`, `visual.spec.ts`, `release-docs.spec.ts` (editor cases) | 2, 1, 3 | docs Playwright, three engines | run against the docs build that uses each editor; visual references change only where a step says so |

- **Ledger**: a checked-in table of every case × mount (Vue, generated Vue, DOM) with status and
  linked issue. The switch (step 10) requires every case green on the generated Vue editor and
  every non-Vue-specific case green on the DOM editor.
- **API contract test**: a type-level test that maps every current prop and emit to its
  replacement (or to the documented removal), so step 10's migration notes cannot drift.
- **Repository guards**: `tools/scripts/editor-composition-policy.test.mjs`,
  `declarative-contracts.test.mjs`, the frozen geometry entries in
  `tools/style-source-allowlist.json`, and the smoke cases in `tools/scripts/ci-selection.mjs`
  move to the new sources as the code moves; their counts only shrink.
- **Performance**: typing latency and per-keystroke work (mutation-observer scans, attribute
  reflection) measured on the Vue editor before step 3 and on each mount at step 9; the generated
  editor may not be slower on a representative document.

## 6. Decisions and risks

### Decisions (owner, 2026-10-14)

- **D1. Tag and names.** The tag is `ui-editor`; the Vue export stays `LoomaEditor` through the
  build's naming map, which avoids a collision with Tiptap's `Editor`.
- **D2. Vue compatibility at the switch.** The switch ships as a breaking minor with migration
  notes. There is no hand-written compatibility layer.
- **D3. Function and object inputs.** Functions are not passed to the component. Extensions,
  providers, uploaders, and resolvers get a shape designed for HTML Next, such as controller
  hooks, settled in the proposal first. Steps that need them wait for that design.
- **D4. Where HTML Next changes land.** Proposal first: each language gap is settled in
  `nextwebwg/specs` before `nextwebwg/html-next` implements it.
- **D5. React and Svelte.** Looma publishes the generated React and Svelte editors.
- **D6. Compact editor.** `LoomaCompactEditor` moves later, after the main editor.

### Related work in progress

The shared block vocabulary that Markupress's plan asks for is in progress separately and does not
depend on step 8: `ui-callout` tones and title, `ui-tabs` group sync, the editor's callout
rendering `ui-callout`, and Markdown import and export. This plan does not schedule it.

### Risks

- **Upstream dependency.** Step 8 cannot start until gaps 1, 4, and 8 are settled in the proposal and the D3 design exists, and
  Looma is several HTML Next releases behind (`alpha.35` against `alpha.48`).
- **Per-keystroke cost.** Document-wide mutation observers, connection re-checks in converted Vue,
  and attribute reflection of the document all scale with typing. Without gaps 1 and 4 the
  generated editor would be measurably slower than today's.
- **Vue styling.** Until converted Vue styles reach controller-created DOM, the generated Vue
  editor renders unstyled content.
- **Behavior drift during extraction.** Steps 2–6 move about 1,000 lines of interaction logic.
  The editor suites gate each step, but some behavior (the 500 ms held press, tippy's flip and
  shift, the mobile dock) is covered by a handful of cases each.
- **Docs timeline.** Markupress stage 4 waits for step 11, the last step. If the editor guide must
  move sooner, it needs a decision on an interim (for example the DOM editor at step 8, marked
  experimental), since a Vue island is ruled out.
- **Existing editor docs** (`docs/editor-roadmap.md`, `docs/adapters.md`, `docs/architecture.md`)
  describe a framework-neutral editor that does not exist yet; update them as steps land rather
  than up front.
