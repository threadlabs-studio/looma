# Tokens and Theming Contract

## Plan

Provide CSS-only theming with semantic variables, modern color support, and deterministic layer ordering.

## Task Breakdown With Checkpoints

- Checkpoint 1: token files and exports fixed.
- Checkpoint 2: semantic mapping and fallback strategy fixed.
- Checkpoint 3: theme layering and usage examples fixed.

## Files

- `packages/tokens/src/tokens.css`: primitive and semantic defaults.
- `packages/tokens/src/theme-light.css`: explicit light theme overrides.
- `packages/tokens/src/theme-dark.css`: explicit dark theme + media preference default.
- `packages/tokens/src/theme-high-contrast.css`: optional contrast overrides.

## CSS Layers

```css
@layer tokens, base, components, utilities;
```

## Color and Motion

- Prefer OKLCH values with practical sRGB fallback values.
- Provide semantic tokens: `--ui-surface-*`, `--ui-text-*`, `--ui-border-*`, `--ui-accent-*`.
- Respect `prefers-reduced-motion` by reducing duration tokens.

## API Contract

- Consumers import only what they need (tree-shakable CSS entry points).
- Theme switching can be done with attributes (`[data-theme]`) or media queries.
- No JS theme manager required in v1.
