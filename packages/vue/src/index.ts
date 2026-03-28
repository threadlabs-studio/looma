// Side-effect imports register custom elements in the browser only.
// In SSR (Node), @looma/core and @looma/layout no-op via typeof HTMLElement guards.
import "@looma/layout";
import "@looma/core";
import "@looma/editor";
import {
  defineComponent,
  h,
  type PropType,
  shallowRef,
  watchEffect,
  type ComponentPublicInstance
} from "vue";

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

export interface VueAdapterEventMap {
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
  onOpen?: (detail: VueAdapterEventMap["open"]) => void;
  onClose?: (detail: VueAdapterEventMap["close"]) => void;
  onSelect?: (detail: VueAdapterEventMap["select"]) => void;
  onChange?: (detail: VueAdapterEventMap["change"]) => void;
  onInput?: (detail: VueAdapterEventMap["input"]) => void;
  onDismiss?: (detail: VueAdapterEventMap["dismiss"]) => void;
  onTableAction?: (detail: VueAdapterEventMap["tableAction"]) => void;
  onInsertTable?: (detail: VueAdapterEventMap["insertTable"]) => void;
  onTableOverlayAction?: (detail: VueAdapterEventMap["tableOverlayAction"]) => void;
  onSlashMenuHighlight?: (detail: VueAdapterEventMap["slashMenuHighlight"]) => void;
  onSlashMenuSelect?: (detail: VueAdapterEventMap["slashMenuSelect"]) => void;
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
          ],
          [
            "change",
            typeof callbackAttrs.onChange === "function"
              ? (event) => callbackAttrs.onChange?.((event as CustomEvent<VueAdapterEventMap["change"]>).detail)
              : undefined
          ],
          [
            "input",
            typeof callbackAttrs.onInput === "function"
              ? (event) => callbackAttrs.onInput?.((event as CustomEvent<VueAdapterEventMap["input"]>).detail)
              : undefined
          ],
          [
            "dismiss",
            typeof callbackAttrs.onDismiss === "function"
              ? (event) => callbackAttrs.onDismiss?.((event as CustomEvent<VueAdapterEventMap["dismiss"]>).detail)
              : undefined
          ],
          [
            "looma-editor-table-action",
            typeof callbackAttrs.onTableAction === "function"
              ? (event) =>
                  callbackAttrs.onTableAction?.(
                    (event as CustomEvent<VueAdapterEventMap["tableAction"]>).detail
                  )
              : undefined
          ],
          [
            "looma-editor-insert-table",
            typeof callbackAttrs.onInsertTable === "function"
              ? (event) =>
                  callbackAttrs.onInsertTable?.(
                    (event as CustomEvent<VueAdapterEventMap["insertTable"]>).detail
                  )
              : undefined
          ],
          [
            "looma-editor-table-overlay-action",
            typeof callbackAttrs.onTableOverlayAction === "function"
              ? (event) =>
                  callbackAttrs.onTableOverlayAction?.(
                    (event as CustomEvent<VueAdapterEventMap["tableOverlayAction"]>).detail
                  )
              : undefined
          ],
          [
            "looma-editor-slash-menu-highlight",
            typeof callbackAttrs.onSlashMenuHighlight === "function"
              ? (event) =>
                  callbackAttrs.onSlashMenuHighlight?.(
                    (event as CustomEvent<VueAdapterEventMap["slashMenuHighlight"]>).detail
                  )
              : undefined
          ],
          [
            "looma-editor-slash-menu-select",
            typeof callbackAttrs.onSlashMenuSelect === "function"
              ? (event) =>
                  callbackAttrs.onSlashMenuSelect?.(
                    (event as CustomEvent<VueAdapterEventMap["slashMenuSelect"]>).detail
                  )
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
        const {
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
          ...forwardedAttrs
        } = callbackAttrs;
        void onOpen;
        void onClose;
        void onSelect;
        void onChange;
        void onInput;
        void onDismiss;
        void onTableAction;
        void onInsertTable;
        void onTableOverlayAction;
        void onSlashMenuHighlight;
        void onSlashMenuSelect;

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

export const EditorSlashMenu = defineComponent({
  name: "EditorSlashMenu",
  inheritAttrs: false,
  props: {
    open: { type: Boolean, default: false },
    query: { type: String, default: "" },
    items: { type: Array as PropType<SlashMenuItem[]>, default: () => [] },
    selectedIndex: { type: Number, default: 0 },
    anchorRect: { type: Object as PropType<DOMRect | null>, default: null }
  },
  setup(props, { attrs }) {
    const elementRef = shallowRef<HTMLElement | null>(null);

    watchEffect(() => {
      const element = elementRef.value as
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

      element.open = props.open;
      element.query = props.query;
      element.items = props.items;
      element.selectedIndex = props.selectedIndex;
      element.anchorRect = props.anchorRect;
    });

    watchEffect((onCleanup) => {
      const element = elementRef.value;
      if (!element) {
        return;
      }

      const callbackAttrs = attrs as AdapterAttrs;
      const handlers: Array<[string, ((event: Event) => void) | undefined]> = [
        [
          "looma-editor-slash-menu-highlight",
          typeof callbackAttrs.onSlashMenuHighlight === "function"
            ? (event) =>
                callbackAttrs.onSlashMenuHighlight?.(
                  (event as CustomEvent<VueAdapterEventMap["slashMenuHighlight"]>).detail
                )
            : undefined
        ],
        [
          "looma-editor-slash-menu-select",
          typeof callbackAttrs.onSlashMenuSelect === "function"
            ? (event) =>
                callbackAttrs.onSlashMenuSelect?.(
                  (event as CustomEvent<VueAdapterEventMap["slashMenuSelect"]>).detail
                )
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
      const { onSlashMenuHighlight, onSlashMenuSelect, ...forwardedAttrs } = callbackAttrs;
      void onSlashMenuHighlight;
      void onSlashMenuSelect;

      return h("ui-editor-slash-menu", {
        ...forwardedAttrs,
        ref: (value: Element | ComponentPublicInstance | null) => {
          elementRef.value = toHTMLElement(value);
        }
      });
    };
  }
});

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
export const Tooltip = createAdapterComponent("ui-tooltip", "Tooltip");
export const ToastRegion = createAdapterComponent("ui-toast-region", "ToastRegion");
export const Checkbox = createAdapterComponent("ui-checkbox", "Checkbox");
export const Switch = createAdapterComponent("ui-switch", "Switch");
export const RadioGroup = createAdapterComponent("ui-radio-group", "RadioGroup");
export const Radio = createAdapterComponent("ui-radio", "Radio");
export const Badge = createAdapterComponent("ui-badge", "Badge");
export const Avatar = createAdapterComponent("ui-avatar", "Avatar");
export const AvatarGroup = createAdapterComponent("ui-avatar-group", "AvatarGroup");
export const EditorTableContextMenu = createAdapterComponent(
  "ui-editor-table-context-menu",
  "EditorTableContextMenu"
);
export const EditorInsertTableGrid = createAdapterComponent(
  "ui-editor-insert-table-grid",
  "EditorInsertTableGrid"
);
export const EditorTableOverlay = createAdapterComponent("ui-editor-table-overlay", "EditorTableOverlay");

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
  EditorSlashMenu: "ui-editor-slash-menu",
  EditorTableContextMenu: "ui-editor-table-context-menu",
  EditorInsertTableGrid: "ui-editor-insert-table-grid",
  EditorTableOverlay: "ui-editor-table-overlay"
} as const;

export const VUE_ADAPTER_NOTE =
  "Thin adapter only: attrs and slots pass through to custom elements and DOM events map to typed callbacks.";
