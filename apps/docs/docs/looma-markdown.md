# Looma Markdown

Markupress documentation uses the [Expressive Markdown standard](https://nextwebwg.org/expressive-markdown/),
parsed by Expressmark with `{ syntax: "standard" }`. Markupress maps its semantic blocks to
Looma components. The parser, the site's presentation, and an editor's saved document are
separate contracts.

LoomaEditor's portable adapter can read and write standard Markdown explicitly. Its default
interchange mode is `compatible`, which keeps CommonMark/GFM conventions; the older
`@threadlabs/looma/markdown/markdown-it` adapter retains its editor-specific format. Neither
adapter defines Markupress's parser or documentation syntax.

````md
---
title: Release notes
---

::toc{depth=2}

## Upgrading {#upgrade}

::: warning [Before you upgrade]
Back up your data first.
:::

- [x] Read the changelog
- [ ] Run the migration, owned by @[Ada Lovelace]#u1

Status: :chip[Ready]{tone=green}

```ts {highlight="2" title="migrate.ts"}
import { migrate } from "./db";
await migrate();
```
````

## Colons and braces

Colons declare semantic elements; braces attach their attributes.

**Colons declare a semantic element, and their number gives its scope.**

| Form | Scope | Examples |
| --- | --- | --- |
| `:name[label]{attributes}` | Inline | `:chip[Ready]{tone=green}` |
| `::name{attributes}` | A block without content | `::toc{depth=2}` |
| `::: name [Title]` … `:::` | A block that holds content | `::: tip [Title]`, `::: details [Summary]` |

Write a container's designated title in brackets after its name. Inline labels also go in
brackets. Escape a closing bracket or backslash in a label with a backslash.

**Braces after something hold its attributes:** `{#id key=value key="two words" flag}`.
`#id` sets the ID, `key=value` sets a value, a value with spaces is quoted with `"` or `'`, and a
bare key is a flag. Items are separated by spaces. Braces go after a heading, an image or a
directive, and `{open}` goes after a details summary. A list that is not well formed stays text.

## Tones

`tone` names one of two kinds of value. On Callout and Badge it is a meaning, and on chips and
Swatch it is a hue.

| Component | Tones |
| --- | --- |
| Callout | The shared meanings `neutral`, `info`, `success`, `warning` and `danger`, plus `note`, `tip` and `important`. `caution` is an alias of `danger`. |
| Badge | The shared meanings, plus `accent`. |
| Chip and Swatch | The hues `neutral`, `blue`, `green`, `yellow`, `red` and `purple`. |

In Markdown, a callout's tone is its container name and a chip's tone is its `tone` attribute.

## Base

- Standard syntax provides familiar headings, lists, links, code, tables, tasks and text marks,
  with explicit container and attribute forms. It also parses Markdown inside HTML elements.
  It does not inherit every CommonMark/GFM ambiguity; use Expressmark's explicit `compatible`
  mode only when that interchange contract is required.
- Markupress keeps authored native HTML and trusted HTML Next component invocations. Component
  definitions live in external `.html` resources; Markdown consumes them through ordinary tags
  and props. The standalone Expressmark renderer uses its safe HTML profile unless its host
  explicitly admits trusted elements and attributes.
- Front matter is a YAML mapping at the very start of the file, opened by a `---` line and closed
  by a `---` or `...` line. Its first line that is not blank or a comment starts with a key, and
  each value may be a scalar, a list or a mapping. It is page metadata and renders nothing. Markupress reads its fields
  (title, description, sidebar label and position, layout, outline range, head and edit link) and
  rejects unknown ones. LoomaEditor edits content, so it leaves front matter to its host: it writes
  none, and it keeps pasted front matter as a YAML code block.

## Text

| Markdown | HTML | Editor mark |
| --- | --- | --- |
| `**bold**` | `<strong>` | `bold` |
| `*italic*` | `<em>` | `italic` |
| `~~struck~~` | `<s>` | `strike` |
| `` `code` `` | `<code>` | `code` |
| `[text](https://example.com)` | `<a>` | `link` |
| `<u>underlined</u>` | `<u>` | `underline` |
| `<mark>highlighted</mark>` | `<mark>` | `highlight` |
| A backslash at the end of a line | `<br>` | `hardBreak` |

Underline and highlight are their HTML elements, which carry exactly the marks' meaning. A URL in
angle brackets, `<https://example.com>`, is a link, and so is a bare address that starts with a
scheme or `www.`. A bare domain such as `example.com` stays text.

## Headings

```md
## Install the package {#install}
```

`#` to `######` make headings 1 to 6. Every heading has an anchor. A trailing `{#id}` sets it;
otherwise the anchor derives from the heading's text:

1. The text is normalized to NFC and lowercased.
2. Letters, numbers and combining marks stay, in any script.
3. Every other run of characters becomes one hyphen, and hyphens at either end are trimmed.

So "Über `code` & more" is `über-code-more`, and "設定 と 使い方" is `設定-と-使い方`. Text with no
letters or numbers, such as a heading of only emoji, has the anchor `heading`. A repeated anchor
takes the first free suffix: `setup-1`, then `setup-2`. A custom ID is reserved for its heading,
so a generated anchor never takes it, and a writer writes `{#id}` only for an ID that differs from
the one the text derives.

## Lists and task lists

```md
3. Third
4. Fourth

- [x] Read the changelog
- [ ] Run the migration
```

An ordered list keeps its start number. A bullet list whose every item starts with `[ ]` or `[x]`
is a task list. In any other list, the brackets are text. Each item's checkbox and text share one
label, so the checkbox is named by its item:

```html
<li data-type="taskItem" data-checked="true"><label><input type="checkbox" disabled checked> Read the changelog</label></li>
```

In an item of several paragraphs, the label holds the first paragraph's text.

## Footnotes

```md
The build writes a log[^log], kept for a week[^log].

[^log]: The log holds every step.

    It is plain text.
```

`[^label]` refers to the definition `[^label]:`, wherever the definition stands. A label is any
run of characters other than spaces and `]`, matched exactly. The definition's text starts after
the colon, and lines indented four spaces continue it, so a note holds paragraphs, lists and code.
A reference with no definition is text, and a definition no text refers to renders nothing; for
the same label twice, the first definition is the note.

Notes render after the document in first-reference order, with numbered references and links
back to every use. A missing definition leaves its reference as text. The renderer owns the
accessible reference and backlink markup; it is separate from the editor's saved HTML.

## Code blocks

````md
```ts {highlight="1,3-4" show-line-numbers title="config.ts"}
export default {
  name: "docs",
  base: "/docs/",
  lineNumbers: true,
};
```
````

The fence starts with its language and an optional attribute list:

| Attribute | Meaning |
| --- | --- |
| `title="config.ts"` | A caption above the code. |
| `highlight="1,3-4"` | Highlight lines 1, 3 and 4. |
| `show-line-numbers` | Number the lines. |
| `show-line-numbers=false` | Leave lines unnumbered, regardless of the site default. |

Expressmark keeps unrecognized info-string text in the code node's `meta`. Markupress owns
syntax highlighting and these presentation attributes; source comments remain literal code.
A fence is longer than any run of its marker inside the code.

## Tables

```md
| Package | Version | Notes |
| --- | ---: | :---: |
| looma | 0.28.0 | Components |
```

A pipe table fits a single header row, one alignment per column and inline content in each cell.
Expressive Markdown also supports named and positional list tables for rich cells. Native HTML
tables remain available, with alignment and background as `style`, `colspan` and `rowspan` for
merged cells, and block content inside cells.

```html
<table><tbody>
  <tr><th><p>Status</p></th><th><p>Owner</p></th></tr>
  <tr><td style="background-color: #dcfce7"><p>Done</p><ul><li><p>Shipped</p></li></ul></td><td><p>Ada</p></td></tr>
</tbody></table>
```

## Images

```md
![The build pipeline, from source to release](./pipeline.svg "Build pipeline")

![Pipeline](./pipeline.svg){width=640 height=360 placement=wrap-left responsive}
```

The alt text is the image's description and the title is optional. An image alone in its
paragraph is a block image. Braces after the image set its size and placement:

| Attribute | Meaning |
| --- | --- |
| `width`, `height` | Size in CSS pixels, a positive whole number. |
| `placement` | `center`, `wrap-left` or `wrap-right`. Without one, the image is an ordinary block. |
| `responsive` | The host may deliver responsive renditions of the image. |

How an image is delivered (its `srcset`, sizes and loading) belongs to the page that shows it, not
to the document.

## Figures

```md
::: figure [The build, from *source* to release]
![The build pipeline](./pipeline.svg)
:::
```

`::: figure [Caption]` wraps an image in `<figure>`, with the title line as its `<figcaption>`. The
caption is inline Markdown, so it can hold formatting and links.

## Callouts

```md
::: warning [Before you upgrade]
Back up your data first.
:::

> [!NOTE]
> Alerts take the tones NOTE, TIP, IMPORTANT, WARNING and CAUTION.
```

| Part | Form |
| --- | --- |
| Tones | `note`, `tip`, `info`, `important`, `warning`, `danger`. `caution` is an alias of `danger`. |
| Component | `<ui-callout tone="tip" heading="Title">…</ui-callout>`. `heading` is optional. |
| Markdown | `::: tip [Title]` … `:::`, where the title is optional. A GitHub alert also works: `> [!TIP]`, as the first line of a quote. |
| Editor | The `loomaCallout` node: `{ tone, heading }` plus block content. It is saved as `<ui-callout>`, and there is one slash command per tone. |

The container name is the tone. Its bracketed title supplies the component's `heading` attribute. A GitHub alert has no
title in this example. `[!CAUTION]` and `::: caution` map to the danger component tone.

`note` is the muted aside of Docusaurus's `:::note`, not GitHub's blue NOTE. Callout also keeps
`neutral` (the same look as `note`) and `success`.

## Details

```md
::: details [Show the full log] {open}
The build finished in 42 seconds.
:::
```

| Part | Form |
| --- | --- |
| Markupress HTML | `<details><summary>Title</summary>…</details>` |
| Markdown | `::: details [Title]` … `:::`. Add ` {open}` after the title to start expanded. The title defaults to "Details". |
| Editor | The `loomaExpand` node: `{ summary, open }` plus block content. It is edited through Disclosure and saved as native `<details><summary>Title</summary>…</details>`. |

The editor saves native `<details>`, which opens and closes without JavaScript and which a
browser's find-in-page can reveal. Markupress uses that native disclosure structure too.

## Tabs

````md
::: tab [npm]
```sh
npm install @threadlabs/looma
```
:::

::: tab [pnpm]
```sh
pnpm add @threadlabs/looma
```
:::
````

Adjacent `::: tab [Label]` containers form one tab group. Each panel contains ordinary Markdown,
including code fences, lists or paragraphs. Labels belong to panels; a code fence's title is a
separate caption. Write each panel's own closing fence before the next panel.

Generated component references also use native `<ui-tabs>` and `<section aria-label="…">`
wrappers with Markdown fences inside them. Those are ordinary HTML component invocations.
Standard Markdown inside HTML keeps the code literal while the native component owns tab
behavior.

## Containers

An opening line is three or more colons, a semantic name and an optional bracketed title and
attribute list. A closing fence uses the same number of colons as its opener. Make an outer
container's fence longer than a nested container's fence:

```md
:::: warning [Check the migration]
::: details [Backup steps] {open}
Create a backup before proceeding.
:::
::::
```

The content between the fences is ordinary Markdown. A marker inside a code fence stays code.
Attributes follow the title: `::: details [Summary] {open}` starts expanded.

## HTML Next components

Define a component in its own HTML resource, then link and invoke it from Markdown:

```html
<link rel="component" href="./components/project-status.html">
<project-status label="Ready"></project-status>
```

Props on a component invocation are ordinary HTML attributes. Definition expressions belong in
the external resource, where HTML Next declares the component's inputs and behavior.

## Chips

```md
Status :chip[Ready]{tone=green} and :chip[Draft].
```

A chip is an inline label. Its tone is `neutral`, `blue`, `green`, `yellow`, `red` or `purple`,
and an unknown or missing tone is `neutral`. LoomaEditor saves it as
`<span data-looma-chip data-label="Ready" data-color="green">Ready</span>`.

## Mentions

```md
Thanks @ada, @[Grace Hopper] and @[Ada Lovelace]#u1.
```

A mention is written as Expressive Markdown writes it: `@handle`, `@[Label]`, or `@[Label]#ref`,
where `ref` is the application's ID for the person or other entity. A handle and a `ref` are a
letter, number or underscore followed by letters, marks, numbers, underscores and hyphens; any
other ID goes in braces, `@[Label]{ref="user:42"}`. An `@` starts a mention only at the start of a
line or after whitespace, so `a@b.com` is text. LoomaEditor writes `@[Label]`, with the ID when the
mention has one, and saves the mention as
`<span data-type="mention" data-id="u1" data-label="Ada Lovelace">@Ada Lovelace</span>`.

`:mention[Label]{id=…}` is text. To keep mentions written that way, convert each one to
`@[Label]#id` before reading the document.

## Table of contents

```md
::toc{depth=2 format=numbered}
```

`::toc` lists the document's headings as links to their anchors. `depth` is the deepest heading
level listed, `1` to `3` (default `3`), and `format` is `plain` (default), `bulleted` or
`numbered`. LoomaEditor saves it as `<nav data-looma-toc data-format="numbered" data-depth="2">`
and fills in the links from the current headings.

## Parsing and rendering

Use Expressmark directly when processing documentation outside Markupress:

```ts
import { parse, stringify } from "expressmark";
import { renderHtml } from "expressmark/render";

const document = parse(source, { syntax: "standard" });
const html = renderHtml(document);
const markdown = stringify(document, { syntax: "standard", preferredForms: true });
```

`renderHtml` has a safe default HTML profile and supports semantic node transformers. Markupress
owns its documentation transforms, trusted component resources, asset resolution and theme;
standalone renderer output does not load Looma automatically. Avoid another component parser or
runtime in a documentation host.

`@threadlabs/looma/markdown` still exports editor vocabulary, heading and code helpers. Its
`markdown-it` adapter and `@threadlabs/looma/markdown/fixtures` describe the retained editor
format, not conformance to the Expressive Markdown standard or Markupress rendering. Use the
Expressmark AST and renderer for new documentation integrations.

## Editor interchange

Use `@threadlabs/looma/editor/expressmark` for portable editor conversion:

```ts
import { editorDocumentToMarkdown, markdownToEditorDocument } from "@threadlabs/looma/editor/expressmark";

const markdown = editorDocumentToMarkdown(savedEditorJson, { syntax: "standard" });
const restoredEditorJson = markdownToEditorDocument(markdown, { syntax: "standard" });
```

Without that option, the adapter selects `compatible` syntax. The editor keeps Tiptap JSON as
its saved document. Features outside its schema raise a conversion error; arbitrary
component definitions or invocations are documentation content and do not become editor
nodes automatically. Keep page metadata in the host application. See the
[editor guide](/editor) for its editing and import/export contracts.
