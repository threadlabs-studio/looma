// Side-effect imports register the core and layout declarative graphs.
// The optional editor graph lives at @threadlabs/looma-vue/editor.
import "@threadlabs/looma-layout";
import "@threadlabs/looma-core";

import { createAdapterComponent } from "./adapter";
import type { AdapterComponentProps } from "./generated-component-types";
import * as Declarative from "./generated";

export type { VueAdapterEventMap } from "./adapter";
export type * from "./generated-component-types";

import { Combobox as ComboboxComponent } from './Combobox';
export const Combobox = ComboboxComponent;
export type { ComboboxOption, ComboboxChange, ComboboxValidationState, EditableChange, MultiComboboxItem, MultiComboboxItemChange, MultiComboboxCreate, FieldIssue } from '@threadlabs/looma-core';
export type { ComboboxOptionInput } from './Combobox';

export const Stack = createAdapterComponent<AdapterComponentProps["Stack"]>(Declarative.UiStack, "Stack");
export const Cluster = createAdapterComponent<AdapterComponentProps["Cluster"]>(Declarative.UiCluster, "Cluster");
export const Grid = createAdapterComponent<AdapterComponentProps["Grid"]>(Declarative.UiGrid, "Grid");
export const Container = createAdapterComponent<AdapterComponentProps["Container"]>(Declarative.UiContainer, "Container");
export const Switcher = createAdapterComponent<AdapterComponentProps["Switcher"]>(Declarative.UiSwitcher, "Switcher");
// The resizable sidebar controller progressively inserts a light-DOM separator. Vue must
// treat that controller-owned child as an expected hydration difference.
export const Sidebar = createAdapterComponent<AdapterComponentProps["Sidebar"]>(Declarative.UiSidebar, "Sidebar", [], "");
export const Reel = createAdapterComponent<AdapterComponentProps["Reel"]>(Declarative.UiReel, "Reel");
export const Separator = createAdapterComponent<AdapterComponentProps["Separator"]>(Declarative.UiSeparator, "Separator");
export const Disclosure = createAdapterComponent<AdapterComponentProps["Disclosure"]>(Declarative.UiDisclosure, "Disclosure", [], "class", ["open"]);
export const Editable = createAdapterComponent<AdapterComponentProps["Editable"]>(Declarative.UiEditable, "Editable", [["edit-change", "onEditChange"]], "class", ["edit"]);
export const Tabs = createAdapterComponent<AdapterComponentProps["Tabs"]>(Declarative.UiTabs, "Tabs", [], "class", ["value"]);
export const Dialog = createAdapterComponent<AdapterComponentProps["Dialog"]>(Declarative.UiDialog, "Dialog", [], "class", ["open"]);
export const Popover = createAdapterComponent<AdapterComponentProps["Popover"]>(Declarative.UiPopover, "Popover", [], "class", ["open"]);
export const Menu = createAdapterComponent<AdapterComponentProps["Menu"]>(Declarative.UiMenu, "Menu", [], "class", ["open"]);
export const MenuItem = createAdapterComponent<AdapterComponentProps["MenuItem"]>(Declarative.UiMenuItem, "MenuItem");
export const ContextMenu = createAdapterComponent<AdapterComponentProps["ContextMenu"]>(Declarative.UiContextMenu, "ContextMenu", [], "class", ["open"]);
export const AffordanceScope = createAdapterComponent<AdapterComponentProps["AffordanceScope"]>(Declarative.UiAffordanceScope, "AffordanceScope");
export const Button = createAdapterComponent<AdapterComponentProps["Button"]>(Declarative.UiButton, "Button");
export const IconButton = createAdapterComponent<AdapterComponentProps["IconButton"]>(Declarative.UiIconButton, "IconButton");
export const Input = createAdapterComponent<AdapterComponentProps["Input"]>(Declarative.UiInput, "Input", [], "class", ["value"], "input");
export const Select = createAdapterComponent<AdapterComponentProps["Select"]>(Declarative.UiSelect, "Select", [], "class", ["value"], "change");
export const Textarea = createAdapterComponent<AdapterComponentProps["Textarea"]>(Declarative.UiTextarea, "Textarea", [], "class", ["value"], "input");
export const FormField = createAdapterComponent<AdapterComponentProps["FormField"]>(Declarative.UiFormField, "FormField");
export const Tooltip = createAdapterComponent<AdapterComponentProps["Tooltip"]>(Declarative.UiTooltip, "Tooltip", [], "class", ["open"]);
export const ToastRegion = createAdapterComponent<AdapterComponentProps["ToastRegion"]>(Declarative.UiToastRegion, "ToastRegion", [], "class", ["open"]);
export const Checkbox = createAdapterComponent<AdapterComponentProps["Checkbox"]>(Declarative.UiCheckbox, "Checkbox", [], "class", ["checked"]);
export const Switch = createAdapterComponent<AdapterComponentProps["Switch"]>(Declarative.UiSwitch, "Switch", [], "class", ["checked"]);
export const RadioGroup = createAdapterComponent<AdapterComponentProps["RadioGroup"]>(Declarative.UiRadioGroup, "RadioGroup", [], "class", ["value"]);
export const Radio = createAdapterComponent<AdapterComponentProps["Radio"]>(Declarative.UiRadio, "Radio", [], "class", ["checked"]);
export const Badge = createAdapterComponent<AdapterComponentProps["Badge"]>(Declarative.UiBadge, "Badge");
export const Callout = createAdapterComponent<AdapterComponentProps["Callout"]>(Declarative.UiCallout, "Callout");
export const Avatar = createAdapterComponent<AdapterComponentProps["Avatar"]>(Declarative.UiAvatar, "Avatar");
export const AvatarGroup = createAdapterComponent<AdapterComponentProps["AvatarGroup"]>(Declarative.UiAvatarGroup, "AvatarGroup");
export const SearchShell = createAdapterComponent<AdapterComponentProps["SearchShell"]>(Declarative.UiSearchShell, "SearchShell");
export const SearchResultRow = createAdapterComponent<AdapterComponentProps["SearchResultRow"]>(Declarative.UiSearchResultRow, "SearchResultRow");
export const TopBar = createAdapterComponent<AdapterComponentProps["TopBar"]>(Declarative.UiTopBar, "TopBar");
export const Tree = createAdapterComponent<AdapterComponentProps["Tree"]>(Declarative.UiTree, "Tree", [
  ["reorder", "onReorder"],
  ["reorder-rejected", "onReorderRejected"],
]);
export const TreeItem = createAdapterComponent<AdapterComponentProps["TreeItem"]>(
  Declarative.UiTreeItem,
  "TreeItem",
  [["expand", "onExpand"]],
  "class",
  ["expanded"],
);

export const ADAPTER_COMPONENT_TAG_MAP = {
  Combobox: "ui-combobox",
  Stack: "ui-stack",
  Cluster: "ui-cluster",
  Grid: "ui-grid",
  Container: "ui-container",
  Switcher: "ui-switcher",
  Sidebar: "ui-sidebar",
  Reel: "ui-reel",
  Separator: "ui-separator",
  Disclosure: "ui-disclosure",
  Editable: "ui-editable",
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
  Callout: "ui-callout",
  Avatar: "ui-avatar",
  AvatarGroup: "ui-avatar-group",
  SearchShell: "ui-search-shell",
  SearchResultRow: "ui-search-result-row",
  TopBar: "ui-top-bar",
  Tree: "ui-tree",
  TreeItem: "ui-tree-item",
} as const;

export const VUE_ADAPTER_NOTE =
  "Native-root adapter: attrs, slots, props, methods, and events project the framework-neutral Looma declarative contract into Vue.";
