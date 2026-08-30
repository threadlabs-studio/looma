# @looma/layout

Six light-DOM layout elements that use token-driven gaps and never add external margins.

Release status: Candidate `0.1.0`. The public elements are `ui-stack`, `ui-inline`, `ui-cluster`, `ui-grid`, `ui-center`, and `ui-separator`.

## Install

```sh
pnpm add @looma/layout @looma/tokens
```

## Use

```ts
import "@looma/tokens/tokens.css";
import "@looma/layout/layout.css";
import "@looma/layout";
```

```html
<ui-stack gap="md">
  <h2>Profile</h2>
  <p>Account details</p>
</ui-stack>
```

The elements preserve their child markup before upgrade. Both ESM and CommonJS entry points are real build targets because the documentation server bundle consumes CommonJS.

See the [R1 support matrix](../../docs/release-support-matrix.md).
