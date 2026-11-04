export const rendererTarget = "vue";
import { createApp, createSSRApp, defineComponent, h, nextTick, onBeforeUnmount, onMounted, onUpdated, shallowRef, type VNode } from "vue";
import { renderToString } from "vue/server-renderer";
import { component, componentProps, connectNode, type SceneComponent } from "./component";
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

const components = new WeakMap<SceneComponent, ReturnType<typeof defineComponent>>();
function convertedComponent(type: SceneComponent) {
  let view = components.get(type);
  if (view) return view;
  view = defineComponent({ props: ["scene"], inheritAttrs: false, setup(props, { slots, attrs }) {
    const root = shallowRef<{ $el: Element } | Element>();
    const connection = connectNode(() => props.scene as SceneNode);
    const sync = () => { const value = root.value; connection.attach(value && "$el" in value ? value.$el : value); connection.update(); };
    onBeforeUnmount(() => connection.destroy());
    return () => h(type.implementation as any, { ...componentProps(props.scene), ...attrs, ref: root, onVnodeMounted: sync, onVnodeUpdated: sync }, slots);
  } });
  components.set(type, view);
  return view;
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
  if (type) return h(convertedComponent(type), { scene: node, key: node.props.key }, slots);
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
