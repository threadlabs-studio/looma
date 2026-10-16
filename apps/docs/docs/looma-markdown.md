# Looma Markdown

Looma Markdown is the Markdown that Markupress renders and LoomaEditor reads and writes. It is
CommonMark with GitHub Flavored Markdown, plus Looma's blocks and a Markdown form for everything
LoomaEditor makes. A block has the same name and look on every surface: Markupress renders each
one as the Looma component listed here, and LoomaEditor saves it as that component's HTML.

````md
---
title: Release notes
---

::toc{depth=2}

## Upgrading {#upgrade}

::: warning Before you upgrade
Back up your data first.
:::

- [x] Read the changelog
- [ ] Run the migration, owned by :mention[Ada Lovelace]{id=u1}

Status: :chip[Ready]{tone=green}

```ts title="migrate.ts" {2}
import { migrate } from "./db";
await migrate();
```
````

## Colons and braces

Two mechanisms carry everything CommonMark and GFM do not.

**Colons name a Looma element, and their number gives its scope.**

| Form | Scope | Examples |
| --- | --- | --- |
| `:name[label]{attributes}` | Inline | `:chip[Ready]{tone=green}`, `:mention[Ada]{id=u1}` |
| `::name{attributes}` | A block without content | `::toc{depth=2}` |
| `::: name Title` … `:::` | A block that holds content | `::: tip Title`, `::: details Summary` |

A block's label runs to the end of its opening line. An inline element's label goes in brackets,
because text follows it. A `]` or `\` in a label is escaped with a backslash.

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

- The base is [CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/) with the
  [GFM 0.29](https://github.github.com/gfm/) extensions: tables, task list items, strikethrough
  and autolinks.
- Raw HTML is part of the document. A renderer passes it through; LoomaEditor keeps the HTML its
  schema knows.
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

## Code blocks

````md
```ts title="config.ts" {1,3-4} :line-numbers
export default {
  name: "docs",
  base: "/docs/",
  lineNumbers: true,
};
```
````

The fence's info string is a language and then any of:

| Meta | Meaning |
| --- | --- |
| `title="config.ts"` | A caption above the code. |
| `{1,3-4}` | Highlight lines 1, 3 and 4. |
| `:line-numbers` or `:no-line-numbers` | Number the lines, or leave them unnumbered, whatever the site default. |

The language is the first word, up to a space, `{` or `:`, so `ts{1}` and `ts:line-numbers` also
name `ts`. Everything after the language is the code block's meta, kept as written. A line that
ends with a `[!code highlight]` comment is highlighted, and the comment is removed from the code
readers see, so the canonical HTML holds the code without it. The comment can be `//`, `#`, `--`,
an HTML comment or a block comment. `[!code highlight:3]` covers three lines; alone on its own
line, the marker is removed with its line and applies to the lines after it. LoomaEditor edits
the source, so it keeps the comment and writes it back.

To show a marker as text, put a backslash between `[` and `!`, as `\:::` and `\{#id}` escape
elsewhere. The escaped marker highlights nothing and shows with one backslash fewer, so this
example's source reads `[\!code highlight]`:

```text
const port = 8080; // [\!code highlight]
```

A fence is longer than any run of backticks inside it.

## Tables

```md
| Package | Version | Notes |
| --- | ---: | :---: |
| looma | 0.28.0 | Components |
```

A table is a GFM table when it fits one: a single header row, one alignment per column, inline
content in each cell, and no cell backgrounds, merged cells or set column widths. Any other table
is HTML, with alignment and background as `style` on each cell, `colspan` and `rowspan` for
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
::: figure The build, from *source* to release
![The build pipeline](./pipeline.svg)
:::
```

`::: figure Caption` wraps an image in `<figure>`, with the title line as its `<figcaption>`. The
caption is inline Markdown, so it can hold formatting and links.

## Callouts

```md
::: warning Before you upgrade
Back up your data first.
:::

> [!NOTE]
> Alerts take the tones NOTE, TIP, IMPORTANT, WARNING and CAUTION.
```

| Part | Form |
| --- | --- |
| Tones | `note`, `tip`, `info`, `important`, `warning`, `danger`. `caution` is an alias of `danger`. |
| Component | `<ui-callout tone="tip" heading="Title">…</ui-callout>`. `heading` is optional. |
| Markdown | `::: tip Title` … `:::`, where the title is optional. A GitHub alert also works: `> [!TIP]`, as the first line of a quote. |
| Editor | The `loomaCallout` node: `{ tone, heading }` plus block content. It is saved as `<ui-callout>`, and there is one slash command per tone. |

The container name is the tone, matched without regard to case. Its title is the rest of the
opening line, written as the `heading` attribute exactly as it stands. A GitHub alert has no
title. `[!CAUTION]` and `::: caution` mean `danger`, and writers write `danger`.

`note` is the muted aside of Docusaurus's `:::note`, not GitHub's blue NOTE. Callout also keeps
`neutral` (the same look as `note`) and `success`, which are component tones only.

## Details

```md
::: details Show the full log {open}
The build finished in 42 seconds.
:::
```

| Part | Form |
| --- | --- |
| Component | `<ui-disclosure summary="Title">…</ui-disclosure>` |
| Markdown | `::: details Title` … `:::`. Add ` {open}` after the title to start expanded. The title defaults to "Details". |
| Editor | The `loomaExpand` node: `{ summary, open }` plus block content. It is edited through Disclosure and saved as native `<details><summary>Title</summary>…</details>`. |

The editor saves native `<details>`, which opens and closes without JavaScript and which a
browser's find-in-page can reveal. A renderer may write the same native element in place of
Disclosure when its page styles it.

## Tabs

````md
::: tabs install
== npm
```sh
npm install @threadlabs/looma
```
== pnpm
```sh
pnpm add @threadlabs/looma
```
:::

::: code-group
```js title="looma.config.js"
export default { theme: "light" };
```
```ts title="looma.config.ts"
export default { theme: "light" } satisfies Config;
```
:::
````

`::: tabs` holds panels, each starting at an `== Label` line. `::: code-group` holds fences, and
each fence is a panel labelled by its title, or by its language when it has none; `== Label`
lines work there too. Both map to `<ui-tabs group="name">`, whose group is the container's title
or, without one, its name. Tabs in one group keep the same selection across the page, matched by
tab label, and remember it for the next visit.

## Containers

1. An opening line is three or more colons, a block name and an optional title. The block names
   are the callout tones, `caution`, `details`, `figure`, `tabs` and `code-group`, matched without
   regard to case. A line with any other name is ordinary text.
2. A closing line is three or more colons alone, and it closes the innermost open container. A
   container with no closing line runs to the end of the block that holds it. Writers give an
   outer container more colons than any container inside it (`::::` around `:::`), so the nesting
   shows in the source.
3. A marker line inside fenced code is code.
4. A trailing `{open}` is a flag only on `details`. On any other container it is part of the
   title.

The content between the lines is ordinary Markdown. `== Label` lines start panels only directly
inside tabs and code groups.

## Chips

```md
Status :chip[Ready]{tone=green} and :chip[Draft].
```

A chip is an inline label. Its tone is `neutral`, `blue`, `green`, `yellow`, `red` or `purple`,
and an unknown or missing tone is `neutral`. LoomaEditor saves it as
`<span data-looma-chip data-label="Ready" data-color="green">Ready</span>`.

## Mentions

```md
Thanks, :mention[Ada Lovelace]{id=u1}.
```

A mention names a person or other entity by the application's `id`, with the label it shows. A
mention without an `id` is text. LoomaEditor saves it as
`<span data-type="mention" data-id="u1" data-label="Ada Lovelace">@Ada Lovelace</span>`.

## Table of contents

```md
::toc{depth=2 format=numbered}
```

`::toc` lists the document's headings as links to their anchors. `depth` is the deepest heading
level listed, `1` to `3` (default `3`), and `format` is `plain` (default), `bulleted` or
`numbered`. LoomaEditor saves it as `<nav data-looma-toc data-format="numbered" data-depth="2">`
and fills in the links from the current headings.

## Implementing Looma Markdown

`@threadlabs/looma/markdown` holds the shared rules, with no DOM or parser, so it can be imported
anywhere, including during server rendering:

| Export | Use |
| --- | --- |
| `LOOMA_MEANING_TONES`, `LOOMA_BADGE_TONES`, `LOOMA_CALLOUT_TONES`, `normalizeLoomaCalloutTone`, `LOOMA_CHIP_TONES`, `normalizeLoomaChipTone`, `LOOMA_CONTAINER_NAMES` | The vocabulary. |
| `parseLoomaAttributes`, `readLoomaAttributes`, `formatLoomaAttributes` | Brace attributes. |
| `loomaHeadingSlug`, `assignLoomaHeadingIds` | The heading anchor rule. |
| `parseLoomaFenceInfo` | A fence's language, title, highlighted lines and line numbers. |
| `applyLoomaCodeNotation` | Code without its `[!code highlight]` comments, and the lines they highlight. |
| `splitLoomaFrontmatter` | Front matter and the body after it. |
| `loomaContainerMarker`, `loomaCodeFence` | The colons and backticks a writer uses. |

`@threadlabs/looma/markdown/markdown-it` is the reference implementation:
`createLoomaMarkdownIt()` returns a markdown-it instance that renders the canonical HTML, and
`loomaMarkdown` is the same rules as a plugin for an instance of your own. Both take
`{ codeNotation: "keep" }` for an editor, which keeps `[!code highlight]` comments in the code.

`@threadlabs/looma/markdown/fixtures` is the conformance suite. `LOOMA_MARKDOWN_FIXTURES` holds
one case per file set: Markdown in, the canonical HTML out, and the Markdown a writer produces.
The cases are grouped by the features in the table below. `normalizeLoomaHtml(html)` makes two
renderings comparable: it sorts attributes, collapses whitespace outside code, and unwraps
presentation a renderer adds (heading self-links, a code figure with its actions, highlighting
inside code). It needs a DOM; pass a `Document` where there is no global one.

```ts
import { createLoomaMarkdownIt } from "@threadlabs/looma/markdown/markdown-it";
import { LOOMA_MARKDOWN_FIXTURES, normalizeLoomaHtml } from "@threadlabs/looma/markdown/fixtures";

const md = createLoomaMarkdownIt();
for (const fixture of LOOMA_MARKDOWN_FIXTURES) {
  console.assert(normalizeLoomaHtml(md.render(fixture.markdown)) === normalizeLoomaHtml(fixture.html), fixture.name);
}
```

## Support

| Feature | Fixtures | Markupress | LoomaEditor reads | LoomaEditor writes |
| --- | --- | --- | --- | --- |
| Text and line breaks | `text` | Yes | Yes | Yes |
| Autolinks | `autolinks` | Yes | Yes | As `<url>` and links |
| Headings | `headings` | Yes | Yes | Yes |
| Heading anchors | `heading-ids` | Splits accented letters: "Über" is `u-ber` | Yes | Yes |
| Lists, quotes and rules | `lists` | Yes | Yes | Yes |
| Task lists | `task-lists` | Yes | Yes | Yes |
| Code blocks | `code-blocks` | Yes | Yes | Yes |
| Code meta | `code-meta` | Yes | Yes | Yes |
| Tables | `tables` | Yes | Yes | Yes |
| Images | `images` | Yes | Yes | Yes |
| Image size and placement | `image-attributes` | — | Yes | Yes |
| Figures | `figures` | — | Yes | Yes |
| Callouts and alerts | `callouts` | Yes | Yes | Yes |
| Details | `details` | Yes | Yes | Yes |
| Tabs and code groups | `tabs` | Yes | Yes | Yes |
| Containers | `containers` | Closes by colon count | Yes | Yes |
| Chips | `chips` | — | Yes | Yes |
| Mentions | `mentions` | — | Yes | Yes |
| Table of contents | `toc` | — | Yes | Yes |
| Front matter | `front-matter` | Page metadata | On paste, as a YAML code block | Left to the host |
