# Conventions

These conventions keep contracts stable across core components and framework adapters.

## Naming

- Attributes use kebab-case (`default-open`, `aria-controls`).
- Properties use camelCase (`defaultOpen`).
- Shared state names: `open`, `disabled`, `selected`, `value`, `invalid`, `readonly`.

## Events

- Prefer native events where semantics already exist (`input`, `change`, `focus`, `blur`).
- Custom events keep stable lowercase names and semver-protected payload keys.
- Core payload shapes:
  - `open`: `{ open: true, reason, trigger }`
  - `close`: `{ open: false, reason, trigger }`
  - `select`: `{ value, previousValue, trigger }`

## Controlled and Uncontrolled

- Value contract: `value` + `defaultValue`.
- Open contract: `open` + `defaultOpen`.
- Controlled state wins when provided.
- Events still emit user intent even in controlled mode.

## SSR Upgrade Contract

- SSR HTML must be meaningful before JS loads.
- Upgrade behavior cannot rewrite authored tree shape.
- Required ARIA relationships should be derivable from SSR markup.

## Spacing Rule

Components do not set external margins. Layout primitives own inter-component rhythm via `gap`.

## Light-DOM Isolation Contract

Looma components are light-DOM custom elements (not shadow DOM). To keep behavior predictable across host apps:

- Each Looma host applies a scoped reset (`all: revert`) and re-adds required defaults from Looma tokens.
- Each Looma host uses token-driven typography/color by default (`--ui-font-*`, `--ui-text-*`).
- Component subtrees use scoped border-box (`host`, `host *`, `host *::before`, `host *::after`).
- We do not apply a global page reset from Looma packages.

### Hybrid Layer Strategy

Looma uses a hybrid `@layer` approach so isolation stays robust while theming stays overridable:

- **Unlayered (contract):** Host reset (`all: revert`), scoped box-sizing, core typography baseline, and `data-ui-inherit-typography` behavior. These rules are not in any layer so they reliably win over layered page CSS.
- **Layered (theme/variants):** Component visual styles (colors, borders, sizes, variants) and utilities (`.ui-scope`, `.ui-font-*`) live in `@layer components` and `@layer utilities`. Unlayered page CSS can override them for theming.

### Opt-in Typography Inheritance

Some surfaces should intentionally blend with host typography (for example markdown prose containers). For those cases, set:

- `data-ui-inherit-typography` on a Looma host element.

When present, Looma host typography is inherited for:

- `font-family`, `font-size`, `line-height`, `font-weight`, `color`
- `direction`, `writing-mode`, `text-orientation`
- `text-rendering`, `font-feature-settings`, `font-variation-settings`

### Utility Pattern (`.ui-scope`)

Use `.ui-scope` on a container when you want an explicit Looma baseline in host apps:

```html
<section class="ui-scope">
  <ui-stack gap="m">
    <ui-button><button type="button">Save</button></ui-button>
  </ui-stack>
</section>
```

`.ui-scope` applies token-driven baseline typography/color and scoped border-box to descendants.

### Utility Pattern (Font Stack Presets)

Use utility classes or a data attribute to opt into a font stack preset per subtree:

```html
<section class="ui-scope ui-font-neo-grotesque">
  <ui-button><button type="button">Save</button></ui-button>
</section>

<section class="ui-scope" data-ui-font-stack="rounded">
  <ui-badge>Beta</ui-badge>
</section>
```

Supported presets:

- `system` (`.ui-font-system` or `data-ui-font-stack="system"`)
- `neo-grotesque` (`.ui-font-neo-grotesque` or `data-ui-font-stack="neo-grotesque"`)
- `humanist` (`.ui-font-humanist` or `data-ui-font-stack="humanist"`)
- `rounded` (`.ui-font-rounded` or `data-ui-font-stack="rounded"`)
