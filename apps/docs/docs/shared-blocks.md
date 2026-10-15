# Shared blocks

Callouts and collapsible sections are one vocabulary across Looma's components, LoomaEditor and
Markdown. A block has the same name and look on every surface. Markdown renderers such as
Markupress implement this page: they render each Markdown block as the component listed here.
LoomaEditor reads and writes the same Markdown.

## Callouts

| | |
| --- | --- |
| Tones | `note`, `tip`, `info`, `important`, `warning`, `danger`. `caution` is an alias of `danger`. |
| Component | `<ui-callout tone="tip" heading="Title">…</ui-callout>`. `heading` is optional. |
| Markdown | `::: tip Title` … `:::`, where the title is optional. A GitHub alert also works: `> [!TIP]`, as the first line of a quote. |
| Editor | The `loomaCallout` node: `{ tone, heading }` plus block content. It is saved as `<ui-callout>`, and there is one slash command per tone. |

```md
::: warning Before you upgrade
Back up your data first.
:::

> [!NOTE]
> Alerts take the tones NOTE, TIP, IMPORTANT, WARNING and CAUTION.
```

The container name is the tone, matched without regard to case. Its title is the rest of the
opening line, written as the `heading` attribute. A GitHub alert has no title. `[!CAUTION]` and
`::: caution` mean `danger`. The editor saves `danger`, and a renderer may write either name.

`note` is the muted aside of Docusaurus's `:::note`, not GitHub's blue NOTE. Callout also keeps
`neutral` (the same look as `note`) and `success`, but they have no Markdown form.

## Details

| | |
| --- | --- |
| Component | `<ui-disclosure summary="Title">…</ui-disclosure>` |
| Markdown | `::: details Title` … `:::`. Add ` {open}` after the title to start expanded. The title defaults to "Details". |
| Editor | The `loomaExpand` node: `{ summary, open }` plus block content. It is edited through Disclosure and saved as native `<details><summary>Title</summary>…</details>`. |

The editor saves native `<details>`, which opens and closes without JavaScript and which a
browser's find-in-page can reveal. A renderer may write the same native element instead of
Disclosure when its page styles it.

## Containers

- An opening line is three or more colons, a block name, and an optional title. A closing line
  is three or more colons alone.
- Containers nest. When the editor writes Markdown, an outer container uses more colons than any
  container inside it (`::::` around `:::`), as VitePress expects.
- A container with an unknown name is ordinary text.
- The content between the lines is ordinary Markdown.

## Tabs

`<ui-tabs group="name">` keeps the selection of every Tabs in that group in step across the page,
matched by tab label, and remembers it for the next visit. Markdown tabs (`::: tabs` and
`::: code-group`, with `== Label` panels) map to Tabs with a group. The editor has no tabs block.
