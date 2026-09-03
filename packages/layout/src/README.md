# Layout Primitive Contracts

## `ui-stack`

- Attributes: `gap`, `align`, `justify`
- Properties: `gap`, `align`, `justify`
- Events: none
- Slots: default children
- SSR markup:

```html
<ui-stack gap="m" align="stretch">
  <div>Item A</div>
  <div>Item B</div>
</ui-stack>
```

## `ui-inline`

- Attributes: `gap`, `align`, `justify`, `wrap`
- Properties: `gap`, `align`, `justify`, `wrap`
- Events: none
- Slots: default children
- SSR markup:

```html
<ui-inline gap="s" wrap="wrap">
  <button>One</button>
  <button>Two</button>
</ui-inline>
```

## `ui-cluster`

- Attributes: `gap`, `align`, `justify`
- Properties: `gap`, `align`, `justify`
- Events: none
- Slots: default children
- SSR markup:

```html
<ui-cluster gap="xs">
  <a href="#">Tag A</a>
  <a href="#">Tag B</a>
</ui-cluster>
```

## `ui-grid`

- Attributes: `gap`, `min`
- Properties: `gap`, `min`
- Events: none
- Slots: default children
- SSR markup:

```html
<ui-grid gap="m" min="md">
  <article>Card 1</article>
  <article>Card 2</article>
</ui-grid>
```

The selected column minimum is capped by the grid's available inline size, so
even `min="lg"` collapses to one fluid column instead of overflowing a narrow
container.

## `ui-center`

- Attributes: `measure`, `gutters`
- Properties: `measure`, `gutters`
- Events: none
- Slots: default children
- SSR markup:

```html
<ui-center measure="wide" gutters="m">
  <p>Centered content area.</p>
</ui-center>
```

The element fills its parent until it reaches the selected measure. Gutters are
included in that measured box and remain present at narrow widths.

## `ui-switcher`

- Attributes: `gap`, `threshold`, `align`
- Properties: `gap`, `threshold`, `align`
- Events: none
- Slots: default children
- SSR markup:

```html
<ui-switcher gap="m" threshold="sm" align="stretch">
  <article>First panel</article>
  <article>Second panel</article>
</ui-switcher>
```

Children share a row above the selected intrinsic threshold and become a
single column below it. Set `--ui-switcher-threshold` for a product-specific
cutover.

## `ui-sidebar`

- Attributes: `gap`, `side`, `width`, `align`
- Properties: `gap`, `side`, `width`, `align`
- Events: none
- Slots: exactly two default children: side region and content
- SSR markup:

```html
<ui-sidebar gap="m" side="start" width="narrow">
  <aside>Filters</aside>
  <main>Results</main>
</ui-sidebar>
```

The content child keeps at least `--ui-sidebar-content-min` (50% by default).
When the pair no longer fits, both children wrap to full-width rows.

## `ui-reel`

- Attributes: `gap`, `item-width`, `snap`
- Properties: `gap`, `itemWidth`, `snap`
- Events: none
- Slots: default children
- SSR markup:

```html
<ui-reel gap="m" item-width="md" snap="start" aria-label="Recent pages">
  <article>Page one</article>
  <article>Page two</article>
</ui-reel>
```

The host receives `role="region"` and `tabindex="0"` unless the consumer
supplies alternatives, so keyboard users can reach and scroll the collection.
Consumers should provide a specific `aria-label` or `aria-labelledby` value.

## `ui-separator`

- Attributes: `orientation`
- Properties: `orientation`
- Events: none
- Slots: optional `label` (future)
- SSR markup:

```html
<ui-separator role="separator" aria-orientation="horizontal"></ui-separator>
```
