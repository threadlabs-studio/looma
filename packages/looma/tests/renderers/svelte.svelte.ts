import { hydrate, mount as mountComponent, tick, unmount } from "svelte";
import { renderPrepared } from "@threadlabs/looma";
import SvelteScene from "./SvelteScene.svelte";
import type { MountedScene, Scene } from "./scene";

export function mount(scene: Scene, target: Element, hydration: boolean): MountedScene {
  let value = $state.raw(scene.render());
  const component = (hydration ? hydrate : mountComponent)(SvelteScene, { target, props: { get value() { return value; } } });
  return { update() { value = scene.render(); }, unmount() { void unmount(component); } };
}
export async function renderHTML(scene: Scene): Promise<string> { return renderPrepared(SvelteScene, { props: { value: scene.render() } }); }
export const settle = tick;
