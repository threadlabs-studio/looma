import React from "react";

import {
  FrameworkModeCode,
  FrameworkModeSelector,
  type FrameworkExamples
} from "./FrameworkMode";

const examples: FrameworkExamples = {
  "html-next": {
    language: "html",
    code: `<script type="module">
  import "@threadlabs/looma/layout";
  import "@threadlabs/looma";
</script>

<ui-stack gap="m">
  <h2>Account</h2>
  <ui-button variant="solid">
    <button type="button">Save</button>
  </ui-button>
</ui-stack>`
  },
  vue: {
    language: "vue",
    code: `<script setup lang="ts">
import { Button, Stack } from "@threadlabs/looma/vue";
</script>

<template>
  <Stack gap="m">
    <h2>Account</h2>
    <Button variant="solid">
      <button type="button">Save</button>
    </Button>
  </Stack>
</template>`
  },
  react: {
    language: "tsx",
    code: `import { Button, Stack } from "@threadlabs/looma-react";

export function AccountActions() {
  return (
    <Stack gap="m">
      <h2>Account</h2>
      <Button variant="solid">
        <button type="button">Save</button>
      </Button>
    </Stack>
  );
}`
  },
  svelte: {
    language: "svelte",
    code: `<script lang="ts">
  import { onMount } from "svelte";
  import { createUiButton, createUiStack } from "@threadlabs/looma-svelte";

  let host: HTMLDivElement;
  onMount(() => {
    const save = Object.assign(document.createElement("button"), {
      type: "button",
      textContent: "Save"
    });
    const button = createUiButton({ variant: "solid", children: [save] });
    host.replaceChildren(createUiStack({ gap: "m", children: [button] }));
  });
</script>

<div bind:this={host}></div>`
  }
};

/**
 * Explains the architectural invariant behind all framework examples: adapters
 * project one declarative contract instead of redefining component semantics.
 */
export function DeclarativeModel(): JSX.Element {
  return (
    <section className="looma-model" aria-labelledby="looma-model-title">
      <div className="looma-model__intro">
        <p className="looma-model__eyebrow">One model, four authoring modes</p>
        <h2 id="looma-model-title">The component contract comes first</h2>
        <p>
          A Looma definition declares the component tag, native light-DOM root,
          inputs, methods, events, slots, and controller behavior. HTML Next is
          the canonical form. Vue, React, and Svelte project that same contract
          into their own lifecycle—they do not invent four competing APIs.
        </p>
      </div>

      <ol className="looma-model__steps">
        <li>
          <span>1</span>
          <strong>Author declaratively</strong>
          <p>Semantic content exists before JavaScript and remains visible to the platform.</p>
        </li>
        <li>
          <span>2</span>
          <strong>Lower to a native root</strong>
          <p>The runtime attaches the declared state and controller without a shadow-root bridge.</p>
        </li>
        <li>
          <span>3</span>
          <strong>Project into a host</strong>
          <p>Framework adapters own lifecycle integration while preserving the same public contract.</p>
        </li>
      </ol>

      <div className="looma-model__example">
        <div>
          <h3>The same component, expressed for your host</h3>
          <p>
            HTML Next is selected by default. React and Svelte show the current
            repository-preview adapters; the live result still exercises the same Looma definition.
          </p>
        </div>
        <FrameworkModeSelector />
        <FrameworkModeCode examples={examples} />
      </div>
    </section>
  );
}
