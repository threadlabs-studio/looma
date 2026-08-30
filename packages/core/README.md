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

See the [component contracts](https://threadlabs-studio.github.io/looma/), [qualification guide](https://github.com/threadlabs-studio/looma/blob/main/docs/component-qualification-guide.md), and [R1 support matrix](https://github.com/threadlabs-studio/looma/blob/main/docs/release-support-matrix.md). Report problems in the [issue tracker](https://github.com/threadlabs-studio/looma/issues).

The legal license link is intentionally pending owner approval; publication is blocked until it is present.
