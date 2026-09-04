import {
  defineComponent,
  h,
  type PropType,
  shallowRef,
  watchEffect,
  type ComponentPublicInstance,
} from "vue";
import type { SlashMenuAnchorRect, SlashMenuItem } from "@threadlabs/looma-editor";
import {
  createAdapterComponent,
  toHTMLElement,
  type AdapterAttrs,
  type AdapterEventBinding,
} from "../adapter";
import type {
  InsertTableEventDetail,
  SlashMenuHighlightEventDetail,
  SlashMenuSelectEventDetail,
  TableContextMenuActionEventDetail,
  TableOverlayActionEventDetail,
} from "@threadlabs/looma-editor/ui";

export interface VueEditorAdapterEventMap {
  tableAction: TableContextMenuActionEventDetail;
  insertTable: InsertTableEventDetail;
  tableOverlayAction: TableOverlayActionEventDetail;
  slashMenuHighlight: SlashMenuHighlightEventDetail;
  slashMenuSelect: SlashMenuSelectEventDetail;
}

type EditorAdapterAttrs = AdapterAttrs & {
  onTableAction?: (detail: VueEditorAdapterEventMap["tableAction"]) => void;
  onInsertTable?: (detail: VueEditorAdapterEventMap["insertTable"]) => void;
  onTableOverlayAction?: (detail: VueEditorAdapterEventMap["tableOverlayAction"]) => void;
  onSlashMenuHighlight?: (detail: VueEditorAdapterEventMap["slashMenuHighlight"]) => void;
  onSlashMenuSelect?: (detail: VueEditorAdapterEventMap["slashMenuSelect"]) => void;
};

const EDITOR_EVENT_BINDINGS = [
  ["looma-editor-table-action", "onTableAction"],
  ["looma-editor-insert-table", "onInsertTable"],
  ["looma-editor-table-overlay-action", "onTableOverlayAction"],
] as const satisfies readonly AdapterEventBinding[];

export const EditorSlashMenu = defineComponent({
  name: "EditorSlashMenu",
  inheritAttrs: false,
  props: {
    open: { type: Boolean, default: false },
    query: { type: String, default: "" },
    items: { type: Array as PropType<SlashMenuItem[]>, default: () => [] },
    selectedIndex: { type: Number, default: 0 },
    anchorRect: { type: Object as PropType<SlashMenuAnchorRect | null>, default: null },
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
            anchorRect: SlashMenuAnchorRect | null;
          })
        | null;
      if (!element) return;
      if (element.open !== props.open) element.open = props.open;
      if (element.query !== props.query) element.query = props.query;
      if (element.items !== props.items) element.items = props.items;
      if (element.selectedIndex !== props.selectedIndex) element.selectedIndex = props.selectedIndex;
      if (element.anchorRect !== props.anchorRect) element.anchorRect = props.anchorRect;
    });

    watchEffect((onCleanup) => {
      const element = elementRef.value;
      if (!element) return;

      const callbackAttrs = attrs as EditorAdapterAttrs;
      const handlers: Array<[string, ((event: Event) => void) | undefined]> = [
        [
          "looma-editor-slash-menu-highlight",
          typeof callbackAttrs.onSlashMenuHighlight === "function"
            ? (event) => callbackAttrs.onSlashMenuHighlight?.(
                (event as CustomEvent<VueEditorAdapterEventMap["slashMenuHighlight"]>).detail,
              )
            : undefined,
        ],
        [
          "looma-editor-slash-menu-select",
          typeof callbackAttrs.onSlashMenuSelect === "function"
            ? (event) => callbackAttrs.onSlashMenuSelect?.(
                (event as CustomEvent<VueEditorAdapterEventMap["slashMenuSelect"]>).detail,
              )
            : undefined,
        ],
      ];

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
      const callbackAttrs = attrs as EditorAdapterAttrs;
      const { onSlashMenuHighlight, onSlashMenuSelect, ...forwardedAttrs } = callbackAttrs;
      void onSlashMenuHighlight;
      void onSlashMenuSelect;
      return h("ui-editor-slash-menu", {
        ...forwardedAttrs,
        ref: (value: Element | ComponentPublicInstance | null) => {
          elementRef.value = toHTMLElement(value);
        },
      });
    };
  },
});

export const EditorToolbar = createAdapterComponent("ui-editor-toolbar", "EditorToolbar", EDITOR_EVENT_BINDINGS);
export const EditorTableContextMenu = createAdapterComponent("ui-editor-table-context-menu", "EditorTableContextMenu", EDITOR_EVENT_BINDINGS);
export const EditorTableToolbar = createAdapterComponent("ui-editor-table-toolbar", "EditorTableToolbar", EDITOR_EVENT_BINDINGS);
export const EditorInsertTableGrid = createAdapterComponent("ui-editor-insert-table-grid", "EditorInsertTableGrid", EDITOR_EVENT_BINDINGS);
export const EditorTableOverlay = createAdapterComponent("ui-editor-table-overlay", "EditorTableOverlay", EDITOR_EVENT_BINDINGS);

export const EDITOR_ADAPTER_COMPONENT_TAG_MAP = {
  EditorToolbar: "ui-editor-toolbar",
  EditorSlashMenu: "ui-editor-slash-menu",
  EditorTableContextMenu: "ui-editor-table-context-menu",
  EditorTableToolbar: "ui-editor-table-toolbar",
  EditorInsertTableGrid: "ui-editor-insert-table-grid",
  EditorTableOverlay: "ui-editor-table-overlay",
} as const;
