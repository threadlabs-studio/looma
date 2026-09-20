# @threadlabs/looma-core

> Internal implementation workspace. Consumers install `@threadlabs/looma` and
> use its root or `/core` subpath.

Looma's component surface is a framework-neutral declarative graph with consumer-authored semantic
light-DOM fallback. The retained Stencil sources are migration ingest fixtures, not the shipped
runtime or public API.

Release status: Candidate `0.2.6`, not Stable.

## Install

```sh
pnpm add @threadlabs/looma-core @threadlabs/looma-tokens
```

## Use

```ts
import "@threadlabs/looma-tokens/tokens.css";
import "@threadlabs/looma-core/styles.css";
import "@threadlabs/looma-core";
```

```html
<ui-button variant="solid">
  <button type="button">Save</button>
</ui-button>
```

The real button is the no-JS semantic fallback. Looma lowers the invocation to a native light-DOM
root, then attaches styling, state synchronization, methods, and declared events. Public modules
remain safe to import during SSR, and no custom-element registry is required.

See the [component contracts](https://threadlabs-studio.github.io/looma/), [qualification guide](https://github.com/threadlabs-studio/looma/blob/main/docs/component-qualification-guide.md), and [R1 support matrix](https://github.com/threadlabs-studio/looma/blob/main/docs/release-support-matrix.md). Report problems in the [issue tracker](https://github.com/threadlabs-studio/looma/issues).

Licensed under [MIT](https://github.com/threadlabs-studio/looma/blob/main/LICENSE).
