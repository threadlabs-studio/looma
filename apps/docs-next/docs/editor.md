---
id: editor
title: Editor
outline: false
sidebar: false
---

<link rel="component" href="@/app/components/looma-editor-guide.html">

<header class="looma-catalog-heading">
  <p class="looma-eyebrow">Rich text</p>
  <h1>Editor</h1>
  <p>A ready-to-use writing surface with formatting, slash commands, mentions, tables, and image support. Start with the complete editor; configure its capabilities through props and callbacks.</p>
</header>

[Editor API reference](/editor/looma-editor/)

## Try the editor

<looma-editor-guide></looma-editor-guide>

Scroll inside the sample to see the always-visible toolbar stay at the top, or switch to
**Beside selection** and select text to see formatting appear nearby. Type `/` to insert a block
or `@` to mention a teammate. Edits here last only until you leave the page.

## Footnotes

Type `/footnote` to add a reference and open its floating rich-text editor. The
document numbers references automatically. Notes can contain formatting and more
than one paragraph; edits update the document as you type.

Select an existing reference to open its one-line actions: **Go to note** and
**Edit note**. Click outside the editor or press Escape to close it. There is no
separate Done action.

## Add it to a Vue app

Install Looma and the editor peers, import the theme and Vue component styles, then use
`LoomaEditor` with `v-model`:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { LoomaEditor } from "@threadlabs/looma/vue/editor";
import "@threadlabs/looma/tokens.css";
import "@threadlabs/looma/theme-light.css";
import "@threadlabs/looma/vue.css";

const document = ref({ type: "doc", content: [] });
</script>

<template>
  <LoomaEditor v-model="document" label="Article body" />
</template>
```

The value is Tiptap JSON. The app owns saving, loading, and collaboration; the editor emits a
new document on each change. [Getting started](/getting-started) includes installation and a
first integration.

## Formatting and toolbar

Select text for bold, italic, underline, strike, highlight, inline code, and links. The editor
also supports headings, lists, quotes, code blocks, tables, images, undo, and redo. Set
`toolbarMode="sticky"` to keep the toolbar above the document, `popover` to open it from your own
button, `contextual` for the full command set beside a selection or held-press caret, or use the default `bubble` mode beside a selection. Floating desktop tools stay quiet until text is selected (including Select All) or a primary pointer press is held for 500ms. Escape dismisses the current toolbar; moving the caret dismisses held-press tools. Link and table pickers keep their toolbar anchor while you edit. Small viewports retain the editing dock. Contextual controls stay within the document area and flip below the first paragraph when there is no room above it. On narrow screens the toolbar docks at the bottom and scrolls sideways when
its controls do not fit.

Contextual formatting hides while slash-command or mention suggestions are active, then returns when the writer resumes editing.

## Slash commands and blocks

Type `/` for headings, callouts, lists, a quote, code, a divider, a table, or a collapsible
section. Image appears when the editor has an [image uploader](/editor/looma-editor#image-upload). Keep typing to narrow the grouped menu;
use arrow keys and Enter to choose. Exact names and aliases rank ahead of partial matches;
`/callout` puts callouts before the quote alias. An unmatched query shows **No commands found**
and remains in the document until you edit it or choose a command. Escape dismisses suggestions.
Literal code never opens slash suggestions. The **Chip** command inserts an
inline label without splitting the paragraph; `/status` is an alias for the same command. Choose
its text and tone in the popover, then click the chip to edit it. Markdown-style shortcuts also work: `#` for headings, `-` for a bullet list,
`[ ]` for a checklist, and `---` for a divider.

Callouts have one command per tone: **Info**, **Note**, **Tip**, **Important**, **Warning** and
**Danger**. Each wraps the current block in a callout drawn by the Callout component, and choosing
another tone inside a callout changes its tone. The editor saves callouts as `<ui-callout>`, so
they look the same in any page that uses Looma. Content saved earlier as
`<aside data-looma-callout>` still loads.

Block actions can insert a paragraph after the current block, duplicate it, or delete it.

### Host commands

Pass `slashCommands` to answer the editor's [`slash-commands`](/editor/looma-editor#slash-commands)
request. It receives fresh defaults and returns the inventory to use; an empty array offers no
commands and `null` keeps the defaults:

```ts
import type { LoomaEditorSlashCommands } from "@threadlabs/looma/vue/editor";

const slashCommands: LoomaEditorSlashCommands = ({ defaults }) => [
  ...defaults,
  {
    id: "host-reference",
    group: "Host content",
    title: "Reference",
    description: "Insert a reference label",
    icon: "tag",
    keywords: ["reference", "ref"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent("Reference: ").run();
    },
  },
];
```

Use a unique `id` for each command, especially when titles repeat. `group` is optional, so
existing headless command objects keep working. Each command owns removal of the supplied
range. Supply a pure `isAvailable({ editor, range })` predicate to omit a command when a host
capability or editing context is unavailable; Looma checks it again before execution.
A new function whose answer is a different inventory dismisses the open menu and keeps the typed
query intact; one that answers the same commands leaves the menu open, so an inline function is safe.
Return new arrays rather than mutating one in place.

Use this extension point for document templates, snippets, decision outlines, and date macros.
The application owns its catalog, preview or date picker, and the text it inserts. A template
uses ordinary editor nodes; validate a fresh copy with `editor.schema.nodeFromJSON` and
`check()` before removing the command range. Keep an asynchronous picker's insertion range
mapped through edits, and cancel its pending result when that range is no longer valid.

For example, a host can add a **Today** command whose value is fixed when selected:

```ts
{
  id: "today",
  title: "Today",
  description: "Insert today's date",
  icon: "tag",
  keywords: ["today", "date"],
  command: ({ editor, range }) => {
    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    editor.chain().focus().deleteRange(range).insertContent(date).run();
  },
}
```

This writes the local calendar date as unambiguous `YYYY-MM-DD` text. A host date picker can
insert its chosen date in the same format. No live date node, reminder, or scheduling state is
created.

Headless consumers use `createLoomaSlashCommandExtension({ commands, onStateChange })` and
`filterLoomaSlashCommands`. Menu snapshots supply `select(index)` and `highlight(index)`;
replace snapshots and discard old callbacks after updates. Call
`editor.commands.dismissLoomaSlashMenu()` to dismiss without deleting the query.
Default Link and Image commands require their picker callbacks. Default structural commands
are omitted when the current editor schema or insertion context cannot apply them.

## Collapsible sections

Type `/expand`, `/toggle`, or `/details` to insert an independent section. The caret starts in
its body, which accepts ordinary blocks such as lists, code, and tables. Use **Section settings**
to edit the summary and **Initially expanded**, then **Save**; **Cancel** discards the draft.
Press Cmd+Enter (Ctrl+Enter on other platforms) in the body to create a paragraph after the
innermost section and continue writing. On phones, use **Block actions → Insert paragraph below**
to continue after the section through the existing toolbar.

Authors start with sections expanded. Readers start with the saved default and toggle through
the shared Disclosure control by keyboard or touch. Reader toggles do not change the document
or its saved default. TOC links reveal enclosing sections before scrolling to and focusing a
heading. Hosts can `await revealLoomaExpandAt(editor, position)` before their own navigation.

The `loomaExpand` node stores `{ summary, open }` plus ordinary block content. JSON and HTML
round-trip that content; HTML exports semantic `details`/`summary`. Headless editors can insert
with `insertLoomaExpand({ summary: "Details", open: false })`, leave with `exitLoomaExpand()`,
and supply `expandNodeView` to customize presentation. The default headless view uses native
details. Plain text includes summaries and all bodies, even while collapsed.

In Markdown, a section is `::: details [Summary]` … `:::`, with ` {open}` after the summary when it
starts expanded. Search and change-review projections
must traverse the body rather than omit collapsed content.

## Automatic table of contents

Type `/toc` (or `/contents`) to insert links to headings throughout the document. The list updates
when headings change, move, or disappear; headings inside another TOC are excluded. There is no
content wrapper or manual heading selection.
Open **Table of contents settings** to choose plain, bulleted, or numbered formatting and the
maximum heading level (H1, H2, or H3), then **Save**. **Cancel** discards those choices. The default
is plain formatting through H3. With no headings, the block explains how to populate it.

Read-only editors show the same navigation without settings. Activating an entry scrolls to and
focuses its heading without opening link editing.

The `loomaTableOfContents` node stores only `{ format, depth }`. When a TOC is present, every
heading has an ID: an ID derived from
the heading's text follows the text as it changes, a custom ID stays with its heading through
renames and moves, and duplicate IDs are repaired. Both the node and heading IDs round-trip through
editor JSON, HTML and Markdown. `editor.getHTML()` includes the current
entries as a named navigation landmark with real links.

For Expressive Markdown, call `editorDocumentToMarkdown(editor.getJSON())` from
`@threadlabs/looma/editor/expressmark`. It writes the current TOC entries and settings into the
file. Reading that file preserves the saved navigation instead of regenerating it from surrounding
headings. The editor's internal JSON can retain configuration only; it does not need an entry copy.
Authored navigation imported from a file retains its body.

Headless editors using `getDefaultEditorExtensions` get the schema and a navigation node view;
they can set choices with `insertLoomaTableOfContents({ format: "numbered", depth: 2 })` or supply
`tableOfContentsNodeView` for their own settings composition. Turnkey Vue editors already supply
settings built with shared FormField, Button, Menu, and Popover controls.

For search, Markdown, plain text, or change-review projections, hosts can import
`getTableOfContentsEntries` and `normalizeTableOfContentsConfig` from `@threadlabs/looma/editor`.
The entry helper accepts a ProseMirror document and maximum heading level and returns current
heading labels, IDs, levels, nesting depths, and positions. Use a linked list for Markdown or
heading labels for plain text. A schema-only serializer such as Tiptap's `generateHTML` lacks
whole-document context and emits a configuration placeholder for the TOC; use `editor.getHTML()`
or derive entries in a document-aware host renderer when exporting complete navigation.

Hosts should qualify their import/export, indexing, and review projections for this new node
before enabling it in stored documents.

## Code blocks

Code blocks retain their language in the document. The searchable language picker offers every
bundled Highlight.js grammar, including HTML, JavaScript, TypeScript, CSS, JSON, Python, SQL, and
Bash. An explicit choice loads only its grammar on demand. **Auto** uses 20 common grammars when
code is present to keep detection light. Pass
`codeLanguages` to replace the list with your own grammars, or
`{}` for plain code blocks. Headless editors pass grammars to `getDefaultEditorExtensions`.
Untyped code blocks can be detected from the registered languages.
While the cursor is in an editable code block, an **Auto** language control floats above it; choose a language to save an explicit
choice with the document. Type three backticks at the start of an empty paragraph to create a
code block and continue typing inside it.

## Pasting documents

Pasting formatted HTML keeps its headings and inline formatting, even when the clipboard's plain
text resembles Markdown. Looma also turns Markdown or HTML copied as source into editable blocks,
including `:::` callouts and sections and GitHub `> [!NOTE]` alerts. Pasting inside a code block
stays literal.

Use the portable Expressmark adapter for Markdown import and export:

```ts
import { editorDocumentToMarkdown, markdownToEditorDocument } from "@threadlabs/looma/editor/expressmark";

const markdown = editorDocumentToMarkdown(editor.getJSON(), { syntax: "standard" });
const content = markdownToEditorDocument(markdown, { syntax: "standard" });
editor.commands.setContent(content);
```

The adapter defaults to `compatible` syntax for existing CommonMark/GFM interchange;
select `standard` explicitly when exchanging content with Markupress. It reports content the
editor schema cannot preserve instead of silently discarding it. Keep page front matter in
the host application. The older `loomaMarkdownToHtml` and `loomaMarkdownFromDoc` helpers retain
their editor-specific format; they do not define Markupress's documentation syntax.

## Mentions

Pass `mentionItems` for a short known list, as in the playground, or answer the
[`mention-query`](/editor/looma-editor#mention-query) request with `mentionQuery` for a directory
search. Each item needs a stable `id` and visible `label`; `detail` and `initials` are
optional display hints. `mentionLimit` defaults to 8. The editor stores the ID and label in the
document, while the application owns directory lookup and identity.

Suggestions open only when someone types `@` where a mention can go. `@` text that was pasted or
loaded, or that someone clicks into later, stays plain and starts no search, and so does `@` in
inline code or a code block.

```vue
<LoomaEditor
  v-model="document"
  :mention-items="[
    { id: 'ada', label: 'Ada Lovelace', detail: 'Design', initials: 'AL' },
    { id: 'grace', label: 'Grace Hopper', detail: 'Engineering', initials: 'GH' }
  ]"
/>
```

## Tables

Choose **Table** from the toolbar or slash menu, then pick dimensions in the grid. Once a cell
is selected, row and column handles and the table toolbar expose the actions that are valid for
that selection: add, delete, move, merge, split, alignment, and header rows or columns. Keyboard
users can reach the same controls. The editor updates the document; consumers do not need to
wire a separate table menu.

## Images and links

Answer the `file-upload` request with `fileUpload` to enable **Attach file**, `/file`, and
`/attachment`. It receives `{ file }` plus `signal` and `progress` callbacks, and returns
`{ href, name, size, contentType }` or `null`. The host retains the file and owns permissions
and its durable download URL. The editor stores an ordinary link followed by its MIME type
and size. JSON, HTML, and Markdown retain its destination. `editor.getText()` returns its name
and metadata; applications that need URLs in plain-text exports can project the saved link marks
or use the Markdown export.

The editor shows upload progress and **Cancel**. Failure leaves authored content intact and
offers **Retry** and **Dismiss**, while still emitting `uploadError`. Retry keeps the insertion
point mapped through edits instead of following a newly moved caret. Removing that insertion
point cancels the pending result. Cancel or dismiss drops the pending file. A successful insertion
is one undo step, separate from intervening typing.

Answer the [`image-upload`](/editor/looma-editor#image-upload) request with `imageUpload` to
enable image insertion from a file, paste, or drop. It receives `{ file }` and returns the image to
insert: `src`, optional alt text and dimensions, or `null` for none. While it runs the editor shows
its progress with a **Cancel** button. A rejected upload leaves the document unchanged and emits
`uploadError`, so the app can show recovery UI.
`resolveImageAttributes` can supply responsive image attributes when rendering saved content.
`resolveImageSource` can resolve a browser-only master URL for every image,
including images without responsive metadata. It receives the durable image
descriptor and returns a URL or `undefined`. Empty results and exceptions use the
stored source. Responsive attributes are resolved from this master; if a rendition
fails, the editor keeps the resolved master. Neither callback changes the stored
document or the durable descriptors in image events. Replacing the source resolver
refreshes delivery without emitting a document update. The application owns URL
validation, authorization and signing; these synchronous callbacks do not fetch or
persist credentials on behalf of the application.

Pass document JSON when loading must avoid contacting the stored image host.
HTML input first passes through the browser's HTML parser, which may request
image URLs before the editor can apply its delivery policy. Exported HTML keeps
the durable URLs.

Click or tap an editable image to select the entire node and show one **Image actions** bar.
Choose in-line block placement, centering, or text wrapping on either side directly in the bar.
Choosing wrapping resets the image to one-third of the content column. Below 768px it stacks
above the text at full column width. Corner dragging sets a custom desktop size; small screens still use the full column.
Drag any corner handle to resize; the intrinsic aspect ratio stays locked and the width stays
within the document. Release commits one undo step. **Escape** cancels a drag; focused handles
also accept arrow keys (**Shift** uses a larger increment). **Image description** opens the
secondary alt-text field with **Save** and **Cancel**.

**Delete** and **Backspace** remove a selected image, and undo restores it. Reading mode keeps
placement and pointer/keyboard viewer activation, with author controls hidden. Images are viewer
tab stops only in reading mode.

Document dividers have a pointer-sized click target and a selected outline. Click one, then
press **Delete** or **Backspace** to remove it. **Tab** inserts a literal tab in ordinary text
and code; lists retain indent/outdent and tables retain cell navigation. Outside a list or
table, **Shift+Tab** leaves the document through the browser’s normal focus navigation.

The shared preset retains image `width`, `height`, `placement`, and `responsive` attributes in both JSON and
HTML. Headless hosts can supply `imageNodeView` and `dividerNodeView` for custom presentation.

Select text and choose **Link**, type `/link`, or put the caret in a link to edit or remove it. The editor
accepts `http:`, `https:`, `mailto:`, `tel:`, and relative URLs beginning with `/`, `#`, or `?`.
Answer [`link-search`](/editor/looma-editor#link-search) with `linkSearch({ query })` to offer a single field that searches destinations or accepts a pasted full URL. Return items
with `id`, `label`, `href`, and optional `detail`; the host owns access checks and durable URLs.
Answer [`link-resolve`](/editor/looma-editor#link-resolve) with `linkResolve({ href })` to show a saved destination's current name and context when its link is
selected. Set `linkTargetLabel` to name that kind of destination in the picker. A failed lookup
leaves the original URL visible and editable. Pass `linkBaseUrl` (for example, `https://docs.example.test`) to make newly inserted same-origin web links site-relative, including pasted HTML and URL paste over selected text. Paths, queries, and fragments are preserved; other origins and already relative destinations are unchanged. Link is also available in the text-selection toolbar.

## Configuration and events

Pass a `references` map to render cached display values immediately. Keys are `link:<id>` and
`mention:<id>`; values contain `label` and an optional `href`. Replacing the map refreshes
presentation without emitting a document update or adding an undo step. The host owns access
checks, background lookup and persistence of this metadata separately from authored content.

With this prop, selecting a host destination at an empty caret inserts an automatically labelled
link with its original ID. Existing selected text or text entered in the link form remains custom
wording. Old ordinary links keep their saved wording; matching a title does not establish intent.
The native node retains its insertion-time fallback for offline use and cold caches.

Use `editorToMarkdown(editor)` from `@threadlabs/looma/editor/expressmark` to serialize the live
editor's cached names and concrete TOC entries. For saved JSON plus a separately captured map,
use `editorDocumentToMarkdown(document, { references })`. These operations retain target IDs and
do not mutate editor content. Headless editors pass `{ references }` to `getDefaultEditorExtensions`
and replace display metadata with `setReferenceDisplay(editor, references)`.

::: table

- Prop: `modelValue`
  Default: Empty document
  Purpose: Document JSON; use `v-model`

- Prop: `references`
  Default: None
  Purpose: Cached labels and destinations, stored separately from document changes

- Prop: `editable`
  Default: `true`
  Purpose: Allow editing or show the document read only

- Prop: `placeholder`
  Default: `Type “/” for commands, or start writing…`
  Purpose: Empty document prompt

- Prop: `label`
  Default: `Document`
  Purpose: Accessible name for the editing surface

- Prop: `extensions`
  Default: None
  Purpose: Answers `extensions`: additional Tiptap extensions

- Prop: `slashCommands`
  Default: None
  Purpose: Answers `slash-commands`: the slash menu's commands, given the defaults

- Prop: `toolbarMode`
  Default: `bubble`
  Purpose: `bubble`, `sticky`, `popover`, or `contextual` toolbar placement

- Prop: `toolbarTriggerId`, `toolbarOpen`
  Default: `""`, `false`
  Purpose: The button that opens the `popover` toolbar, and whether it is open (`v-model:toolbar-open`)

- Prop: `codeLanguages`
  Default: Built-in catalog
  Purpose: Replace the default code languages with an application-owned grammar map; `{}` keeps code plain

- Prop: `mentionItems`, `mentionQuery`, `mentionLimit`
  Default: Empty, none, 8
  Purpose: Fixed mention candidates, and the answer to `mention-query`

- Prop: `linkBaseUrl`
  Default: None
  Purpose: Make newly inserted same-origin web links relative

- Prop: `linkSearch`, `linkResolve`, `linkTargetLabel`
  Default: None, none, `Item`
  Purpose: Answer `link-search` and `link-resolve`: search app destinations and describe existing identity links

- Prop: `imageUpload`, `resolveImageSource`, `resolveImageAttributes`
  Default: None
  Purpose: Answer `image-upload`; image delivery and rendering

:::

`update:modelValue` and `update` report document changes; `update:toolbarOpen` reports the
`popover` toolbar opening and closing; `ready` exposes the underlying Tiptap
editor for integrations. The app decides when and where to persist the document.
The editor manages its own toolbar, pickers, and editing popovers; integrate through
`LoomaEditor` rather than composing its internal controls.
