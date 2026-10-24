---
title: Looma
description: Declarative components, woven into the web platform.
layout: home
---

# Looma

The UI library built on Declarative HTML Components. Write a component as markup, and ship it as real native HTML or as Vue components compiled from the same definition.

[Get started](/getting-started/) · [Explore components](/components/) · [Weave your design system](/customize/)

```bash
pnpm add @threadlabs/looma
```

<link rel="component" href="@/app/components/looma-home-demo.html">

<looma-home-demo></looma-home-demo>

## One source, written as markup

Looma is built on [Declarative HTML Components](https://nextwebwg.org/html-next/), a proposal to give HTML its own reactive component model. Every component is written once; the same definition ships as native HTML and Vue.

::: code-group syntax
```html title="HTML Next"
<ui-button variant="solid">Save</ui-button>
```

```html title="Native output"
<button data-component="ui-button" data-ui-button-state="variant variant=solid">
  Save
</button>
```

```vue title="Vue"
<script setup lang="ts">
import { Button } from "@threadlabs/looma/vue";
</script>

<template>
  <Button variant="solid">Save</Button>
</template>
```
:::

A page gets a real native button, with the browser's focus, forms and accessibility. A Vue application gets an ordinary Vue component compiled from the same definition.

## The platform does the work

Components lower to native elements, styles scope with CSS `@scope`, and validity uses the browser's constraint validation. The component definitions own layout and behavior; themes change supported semantic properties.

## A few shared decisions, a complete design system

Choose your palette, type, size, spaciousness, corners, depth and motion. Shared formulas derive consistent control sizes, spacing scales, surfaces and feedback. Try the [customizer](/customize/) on the same component cards used in the reference, then download your theme.

Install the documentation generator with Looma to save that theme into your repository, document your own HTML Next components beside Looma's, and make these docs your design system.

## Support you can inspect

Read the [release support and limitations](/release-1-support/), the [component contract](/architecture/), and the [theme token reference](/tokens/).

[View Looma on GitHub](https://github.com/threadlabs-studio/looma)
