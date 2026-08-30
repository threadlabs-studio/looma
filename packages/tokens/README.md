# @looma/tokens

CSS-only design tokens and light, dark, and high-contrast themes for Looma.

Release status: Candidate `0.1.0`. The API may evolve before Stable.

## Install

```sh
pnpm add @looma/tokens
```

## Use

```css
@import "@looma/tokens/tokens.css";
@import "@looma/tokens/theme-light.css";
```

Choose one explicit theme file when the application does not supply its own semantic-token overrides. The package exports CSS only and has no JavaScript runtime.

See the repository [token contract](../../docs/tokens.md) and [R1 support matrix](../../docs/release-support-matrix.md).
