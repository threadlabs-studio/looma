export const rendererTarget = "react";
import { createElement, useCallback, useLayoutEffect, useRef } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderPrepared } from "@looma-test/implementations";
import { component, connectNode, jsxOutput, jsxProps, type NativeSceneComponent } from "./jsx";
import type { MountedScene, Scene, SceneNode } from "./scene";

function useConnection(node: SceneNode) {
  const current = useRef(node); current.current = node;
  const connection = useRef<ReturnType<typeof connectNode> | undefined>(undefined);
  connection.current ??= connectNode(() => current.current);
  const ref = useCallback((element: Element | null) => connection.current!.attach(element), []);
  useLayoutEffect(() => { connection.current!.update(); });
  useLayoutEffect(() => () => connection.current!.destroy(), []);
  return ref;
}
function Component({ scene, ...projected }: { scene: SceneNode; [name: string]: any }) {
  const type = component(scene.type)!;
  return createElement(type.implementation as any, { ...jsxProps(scene), ...projected, ...children(scene, type), ref: useConnection(scene) });
}
function Native({ scene, ...projected }: { scene: SceneNode; [name: string]: any }) {
  return createElement(scene.type as any, { ...jsxProps(scene), ...projected, ...children(scene), ref: useConnection(scene) });
}
function Fixture({ scene }: { scene: SceneNode }) {
  const container = useRef<HTMLDivElement>(null), current = useRef(scene); current.current = scene;
  const view = useRef<MountedScene | undefined>(undefined);
  useLayoutEffect(() => { view.current = (current.current.type as NativeSceneComponent).mount(container.current!, () => current.current.props); return () => view.current?.unmount(); }, []);
  useLayoutEffect(() => view.current?.update());
  return createElement("div", { ref: container });
}
const { output, children } = jsxOutput(createElement, Component, Native, Fixture);
export function mount(scene: Scene, target: Element, hydrate: boolean): MountedScene {
  const options = { onUncaughtError: (error: unknown) => { if (scene.onError) scene.onError(error); else queueMicrotask(() => { throw error; }); } };
  const root = hydrate ? hydrateRoot(target, output(scene.render()), options) : createRoot(target, options);
  if (!hydrate) root.render(output(scene.render()));
  return { update() { root.render(output(scene.render())); }, unmount() { root.unmount(); } };
}
export async function renderHTML(scene: Scene): Promise<string> { return renderPrepared(output(scene.render())); }
export async function settle(): Promise<void> { await new Promise(resolve => setTimeout(resolve, 0)); }
