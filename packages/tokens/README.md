# @threadlabs/looma-tokens

> Internal implementation workspace. Consumers install `@threadlabs/looma` and
> import its explicit token and theme CSS subpaths.

CSS-only design tokens and light, dark, and high-contrast themes for Looma.

Release status: Candidate `0.1.13`. The API may evolve before Stable.

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
