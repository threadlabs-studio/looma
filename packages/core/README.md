# @looma/core

Looma's Candidate web-component surface: 26 Stencil elements with shadow-root behavior and consumer-authored semantic light-DOM fallback.

Release status: Candidate `0.1.0`, not Stable.

## Install

```sh
pnpm add @looma/core @looma/tokens
```

## Use

```ts
import "@looma/tokens/tokens.css";
import "@looma/core/styles.css";
import "@looma/core";
```

```html
<ui-button variant="solid">
  <button type="button">Save</button>
</ui-button>
```

The real button is the no-JS semantic fallback. Looma's shadow UI, styling, state synchronization, and custom events arrive after upgrade. Public modules must remain safe to import during SSR.

See the [component contracts](../../apps/docs/docs/components), [qualification guide](../../docs/component-qualification-guide.md), and [R1 support matrix](../../docs/release-support-matrix.md).
