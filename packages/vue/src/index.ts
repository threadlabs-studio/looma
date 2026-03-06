import "@ui/layout";
import "@ui/core";
import {
  defineComponent,
  h,
  shallowRef,
  watchEffect,
  type ComponentPublicInstance
} from "vue";

export interface VueAdapterEventMap {
  open: { open: boolean; reason: string; trigger: string };
  close: { open: boolean; reason: string; trigger: string };
  select: { value: string; previousValue?: string; trigger: string };
}

type AdapterCallbacks = {
  onOpen?: (detail: VueAdapterEventMap["open"]) => void;
  onClose?: (detail: VueAdapterEventMap["close"]) => void;
  onSelect?: (detail: VueAdapterEventMap["select"]) => void;
};

export type AdapterAttrs = AdapterCallbacks & Record<string, unknown>;

function toHTMLElement(
  value: Element | ComponentPublicInstance | null
): HTMLElement | null {
  if (!value) {
    return null;
  }
  if (value instanceof HTMLElement) {
    return value;
  }
  return null;
}

function createAdapterComponent(tagName: string, displayName: string) {
  return defineComponent({
    name: displayName,
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      const elementRef = shallowRef<HTMLElement | null>(null);

      watchEffect((onCleanup) => {
        const element = elementRef.value;
        if (!element) {
          return;
        }

        const callbackAttrs = attrs as AdapterAttrs;
        const handlers: Array<[string, ((event: Event) => void) | undefined]> = [
          [
            "open",
            typeof callbackAttrs.onOpen === "function"
              ? (event) => callbackAttrs.onOpen?.((event as CustomEvent<VueAdapterEventMap["open"]>).detail)
              : undefined
          ],
          [
            "close",
            typeof callbackAttrs.onClose === "function"
              ? (event) => callbackAttrs.onClose?.((event as CustomEvent<VueAdapterEventMap["close"]>).detail)
              : undefined
          ],
          [
            "select",
            typeof callbackAttrs.onSelect === "function"
              ? (event) => callbackAttrs.onSelect?.((event as CustomEvent<VueAdapterEventMap["select"]>).detail)
              : undefined
          ]
        ];

        for (const [eventName, handler] of handlers) {
          if (handler) {
            element.addEventListener(eventName, handler);
          }
        }

        onCleanup(() => {
          for (const [eventName, handler] of handlers) {
            if (handler) {
              element.removeEventListener(eventName, handler);
            }
          }
        });
      });

      return () => {
        const callbackAttrs = attrs as AdapterAttrs;
        const { onOpen, onClose, onSelect, ...forwardedAttrs } = callbackAttrs;
        void onOpen;
        void onClose;
        void onSelect;

        return h(
          tagName,
          {
            ...forwardedAttrs,
            ref: (value: Element | ComponentPublicInstance | null) => {
              elementRef.value = toHTMLElement(value);
            }
          },
          slots.default ? slots.default() : undefined
        );
      };
    }
  });
}

export const Stack = createAdapterComponent("ui-stack", "Stack");
export const Inline = createAdapterComponent("ui-inline", "Inline");
export const Cluster = createAdapterComponent("ui-cluster", "Cluster");
export const Grid = createAdapterComponent("ui-grid", "Grid");
export const Center = createAdapterComponent("ui-center", "Center");
export const Separator = createAdapterComponent("ui-separator", "Separator");

export const Disclosure = createAdapterComponent("ui-disclosure", "Disclosure");
export const Tabs = createAdapterComponent("ui-tabs", "Tabs");
export const Dialog = createAdapterComponent("ui-dialog", "Dialog");
export const Popover = createAdapterComponent("ui-popover", "Popover");
export const Menu = createAdapterComponent("ui-menu", "Menu");
export const MenuItem = createAdapterComponent("ui-menu-item", "MenuItem");
export const Button = createAdapterComponent("ui-button", "Button");
export const Input = createAdapterComponent("ui-input", "Input");
export const FormField = createAdapterComponent("ui-form-field", "FormField");

export const ADAPTER_COMPONENT_TAG_MAP = {
  Stack: "ui-stack",
  Inline: "ui-inline",
  Cluster: "ui-cluster",
  Grid: "ui-grid",
  Center: "ui-center",
  Separator: "ui-separator",
  Disclosure: "ui-disclosure",
  Tabs: "ui-tabs",
  Dialog: "ui-dialog",
  Popover: "ui-popover",
  Menu: "ui-menu",
  MenuItem: "ui-menu-item",
  Button: "ui-button",
  Input: "ui-input",
  FormField: "ui-form-field"
} as const;

export const VUE_ADAPTER_NOTE =
  "Thin adapter only: attrs and slots pass through to custom elements and DOM events map to typed callbacks.";
