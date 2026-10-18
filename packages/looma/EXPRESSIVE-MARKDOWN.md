# Expressive Markdown

Convert a saved LoomaEditor document into readable Markdown or an independent
JSON AST. The adapter runs in browsers and on servers without creating an editor
or loading a DOM.

```ts
import { editorDocumentToMarkdown, markdownToEditorDocument } from "@threadlabs/looma/editor/expressmark";

const markdown = editorDocumentToMarkdown(savedEditorJson);
const restoredEditorJson = markdownToEditorDocument(markdown);
```

Use the AST when attaching a document title or building another renderer:

```ts
import {
  editorDocumentToExpressmark,
  expressmarkToEditorDocument,
} from "@threadlabs/looma/editor/expressmark";
import { parse, stringify } from "expressmark";

const ast = editorDocumentToExpressmark(savedEditorJson);
const markdown = stringify(ast);
const restoredEditorJson = expressmarkToEditorDocument(parse(markdown));
```

The editor continues to save Tiptap JSON. Expressive Markdown is an interchange
format; it does not replace your saved document, history or application metadata.
See the [proposal and syntax](https://nextwebwg.org/expressive-markdown/) and
[document AST](https://nextwebwg.org/expressive-markdown/ast).

## Conversion behavior

Headings, text formatting, links, images, lists, tasks, quotes, code, callouts,
disclosures, figures, tabs, chips, mentions and tables map to their semantic AST
nodes. Mention targets become `ref`; chips keep their `tone`; merged table cells
keep numeric spans and block bodies.

Table cell presentation uses string attributes: `textAlign`, `backgroundColor`
and the adapter profile's `columnWidths` (comma-separated pixel widths, such as
`"100,120"`). Image dimensions use string `width`/`height`; `responsive` is a
boolean. Tabs preserve `group`, `default`, `queryString`, `lazy` and each tab's
selection `value`. A tab's label is independent of that value.

Saved code fence titles, highlighted ranges and line-number choices become the
shared `title`, `highlight` and `showLineNumbers` fields. Ranges remain strings;
unknown fence metadata stays in `meta`. Code notation comments remain literal,
including escaped markers, as they do in the default editor.

Automatic tables of contents receive readable heading links on export. Headings
that need an anchor receive one in the exported AST; saved editor JSON is not
changed. Authored IDs remain unchanged, including duplicates. Pass
`{ onDiagnostic }` as the optional second argument to receive duplicate-ID warnings. Imported
TOC bodies remain authored navigation; edits to document headings do not replace
them. TOCs created with the editor's existing command continue to update from
headings automatically.

## Handle unsupported content

```ts
import { EditorMarkdownConversionError } from "@threadlabs/looma/editor/expressmark";

try {
  const ast = editorDocumentToExpressmark(savedEditorJson);
} catch (error) {
  if (error instanceof EditorMarkdownConversionError) {
    console.error(error.path, error.feature);
  } else {
    throw error;
  }
}
```

Unsupported nodes, marks, attributes and meanings stop conversion with their
location. Keep the original saved JSON when preparing portable exports. The
adapter never mutates it or claims an unknown extension has been preserved in
Markdown. Native URLs and table background colors must pass the shared safe HTML
profile before the editor interprets them; unsupported values raise an error.

The editor content model has no document-level title or arbitrary metadata.
Store those fields alongside the editor JSON; importing a root that contains
them directly into editor content raises an error. Likewise, custom semantic
types, IDs on nodes other than headings, formatted callout/tab titles and
unsupported presentation must be handled by your application rather than
silently flattened.

The existing `loomaMarkdownFromDoc` and `loomaMarkdownToHtml` APIs retain their
Looma Markdown syntax. Choose the Expressive adapter explicitly for new portable
Markdown export.
