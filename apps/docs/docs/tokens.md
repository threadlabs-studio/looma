# Tokens

`@ui/tokens` ships CSS-only tokens and themes with deterministic layering.

## Files

- `@ui/tokens/tokens.css`: primitive + semantic defaults.
- `@ui/tokens/theme-light.css`: explicit light mode overrides.
- `@ui/tokens/theme-dark.css`: dark mode overrides.
- `@ui/tokens/theme-high-contrast.css`: high-contrast overrides.

## Layer Order

```css
@layer tokens, base, components, utilities;
```

## Contract

- Consumers import only required CSS entry points.
- Semantic tokens include `--ui-surface-*`, `--ui-text-*`, `--ui-border-*`, `--ui-accent-*`.
- Theme switching can be handled with data attributes or media queries.
- No runtime theme manager is required in v1.
