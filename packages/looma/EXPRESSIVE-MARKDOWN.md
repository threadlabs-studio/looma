# Expressive Markdown

Convert a saved LoomaEditor document into readable Markdown or an independent
JSON AST. The adapter runs in browsers and on servers without creating an editor
or loading a DOM.

```ts
import { editorDocumentToMarkdown, markdownToEditorDocument } from "@threadlabs/looma/editor/expressmark";

const restoredEditorJson = markdownToEditorDocument(markdown);
const written = editorDocumentToMarkdown(editedEditorJson, { original: markdown });
```

Pass the Markdown a document was read from as `original` when writing it back.
An unedited document is then written byte for byte, front matter and spacing
included, and an edit leaves the source of every other block alone. An edited
block keeps the spellings it still reads as, such as `_` emphasis or a setext
heading. Without `original`, the writer uses Expressmark's preferred forms.

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

Editor Markdown import and export explicitly select Expressmark’s `compatible` syntax (CommonMark/GFM with expressive extensions), preserving the existing interchange format as Expressmark’s defaults evolve. Pass `syntax` in conversion options when selecting another supported reading; content outside the editor schema still raises a conversion error.

The editor continues to save Tiptap JSON. Expressive Markdown is an interchange
format; it does not replace your saved document, history or application metadata.
See the [proposal and syntax](https://nextwebwg.org/expressive-markdown/) and
[document AST](https://nextwebwg.org/expressive-markdown/ast).

## Conversion behavior

Ordinary punctuation stays readable: ranges such as `[-1, 1]`, `array[index]`,
`user_id` and `a@word` do not need backslashes. The shared writer escapes text
only when its context would interpret it as syntax. Mentions start at the
beginning of a line or after whitespace; embedded at signs remain literal.

Headings, text formatting, links, images, lists, tasks, quotes, code, callouts,
disclosures, figures, tabs, chips, mentions and tables map to their semantic AST
nodes. Mention targets become `ref`; chips keep their `tone`; merged table cells
keep numeric spans and block bodies. Footnote references and definitions are
`footnoteReference` and `footnoteDefinition` nodes, and link reference
definitions are `definition` nodes; each stays where it is written. A link that
uses a definition keeps its label and its `full`, `collapsed` or `shortcut`
spelling, and is written as a reference while the definition still gives its
destination and title.

Table cell presentation uses string attributes: `textAlign`, `backgroundColor`
and the adapter profile's `columnWidths` (comma-separated pixel widths, such as
`"100,120"`). Image dimensions use string `width`/`height`; `responsive` is a
boolean. Tabs preserve `group`, `default`, `queryString`, `lazy` and each tab's
selection `value`. A tab's label is independent of that value.

Saved code fence titles, highlighted ranges and line-number choices become the
shared `title`, `highlight` and `showLineNumbers` fields. Ranges remain strings;
unknown fence metadata stays in `meta`. Code notation comments remain literal,
including escaped markers, as they do in the default editor.

A table of contents is written as its `::toc` placeholder with its settings;
readers build its entries from the headings. Reading Markdown gives each heading
without an authored ID the anchor its text derives, and writing adds `{#id}` only
to a heading whose ID a reader would not derive. Authored IDs remain unchanged,
including duplicates. Pass `{ onDiagnostic }` as the optional second argument to
receive duplicate-ID warnings. Imported TOC bodies remain authored navigation;
edits to document headings do not replace them.

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
`markdownToEditorDocument` reads the content after the front matter, and the
writer keeps the front matter of `original`. Importing an AST root that holds a
title or metadata directly into editor content raises an error. Likewise, custom semantic
types, IDs on nodes other than headings, formatted callout/tab titles and
unsupported presentation must be handled by your application rather than
silently flattened.
