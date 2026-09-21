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

/**
 * Native editor event details unwrapped for Vue callback attributes.
 * Multiple menu primitives share `highlight` and `select` because their index
 * semantics are identical; table primitives share the typed action channel.
 */
export interface VueEditorAdapterEventMap {
  highlight: MentionMenuHighlightEventDetail | SlashMenuHighlightEventDetail;
  select: MentionMenuSelectEventDetail | SlashMenuSelectEventDetail;
  action: TableContextMenuActionEventDetail | TableOverlayActionEventDetail;
  insert: InsertTableEventDetail;
}

type EditorAdapterAttrs = AdapterAttrs & {
  onHighlight?: (detail: VueEditorAdapterEventMap["highlight"]) => void;
  onSelect?: (detail: VueEditorAdapterEventMap["select"]) => void;
  onAction?: (detail: VueEditorAdapterEventMap["action"]) => void;
  onInsert?: (detail: VueEditorAdapterEventMap["insert"]) => void;
};

function createSuggestionMenuAdapter<Item>(
  name: "EditorSlashMenu" | "EditorMentionMenu",
) {
  const component = name === "EditorSlashMenu" ? UiEditorSlashMenu : UiEditorMentionMenu;
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
        const highlightCallback = callbackAttrs.onHighlight;
        const selectCallback = callbackAttrs.onSelect;
        const highlightHandler = typeof highlightCallback === "function"
          ? (event: Event) => highlightCallback((event as CustomEvent<{ index: number }>).detail)
          : undefined;
        const selectHandler = typeof selectCallback === "function"
          ? (event: Event) => selectCallback((event as CustomEvent<{ index: number }>).detail)
          : undefined;
        if (highlightHandler) element.addEventListener("highlight", highlightHandler);
        if (selectHandler) element.addEventListener("select", selectHandler);
        onCleanup(() => {
          if (highlightHandler) element.removeEventListener("highlight", highlightHandler);
          if (selectHandler) element.removeEventListener("select", selectHandler);
        });
      });

      return () => {
        const callbackAttrs = attrs as EditorAdapterAttrs;
        const {
          onHighlight,
          onSelect,
          ...forwardedAttrs
        } = callbackAttrs;
        void onHighlight;
        void onSelect;
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

const ACTION_EVENT_BINDINGS = [["action", "onAction"]] as const satisfies readonly AdapterEventBinding[];
const INSERT_EVENT_BINDINGS = [["insert", "onInsert"]] as const satisfies readonly AdapterEventBinding[];

/**
 * Vue projection of the slash suggestion menu with lifecycle-safe event wiring.
 */
export const EditorSlashMenu = createSuggestionMenuAdapter<SlashMenuItem>(
  "EditorSlashMenu",
);
/** Vue projection of the mention menu using the shared suggestion lifecycle. */
export const EditorMentionMenu = createSuggestionMenuAdapter<LoomaMentionItem>(
  "EditorMentionMenu",
);

/** Vue projection of the editor toolbar's semantic layout shell. */
export const EditorToolbar = createAdapterComponent(UiEditorToolbar, "EditorToolbar");
/** Vue projection that unwraps context-menu table actions for callbacks. */
export const EditorTableContextMenu = createAdapterComponent(UiEditorTableContextMenu, "EditorTableContextMenu", ACTION_EVENT_BINDINGS);
/** Vue projection that unwraps toolbar table actions for callbacks. */
export const EditorTableToolbar = createAdapterComponent(UiEditorTableToolbar, "EditorTableToolbar", ACTION_EVENT_BINDINGS);
/** Vue projection that reports the selected table dimensions as insert intent. */
export const EditorInsertTableGrid = createAdapterComponent(UiEditorInsertTableGrid, "EditorInsertTableGrid", INSERT_EVENT_BINDINGS);
/**
 * Vue projection of editor-owned table geometry and boundary actions.
 * Geometry is assigned as a DOM property so structured measurements are never
 * serialized through attributes.
 */
export const EditorTableOverlay = createAdapterComponent(
  UiEditorTableOverlay,
  "EditorTableOverlay",
  ACTION_EVENT_BINDINGS,
  "class",
  ["geometry"] satisfies readonly (keyof { geometry: TableOverlayGeometry | null })[],
);

/**
 * Canonical Vue editor export-to-native-tag correspondence used by parity
 * checks and tooling that must enumerate opt-in editor primitives.
 */
export const EDITOR_ADAPTER_COMPONENT_TAG_MAP = {
  EditorToolbar: "ui-editor-toolbar",
  EditorSlashMenu: "ui-editor-slash-menu",
  EditorMentionMenu: "ui-editor-mention-menu",
  EditorTableContextMenu: "ui-editor-table-context-menu",
  EditorTableToolbar: "ui-editor-table-toolbar",
  EditorInsertTableGrid: "ui-editor-insert-table-grid",
  EditorTableOverlay: "ui-editor-table-overlay",
} as const;
