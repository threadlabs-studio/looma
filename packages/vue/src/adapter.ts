import {
  cloneVNode,
  defineComponent,
  h,
  isVNode,
  shallowRef,
  watchEffect,
  type ComponentPublicInstance,
} from "vue";

export interface VueAdapterEventMap {
  open: { open: boolean; reason: string; trigger: string };
  close: { open: boolean; reason: string; trigger: string };
  select: { value: string; previousValue?: string; trigger: string };
  change: { checked: boolean; value: string; trigger: string };
  input: { value: string; trigger: string };
  dismiss: { id: string; reason: string; trigger: string };
}

type AdapterCallbacks = {
  onOpen?: (detail: VueAdapterEventMap["open"]) => void;
  onClose?: (detail: VueAdapterEventMap["close"]) => void;
  onSelect?: (detail: VueAdapterEventMap["select"]) => void;
  onChange?: (detail: VueAdapterEventMap["change"]) => void;
  onInput?: (detail: VueAdapterEventMap["input"]) => void;
  onDismiss?: (detail: VueAdapterEventMap["dismiss"]) => void;
};

export type AdapterAttrs = AdapterCallbacks & Record<string, unknown>;

export type AdapterEventBinding = readonly [eventName: string, callbackAttr: string];

const BASE_EVENT_BINDINGS: readonly AdapterEventBinding[] = [
  ["open", "onOpen"],
  ["close", "onClose"],
  ["select", "onSelect"],
  ["change", "onChange"],
  ["input", "onInput"],
  ["dismiss", "onDismiss"],
];

export function toHTMLElement(
  value: Element | ComponentPublicInstance | null,
): HTMLElement | null {
  if (!value) return null;
  if (value instanceof HTMLElement) return value;
  return null;
}

export function createAdapterComponent(
  tagName: string,
  displayName: string,
  additionalEventBindings: readonly AdapterEventBinding[] = [],
) {
  const eventBindings = [...BASE_EVENT_BINDINGS, ...additionalEventBindings];
  const callbackAttrs = new Set(eventBindings.map(([, callbackAttr]) => callbackAttr));

  return defineComponent({
    name: displayName,
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      const elementRef = shallowRef<HTMLElement | null>(null);

      watchEffect((onCleanup) => {
        const element = elementRef.value;
        if (!element) return;

        const adapterAttrs = attrs as AdapterAttrs;
        const handlers: Array<[string, ((event: Event) => void) | undefined]> = eventBindings.map(
          ([eventName, callbackAttr]) => {
            const callback = adapterAttrs[callbackAttr];
            return [
              eventName,
              typeof callback === "function"
                ? (event: Event) => callback((event as CustomEvent<unknown>).detail)
                : undefined,
            ];
          },
        );

        for (const [eventName, handler] of handlers) {
          if (handler) element.addEventListener(eventName, handler);
        }

        onCleanup(() => {
          for (const [eventName, handler] of handlers) {
            if (handler) element.removeEventListener(eventName, handler);
          }
        });
      });

      return () => {
        const forwardedAttrs = Object.fromEntries(
          Object.entries(attrs).filter(([name]) => !callbackAttrs.has(name)),
        );

        const children = Object.entries(slots).flatMap(([slotName, slotFn]) => {
          if (!slotFn) return [];
          return slotFn().map((node) => {
            if (slotName === "default") return node;
            if (isVNode(node)) return cloneVNode(node, { slot: slotName });
            return h("span", { slot: slotName }, node);
          });
        });

        return h(
          tagName,
          {
            ...forwardedAttrs,
            ref: (value: Element | ComponentPublicInstance | null) => {
              elementRef.value = toHTMLElement(value);
            },
          },
          children.length > 0 ? children : undefined,
        );
      };
    },
  });
}
