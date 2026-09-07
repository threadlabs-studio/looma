// Side-effect imports register only the general Looma custom elements.
// The optional editor graph lives at @threadlabs/looma-vue/editor.
import "@threadlabs/looma-layout";
import "@threadlabs/looma-core";

import { createAdapterComponent } from "./adapter";
import type { AdapterComponentProps } from "./generated-component-types";

export type { VueAdapterEventMap } from "./adapter";
export type * from "./generated-component-types";

import { Combobox as ComboboxComponent } from './Combobox';
export const Combobox = ComboboxComponent;
export type { ComboboxConfig, ComboboxOption, ComboboxProvider, ComboboxRequest, ComboboxChange, ComboboxValidationState, FieldSchema, FieldValidation, FieldFormatter, FieldIssue } from '@threadlabs/looma-core';

export const Stack = createAdapterComponent<AdapterComponentProps["Stack"]>("ui-stack", "Stack");
export const Inline = createAdapterComponent<AdapterComponentProps["Inline"]>("ui-inline", "Inline");
export const Cluster = createAdapterComponent<AdapterComponentProps["Cluster"]>("ui-cluster", "Cluster");
export const Grid = createAdapterComponent<AdapterComponentProps["Grid"]>("ui-grid", "Grid");
export const Center = createAdapterComponent<AdapterComponentProps["Center"]>("ui-center", "Center");
export const Switcher = createAdapterComponent<AdapterComponentProps["Switcher"]>("ui-switcher", "Switcher");
// The resizable sidebar progressively inserts a light-DOM separator. Vue must
// treat that custom-element-owned child as an expected hydration difference.
export const Sidebar = createAdapterComponent<AdapterComponentProps["Sidebar"]>("ui-sidebar", "Sidebar", [], "");
export const Reel = createAdapterComponent<AdapterComponentProps["Reel"]>("ui-reel", "Reel");
export const Separator = createAdapterComponent<AdapterComponentProps["Separator"]>("ui-separator", "Separator");
export const Disclosure = createAdapterComponent<AdapterComponentProps["Disclosure"]>("ui-disclosure", "Disclosure", [], "class", ["open"]);
export const Tabs = createAdapterComponent<AdapterComponentProps["Tabs"]>("ui-tabs", "Tabs", [], "class", ["value"]);
export const Dialog = createAdapterComponent<AdapterComponentProps["Dialog"]>("ui-dialog", "Dialog", [], "class", ["open"]);
export const Popover = createAdapterComponent<AdapterComponentProps["Popover"]>("ui-popover", "Popover", [], "class", ["open"]);
export const Menu = createAdapterComponent<AdapterComponentProps["Menu"]>("ui-menu", "Menu", [], "class", ["open"]);
export const MenuItem = createAdapterComponent<AdapterComponentProps["MenuItem"]>("ui-menu-item", "MenuItem");
export const ContextMenu = createAdapterComponent<AdapterComponentProps["ContextMenu"]>("ui-context-menu", "ContextMenu", [], "class", ["open"]);
export const AffordanceScope = createAdapterComponent<AdapterComponentProps["AffordanceScope"]>("ui-affordance-scope", "AffordanceScope");
export const Button = createAdapterComponent<AdapterComponentProps["Button"]>("ui-button", "Button");
export const IconButton = createAdapterComponent<AdapterComponentProps["IconButton"]>("ui-icon-button", "IconButton");
export const Input = createAdapterComponent<AdapterComponentProps["Input"]>("ui-input", "Input", [], "class", ["value"]);
export const Select = createAdapterComponent<AdapterComponentProps["Select"]>("ui-select", "Select", [], "class", ["value"]);
export const Textarea = createAdapterComponent<AdapterComponentProps["Textarea"]>("ui-textarea", "Textarea", [], "class", ["value"]);
export const FormField = createAdapterComponent<AdapterComponentProps["FormField"]>("ui-form-field", "FormField");
export const Tooltip = createAdapterComponent<AdapterComponentProps["Tooltip"]>("ui-tooltip", "Tooltip", [], "class", ["open"]);
export const ToastRegion = createAdapterComponent<AdapterComponentProps["ToastRegion"]>("ui-toast-region", "ToastRegion", [], "class", ["open"]);
export const Checkbox = createAdapterComponent<AdapterComponentProps["Checkbox"]>("ui-checkbox", "Checkbox", [], "class", ["checked"]);
export const Switch = createAdapterComponent<AdapterComponentProps["Switch"]>("ui-switch", "Switch", [], "class", ["checked"]);
export const RadioGroup = createAdapterComponent<AdapterComponentProps["RadioGroup"]>("ui-radio-group", "RadioGroup", [], "class", ["value"]);
export const Radio = createAdapterComponent<AdapterComponentProps["Radio"]>("ui-radio", "Radio", [], "class", ["checked"]);
export const Badge = createAdapterComponent<AdapterComponentProps["Badge"]>("ui-badge", "Badge");
export const Chip = createAdapterComponent<AdapterComponentProps["Chip"]>("ui-chip", "Chip");
export const Callout = createAdapterComponent<AdapterComponentProps["Callout"]>("ui-callout", "Callout");
export const Avatar = createAdapterComponent<AdapterComponentProps["Avatar"]>("ui-avatar", "Avatar");
export const AvatarGroup = createAdapterComponent<AdapterComponentProps["AvatarGroup"]>("ui-avatar-group", "AvatarGroup");
export const FloatingActionButton = createAdapterComponent<AdapterComponentProps["FloatingActionButton"]>(
  "ui-floating-action-button",
  "FloatingActionButton",
);
export const SearchShell = createAdapterComponent<AdapterComponentProps["SearchShell"]>("ui-search-shell", "SearchShell");
export const SearchResultRow = createAdapterComponent<AdapterComponentProps["SearchResultRow"]>("ui-search-result-row", "SearchResultRow");
export const TopBar = createAdapterComponent<AdapterComponentProps["TopBar"]>("ui-top-bar", "TopBar");
export const Tree = createAdapterComponent<AdapterComponentProps["Tree"]>("ui-tree", "Tree", [
  ["reorder", "onReorder"],
  ["reorder-rejected", "onReorderRejected"],
]);
export const TreeItem = createAdapterComponent<AdapterComponentProps["TreeItem"]>(
  "ui-tree-item",
  "TreeItem",
  [["expand", "onExpand"]],
  "class",
  ["expanded"],
);

export const ADAPTER_COMPONENT_TAG_MAP = {
  Combobox: "ui-combobox",
  Stack: "ui-stack",
  Inline: "ui-inline",
  Cluster: "ui-cluster",
  Grid: "ui-grid",
  Center: "ui-center",
  Switcher: "ui-switcher",
  Sidebar: "ui-sidebar",
  Reel: "ui-reel",
  Separator: "ui-separator",
  Disclosure: "ui-disclosure",
  Tabs: "ui-tabs",
  Dialog: "ui-dialog",
  Popover: "ui-popover",
  Menu: "ui-menu",
  MenuItem: "ui-menu-item",
  ContextMenu: "ui-context-menu",
  AffordanceScope: "ui-affordance-scope",
  Button: "ui-button",
  IconButton: "ui-icon-button",
  Input: "ui-input",
  Select: "ui-select",
  Textarea: "ui-textarea",
  FormField: "ui-form-field",
  Tooltip: "ui-tooltip",
  ToastRegion: "ui-toast-region",
  Checkbox: "ui-checkbox",
  Switch: "ui-switch",
  RadioGroup: "ui-radio-group",
  Radio: "ui-radio",
  Badge: "ui-badge",
  Chip: "ui-chip",
  Callout: "ui-callout",
  Avatar: "ui-avatar",
  AvatarGroup: "ui-avatar-group",
  FloatingActionButton: "ui-floating-action-button",
  SearchShell: "ui-search-shell",
  SearchResultRow: "ui-search-result-row",
  TopBar: "ui-top-bar",
  Tree: "ui-tree",
  TreeItem: "ui-tree-item",
} as const;

export const VUE_ADAPTER_NOTE =
  "Thin adapter only: attrs and slots pass through to custom elements and DOM events map to typed callbacks.";
