import type { AnyExtension, Editor, JSONContent } from "@tiptap/core";
import { BubbleMenu, EditorContent, useEditor } from "@tiptap/vue-3";
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  type CSSProperties,
  type PropType,
} from "vue";
import {
  createLoomaSlashCommandExtension,
  getActiveTableUiState,
  getDefaultEditorExtensions,
  handleTableAction,
  handleTableOverlayAction,
  measureTableOverlayGeometry,
  normalizeActiveTableColumnWidths,
  resolveTableCellAt,
  shouldShowTextFormattingToolbar,
  type LoomaSlashMenuSnapshot,
  type TableOverlayGeometry,
  type TableCellAlignment,
  type TableCellBackground,
  type TableActionCapabilities,
} from "@threadlabs/looma-editor";
import { IconButton } from "../index";
import {
  clampRectToViewport,
  getVisualViewportRect,
  LOOMA_ICONS,
  type LoomaIconName,
} from "@threadlabs/looma-core";
import {
  EditorInsertTableGrid,
  EditorSlashMenu,
  EditorTableContextMenu,
  EditorTableOverlay,
  EditorTableToolbar,
  EditorToolbar,
} from "./primitives";

export interface LoomaImageUploadResult {
  url: string;
  alt?: string;
}

export type LoomaImageUploader = (
  file: File,
) => Promise<string | LoomaImageUploadResult>;

const EMPTY_DOCUMENT: JSONContent = { type: "doc", content: [] };

const EMPTY_CAPABILITIES: TableActionCapabilities = {
  canAddRowBefore: false,
  canAddRowAfter: false,
  canAddColumnBefore: false,
  canAddColumnAfter: false,
  canDeleteRow: false,
  canDeleteColumn: false,
  canDeleteTable: false,
  canMergeCells: false,
  canSplitCell: false,
};

function sameDocument(left: JSONContent, right: JSONContent): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function selectedTableElement(editor: Editor): HTMLTableElement | null {
  const { node } = editor.view.domAtPos(editor.state.selection.from);
  const element = node instanceof HTMLElement ? node : node.parentElement;
  return element?.closest("table") as HTMLTableElement | null;
}

function selectedTableCellElement(editor: Editor): HTMLTableCellElement | null {
  const { node } = editor.view.domAtPos(editor.state.selection.from);
  const element = node instanceof HTMLElement ? node : node.parentElement;
  return element?.closest("td, th") as HTMLTableCellElement | null;
}

function loomaIcon(name: LoomaIconName) {
  return h("svg", {
    class: "looma-icon",
    "data-looma-icon": name,
    "aria-hidden": "true",
    focusable: "false",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  }, LOOMA_ICONS[name].map(([tag, attributes]) => h(tag, attributes)));
}

export const LoomaEditor = defineComponent({
  name: "LoomaEditor",
  inheritAttrs: false,
  props: {
    modelValue: {
      type: Object as PropType<JSONContent>,
      default: () => ({ ...EMPTY_DOCUMENT }),
    },
    editable: { type: Boolean, default: true },
    placeholder: {
      type: String,
      default: "Type “/” for commands, or start writing…",
    },
    extensions: {
      type: Array as PropType<AnyExtension[]>,
      default: () => [],
    },
    uploadImage: {
      type: Function as PropType<LoomaImageUploader | undefined>,
      default: undefined,
    },
  },
  emits: {
    "update:modelValue": (_value: JSONContent) => true,
    update: (_value: JSONContent) => true,
    ready: (_editor: Editor) => true,
    uploadError: (_error: unknown, _file: File) => true,
  },
  setup(props, { attrs, emit, expose }) {
    const root = ref<HTMLElement | null>(null);
    const fileInput = ref<HTMLInputElement | null>(null);
    const tablePickerAnchor = ref<HTMLElement | null>(null);
    const tablePickerPopover = ref<HTMLElement | null>(null);
    const tableToolbarShell = ref<HTMLElement | null>(null);
    const tableOverlayShell = ref<HTMLElement | null>(null);
    const tableMenuShell = ref<HTMLElement | null>(null);
    const mobileToolbarShell = ref<HTMLElement | null>(null);
    const dragOver = ref(false);
    const uploading = ref(false);
    const tablePickerOpen = ref(false);
    const tablePickerStyle = ref<CSSProperties>({});
    const mobileToolbarStyle = ref<CSSProperties>({});
    const mobile = ref(typeof window !== "undefined" && window.innerWidth <= 767);
    const editorFocused = ref(false);
    const mobileToolbarMode = ref<"formatting" | "table">("formatting");
    let dragLeaveTimer: ReturnType<typeof setTimeout> | null = null;
    let tableResizeActive = false;
    let tableInteractionActive = false;
    let mobileTableControlsDismissed = false;
    let hoveredTableCell: HTMLTableCellElement | null = null;
    let overlayTableElement: HTMLTableElement | null = null;
    let tablePointerFrame: number | null = null;

    const slash = reactive<LoomaSlashMenuSnapshot>({
      active: false,
      items: [],
      selectedIndex: 0,
      query: "",
      rect: null,
      select: null,
    });

    const tableUi = reactive({
      toolbarOpen: false,
      overlayOpen: false,
      menuOpen: false,
      alignment: "left" as TableCellAlignment,
      background: null as TableCellBackground,
      rows: 0,
      cols: 0,
      geometry: null as TableOverlayGeometry | null,
      toolbarStyle: {} as CSSProperties,
      overlayStyle: {} as CSSProperties,
      menuStyle: {} as CSSProperties,
      capabilities: { ...EMPTY_CAPABILITIES },
    });

    const slashExtension = createLoomaSlashCommandExtension({
      onOpenImagePicker: () => fileInput.value?.click(),
      onStateChange: (state) => {
        Object.assign(slash, state);
      },
    });

    const editor = useEditor({
      extensions: [
        ...getDefaultEditorExtensions({ placeholder: props.placeholder }),
        slashExtension,
        ...props.extensions,
      ],
      content: props.modelValue,
      editable: props.editable,
      onCreate: ({ editor: instance }) => emit("ready", instance),
      onUpdate: ({ editor: instance }) => {
        const value = instance.getJSON();
        emit("update:modelValue", value);
        emit("update", value);
      },
    });

    watch(() => props.editable, (editable) => editor.value?.setEditable(editable));
    watch(() => props.modelValue, (value) => {
      const instance = editor.value;
      if (!instance || sameDocument(instance.getJSON(), value)) return;
      instance.commands.setContent(value, false);
    }, { deep: true });

    const closeTableUi = () => {
      tableUi.toolbarOpen = false;
      tableUi.overlayOpen = false;
      tableUi.menuOpen = false;
      tableUi.alignment = "left";
      tableUi.background = null;
      tableUi.geometry = null;
      tableUi.capabilities = { ...EMPTY_CAPABILITIES };
      overlayTableElement = null;
      mobileTableControlsDismissed = false;
      mobileToolbarMode.value = "formatting";
    };

    const updateMobileViewport = () => {
      mobile.value = window.innerWidth <= 767;
      if (!mobile.value) {
        mobileToolbarStyle.value = {};
        return;
      }

      nextTick(() => {
        const viewport = getVisualViewportRect(window);
        const toolbarHeight = mobileToolbarShell.value?.getBoundingClientRect().height || 56;
        mobileToolbarStyle.value = {
          left: `${viewport.left}px`,
          top: `${Math.max(viewport.top, viewport.bottom - toolbarHeight)}px`,
          width: `${viewport.width}px`,
        };
      });
    };

    const updateTableUi = () => {
      const instance = editor.value;
      if (
        !instance
        || !props.editable
        || (!instance.isFocused && !tableInteractionActive && !hoveredTableCell)
      ) {
        closeTableUi();
        return;
      }
      const state = getActiveTableUiState(instance);
      const selectedTable = selectedTableElement(instance);
      const hoveredTable = hoveredTableCell?.closest<HTMLTableElement>("table") ?? null;
      const table = hoveredTable ?? selectedTable;
      if (!table) {
        closeTableUi();
        return;
      }
      const selectedTableIsActive = state.active && selectedTable === table;
      overlayTableElement = table;

      if (selectedTableIsActive && !mobileTableControlsDismissed) mobileToolbarMode.value = "table";

      const rect = table.getBoundingClientRect();
      const maxToolbarWidth = Math.min(420, window.innerWidth - 24);
      const toolbarLeft = Math.min(
        Math.max(12, rect.left + (rect.width - maxToolbarWidth) / 2),
        Math.max(12, window.innerWidth - maxToolbarWidth - 12),
      );
      tableUi.toolbarOpen = selectedTableIsActive && state.showToolbar && !mobile.value;
      tableUi.overlayOpen = !mobile.value;
      tableUi.alignment = selectedTableIsActive ? state.cellAlignment : "left";
      tableUi.background = selectedTableIsActive ? state.cellBackground : null;
      tableUi.capabilities = selectedTableIsActive ? state.capabilities : { ...EMPTY_CAPABILITIES };
      const selectedCell = selectedTableIsActive ? selectedTableCellElement(instance) : null;
      const geometry = measureTableOverlayGeometry(
        table,
        selectedCell,
        hoveredTableCell && table.contains(hoveredTableCell) ? hoveredTableCell : null,
      );
      tableUi.rows = Math.max(0, geometry.rowBoundaries.length - 1);
      tableUi.cols = Math.max(0, geometry.columnBoundaries.length - 1);
      tableUi.geometry = geometry;
      tableUi.toolbarStyle = {
        top: `${rect.top > 76 ? rect.top - 52 : rect.bottom + 12}px`,
        left: `${toolbarLeft}px`,
        maxWidth: `${maxToolbarWidth}px`,
      };
      tableUi.overlayStyle = {
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      };
    };

    const onEditorFocus = () => {
      editorFocused.value = true;
      updateTableUi();
      updateMobileViewport();
    };

    const onEditorBlur = () => {
      updateTableUi();
      setTimeout(() => {
        if (!tableInteractionActive && !editor.value?.isFocused) editorFocused.value = false;
      }, 0);
    };

    const bindEditorUi = (instance: Editor | undefined) => {
      if (!instance) return;
      instance.on("selectionUpdate", updateTableUi);
      instance.on("transaction", updateTableUi);
      instance.on("focus", onEditorFocus);
      instance.on("blur", onEditorBlur);
      nextTick(updateTableUi);
    };

    const unbindEditorUi = (instance: Editor | undefined) => {
      if (!instance) return;
      instance.off("selectionUpdate", updateTableUi);
      instance.off("transaction", updateTableUi);
      instance.off("focus", onEditorFocus);
      instance.off("blur", onEditorBlur);
    };

    watch(editor, (instance, previous) => {
      unbindEditorUi(previous);
      bindEditorUi(instance);
    }, { immediate: true });

    const updateTablePickerPosition = () => {
      const anchor = tablePickerAnchor.value;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const viewport = getVisualViewportRect(window);
      const width = 220;
      const popoverHeight = tablePickerPopover.value?.getBoundingClientRect().height || 300;
      const target = {
        left: rect.left,
        top: rect.bottom + 8,
        right: rect.left + width,
        bottom: rect.bottom + 8 + popoverHeight,
        width,
        height: popoverHeight,
      };
      const offset = clampRectToViewport(
        target,
        viewport,
        12,
      );
      const left = target.left + offset.x;
      const top = target.top + offset.y;
      tablePickerStyle.value = window.innerWidth <= 767
        ? {
            position: "fixed",
            left: `${left}px`,
            top: `${Math.max(viewport.top + 12, viewport.bottom - popoverHeight - 64)}px`,
          }
        : { position: "fixed", top: `${top}px`, left: `${left}px` };
    };

    const onViewportChange = () => {
      updateMobileViewport();
      updateTableUi();
      updateTablePickerPosition();
      tableUi.menuOpen = false;
    };

    const onDocumentPointerDown = (event: PointerEvent) => {
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      const inElement = (element: HTMLElement | null) => Boolean(
        element && (path.includes(element) || (event.target instanceof Node && element.contains(event.target)))
      );
      const inTableUi = inElement(tableToolbarShell.value)
        || inElement(tableOverlayShell.value)
        || inElement(tableMenuShell.value)
        || inElement(mobileToolbarShell.value);
      tableInteractionActive = inTableUi;
      if (inTableUi) setTimeout(() => { tableInteractionActive = false; }, 0);

      if (tablePickerOpen.value && !inElement(tablePickerAnchor.value) && !inElement(tablePickerPopover.value)) {
        tablePickerOpen.value = false;
      }

      if (
        (tableUi.toolbarOpen || tableUi.overlayOpen || tableUi.menuOpen)
        && !inElement(root.value)
        && !inTableUi
      ) {
        closeTableUi();
      }
    };

    const onResizePointerDown = (event: PointerEvent) => {
      tableResizeActive = event.target instanceof HTMLElement
        && event.target.classList.contains("column-resize-handle");
    };

    const onResizePointerUp = () => {
      if (!tableResizeActive) return;
      tableResizeActive = false;
      requestAnimationFrame(() => {
        const instance = editor.value;
        const table = instance ? selectedTableElement(instance) : null;
        if (instance && table) normalizeActiveTableColumnWidths(instance, table);
        nextTick(updateTableUi);
      });
    };

    onMounted(() => {
      updateMobileViewport();
      window.addEventListener("resize", onViewportChange);
      window.addEventListener("scroll", onViewportChange, true);
      window.visualViewport?.addEventListener("resize", onViewportChange);
      window.visualViewport?.addEventListener("scroll", onViewportChange);
      document.addEventListener("pointerdown", onDocumentPointerDown, true);
      document.addEventListener("pointerdown", onResizePointerDown, true);
      document.addEventListener("pointerup", onResizePointerUp, true);
    });
    onBeforeUnmount(() => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      document.removeEventListener("pointerdown", onResizePointerDown, true);
      document.removeEventListener("pointerup", onResizePointerUp, true);
      unbindEditorUi(editor.value);
      if (dragLeaveTimer) clearTimeout(dragLeaveTimer);
      if (tablePointerFrame !== null) cancelAnimationFrame(tablePointerFrame);
    });

    const insertImage = async (file: File) => {
      if (!props.uploadImage || !editor.value) return;
      uploading.value = true;
      try {
        const result = await props.uploadImage(file);
        const image = typeof result === "string" ? { url: result } : result;
        editor.value.chain().focus().setImage({ src: image.url, alt: image.alt ?? file.name }).run();
      } catch (error) {
        emit("uploadError", error, file);
      } finally {
        uploading.value = false;
      }
    };

    const onFileChange = async (event: Event) => {
      const input = event.target as HTMLInputElement;
      const files = Array.from(input.files ?? []);
      input.value = "";
      for (const file of files) await insertImage(file);
    };

    const onDrop = async (event: DragEvent) => {
      event.preventDefault();
      dragOver.value = false;
      if (!props.editable) return;
      const files = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith("image/"));
      for (const file of files) await insertImage(file);
    };

    const onContextMenu = (event: MouseEvent) => {
      const instance = editor.value;
      const cell = event.target instanceof HTMLElement ? event.target.closest("td, th") : null;
      if (!props.editable || !instance || !(cell instanceof HTMLElement)) {
        tableUi.menuOpen = false;
        return;
      }
      event.preventDefault();
      const currentCell = selectedTableCellElement(instance);
      if (currentCell !== cell && !cell.classList.contains("selectedCell")) {
        instance.chain().focus().setTextSelection(instance.view.posAtDOM(cell, 0) + 1).run();
      }
      updateTableUi();
      tableUi.menuOpen = true;
      tableUi.menuStyle = { top: `${event.clientY}px`, left: `${event.clientX}px` };
    };

    const runTableAction = (detail: Parameters<typeof handleTableAction>[1]) => {
      if (!editor.value) return;
      handleTableAction(editor.value, detail);
      tableUi.menuOpen = false;
      nextTick(updateTableUi);
    };

    const runOverlayAction = (detail: Parameters<typeof handleTableOverlayAction>[1]) => {
      const instance = editor.value;
      if (!instance) return;
      const table = overlayTableElement ?? selectedTableElement(instance);
      if (!table) return;
      const targetCell = "rowIndex" in detail
        ? resolveTableCellAt(table, detail.rowIndex, detail.columnIndex)
        : resolveTableCellAt(
            table,
            detail.action.startsWith("add-row") ? Math.max(0, detail.boundaryIndex - 1) : 0,
            detail.action.startsWith("add-column") ? Math.max(0, detail.boundaryIndex - 1) : 0,
          );
      if (targetCell && selectedTableElement(instance) !== table) {
        instance.chain().focus().setTextSelection(instance.view.posAtDOM(targetCell, 0) + 1).run();
      }
      if (detail.action === "open-cell-menu") {
        const selectedCell = selectedTableCellElement(instance);
        const cell = table
          ? resolveTableCellAt(table, detail.rowIndex, detail.columnIndex) ?? selectedCell
          : selectedCell;
        if (cell && selectedCell !== cell && !cell.classList.contains("selectedCell")) {
          instance.chain().focus().setTextSelection(instance.view.posAtDOM(cell, 0) + 1).run();
        } else {
          instance.commands.focus();
        }
        updateTableUi();
        tableUi.menuStyle = {
          top: `${detail.anchor.bottom + 4}px`,
          left: `${detail.anchor.right}px`,
        };
        tableUi.menuOpen = true;
        return;
      }
      handleTableOverlayAction(instance, detail);
      nextTick(updateTableUi);
    };

    const onEditorPointerOver = (event: PointerEvent) => {
      const cell = event.target instanceof HTMLElement
        ? event.target.closest<HTMLTableCellElement>("td, th")
        : null;
      if (!cell) return;
      if (cell === hoveredTableCell) return;
      hoveredTableCell = cell;
      if (tablePointerFrame !== null) return;
      tablePointerFrame = requestAnimationFrame(() => {
        tablePointerFrame = null;
        updateTableUi();
      });
    };

    const onEditorPointerOut = (event: PointerEvent) => {
      const fromCell = event.target instanceof HTMLElement
        ? event.target.closest<HTMLTableCellElement>("td, th")
        : null;
      if (!fromCell || fromCell !== hoveredTableCell) return;
      const next = event.relatedTarget;
      const toCell = next instanceof HTMLElement
        ? next.closest<HTMLTableCellElement>("td, th")
        : null;
      if (toCell || (next instanceof Node && tableOverlayShell.value?.contains(next))) return;
      hoveredTableCell = null;
      nextTick(updateTableUi);
    };

    const onEditorPointerLeave = (event: PointerEvent) => {
      const next = event.relatedTarget;
      if (
        next instanceof Node
        && (
          tableOverlayShell.value?.contains(next)
          || tableToolbarShell.value?.contains(next)
          || tableMenuShell.value?.contains(next)
        )
      ) return;
      if (!hoveredTableCell) return;
      hoveredTableCell = null;
      nextTick(updateTableUi);
    };

    const onTableOverlayPointerLeave = (event: PointerEvent) => {
      const next = event.relatedTarget;
      if (
        next instanceof Node
        && (
          root.value?.contains(next)
          || tableToolbarShell.value?.contains(next)
          || tableMenuShell.value?.contains(next)
        )
      ) return;
      if (!hoveredTableCell) return;
      hoveredTableCell = null;
      nextTick(updateTableUi);
    };

    const commandButton = (
      label: string,
      icon: LoomaIconName,
      active: boolean,
      disabled: boolean,
      run: () => void,
    ) => h(IconButton, {
      class: "looma-editor__toolbar-button",
      label,
      title: label,
      size: "sm",
      variant: active ? "solid" : "ghost",
      disabled,
      "data-active": active ? "true" : "false",
      onClick: run,
    }, () => loomaIcon(icon));

    const renderToolbar = (instance: Editor) => {
      const buttons = [
        commandButton("Bold", "bold", instance.isActive("bold"), !instance.can().toggleBold(), () => instance.chain().focus().toggleBold().run()),
        commandButton("Italic", "italic", instance.isActive("italic"), !instance.can().toggleItalic(), () => instance.chain().focus().toggleItalic().run()),
        commandButton("Underline", "underline", instance.isActive("underline"), !instance.can().toggleUnderline(), () => instance.chain().focus().toggleUnderline().run()),
        commandButton("Strike", "strikethrough", instance.isActive("strike"), !instance.can().toggleStrike(), () => instance.chain().focus().toggleStrike().run()),
        commandButton("Highlight", "highlighter", instance.isActive("highlight"), !instance.can().toggleHighlight(), () => instance.chain().focus().toggleHighlight().run()),
        commandButton("Inline code", "code-xml", instance.isActive("code"), !instance.can().toggleCode(), () => instance.chain().focus().toggleCode().run()),
        h("span", { class: "ui-editor-toolbar__divider", "aria-hidden": "true" }),
        commandButton("Heading 1", "heading-1", instance.isActive("heading", { level: 1 }), false, () => instance.chain().focus().toggleHeading({ level: 1 }).run()),
        commandButton("Heading 2", "heading-2", instance.isActive("heading", { level: 2 }), false, () => instance.chain().focus().toggleHeading({ level: 2 }).run()),
        commandButton("Heading 3", "heading-3", instance.isActive("heading", { level: 3 }), false, () => instance.chain().focus().toggleHeading({ level: 3 }).run()),
        commandButton("Bullet list", "list", instance.isActive("bulletList"), false, () => instance.chain().focus().toggleBulletList().run()),
        commandButton("Numbered list", "list-ordered", instance.isActive("orderedList"), false, () => instance.chain().focus().toggleOrderedList().run()),
        commandButton("Checklist", "list-todo", instance.isActive("taskList"), false, () => instance.chain().focus().toggleTaskList().run()),
        commandButton("Blockquote", "quote", instance.isActive("blockquote"), !instance.can().toggleBlockquote(), () => instance.chain().focus().toggleBlockquote().run()),
        commandButton("Code block", "braces", instance.isActive("codeBlock"), !instance.can().toggleCodeBlock(), () => instance.chain().focus().toggleCodeBlock().run()),
        commandButton("Divider", "minus", false, !instance.can().setHorizontalRule(), () => instance.chain().focus().setHorizontalRule().run()),
        h("span", { class: "ui-editor-toolbar__divider", "aria-hidden": "true" }),
        h("span", { ref: tablePickerAnchor, class: "looma-editor__table-picker-anchor" }, [
          commandButton("Insert table", "table", false, false, () => {
            tablePickerOpen.value = !tablePickerOpen.value;
            nextTick(updateTablePickerPosition);
          }),
        ]),
        commandButton(uploading.value ? "Uploading image" : "Insert image", "image", false, uploading.value || !props.uploadImage, () => fileInput.value?.click()),
        h("span", { class: "ui-editor-toolbar__divider", "aria-hidden": "true" }),
        commandButton("Undo", "undo", false, !instance.can().undo(), () => instance.chain().focus().undo().run()),
        commandButton("Redo", "redo", false, !instance.can().redo(), () => instance.chain().focus().redo().run()),
      ];
      return h(EditorToolbar, { floating: "" }, () => buttons);
    };

    const focus = (position: "start" | "end" = "start") => {
      editor.value?.commands.focus(position);
    };
    expose({ editor, focus });

    return () => {
      const instance = editor.value;
      const tableProps = {
        open: true,
        "cell-alignment": tableUi.alignment,
        "cell-background": tableUi.background ?? undefined,
        "can-add-row-before": tableUi.capabilities.canAddRowBefore,
        "can-add-row-after": tableUi.capabilities.canAddRowAfter,
        "can-add-column-before": tableUi.capabilities.canAddColumnBefore,
        "can-add-column-after": tableUi.capabilities.canAddColumnAfter,
        "can-delete-row": tableUi.capabilities.canDeleteRow,
        "can-delete-column": tableUi.capabilities.canDeleteColumn,
        "can-delete-table": tableUi.capabilities.canDeleteTable,
        "can-merge-cells": tableUi.capabilities.canMergeCells,
        "can-split-cell": tableUi.capabilities.canSplitCell,
        onTableAction: runTableAction,
      };

      return h("div", {
        ...attrs,
        ref: root,
        class: ["looma-editor", attrs.class, { "looma-editor--readonly": !props.editable, "looma-editor--drag-over": dragOver.value }],
        onContextmenu: onContextMenu,
        onPointerover: onEditorPointerOver,
        onPointerout: onEditorPointerOut,
        onPointerleave: onEditorPointerLeave,
        onDragover: (event: DragEvent) => {
          event.preventDefault();
          if (props.editable && Array.from(event.dataTransfer?.types ?? []).includes("Files")) dragOver.value = true;
        },
        onDragleave: () => {
          if (dragLeaveTimer) clearTimeout(dragLeaveTimer);
          dragLeaveTimer = setTimeout(() => { dragOver.value = false; }, 100);
        },
        onDrop,
      }, [
        instance && props.editable && !mobile.value
          ? h(BubbleMenu, {
              editor: instance,
              pluginKey: "looma-text-formatting-menu",
              shouldShow: ({ editor: menuEditor, from, to }: { editor: Editor; from: number; to: number }) =>
                shouldShowTextFormattingToolbar(menuEditor, from, to),
              tippyOptions: {
                appendTo: () => root.value ?? document.body,
                duration: 100,
                maxWidth: "none",
                placement: "top",
              },
            }, { default: () => renderToolbar(instance) })
          : null,
        instance ? h(EditorContent, { editor: instance }) : null,
        instance && props.editable && mobile.value && editorFocused.value
          ? h("div", {
              ref: mobileToolbarShell,
              class: "looma-editor__mobile-toolbar-shell",
              "data-mode": mobileToolbarMode.value,
              style: mobileToolbarStyle.value,
              role: "toolbar",
              "aria-label": mobileToolbarMode.value === "table" ? "Table editing" : "Text formatting",
            }, mobileToolbarMode.value === "table"
              ? [
                  h("button", {
                    class: "looma-editor__mobile-toolbar-back",
                    type: "button",
                    "aria-label": "Formatting tools",
                    onClick: () => {
                      mobileTableControlsDismissed = true;
                      mobileToolbarMode.value = "formatting";
                      editor.value?.commands.focus();
                      nextTick(updateMobileViewport);
                    },
                  }, [loomaIcon("chevron-left"), h("span", "Formatting")]),
                  h(EditorTableToolbar, tableProps),
                ]
              : [renderToolbar(instance)])
          : null,
        h("input", {
          ref: fileInput,
          class: "looma-editor__file-input",
          type: "file",
          accept: "image/jpeg,image/png,image/gif,image/webp,image/svg+xml",
          multiple: true,
          tabindex: -1,
          "aria-hidden": "true",
          onChange: onFileChange,
        }),
        dragOver.value
          ? h("div", { class: "looma-editor__drop-overlay", "aria-hidden": "true" }, [
              loomaIcon("image"),
              h("span", "Drop image to upload"),
            ])
          : null,
        tablePickerOpen.value
          ? h("div", {
              ref: tablePickerPopover,
              class: "looma-editor__table-picker-popover",
              style: tablePickerStyle.value,
            }, [h(EditorInsertTableGrid, {
              open: true,
              onInsertTable: (detail: { rows: number; cols: number; withHeaderRow: boolean }) => {
                instance?.chain().focus().insertTable(detail).run();
                tablePickerOpen.value = false;
              },
            })])
          : null,
        slash.active && slash.items.length > 0
          ? h(EditorSlashMenu, {
              open: true,
              query: slash.query,
              items: slash.items,
              selectedIndex: slash.selectedIndex,
              anchorRect: slash.rect,
              onSlashMenuHighlight: ({ index }: { index: number }) => { slash.selectedIndex = index; },
              onSlashMenuSelect: ({ index }: { index: number }) => {
                slash.select?.(index);
              },
            })
          : null,
        tableUi.toolbarOpen
          ? h("div", {
              ref: tableToolbarShell,
              class: "looma-editor__table-toolbar-shell",
              style: tableUi.toolbarStyle,
            }, [h(EditorTableToolbar, tableProps)])
          : null,
        tableUi.overlayOpen
          ? h("div", {
              ref: tableOverlayShell,
              class: "looma-editor__table-overlay-shell",
              style: tableUi.overlayStyle,
              onPointerleave: onTableOverlayPointerLeave,
            }, [h(EditorTableOverlay, {
              open: true,
              rows: tableUi.rows,
              cols: tableUi.cols,
              geometry: tableUi.geometry,
              onTableOverlayAction: runOverlayAction,
            })])
          : null,
        tableUi.menuOpen
          ? h("div", {
              ref: tableMenuShell,
              class: "looma-editor__table-menu-shell",
              style: tableUi.menuStyle,
            }, [h(EditorTableContextMenu, tableProps)])
          : null,
      ]);
    };
  },
});
