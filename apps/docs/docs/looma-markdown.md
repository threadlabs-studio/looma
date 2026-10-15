# Looma Markdown

Looma Markdown is the Markdown that Markupress renders and LoomaEditor reads and writes. It is
CommonMark with GitHub Flavored Markdown, plus Looma's shared blocks: callouts, collapsible
sections and tabs. A block has the same name and look on every surface. Markupress renders each
block as the Looma component listed here, and LoomaEditor saves it as that component's HTML.

````md
---
title: Release notes
---

## Upgrading {#upgrade}

::: warning Before you upgrade
Back up your data first.
:::

- [x] Read the changelog
- [ ] Run the migration

```ts title="migrate.ts" {2}
import { migrate } from "./db";
await migrate();
```
````

## Base

- The base is [CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/) with the
  [GFM 0.29](https://github.github.com/gfm/) extensions: tables, task list items, strikethrough
  and autolinks.
- Raw HTML is part of the document. A renderer passes it through; LoomaEditor keeps the HTML its
  schema knows.
- Front matter is a YAML mapping between `---` lines at the very start of the file. It is page
  metadata, not content: Markupress reads its fields (title, description, sidebar label and
  position, layout, outline range, head and edit link) and rejects unknown ones. LoomaEditor keeps
  pasted front matter as a YAML code block.

## Text

| Markdown | HTML | Editor mark |
| --- | --- | --- |
| `**bold**` | `<strong>` | `bold` |
| `*italic*` | `<em>` | `italic` |
| `~~struck~~` | `<s>` | `strike` |
| `` `code` `` | `<code>` | `code` |
| `[text](https://example.com "Title")` | `<a>` | `link` |
| `<u>underlined</u>` | `<u>` | `underline` |
| `<mark>highlighted</mark>` | `<mark>` | `highlight` |
| A backslash at the end of a line | `<br>` | `hardBreak` |

Underline and highlight are written as their HTML elements. A URL in angle brackets,
`<https://example.com>`, is a link, and so is a bare `https://` or `www.` address.

## Headings

```md
## Install the package {#install}
```

`#` to `######` make headings 1 to 6. A trailing `{#id}` sets the heading's anchor. Without
one, the anchor is the heading's text in lowercase, with each run of other characters replaced by
a hyphen; a repeated anchor takes the first free suffix (`install-1`, `install-2`). A custom ID is
reserved for its heading, so a generated anchor never takes it.

## Lists and task lists

```md
3. Third
4. Fourth

- [x] Read the changelog
- [ ] Run the migration
```

An ordered list keeps its start number. A task item is a list item that starts with `[ ]` or
`[x]`.

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
name `ts`. A line that ends with a `[!code highlight]` comment is highlighted and the comment is
removed. The comment can be `//`, `#`, `--`, an HTML comment or a block comment.
`[!code highlight:3]` covers three lines; alone on its own line, the marker applies to the lines
after it.

```ts
const port = 8080; // [!code highlight]
```

A fence is longer than any run of backticks inside it.

## Tables

```md
| Package | Version | Notes |
| :--- | ---: | :---: |
| looma | 0.27.0 | Components |
```

GFM tables have one header row, an alignment per column, and inline content in each cell.

## Images

```md
![The build pipeline, from source to release](./pipeline.svg "Build pipeline")
```

The alt text is the image's description and the title is optional.

## Callouts

```md
::: warning Before you upgrade
Back up your data first.
:::

> [!NOTE]
> Alerts take the tones NOTE, TIP, IMPORTANT, WARNING and CAUTION.
```

| | |
| --- | --- |
| Tones | `note`, `tip`, `info`, `important`, `warning`, `danger`. `caution` is an alias of `danger`. |
| Component | `<ui-callout tone="tip" heading="Title">…</ui-callout>`. `heading` is optional. |
| Markdown | `::: tip Title` … `:::`, where the title is optional. A GitHub alert also works: `> [!TIP]`, as the first line of a quote. |
| Editor | The `loomaCallout` node: `{ tone, heading }` plus block content. It is saved as `<ui-callout>`, and there is one slash command per tone. |

The container name is the tone, matched without regard to case. Its title is the rest of the
opening line, written as the `heading` attribute. A GitHub alert has no title. `[!CAUTION]` and
`::: caution` mean `danger`. The editor saves `danger`, and a renderer may write either name.

`note` is the muted aside of Docusaurus's `:::note`, not GitHub's blue NOTE. Callout also keeps
`neutral` (the same look as `note`) and `success`, which are component tones only.

## Details

```md
::: details Show the full log {open}
The build finished in 42 seconds.
:::
```

| | |
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

- An opening line is three or more colons, a block name, and an optional title. A closing line
  is three or more colons alone.
- The block names are the callout tones, `caution`, `details`, `tabs` and `code-group`. A
  container with any other name is ordinary text.
- Containers nest. A closing line closes the innermost open container. Writers give an outer
  container more colons than any container inside it (`::::` around `:::`), as VitePress expects.
- The content between the lines is ordinary Markdown. A marker line inside fenced code is code.

## Content written as HTML

LoomaEditor writes content that has no Markdown form above as the HTML it saves. Markdown carries
that HTML unchanged, and the editor reads it back.

- Chip: `<span data-looma-chip data-label="Ready" data-color="green">Ready</span>`. The colours
  are `neutral`, `blue`, `green`, `yellow`, `red` and `purple`.
- Mention: `<span data-type="mention" data-id="u1" data-label="Ada">@Ada</span>`.
- Image with a size or placement: `<img src="./a.png" alt="…" width="640" height="360" data-placement="wrap-left">`.
  The placements are `center`, `wrap-left` and `wrap-right`. `data-looma-responsive` marks an
  image whose host may deliver responsive renditions.
- Table: `<table>` with cell alignment and background as `style` on each cell, `colspan` and
  `rowspan` for merged cells, and block content in cells.
- Task list: `<ul data-type="taskList">` with `<li data-type="taskItem" data-checked="true">` items.
- Table of contents: `<nav data-looma-toc data-format="numbered" data-depth="2">`. The format is
  `plain`, `bulleted` or `numbered`, and the depth is the deepest heading level listed, 1 to 3.

## Support

| Feature | Markupress | LoomaEditor reads | LoomaEditor writes |
| --- | --- | --- | --- |
| Text, links, lists, quotes, rules, line breaks | Yes | Yes | Yes |
| Bare-URL autolinks | Yes | As text | — |
| Headings | Levels 1–6 | Levels 1–3 | Levels 1–3 |
| Heading `{#id}` | Yes | As text | — |
| Task lists | Yes | As text | As HTML |
| Code language | Yes | Yes | Yes |
| Code title, line highlights, line numbers | Yes | Language only | Language only |
| GFM tables | Yes | Yes | As HTML |
| Images | Yes | Yes | As HTML |
| Callouts and alerts | Yes | Yes | As `:::` |
| Details | Yes | Yes | Yes |
| Tabs and code groups | Yes | As text | — |
| Front matter | Page metadata | On paste, as a YAML code block | — |
