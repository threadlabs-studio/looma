import "@threadlabs/looma-core";
import "@threadlabs/looma-layout";
import "@threadlabs/looma-editor/ui";
import { factoryByTag } from "./generated/vanilla/index.js";
import type { GeneratedTagName, VanillaComponentOptions } from "./generated/vanilla/index.js";

export * from "./generated/vanilla/index.js";

export interface SvelteAdapterEventMap {
  open: { open: boolean; reason: string; trigger: string };
  close: { open: boolean; reason: string; trigger: string };
  select: { value: string; previousValue?: string; trigger: string };
  change: { checked: boolean; value: string; trigger: string };
  dismiss: { id: string; reason: string; trigger: string };
}

export type AdapterTagName = GeneratedTagName;
export type AdapterPropsRecord = Record<string, unknown>;

export type AdapterEventHandlers = {
  onOpen?: (detail: SvelteAdapterEventMap["open"]) => void;
  onClose?: (detail: SvelteAdapterEventMap["close"]) => void;
  onSelect?: (detail: SvelteAdapterEventMap["select"]) => void;
  onChange?: (detail: SvelteAdapterEventMap["change"]) => void;
  onDismiss?: (detail: SvelteAdapterEventMap["dismiss"]) => void;
};

export type SvelteAdapterOptions = AdapterEventHandlers & {
  props?: AdapterPropsRecord;
  attributes?: VanillaComponentOptions["attributes"];
  children?: VanillaComponentOptions["children"];
  slots?: VanillaComponentOptions["slots"];
};

type Cleanup = () => void;

function applyProps(node: HTMLElement, props: AdapterPropsRecord): void {
  for (const [name, value] of Object.entries(props)) {
    if (name in node || typeof value === "object") {
      (node as unknown as Record<string, unknown>)[name] = value;
      continue;
    }
    if (value === null || value === undefined || value === false) {
      node.removeAttribute(name);
    } else {
      node.setAttribute(name, value === true ? "" : String(value));
    }
  }
}

function bindEvents(node: HTMLElement, handlers: AdapterEventHandlers): Cleanup {
  const listeners: Array<[string, EventListener | undefined]> = [
    ["open", handlers.onOpen && ((event) => handlers.onOpen?.((event as CustomEvent<SvelteAdapterEventMap["open"]>).detail))],
    ["close", handlers.onClose && ((event) => handlers.onClose?.((event as CustomEvent<SvelteAdapterEventMap["close"]>).detail))],
    ["select", handlers.onSelect && ((event) => handlers.onSelect?.((event as CustomEvent<SvelteAdapterEventMap["select"]>).detail))],
    ["change", handlers.onChange && ((event) => handlers.onChange?.((event as CustomEvent<SvelteAdapterEventMap["change"]>).detail))],
    ["dismiss", handlers.onDismiss && ((event) => handlers.onDismiss?.((event as CustomEvent<SvelteAdapterEventMap["dismiss"]>).detail))],
  ];
  for (const [eventName, listener] of listeners) if (listener) node.addEventListener(eventName, listener);
  return () => {
    for (const [eventName, listener] of listeners) if (listener) node.removeEventListener(eventName, listener);
  };
}

/** Svelte action for updating a native root created by a Looma factory. */
export function bindAdapter(node: HTMLElement, options: SvelteAdapterOptions = {}) {
  applyProps(node, options.props ?? {});
  let cleanup = bindEvents(node, options);
  return {
    update(updatedOptions: SvelteAdapterOptions = {}) {
      cleanup();
      applyProps(node, updatedOptions.props ?? {});
      cleanup = bindEvents(node, updatedOptions);
    },
    destroy() {
      cleanup();
    },
  };
}

/** Creates the component's native root directly from the declarative contract. */
export function createAdapterElement(tagName: AdapterTagName, options: SvelteAdapterOptions = {}): HTMLElement {
  const factory = factoryByTag[tagName];
  const factoryOptions: Record<string, unknown> = { ...(options.props ?? {}) };
  if (options.attributes !== undefined) factoryOptions.attributes = options.attributes;
  if (options.children !== undefined) factoryOptions.children = options.children;
  if (options.slots !== undefined) factoryOptions.slots = options.slots;
  const element = factory(factoryOptions);
  bindEvents(element, options);
  return element;
}

export const ADAPTER_COMPONENT_TAG_MAP = {
  AffordanceScope: "ui-affordance-scope",
  AvatarGroup: "ui-avatar-group",
  Avatar: "ui-avatar",
  Badge: "ui-badge",
  Button: "ui-button",
  Callout: "ui-callout",
  Checkbox: "ui-checkbox",
  Chip: "ui-chip",
  Combobox: "ui-combobox",
  ContextMenu: "ui-context-menu",
  Dialog: "ui-dialog",
  Disclosure: "ui-disclosure",
  Editable: "ui-editable",
  FloatingActionButton: "ui-floating-action-button",
  FormField: "ui-form-field",
  IconButton: "ui-icon-button",
  Input: "ui-input",
  MenuItem: "ui-menu-item",
  Menu: "ui-menu",
  Popover: "ui-popover",
  RadioGroup: "ui-radio-group",
  Radio: "ui-radio",
  SearchResultRow: "ui-search-result-row",
  SearchShell: "ui-search-shell",
  Select: "ui-select",
  Switch: "ui-switch",
  Tabs: "ui-tabs",
  Textarea: "ui-textarea",
  ToastRegion: "ui-toast-region",
  Tooltip: "ui-tooltip",
  TopBar: "ui-top-bar",
  TreeItem: "ui-tree-item",
  Tree: "ui-tree",
  EditorInsertTableGrid: "ui-editor-insert-table-grid",
  EditorMentionMenu: "ui-editor-mention-menu",
  EditorSlashMenu: "ui-editor-slash-menu",
  EditorTableContextMenu: "ui-editor-table-context-menu",
  EditorTableOverlay: "ui-editor-table-overlay",
  EditorTableToolbar: "ui-editor-table-toolbar",
  EditorToolbar: "ui-editor-toolbar",
  Center: "ui-center",
  Cluster: "ui-cluster",
  Grid: "ui-grid",
  Inline: "ui-inline",
  Reel: "ui-reel",
  Separator: "ui-separator",
  Sidebar: "ui-sidebar",
  Stack: "ui-stack",
  Switcher: "ui-switcher",
} as const satisfies Readonly<Record<string, AdapterTagName>>;

export const SVELTE_ADAPTER_NOTE =
  "Native-root adapter: factories and bindAdapter project the framework-neutral Looma declarative contract into Svelte.";
