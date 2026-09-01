// Side-effect imports register only the general Looma custom elements.
// The optional editor graph lives at @threadlabs/looma-vue/editor.
import "@threadlabs/looma-layout";
import "@threadlabs/looma-core";

import { createAdapterComponent } from "./adapter";

export type { VueAdapterEventMap } from "./adapter";

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
export const ContextMenu = createAdapterComponent("ui-context-menu", "ContextMenu");
export const Button = createAdapterComponent("ui-button", "Button");
export const IconButton = createAdapterComponent("ui-icon-button", "IconButton");
export const Input = createAdapterComponent("ui-input", "Input");
export const Select = createAdapterComponent("ui-select", "Select");
export const Textarea = createAdapterComponent("ui-textarea", "Textarea");
export const FormField = createAdapterComponent("ui-form-field", "FormField");
export const Tooltip = createAdapterComponent("ui-tooltip", "Tooltip");
export const ToastRegion = createAdapterComponent("ui-toast-region", "ToastRegion");
export const Checkbox = createAdapterComponent("ui-checkbox", "Checkbox");
export const Switch = createAdapterComponent("ui-switch", "Switch");
export const RadioGroup = createAdapterComponent("ui-radio-group", "RadioGroup");
export const Radio = createAdapterComponent("ui-radio", "Radio");
export const Badge = createAdapterComponent("ui-badge", "Badge");
export const Avatar = createAdapterComponent("ui-avatar", "Avatar");
export const AvatarGroup = createAdapterComponent("ui-avatar-group", "AvatarGroup");
export const FloatingActionButton = createAdapterComponent(
  "ui-floating-action-button",
  "FloatingActionButton",
);
export const SearchShell = createAdapterComponent("ui-search-shell", "SearchShell");
export const SearchResultRow = createAdapterComponent("ui-search-result-row", "SearchResultRow");
export const TopBar = createAdapterComponent("ui-top-bar", "TopBar");

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
  ContextMenu: "ui-context-menu",
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
  Avatar: "ui-avatar",
  AvatarGroup: "ui-avatar-group",
  FloatingActionButton: "ui-floating-action-button",
  SearchShell: "ui-search-shell",
  SearchResultRow: "ui-search-result-row",
  TopBar: "ui-top-bar",
} as const;

export const VUE_ADAPTER_NOTE =
  "Thin adapter only: attrs and slots pass through to custom elements and DOM events map to typed callbacks.";
