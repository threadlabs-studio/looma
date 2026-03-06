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

## `ui-separator`

- Attributes: `orientation`
- Properties: `orientation`
- Events: none
- Slots: optional `label` (future)
- SSR markup:

```html
<ui-separator role="separator" aria-orientation="horizontal"></ui-separator>
```
