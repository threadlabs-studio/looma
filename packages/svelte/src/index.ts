import "@looma/layout";
import "@looma/core";

export interface SvelteAdapterEventMap {
  open: { open: boolean; reason: string; trigger: string };
  close: { open: boolean; reason: string; trigger: string };
  select: { value: string; previousValue?: string; trigger: string };
  change: { checked: boolean; value: string; trigger: string };
  dismiss: { id: string; reason: string; trigger: string };
}

export type AdapterTagName =
  | "ui-stack"
  | "ui-inline"
  | "ui-cluster"
  | "ui-grid"
  | "ui-center"
  | "ui-separator"
  | "ui-disclosure"
  | "ui-tabs"
  | "ui-dialog"
  | "ui-popover"
  | "ui-menu"
  | "ui-menu-item"
  | "ui-button"
  | "ui-icon-button"
  | "ui-input"
  | "ui-textarea"
  | "ui-form-field"
  | "ui-tooltip"
  | "ui-toast-region"
  | "ui-checkbox"
  | "ui-switch"
  | "ui-floating-action-button";

export type AdapterPropsRecord = Record<string, string | number | boolean | null | undefined>;

export type AdapterEventHandlers = {
  onOpen?: (detail: SvelteAdapterEventMap["open"]) => void;
  onClose?: (detail: SvelteAdapterEventMap["close"]) => void;
  onSelect?: (detail: SvelteAdapterEventMap["select"]) => void;
  onChange?: (detail: SvelteAdapterEventMap["change"]) => void;
  onDismiss?: (detail: SvelteAdapterEventMap["dismiss"]) => void;
};

export type SvelteAdapterOptions = AdapterEventHandlers & {
  props?: AdapterPropsRecord;
};

type Cleanup = () => void;

function setElementProperty(node: HTMLElement, name: string, value: unknown): void {
  if (name in node) {
    (node as unknown as Record<string, unknown>)[name] = value;
  }
}

function applyProps(node: HTMLElement, props: AdapterPropsRecord): void {
  for (const [name, value] of Object.entries(props)) {
    if (typeof value === "boolean") {
      if (value) {
        node.setAttribute(name, "");
      } else {
        node.removeAttribute(name);
      }
      setElementProperty(node, name, value);
      continue;
    }

    if (value === null || value === undefined) {
      node.removeAttribute(name);
      setElementProperty(node, name, undefined);
      continue;
    }

    node.setAttribute(name, String(value));
    setElementProperty(node, name, value);
  }
}

function bindEvents(node: HTMLElement, handlers: AdapterEventHandlers): Cleanup {
  const listeners: Array<[string, EventListener | undefined]> = [
    [
      "open",
      typeof handlers.onOpen === "function"
        ? ((event: Event) => {
            handlers.onOpen?.((event as CustomEvent<SvelteAdapterEventMap["open"]>).detail);
          })
        : undefined
    ],
    [
      "close",
      typeof handlers.onClose === "function"
        ? ((event: Event) => {
            handlers.onClose?.((event as CustomEvent<SvelteAdapterEventMap["close"]>).detail);
          })
        : undefined
    ],
    [
      "select",
      typeof handlers.onSelect === "function"
        ? ((event: Event) => {
            handlers.onSelect?.((event as CustomEvent<SvelteAdapterEventMap["select"]>).detail);
          })
        : undefined
    ],
    [
      "change",
      typeof handlers.onChange === "function"
        ? ((event: Event) => {
            handlers.onChange?.((event as CustomEvent<SvelteAdapterEventMap["change"]>).detail);
          })
        : undefined
    ],
    [
      "dismiss",
      typeof handlers.onDismiss === "function"
        ? ((event: Event) => {
            handlers.onDismiss?.((event as CustomEvent<SvelteAdapterEventMap["dismiss"]>).detail);
          })
        : undefined
    ]
  ];

  for (const [eventName, listener] of listeners) {
    if (listener) {
      node.addEventListener(eventName, listener);
    }
  }

  return () => {
    for (const [eventName, listener] of listeners) {
      if (listener) {
        node.removeEventListener(eventName, listener);
      }
    }
  };
}

export function bindAdapter(node: HTMLElement, options: SvelteAdapterOptions = {}) {
  const nextOptions = options;
  applyProps(node, nextOptions.props ?? {});
  let cleanup = bindEvents(node, nextOptions);

  return {
    update(updatedOptions: SvelteAdapterOptions = {}) {
      cleanup();
      applyProps(node, updatedOptions.props ?? {});
      cleanup = bindEvents(node, updatedOptions);
    },
    destroy() {
      cleanup();
    }
  };
}

export function createAdapterElement(
  tagName: AdapterTagName,
  options: SvelteAdapterOptions = {}
): HTMLElement {
  const element = document.createElement(tagName);
  applyProps(element, options.props ?? {});
  bindEvents(element, options);
  return element;
}

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
  IconButton: "ui-icon-button",
  Input: "ui-input",
  Textarea: "ui-textarea",
  FormField: "ui-form-field",
  Tooltip: "ui-tooltip",
  ToastRegion: "ui-toast-region",
  Checkbox: "ui-checkbox",
  Switch: "ui-switch",
  FloatingActionButton: "ui-floating-action-button"
} as const;

export const SVELTE_ADAPTER_NOTE =
  "Thin adapter only: use bindAdapter/createAdapterElement to pass props to custom elements and map DOM events to typed callbacks.";
