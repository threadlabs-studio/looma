# @threadlabs/looma-layout

> Internal implementation workspace. Consumers install `@threadlabs/looma` and
> import `@threadlabs/looma/layout` or `@threadlabs/looma/layout.css`.

Six light-DOM layout elements that use token-driven gaps and never add external margins.

Release status: Candidate `0.1.3`. The public elements are `ui-stack`, `ui-inline`, `ui-cluster`, `ui-grid`, `ui-center`, and `ui-separator`.

## Install

```sh
pnpm add @threadlabs/looma-layout @threadlabs/looma-tokens
```

## Use

```ts
import "@threadlabs/looma-tokens/tokens.css";
import "@threadlabs/looma-layout/layout.css";
import "@threadlabs/looma-layout";
```

```html
<ui-stack gap="md">
  <h2>Profile</h2>
  <p>Account details</p>
</ui-stack>
```

The elements preserve their child markup before upgrade. Both ESM and CommonJS entry points are real build targets because the documentation server bundle consumes CommonJS.

See the [R1 support matrix](https://github.com/threadlabs-studio/looma/blob/main/docs/release-support-matrix.md) and [component docs](https://threadlabs-studio.github.io/looma/). Report problems in the [issue tracker](https://github.com/threadlabs-studio/looma/issues).

Licensed under [MIT](https://github.com/threadlabs-studio/looma/blob/main/LICENSE).
