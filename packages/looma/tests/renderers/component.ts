import type { SceneNode, State } from "./scene";

export interface SceneComponent {
  readonly kind: "component";
  readonly name: string;
  readonly tag: string;
  readonly implementation: unknown;
  readonly props: readonly string[];
  readonly inputs: readonly string[];
  readonly requests: readonly string[];
  readonly events: readonly { name: string; fields: readonly string[] }[];
  readonly slots: readonly { name: string; props: readonly string[] }[];
  readonly nativeControl: boolean;
  readonly nativeHost?: string;
}
export function component(value: unknown): SceneComponent | undefined {
  return value !== null && typeof value === "object" && "kind" in value && value.kind === "component" ? value as SceneComponent : undefined;
}
const callback = (name: string): string => "on" + name.split("-").map(part => part[0]!.toUpperCase() + part.slice(1)).join("");

function eventName(name: string, type: SceneComponent | undefined): string | undefined {
  if (!/^on[A-Z]/.test(name) || type?.props.includes(name)) return;
  return type?.events.find(event => callback(event.name) === name || "on" + event.name[0]!.toUpperCase() + event.name.slice(1) === name)?.name ?? name.slice(2).toLowerCase();
}

/** Only declared inputs go through component APIs; event assertions observe the actual DOM stream. */
export function componentProps(node: SceneNode): Record<string, any> {
  const type = component(node.type);
  return Object.fromEntries(Object.entries(node.props).filter(([name]) => name !== "ref" && !name.startsWith("bind:") && eventName(name, type) === undefined));
}

/** One connection follows a scene node's native root through updates and root replacement. */
export function connectNode(read: () => SceneNode) {
  let root: Element | undefined;
  const listeners = new Map<string, EventListener>();
  const reported = new Map<string, unknown>();
  const nativeValues = new Map<string, unknown>();
  const receive = (event: Event): void => {
    const node = read();
    const type = component(node.type);
    const declared = type?.events.find(item => item.name === event.type);
    if (declared && (!(event instanceof CustomEvent) || event.target !== root)) return;
    for (const [name, handler] of Object.entries(node.props)) {
      if (eventName(name, type) === event.type && typeof handler === "function") handler(event);
      if (!name.startsWith("bind:") || typeof handler !== "function") continue;
      const field = name.slice(5);
      let value: unknown;
      if (declared?.fields.includes(field) && event instanceof CustomEvent && event.detail !== null && typeof event.detail === "object") value = event.detail[field];
      else if ((type?.nativeControl || typeof node.type === "string") && field === "value" && event.target === root && ["input", "change"].includes(event.type)) {
        const control = root as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        value = control instanceof HTMLInputElement && ["number", "range"].includes(control.type) ? Number.isNaN(control.valueAsNumber) ? null : control.valueAsNumber : control.value;
      } else continue;
      if (reported.has(field) && Object.is(reported.get(field), value)) continue;
      if (reported.size === 0) queueMicrotask(() => reported.clear());
      reported.set(field, value); handler(value);
    }
  };
  const detach = (): void => { if (root) for (const [name, listener] of listeners) root.removeEventListener(name, listener); listeners.clear(); };
  return {
    attach(element: Element | null | undefined): void {
      if (element === root) return;
      detach(); nativeValues.clear(); root = element ?? undefined;
      const ref = read().props.ref as State<Element | null> | ((root: Element | null) => void) | undefined;
      if (typeof ref === "function") ref(root ?? null); else if (ref) ref.value = root ?? null;
      this.update();
    },
    update(): void {
      if (!root) return;
      const node = read(), type = component(node.type);
      if (!type && typeof node.type === "string" && ["input", "textarea", "select"].includes(root.localName)) {
        for (const name of ["value", "checked"]) {
          if (!(name in node.props) || nativeValues.has(name) && Object.is(nativeValues.get(name), node.props[name])) continue;
          const value = node.props[name]; nativeValues.set(name, value);
          if (name === "value" && root.localName === "select" && Reflect.get(root, "multiple") && Array.isArray(value)) {
            const selected = new Set(value.map(String));
            for (const option of Array.from((root as HTMLSelectElement).options)) option.selected = selected.has(option.value);
          } else {
            const next = name === "checked" ? !!value : value == null ? "" : String(value);
            if (!Object.is(Reflect.get(root, name), next)) Reflect.set(root, name, next);
          }
        }
      }
      const events = new Set(Object.keys(node.props).flatMap(name => eventName(name, type) ?? []));
      if (Object.keys(node.props).some(name => name.startsWith("bind:"))) {
        for (const event of type?.events ?? []) events.add(event.name);
        if (type?.nativeControl || typeof node.type === "string") { events.add("input"); events.add("change"); }
      }
      for (const name of events) if (!listeners.has(name)) { listeners.set(name, receive); root.addEventListener(name, receive); }
      for (const [name, listener] of listeners) if (!events.has(name)) { root.removeEventListener(name, listener); listeners.delete(name); }
    },
    destroy(): void { this.attach(undefined); },
  };
}
