# @threadlabs/looma-tokens

## Product theming

Looma separates brand primitives from interaction roles. Set the semantic role
tokens when a product needs an intentional action/control palette without
rewriting component CSS:

```css
:root {
  --ui-action-primary-surface: #174f45;
  --ui-action-primary-surface-hover: #103e36;
  --ui-action-primary-surface-active: #0b302a;
  --ui-action-primary-text: #ffffff;
  --ui-control-border: #a9b7b3;
  --ui-control-border-hover: #667b75;
  --ui-control-focus: #174f45;
  --ui-control-focus-halo: #dcebe7;
}
```

`--ui-accent-*` remains the default source for these roles. Override the roles
only when action hierarchy or control contrast should differ from the broader
brand accent.

> Internal implementation workspace. Consumers install `@threadlabs/looma` and
> import its explicit token and theme CSS subpaths.

CSS-only design tokens and light, dark, and high-contrast themes for Looma.

Release status: Candidate `0.1.25`. The API may evolve before Stable.

## Install

```sh
pnpm add @threadlabs/looma-tokens
```

## Use

```css
@import "@threadlabs/looma-tokens/tokens.css";
@import "@threadlabs/looma-tokens/theme-light.css";
```

Choose one explicit theme file when the application does not supply its own semantic-token overrides. The package exports CSS only and has no JavaScript runtime.

See the [token contract](https://github.com/threadlabs-studio/looma/blob/main/docs/tokens.md) and [R1 support matrix](https://github.com/threadlabs-studio/looma/blob/main/docs/release-support-matrix.md). Report problems in the [issue tracker](https://github.com/threadlabs-studio/looma/issues).

Licensed under [MIT](https://github.com/threadlabs-studio/looma/blob/main/LICENSE).
