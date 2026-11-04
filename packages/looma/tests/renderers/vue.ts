export const rendererTarget = "vue";
import { createApp, createSSRApp, defineComponent, h, nextTick, onBeforeUnmount, onMounted, onUpdated, shallowRef, type VNode } from "vue";
import { renderToString } from "vue/server-renderer";
import { component, componentProps, connectNode } from "./component";
import type { MountedScene, NativeSceneComponent, Scene, SceneNode, SceneSlots, SceneValue } from "./scene";

const nativeComponents = new WeakMap<object, ReturnType<typeof defineComponent>>();
function nativeComponent(component: NativeSceneComponent) {
  let view = nativeComponents.get(component);
  if (view) return view;
  view = defineComponent({ inheritAttrs: false, setup(_props, { attrs }) {
    const container = shallowRef<HTMLElement>();
    let mounted: MountedScene | undefined;
    onMounted(() => { mounted = component.mount(container.value!, () => attrs); });
    onUpdated(() => mounted?.update());
    onBeforeUnmount(() => mounted?.unmount());
    return () => h("div", { ref: container });
  } });
  nativeComponents.set(component, view);
  return view;
}

// A converted component is rendered as itself, as an application renders it: a table reads its
// accepted columns from its slot's vnodes by component identity. Each instance keeps one connection.
const connections = new WeakMap<object, { node: SceneNode; connection: ReturnType<typeof connectNode> }>();
function convertedProps(node: SceneNode) {
  const sync = (vnode: VNode) => {
    const instance = vnode.component!;
    let entry = connections.get(instance);
    if (!entry) {
      entry = { node, connection: undefined! };
      const current = entry;
      entry.connection = connectNode(() => current.node);
      connections.set(instance, entry);
    }
    entry.node = node; entry.connection.attach(vnode.el as Element); entry.connection.update();
  };
  return { ...componentProps(node), onVnodeMounted: sync, onVnodeUpdated: sync,
    onVnodeBeforeUnmount: (vnode: VNode) => { connections.get(vnode.component!)?.connection.destroy(); connections.delete(vnode.component!); } };
}

const nativeNodes = new WeakMap<Element, { node: SceneNode; connection: ReturnType<typeof connectNode> }>();
function nativeProps(node: SceneNode) {
  const update = ({ el }: VNode) => {
    if (!(el instanceof Element)) return;
    let entry = nativeNodes.get(el);
    if (!entry) {
      entry = { node, connection: undefined! };
      entry.connection = connectNode(() => entry!.node);
      nativeNodes.set(el, entry);
    }
    entry.node = node; entry.connection.attach(el); entry.connection.update();
  };
  return { ...componentProps(node), onVnodeMounted: update, onVnodeUpdated: update,
    onVnodeBeforeUnmount: ({ el }: VNode) => { if (el instanceof Element) { nativeNodes.get(el)?.connection.destroy(); nativeNodes.delete(el); } } };
}

function output(value: SceneValue): any {
  if (Array.isArray(value)) return value.map(output);
  if (value === null || typeof value !== "object") return value;
  const node = value as SceneNode;
  const type = component(node.type);
  const children = node.children;
  const slots = typeof children === "function" ? () => output(children())
    : children && typeof children === "object" && !Array.isArray(children) && !("type" in children && "props" in children)
      ? Object.fromEntries(Object.entries(children as SceneSlots).map(([name, render]) => [name, (props: any) => output(render(props))]))
      : output(children as SceneValue);
  if (type) return h(type.implementation as any, convertedProps(node), slots);
  if (node.type && typeof node.type === "object" && "kind" in node.type && node.type.kind === "native-scene") return h(nativeComponent(node.type as NativeSceneComponent), node.props, slots);
  return h(node.type as any, nativeProps(node), slots);
}

export function mount(scene: Scene, target: Element, hydrate: boolean): MountedScene {
  const version = shallowRef(0);
  const app = (hydrate ? createSSRApp : createApp)({ render: () => { version.value; return output(scene.render()); } });
  app.config.errorHandler = error => { if (scene.onError) scene.onError(error); else throw error; };
  app.config.warnHandler = message => { if (scene.onWarning) scene.onWarning(message); else console.warn(message); };
  app.mount(target);
  return { update() { version.value++; }, unmount() { app.unmount(); } };
}
export async function renderHTML(scene: Scene): Promise<string> { return renderToString(createSSRApp({ render: () => output(scene.render()) })); }
export const settle = nextTick;
