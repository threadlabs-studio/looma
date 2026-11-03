export const rendererTarget = "html-next";
import { componentRegistry, regionChanged, scopedTemplate, serverProjection, slotRegion, RequestEvent, knownResponder, type ScopedRecord } from "@nextwebwg/html-next/generated-runtime";
import { renderNativeScene } from "@looma-test/native-server";
import { component, componentProps, connectNode, type SceneComponent } from "./component";
import type { MountedScene, NativeSceneComponent, Scene, SceneNode, SceneSlots, SceneValue } from "./scene";

const booleans = new Set("disabled required hidden inert multiple autofocus readonly open controls loop muted autoplay allowfullscreen formnovalidate novalidate reversed ismap nomodule checked selected".split(" "));
const values = (value: SceneValue): (SceneNode | string | number)[] => Array.isArray(value) ? value.flatMap(values) : value === null || value === undefined || typeof value === "boolean" ? [] : [value as SceneNode | string | number];
const slotValue = (node: SceneNode, name: string, props?: any): SceneValue => typeof node.children === "function" ? name === "" ? node.children(props) : undefined
  : node.children && typeof node.children === "object" && !Array.isArray(node.children) && !("type" in node.children) ? (node.children as SceneSlots)[name || "default"]?.(props)
  : name === "" ? node.children as SceneValue : undefined;
const hasSlot = (node: SceneNode, name: string): boolean => typeof node.children === "function" ? name === ""
  : node.children && typeof node.children === "object" && !Array.isArray(node.children) && !("type" in node.children)
    ? Object.hasOwn(node.children, name || "default") : name === "" && node.children !== undefined;
const attributes = (node: SceneNode) => Object.fromEntries(Object.entries(componentProps(node)).filter(([name]) => name !== "key" && !component(node.type)?.props.includes(name)).map(([name, value]) => [name, typeof value === "boolean" && !booleans.has(name.toLowerCase()) ? String(value) : value]));

function updateAttributes(root: Element, previous: Record<string, any>, next: Record<string, any>): void {
  for (const name of new Set([...Object.keys(previous), ...Object.keys(next)])) {
    const value = next[name];
    if (Object.is(value, previous[name])) continue;
    if (name === "class") {
      for (const token of String(previous[name] ?? "").split(/\s+/).filter(Boolean)) root.classList.remove(token);
      for (const token of String(value ?? "").split(/\s+/).filter(Boolean)) root.classList.add(token);
    } else if (name === "style" && (value && typeof value === "object" || previous[name] && typeof previous[name] === "object")) {
      const before = previous[name] ?? {}, after = value ?? {};
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        const style = (root as HTMLElement).style;
        if (key.includes("-")) style.setProperty(key, after[key] == null ? "" : String(after[key]));
        else Reflect.set(style, key, after[key] == null ? "" : String(after[key]));
      }
    } else if (["value", "checked", "indeterminate", "selected"].includes(name)) Reflect.set(root, name, value);
    else if (value === null || value === undefined || value === false) root.removeAttribute(name);
    else root.setAttribute(name, value === true ? "" : String(value));
  }
}

interface View { key: unknown; type: unknown; start: Comment; end: Comment; update(value: SceneNode | string | number): void; destroy(): void; }
function nodes(view: View): Node[] {
  const nodes: Node[] = [];
  for (let node: Node | null = view.start; node; node = node.nextSibling) { nodes.push(node); if (node === view.end) break; }
  return nodes;
}
function region(name = "", existing: Node[] = []) {
  const start = document.createComment("html-next:start"), end = document.createComment("html-next:end");
  const fragment = document.createDocumentFragment(); fragment.append(start, ...existing, end);
  slotRegion(start, end, name);
  let children: View[] = [];
  return {
    start, end, fragment,
    update(value: SceneValue) {
      const next: View[] = [];
      let cursor: ChildNode | null = start.nextSibling;
      for (const [index, valueNode] of values(value).entries()) {
        const type = typeof valueNode === "object" ? valueNode.type : "text";
        const key = typeof valueNode === "object" ? valueNode.props.key ?? index : index;
        let view = children.find(child => child.key === key && child.type === type && !next.includes(child));
        if (!view) view = createView(valueNode, key, cursor === end ? undefined : cursor);
        else view.update(valueNode);
        // A new adopted view has just placed its start before the existing root at cursor.
        if (view.start !== cursor && view.start.nextSibling !== cursor) (cursor ?? end).before(...nodes(view));
        next.push(view); cursor = view.end.nextSibling;
      }
      for (const child of children) if (!next.includes(child)) child.destroy();
      children = next;
      // Existing server nodes consumed by new views are enclosed by their own marks above.
      for (let node = start.nextSibling; node && node !== end;) {
        if (children.some(view => view.start === node)) { node = children.find(view => view.start === node)!.end.nextSibling; continue; }
        const next = node.nextSibling; node.remove(); node = next;
      }
      regionChanged(start);
    },
    destroy() { for (const child of children) child.destroy(); start.remove(); end.remove(); },
  };
}

const connections = new Set<() => void>();
function createView(initial: SceneNode | string | number, key: unknown, candidate?: ChildNode): View {
  const start = document.createComment("html-next:start"), end = document.createComment("html-next:end");
  const fragment = document.createDocumentFragment();
  const type = typeof initial === "object" ? initial.type : "text";
  let current = initial;
  let root: Node;
  let update = (_value: SceneNode | string | number) => {};
  const cleanups: (() => void)[] = [];
  if (type === "text") {
    root = candidate?.nodeType === 3 ? candidate : document.createTextNode(String(initial));
    update = value => { if (root.nodeValue !== String(value)) root.nodeValue = String(value); };
  } else {
    const node = initial as SceneNode;
    const definition = component(type);
    const connection = connectNode(() => current as SceneNode);
    const element = () => {
      for (let node = start.nextSibling; node && node !== end; node = node.nextSibling) if (node.nodeType === 1) return node as Element;
    };
    const sync = () => { connection.attach(element()); connection.update(); };
    connections.add(sync); cleanups.push(() => { connections.delete(sync); connection.destroy(); });
    if (definition) {
      const regions = new Map<string, ReturnType<typeof region>>();
      const scoped: { name: string; records: Set<ScopedRecord> }[] = [];
      const nativeRoot = candidate?.nodeType === 1 && (candidate as Element).matches(`:is([component~="${definition.tag}"], [data-component~="${definition.tag}"])`) ? candidate as Element : undefined;
      const old = nativeRoot ? serverProjection(nativeRoot, definition.tag) : undefined;
      const children: Node[] = [], slots: Record<string, Node[]> = {};
      for (const slot of definition.slots) {
        if (!hasSlot(node, slot.name)) continue;
        if (slot.props.length > 0) {
          const supplied = node.children && typeof node.children === "object" && !Array.isArray(node.children) ? (node.children as SceneSlots)[slot.name || "default"] : undefined;
          if (!supplied) continue;
          const carrier = document.createElement("template"); carrier.setAttribute("slot", slot.name);
          const records = new Set<ScopedRecord>(); scoped.push({ name: slot.name, records });
          const template = scopedTemplate(carrier, {
            l: records,
            m(_dirty, props) {
              const content = region(slot.name); content.update(slotValue(current as SceneNode, slot.name, props));
              return { n: content.fragment, s: props, z: [() => content.destroy()], content } as ScopedRecord;
            },
            p(record) { (record as ScopedRecord & { content: ReturnType<typeof region> }).content.update(slotValue(current as SceneNode, slot.name, record.s)); },
          });
          void template;
          (slot.name ? slots[slot.name] ??= [] : children).push(carrier);
        } else {
          const content = region(slot.name, old ? slot.name ? old[1][slot.name] ?? [] : old[0] : []);
          content.update(slotValue(node, slot.name)); regions.set(slot.name, content);
          (slot.name ? slots[slot.name] ??= [] : children).push(...content.fragment.childNodes);
        }
      }
      const props = (node: SceneNode) => Object.fromEntries(Object.entries(node.props).filter(([name]) => definition.inputs.includes(name)));
      const factory = definition.implementation as (options: object, html?: unknown, root?: Element) => Element;
      root = factory({ ...props(node), attributes: attributes(node), children, slots }, undefined, nativeRoot);
      let previousAttributes = attributes(node);
      let previousProps = props(node);
      cleanups.push(() => { for (const content of regions.values()) content.destroy(); for (const { records } of scoped) for (const record of records) (record as ScopedRecord & { content: ReturnType<typeof region> }).content.destroy(); });
      let connectedRoot: Element | undefined;
      let responderKey = "";
      const responders: (() => void)[] = [];
      const connect = () => {
        const next = element();
        const supplied = definition.requests.filter(name => {
          const camel = name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
          return typeof (current as SceneNode).props[camel] === "function" || typeof (current as SceneNode).props["on" + camel[0]!.toUpperCase() + camel.slice(1)] === "function";
        });
        const key = supplied.join("|");
        if (!next || next === connectedRoot && key === responderKey) return;
        responderKey = key;
        responders.splice(0).forEach(stop => stop()); connectedRoot = next;
        for (const name of supplied) {
          const camel = name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
          if (typeof (current as SceneNode).props[camel] === "function") responders.push(RequestEvent.respond(next, name, (detail, init) => (current as SceneNode).props[camel](detail, init)));
          else {
            const callback = "on" + camel[0]!.toUpperCase() + camel.slice(1);
            const listen = (event: Event) => (current as SceneNode).props[callback]?.(event);
            const forget = knownResponder(next, name);
            next.addEventListener(name, listen);
            responders.push(() => { next.removeEventListener(name, listen); forget(); });
            next.dispatchEvent(new CustomEvent("responder", { bubbles: true, detail: { name } }));
          }
        }
      };
      connections.add(connect); cleanups.push(() => { connections.delete(connect); responders.splice(0).forEach(stop => stop()); });
      update = value => {
        current = value; const node = value as SceneNode;
        const nextProps = props(node);
        componentRegistry.update(element() ?? root as Element, { ...Object.fromEntries(Object.keys(previousProps).filter(name => !Object.hasOwn(nextProps, name)).map(name => [name, undefined])), ...nextProps });
        previousProps = nextProps;
        const nextAttributes = attributes(node);
        updateAttributes(element() ?? root as Element, previousAttributes, nextAttributes);
        previousAttributes = nextAttributes;
        for (const [name, content] of regions) content.update(slotValue(node, name));
        for (const { name, records } of scoped) for (const record of records) (record as ScopedRecord & { content: ReturnType<typeof region> }).content.update(slotValue(node, name, record.s));
        sync(); connect();
      };
    } else if (type && typeof type === "object" && "kind" in type && type.kind === "native-scene") {
      root = document.createElement("div");
      const mounted = (type as NativeSceneComponent).mount(root as HTMLElement, () => (current as SceneNode).props);
      update = value => { current = value; mounted.update(); }; cleanups.push(() => mounted.unmount());
    } else {
      const tag = type as string;
      root = candidate?.nodeType === 1 && (candidate as Element).localName === tag ? candidate : tag === "svg" || tag === "path" ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
      let previous: Record<string, any> = {};
      const child = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag) ? undefined : region("", Array.from(root.childNodes)); if (child) root.append(child.fragment);
      update = value => {
        current = value; const node = value as SceneNode; const next = attributes(node);
        updateAttributes(root as Element, previous, next);
        previous = next; child?.update(slotValue(node, "")); sync();
      };
      cleanups.push(() => child?.destroy()); update(node);
    }
  }
  if (root.parentNode) { root.before(start); root.after(end); } else fragment.append(start, root, end);
  return { key, type, start, end, update(value) { current = value; update(value); }, destroy() { cleanups.splice(0).forEach(stop => stop()); for (const node of nodes(this)) node.parentNode?.removeChild(node); root.parentNode?.removeChild(root); } };
}

export function mount(scene: Scene, target: Element, hydrate: boolean): MountedScene {
  if (!hydrate) target.replaceChildren();
  const content = region("", Array.from(target.childNodes)); target.append(content.fragment);
  const sync = () => { for (const connect of connections) connect(); };
  content.update(scene.render()); sync();
  const observer = new MutationObserver(sync); observer.observe(target, { childList: true, subtree: true });
  return { update() { content.update(scene.render()); sync(); }, unmount() { observer.disconnect(); content.destroy(); } };
}
export const renderHTML = renderNativeScene;
export async function settle(): Promise<void> { await new Promise(resolve => setTimeout(resolve, 0)); }
