import {
  defineComponent,
  h,
  type PropType,
  shallowRef,
  watchEffect,
  type ComponentPublicInstance,
} from "vue";
import type {
  LoomaMentionItem,
  SlashMenuAnchorRect,
  SlashMenuItem,
  TableOverlayGeometry,
} from "@threadlabs/looma-editor";
import {
  createAdapterComponent,
  toHTMLElement,
  type AdapterAttrs,
  type AdapterEventBinding,
} from "../adapter";
import type {
  InsertTableEventDetail,
  MentionMenuHighlightEventDetail,
  MentionMenuSelectEventDetail,
  SlashMenuHighlightEventDetail,
  SlashMenuSelectEventDetail,
  TableContextMenuActionEventDetail,
  TableOverlayActionEventDetail,
} from "@threadlabs/looma-editor/ui";
import {
  UiEditorInsertTableGrid,
  UiEditorMentionMenu,
  UiEditorSlashMenu,
  UiEditorTableContextMenu,
  UiEditorTableOverlay,
  UiEditorTableToolbar,
  UiEditorToolbar,
} from "../generated";

export interface VueEditorAdapterEventMap {
  mentionMenuHighlight: MentionMenuHighlightEventDetail;
  mentionMenuSelect: MentionMenuSelectEventDetail;
  tableAction: TableContextMenuActionEventDetail;
  insertTable: InsertTableEventDetail;
  tableOverlayAction: TableOverlayActionEventDetail;
  slashMenuHighlight: SlashMenuHighlightEventDetail;
  slashMenuSelect: SlashMenuSelectEventDetail;
}

type EditorAdapterAttrs = AdapterAttrs & {
  onMentionMenuHighlight?: (detail: VueEditorAdapterEventMap["mentionMenuHighlight"]) => void;
  onMentionMenuSelect?: (detail: VueEditorAdapterEventMap["mentionMenuSelect"]) => void;
  onTableAction?: (detail: VueEditorAdapterEventMap["tableAction"]) => void;
  onInsertTable?: (detail: VueEditorAdapterEventMap["insertTable"]) => void;
  onTableOverlayAction?: (detail: VueEditorAdapterEventMap["tableOverlayAction"]) => void;
  onSlashMenuHighlight?: (detail: VueEditorAdapterEventMap["slashMenuHighlight"]) => void;
  onSlashMenuSelect?: (detail: VueEditorAdapterEventMap["slashMenuSelect"]) => void;
};

function createSuggestionMenuAdapter<Item>(
  name: "EditorSlashMenu" | "EditorMentionMenu",
  eventPrefix: "slash" | "mention",
) {
  const component = eventPrefix === "slash" ? UiEditorSlashMenu : UiEditorMentionMenu;
  return defineComponent({
    name,
    inheritAttrs: false,
    props: {
      open: { type: Boolean, default: false },
      query: { type: String, default: "" },
      items: { type: Array as PropType<Item[]>, default: () => [] },
      selectedIndex: { type: Number, default: 0 },
      anchorRect: { type: Object as PropType<SlashMenuAnchorRect | null>, default: null },
      loading: { type: Boolean, default: false },
    },
    setup(props, { attrs }) {
      const elementRef = shallowRef<HTMLElement | null>(null);

      watchEffect((onCleanup) => {
        const element = elementRef.value;
        if (!element) return;
        const callbackAttrs = attrs as EditorAdapterAttrs;
        const highlightCallback = eventPrefix === "slash"
          ? callbackAttrs.onSlashMenuHighlight
          : callbackAttrs.onMentionMenuHighlight;
        const selectCallback = eventPrefix === "slash"
          ? callbackAttrs.onSlashMenuSelect
          : callbackAttrs.onMentionMenuSelect;
        const eventBase = `looma-editor-${eventPrefix}-menu`;
        const highlightHandler = typeof highlightCallback === "function"
          ? (event: Event) => highlightCallback((event as CustomEvent<{ index: number }>).detail)
          : undefined;
        const selectHandler = typeof selectCallback === "function"
          ? (event: Event) => selectCallback((event as CustomEvent<{ index: number }>).detail)
          : undefined;
        if (highlightHandler) element.addEventListener(`${eventBase}-highlight`, highlightHandler);
        if (selectHandler) element.addEventListener(`${eventBase}-select`, selectHandler);
        onCleanup(() => {
          if (highlightHandler) element.removeEventListener(`${eventBase}-highlight`, highlightHandler);
          if (selectHandler) element.removeEventListener(`${eventBase}-select`, selectHandler);
        });
      });

      return () => {
        const callbackAttrs = attrs as EditorAdapterAttrs;
        const {
          onMentionMenuHighlight,
          onMentionMenuSelect,
          onSlashMenuHighlight,
          onSlashMenuSelect,
          ...forwardedAttrs
        } = callbackAttrs;
        void onMentionMenuHighlight;
        void onMentionMenuSelect;
        void onSlashMenuHighlight;
        void onSlashMenuSelect;
        return h(component, {
          ...props,
          ...forwardedAttrs,
          ref: (value: Element | ComponentPublicInstance | null) => {
            elementRef.value = toHTMLElement(value);
          },
        });
      };
    },
  });
}

const EDITOR_EVENT_BINDINGS = [
  ["looma-editor-table-action", "onTableAction"],
  ["looma-editor-insert-table", "onInsertTable"],
  ["looma-editor-table-overlay-action", "onTableOverlayAction"],
] as const satisfies readonly AdapterEventBinding[];

export const EditorSlashMenu = createSuggestionMenuAdapter<SlashMenuItem>(
  "EditorSlashMenu",
  "slash",
);
export const EditorMentionMenu = createSuggestionMenuAdapter<LoomaMentionItem>(
  "EditorMentionMenu",
  "mention",
);

export const EditorToolbar = createAdapterComponent(UiEditorToolbar, "EditorToolbar", EDITOR_EVENT_BINDINGS);
export const EditorTableContextMenu = createAdapterComponent(UiEditorTableContextMenu, "EditorTableContextMenu", EDITOR_EVENT_BINDINGS);
export const EditorTableToolbar = createAdapterComponent(UiEditorTableToolbar, "EditorTableToolbar", EDITOR_EVENT_BINDINGS);
export const EditorInsertTableGrid = createAdapterComponent(UiEditorInsertTableGrid, "EditorInsertTableGrid", EDITOR_EVENT_BINDINGS);
export const EditorTableOverlay = createAdapterComponent(
  UiEditorTableOverlay,
  "EditorTableOverlay",
  EDITOR_EVENT_BINDINGS,
  "class",
  ["geometry"] satisfies readonly (keyof { geometry: TableOverlayGeometry | null })[],
);

export const EDITOR_ADAPTER_COMPONENT_TAG_MAP = {
  EditorToolbar: "ui-editor-toolbar",
  EditorSlashMenu: "ui-editor-slash-menu",
  EditorMentionMenu: "ui-editor-mention-menu",
  EditorTableContextMenu: "ui-editor-table-context-menu",
  EditorTableToolbar: "ui-editor-table-toolbar",
  EditorInsertTableGrid: "ui-editor-insert-table-grid",
  EditorTableOverlay: "ui-editor-table-overlay",
} as const;
