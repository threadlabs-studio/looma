import "@threadlabs/looma-core";
import "@threadlabs/looma-layout";
import "@threadlabs/looma-editor/ui";
import { factoryByTag } from "./generated/vanilla/index.js";
import type { GeneratedTagName, VanillaComponentOptions } from "./generated/vanilla/index.js";

export * from "./generated/vanilla/index.js";

/**
 * Stable event-detail shapes exposed by the handwritten Svelte adapter.
 * The adapter unwraps `CustomEvent.detail`; handlers therefore receive these
 * payloads directly rather than browser event objects.
 *
 * @contract Event names and detail objects remain identical to the native
 * declarative roots so Svelte integration does not introduce another API.
 */
export interface SvelteAdapterEventMap {
  open: { open: boolean; reason: string; trigger: string };
  close: { open: boolean; reason: string; trigger: string };
  select: { value: string; previousValue?: string; trigger: string };
  change: { checked: boolean; value: string; trigger: string };
  dismiss: { id: string; reason: string; trigger: string };
}

/** A tag accepted by the generated native-root factory inventory. */
export type AdapterTagName = GeneratedTagName;

/**
 * Property values applied after a native root is created.
 * Object values always use DOM properties because stringifying structured
 * component input would silently corrupt its contract.
 */
export type AdapterPropsRecord = Record<string, unknown>;

/**
 * Svelte-facing callbacks for native Looma events.
 *
 * @ownership `bindAdapter` owns the DOM listeners; the caller owns callback
 * identity and may replace callbacks through the action's `update` method.
 */
export type AdapterEventHandlers = {
  onOpen?: (detail: SvelteAdapterEventMap["open"]) => void;
  onClose?: (detail: SvelteAdapterEventMap["close"]) => void;
  onSelect?: (detail: SvelteAdapterEventMap["select"]) => void;
  onChange?: (detail: SvelteAdapterEventMap["change"]) => void;
  onDismiss?: (detail: SvelteAdapterEventMap["dismiss"]) => void;
};

/**
 * Inputs shared by one-shot factory creation and the stateful Svelte action.
 * `props` target DOM properties when available, while attributes, children,
 * and slots preserve the generated factory's declarative construction rules.
 */
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

/**
 * Keeps a Svelte-owned native root synchronized with adapter props and events.
 *
 * @ownership Svelte owns the node. The action owns only listeners it installs
 * and never removes or replaces the node.
 * @lifecycle Every update removes the previous listener set before installing
 * the next one; `destroy` performs the final listener cleanup.
 */
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

/**
 * Materializes a native root directly from the generated declarative factory.
 *
 * @ownership The returned element belongs to the caller. Event listeners are
 * attached for its lifetime; callers needing replaceable callbacks should use
 * `bindAdapter` after creation.
 * @failure An unknown tag cannot enter through the typed API; unchecked input
 * fails when no generated factory exists rather than producing a partial root.
 */
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

/**
 * Canonical adapter export-to-native-tag correspondence.
 * Release checks consume this map to prove that generated Svelte factories and
 * the framework-neutral package graph expose the same component inventory.
 */
export const ADAPTER_COMPONENT_TAG_MAP = {
  AffordanceScope: "ui-affordance-scope",
  AvatarGroup: "ui-avatar-group",
  Avatar: "ui-avatar",
  Badge: "ui-badge",
  Button: "ui-button",
  Callout: "ui-callout",
  Checkbox: "ui-checkbox",
  Combobox: "ui-combobox",
  ContextMenu: "ui-context-menu",
  Dialog: "ui-dialog",
  Disclosure: "ui-disclosure",
  Editable: "ui-editable",
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
  Grid: "ui-grid",
  Cluster: "ui-cluster",
  Reel: "ui-reel",
  Separator: "ui-separator",
  Sidebar: "ui-sidebar",
  Stack: "ui-stack",
  Switcher: "ui-switcher",
} as const satisfies Readonly<Record<string, AdapterTagName>>;

/** Human-readable provenance recorded beside generated adapter artifacts. */
export const SVELTE_ADAPTER_NOTE =
  "Native-root adapter: factories and bindAdapter project the framework-neutral Looma declarative contract into Svelte.";
