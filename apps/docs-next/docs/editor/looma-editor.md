---
title: Turnkey editor
---

# Turnkey editor

`LoomaEditor` (from `@threadlabs/looma/vue/editor`) is a complete rich-text editor built from the
editor components in this section. The application passes content and editability, answers the
editor's [requests](#requests) for uploads, mentions, and links, and persists the document the editor emits; Looma owns the extensions,
formatting commands, selection and focus, and every editor control. See
[Getting started](/getting-started) for installation and a first example.

## Props

| Prop | Default | Purpose |
|---|---|---|
| `modelValue` | an empty document | The document, as Tiptap JSON. Use `v-model`. |
| `editable` | `true` | Whether the document can be edited. |
| `contentDensity` | `comfortable` | `compact` fits a read-only excerpt to its content without outer padding. Editable documents retain the standard canvas. |
| `placeholder` | `Type “/” for commands, or start writing…` | Shown in an empty document. |
| `label` | `Document` | The editing surface's accessible name. |
| `extensions` | none | Answers [`extensions`](#extensions): extra Tiptap extensions, added after Looma's own. |
| `slashCommands` | none | Answers [`slash-commands`](#slash-commands): the slash menu's commands, given the defaults. |
| `codeLanguages` | built-in catalog | Override the built-in code language list with application-owned grammars. Pass `{}` to disable syntax highlighting. |
| `mentionItems`, `mentionQuery`, `mentionLimit` | none, none, 8 | People to suggest after `@`: a fixed list, and the answer to [`mention-query`](#mention-query) that searches. |
| `linkSearch`, `linkResolve`, `linkTargetLabel` | none, none, `Item` | Answer [`link-search`](#link-search) and [`link-resolve`](#link-resolve): search host destinations for links and describe a saved destination from its `href`. |
| `fileUpload` | none | Answers `file-upload` with a retained file link. |
| `imageUpload` | none | Answers [`image-upload`](#image-upload): uploads a chosen, pasted, or dropped image and returns the image to insert. |
| `resolveImageAttributes` | none | Adjusts an image's attributes, such as a responsive `srcset`, before it renders. |
| `resolveImageSource` | none | Resolves a browser-only master URL for every image; stored content and event identities retain their original source. |
| `toolbarMode` | `bubble` | `bubble` shows the toolbar beside a selection; `sticky` keeps it pinned above the document; `popover` opens it from your own button (see [Opening the toolbar from your own button](#opening-the-toolbar-from-your-own-button)). |
| `toolbarTriggerId` | `""` | In `popover` mode, the ID of the button that toggles the toolbar and anchors it. |
| `toolbarOpen` | `false` | In `popover` mode, whether the toolbar is open. Bind it with `v-model:toolbar-open`. |
| `disableHighlight` | `false` | Authors can't highlight text. Highlights already in the document still show; see [Reserving highlight](#reserving-highlight). |

## Requests

The editor asks the application for what only the application knows: its uploads, its people, its
pages, and its own Tiptap extensions. Each of these is an
[HTML Next request](https://nextwebwg.org/declarative-components/javascript#requests). Answer it
with a function prop, which receives the request's detail and `{ signal, progress }` and returns the
answer, `null` for none, or a promise of either:

```vue
<LoomaEditor :mention-query="({ query, limit }, { signal }) => searchPeople(query, limit, signal)" />
```

The same request also arrives as an event: a `RequestEvent` that bubbles from the editor and is
answered with `event.respondWith(answer)`. Listen with Vue's event form, on an ancestor, or on the
document, where HTML Next's `RequestEvent.respond()` adds the listener and announces it. The nearest
responder answers: the function prop first, then the event form, then ancestors, then the document.
An application can set a default for every editor on `document` and override it for one editor.

```ts
import { RequestEvent } from "@nextwebwg/html-next";

const { respond } = RequestEvent;
const stop = respond(document, "image-upload", async ({ file }, { signal, progress }) => ({
  src: await upload(file, { signal, onProgress: progress }),
}));
```

`signal` aborts when the answer is no longer needed: the author typed another character, canceled
an upload, or the editor unmounted. Insert image and link search appear while the editor can see a
responder: its function prop, its event form, or one registered on an ancestor or the document with
`RequestEvent.respond()`, a component controller's `host.on`, or a framework component's function
prop, whether it arrived before or after the editor mounted. A plain `addEventListener` still answers
requests, including pasted and dropped images, but the editor cannot see it, so Insert image and
link search stay off for it; register with `RequestEvent.respond()` instead.

Each request's function prop is its name in camelCase: `image-upload` is `imageUpload`.

| Request | Detail | Answer |
|---|---|---|
| `extensions` | `null` | Tiptap extensions |
| `slash-commands` | `{ defaults }` | slash commands |
| `mention-query` | `{ query, limit }` | mention items |
| `link-search` | `{ query }` | link targets |
| `link-resolve` | `{ href }` | a link target |
| `image-upload` | `{ file }` | an image to insert |
| `file-upload` | `{ file }` | `{ href, name, size, contentType }` |

### extensions

The editor asks when it mounts, and again when a responder first appears. The answer's Tiptap
extensions are added after Looma's own. When the answer arrives after the editor was built, for example from a lazily imported module or a responder that appears later, the editor
rebuilds with them and keeps its document. A document nobody has edited yet is read again from
`modelValue`, so nodes and marks the new extensions define are kept.

```ts
import type { LoomaEditorExtensions } from "@threadlabs/looma/vue/editor";

const extensions: LoomaEditorExtensions = async () => [(await import("./footnote")).Footnote];
```

### slash-commands

The editor asks when it mounts, when the prop changes, and when image uploads become available. The
detail carries the editor's default commands. Return them changed or extended; `null` keeps the
defaults and an empty array offers no commands. See [Host commands](/editor#host-commands).

```ts
import type { LoomaEditorSlashCommands } from "@threadlabs/looma/vue/editor";

const slashCommands: LoomaEditorSlashCommands = ({ defaults }) => defaults.filter(({ id }) => id !== "table");
```

### mention-query

The editor asks as the author types after `@`. Answer with at most `limit` people for `query`. `null` falls back to `mentionItems`, and a rejection
shows an empty menu. Each new character aborts the previous query's `signal`.

```ts
import type { LoomaMentionQuery } from "@threadlabs/looma/vue/editor";

const mentionQuery: LoomaMentionQuery = async ({ query, limit }, { signal }) =>
  (await fetch(`/api/people?q=${encodeURIComponent(query)}&limit=${limit}`, { signal })).json();
```

### link-search

The editor asks as the author types in the link field. Answer with destinations matching `query`, each with `id`, `label`, `href`, and optional `detail`.
With a responder the link field searches; without one it asks for a URL. A rejection shows a
retryable search error.

```ts
import type { LoomaLinkSearch } from "@threadlabs/looma/vue/editor";

const linkSearch: LoomaLinkSearch = async ({ query }, { signal }) =>
  (await fetch(`/api/pages?q=${encodeURIComponent(query)}`, { signal })).json();
```

### link-resolve

The editor asks when a saved link shows its card. Answer with the current destination for its `href`, or `null`, so a renamed page shows its new
name in the link card. The saved `href` never changes.

```ts
import type { LoomaLinkResolve } from "@threadlabs/looma/vue/editor";

const linkResolve: LoomaLinkResolve = ({ href }) => pagesByHref.get(href) ?? null;
```

### image-upload

The editor asks for each chosen, pasted, or dropped image. Upload `file` and answer with the image to
insert, `{ src, alt?, width?, height?, responsive? }`, or `null` to insert nothing. The editor shows the
upload's progress from `progress(loaded, total)` with a **Cancel** button, which aborts `signal`. A
rejection leaves the document unchanged, shows **Retry**, and emits `uploadError`; a canceled upload
reports nothing.

```ts
import type { LoomaImageUploader } from "@threadlabs/looma/vue/editor";

const imageUpload: LoomaImageUploader = ({ file }, { signal, progress }) => new Promise((resolve, reject) => {
  const request = new XMLHttpRequest();
  request.open("POST", "/api/images");
  request.upload.onprogress = (event) => progress(event.loaded, event.total);
  request.onload = () => resolve({ src: JSON.parse(request.responseText).url, alt: file.name });
  request.onerror = () => reject(new Error("Upload failed"));
  signal.addEventListener("abort", () => request.abort());
  request.send(file);
});
```

### file-upload

Answer `fileUpload` with the retained file's `{ href, name, size, contentType }`,
or `null` to insert nothing. The application owns storage, access and size limits.
**File attachment** in the insertion menu and **Attach file** in the toolbar open
the file picker when a responder is available. Looma inserts the filename as an
ordinary link, followed by its type and byte-size label. The caret is mapped
through intervening edits while transport runs. Cancel or unmount prevents a
late answer from inserting; rejection emits `uploadError` and keeps the document.

## Toolbar

Markdown typing conversions are separate undo steps. Undo restores the complete
literal source; Redo reapplies its formatting. Escape immediately after a
conversion also restores the literal source when no menu is open. Typing or
moving the caret ends that Escape cancellation opportunity. Open menus retain
their usual Escape dismissal.

The toolbar is always one row, in four groups. When it is wider than the space it has, the row scrolls sideways instead of wrapping, and each edge that hides controls fades into the toolbar's colour:

- **Text:** Bold, Italic, Underline, Strike, Highlight, Inline code, Link.
- **Blocks:** Heading 1–3, Bullet list, Numbered list, Blockquote, Code block, Block actions.
- **Insert:** Table (opens the size grid), Image.
- **History:** Undo, Redo.

A mark or block that applies to the selection is shown as active: a tint and an inset edge in the
accent, with `aria-pressed="true"`, never a solid fill. On a narrow screen the toolbar docks to the
bottom of the viewport. Its buttons follow the [Toolbar](/editor/ui-editor-toolbar) tokens, plus
`--ui-editor-toolbar-button-size`, `--ui-editor-toolbar-button-radius`,
`--ui-editor-toolbar-icon-size`, and the active-state `--ui-editor-toolbar-active-surface`,
`--ui-editor-toolbar-active-text`, and `--ui-editor-toolbar-active-border`.

### Opening the toolbar from your own button

Set `toolbar-mode="popover"` when the page already has a place for tools, such as a page bar. Give
the editor the ID of your button: clicking it opens the full toolbar in a popover anchored there, and
clicking again, pressing Escape, or clicking elsewhere closes it. The button needs no click handler.
Selecting text still shows a small bubble with the text controls (Bold through Inline code).

```vue
<IconButton id="formatting" label="Formatting">…</IconButton>
<LoomaEditor toolbar-mode="popover" toolbar-trigger-id="formatting" v-model:toolbar-open="formattingOpen" />
```

### Reserving highlight

Set `disable-highlight` when the application uses highlighting for its own purposes, such as
marking what changed, and an author's highlight would be mistaken for it. The editor then offers
no Highlight button, `Mod-Shift-H` does nothing, typing or pasting `==text==` stays plain text,
and pasted HTML `<mark>` keeps its text without the highlight. Highlights already stored in the
document's JSON still load and render as `<mark>`; the mark stays in the schema because removing
it would make the editor discard any document that uses it. The setting is read when the editor
is created. Outside `LoomaEditor`, pass `disableHighlight: true` to
`getDefaultEditorExtensions`.

### Code block syntax

Code blocks keep their language in the document, whether or not a matching grammar is loaded.
The searchable picker offers every bundled Highlight.js grammar. An explicitly chosen language
loads only its own grammar when needed. **Auto** compares 20 common languages (Bash, C, C++, C#,
CSS, Go, HTML, Java, JavaScript, JSON, Kotlin, Markdown, PHP, Python, Ruby, Rust, SQL, Swift,
TypeScript, and YAML) when its code block has text. Documents without code do not download the
grammars. HTML uses Highlight.js's XML grammar under the name `html`.

An application can replace that list with its own grammars by passing `codeLanguages` when the
editor is created:

```ts
import sql from 'highlight.js/lib/languages/sql'

const codeLanguages = { sql }
```

```vue
<LoomaEditor :code-languages="codeLanguages" />
```

Install `highlight.js` in the application that imports a grammar. The example offers only SQL;
pass an empty object to keep code blocks plain. For a headless editor,
`getDefaultEditorExtensions({ codeLanguages })` takes an explicit grammar map. Untagged code blocks
can be detected from the registered languages.
Paste SQL into a code block to keep it as code. Plain text pasted into a paragraph stays prose.
While the cursor is in an editable code block, a language selector floats above it, like the table
toolbar, when languages are available. **Auto** shows the detected language; choosing a language saves that choice with the
document. Choose **Auto** again to resume detection. Type three backticks at the start of an empty
paragraph to create a code block and place the cursor inside it.
Token colors use the theme's semantic text colors and can be overridden with
`--ui-editor-code-keyword`, `--ui-editor-code-string`, `--ui-editor-code-number`,
`--ui-editor-code-name`, and `--ui-editor-code-comment`.

### Links

Select text and choose **Link** to add one. Click or tap an existing link to place the caret and
show nearby **Open link**, Edit, and Remove actions above it. Press Escape to dismiss the bar.
Hold Command on macOS or Control on other computers while hovering over a link to see a pointer
cursor, then click to open its destination in a new tab. Ordinary clicks keep editing.
The mobile toolbar's **Link** button also edits the link at the caret.
With no selection, the form also asks for link text. It accepts `http:`, `https:`, `mailto:`,
`tel:`, and relative URLs beginning with `/`, `#`, or `?`; other schemes are rejected before the
document changes. The **Open link** action opens separately with `noopener noreferrer`. The **Open in new tab**
choice updates the link's `target` and `rel` attributes directly. Valid destination and text
changes apply immediately without moving focus from the field. There is no Save or Cancel footer;
press Enter or Escape, or click outside, to close the popup. Incomplete or invalid URL entry leaves
the last valid link intact. Open and Remove stay in the nearby link actions.

The form follows the same theme layers as the rest of Looma: its surface, border, radius and shadow
read inherited `--ui-overlay-*` values; its input radius reads `--ui-field-radius`; its invalid
message reads `--ui-field-danger`. Set those on the editor's container for a local treatment.

### Block actions

Place the caret in a block and choose **Block actions** to insert a paragraph after it, duplicate
it, or delete it. The menu acts on the top-level block even when the caret sits in a nested list or
table cell. Deleting the only block leaves an empty paragraph to continue writing. The same menu
works in the mobile toolbar; its trigger and items follow native button and menu keyboard behavior.
Block type changes remain in the adjacent heading, list, quote, and code commands, and the slash
menu provides insertion choices. This keeps block actions reachable without a hover-only gutter.

## Slash menu

Typing `/` opens the [slash menu](/editor/ui-editor-slash-menu), which inserts headings,
Info, Note, and Warning callouts, bullet, numbered, and checklist lists, blockquote, a clickable
inline chip, footnote, inline and block code, table, divider, and image. Markdown-style typing works too:
`#` for headings, `-` for bullets, `[ ]` for a checklist, and `---` for a divider.

**Chip** inserts an inline label without splitting its paragraph. Choosing `/chip` opens a focused
popover: enter the label and choose neutral, blue, green, yellow, red, or purple. Click the chip to
reopen that popover. The headless `editor.commands.insertLoomaChip()` command turns selected words
into one chip or inserts an empty one at the caret. Chips are atomic editor nodes stored as semantic
`<span data-looma-chip data-label="…" data-color="…">…</span>` elements, so their labels survive
HTML and plain-text copy. Their borders sit between the soft fill and the stronger theme tone;
hosts can override surface, border, text, and font size with `--ui-editor-chip-*`
tokens. Plain pasted HTML spans do not turn into chips.

**Footnote** inserts a numbered reference at the caret and an empty note at the end of the
document, and moves the caret into the note (`editor.commands.insertLoomaFootnote()`, or
<kbd>Mod</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd>). Typing or pasting `[^label]` makes a reference too, with a
note for a new label. Notes are numbered by first reference and kept in that order on every edit;
deleting a note's last reference removes the note. Click a reference to open its
[footnote editor](/editor/ui-editor-footnote-editor): it shows the note, edits a note of plain
text in place, and renames the label on the note and every reference to it. **Go to note** moves the
caret to the end of the note, and <kbd>Mod</kbd>+<kbd>Alt</kbd>+<kbd>N</kbd> moves between a
reference and its note (`editor.commands.goToLoomaFootnote()`). The saved HTML is the HTML Looma
Markdown renders for the same document.

## Pasting documents

Looma detects recognizable Markdown and HTML copied as source, including source wrapped in a
clipboard code block, and turns supported headings, lists, links, tables, and code blocks into
editable nodes. Pasting inside an existing code block stays literal. When a clipboard already
contains recognizable formatted HTML, Looma keeps that formatting even if the plain-text copy happens to begin
with a Markdown marker. Content copied from another editor page keeps its native structure.

## Active-block marker

While the editor has focus, a thin line in the margin marks the top-level block being edited, so
you can find your place without a border or fill around the text. It is deliberately quiet:

- It steps aside while you type and returns once typing pauses (`LOOMA_ACTIVE_BLOCK_TYPING_IDLE_MS`,
  800 ms).
- Focus moving to the editor's own toolbar or menus, or leaving and coming straight back, does not
  remove it; it goes only once focus has stayed away for `LOOMA_ACTIVE_BLOCK_BLUR_GRACE_MS` (200 ms).
- It fades in rather than snapping on, and appears instantly under reduced motion.

| Token | Default | Purpose |
|---|---|---|
| `--ui-editor-active-block-color` | `--ui-border` | The line's colour. |
| `--ui-editor-active-block-width` | `1px` | The line's width. |
| `--ui-editor-active-block-offset` | `--ui-space-3` | Its distance into the gutter from the text. |

The line sits outside the content box, so a consumer that sets
`--ui-editor-content-padding-inline` to `0` must leave it room on its own wrapper. The marker comes
from the `LoomaActiveBlock` extension in `@threadlabs/looma/editor/extensions`, which adds the
`looma-active-block` class to the block and nothing else.


## Passage actions and compact formatting

`compactToolbar` is opt-in. On desktop it keeps Bold, Italic and Link beside
Format, which exposes the existing complete formatting inventory. The narrow
editing dock retains its formatting controls.

`selectionActions` accepts `{ id, label }` commands owned by the application.
They appear only for a nonempty text selection, before formatting in the narrow
dock. Read-only selections expose the actions without exposing edit controls.
`selectionAction` emits `{ id, from, to, text, before, after }`, captured before
the host moves focus. These actions never mutate the document. The host owns
permissions, durable annotation identity, panels and return navigation; positions
are from the current editor snapshot, not a lasting anchor.

`rangeActions` accepts `{ id, label, from, to }` actions for a collapsed text
caret. Clicking inside a matching range opens the contextual toolbar, including
in read-only documents; narrow viewports use the existing editing dock. Actions
with the same ID share one button. `rangeAction` emits `{ id, ranges }`, with
unique matching `{ from, to }` pairs captured before focus moves. Invalid or
out-of-document ranges are ignored. The host recalculates these ephemeral
positions after content changes and owns annotation persistence and paint.
