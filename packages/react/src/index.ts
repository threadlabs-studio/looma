// Side-effect imports register custom elements in the browser only.
// In SSR (Node), @threadlabs/looma-core and @threadlabs/looma-layout no-op via typeof HTMLElement guards.
import "@threadlabs/looma-layout";
import "@threadlabs/looma-core";
import "@threadlabs/looma-editor/ui";
import {
  createElement,
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  type Ref,
  type RefCallback
} from "react";

export interface TableContextMenuActionEventDetail {
  action: string;
}

export interface InsertTableEventDetail {
  rows: number;
  cols: number;
  withHeaderRow: boolean;
}

export interface TableOverlayActionEventDetail {
  action: string;
  boundaryIndex: number;
}

export interface SlashMenuItem {
  title: string;
  description: string;
  icon: string;
}

export interface SlashMenuHighlightEventDetail {
  index: number;
}

export interface SlashMenuSelectEventDetail {
  index: number;
}

export interface AdapterEventMap {
  open: { open: boolean; reason: string; trigger: string };
  close: { open: boolean; reason: string; trigger: string };
  select: { value: string; previousValue?: string; trigger: string };
  change: { checked: boolean; value: string; trigger: string };
  input: { value: string; trigger: string };
  dismiss: { id: string; reason: string; trigger: string };
  tableAction: TableContextMenuActionEventDetail;
  insertTable: InsertTableEventDetail;
  tableOverlayAction: TableOverlayActionEventDetail;
  slashMenuHighlight: SlashMenuHighlightEventDetail;
  slashMenuSelect: SlashMenuSelectEventDetail;
}

type AdapterCallbacks = {
  onOpen?: (detail: AdapterEventMap["open"]) => void;
  onClose?: (detail: AdapterEventMap["close"]) => void;
  onSelect?: (detail: AdapterEventMap["select"]) => void;
  onChange?: (detail: AdapterEventMap["change"]) => void;
  onInput?: (detail: AdapterEventMap["input"]) => void;
  onDismiss?: (detail: AdapterEventMap["dismiss"]) => void;
  onTableAction?: (detail: AdapterEventMap["tableAction"]) => void;
  onInsertTable?: (detail: AdapterEventMap["insertTable"]) => void;
  onTableOverlayAction?: (detail: AdapterEventMap["tableOverlayAction"]) => void;
  onSlashMenuHighlight?: (detail: AdapterEventMap["slashMenuHighlight"]) => void;
  onSlashMenuSelect?: (detail: AdapterEventMap["slashMenuSelect"]) => void;
};

export type AdapterProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "onClose" | "onSelect" | "onChange"
> &
  AdapterCallbacks & {
    children?: ReactNode;
  };

type AdapterComponent = ReturnType<typeof forwardRef<HTMLElement, AdapterProps>>;

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (!ref) {
    return;
  }
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  (ref as MutableRefObject<T | null>).current = value;
}

function createAdapterComponent(tagName: string, displayName: string): AdapterComponent {
  const Component = forwardRef<HTMLElement, AdapterProps>(
    (
      {
        children,
        onOpen,
        onClose,
        onSelect,
        onChange,
        onInput,
        onDismiss,
        onTableAction,
        onInsertTable,
        onTableOverlayAction,
        onSlashMenuHighlight,
        onSlashMenuSelect,
        ...rest
      },
      forwardedRef
    ) => {
      const elementRef = useRef<HTMLElement | null>(null);

      const refCallback: RefCallback<HTMLElement> = (node) => {
        elementRef.current = node;
        assignRef(forwardedRef, node);
      };

      useEffect(() => {
        const element = elementRef.current;
        if (!element) {
          return;
        }

        const handlers: Array<[string, ((event: Event) => void) | undefined]> = [
          ["open", onOpen ? (event) => onOpen((event as CustomEvent<AdapterEventMap["open"]>).detail) : undefined],
          [
            "close",
            onClose ? (event) => onClose((event as CustomEvent<AdapterEventMap["close"]>).detail) : undefined
          ],
          [
            "select",
            onSelect
              ? (event) => onSelect((event as CustomEvent<AdapterEventMap["select"]>).detail)
              : undefined
          ],
          [
            "change",
            onChange
              ? (event) => onChange((event as CustomEvent<AdapterEventMap["change"]>).detail)
              : undefined
          ],
          [
            "input",
            onInput
              ? (event) => onInput((event as CustomEvent<AdapterEventMap["input"]>).detail)
              : undefined
          ],
          [
            "dismiss",
            onDismiss
              ? (event) => onDismiss((event as CustomEvent<AdapterEventMap["dismiss"]>).detail)
              : undefined
          ],
          [
            "looma-editor-table-action",
            onTableAction
              ? (event) =>
                  onTableAction((event as CustomEvent<AdapterEventMap["tableAction"]>).detail)
              : undefined
          ],
          [
            "looma-editor-insert-table",
            onInsertTable
              ? (event) =>
                  onInsertTable((event as CustomEvent<AdapterEventMap["insertTable"]>).detail)
              : undefined
          ],
          [
            "looma-editor-table-overlay-action",
            onTableOverlayAction
              ? (event) =>
                  onTableOverlayAction(
                    (event as CustomEvent<AdapterEventMap["tableOverlayAction"]>).detail
                  )
              : undefined
          ],
          [
            "looma-editor-slash-menu-highlight",
            onSlashMenuHighlight
              ? (event) =>
                  onSlashMenuHighlight(
                    (event as CustomEvent<AdapterEventMap["slashMenuHighlight"]>).detail
                  )
              : undefined
          ],
          [
            "looma-editor-slash-menu-select",
            onSlashMenuSelect
              ? (event) =>
                  onSlashMenuSelect(
                    (event as CustomEvent<AdapterEventMap["slashMenuSelect"]>).detail
                  )
              : undefined
          ]
        ];

        for (const [eventName, handler] of handlers) {
          if (handler) {
            element.addEventListener(eventName, handler);
          }
        }

        return () => {
          for (const [eventName, handler] of handlers) {
            if (handler) {
              element.removeEventListener(eventName, handler);
            }
          }
        };
      }, [
        onOpen,
        onClose,
        onSelect,
        onChange,
        onInput,
        onDismiss,
        onTableAction,
        onInsertTable,
        onTableOverlayAction,
        onSlashMenuHighlight,
        onSlashMenuSelect
      ]);

      return createElement(tagName, { ...rest, ref: refCallback }, children);
    }
  );

  Component.displayName = displayName;
  return Component;
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
  "FloatingActionButton"
);
export const SearchShell = createAdapterComponent("ui-search-shell", "SearchShell");
export const SearchResultRow = createAdapterComponent("ui-search-result-row", "SearchResultRow");
export const TopBar = createAdapterComponent("ui-top-bar", "TopBar");
export const EditorToolbar = createAdapterComponent("ui-editor-toolbar", "EditorToolbar");
export const EditorTableContextMenu = createAdapterComponent(
  "ui-editor-table-context-menu",
  "EditorTableContextMenu"
);
export const EditorTableToolbar = createAdapterComponent(
  "ui-editor-table-toolbar",
  "EditorTableToolbar"
);
export const EditorInsertTableGrid = createAdapterComponent(
  "ui-editor-insert-table-grid",
  "EditorInsertTableGrid"
);
export const EditorTableOverlay = createAdapterComponent("ui-editor-table-overlay", "EditorTableOverlay");

export type EditorSlashMenuProps = Omit<AdapterProps, "children"> & {
  open?: boolean;
  query?: string;
  items?: SlashMenuItem[];
  selectedIndex?: number;
  anchorRect?: DOMRect | null;
};

export const EditorSlashMenu = forwardRef<HTMLElement, EditorSlashMenuProps>(
  (
    {
      onSlashMenuHighlight,
      onSlashMenuSelect,
      open = false,
      query = "",
      items = [],
      selectedIndex = 0,
      anchorRect = null,
      ...rest
    },
    forwardedRef
  ) => {
    const elementRef = useRef<HTMLElement | null>(null);

    const refCallback: RefCallback<HTMLElement> = (node) => {
      elementRef.current = node;
      assignRef(forwardedRef, node);
    };

    useEffect(() => {
      const element = elementRef.current as
        | (HTMLElement & {
            open: boolean;
            query: string;
            items: SlashMenuItem[];
            selectedIndex: number;
            anchorRect: DOMRect | null;
          })
        | null;
      if (!element) {
        return;
      }

      element.open = open;
      element.query = query;
      element.items = items;
      element.selectedIndex = selectedIndex;
      element.anchorRect = anchorRect;
    }, [anchorRect, items, open, query, selectedIndex]);

    useEffect(() => {
      const element = elementRef.current;
      if (!element) {
        return;
      }

      const handlers: Array<[string, ((event: Event) => void) | undefined]> = [
        [
          "looma-editor-slash-menu-highlight",
          onSlashMenuHighlight
            ? (event) =>
                onSlashMenuHighlight(
                  (event as CustomEvent<AdapterEventMap["slashMenuHighlight"]>).detail
                )
            : undefined
        ],
        [
          "looma-editor-slash-menu-select",
          onSlashMenuSelect
            ? (event) =>
                onSlashMenuSelect(
                  (event as CustomEvent<AdapterEventMap["slashMenuSelect"]>).detail
                )
            : undefined
        ]
      ];

      for (const [eventName, handler] of handlers) {
        if (handler) {
          element.addEventListener(eventName, handler);
        }
      }

      return () => {
        for (const [eventName, handler] of handlers) {
          if (handler) {
            element.removeEventListener(eventName, handler);
          }
        }
      };
    }, [onSlashMenuHighlight, onSlashMenuSelect]);

    return createElement("ui-editor-slash-menu", { ...rest, ref: refCallback });
  }
);

EditorSlashMenu.displayName = "EditorSlashMenu";

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
  EditorToolbar: "ui-editor-toolbar",
  EditorSlashMenu: "ui-editor-slash-menu",
  EditorTableContextMenu: "ui-editor-table-context-menu",
  EditorTableToolbar: "ui-editor-table-toolbar",
  EditorInsertTableGrid: "ui-editor-insert-table-grid",
  EditorTableOverlay: "ui-editor-table-overlay"
} as const;

export type ReactAdapterNote =
  "Thin adapter only: props/children pass through to custom elements and DOM events map to typed callbacks.";

export const REACT_ADAPTER_NOTE: ReactAdapterNote =
  "Thin adapter only: props/children pass through to custom elements and DOM events map to typed callbacks.";
