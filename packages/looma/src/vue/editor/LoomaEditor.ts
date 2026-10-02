import "./looma-editor.css";
import type { AnyExtension, Editor, JSONContent } from "@tiptap/core";
import { BubbleMenu, EditorContent, useEditor } from "@tiptap/vue-3";
import { announceOverlayOpen } from "../../components/shared/overlay.js";
import { closeHistory } from "@tiptap/pm/history";
import { createLowlight } from "lowlight";
import { TextSelection, type SelectionBookmark } from "@tiptap/pm/state";
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  useId,
  watch,
  type CSSProperties,
  type PropType,
  type VNode,
} from "vue";
import {
  createLoomaSlashCommandExtension,
  createLoomaMentionExtension,
  DEFAULT_MENTION_RESULT_LIMIT,
  getActiveTableUiState,
  getDefaultEditorExtensions,
  handleTableAction,
  handleTableOverlayAction,
  measureTableOverlayGeometry,
  normalizeActiveTableColumnWidths,
  resolveTableCellAt,
  shouldShowTextFormattingToolbar,
  type LoomaSlashMenuSnapshot,
  type LoomaMentionItem,
  type LoomaMentionMenuSnapshot,
  type LoomaMentionProvider,
  type LoomaCodeLanguages,
  LOOMA_CHIP_COLORS,
  normalizeLoomaChipColor,
  type LoomaChipColor,
  type SlashMenuAnchorRect,
  type TableOverlayGeometry,
  type TableCellAlignment,
  type TableCellBackground,
  type TableActionCapabilities,
  type TableContextMenuAction,
} from "@threadlabs/looma/editor";
import { Combobox, IconButton, Menu, MenuItem, Popover, Tooltip } from "@threadlabs/looma/vue";
import { getVisualViewportRect, LOOMA_ICONS, type LoomaIconName } from "@threadlabs/looma/editor";
import {
  EditorInsertTableGrid,
  EditorMentionMenu,
  EditorSlashMenu,
  EditorTableContextMenu,
  EditorTableOverlay,
  EditorTableToolbar,
  EditorToolbar,
} from "./primitives";
import {
  createLoomaImageDeliveryController,
  imageDescriptorFromAttrs,
  imageUploadContent,
  normalizeImageDimension,
  type LoomaImageActivationDetail,
  type LoomaImageAttributeResolver,
  type LoomaImageDescriptor,
  type LoomaImageRenditionErrorDetail,
} from "./image-delivery";
import { autoCodeLanguageNames, codeLanguageCatalog } from "./code-language-catalog";

/**
 * Shows a key binding in ProseMirror notation ("Mod-Shift-8") the way the reader's platform writes
 * it: modifier symbols in Apple's order on Apple devices (⇧⌘8), and Ctrl+Shift+8 elsewhere.
 */
function formatEditorShortcut(keys: string, apple: boolean): string {
  const parts = keys.split("-");
  const key = (parts.pop() ?? "").toUpperCase();
  const has = (name: string) => parts.includes(name);
  if (apple) return `${has("Ctrl") ? "⌃" : ""}${has("Alt") ? "⌥" : ""}${has("Shift") ? "⇧" : ""}${has("Mod") ? "⌘" : ""}${key}`;
  return [has("Mod") || has("Ctrl") ? "Ctrl" : "", has("Alt") ? "Alt" : "", has("Shift") ? "Shift" : "", key].filter(Boolean).join("+");
}

// Client Hints report "macOS" in a secure context; navigator.platform reports "MacIntel" or "iPhone".
const isApplePlatform = () => typeof navigator !== "undefined"
  && /mac|iphone|ipad|ipod/i.test((navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || navigator.userAgent);

/**
 * Host upload result normalized into the editor's durable image descriptor.
 * `url` becomes the stored `src`; optional dimensions preserve layout before
 * the image loads and `responsive` opts into host-provided rendition policy.
 */
export interface LoomaImageUploadResult extends Omit<LoomaImageDescriptor, "src"> {
  url: string;
}

/**
 * Application-owned upload boundary used by paste, drop, and file selection.
 *
 * @ownership The application owns network requests, persistence, and returned
 * URLs. Looma owns only editor insertion after the promise fulfills.
 * @failure Rejection leaves the document unchanged and is surfaced through the
 * editor's `uploadError` event so the host chooses retry and user messaging.
 */
export type LoomaImageUploader = (
  file: File,
) => Promise<string | LoomaImageUploadResult>;

/**
 * Chooses whether formatting controls follow a selection, occupy persistent
 * editor chrome, or open from an app-owned button (`popover`, with a text-only
 * bubble for selections); it does not alter document commands or stored content.
 */
export type LoomaEditorToolbarMode = "bubble" | "sticky" | "popover";

const EMPTY_DOCUMENT: JSONContent = { type: "doc", content: [] };
let editorInstanceSequence = 0;

const EMPTY_CAPABILITIES: TableActionCapabilities = {
  canToggleHeaderRow: false,
  canToggleHeaderColumn: false,
  canMoveRowUp: false,
  canMoveRowDown: false,
  canMoveColumnLeft: false,
  canMoveColumnRight: false,
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

function validLinkHref(value: string): string | null {
  const href = value.trim();
  if (!href || /[\u0000-\u001f\u007f]/.test(href)) return null;
  if (/^(\/|#|\?)/.test(href)) return href;
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? href : null;
  } catch {
    return null;
  }
}

function managedMenuAnchorRect(rect: DOMRect | null): SlashMenuAnchorRect | null {
  if (!rect) return null;
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

function managedSlashMenuItems(items: LoomaSlashMenuSnapshot["items"]) {
  return items.map(({ title, description, icon }) => ({
    title,
    description,
    icon,
  }));
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

/**
 * Turnkey Vue editor that composes Looma's framework-neutral Tiptap extensions
 * with declarative menus, image delivery, and table interaction chrome.
 *
 * @ownership The component owns its Tiptap instance and transient UI state;
 * callers own controlled `modelValue`, extension instances, and host services.
 * @lifecycle Mount creates one editor and browser listener set, prop watchers
 * synchronize external state, and unmount cancels frames/listeners and destroys
 * the editor-owned resources.
 * @failure Upload and responsive-rendition failures are emitted to the host;
 * durable document content is retained or left unchanged for recovery.
 */
export const LoomaEditor = defineComponent({
  name: "LoomaEditor",
  inheritAttrs: false,
  props: {
    modelValue: {
      type: Object as PropType<JSONContent>,
      default: () => ({ ...EMPTY_DOCUMENT }),
    },
    // Deliberate exception to Looma's opt-in boolean rule: an editor that is
    // read-only unless configured would violate the primary UX promised by this wrapper.
    editable: { type: Boolean, default: true },
    placeholder: {
      type: String,
      default: "Type “/” for commands, or start writing…",
    },
    /** Accessible name of the editing surface, which is a text box to assistive technology. */
    label: {
      type: String,
      default: "Document",
    },
    extensions: {
      type: Array as PropType<AnyExtension[]>,
      default: () => [],
    },
    /** Override the lazy built-in catalog with application-owned code grammars. An empty object disables highlighting. */
    codeLanguages: {
      type: Object as PropType<LoomaCodeLanguages | null>,
      default: null,
    },
    mentionItems: {
      type: Array as PropType<LoomaMentionItem[]>,
      default: () => [],
    },
    mentionProvider: {
      type: Function as PropType<LoomaMentionProvider | undefined>,
      default: undefined,
    },
    mentionLimit: {
      type: Number,
      default: DEFAULT_MENTION_RESULT_LIMIT,
    },
    uploadImage: {
      type: Function as PropType<LoomaImageUploader | undefined>,
      default: undefined,
    },
    resolveImageAttributes: {
      type: Function as PropType<LoomaImageAttributeResolver | undefined>,
      default: undefined,
    },
    toolbarMode: {
      type: String as PropType<LoomaEditorToolbarMode>,
      default: "bubble",
    },
    /**
     * In `popover` mode, the ID of the app's button that toggles the full toolbar and anchors it.
     * The button needs no click handler of its own.
     */
    toolbarTriggerId: {
      type: String,
      default: "",
    },
    /** In `popover` mode, whether the full toolbar is open. Use with `v-model:toolbar-open`. */
    toolbarOpen: {
      type: Boolean,
      default: false,
    },
    /**
     * Authors can't highlight: no toolbar button, shortcut, `==text==` rule, or `<mark>` paste.
     * Highlights already in the document still show. Read once, when the editor is created.
     */
    disableHighlight: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    "update:modelValue": (_value: JSONContent) => true,
    "update:toolbarOpen": (_value: boolean) => true,
    update: (_value: JSONContent) => true,
    ready: (_editor: Editor) => true,
    uploadError: (_error: unknown, _file: File) => true,
    imageActivate: (_detail: LoomaImageActivationDetail) => true,
    imageRenditionError: (_detail: LoomaImageRenditionErrorDetail) => true,
  },
  setup(props, { attrs, emit, expose }) {
    const root = ref<HTMLElement | null>(null);
    const fileInput = ref<HTMLInputElement | null>(null);
    const tablePickerAnchorId = `looma-editor-table-picker-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const blockActionAnchorId = `ui-block-tools-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    let blockActionTarget: { position: number; node: Editor["state"]["doc"]["firstChild"] } | null = null;
    const linkAnchorId = `looma-editor-link-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const linkUrlInput = ref<HTMLInputElement | null>(null);
    const linkOpen = ref(false);
    const linkContextEditing = ref(false);
    const linkHref = ref("");
    const linkText = ref("");
    const linkNewTab = ref(true);
    const linkError = ref("");
    const chipAnchorId = `looma-editor-chip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const chipInput = ref<HTMLInputElement | null>(null);
    const chipOpen = ref(false);
    const chipLabel = ref("");
    const chipColor = ref<LoomaChipColor>("neutral");
    let linkSelection: { from: number; to: number; existing: boolean } | null = null;
    // One tooltip follows the row: the first button waits, and moving along the row is immediate,
    // which is what a toolbar needs and what the native `title` attribute cannot do.
    const toolbarScope = `looma-editor-tool-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const tooltipFor = ref("");
    const tooltipLabel = ref("");
    const tooltipShortcut = ref("");
    const tooltipOpen = ref(false);
    let tooltipTimer = 0;
    const clearTooltipTimer = () => {
      if (tooltipTimer) window.clearTimeout(tooltipTimer);
      tooltipTimer = 0;
    };
    const showTool = (id: string, label: string, immediate: boolean, shortcut = "") => {
      clearTooltipTimer();
      tooltipFor.value = id;
      tooltipLabel.value = label;
      tooltipShortcut.value = shortcut ? formatEditorShortcut(shortcut, isApplePlatform()) : "";
      if (immediate || tooltipOpen.value) {
        tooltipOpen.value = true;
        return;
      }
      tooltipTimer = window.setTimeout(() => { tooltipOpen.value = true; }, 400);
    };
    const hideTool = () => {
      clearTooltipTimer();
      tooltipOpen.value = false;
    };
    onBeforeUnmount(clearTooltipTimer);
    const tableToolbarShell = ref<HTMLElement | null>(null);
    const tableOverlayShell = ref<HTMLElement | null>(null);
    const tableMenuShell = ref<HTMLElement | null>(null);
    const mobileToolbarShell = ref<HTMLElement | null>(null);
    const codeLanguageShell = ref<HTMLElement | null>(null);
    const dragOver = ref(false);
    const uploading = ref(false);
    const failedUpload = ref<{ file: File } | null>(null);
    const tablePickerOpen = ref(false);
    const mobileToolbarStyle = ref<CSSProperties>({});
    const mobile = ref(typeof window !== "undefined" && window.innerWidth <= 767);
    const editorFocused = ref(false);
    const editorStateVersion = ref(0);
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

    const mention = reactive<LoomaMentionMenuSnapshot>({
      active: false,
      items: [],
      selectedIndex: 0,
      query: "",
      rect: null,
      loading: false,
      highlight: null,
      select: null,
    });

    const tableUi = reactive({
      toolbarOpen: false,
      overlayOpen: false,
      menuOpen: false,
      menuScope: "cell" as "cell" | "row" | "column",
      alignment: "left" as TableCellAlignment,
      background: null as TableCellBackground,
      headerRow: false,
      headerColumn: false,
      rows: 0,
      cols: 0,
      geometry: null as TableOverlayGeometry | null,
      toolbarStyle: {} as CSSProperties,
      overlayStyle: {} as CSSProperties,
      menuStyle: {} as CSSProperties,
      capabilities: { ...EMPTY_CAPABILITIES },
    });

    const openChipEditor = (instance: Editor, position: number) => {
      if (!props.editable) return;
      const node = instance.state.doc.nodeAt(position);
      const element = instance.view.nodeDOM(position);
      if (node?.type.name !== "loomaChip" || !(element instanceof HTMLElement)) return;
      root.value?.querySelector(`#${chipAnchorId}`)?.removeAttribute("id");
      element.id = chipAnchorId;
      chipLabel.value = String(node.attrs.label ?? "");
      chipColor.value = normalizeLoomaChipColor(node.attrs.color);
      chipOpen.value = true;
      void nextTick(() => chipInput.value?.focus());
    };
    const changeChip = (changes: { label?: string; color?: LoomaChipColor }) => {
      const instance = editor.value;
      const element = root.value?.querySelector<HTMLElement>(`#${chipAnchorId}`);
      if (!instance || !element) { chipOpen.value = false; return; }
      const position = instance.view.posAtDOM(element, 0);
      const node = instance.state.doc.nodeAt(position);
      if (node?.type.name !== "loomaChip") { chipOpen.value = false; return; }
      instance.view.dispatch(instance.state.tr.setNodeMarkup(position, undefined, { ...node.attrs, ...changes }));
    };
    const closeChip = (focusChip = false) => {
      chipOpen.value = false;
      if (focusChip) root.value?.querySelector<HTMLElement>(`#${chipAnchorId}`)?.focus();
    };
    const slashExtension = createLoomaSlashCommandExtension({
      onOpenImagePicker: () => fileInput.value?.click(),
      onOpenChipEditor: openChipEditor,
      onStateChange: (state) => {
        Object.assign(slash, state);
      },
    });
    const mentionMenuId = `looma-editor-mention-menu-${++editorInstanceSequence}`;
    const hasConsumerMention = props.extensions.some((extension) => extension.name === "mention");
    const mentionExtension = hasConsumerMention ? null : createLoomaMentionExtension({
      limit: props.mentionLimit,
      menuId: mentionMenuId,
      items: async (query, context) => {
        if (props.mentionProvider) {
          return await props.mentionProvider(query, context);
        }
        return props.mentionItems;
      },
      onStateChange: (state) => {
        Object.assign(mention, state);
      },
    });
    const imageDelivery = createLoomaImageDeliveryController({
      resolveAttributes: () => props.resolveImageAttributes,
    });
    let lastFocusedSelection: {
      bookmark: SelectionBookmark;
      from: number;
      to: number;
      text: boolean;
    } | null = null;
    let linkPressedSelection: { from: number; to: number } | null = null;
    const rememberSelection = (instance: Editor) => {
      if (!instance.isFocused) return;
      const selection = instance.view.state.selection;
      lastFocusedSelection = {
        bookmark: selection.getBookmark(),
        from: selection.from,
        to: selection.to,
        text: selection instanceof TextSelection,
      };
    };

    const authorHighlight = !props.disableHighlight;
    const codeLowlight = createLowlight(props.codeLanguages ?? undefined);
    const codeHighlightLowlight = props.codeLanguages === null
      ? {
          ...codeLowlight,
          highlightAuto: (value: string) => codeLowlight.highlightAuto(value, { subset: [...autoCodeLanguageNames] }),
        }
      : codeLowlight;
    const codeLanguageNames = props.codeLanguages === null
      ? [
          ...autoCodeLanguageNames,
          ...Object.keys(codeLanguageCatalog).filter((name) =>
            !autoCodeLanguageNames.includes(name as typeof autoCodeLanguageNames[number])
          ).sort(),
        ]
      : Object.keys(props.codeLanguages).sort();
    const codeUi = reactive({ open: false, pos: 0, language: "auto", text: "", grammarVersion: 0, style: {} as CSSProperties });
    const grammarLoads = new Map<string, Promise<void>>();
    let catalogLoad: Promise<void> | undefined;
    const refreshCodeHighlights = (instance: Editor) => {
      if (instance.isDestroyed) return;
      codeUi.grammarVersion += 1;
      // Tiptap refreshes lowlight decorations only after a document change.
      const tr = instance.state.tr;
      instance.state.doc.descendants((node, pos) => {
        if (node.type.name === "codeBlock") tr.setNodeMarkup(pos, undefined, node.attrs);
      });
      if (tr.docChanged) instance.view.dispatch(tr.setMeta("addToHistory", false));
    };
    const loadGrammar = (name: keyof typeof codeLanguageCatalog) => {
      const existing = grammarLoads.get(name);
      if (existing) return existing;
      const pending = codeLanguageCatalog[name]().then((grammar) => {
        codeLowlight.register({ [name]: grammar });
      }).catch((error: unknown) => {
        grammarLoads.delete(name);
        throw error;
      });
      grammarLoads.set(name, pending);
      return pending;
    };
    const loadForCodeBlock = (instance: Editor, language: unknown, value: string) => {
      if (props.codeLanguages !== null || instance.isDestroyed) return;
      if (typeof language === "string" && Object.hasOwn(codeLanguageCatalog, language)) {
        if (codeLowlight.registered(language) || grammarLoads.has(language)) return;
        void loadGrammar(language as keyof typeof codeLanguageCatalog)
          .then(() => refreshCodeHighlights(instance)).catch(() => {});
      } else if (!language && value.trim()) {
        catalogLoad ??= Promise.all(autoCodeLanguageNames.map((name) =>
          loadGrammar(name)
        )).then(() => refreshCodeHighlights(instance)).catch(() => { catalogLoad = undefined; });
      }
    };
    const editor = useEditor({
      extensions: [
        ...getDefaultEditorExtensions({
          placeholder: props.placeholder,
          mention: mentionExtension ?? false,
          disableHighlight: props.disableHighlight,
          codeLanguages: props.codeLanguages ?? undefined,
          codeLowlight: codeHighlightLowlight,
        }),
        imageDelivery.extension,
        slashExtension,
        ...props.extensions,
      ],
      content: props.modelValue,
      editable: props.editable,
      editorProps: { attributes: { role: "textbox", "aria-multiline": "true", "aria-label": props.label } },
      onCreate: ({ editor: instance }) => {
        emit("ready", instance);
        instance.state.doc.descendants((node) => {
          if (node.type.name === "codeBlock") loadForCodeBlock(instance, node.attrs.language, node.textContent);
        });
      },
      onFocus: ({ editor: instance }) => rememberSelection(instance),
      onSelectionUpdate: ({ editor: instance }) => {
        rememberSelection(instance);
        if (linkContextEditing.value && instance.state.selection.from !== linkSelection?.from) {
          linkContextEditing.value = false;
        }
      },
      onTransaction: () => { editorStateVersion.value += 1; },
      onUpdate: ({ editor: instance }) => {
        const value = instance.getJSON();
        emit("update:modelValue", value);
        emit("update", value);
      },
    });

    const openLinkEditor = (context = false) => {
      const instance = editor.value;
      if (!instance || !props.editable) return;
      const current = instance.state.selection;
      const preserved = lastFocusedSelection?.text && lastFocusedSelection.from !== lastFocusedSelection.to
        ? lastFocusedSelection : null;
      const selection = linkPressedSelection ?? (current.empty ? preserved : null);
      linkPressedSelection = null;
      const from = selection?.from ?? current.from;
      const to = selection?.to ?? current.to;
      const empty = from === to;
      const existing = instance.isActive("link");
      linkSelection = { from, to, existing };
      const attrs = existing ? instance.getAttributes("link") : {};
      linkHref.value = typeof attrs.href === "string" ? attrs.href : "";
      linkNewTab.value = attrs.target !== "_self";
      linkText.value = empty && !existing ? "" : instance.state.doc.textBetween(from, to);
      linkError.value = "";
      linkContextEditing.value = context;
      linkOpen.value = !context;
      void nextTick(() => linkUrlInput.value?.focus());
    };
    const saveLink = () => {
      const instance = editor.value;
      const selection = linkSelection;
      if (!instance || !selection) return;
      const href = validLinkHref(linkHref.value);
      if (!href) {
        linkError.value = "Enter an http, https, mailto, tel, or relative URL.";
        linkUrlInput.value?.focus();
        return;
      }
      const attrs = { href, target: linkNewTab.value ? "_blank" : "_self", rel: linkNewTab.value ? "noopener noreferrer" : null };
      const chain = instance.chain().focus().setTextSelection({ from: selection.from, to: selection.to });
      if (selection.from === selection.to && !selection.existing) {
        const text = linkText.value.trim();
        if (!text) { linkError.value = "Enter link text."; return; }
        chain.insertContent({ type: "text", text, marks: [{ type: "link", attrs }] }).run();
      } else {
        if (selection.existing && selection.from === selection.to) chain.extendMarkRange("link");
        chain.setLink(attrs).run();
      }
      linkOpen.value = false;
      linkContextEditing.value = false;
    };
    const removeLink = () => {
      const instance = editor.value;
      const selection = linkSelection;
      if (!instance || !selection?.existing) return;
      instance.chain().focus().setTextSelection({ from: selection.from, to: selection.to }).extendMarkRange("link").unsetLink().run();
      linkOpen.value = false;
      linkContextEditing.value = false;
    };
    const removeCurrentLink = () => {
      const instance = editor.value;
      if (!instance?.isActive("link")) return;
      instance.chain().focus().extendMarkRange("link").unsetLink().run();
      linkContextEditing.value = false;
    };
    const renderLinkForm = () => h("form", {
      class: "looma-editor__link-form",
      "aria-label": "Edit link",
      onSubmit: (event: Event) => { event.preventDefault(); saveLink(); },
    }, [
      linkSelection?.from === linkSelection?.to && !linkSelection?.existing
        ? h("label", [h("span", "Text"), h("input", {
            value: linkText.value,
            onInput: (event: Event) => { linkText.value = (event.target as HTMLInputElement).value; linkError.value = ""; },
          })])
        : null,
      h("label", [h("span", "URL"), h("input", {
        ref: linkUrlInput,
        type: "text",
        inputmode: "url",
        value: linkHref.value,
        "aria-invalid": linkError.value ? "true" : undefined,
        onInput: (event: Event) => { linkHref.value = (event.target as HTMLInputElement).value; linkError.value = ""; },
      })]),
      h("label", { class: "looma-editor__link-new-tab" }, [h("input", {
        type: "checkbox",
        checked: linkNewTab.value,
        onChange: (event: Event) => { linkNewTab.value = (event.target as HTMLInputElement).checked; },
      }), h("span", "Open in new tab")]),
      linkError.value ? h("p", { class: "looma-editor__link-error", role: "alert" }, linkError.value) : null,
      validLinkHref(linkHref.value) ? h("a", {
        class: "looma-editor__link-preview",
        href: validLinkHref(linkHref.value),
        target: "_blank",
        rel: "noopener noreferrer",
      }, "Preview link") : null,
      h("div", { class: "looma-editor__link-actions" }, [
        linkSelection?.existing ? h("button", { type: "button", onClick: removeLink }, "Remove link") : null,
        h("button", { type: "submit" }, "Save link"),
      ]),
    ]);
    const renderLinkContext = (instance: Editor) => {
      if (linkContextEditing.value) return renderLinkForm();
      const rawHref = instance.getAttributes("link").href;
      const href = typeof rawHref === "string" ? rawHref : "";
      const safeHref = validLinkHref(href);
      return h("div", { class: "looma-editor__link-context-actions", role: "group", "aria-label": "Link actions" }, [
        h("span", { class: "looma-editor__link-context-url", title: href }, href),
        h("button", {
          type: "button",
          onPointerdown: (event: PointerEvent) => event.preventDefault(),
          onClick: () => openLinkEditor(true),
        }, "Edit link"),
        h("button", {
          type: "button",
          onPointerdown: (event: PointerEvent) => event.preventDefault(),
          onClick: removeCurrentLink,
        }, "Remove link"),
        safeHref ? h("a", { href: safeHref, target: "_blank", rel: "noopener noreferrer" }, "Open link") : null,
      ]);
    };
    const captureBlockAction = () => {
      const instance = editor.value;
      const head = instance?.state.selection.$head;
      const position = head && head.depth > 0 ? head.before(1) : null;
      blockActionTarget = position === null ? null : { position, node: instance?.state.doc.nodeAt(position) ?? null };
    };
    const runBlockAction = (value: string) => {
      const instance = editor.value;
      const target = blockActionTarget;
      if (!instance || !target || !props.editable) return;
      const { state } = instance;
      const { position } = target;
      const block = state.doc.nodeAt(position);
      if (!block || block !== target.node) return;
      const end = position + block.nodeSize;
      const transaction = state.tr;
      let focusAt = end + 1;
      if (value === "insert-below") {
        transaction.insert(end, state.schema.nodes.paragraph.create());
      } else if (value === "duplicate") {
        transaction.insert(end, block);
      } else if (value === "delete") {
        if (state.doc.childCount === 1) {
          transaction.replaceWith(position, end, state.schema.nodes.paragraph.create());
          focusAt = 1;
        } else {
          transaction.delete(position, end);
          focusAt = Math.min(position + 1, transaction.doc.content.size);
        }
      } else return;
      transaction.setSelection(TextSelection.near(transaction.doc.resolve(Math.min(focusAt, transaction.doc.content.size))));
      instance.view.dispatch(transaction);
      instance.commands.focus();
    };

    watch(() => props.editable, (editable) => {
      editor.value?.setEditable(editable);
      root.value?.querySelectorAll<HTMLElement>("[data-looma-chip]").forEach((chip) => {
        chip.setAttribute("aria-disabled", String(!editable));
      });
      if (!editable) chipOpen.value = false;
    });
    watch(() => props.label, (label) => {
      editor.value?.setOptions({
        editorProps: { attributes: { role: "textbox", "aria-multiline": "true", "aria-label": label } },
      });
    });
    watch(() => props.resolveImageAttributes, () => {
      const instance = editor.value;
      if (instance) imageDelivery.reset(instance);
    });
    watch(() => props.modelValue, (value) => {
      const instance = editor.value;
      if (!instance || sameDocument(instance.getJSON(), value)) return;
      const wasFocused = instance.isFocused;
      const previousSelection = lastFocusedSelection ?? {
        bookmark: instance.view.state.selection.getBookmark(),
        from: instance.view.state.selection.from,
        to: instance.view.state.selection.to,
        text: instance.view.state.selection instanceof TextSelection,
      };
      if (!wasFocused) {
        instance.commands.setContent(value, false);
        return;
      }

      // Set the document and restored selection in one transaction. A separate
      // selection transaction is too late: replacing the document maps the DOM
      // caret to the end before ProseMirror reconciles focus.
      instance.chain().setContent(value, false).command(({ tr }) => {
        try {
          tr.setSelection(previousSelection.text
            ? TextSelection.create(tr.doc, previousSelection.from, previousSelection.to)
            : previousSelection.bookmark.resolve(tr.doc));
        } catch {
          // A genuine remote replacement can make the old selection invalid.
          // Preserve the closest valid text range instead of Tiptap's default
          // behavior of moving the caret to the document end.
          const max = tr.doc.content.size;
          const from = Math.max(1, Math.min(previousSelection.from, max));
          const to = Math.max(from, Math.min(previousSelection.to, max));
          tr.setSelection(TextSelection.create(tr.doc, from, to));
        }
        return true;
      }).run();
      instance.view.focus();
      rememberSelection(instance);
    }, { deep: true });

    const closeTableUi = () => {
      tableUi.toolbarOpen = false;
      tableUi.overlayOpen = false;
      tableUi.menuOpen = false;
      tableUi.menuScope = "cell";
      tableUi.alignment = "left";
      tableUi.background = null;
      tableUi.headerRow = false;
      tableUi.headerColumn = false;
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

    // Like the table toolbar, the language picker floats above the code block holding the cursor.
    let codeBlurTimer: ReturnType<typeof setTimeout> | undefined;
    const updateCodeUi = (focusSettled = false) => {
      const instance = editor.value?.isDestroyed ? undefined : editor.value;
      const selection = instance?.state.selection;
      const block = selection?.$from.parent;
      const dom = instance && block?.type.name === "codeBlock" && selection!.$from.sameParent(selection!.$to)
        ? instance.view.nodeDOM(selection!.$from.before())
        : null;
      if (!instance || !props.editable || !codeLanguageNames.length || !(dom instanceof HTMLElement)) {
        codeUi.open = false;
        return;
      }
      loadForCodeBlock(instance, block!.attrs.language, block!.textContent);
      if (!instance.isFocused && !codeLanguageShell.value?.contains(document.activeElement)) {
        // The editor blurs before focus lands; the picker stays if that focus lands in it.
        clearTimeout(codeBlurTimer);
        if (codeUi.open && !focusSettled) codeBlurTimer = setTimeout(() => updateCodeUi(true), 0);
        else codeUi.open = false;
        return;
      }
      const rect = dom.getBoundingClientRect();
      const above = rect.top > 76;
      codeUi.open = true;
      codeUi.pos = selection!.$from.before();
      codeUi.language = typeof block!.attrs.language === "string" && block!.attrs.language ? block!.attrs.language : "auto";
      codeUi.text = block!.textContent;
      codeUi.style = {
        top: `${above ? rect.top - 8 : rect.bottom + 8}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: `translate(-50%, ${above ? "-100%" : "0"})`,
      };
    };
    const codeLanguageOptions = computed(() => {
      // The lowlight registry is mutable rather than reactive; this version tracks async imports.
      void codeUi.grammarVersion;
      const detected = codeUi.open && codeUi.text.trim() ? codeHighlightLowlight.highlightAuto(codeUi.text).data?.language : null;
      return [
        { value: "auto", label: typeof detected === "string" ? `Auto (${detected.toUpperCase()})` : "Auto" },
        ...(codeUi.language !== "auto" && !codeLanguageNames.includes(codeUi.language)
          ? [{ value: codeUi.language, label: `${codeUi.language.toUpperCase()} (unavailable)` }]
          : []),
        ...codeLanguageNames.map((name) => ({ value: name, label: name.toUpperCase() })),
      ];
    });
    const chooseCodeLanguage = (detail: { value: string | null; kind: string }) => {
      const instance = editor.value;
      if (!instance || detail.kind !== "selection" || !detail.value) return;
      const language = detail.value === "auto" ? null : detail.value;
      if (language !== null && !codeLanguageNames.includes(language)) return;
      const node = instance.state.doc.nodeAt(codeUi.pos);
      if (node?.type.name !== "codeBlock") return;
      // Each choice is its own undo step, separate from typing around it.
      instance.view.dispatch(closeHistory(instance.state.tr));
      instance.view.dispatch(instance.state.tr.setNodeMarkup(codeUi.pos, undefined, { ...node.attrs, language }));
      instance.view.dispatch(closeHistory(instance.state.tr));
    };
    const onCodeTransaction = () => updateCodeUi();
    watch(() => props.editable, () => nextTick(onCodeTransaction));
    onBeforeUnmount(() => clearTimeout(codeBlurTimer));

    const updateTableUi = () => {
      const instance = editor.value;
      const focusInTableUi = [tableToolbarShell.value, tableOverlayShell.value, tableMenuShell.value]
        .some((shell) => shell?.contains(document.activeElement));
      if (
        !instance
        || instance.isDestroyed
        || !props.editable
        || (!instance.isFocused && !tableInteractionActive && !hoveredTableCell && !focusInTableUi)
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
      tableUi.headerRow = selectedTableIsActive && state.headerRow;
      tableUi.headerColumn = selectedTableIsActive && state.headerColumn;
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
      updateCodeUi();
      updateMobileViewport();
    };

    const onEditorBlur = () => {
      queueMicrotask(updateTableUi);
      updateCodeUi();
      setTimeout(() => {
        if (!tableInteractionActive && !editor.value?.isFocused) editorFocused.value = false;
      }, 0);
    };

    const bindEditorUi = (instance: Editor | undefined) => {
      if (!instance) return;
      instance.on("selectionUpdate", updateTableUi);
      instance.on("transaction", updateTableUi);
      instance.on("transaction", onCodeTransaction);
      instance.on("focus", onEditorFocus);
      instance.on("blur", onEditorBlur);
      nextTick(updateTableUi);
    };

    const unbindEditorUi = (instance: Editor | undefined) => {
      if (!instance) return;
      instance.off("selectionUpdate", updateTableUi);
      instance.off("transaction", updateTableUi);
      instance.off("transaction", onCodeTransaction);
      instance.off("focus", onEditorFocus);
      instance.off("blur", onEditorBlur);
    };

    watch(editor, (instance, previous) => {
      unbindEditorUi(previous);
      bindEditorUi(instance);
    }, { immediate: true });

    const onViewportChange = (event?: Event) => {
      // A menu's own scroll does not move its anchor or change the active table.
      if (event?.type === "scroll" && event.target instanceof Node
        && (tableToolbarShell.value?.contains(event.target) || tableMenuShell.value?.contains(event.target))) return;
      updateMobileViewport();
      updateTableUi();
      updateCodeUi();
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

    const imageForElement = (element: HTMLImageElement) => {
      const instance = editor.value;
      if (!instance) return null;
      try {
        const position = instance.view.posAtDOM(element, 0);
        const node = instance.state.doc.nodeAt(position);
        return node?.type.name === "image" ? imageDescriptorFromAttrs(node.attrs) : null;
      } catch {
        return null;
      }
    };

    const imageElementForEvent = (event: Event): HTMLImageElement | null => {
      const element = event.target instanceof Element
        ? event.target.closest<HTMLImageElement>('img[data-looma-image]')
        : null;
      return element && root.value?.contains(element) ? element : null;
    };

    const activateImage = (element: HTMLImageElement, trigger: "keyboard" | "pointer") => {
      const image = imageForElement(element);
      if (image) emit("imageActivate", { ...image, trigger });
    };

    const chipElementForEvent = (event: Event): HTMLElement | null => {
      const element = event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-looma-chip]") : null;
      return element && root.value?.contains(element) ? element : null;
    };

    const onChipClickCapture = (event: MouseEvent) => {
      const chip = chipElementForEvent(event);
      if (chip && editor.value && props.editable) {
        event.preventDefault();
        // ui-popover attaches its own anchor click toggle. Handle chips here so
        // a click on the open chip cannot close and immediately reopen it.
        event.stopPropagation();
        openChipEditor(editor.value, editor.value.view.posAtDOM(chip, 0));
      }
    };

    const onImageClick = (event: MouseEvent) => {
      const element = imageElementForEvent(event);
      if (element && !props.editable) activateImage(element, "pointer");
    };

    const onImageDoubleClick = (event: MouseEvent) => {
      const element = imageElementForEvent(event);
      if (element && props.editable) activateImage(element, "pointer");
    };

    const onImageKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const chip = chipElementForEvent(event);
      if (chip && editor.value && props.editable) {
        event.preventDefault();
        openChipEditor(editor.value, editor.value.view.posAtDOM(chip, 0));
        return;
      }
      const element = imageElementForEvent(event);
      if (!element) return;
      event.preventDefault();
      activateImage(element, "keyboard");
    };

    const onImageError = (event: Event) => {
      const element = imageElementForEvent(event);
      if (!element || element.dataset.loomaRendition !== "true") return;
      const image = imageForElement(element);
      if (!image) return;
      const instance = editor.value;
      if (!instance || !imageDelivery.markRenditionFailed(instance, image.src)) return;
      emit("imageRenditionError", { ...image, trigger: "programmatic" });
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
      root.value?.addEventListener("error", onImageError, true);
    });
    onBeforeUnmount(() => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      document.removeEventListener("pointerdown", onResizePointerDown, true);
      document.removeEventListener("pointerup", onResizePointerUp, true);
      root.value?.removeEventListener("error", onImageError, true);
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
        const width = normalizeImageDimension(image.width);
        const height = normalizeImageDimension(image.height);
        editor.value.chain().focus().insertContent(imageUploadContent({
          src: image.url,
          alt: image.alt ?? file.name,
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
          ...(image.responsive === true ? { responsive: true } : {}),
        })).run();
        failedUpload.value = null;
      } catch (error) {
        failedUpload.value = { file };
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
      tableUi.menuScope = "cell";
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
        : "fromIndex" in detail
          ? resolveTableCellAt(table, detail.action === "reorder-row" ? detail.fromIndex : 0, detail.action === "reorder-column" ? detail.fromIndex : 0)
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
        tableUi.menuScope = "cell";
        tableUi.menuStyle = {
          top: `${detail.anchor.bottom + 4}px`,
          left: `${detail.anchor.right}px`,
        };
        tableUi.menuOpen = true;
        return;
      }
      if (detail.action === "open-row-menu" || detail.action === "open-column-menu") {
        updateTableUi();
        tableUi.menuScope = detail.action === "open-row-menu" ? "row" : "column";
        tableUi.menuStyle = { top: `${detail.anchor.bottom + 4}px`, left: `${detail.anchor.right}px` };
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

    const onTableOverlayMouseDown = (event: MouseEvent) => {
      const action = event.target instanceof Element
        ? event.target.closest("button[data-action]")
        : null;
      if (action) event.preventDefault();
    };


    const commandButton = (
      label: string,
      icon: LoomaIconName,
      active: boolean,
      disabled: boolean,
      run: () => void,
      shortcut = "",
    ) => {
      const syncNativeDisabled = (vnode: VNode) => {
        if (!(vnode.el instanceof Element)) return;
        const button = vnode.el instanceof HTMLButtonElement
          ? vnode.el
          : vnode.el.querySelector("button");
        if (button) button.disabled = disabled;
      };
      const id = `${toolbarScope}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      return h(IconButton, {
        id,
        class: "looma-editor__toolbar-button",
        label,
        size: "sm",
        onPointerenter: () => showTool(id, label, false, shortcut),
        onPointerleave: hideTool,
        onFocusin: () => showTool(id, label, true, shortcut),
        onFocusout: hideTool,
        variant: "ghost",
        disabled,
        // A toggle reports its state to assistive technology; the tint is the visual half of it.
        "aria-pressed": active ? "true" : "false",
        "data-active": active ? "true" : "false",
        onVnodeMounted: syncNativeDisabled,
        onVnodeUpdated: syncNativeDisabled,
        onClick: run,
      }, () => loomaIcon(icon));
    };

    const renderToolbar = (instance: Editor, floating = true, textOnly = false) => {
      // One row at page width: checklists and dividers are inserted from the slash menu or typed
      // ([ ] and ---), so they do not take toolbar room.
      const textButtons = [
        commandButton("Bold", "bold", instance.isActive("bold"), !instance.can().toggleBold(), () => instance.chain().focus().toggleBold().run(), "Mod-b"),
        commandButton("Italic", "italic", instance.isActive("italic"), !instance.can().toggleItalic(), () => instance.chain().focus().toggleItalic().run(), "Mod-i"),
        commandButton("Underline", "underline", instance.isActive("underline"), !instance.can().toggleUnderline(), () => instance.chain().focus().toggleUnderline().run(), "Mod-u"),
        commandButton("Strike", "strikethrough", instance.isActive("strike"), !instance.can().toggleStrike(), () => instance.chain().focus().toggleStrike().run(), "Mod-Shift-s"),
        ...(authorHighlight
          ? [commandButton("Highlight", "highlighter", instance.isActive("highlight"), !instance.can().toggleHighlight(), () => instance.chain().focus().toggleHighlight().run(), "Mod-Shift-h")]
          : []),
        commandButton("Inline code", "code-xml", instance.isActive("code"), !instance.can().toggleCode(), () => instance.chain().focus().toggleCode().run(), "Mod-e"),
      ];
      const buttons = textOnly ? textButtons : [
        ...textButtons,
        h(IconButton, {
          id: linkAnchorId,
          class: "looma-editor__toolbar-button",
          label: "Link",
          size: "sm",
          variant: "ghost",
          "aria-expanded": linkOpen.value ? "true" : "false",
          "aria-pressed": instance.isActive("link") ? "true" : "false",
          "data-active": instance.isActive("link") ? "true" : "false",
          onPointerenter: () => showTool(linkAnchorId, "Link", false),
          onPointerleave: hideTool,
          onPointerdown: () => {
            const selection = instance.state.selection;
            linkPressedSelection = selection.empty ? null : { from: selection.from, to: selection.to };
          },
          onFocusin: () => showTool(linkAnchorId, "Link", true),
          onFocusout: hideTool,
        }, () => loomaIcon("link")),
        h("span", { class: "divider", "aria-hidden": "true" }),
        commandButton("Heading 1", "heading-1", instance.isActive("heading", { level: 1 }), false, () => instance.chain().focus().toggleHeading({ level: 1 }).run(), "Mod-Alt-1"),
        commandButton("Heading 2", "heading-2", instance.isActive("heading", { level: 2 }), false, () => instance.chain().focus().toggleHeading({ level: 2 }).run(), "Mod-Alt-2"),
        commandButton("Heading 3", "heading-3", instance.isActive("heading", { level: 3 }), false, () => instance.chain().focus().toggleHeading({ level: 3 }).run(), "Mod-Alt-3"),
        commandButton("Bullet list", "list", instance.isActive("bulletList"), false, () => instance.chain().focus().toggleBulletList().run(), "Mod-Shift-8"),
        commandButton("Numbered list", "list-ordered", instance.isActive("orderedList"), false, () => instance.chain().focus().toggleOrderedList().run(), "Mod-Shift-7"),
        commandButton("Blockquote", "quote", instance.isActive("blockquote"), !instance.can().toggleBlockquote(), () => instance.chain().focus().toggleBlockquote().run(), "Mod-Shift-b"),
        commandButton("Code block", "braces", instance.isActive("codeBlock"), !instance.can().toggleCodeBlock(), () => instance.chain().focus().toggleCodeBlock().run(), "Mod-Alt-c"),
        h(IconButton, {
          id: blockActionAnchorId,
          class: "looma-editor__toolbar-button",
          label: "Block actions",
          size: "sm",
          variant: "ghost",
          onPointerenter: () => showTool(blockActionAnchorId, "Block actions", false),
          onPointerleave: hideTool,
          onFocusin: () => showTool(blockActionAnchorId, "Block actions", true),
          onFocusout: hideTool,
        }, () => loomaIcon("ellipsis")),
        h("span", { class: "divider", "aria-hidden": "true" }),
        h(IconButton, {
          id: tablePickerAnchorId,
          class: "looma-editor__toolbar-button",
          label: "Insert table",
          size: "sm",
          onPointerenter: () => showTool(tablePickerAnchorId, "Insert table", false),
          onPointerleave: hideTool,
          onFocusin: () => showTool(tablePickerAnchorId, "Insert table", true),
          onFocusout: hideTool,
          variant: tablePickerOpen.value ? "solid" : "ghost",
          "aria-expanded": tablePickerOpen.value ? "true" : "false",
          // The popover anchored here with `for` owns the toggle; toggling here too reopened and
          // closed it on the same click.
        }, () => loomaIcon("table")),
        commandButton(uploading.value ? "Uploading image" : "Insert image", "image", false, uploading.value || !props.uploadImage, () => fileInput.value?.click()),
        h("span", { class: "divider", "aria-hidden": "true" }),
        commandButton("Undo", "undo", false, !instance.can().undo(), () => instance.chain().focus().undo().run(), "Mod-z"),
        commandButton("Redo", "redo", false, !instance.can().redo(), () => instance.chain().focus().redo().run(), isApplePlatform() ? "Mod-Shift-z" : "Mod-y"),
      ];
      return h(EditorToolbar, { floating }, () => [
        ...buttons,
        h(Tooltip, {
          class: "looma-editor__toolbar-tip",
          for: tooltipFor.value,
          open: tooltipOpen.value,
          placement: floating ? "top" : "bottom",
          trigger: "focus",
        }, {
          default: () => tooltipLabel.value,
          shortcut: () => (tooltipShortcut.value ? h("kbd", tooltipShortcut.value) : null),
        }),
      ]);
    };

    const focus = (position: "start" | "end" = "start") => {
      editor.value?.commands.focus(position);
    };
    expose({ editor, focus });

    return () => {
      const instance = editor.value;
      // Tiptap's Editor instance is not a Vue reactive object. Reading this
      // counter makes command availability and active state follow every
      // transaction, including undo and redo in uncontrolled integrations.
      void editorStateVersion.value;
      const tableActions: TableContextMenuAction[] = [
        "align-left",
        "align-center",
        "align-right",
        "background-none",
        "background-gray",
        "background-yellow",
        "background-blue",
        "background-green",
        "background-red",
        "clear-cells",
        ...(tableUi.capabilities.canAddRowBefore ? ["add-row-before" as const] : []),
        ...(tableUi.capabilities.canAddRowAfter ? ["add-row-after" as const] : []),
        ...(tableUi.capabilities.canAddColumnBefore ? ["add-column-before" as const] : []),
        ...(tableUi.capabilities.canAddColumnAfter ? ["add-column-after" as const] : []),
        ...(tableUi.capabilities.canToggleHeaderRow ? ["toggle-header-row" as const] : []),
        ...(tableUi.capabilities.canToggleHeaderColumn ? ["toggle-header-column" as const] : []),
        ...(tableUi.capabilities.canMoveRowUp ? ["move-row-up" as const] : []),
        ...(tableUi.capabilities.canMoveRowDown ? ["move-row-down" as const] : []),
        ...(tableUi.capabilities.canMoveColumnLeft ? ["move-column-left" as const] : []),
        ...(tableUi.capabilities.canMoveColumnRight ? ["move-column-right" as const] : []),
        ...(tableUi.capabilities.canMergeCells ? ["merge-cells" as const] : []),
        ...(tableUi.capabilities.canSplitCell ? ["split-cell" as const] : []),
        ...(tableUi.capabilities.canDeleteRow ? ["delete-row" as const] : []),
        ...(tableUi.capabilities.canDeleteColumn ? ["delete-column" as const] : []),
        ...(tableUi.capabilities.canDeleteTable ? ["delete-table" as const] : []),
      ];
      const tableProps = {
        open: true,
        cellAlignment: tableUi.alignment,
        cellBackground: tableUi.background ?? undefined,
        headerRow: tableUi.headerRow,
        headerColumn: tableUi.headerColumn,
        actions: tableActions,
        onAction: (event: CustomEvent<Parameters<typeof handleTableAction>[1]>) => runTableAction(event.detail),
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
        onClickCapture: onChipClickCapture,
        onClick: onImageClick,
        onDblclick: onImageDoubleClick,
        onKeydown: onImageKeyDown,
      }, [
        instance && props.editable && !mobile.value
          && (props.toolbarMode === "bubble" || props.toolbarMode === "popover")
          ? h(BubbleMenu, {
              editor: instance,
              pluginKey: "looma-text-formatting-menu",
              shouldShow: ({ editor: menuEditor, from, to }: { editor: Editor; from: number; to: number }) =>
                (props.toolbarMode !== "popover" || !props.toolbarOpen)
                && shouldShowTextFormattingToolbar(menuEditor, from, to),
              tippyOptions: {
                // Escape clipped panels, but stay in the top layer when the editor is in a dialog or popover.
                appendTo: () => root.value?.closest<HTMLElement>("dialog[open], [popover]") ?? document.body,
                onShow: () => announceOverlayOpen(root.value?.ownerDocument ?? document, root.value),
                duration: 100,
                maxWidth: "none",
                placement: "top",
              },
            }, { default: () => renderToolbar(instance, true, props.toolbarMode === "popover") })
          : null,
        instance && props.editable && !mobile.value
          ? h(BubbleMenu, {
              editor: instance,
              pluginKey: "looma-link-context-menu",
              shouldShow: ({ editor: menuEditor, from, to }: { editor: Editor; from: number; to: number }) =>
                from === to && menuEditor.isActive("link") && !linkOpen.value,
              tippyOptions: {
                appendTo: () => root.value?.closest<HTMLElement>("dialog[open], [popover]") ?? document.body,
                onShow: () => announceOverlayOpen(root.value?.ownerDocument ?? document, root.value),
                duration: 100,
                maxWidth: "none",
                placement: "bottom",
              },
            }, { default: () => h("div", {
              class: ["looma-editor__link-context", { "looma-editor__link-context--editing": linkContextEditing.value }],
            }, [renderLinkContext(instance)]) })
          : null,
        instance && props.editable && !mobile.value && props.toolbarMode === "popover" && props.toolbarTriggerId
          ? h(Popover, {
              class: "looma-editor__formatting-popover",
              role: "region",
              "aria-label": "Formatting tools",
              open: props.toolbarOpen,
              for: props.toolbarTriggerId,
              placement: "bottom-end",
              // The popover owns its trigger's toggle; the app only binds v-model:toolbar-open.
              onOpen: () => emit("update:toolbarOpen", true),
              onClose: () => emit("update:toolbarOpen", false),
            }, () => [renderToolbar(instance, true)])
          : null,
        instance && props.editable && !mobile.value && props.toolbarMode === "sticky"
          ? h("div", {
              class: "looma-editor__sticky-toolbar-shell",
              role: "toolbar",
              "aria-label": "Editor tools",
            }, [renderToolbar(instance, false)])
          : null,
        instance ? h(EditorContent, { editor: instance }) : null,
        codeUi.open
          ? h("div", {
              ref: codeLanguageShell,
              class: "looma-editor__code-language",
              style: codeUi.style,
              onFocusout: () => updateCodeUi(),
            }, [h(Combobox, {
              label: "Code language",
              labelVisibility: "sr-only",
              size: "sm",
              disclosure: true,
              filter: "label",
              value: codeUi.language,
              onValueChange: (event: CustomEvent<{ value: string | null; kind: string }>) => chooseCodeLanguage(event.detail),
            }, () => codeLanguageOptions.value.map((option) => h("option", { value: option.value }, option.label)))])
          : null,
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
        failedUpload.value
          ? h("div", {
              class: "looma-editor__upload-error",
              role: "alert",
            }, [
              h("span", "Couldn’t upload image."),
              h("button", {
                type: "button",
                disabled: uploading.value,
                onClick: () => {
                  const attempt = failedUpload.value;
                  if (attempt) void insertImage(attempt.file);
                },
              }, uploading.value ? "Retrying…" : "Retry"),
            ])
          : null,
        dragOver.value
          ? h("div", { class: "looma-editor__drop-overlay", "aria-hidden": "true" }, [
              loomaIcon("image"),
              h("span", "Drop image to upload"),
            ])
          : null,
        h(Popover, {
          class: "looma-editor__chip-popover",
          open: chipOpen.value,
          for: chipAnchorId,
          placement: "bottom-start",
          onClose: () => { chipOpen.value = false; },
        }, () => h("div", { class: "looma-editor__chip-form", role: "dialog", "aria-label": "Edit chip" }, [
          h("input", {
            ref: chipInput,
            type: "text",
            value: chipLabel.value,
            placeholder: "Set a label",
            "aria-label": "Chip text",
            onInput: (event: Event) => {
              chipLabel.value = (event.target as HTMLInputElement).value;
              changeChip({ label: chipLabel.value });
            },
            onKeydown: (event: KeyboardEvent) => {
              if (event.key === "Enter" || event.key === "Escape") {
                event.preventDefault();
                closeChip(true);
              }
            },
          }),
          h("div", { class: "looma-editor__chip-colors", role: "group", "aria-label": "Chip color" },
            LOOMA_CHIP_COLORS.map((color) => h("button", {
              type: "button",
              class: "looma-editor__chip-color",
              "data-color": color,
              "aria-label": `${color[0].toUpperCase()}${color.slice(1)} chip`,
              "aria-pressed": chipColor.value === color,
              onClick: () => {
                if (chipColor.value === color) { chipInput.value?.focus(); return; }
                chipColor.value = color;
                changeChip({ color });
                chipInput.value?.focus();
              },
            }, chipColor.value === color ? "✓" : ""))),
        ])),
        h(Popover, {
          class: "looma-editor__link-popover",
          open: linkOpen.value,
          for: linkAnchorId,
          placement: mobile.value ? "top-start" : "bottom-start",
          onOpen: () => openLinkEditor(),
          onClose: () => { linkOpen.value = false; linkPressedSelection = null; },
        }, renderLinkForm),
        h(Menu, {
          for: blockActionAnchorId,
          placement: mobile.value ? "top-start" : "bottom-start",
          onOpen: captureBlockAction,
          onSelect: (event: CustomEvent<{ value: string }>) => runBlockAction(event.detail.value),
        }, () => [
          h(MenuItem, { value: "insert-below" }, () => "Insert paragraph below"),
          h(MenuItem, { value: "duplicate" }, () => "Duplicate block"),
          h(MenuItem, { value: "delete" }, () => "Delete block"),
        ]),
        h(Popover, {
          class: "looma-editor__table-picker-popover",
          open: tablePickerOpen.value,
          for: tablePickerAnchorId,
          placement: mobile.value ? "top-start" : "bottom-start",
          onOpen: () => { tablePickerOpen.value = true; },
          onClose: () => { tablePickerOpen.value = false; },
        }, () => [h(EditorInsertTableGrid, {
              open: true,
              onInsert: (event: CustomEvent<{ rows: number; cols: number; withHeaderRow: boolean }>) => {
                instance?.chain().focus().insertTable(event.detail).run();
                tablePickerOpen.value = false;
              },
            })]),
        slash.active && slash.items.length > 0
          ? h(EditorSlashMenu, {
              open: true,
              query: slash.query,
              items: managedSlashMenuItems(slash.items),
              selectedIndex: slash.selectedIndex,
              anchorRect: managedMenuAnchorRect(slash.rect),
              onHighlight: (event: CustomEvent<{ index: number }>) => { slash.selectedIndex = event.detail.index; },
              onSelect: (event: CustomEvent<{ index: number }>) => {
                slash.select?.(event.detail.index);
              },
            })
          : null,
        mention.active && (mention.loading || mention.items.length > 0)
          ? h(EditorMentionMenu, {
              id: mentionMenuId,
              open: true,
              query: mention.query,
              items: mention.items,
              selectedIndex: mention.selectedIndex,
              anchorRect: managedMenuAnchorRect(mention.rect),
              loading: mention.loading,
              onHighlight: (event: CustomEvent<{ index: number }>) => {
                mention.selectedIndex = event.detail.index;
                mention.highlight?.(event.detail.index);
              },
              onSelect: (event: CustomEvent<{ index: number }>) => {
                mention.select?.(event.detail.index);
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
              onMousedown: onTableOverlayMouseDown,
              onPointerleave: onTableOverlayPointerLeave,
            }, [h(EditorTableOverlay, {
              open: true,
              geometry: tableUi.geometry,
              onAddRowBefore: (event: CustomEvent<{ boundaryIndex: number }>) => runOverlayAction({ action: "add-row-before", boundaryIndex: event.detail.boundaryIndex }),
              onAddRowAfter: (event: CustomEvent<{ boundaryIndex: number }>) => runOverlayAction({ action: "add-row-after", boundaryIndex: event.detail.boundaryIndex }),
              onAddColumnBefore: (event: CustomEvent<{ boundaryIndex: number }>) => runOverlayAction({ action: "add-column-before", boundaryIndex: event.detail.boundaryIndex }),
              onAddColumnAfter: (event: CustomEvent<{ boundaryIndex: number }>) => runOverlayAction({ action: "add-column-after", boundaryIndex: event.detail.boundaryIndex }),
              onSelectRow: (event: CustomEvent<{ rowIndex: number; columnIndex: number }>) => runOverlayAction({ action: "select-row", ...event.detail }),
              onSelectColumn: (event: CustomEvent<{ rowIndex: number; columnIndex: number }>) => runOverlayAction({ action: "select-column", ...event.detail }),
              onReorderRow: (event: CustomEvent<{ fromIndex: number; toIndex: number }>) => runOverlayAction({ action: "reorder-row", ...event.detail }),
              onReorderColumn: (event: CustomEvent<{ fromIndex: number; toIndex: number }>) => runOverlayAction({ action: "reorder-column", ...event.detail }),
              onOpenCellMenu: (event: CustomEvent<{ rowIndex: number; columnIndex: number; anchor: { left: number; top: number; right: number; bottom: number } }>) => runOverlayAction({ action: "open-cell-menu", ...event.detail }),
              onOpenRowMenu: (event: CustomEvent<{ rowIndex: number; columnIndex: number; anchor: { left: number; top: number; right: number; bottom: number } }>) => runOverlayAction({ action: "open-row-menu", ...event.detail }),
              onOpenColumnMenu: (event: CustomEvent<{ rowIndex: number; columnIndex: number; anchor: { left: number; top: number; right: number; bottom: number } }>) => runOverlayAction({ action: "open-column-menu", ...event.detail }),
            })])
          : null,
        tableUi.menuOpen
          ? h("div", {
              ref: tableMenuShell,
              class: "looma-editor__table-menu-shell",
              style: tableUi.menuStyle,
            }, [h(EditorTableContextMenu, { ...tableProps, scope: tableUi.menuScope })])
          : null,
      ]);
    };
  },
});
