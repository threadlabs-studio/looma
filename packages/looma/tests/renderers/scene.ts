import { rendererTarget as expectedRenderer } from "@looma-test/components";
import * as renderer from "@looma-test/renderer";

/** Values supplied by a scenario, before any framework creates a view. */
export type SceneValue = SceneNode | string | number | boolean | null | undefined | readonly SceneValue[];
export type SceneSlots = Readonly<Record<string, (props?: any) => SceneValue>>;
export interface SceneNode {
  readonly type: unknown;
  readonly props: Record<string, any>;
  readonly children?: SceneValue | SceneSlots | ((props?: any) => SceneValue);
}
export interface State<T> { value: T }
export interface MountedScene { update(): void; unmount(): void }
export interface NativeSceneComponent {
  readonly kind: "native-scene";
  mount(container: HTMLElement, props: () => Readonly<Record<string, any>>): MountedScene;
}
export interface Scene {
  readonly render: () => SceneValue;
  onError?: (error: unknown) => void;
  onWarning?: (message: string) => void;
  mount(target: string | Element): void;
  unmount(): void;
}

const mounted = new Set<MountedScene>();
let pending: Promise<void> | undefined;
function schedule(): void {
  pending ??= Promise.resolve().then(() => {
    pending = undefined;
    for (const scene of mounted) scene.update();
  });
}

export function createState<T>(initial: T): State<T> {
  const observe = (value: T): T => value !== null && typeof value === "object" && (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype) ? stateObject(value) : value;
  let raw = initial;
  let value = observe(initial);
  return { get value() { return value; }, set value(next: T) { if (Object.is(next, value) || Object.is(next, raw)) return; raw = next; value = observe(next); schedule(); } };
}

export function stateObject<T extends object>(initial: T): T {
  const proxies = new WeakMap<object, object>();
  const observe = <V extends object>(value: V): V => {
    const cached = proxies.get(value);
    if (cached) return cached as V;
    const proxy = new Proxy(value, {
      get(target, key, receiver) {
        const item = Reflect.get(target, key, receiver);
        return item !== null && typeof item === "object" && (Array.isArray(item) || Object.getPrototypeOf(item) === Object.prototype) ? observe(item) : item;
      },
      set(target, key, next, receiver) {
        const previous = Reflect.get(target, key, receiver);
        const result = Reflect.set(target, key, next, receiver);
        if (!Object.is(previous, next)) schedule();
        return result;
      },
      deleteProperty(target, key) { const had = Reflect.has(target, key); const result = Reflect.deleteProperty(target, key); if (had) schedule(); return result; },
    });
    proxies.set(value, proxy);
    return proxy;
  };
  return observe(initial);
}

export function sceneNode(type: unknown, props?: Record<string, any> | SceneValue, children?: SceneNode["children"]): SceneNode {
  if (props === null || props === undefined) return { type, props: {}, children };
  if (typeof props !== "object" || Array.isArray(props) || "type" in props && "props" in props) return { type, props: {}, children: props as SceneValue };
  return { type, props: props as Record<string, any>, children };
}

function create(render: () => SceneValue, hydrate: boolean): Scene {
  if (renderer.rendererTarget !== expectedRenderer) throw new Error(`Expected ${expectedRenderer} renderer, received ${renderer.rendererTarget}.`);
  let view: MountedScene | undefined;
  const scene: Scene = {
    render,
    mount(target) {
      const element = typeof target === "string" ? document.querySelector(target) : target;
      if (!element) throw new Error(`Scene mount target is missing: ${target}`);
      if (view) throw new Error("A scene is already mounted.");
      view = renderer.mount(scene, element, hydrate);
      mounted.add(view);
    },
    unmount() { if (!view) return; mounted.delete(view); view.unmount(); view = undefined; },
  };
  return scene;
}
export const createScene = ({ render }: { render: () => SceneValue }): Scene => create(render, false);
export const createHydratedScene = ({ render }: { render: () => SceneValue }): Scene => create(render, true);
export const renderSceneToString = (scene: Scene): Promise<string> => renderer.renderHTML(scene);
export async function settle(): Promise<void> { await pending; await renderer.settle(); await pending; await renderer.settle(); }
