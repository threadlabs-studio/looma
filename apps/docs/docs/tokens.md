# Tokens

`@threadlabs/looma` ships CSS-only token and theme subpaths with deterministic layering.

## Files

- `@threadlabs/looma/tokens.css`: primitive + semantic defaults.
- `@threadlabs/looma/theme-light.css`: explicit light mode overrides.
- `@threadlabs/looma/theme-dark.css`: dark mode overrides.
- `@threadlabs/looma/theme-high-contrast.css`: high-contrast overrides.

## Layer Order

```css
@layer tokens, base, components, utilities;
```

## Contract

- Consumers import only required CSS entry points.
- Semantic tokens include `--ui-surface-*`, `--ui-text-*`, `--ui-border-*`, `--ui-accent-*`.
- Theme switching can be handled with data attributes or media queries.
- No runtime theme manager is required in v1.

## Typography Tokens

Looma typography is token-driven and rem-based:

- `--ui-font-family-sans`
- `--ui-font-stack-system`
- `--ui-font-stack-neo-grotesque`
- `--ui-font-stack-humanist`
- `--ui-font-stack-rounded`
- `--ui-font-size-sm`
- `--ui-font-size-md`
- `--ui-font-size-lg`
- `--ui-line-height-tight`
- `--ui-line-height-md`
- `--ui-line-height-relaxed`

Guidance:

- Keep font-size values in `rem` so host apps can scale globally via `html` font-size.
- Prefer setting app-level baseline on `html`/`body` (or `.ui-scope`), not component-local px overrides.
- Component internals should reference these tokens instead of hard-coded typography values.
- Default Looma stack is `--ui-font-stack-system` (`system-ui, sans-serif`) for fast/no-download rendering.

### Font Stack Presets

Looma includes optional sans presets inspired by modern system stack guidance:

- `--ui-font-stack-system`
- `--ui-font-stack-neo-grotesque`
- `--ui-font-stack-humanist`
- `--ui-font-stack-rounded`

Use these by overriding `--ui-font-family-sans` at app root or scope level.

Reference: [modern-font-stacks](https://github.com/system-fonts/modern-font-stacks).
