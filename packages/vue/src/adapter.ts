import {
  cloneVNode,
  defineComponent,
  Fragment,
  h,
  isVNode,
  shallowRef,
  watchEffect,
  type ComponentPublicInstance,
  type Component,
  type DefineComponent,
} from "vue";
import type { EditableChange } from '@threadlabs/looma-core';

export interface VueAdapterEventMap {
  open: { open: boolean; reason: string; trigger: string };
  close: { open: boolean; reason: string; trigger: string };
  select: { value: string; previousValue?: string; trigger: string };
  change: { checked: boolean; value: string; trigger: string };
  input: { value: string; trigger: string };
  dismiss: { id: string; reason: string; trigger: string };
  reorder: {
    sourceId: string;
    targetId: string;
    position: "before" | "inside" | "after";
    sourceType: string;
    targetType: string;
    sourceScope: string;
    targetScope: string;
    trigger: string;
  };
  reorderRejected: {
    sourceId: string;
    targetId: string;
    position: "before" | "inside" | "after";
    reason: "max-depth";
    maxDepth?: number;
    resultingDepth?: number;
    trigger: string;
  };
  expand: { id: string; expanded: boolean; trigger: string };
  editChange: EditableChange;
}

type AdapterCallbacks = {
  onOpen?: (detail: VueAdapterEventMap["open"]) => void;
  onClose?: (detail: VueAdapterEventMap["close"]) => void;
  onSelect?: (detail: VueAdapterEventMap["select"]) => void;
  onChange?: (detail: VueAdapterEventMap["change"]) => void;
  onInput?: (detail: VueAdapterEventMap["input"]) => void;
  onDismiss?: (detail: VueAdapterEventMap["dismiss"]) => void;
  onReorder?: (detail: VueAdapterEventMap["reorder"]) => void;
  onReorderRejected?: (detail: VueAdapterEventMap["reorderRejected"]) => void;
  onExpand?: (detail: VueAdapterEventMap["expand"]) => void;
  onEditChange?: (detail: VueAdapterEventMap["editChange"]) => void;
};

export type AdapterAttrs = AdapterCallbacks & Record<string, unknown>;

export type AdapterEventBinding = readonly [eventName: string, callbackAttr: string];

function assignNamedSlot(value: unknown, slotName: string): unknown {
  if (Array.isArray(value)) return value.map((child) => assignNamedSlot(child, slotName));
  if (!isVNode(value)) return value;
  if (value.type === Fragment && Array.isArray(value.children)) {
    const fragment = cloneVNode(value);
    fragment.children = value.children.map((child) => assignNamedSlot(child, slotName)) as typeof fragment.children;
    return fragment;
  }
  return cloneVNode(value, { slot: slotName });
}

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
  const componentRoot = (value as ComponentPublicInstance).$el;
  if (componentRoot instanceof HTMLElement) return componentRoot;
  return null;
}

export function createAdapterComponent<Props extends object = Record<string, never>>(
  component: string | Component,
  displayName: string,
  additionalEventBindings: readonly AdapterEventBinding[] = [],
  defaultHydrationMismatch: string = "class",
  propertyBindings: readonly string[] = [],
  /** The native event that carries a form control's value, enabling `v-model` (`modelValue`). */
  modelEvent?: "input" | "change",
): DefineComponent<Props> {
  const eventBindings = [...BASE_EVENT_BINDINGS, ...additionalEventBindings];
  const callbackAttrs = new Set(eventBindings.map(([, callbackAttr]) => callbackAttr));
  if (modelEvent !== undefined) {
    callbackAttrs.add("modelValue");
    callbackAttrs.add("onUpdate:modelValue");
  }
  const propertyAttrs = new Set(propertyBindings);

  return defineComponent({
    name: displayName,
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      const elementRef = shallowRef<HTMLElement | null>(null);

      watchEffect((onCleanup) => {
        const element = elementRef.value;
        if (!element) return;

        const adapterAttrs = attrs as AdapterAttrs;
        const propertyTarget = element as unknown as Record<string, unknown>;
        const modelled = modelEvent !== undefined && "modelValue" in adapterAttrs;
        for (const propertyName of propertyBindings) {
          const value = modelled && propertyName === "value" ? adapterAttrs.modelValue : adapterAttrs[propertyName];
          if (propertyTarget[propertyName] !== value) propertyTarget[propertyName] = value;
        }
        const handlers: Array<[string, ((event: Event) => void) | undefined]> = eventBindings.map(
          ([eventName, callbackAttr]) => {
            const callback = adapterAttrs[callbackAttr];
            return [
              eventName,
              typeof callback === "function"
                // Component events carry their detail; native events (input, change) are passed as is.
                ? (event: Event) => callback(event instanceof CustomEvent ? event.detail : event)
                : undefined,
            ];
          },
        );
        const updateModel = adapterAttrs["onUpdate:modelValue"];
        if (modelEvent !== undefined && typeof updateModel === "function") {
          handlers.push([modelEvent, (event: Event) => {
            if (event.target === element) updateModel((element as HTMLInputElement).value);
          }]);
        }

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
          Object.entries(attrs).filter(
            ([name]) => !callbackAttrs.has(name),
          ),
        );
        // v-model: the model is the control's value prop.
        if (modelEvent !== undefined && "modelValue" in attrs) forwardedAttrs.value = attrs.modelValue;

        const componentSlots = Object.fromEntries(
          Object.entries(slots)
            .filter((entry): entry is [string, NonNullable<typeof entry[1]>] => Boolean(entry[1]))
            .map(([slotName, slotFn]) => [
              slotName,
              () => slotName === "default" ? slotFn() : assignNamedSlot(slotFn(), slotName),
            ]),
        );

        return h(
          component,
          {
            "data-allow-mismatch": forwardedAttrs["data-allow-mismatch"] ?? defaultHydrationMismatch,
            ...forwardedAttrs,
            class: forwardedAttrs.class,
            ref: (value: Element | ComponentPublicInstance | null) => {
              elementRef.value = toHTMLElement(value);
            },
          },
          Object.keys(componentSlots).length > 0 ? componentSlots : undefined,
        );
      };
    },
  }) as unknown as DefineComponent<Props>;
}
