<script lang="ts">
  import { untrack } from "svelte";
  import { createAttachmentKey } from "svelte/attachments";
  import type { Snippet } from "svelte";
  import SvelteScene from "./SvelteScene.svelte";
  import { component, componentProps, connectNode } from "./component";
  import type { NativeSceneComponent, SceneNode, SceneSlots, SceneValue } from "./scene";

  let { value }: { value: SceneValue } = $props();
  const key = createAttachmentKey();
  const connection = connectNode(() => value as SceneNode);
  const attach = (element: Element) => { untrack(() => connection.attach(element)); return () => untrack(() => connection.destroy()); };
  $effect(() => { value; untrack(() => connection.update()); });
  const node = $derived(value as SceneNode);
  const type = $derived(component(node?.type));
  const names = $derived(node?.children && typeof node.children === "object" && !Array.isArray(node.children) && !("type" in node.children) ? Object.keys(node.children).filter(name => name !== "default") : []);
  const slots: Record<string, Snippet> = $derived.by(() => { names; return {}; });
  const register = (name: string, snippet: Snippet) => { slots[name] = snippet; return ""; };
  function children(props?: unknown): SceneValue {
    const source = node.children;
    if (typeof source === "function") return source(props);
    if (source && typeof source === "object" && !Array.isArray(source) && !("type" in source)) return (source as SceneSlots).default?.(props);
    return source as SceneValue;
  }
  const hasChildren = $derived(node?.children !== undefined && (typeof node.children !== "object" || node.children === null || Array.isArray(node.children) || "type" in node.children || "default" in node.children));
  const voidElement = (name: unknown) => typeof name === "string" && /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(name);
  function svelteProps(node: SceneNode) {
    const props = componentProps(node);
    if (props.style !== null && typeof props.style === "object") {
      props.style = Object.entries(props.style).filter(([, value]) => value != null).map(([name, value]) =>
        `${name.startsWith("--") ? name : name.replace(/^ms(?=[A-Z])/, "-ms").replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}: ${value}`).join("; ");
    }
    for (const name of component(node.type)?.requests ?? []) {
      const callback = "on" + name.split("-").map(part => part[0]!.toUpperCase() + part.slice(1)).join("");
      if (!Object.hasOwn(props, callback)) continue;
      props[`on${name}`] = props[callback];
      delete props[callback];
    }
    return props;
  }
</script>

{#if Array.isArray(value)}
  {#each value as child, index ((child && typeof child === "object" && !Array.isArray(child) ? (child as SceneNode).props?.key : undefined) ?? index)}
    <SvelteScene value={child} />
  {/each}
{:else if value !== null && value !== undefined && typeof value !== "boolean"}
  {#if typeof value !== "object"}
    {value}
  {:else if type}
    {#each names as name (name)}
      {#snippet slotContent(props: unknown)}
        <SvelteScene value={(node.children as SceneSlots)[name]?.(props)} />
      {/snippet}
      {register(name, slotContent)}
    {/each}
    {#snippet defaultContent(props: unknown)}
      <SvelteScene value={children(props)} />
    {/snippet}
    {@const Implementation = type.implementation as any}
    <Implementation {...svelteProps(node)} {slots} children={hasChildren ? defaultContent : undefined} {...{ [key]: attach }} />
  {:else if node.type && typeof node.type === "object" && "kind" in node.type && node.type.kind === "native-scene"}
    <div {@attach element => {
      const mounted = (node.type as NativeSceneComponent).mount(element, () => node.props);
      $effect(() => { node; mounted.update(); });
      return () => mounted.unmount();
    }}></div>
  {:else if voidElement(node.type)}
    <svelte:element this={node.type as string} {...svelteProps(node)} {@attach attach} />
  {:else}
    <svelte:element this={node.type as string} {...svelteProps(node)} {@attach attach}>
      <SvelteScene value={children()} />
    </svelte:element>
  {/if}
{/if}
