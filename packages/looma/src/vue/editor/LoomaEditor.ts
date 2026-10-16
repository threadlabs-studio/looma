import "../../components/ui-editor-surface/ui-editor-surface.css";
import "./looma-editor.css";
import { posToDOMRect, type AnyExtension, type Editor, type JSONContent } from "@tiptap/core";
import { Editor as VueEditor } from "@tiptap/vue-3";
import { createViewportSurface, observeOverlayViewport } from "../../components/shared/overlay.js";
import { closeHistory } from "@tiptap/pm/history";
import { NodeSelection } from "@tiptap/pm/state";
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  reactive,
  ref,
  shallowRef,
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
  getDefaultSlashCommands,
  handleTableAction,
  handleTableOverlayAction,
  measureTableOverlayGeometry,
  normalizeActiveTableColumnWidths,
  type LoomaSlashMenuSnapshot,
  type LoomaSlashCommand,
  type LoomaMentionItem,
  type LoomaMentionMenuSnapshot,
  type LoomaCodeLanguages,
  type LoomaChipColor,
  type SlashMenuAnchorRect,
  type TableOverlayGeometry,
  type TableCellAlignment,
  type TableCellBackground,
  type TableActionCapabilities,
  type TableContextMenuAction,
} from "@threadlabs/looma/editor";
import { Button, Card, EditorSurface, IconButton, Popover, Separator, Stack, StatusMessage, Text, Tooltip } from "@threadlabs/looma/vue";
import { getVisualViewportRect, LOOMA_ICONS, type LoomaIconName } from "@threadlabs/looma/editor";
import {
  EditorBlockActions,
  EditorChipEditor,
  EditorCodeLanguage,
  EditorImageToolbar,
  EditorInsertTableGrid,
  EditorLinkCard,
  EditorLinkForm,
  EditorMentionMenu,
  EditorSlashMenu,
  EditorSlashMenuGroup,
  EditorSlashMenuItem,
  EditorTableContextMenu,
  EditorTableOverlay,
  EditorTableToolbar,
  EditorToolbar,
} from "./primitives";
import {
  createLoomaImageDeliveryController,
  imageDescriptorFromAttrs,
  type LoomaImageActivationDetail,
  type LoomaImageAttributeResolver,
  type LoomaImageDescriptor,
  type LoomaImageSourceResolver,
  type LoomaImageRenditionErrorDetail,
} from "../../editor/image-delivery";
import { createCodeHighlighting } from "../../editor/code-highlighting";
import { runBlockAction } from "../../editor/block-actions";
import { createImageUploads, type LoomaImageUploadDetail, type LoomaImageUploads, type LoomaImageUploadsState } from "../../editor/image-uploads";
import { askRequest, onResponderAnnounced, respondWithFunction, type LoomaRequestOptions, type LoomaResponder } from "../../editor/requests";
import { createFormattingSelection, type LoomaFormattingSelection } from "../../editor/formatting-selection";
import { focusTableOverlayTarget } from "../../editor/extensions/table-commands";
import { validLinkHref } from "../../editor/content";
import { createChipEditing, LOOMA_CHIP_EDITING_IDLE, type LoomaChipEditing } from "../../editor/chip-editing";
import {
  groupRangeActions,
  rangeActionsAtCaret,
  selectionActionDetail,
  selectsPassage,
  type LoomaEditorRangeAction,
  type LoomaEditorRangeActionDetail,
  type LoomaEditorSelectionAction,
  type LoomaEditorSelectionActionDetail,
} from "../../editor/host-actions";
import { createMobileDock, mobileDockPlacement, usesMobileDock } from "../../editor/mobile-dock";
import { createLinkEditing, linkFormStatus, LOOMA_LINK_EDITING_IDLE, type LoomaLinkEditing, type LoomaLinkTarget } from "../../editor/link-editing";
import { menuAnchorRect, selectedTableCellElement, selectedTableElement } from "../../editor/selection-geometry";
import { createSelectionSurface, type SelectionSurface, type SelectionSurfaceOptions } from "../../editor/selection-surface";
import { createEditorSession, selectionSnapshot, type LoomaEditorSession, type LoomaSelectionSnapshot } from "../../editor/session";
import { formatEditorShortcut, isApplePlatform } from "../../editor/shortcuts";
import { tableOfContentsNodeView } from "./table-of-contents";
import { expandNodeView } from "./expand";
import { dividerNodeView } from "./divider";
import { calloutNodeView } from "./callout";
import { normalizeImagePlacement, type LoomaImagePlacement } from "../../editor/extensions/image";
import { imageNodeView } from "./image";

export type { LoomaImageUploadDetail } from "../../editor/image-uploads";
export type { LoomaRequestInit, LoomaResponder } from "../../editor/requests";

/**
 * Chooses whether formatting controls follow a selection, occupy persistent
 * editor chrome, or open from an app-owned button (`popover`, with a text-only
 * bubble for selections). Floating tools open on text selection or a held press
 * and dismiss on Escape/caret movement. `contextual` includes the full command
 * set. Narrow viewports retain a dock; document commands/content are unchanged.
 */
export type LoomaEditorToolbarMode = "bubble" | "sticky" | "popover" | "contextual";

export type {
  LoomaEditorRangeAction,
  LoomaEditorRangeActionDetail,
  LoomaEditorSelectionAction,
  LoomaEditorSelectionActionDetail,
} from "../../editor/host-actions";


export type { LoomaLinkTarget } from "../../editor/link-editing";

/** The `slash-commands` request's detail: this editor's default commands. */
export interface LoomaSlashCommandsDetail { defaults: LoomaSlashCommand[]; }
/** The `link-search` request's detail: what the author typed in the link field. */
export interface LoomaLinkSearchDetail { query: string; }
/** The `link-resolve` request's detail: a saved link's `href`. */
export interface LoomaLinkResolveDetail { href: string; }
/** The `mention-query` request's detail: what the author typed after `@`, and how many results show. */
export interface LoomaMentionQueryDetail { query: string; limit: number; }

/**
 * Answers `extensions` with Tiptap extensions added after Looma's.
 * @lifecycle The editor asks when it mounts and again when a responder first appears, then rebuilds
 * with the answer and keeps its document.
 */
export type LoomaEditorExtensions = LoomaResponder<null, AnyExtension[]>;
/**
 * Answers `slash-commands` with the commands the slash menu offers: the defaults, changed or
 * extended. `null` keeps the defaults; an empty array offers none.
 * @ownership The host owns its command objects and mutations; Looma asks again with fresh defaults
 * when the prop changes or image uploads become available.
 */
export type LoomaEditorSlashCommands = LoomaResponder<LoomaSlashCommandsDetail, LoomaSlashCommand[]>;
/**
 * Answers `link-search` with host records for a link, without teaching the editor how they are stored.
 * @ownership The host checks access and returns durable, openable `href` values.
 * @failure A rejection leaves the document untouched and shows a retryable search error.
 */
export type LoomaLinkSearch = LoomaResponder<LoomaLinkSearchDetail, LoomaLinkTarget[]>;
/**
 * Answers `link-resolve` with a saved link's current record, so a renamed record shows its new label.
 * @ownership The host resolves identity and access; Looma keeps the saved href as is.
 * @failure A rejection or `null` leaves the original href visible and editable.
 */
export type LoomaLinkResolve = LoomaResponder<LoomaLinkResolveDetail, LoomaLinkTarget>;
/**
 * Answers `mention-query` with people to suggest after `@`; `null` falls back to `mentionItems`.
 * @ownership The host owns directory access; Looma filters the answer and clamps it to `limit`.
 * @failure A rejection shows an empty menu.
 */
export type LoomaMentionQuery = LoomaResponder<LoomaMentionQueryDetail, LoomaMentionItem[]>;
/**
 * Answers `image-upload` with the image to insert for a pasted, dropped, or chosen file, or `null`
 * to insert nothing. `progress(loaded, total)` drives the editor's progress status, and `signal`
 * aborts when the author cancels.
 * @ownership The application owns the upload and the returned `src`; Looma owns inserting it.
 * @failure A rejection leaves the document unchanged and emits `uploadError`.
 */
export type LoomaImageUploader = LoomaResponder<LoomaImageUploadDetail, LoomaImageDescriptor>;

// Each request the editor asks and its function prop (https://nextwebwg.org/declarative-components/javascript#requests).
const EDITOR_REQUESTS = {
  extensions: "extensions",
  "slash-commands": "slashCommands",
  "mention-query": "mentionQuery",
  "link-search": "linkSearch",
  "link-resolve": "linkResolve",
  "image-upload": "imageUpload",
} as const;
type EditorRequest = keyof typeof EDITOR_REQUESTS;
const EDITOR_REQUEST_NAMES = Object.keys(EDITOR_REQUESTS) as EditorRequest[];

const EMPTY_DOCUMENT: JSONContent = { type: "doc", content: [] };

const uploadProgressText = (progress: LoomaImageUploadsState["progress"]) =>
  progress && progress.total > 0 ? `Uploading image… ${Math.round(Math.min(1, progress.loaded / progress.total) * 100)}%` : "Uploading image…";
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

function slashMenuRows(items: LoomaSlashCommand[]) {
  const groups: Array<{ label?: string; rows: VNode[] }> = [];
  for (const [index, item] of items.entries()) {
    if (!groups.length || groups.at(-1)!.label !== item.group) groups.push({ label: item.group, rows: [] });
    groups.at(-1)!.rows.push(h(EditorSlashMenuItem, {
      key: item.id ?? `${item.title}-${index}`, value: item.id ?? item.title,
      description: item.description, icon: item.icon, keywords: [...item.keywords, item.id ?? ""].join(" "),
    }, () => item.title));
  }
  return groups.flatMap(({ label, rows }, index) => label
    ? [h(EditorSlashMenuGroup, { key: `${label}-${index}`, label }, () => rows)] : rows);
}

function loomaIcon(name: LoomaIconName) {
  return h("svg", {
    class: "looma-icon",
    "data-looma-icon": name,
    "aria-hidden": "true",
    focusable: "false",
    viewBox: "0 0 24 24",
    width: 16, height: 16,
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
    /** Compact read-only excerpts fit their content; editable documents retain the standard canvas. */
    contentDensity: { type: String as PropType<"comfortable" | "compact">, default: "comfortable" },
    placeholder: {
      type: String,
      default: "Type “/” for commands, or start writing…",
    },
    /** Accessible name of the editing surface, which is a text box to assistive technology. */
    label: {
      type: String,
      default: "Document",
    },
    /** Answers `extensions`: the application's Tiptap extensions, added after Looma's. */
    extensions: {
      type: Function as PropType<LoomaEditorExtensions | undefined>,
      default: undefined,
    },
    /** Answers `slash-commands`: the slash menu's commands, given the defaults. */
    slashCommands: {
      type: Function as PropType<LoomaEditorSlashCommands | undefined>,
      default: undefined,
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
    /** Answers `mention-query`: people to suggest for what the author typed after `@`. */
    mentionQuery: {
      type: Function as PropType<LoomaMentionQuery | undefined>,
      default: undefined,
    },
    mentionLimit: {
      type: Number,
      default: DEFAULT_MENTION_RESULT_LIMIT,
    },
    /** Site origin for relative links. Applied to newly inserted links, including paste over selected text. */
    linkBaseUrl: { type: String, default: "" },
    /** Answers `link-search` and `link-resolve`: host search and identity lookup for links to application records. */
    linkSearch: {
      type: Function as PropType<LoomaLinkSearch | undefined>,
      default: undefined,
    },
    linkResolve: {
      type: Function as PropType<LoomaLinkResolve | undefined>,
      default: undefined,
    },
    linkTargetLabel: {
      type: String,
      default: "Item",
    },
    /** Answers `image-upload`: uploads a pasted, dropped, or chosen image and returns the image to insert. */
    imageUpload: {
      type: Function as PropType<LoomaImageUploader | undefined>,
      default: undefined,
    },
    resolveImageAttributes: {
      type: Function as PropType<LoomaImageAttributeResolver | undefined>,
      default: undefined,
    },
    resolveImageSource: {
      type: Function as PropType<LoomaImageSourceResolver | undefined>,
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
    /** Keep frequent inline styles visible; Format opens the complete existing inventory. */
    compactToolbar: { type: Boolean, default: false },
    /** Optional passage actions also work on read-only selections without granting editing. */
    selectionActions: { type: Array as PropType<LoomaEditorSelectionAction[]>, default: () => [] },
    /** Opt-in caret actions; the host owns durable identities and recalculates positions after edits. */
    rangeActions: { type: Array as PropType<LoomaEditorRangeAction[]>, default: () => [] },
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
    selectionAction: (_detail: LoomaEditorSelectionActionDetail) => true,
    rangeAction: (_detail: LoomaEditorRangeActionDetail) => true,
    uploadError: (_error: unknown, _file: File) => true,
    imageActivate: (_detail: LoomaImageActivationDetail) => true,
    imageRenditionError: (_detail: LoomaImageRenditionErrorDetail) => true,
  },
  setup(props, { attrs, emit, expose }) {
    const root = ref<HTMLElement | null>(null);
    const formatAnchorId = `looma-editor-format-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const formatOpen = ref(false);

    const fileInput = ref<HTMLInputElement | null>(null);
    const tablePickerAnchorId = `looma-editor-table-picker-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const blockActionAnchorId = `ui-block-tools-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const linkAnchorId = `looma-editor-link-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const linkPopoverAnchorId = ref(linkAnchorId);
    const linkDestinationInput = () => linkFormRoot.value?.querySelector<HTMLInputElement>("[data-link-destination]");
    const linkFormRoot = ref<HTMLElement | null>(null);
    const setLinkFormRoot = (instance: unknown) => {
      const element = (instance as { $el?: unknown } | null)?.$el;
      linkFormRoot.value = element instanceof HTMLElement ? element : null;
    };
    let linkEditing: LoomaLinkEditing | undefined;
    const linkState = shallowRef(LOOMA_LINK_EDITING_IDLE);
    const chipAnchorId = `looma-editor-chip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const chipEditorRoot = ref<HTMLElement | null>(null);
    const setChipEditorRoot = (instance: unknown) => {
      const element = (instance as { $el?: unknown } | null)?.$el;
      chipEditorRoot.value = element instanceof HTMLElement ? element : null;
    };
    const chipInput = () => chipEditorRoot.value?.querySelector<HTMLInputElement>("[data-chip-label]");
    let chipEditing: LoomaChipEditing | undefined;
    const chipState = shallowRef(LOOMA_CHIP_EDITING_IDLE);
    // One tooltip follows the row: the first button waits, and moving along the row is immediate,
    // which is what a toolbar needs and what the native `title` attribute cannot do.
    const toolbarScope = `looma-editor-tool-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const tooltipFor = ref("");
    const tooltipLabel = ref("");
    const tooltipShortcut = ref("");
    const tooltipOpen = ref(false);
    const resizeHintFor = ref("");
    let resizeHintSequence = 0;
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
    let uploads: LoomaImageUploads | undefined;
    const uploadState = shallowRef<LoomaImageUploadsState>({ uploading: false, progress: null, failed: null });
    const tablePickerOpen = ref(false);
    const mobileToolbarStyle = ref<CSSProperties>({});
    const mobile = ref(typeof window !== "undefined" && usesMobileDock(window.innerWidth));
    const editorFocused = ref(false);
    // Which selection the floating tools belong to; chrome only, never the document or undo history.
    let formatting: LoomaFormattingSelection | undefined;
    let formattingPopup: SelectionSurface | null = null;
    let linkPopup: SelectionSurface | null = null;
    let imagePopup: SelectionSurface | null = null;
    const floatingFormattingMode = () => props.toolbarMode !== "sticky"
      && !(props.toolbarMode === "popover" && props.toolbarOpen) && !mobile.value;
    const formattingPickerOpen = () => linkState.value.surface === "popover" || tablePickerOpen.value || formatOpen.value;
    const activeRangeActions = (instance: Editor) => rangeActionsAtCaret(instance.state, props.rangeActions);
    const formattingActive = () => formatting?.active() ?? false;

    const editorStateVersion = ref(0);
    const mobileToolbarMode = ref<"formatting" | "table">("formatting");
    const mobileDock = createMobileDock((mode) => { mobileToolbarMode.value = mode; });
    let dragLeaveTimer: ReturnType<typeof setTimeout> | null = null;
    let tableResizeActive = false;
    let tableInteractionActive = false;
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

    // The popover anchors to the edited chip, which carries the anchor ID while it is edited.
    const openChipEditor = (_instance: Editor, position: number) => {
      if (!chipEditing?.open(position)) return;
      root.value?.querySelector(`#${chipAnchorId}`)?.removeAttribute("id");
      chipEditing.element!.id = chipAnchorId;
      void nextTick(() => chipInput()?.focus());
    };
    const closeChip = (focusChip = false) => {
      const element = chipEditing?.element;
      chipEditing?.close();
      if (focusChip) element?.focus();
    };
    // Requests: a function prop answers on the root ahead of the Vue event form there; otherwise the
    // request bubbles on to the root's ancestors and the document.
    const found = reactive(new Set<EditorRequest>());
    // Whether `name` has a responder the editor knows of: its prop, its Vue listener, or one announced or seen answering.
    // HTML Next has no way to learn of a responder before asking (requests gap, before the owner's requests follow-up), so a
    // responder registered before mount enables Insert image and link search only once it answers or announces itself.
    const answers = (name: EditorRequest) => {
      const prop = EDITOR_REQUESTS[name];
      return typeof props[prop] === "function" || attrs[`on${prop[0]!.toUpperCase()}${prop.slice(1)}`] != null || found.has(name);
    };
    const connection = new AbortController();
    const ask = <Answer>(name: EditorRequest, detail: unknown, options: LoomaRequestOptions = {}) => {
      if (!root.value || connection.signal.aborted) return null;
      const signal = options.signal ? AbortSignal.any([options.signal, connection.signal]) : connection.signal;
      return askRequest<Answer>(root.value, name, detail, { ...options, signal });
    };
    // A newer ask aborts the same request still pending, as the author's next keystroke replaces a query.
    const latest = new Map<EditorRequest, AbortController>();
    const askLatest = <Answer>(name: EditorRequest, detail: unknown) => {
      latest.get(name)?.abort();
      const controller = new AbortController();
      latest.set(name, controller);
      return ask<Answer>(name, detail, { signal: controller.signal });
    };
    // Applies the answer now or when it arrives. A failed ask is reported and applies null; a replaced one applies nothing.
    const askThen = <Answer>(name: EditorRequest, detail: unknown, apply: (answer: Answer | null) => void) => {
      const answer = askLatest<Answer>(name, detail);
      if (!(answer instanceof Promise)) return apply(answer);
      const controller = latest.get(name);
      answer.then(apply, (error: unknown) => {
        if (controller !== latest.get(name) || connection.signal.aborted) return;
        reportError(error);
        apply(null);
      });
    };
    // The same defaults while image uploads stay available or unavailable, so an answer built from them compares equal.
    let slashDefaults: { uploads: boolean; commands: LoomaSlashCommand[] } | undefined;
    const defaultSlashCommands = () => {
      const uploads = answers("image-upload");
      if (slashDefaults?.uploads !== uploads) {
        slashDefaults = { uploads, commands: getDefaultSlashCommands(uploads ? () => fileInput.value?.click() : undefined, openChipEditor, () => openLinkEditor()) };
      }
      return slashDefaults.commands;
    };
    const askSlashCommands = () => {
      const defaults = defaultSlashCommands();
      askThen<LoomaSlashCommand[]>("slash-commands", { defaults: [...defaults] }, (answer) => {
        const commands = answer ?? defaults;
        const current = slashExtension.options.commands;
        // An inline function prop is new on every render; the same inventory leaves the open menu alone.
        if (commands.length === current.length && commands.every((command, index) => command === current[index])) return;
        slashExtension.options.commands = commands;
        editor.value?.commands.dismissLoomaSlashMenu();
      });
    };
    let consumerExtensions: AnyExtension[] = [];
    const askExtensions = () => askThen<AnyExtension[]>("extensions", null, (extensions) => {
      const changed = Boolean(extensions?.length || consumerExtensions.length);
      consumerExtensions = extensions ?? [];
      if (!session) build(props.modelValue);
      else if (changed) rebuild();
    });
    // A late responder, by prop, Vue listener, or announcement, gets the requests asked once; a
    // change in image uploads changes the default slash commands.
    let responders = new Set<EditorRequest>();
    const checkResponders = () => {
      const current = new Set(EDITOR_REQUEST_NAMES.filter(answers));
      const arrived = (name: EditorRequest) => current.has(name) && !responders.has(name);
      const extensionsArrived = arrived("extensions");
      const slashChanged = arrived("slash-commands") || current.has("image-upload") !== responders.has("image-upload");
      responders = current;
      if (extensionsArrived) askExtensions();
      if (slashChanged) askSlashCommands();
    };
    onUpdated(checkResponders);
    let stopAnnouncements: (() => void) | undefined;
    const slashExtension = createLoomaSlashCommandExtension({
      commands: defaultSlashCommands(),
      onOpenImagePicker: () => fileInput.value?.click(),
      onOpenChipEditor: openChipEditor,
      onOpenLinkEditor: () => openLinkEditor(),
      onStateChange: (state) => {
        Object.assign(slash, state);
      },
    });
    const mentionMenuId = `looma-editor-mention-menu-${++editorInstanceSequence}`;
    const mentionExtension = createLoomaMentionExtension({
      limit: props.mentionLimit,
      menuId: mentionMenuId,
      items: async (query, context) => (await askLatest<LoomaMentionItem[]>("mention-query", { query, limit: context.limit })) ?? props.mentionItems,
      onStateChange: (state) => {
        Object.assign(mention, state);
      },
    });
    const imageDelivery = createLoomaImageDeliveryController({
      resolveSource: () => props.resolveImageSource,
      resolveAttributes: () => props.resolveImageAttributes,
      isEditable: () => props.editable,
    });
    let lastFocusedSelection: LoomaSelectionSnapshot | null = null;
    let linkPressedSelection: { from: number; to: number } | null = null;
    const rememberSelection = (instance: Editor) => {
      if (!instance.isFocused) return;
      lastFocusedSelection = selectionSnapshot(instance.view.state.selection);
    };

    const authorHighlight = !props.disableHighlight;
    const codeHighlighting = createCodeHighlighting(props.codeLanguages, () => { codeUi.grammarVersion += 1; });
    const codeLanguageNames = codeHighlighting.languageNames;
    const codeUi = reactive({ open: false, pos: 0, language: "auto", text: "", grammarVersion: 0, style: {} as CSSProperties });
    const loadForCodeBlock = codeHighlighting.loadForCodeBlock;
    const editor = shallowRef<VueEditor>();
    let session: LoomaEditorSession<VueEditor> | undefined;
    let edited = false;
    const build = (content: JSONContent) => {
      edited = false;
      const consumerMention = consumerExtensions.some((extension) => extension.name === "mention");
      session = createEditorSession({
        extensions: [
          ...getDefaultEditorExtensions({
            placeholder: props.placeholder,
            linkBaseUrl: props.linkBaseUrl,
            mention: consumerMention ? false : mentionExtension,
            disableHighlight: props.disableHighlight,
            codeLanguages: props.codeLanguages ?? undefined,
            codeLowlight: codeHighlighting.lowlight,
            tableOfContentsNodeView,
            expandNodeView,
            dividerNodeView,
            calloutNodeView,
            imageNodeView,
          }),
          imageDelivery.extension,
          slashExtension,
          ...consumerExtensions,
        ],
        content,
        editable: props.editable,
        editorProps: {
          // Tiptap creates its first view before installing plugins/node views.
          // Keep images inert until the delivery decorations are available.
          nodeViews: { image: () => ({ dom: document.createElement("span") }) },
          attributes: { role: "textbox", "aria-multiline": "true", "aria-label": props.label },
          handleKeyDown: (_view, event) => onFormattingKeyDown(event),
          handleDOMEvents: {
            click: (view, event) => {
              if (!(event.target instanceof Element) || event.button !== 0) return false;
              const link = event.target.closest<HTMLAnchorElement>("a[href]");
              if (!link || !view.dom.contains(link)) return false;
              const href = validLinkHref(link.getAttribute("href") ?? "");
              if (!href) return false;
              if (isApplePlatform() ? event.metaKey : event.ctrlKey) {
                event.preventDefault();
                window.open(href, "_blank", "noopener,noreferrer");
                return true;
              }
              formatting?.undismiss();
              // Clicking the same caret does not dispatch a selection transaction.
              requestAnimationFrame(() => {
                if (view.isDestroyed) return;
                editorStateVersion.value += 1;
                const instance = editor.value;
                if (instance?.isFocused && instance.state.selection.empty && instance.isActive("link") && linkState.value.surface !== "popover") {
                  linkPopup?.setAnchor(() => link.getBoundingClientRect());
                  linkPopup?.show();
                }
              });
              return false;
            },
          },
        },
        onCreate: ({ editor: instance }) => {
          emit("ready", instance);
          instance.state.doc.descendants((node) => {
            if (node.type.name === "codeBlock") loadForCodeBlock(instance, node.attrs.language, node.textContent);
          });
        },
        onFocus: ({ editor: instance }) => rememberSelection(instance),
        onSelectionUpdate: ({ editor: instance }) => {
          rememberSelection(instance);
          if (floatingFormattingMode()) {
            const selection = instance.state.selection;
            formatting?.selectionChanged();
            if (!formattingActive()) formattingPopup?.hide();
          }
        },
        onUpdate: ({ editor: instance }) => {
          edited = true;
          const value = instance.getJSON();
          emit("update:modelValue", value);
          emit("update", value);
        },
      }, VueEditor);
      // Later setOptions calls must keep the installed node views, not the
      // constructor-only placeholder that prevented the initial source request.
      delete session.editor.options.editorProps.nodeViews;
      session.subscribe(() => { editorStateVersion.value += 1; });
      editor.value = session.editor;
      const engine = createLinkEditing({
        editor: session.editor,
        search: () => answers("link-search") ? async (query) => (await askLatest<LoomaLinkTarget[]>("link-search", { query })) ?? [] : null,
        resolve: () => async (href) => await askLatest<LoomaLinkTarget>("link-resolve", { href }),
        baseUrl: () => props.linkBaseUrl,
      });
      engine.subscribe(() => { linkState.value = engine.state; });
      linkEditing = engine;
      const chips = createChipEditing({ editor: session.editor, isEditable: () => props.editable });
      chips.subscribe(() => { chipState.value = chips.state; });
      chipEditing = chips;
      const imageUploads = createImageUploads({
        editor: session.editor,
        // Paste and drop ask even without a known responder, and a first answer makes uploads available.
        upload: () => async (file, init) => {
          const image = await ask<LoomaImageDescriptor>("image-upload", { file }, init);
          if (image && !found.has("image-upload")) {
            found.add("image-upload");
            checkResponders();
          }
          return image;
        },
        onError: (error, file) => emit("uploadError", error, file),
      });
      imageUploads.subscribe(() => { uploadState.value = imageUploads.state; });
      uploads = imageUploads;
      const instance = session.editor;
      formatting = createFormattingSelection({
        editor: instance,
        canHold: () => floatingFormattingMode() && !tableResizeActive && props.editable,
        menuOpen: () => slash.active || mention.active,
        shownAtCaret: () => activeRangeActions(instance).length > 0,
        onHold: (selection) => {
          formattingPopup?.setAnchor(() => posToDOMRect(instance.view, selection.from, selection.to));
          formattingPopup?.show();
        },
      });
    };
    // A late extensions answer rebuilds the editor. An unedited document is parsed again from the
    // host's content, so nodes the new extensions define are kept.
    const rebuild = () => {
      const previous = session!;
      const content = edited ? previous.editor.getJSON() : props.modelValue;
      linkEditing?.destroy();
      chipEditing?.close();
      formatting?.destroy();
      uploads?.cancel();
      previous.destroy();
      build(content);
    };
    onMounted(() => {
      const element = root.value!;
      for (const name of EDITOR_REQUEST_NAMES) {
        // Capture runs before the Vue event form's listener on the same root, so the function prop answers first.
        element.addEventListener(name, (event) => {
          const responder = props[EDITOR_REQUESTS[name]];
          if (typeof responder === "function" && "respondWith" in event) respondWithFunction(event, responder as LoomaResponder<unknown, unknown>);
        }, { capture: true });
      }
      stopAnnouncements = onResponderAnnounced(element, (name) => {
        if (!(name in EDITOR_REQUESTS)) return;
        found.add(name as EditorRequest);
        checkResponders();
      });
      responders = new Set(EDITOR_REQUEST_NAMES.filter(answers));
      askExtensions();
      askSlashCommands();
    });
    // The render function's document element; the session moves the editor's view into it.
    const attachDocument = (element: unknown) => {
      if (element instanceof HTMLElement) session?.attach(element);
    };
    onBeforeUnmount(() => {
      // Leave a static copy in place so the document stays visible while the component leaves.
      const element = session?.editor.options.element;
      element?.parentNode?.replaceChild(element.cloneNode(true), element);
      connection.abort();
      stopAnnouncements?.();
      linkEditing?.destroy();
      session?.destroy();
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
      linkEditing?.open(from, to, context ? "context" : "popover");
      void nextTick(() => {
        if (context) {
          const popup = props.toolbarMode === "contextual" && floatingFormattingMode() && formattingActive()
            ? formattingPopup : linkPopup;
          popup?.setAnchor(() => posToDOMRect(instance.view, instance.state.selection.from, instance.state.selection.to));
        }
        (linkState.value.mode === "url"
          ? linkDestinationInput()
          : linkFormRoot.value?.querySelector<HTMLInputElement>("[data-link-search]"))?.focus();
      });
    };
    const dismissLink = (restoreFocus = true) => {
      linkEditing?.close();
      const range = linkState.value.range;
      if (restoreFocus && range) editor.value?.chain().focus().setTextSelection(range.to).run();
      // The held gesture that opened the editor has ended; a later click at this caret shows the link card.
      formatting?.dismiss(editor.value?.state.selection ?? null);
      linkPopup?.hide();
      formattingPopup?.hide();
    };
    const renderLinkForm = () => {
      const state = linkState.value;
      const shown = state.selected ? [state.selected] : state.results;
      return h(EditorLinkForm, {
        ref: setLinkFormRoot,
        class: "looma-editor__link-form",
        existing: Boolean(state.range?.existing),
        searchable: answers("link-search"),
        mode: state.mode,
        value: answers("link-search") ? state.query : state.href,
        placeholder: answers("link-search") ? `Search ${props.linkTargetLabel.toLowerCase()}s or paste a URL…` : "https://example.com",
        newTab: state.newTab,
        textEditable: state.textEditable,
        text: state.text,
        error: state.error,
        status: linkFormStatus(state),
        results: shown.map(({ id, label, detail }) => (detail ? { id, label, detail } : { id, label })),
        selected: state.selected?.id ?? "",
        onDestination: (event: CustomEvent<{ value: string }>) => linkEditing?.setDestination(event.detail.value),
        onClear: () => linkEditing?.clear(),
        onChoose: (event: CustomEvent<{ id: string }>) => {
          const target = shown.find(({ id }) => id === event.detail.id);
          if (target) linkEditing?.choose(target);
        },
        onNewTab: (event: CustomEvent<{ newTab: boolean }>) => linkEditing?.setNewTab(event.detail.newTab),
        onText: (event: CustomEvent<{ text: string }>) => linkEditing?.setText(event.detail.text),
        onSave: () => { if (linkEditing?.apply(true)) dismissLink(); },
        onDismiss: () => dismissLink(),
      });
    };
    const renderLinkContextCard = (instance: Editor) => {
      if (linkState.value.surface === "context") return h(Card, { variant: "elevated", padding: "sm", size: "sm", class: "looma-editor__link-context" }, () => [renderLinkForm()]);
      const rawHref = instance.getAttributes("link").href;
      const href = typeof rawHref === "string" ? rawHref : "";
      const target = linkState.value.current;
      return h(EditorLinkCard, {
        class: "looma-editor__link-context",
        href,
        openHref: validLinkHref(href) ?? "",
        label: target?.label ?? "",
        detail: target?.detail ?? "",
        targetLabel: props.linkTargetLabel,
        onEdit: () => openLinkEditor(true),
        onRemove: () => linkEditing?.remove(),
      });
    };

    watch(() => props.slashCommands, askSlashCommands);
    watch(() => props.editable, (editable) => {
      formatting?.press.cancel();
      formatting?.release();
      editor.value?.setEditable(editable, false);
      if (!editable) formattingPopup?.hide();
      if (editor.value) imageDelivery.reset(editor.value);
      root.value?.querySelectorAll<HTMLElement>("[data-looma-chip]").forEach((chip) => {
        chip.setAttribute("aria-disabled", String(!editable));
      });
      if (!editable) chipEditing?.close();
    });
    watch([() => linkState.value.surface === "popover", tablePickerOpen, formatOpen], ([linking, table, format]) => {
      if (linking || table || format || !floatingFormattingMode() || editor.value?.isFocused
        || formattingPopup?.element.contains(document.activeElement)) return;
      formatting?.release();
      formattingPopup?.hide();
    });
    watch(() => props.rangeActions, () => {
      const instance = editor.value;
      if (instance) instance.view.dispatch(instance.state.tr.setMeta("loomaRangeActionsChanged", true));
    });

    watch(() => props.label, (label) => {
      editor.value?.setOptions({
        editorProps: { attributes: { role: "textbox", "aria-multiline": "true", "aria-label": label } },
      });
    });
    watch([() => props.resolveImageAttributes, () => props.resolveImageSource], () => {
      const instance = editor.value;
      if (instance) imageDelivery.reset(instance);
    });
    watch(() => props.modelValue, (value) => {
      const instance = editor.value;
      if (!instance || !session) return;
      const wasFocused = instance.isFocused;
      if (session.setContent(value, lastFocusedSelection) && wasFocused) rememberSelection(instance);
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
      mobileDock.tableInactive();
    };

    const updateMobileViewport = () => {
      mobile.value = usesMobileDock(window.innerWidth);
      if (!mobile.value) {
        mobileToolbarStyle.value = {};
        return;
      }

      nextTick(() => {
        const placement = mobileDockPlacement(getVisualViewportRect(window), mobileToolbarShell.value?.getBoundingClientRect().height || 56);
        mobileToolbarStyle.value = { left: `${placement.left}px`, top: `${placement.top}px`, width: `${placement.width}px` };
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
      const detected = codeUi.open && codeUi.text.trim() ? codeHighlighting.lowlight.highlightAuto(codeUi.text).data?.language : null;
      return [
        { value: "auto", label: typeof detected === "string" ? `Auto (${detected.toUpperCase()})` : "Auto" },
        ...(codeUi.language !== "auto" && !codeLanguageNames.includes(codeUi.language)
          ? [{ value: codeUi.language, label: `${codeUi.language.toUpperCase()} (unavailable)` }]
          : []),
        ...codeLanguageNames.map((name) => ({ value: name, label: name.toUpperCase() })),
      ];
    });
    const chooseCodeLanguage = (value: string) => {
      const instance = editor.value;
      if (!instance) return;
      const language = value === "auto" ? null : value;
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
      if (hoveredTableCell && (!instance || instance.isDestroyed || !instance.view.dom.contains(hoveredTableCell))) hoveredTableCell = null;
      const focusInTableUi = [tableToolbarShell.value, tableOverlayShell.value, tableMenuShell.value, mobileToolbarShell.value]
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

      if (selectedTableIsActive) mobileDock.tableActive();

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
      formatting?.press.cancel();
      queueMicrotask(updateTableUi);
      updateCodeUi();
      setTimeout(() => {
        if (!tableInteractionActive && !editor.value?.isFocused && !mobileToolbarShell.value?.contains(document.activeElement)) editorFocused.value = false;
        if (!editor.value?.isFocused && !formattingPickerOpen() && !formattingPopup?.element.contains(document.activeElement)) {
          formatting?.release();
        }
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
      // The shared viewport pass runs a frame later; a change from before the press did not move it.
      formatting?.press.viewportChanged(event);
      const wasMobile = mobile.value;
      if (slash.active && slash.getRect) slash.rect = slash.getRect();
      if (mention.active && mention.getRect) mention.rect = mention.getRect();
      updateMobileViewport();
      if (wasMobile !== mobile.value) formatting?.release();
      updateTableUi();
      updateCodeUi();
      if (floatingFormattingMode() && editor.value && !formattingActive()) formattingPopup?.hide();
      tableUi.menuOpen = false;
    };

    let stopViewport: (() => void) | undefined;
    const popupRef = (target: { value: HTMLElement | null }, preserveChrome = false) => {
      let presentation: ReturnType<typeof createViewportSurface> | undefined;
      return (node: unknown) => {
        const element = node instanceof HTMLElement ? node : null;
        if (target.value === element) return;
        presentation?.destroy();
        target.value = element;
        presentation = element ? createViewportSurface(element, { bare: true, preserveChrome }) : undefined;
        presentation?.show();
      };
    };
    const tableToolbarRef = popupRef(tableToolbarShell);
    const codeLanguageRef = popupRef(codeLanguageShell, true);
    const mobileToolbarRef = popupRef(mobileToolbarShell, true);
    // Presented shells carry keys: the root's children are diffed by key, and an unkeyed shell could
    // otherwise take over a sibling's element, and with it that sibling's presentation.
    // The table overlay enters the top layer once, as the editor mounts, so every editor surface shown
    // after it, the table toolbar and context menu included, stays above its handles. It then opens and
    // closes with `hidden`, which keeps that place in the top layer.
    const presentTableOverlay = popupRef(tableOverlayShell);
    const tableOverlayRef = (node: unknown) => {
      presentTableOverlay(node);
      if (node instanceof HTMLElement) node.hidden = !tableUi.overlayOpen;
    };
    const onDocumentPointerDown = (event: PointerEvent) => {
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      const inElement = (element: HTMLElement | null) => Boolean(
        element && (path.includes(element) || (event.target instanceof Node && element.contains(event.target)))
      );
      if (linkState.value.surface !== "none" && !inElement(linkFormRoot.value)) dismissLink(false);
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

    const onFormattingPointerDown = (event: PointerEvent) => formatting?.press.down(event);
    const onFormattingPointerMove = (event: PointerEvent) => formatting?.press.move(event);
    const onFormattingPointerEnd = (event: PointerEvent) => formatting?.press.end(event);
    const onFormattingKeyDown = (event: KeyboardEvent) => {
      formatting?.press.cancel();
      if (event.key !== "Escape" || !(event.target instanceof Node)
        || !(root.value?.contains(event.target) || formattingPopup?.element.contains(event.target) || linkPopup?.element.contains(event.target))
        || !(formatOpen.value || formattingPopup?.isOpen() || linkPopup?.isOpen())) return false;
      dismissFormatting();
      return true;
    };
    // Escape keeps the selection and hides its tools until the reader selects again.
    const dismissFormatting = () => {
      formatting?.dismiss();
      formatOpen.value = false;
      formattingPopup?.hide();
      linkPopup?.hide();
      hideTool();
    };
    // Each selection surface is rendered in its own host element and registered with the editor while mounted.
    const surfaceRef = (assign: (surface: SelectionSurface | null) => void, options: (element: HTMLElement, instance: VueEditor) => SelectionSurfaceOptions) => {
      let current: SelectionSurface | null = null;
      return (node: unknown) => {
        const element = node instanceof HTMLElement ? node : null;
        if (current?.element === element) return;
        current?.destroy();
        current = element && editor.value ? createSelectionSurface(options(element, editor.value)) : null;
        assign(current);
      };
    };
    const editorRoot = () => root.value ? [root.value] : [];
    const formattingSurfaceRef = surfaceRef((surface) => { formattingPopup = surface; }, (element, instance) => ({
      editor: instance,
      element,
      pluginKey: "looma-text-formatting-menu",
      shouldShow: ({ editor: menuEditor }) =>
        (props.toolbarMode !== "popover" || !props.toolbarOpen)
        && !slash.active && !mention.active
        && (!props.editable && (props.selectionActions.length > 0 || props.rangeActions.length > 0) || menuEditor.isFocused || formattingPopup?.element.contains(document.activeElement) || linkState.value.surface === "context" || formattingPickerOpen())
        && formattingActive(),
      boundary: () => props.toolbarMode === "contextual" ? root.value : null,
      related: editorRoot,
      // A picker owns the active editing gesture while its field has focus; retain its toolbar anchor.
      onHide: () => instance.isEditable && floatingFormattingMode() && formattingPickerOpen() && formattingActive()
        ? false : undefined,
      onDismiss: (reason) => reason === "escape" ? dismissFormatting() : formattingPopup?.hide(),
    }));
    const linkSurfaceRef = surfaceRef((surface) => { linkPopup = surface; }, (element, instance) => ({
      editor: instance,
      element,
      pluginKey: "looma-link-context-menu",
      shouldShow: ({ editor: menuEditor, from, to }) =>
        from === to && menuEditor.isActive("link") && linkState.value.surface !== "popover"
        && !formatting?.dismissed(menuEditor.state.selection)
        && Boolean(menuEditor.isFocused || linkState.value.surface === "context" || linkPopup?.element.contains(document.activeElement))
        && !(props.toolbarMode === "contextual" && floatingFormattingMode() && formattingActive()),
      maxWidth: () => Math.min(480, window.innerWidth - 24),
      related: editorRoot,
      onDismiss: (reason) => reason === "escape" ? dismissFormatting() : linkPopup?.hide(),
    }));
    // The image toolbar's target names the selected image node, so a description draft opened for one
    // image is cancelled, never applied, once the selection or that image changes.
    const imageTargets = new WeakMap<object, string>();
    let imageTargetSequence = 0;
    const selectedImage = (instance: Editor) => instance.state.selection instanceof NodeSelection
      && instance.state.selection.node.type.name === "image" ? instance.state.selection : null;
    const updateSelectedImage = (instance: Editor, attrs: Record<string, unknown>) => {
      const selection = selectedImage(instance);
      if (!selection || !instance.isEditable) return;
      instance.view.dispatch(instance.state.tr.setNodeMarkup(selection.from, undefined, { ...selection.node.attrs, ...attrs }));
      instance.view.focus();
    };
    const renderImageToolbar = (instance: Editor) => {
      const node = selectedImage(instance)?.node;
      let target = "";
      if (node) {
        target = imageTargets.get(node) ?? `image-${++imageTargetSequence}`;
        imageTargets.set(node, target);
      }
      return h(EditorImageToolbar, {
        placement: normalizeImagePlacement(node?.attrs.placement),
        alt: node?.attrs.alt ?? "",
        target,
        onPlacement: (event: CustomEvent<{ placement: LoomaImagePlacement }>) => updateSelectedImage(instance, {
          placement: event.detail.placement,
          ...(event.detail.placement.startsWith("wrap-") ? { width: null, height: null } : {}),
        }),
        onDescribe: (event: CustomEvent<{ alt: string }>) => updateSelectedImage(instance, { alt: event.detail.alt }),
        onDelete: () => {
          if (selectedImage(instance) && instance.isEditable) instance.chain().focus().deleteSelection().run();
        },
      });
    };
    const imageSurfaceRef = surfaceRef((surface) => { imagePopup = surface; }, (element, instance) => ({
      editor: instance,
      element,
      pluginKey: "looma-image-actions",
      updateDelay: 250,
      shouldShow: ({ editor: menuEditor }) => menuEditor.isEditable
        && menuEditor.state.selection instanceof NodeSelection && menuEditor.state.selection.node.type.name === "image",
      anchor: () => {
        const dom = instance.view.nodeDOM(instance.state.selection.from);
        return (dom instanceof Element ? dom.querySelector("img") ?? dom : instance.view.dom).getBoundingClientRect();
      },
      maxWidth: () => window.innerWidth - 24,
      related: editorRoot,
      onDismiss: () => imagePopup?.hide(),
    }));

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
        const frame = element.closest("[data-looma-image-node]");
        const position = frame?.parentNode
          ? instance.view.posAtDOM(frame.parentNode, Array.from(frame.parentNode.childNodes).indexOf(frame))
          : instance.view.posAtDOM(element, 0);
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
      if (!element || props.editable) return;
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

    const onLinkNavigationModifier = (event: KeyboardEvent | PointerEvent) => {
      const dom = editor.value?.view.dom;
      const active = isApplePlatform() ? event.metaKey : event.ctrlKey;
      if (dom && dom.hasAttribute("data-link-navigation") !== active) dom.toggleAttribute("data-link-navigation", active);
    };
    const clearLinkNavigationModifier = () => editor.value?.view.dom.removeAttribute("data-link-navigation");

    onMounted(() => {
      window.addEventListener("keydown", onLinkNavigationModifier);
      window.addEventListener("keyup", onLinkNavigationModifier);
      window.addEventListener("pointermove", onLinkNavigationModifier);
      window.addEventListener("blur", clearLinkNavigationModifier);
      updateMobileViewport();
      stopViewport = observeOverlayViewport(document, onViewportChange);
      document.addEventListener("pointerdown", onDocumentPointerDown, true);
      document.addEventListener("pointerdown", onFormattingPointerDown);
      document.addEventListener("pointermove", onFormattingPointerMove);
      document.addEventListener("pointerup", onFormattingPointerEnd);
      document.addEventListener("pointercancel", onFormattingPointerEnd);
      document.addEventListener("keydown", onFormattingKeyDown);
      document.addEventListener("pointerdown", onResizePointerDown, true);
      document.addEventListener("pointerup", onResizePointerUp, true);
      root.value?.addEventListener("error", onImageError, true);
    });
    onBeforeUnmount(() => {
      stopViewport?.();
      window.removeEventListener("keydown", onLinkNavigationModifier);
      window.removeEventListener("keyup", onLinkNavigationModifier);
      window.removeEventListener("pointermove", onLinkNavigationModifier);
      window.removeEventListener("blur", clearLinkNavigationModifier);
      formatting?.destroy();
      formattingPopup = null;
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      document.removeEventListener("pointerdown", onFormattingPointerDown);
      document.removeEventListener("pointermove", onFormattingPointerMove);
      document.removeEventListener("pointerup", onFormattingPointerEnd);
      document.removeEventListener("pointercancel", onFormattingPointerEnd);
      document.removeEventListener("keydown", onFormattingKeyDown);
      document.removeEventListener("pointerdown", onResizePointerDown, true);
      document.removeEventListener("pointerup", onResizePointerUp, true);
      root.value?.removeEventListener("error", onImageError, true);
      unbindEditorUi(editor.value);
      if (dragLeaveTimer) clearTimeout(dragLeaveTimer);
      if (tablePointerFrame !== null) cancelAnimationFrame(tablePointerFrame);
    });

    const onFileChange = async (event: Event) => {
      const input = event.target as HTMLInputElement;
      const files = Array.from(input.files ?? []);
      input.value = "";
      await uploads?.insert(files);
    };

    const onDrop = async (event: DragEvent) => {
      event.preventDefault();
      dragOver.value = false;
      if (!props.editable) return;
      const files = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith("image/"));
      await uploads?.insert(files);
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
      focusTableOverlayTarget(instance, table, detail);
      if (detail.action === "open-cell-menu") {
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
      const handle = event.pointerType !== "touch" && event.target instanceof HTMLElement
        ? event.target.closest<HTMLElement>(".column-resize-handle")
        : null;
      if (handle) {
        if (!handle.id) handle.id = `${toolbarScope}-resize-${++resizeHintSequence}`;
        resizeHintFor.value = handle.id;
      }
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
      const handle = event.target instanceof HTMLElement
        ? event.target.closest<HTMLElement>(".column-resize-handle")
        : null;
      if (handle && (!(event.relatedTarget instanceof Node) || !handle.contains(event.relatedTarget))) resizeHintFor.value = "";
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
      resizeHintFor.value = "";
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

    const renderRangeActions = (instance: Editor) => groupRangeActions(activeRangeActions(instance)).map(({ id, label, detail }) => h(Button, {
      key: id, "aria-label": label, type: "button", variant: "ghost", tone: "neutral", size: "sm",
      onPointerdown: (event: PointerEvent) => event.preventDefault(),
      onClick: () => {
        emit("rangeAction", detail);
        formattingPopup?.hide();
      },
    }, () => label));

    const renderSelectionActions = (instance: Editor) => {
      if (instance.state.selection.empty) return renderRangeActions(instance);
      if (!selectsPassage(instance.state)) return [];
      return props.selectionActions.map(action => h(Button, {
        key: action.id, "aria-label": action.label,
        type: "button", variant: "ghost", tone: "neutral", size: "sm",
        onPointerdown: (event: PointerEvent) => event.preventDefault(),
        onClick: () => {
          const detail = selectionActionDetail(instance.state, action.id);
          if (!detail) return;
          emit("selectionAction", detail);
          formattingPopup?.hide();
        },
      }, () => action.label));
    };

    const renderToolbar = (instance: Editor, floating = true, textOnly = false, full = false) => {
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
      const linkTriggerId = full ? `${linkAnchorId}-full` : textOnly ? `${linkAnchorId}-selection` : linkAnchorId;
      textButtons.push(
        h(IconButton, {
          id: linkTriggerId,
          class: "looma-editor__toolbar-button",
          label: "Link",
          size: "sm",
          variant: "ghost",
          "aria-expanded": linkState.value.surface === "popover" ? "true" : "false",
          "aria-pressed": instance.isActive("link") ? "true" : "false",
          "data-active": instance.isActive("link") ? "true" : "false",
          onPointerenter: () => showTool(linkTriggerId, "Link", false),
          onPointerleave: hideTool,
          onPointerdown: (event: PointerEvent) => {
            event.preventDefault();
            linkPopoverAnchorId.value = linkTriggerId;
            const selection = instance.state.selection;
            linkPressedSelection = selection.empty ? null : { from: selection.from, to: selection.to };
          },
          onFocusin: () => { linkPopoverAnchorId.value = linkTriggerId; showTool(linkTriggerId, "Link", true); },
          onFocusout: hideTool,
        }, () => loomaIcon("link"))
      );
      let buttons = textOnly ? textButtons : [
        ...textButtons,
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
        commandButton(uploadState.value.uploading ? "Uploading image" : "Insert image", "image", false, uploadState.value.uploading || !answers("image-upload"), () => fileInput.value?.click()),
        h("span", { class: "divider", "aria-hidden": "true" }),
        commandButton("Undo", "undo", false, !instance.can().undo(), () => instance.chain().focus().undo().run(), "Mod-z"),
        commandButton("Redo", "redo", false, !instance.can().redo(), () => instance.chain().focus().redo().run(), isApplePlatform() ? "Mod-Shift-z" : "Mod-y"),
      ];
      if (!props.editable) buttons = [];
      else if (props.compactToolbar && !mobile.value && !full) {
        buttons = [textButtons[0], textButtons[1], textButtons.at(-1)!, h(Button, {
          id: formatAnchorId, type: "button", variant: "ghost", tone: "neutral", size: "sm",
          "aria-label": "Format", "aria-expanded": formatOpen.value ? "true" : "false",
          onPointerdown: (event: PointerEvent) => event.preventDefault(),
        }, () => "Format")];
      }
      const actions = full ? [] : renderSelectionActions(instance);
      return h(EditorToolbar, { floating }, () => [
        ...(mobile.value ? [...actions, ...buttons] : [...buttons, ...actions]),
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
        // Top-layer Tooltip owns hint geometry; a pseudo-element inside the table
        // would contribute overflow even while its opacity is zero.
        resizeHintFor.value ? h(Tooltip, {
          for: resizeHintFor.value,
          open: true,
          trigger: "focus",
          placement: "top",
          inverse: true,
        }, () => "Drag to resize column") : null,
        instance && (props.editable || props.selectionActions.length || props.rangeActions.length) && !mobile.value
          && (props.toolbarMode === "bubble" || props.toolbarMode === "popover" || props.toolbarMode === "contextual")
          ? h("div", { key: "looma-formatting-host" }, [h("div", {
              ref: formattingSurfaceRef,
              class: "looma-editor__floating-shell looma-editor__formatting-shell",
              hidden: true,
            }, [props.toolbarMode === "contextual"
              ? h(Stack, { gap: "xs" }, () => [
                  renderToolbar(instance, true),
                  (linkState.value.surface === "context" || instance.state.selection.empty && instance.isActive("link")) && linkState.value.surface !== "popover" && formattingActive()
                    ? renderLinkContextCard(instance)
                    : null,
                ])
              : renderToolbar(instance, true, props.toolbarMode === "popover")])])
          : null,
        instance && props.editable
          ? h("div", { key: "looma-link-host" }, [h("div", {
              ref: linkSurfaceRef,
              class: "looma-editor__floating-shell looma-editor__link-shell",
              hidden: true,
            }, [props.toolbarMode === "contextual" && floatingFormattingMode() && formattingActive()
              ? null : renderLinkContextCard(instance)])])
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
        instance && props.editable
          ? h("div", { key: "looma-image-host" }, [h("div", {
              ref: imageSurfaceRef,
              class: "looma-editor__floating-shell looma-editor__image-shell",
              hidden: true,
            }, [renderImageToolbar(instance)])])
          : null,
        instance ? h(EditorSurface, { density: props.editable ? "comfortable" : props.contentDensity }, () => h("div", { ref: attachDocument })) : null,
        codeUi.open
          ? h("div", {
              key: "looma-code-language-shell",
              ref: codeLanguageRef,
              class: "looma-editor__code-language",
              style: codeUi.style,
              onFocusout: () => updateCodeUi(),
            }, [h(EditorCodeLanguage, {
              value: codeUi.language,
              languages: codeLanguageOptions.value,
              onLanguage: (event: CustomEvent<{ value: string }>) => chooseCodeLanguage(event.detail.value),
            })])
          : null,
        instance && (props.editable || props.selectionActions.length && !instance.state.selection.empty || activeRangeActions(instance).length > 0) && mobile.value && (editorFocused.value || linkState.value.surface === "popover" || !props.editable)
          ? h("div", {
              key: "looma-mobile-toolbar-shell",
              ref: mobileToolbarRef,
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
                      mobileDock.showFormatting();
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
        uploadState.value.uploading
          ? h(StatusMessage, { kind: "loading" }, {
              default: () => uploadProgressText(uploadState.value.progress),
              action: () => h(Button, { size: "sm", variant: "ghost", onClick: () => uploads?.cancel() }, () => "Cancel"),
            })
          : null,
        uploadState.value.failed
          ? h("div", {
              class: "looma-editor__upload-error",
              role: "alert",
            }, [
              h("span", "Couldn’t upload image."),
              h("button", {
                type: "button",
                disabled: uploadState.value.uploading,
                onClick: () => { void uploads?.retry(); },
              }, uploadState.value.uploading ? "Retrying…" : "Retry"),
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
          open: chipState.value.open,
          for: chipAnchorId,
          placement: "bottom-start",
          onClose: () => chipEditing?.close(),
        }, () => h(EditorChipEditor, {
          ref: setChipEditorRoot,
          label: chipState.value.label,
          color: chipState.value.color,
          onLabel: (event: CustomEvent<{ label: string }>) => chipEditing?.setLabel(event.detail.label),
          onColor: (event: CustomEvent<{ color: LoomaChipColor }>) => chipEditing?.setColor(event.detail.color),
          onDone: () => closeChip(true),
        })),
        h(Popover, {
          class: "looma-editor__link-popover",
          size: "sm",
          open: linkState.value.surface === "popover",
          for: linkPopoverAnchorId.value,
          placement: mobile.value ? "top-start" : "bottom-start",
          onOpen: () => openLinkEditor(),
          onClose: () => {
            if (linkState.value.surface === "popover") linkEditing?.close();
            linkPressedSelection = null;
            const current = editor.value?.state.selection;
            const range = linkState.value.range;
            if (current && !current.empty && range && current.from === range.from && current.to === range.to) {
              editor.value?.commands.setTextSelection(current.to);
            }
          },
        }, () => linkState.value.surface === "popover" ? renderLinkForm() : null),
        props.editable && props.compactToolbar && !mobile.value ? h(Popover, {
          class: "looma-editor__compact-formatting", for: formatAnchorId,
          open: formatOpen.value, placement: "bottom-start",
          onOpen: () => { formatOpen.value = true; },
          onClose: () => { formatOpen.value = false; },
        }, () => instance ? renderToolbar(instance, true, false, true) : null) : null,
        h(EditorBlockActions, {
          for: blockActionAnchorId,
          placement: mobile.value ? "top-start" : "bottom-start",
          onAction: (event: CustomEvent<{ action: string }>) => { if (props.editable && editor.value) runBlockAction(editor.value, event.detail.action); },
        }),
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
        slash.active
          ? h(EditorSlashMenu, {
              open: true,
              query: slash.query,
              selectedIndex: slash.selectedIndex,
              anchorRect: menuAnchorRect(slash.rect),
              onHighlight: (event: CustomEvent<{ index: number }>) => { slash.highlight?.(event.detail.index); },
              onSelect: (event: CustomEvent<{ index: number }>) => {
                slash.select?.(event.detail.index);
              },
            }, {
              default: () => slashMenuRows(slash.items),
              empty: () => h(Text, { role: "status", size: "sm", tone: "muted" }, () => "No commands found."),
            })
          : null,
        mention.active && (mention.loading || mention.items.length > 0)
          ? h(EditorMentionMenu, {
              id: mentionMenuId,
              open: true,
              query: mention.query,
              items: mention.items,
              selectedIndex: mention.selectedIndex,
              anchorRect: menuAnchorRect(mention.rect),
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
              key: "looma-table-toolbar-shell",
              ref: tableToolbarRef,
              class: "looma-editor__table-toolbar-shell",
              style: tableUi.toolbarStyle,
            }, [h(EditorTableToolbar, tableProps)])
          : null,
        instance && props.editable && !mobile.value
          ? h("div", {
              key: "looma-table-overlay-shell",
              ref: tableOverlayRef,
              class: "looma-editor__table-overlay-shell",
              style: tableUi.overlayStyle,
              hidden: !tableUi.overlayOpen,
              onMousedown: onTableOverlayMouseDown,
              onPointerleave: onTableOverlayPointerLeave,
            }, [tableUi.overlayOpen ? h(EditorTableOverlay, {
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
            }) : null])
          : null,
        tableUi.menuOpen
          ? h("div", {
              key: "looma-table-menu-shell",
              ref: tableMenuShell,
              class: "looma-editor__table-menu-shell",
            }, [h(EditorTableContextMenu, { ...tableProps, scope: tableUi.menuScope, style: tableUi.menuStyle })])
          : null,
      ]);
    };
  },
});
