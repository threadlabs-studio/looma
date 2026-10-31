import { createFileUploads, type LoomaFileDescriptor, type LoomaFileUploadsState } from "./file-uploads";
import { Extension, posToDOMRect, type AnyExtension, type Editor, type JSONContent } from "@tiptap/core";
import { createViewportSurface, observeOverlayViewport } from "../components/shared/overlay.js";
import { NodeSelection } from "@tiptap/pm/state";
import {
  createLoomaSlashCommandExtension,
  createLoomaMentionExtension,
  getActiveTableUiState,
  getDefaultEditorExtensions,
  getDefaultSlashCommands,
  handleTableAction,
  handleTableOverlayAction,
  normalizeActiveTableColumnWidths,
  type LoomaSlashMenuSnapshot,
  type LoomaSlashCommand,
  type LoomaMentionItem,
  type LoomaMentionMenuSnapshot,
  type LoomaCodeLanguages,
  type TableCellAlignment,
  type TableCellBackground,
} from "./extensions/index";
import { measureTableOverlayGeometry, type TableOverlayGeometry, type TableContextMenuAction } from "./ui";
import { getVisualViewportRect } from "./viewport";
import { type LoomaIconName } from "./icons";
import {
  createLoomaImageDeliveryController,
  imageDescriptorFromAttrs,
  type LoomaImageAttributeResolver,
  type LoomaImageDescriptor,
  type LoomaImageSourceResolver,
} from "./image-delivery";
import { createCodeHighlighting } from "./code-highlighting";
import { runBlockAction } from "./block-actions";
import { createImageUploads, type LoomaImageUploadDetail, type LoomaImageUploads, type LoomaImageUploadsState } from "./image-uploads";
import { RequestEvent, type RequestOptions } from "@nextwebwg/html-next/runtime";
import { onResponderAnnounced, type LoomaResponder } from "./requests";
import { createFormattingSelection, type LoomaFormattingSelection } from "./formatting-selection";
import { focusTableOverlayTarget } from "./extensions/table-commands";
import { validLinkHref } from "./content";
import { createChipEditing, LOOMA_CHIP_EDITING_IDLE, type LoomaChipEditing } from "./chip-editing";
import { LOOMA_FOOTNOTE_INSERTED } from "./extensions/footnote";
import { createFootnoteEditing, footnoteContentExtensions as createFootnoteContentExtensions, LOOMA_FOOTNOTE_EDITING_IDLE, type LoomaFootnoteEditing } from "./footnote-editing";
import {
  groupRangeActions,
  rangeActionsAtCaret,
  selectionActionDetail,
  selectsPassage,
  type LoomaEditorRangeAction,
  type LoomaEditorSelectionAction,
} from "./host-actions";
import { LOOMA_TABLE_CONTROLS_CLOSED, tableControls, tableOverlayPlacement } from "./table-ui";
import { createMobileDock, mobileDockPlacement, usesMobileDock } from "./mobile-dock";
import { createLinkEditing, isLinkActive, selectedLinkReference, linkFormStatus, LOOMA_LINK_EDITING_IDLE, type LoomaLinkEditing, type LoomaLinkTarget } from "./link-editing";
import { setReferenceDisplay, type LoomaReferenceMap } from "./reference-display";
import { menuAnchorRect, selectedTableCellElement, selectedTableElement } from "./selection-geometry";
import { createSelectionSurface, type SelectionSurface, type SelectionSurfaceOptions } from "./selection-surface";
import { createEditorSession, selectionSnapshot, type LoomaEditorSession, type LoomaSelectionSnapshot } from "./session";
import { isApplePlatform } from "./shortcuts";
import { codeBlockAtSelection, codeLanguageChoices, codeLanguagePickerPlacement, setCodeBlockLanguage } from "./code-language-picker";
import { tableOfContentsNodeView } from "./node-views/table-of-contents";
import { expandNodeView } from "./node-views/expand";
import { dividerNodeView } from "./node-views/divider";
import { calloutNodeView } from "./node-views/callout";
import { normalizeImagePlacement } from "./extensions/image";
import { imageNodeView } from "./node-views/image";

export type { LoomaImageUploadDetail } from "./image-uploads";
export type { LoomaRequestInit, LoomaResponder } from "./requests";

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
} from "./host-actions";


export type { LoomaLinkTarget } from "./link-editing";

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
 * when the consumer refreshes services or upload availability changes.
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
 * @failure A rejection leaves the document unchanged and emits `upload-error`.
 */
export type LoomaImageUploader = LoomaResponder<LoomaImageUploadDetail, LoomaImageDescriptor>;

/** Uploads a file and returns its retained link; rejection leaves authored content unchanged. */
export type LoomaFileUploader = LoomaResponder<{ file: File }, LoomaFileDescriptor>;

const EDITOR_REQUEST_NAMES = ["extensions", "slash-commands", "mention-query", "link-search", "link-resolve", "image-upload", "file-upload"] as const;
type EditorRequest = typeof EDITOR_REQUEST_NAMES[number];

const uploadProgressText = (progress: LoomaImageUploadsState["progress"], label = "Uploading image…") =>
  progress && progress.total > 0 ? `${label} ${Math.round(Math.min(1, progress.loaded / progress.total) * 100)}%` : label;
let editorInstanceSequence = 0;


/** Data inputs and creation-time service policy for a document session. Component adapters resolve services through requests. */
export interface DocumentEditorProps {
  content: JSONContent;
  references?: LoomaReferenceMap;
  editable: boolean;
  contentDensity: "comfortable" | "compact";
  placeholder: string;
  label: string;
  codeLanguages: LoomaCodeLanguages | null;
  mentionItems: LoomaMentionItem[];
  mentionLimit: number;
  linkBaseUrl: string;
  linkTargetLabel: string;
  toolbarMode: LoomaEditorToolbarMode;
  compactToolbar: boolean;
  selectionActions: LoomaEditorSelectionAction[];
  rangeActions: LoomaEditorRangeAction[];
  toolbarTriggerId: string;
  toolbarOpen: boolean;
  disableHighlight: boolean;
  resolveImageAttributes?: LoomaImageAttributeResolver;
  resolveImageSource?: LoomaImageSourceResolver;
}

type EditorCommandEvent = Event & { readonly command: string };
declare const CommandEvent: { new(type: string, options: { command: string }): EditorCommandEvent };

type CSSProperties = Record<string, string | number | undefined>;
interface DocumentViewState {
  root: HTMLElement | null;
  formatOpen: boolean;
  fileInput: HTMLInputElement | null;
  attachmentInput: HTMLInputElement | null;
  fileUploadState: LoomaFileUploadsState;
  linkPopoverAnchorId: string;
  linkFormRoot: HTMLElement | null;
  linkState: LoomaLinkEditing["state"];
  chipEditorRoot: HTMLElement | null;
  chipState: LoomaChipEditing["state"];
  footnoteState: LoomaFootnoteEditing["state"];
  footnoteSurface: "actions" | "editor" | null;
  resizeHintFor: string;
  tableToolbarShell: HTMLElement | null;
  tableOverlayShell: HTMLElement | null;
  tableMenuShell: HTMLElement | null;
  mobileToolbarShell: HTMLElement | null;
  codeLanguageShell: HTMLElement | null;
  dragOver: boolean;
  uploadState: LoomaImageUploadsState;
  tablePickerOpen: boolean;
  mobileToolbarStyle: CSSProperties;
  mobile: boolean;
  editorFocused: boolean;
  editorStateVersion: number;
  mobileToolbarMode: "formatting" | "table";
  responderVersion: number;
  editor?: Editor;
}

interface Tool { id: string; kind: "icon" | "text" | "separator"; label: string; icon: string; active: boolean; disabled: boolean; expanded: boolean; shortcut: string; }

/** Keep unchanged chrome data stable so typing does not update every composed control. */
function retainView(previous: unknown, next: unknown): unknown {
  if (Object.is(previous, next)) return previous;
  if (!previous || !next || typeof previous !== "object" || typeof next !== "object") return next;
  const array = Array.isArray(next);
  if (array !== Array.isArray(previous) || !array && (Object.getPrototypeOf(next) !== Object.prototype || Object.getPrototypeOf(previous) !== Object.prototype)) return next;
  const before = previous as Record<string, unknown>, after = next as Record<string, unknown>;
  const keys = Object.keys(after);
  let same = keys.length === Object.keys(before).length;
  const retained: Record<string, unknown> = {};
  for (const key of keys) {
    const value = retainView(before[key], after[key]);
    retained[key] = value;
    if (!Object.hasOwn(before, key) || value !== before[key]) same = false;
  }
  return same ? previous : array ? keys.map(key => retained[key]) : retained;
}

/**
 * The host’s rendering and service boundary for a document session.
 * @contract `changed` projects a coalesced chrome snapshot; the host keeps the editor’s mount unbound.
 * @failure Requests may reject or abort. The matching service handles its fallback without replacing authored content.
 */
export interface DocumentEditorPort {
  readonly root: HTMLElement;
  readonly identity: string;
  hasResponder(name: string): boolean;
  request<Answer>(name: string, detail: unknown, options?: RequestOptions): Promise<Answer | null>;
  dispatch(name: string, detail: unknown): void;
  changed(snapshot: Record<string, unknown>): void;
}

/**
 * Owns one document editor, its authoring state and event listeners; renders no DOM.
 * @ownership The session owns Tiptap and its listeners; the host owns the declared mount and chrome.
 * @lifecycle Call `rendered` when refs are available, `connect` after initial services resolve, and `destroy` when the host is released. Moving to another mount preserves the document and history.
 * @contract Controlled echoes leave the existing document untouched. Late extensions rebuild from host content before editing, and from the current document afterward.
 */
export function createDocumentEditorSession(props: DocumentEditorProps, options: DocumentEditorPort) {
  const port = options;
  const identity = options.identity;
  const connected: Array<() => void> = [];
  const disposed: Array<() => void> = [];
  const rendered: Array<() => void> = [];
  const observers: Array<() => void> = [];
  let active = false, scheduled = false, dead = false;
  let propsVersion = 0;
  let tableToolbarHome: { element: HTMLElement; parent: Node; next: Node | null } | undefined;
  const restoreTableToolbar = () => {
    if (!tableToolbarHome) return;
    const { element, parent, next } = tableToolbarHome;
    if (element.parentNode !== parent) parent.insertBefore(element, next?.parentNode === parent ? next : null);
    tableToolbarHome = undefined;
  };
  const notify = () => {
    if (!active || scheduled || dead) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (dead) return;
      for (const observe of observers) observe();
      // Restore the authored branch before its renderer disposes it. While open, the table's
      // native node-view host owns placement in the document's scroll chain.
      if (!tableUi.toolbarOpen) restoreTableToolbar();
      options.changed(snapshot());
    });
  };
  const observeRecord = <T extends object>(value: T): T => new Proxy(value, {
    set(target, name, next) {
      if (Object.is(Reflect.get(target, name), next)) return true;
      Reflect.set(target, name, next);
      notify();
      return true;
    },
  });
  const uiState = observeRecord({} as DocumentViewState);
  function observe<T>(source: () => T, callback: (value: T, previous?: T) => void, settings?: { deep?: boolean; immediate?: boolean }): void;
  function observe<T extends unknown[]>(source: { [K in keyof T]: () => T[K] }, callback: (value: T, previous?: T) => void, settings?: { deep?: boolean; immediate?: boolean }): void;
  function observe(source: (() => any) | Array<() => any>, callback: (value: any, previous?: any) => void, settings: { deep?: boolean; immediate?: boolean } = {}) {
    const read = () => Array.isArray(source) ? source.map(get => get()) : source();
    let previous = read();
    let serialized = settings.deep ? JSON.stringify(previous) : undefined;
    let observedPropsVersion = propsVersion;
    const check = () => {
      // Deep inputs can change only when the host supplies props, not on every editor transaction.
      if (settings.deep) {
        if (observedPropsVersion === propsVersion) return;
        observedPropsVersion = propsVersion;
      }
      const next = read();
      const encoded = settings.deep ? JSON.stringify(next) : undefined;
      const equal = settings.deep ? serialized === encoded : Array.isArray(next) && Array.isArray(previous)
        ? next.length === previous.length && next.every((value, index) => Object.is(value, previous[index])) : Object.is(next, previous);
      if (equal) return;
      const before = previous;
      previous = next; serialized = encoded;
      callback(next, before);
    };
    observers.push(check);
    if (settings.immediate) callback(previous);
  }
  const nextTick = <T>(callback?: () => T) => Promise.resolve().then(() => Promise.resolve()).then(() => callback?.());
  const onConnect = (callback: () => void) => connected.push(callback);
  const onDispose = (callback: () => void) => disposed.push(callback);
  const afterRender = (callback: () => void) => rendered.push(callback);
  const emit = (name: string, detail: unknown) => options.dispatch(name, detail);
    uiState.root = null;
    const formatAnchorId = `looma-editor-format-${identity}`;
    uiState.formatOpen = false;

    uiState.fileInput = null;
    uiState.attachmentInput = null;
    uiState.fileUploadState = { uploading: false, progress: null, failed: null };
    let attachmentUploads: ReturnType<typeof createFileUploads> | undefined;
    const tablePickerAnchorId = `looma-editor-table-picker-${identity}`;
    const blockActionAnchorId = `ui-block-tools-${identity}`;
    const linkAnchorId = `looma-editor-link-${identity}`;
    uiState.linkPopoverAnchorId = linkAnchorId;
    uiState.linkFormRoot = null;
    const setLinkFormRoot = (instance: unknown) => {
      const element = instance;
      uiState.linkFormRoot = element instanceof HTMLElement ? element : null;
    };
    let linkEditing: LoomaLinkEditing | undefined;
    uiState.linkState = LOOMA_LINK_EDITING_IDLE;
    const chipAnchorId = `looma-editor-chip-${identity}`;
    uiState.chipEditorRoot = null;
    const setChipEditorRoot = (instance: unknown) => {
      const element = instance;
      uiState.chipEditorRoot = element instanceof HTMLElement ? element : null;
    };
    let chipEditing: LoomaChipEditing | undefined;
    uiState.chipState = LOOMA_CHIP_EDITING_IDLE;
    const footnoteAnchorId = `looma-editor-footnote-${identity}`;
    let footnoteEditing: LoomaFootnoteEditing | undefined;
    uiState.footnoteState = LOOMA_FOOTNOTE_EDITING_IDLE;
    uiState.footnoteSurface = null;
    let footnoteContentExtensions: AnyExtension[] = [];
    let footnoteField: Editor | undefined;
    const focusFootnoteField = () => {
      if (uiState.footnoteSurface === "editor" && footnoteField && !footnoteField.isDestroyed
        && footnoteField.view.dom.closest("[popover]")?.matches(":popover-open")) footnoteField.commands.focus("end");
    };
    const toolbarScope = `looma-editor-tool-${identity}`;
    uiState.resizeHintFor = "";
    let resizeHintSequence = 0;
    uiState.tableToolbarShell = null;
    uiState.tableOverlayShell = null;
    uiState.tableMenuShell = null;
    uiState.mobileToolbarShell = null;
    uiState.codeLanguageShell = null;
    uiState.dragOver = false;
    let uploads: LoomaImageUploads | undefined;
    uiState.uploadState = { uploading: false, progress: null, failed: null };
    uiState.tablePickerOpen = false;
    uiState.mobileToolbarStyle = {};
    uiState.mobile = typeof window !== "undefined" && usesMobileDock(window.innerWidth);
    uiState.editorFocused = false;
    // Which selection the floating tools belong to; chrome only, never the document or undo history.
    let formatting: LoomaFormattingSelection | undefined;
    let formattingPopup: SelectionSurface | null = null;
    let linkPopup: SelectionSurface | null = null;
    let imagePopup: SelectionSurface | null = null;
    const floatingFormattingMode = () => props.toolbarMode !== "sticky"
      && !(props.toolbarMode === "popover" && props.toolbarOpen) && !uiState.mobile;
    const formattingPickerOpen = () => uiState.linkState.surface === "popover" || uiState.tablePickerOpen || uiState.formatOpen;
    const activeRangeActions = (instance: Editor) => rangeActionsAtCaret(instance.state, props.rangeActions);
    const formattingActive = () => formatting?.active() ?? false;

    uiState.editorStateVersion = 0;
    uiState.mobileToolbarMode = "formatting";
    const mobileDock = createMobileDock((mode) => { uiState.mobileToolbarMode = mode; });
    let dragLeaveTimer: ReturnType<typeof setTimeout> | null = null;
    let tableResizeActive = false;
    let tableInteractionActive = false;
    let hoveredTableCell: HTMLTableCellElement | null = null;
    let overlayTableElement: HTMLTableElement | null = null;
    let tablePointerFrame: number | null = null;

    const slash = observeRecord<LoomaSlashMenuSnapshot>({
      active: false,
      items: [],
      selectedIndex: 0,
      query: "",
      rect: null,
      select: null,
    });

    const mention = observeRecord<LoomaMentionMenuSnapshot>({
      active: false,
      items: [],
      selectedIndex: 0,
      query: "",
      rect: null,
      loading: false,
      highlight: null,
      select: null,
    });

    const tableUi = observeRecord({
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
      toolbarTarget: null as HTMLElement | null,
      overlayStyle: {} as CSSProperties,
      menuStyle: {} as CSSProperties,
      capabilities: LOOMA_TABLE_CONTROLS_CLOSED.capabilities,
    });

    // The popover anchors to the edited chip, which carries the anchor ID while it is edited.
    const openChipEditor = (_instance: Editor, position: number) => {
      if (!chipEditing?.open(position)) return;
      uiState.root?.querySelector(`#${chipAnchorId}`)?.removeAttribute("id");
      chipEditing.element!.id = chipAnchorId;
      void nextTick(() => focusPart(uiState.chipEditorRoot));
    };
    const openFootnoteSurface = (position: number, surface: "actions" | "editor") => {
      if (!footnoteEditing?.open(position)) return;
      uiState.root?.querySelector(`#${footnoteAnchorId}`)?.removeAttribute("id");
      footnoteEditing.element!.id = footnoteAnchorId;
      uiState.footnoteSurface = surface;
      if (surface === "editor") footnoteEditing.element!.scrollIntoView({ block: "nearest" });
    };
    const openFootnoteEditor = (position: number) => openFootnoteSurface(position, "editor");
    const closeFootnote = (focusReference = false) => {
      const element = footnoteEditing?.element;
      uiState.footnoteSurface = null;
      footnoteEditing?.close();
      if (focusReference) element?.focus();
    };
    const closeChip = (focusChip = false) => {
      const element = chipEditing?.element;
      chipEditing?.close();
      if (focusChip) element?.focus();
    };
    // Known HTML Next responders advertise availability; plain listeners can still answer a request.
    uiState.responderVersion = 0;
    const answers = (name: EditorRequest) => options.hasResponder(name);
    const connection = new AbortController();
    const ask = <Answer>(name: EditorRequest, detail: unknown, options: RequestOptions = {}): Promise<Answer | null> => {
      if (!uiState.root || connection.signal.aborted) return Promise.resolve(null);
      const signal = options.signal ? AbortSignal.any([options.signal, connection.signal]) : connection.signal;
      return port.request<Answer>(name, detail, { ...options, signal });
    };
    // A newer ask aborts the same request still pending, as the author's next keystroke replaces a query.
    const latest = new Map<EditorRequest, AbortController>();
    const askLatest = <Answer>(name: EditorRequest, detail: unknown) => {
      latest.get(name)?.abort();
      const controller = new AbortController();
      latest.set(name, controller);
      return ask<Answer>(name, detail, { signal: controller.signal });
    };
    // Applies the answer when it arrives. A failed ask is reported and applies null; a replaced one applies nothing.
    const askThen = <Answer>(name: EditorRequest, detail: unknown, apply: (answer: Answer | null) => void) => {
      const answer = askLatest<Answer>(name, detail);
      const controller = latest.get(name);
      const current = () => controller === latest.get(name) && !connection.signal.aborted;
      answer.then((value) => { if (current()) apply(value); }, (error: unknown) => {
        if (!current()) return;
        reportError(error);
        apply(null);
      });
    };
    // The same defaults while image uploads stay available or unavailable, so an answer built from them compares equal.
    let slashDefaults: { uploads: boolean; files: boolean; commands: LoomaSlashCommand[] } | undefined;
    const defaultSlashCommands = () => {
      const uploads = answers("image-upload");
      const files = answers("file-upload");
      if (slashDefaults?.uploads !== uploads || slashDefaults?.files !== files) {
        slashDefaults = { uploads, files, commands: getDefaultSlashCommands(uploads ? () => uiState.fileInput?.click() : undefined, openChipEditor, () => openLinkEditor(), files ? () => uiState.attachmentInput?.click() : undefined) };
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
        uiState.editor?.commands.dismissLoomaSlashMenu();
      });
    };
    let consumerExtensions: AnyExtension[] = [];
    const askExtensions = () => askThen<AnyExtension[]>("extensions", null, (extensions) => {
      const changed = Boolean(extensions?.length || consumerExtensions.length);
      consumerExtensions = extensions ?? [];
      if (!session) build(props.content);
      else if (changed) rebuild();
    });
    // A newly available responder is asked once; upload availability changes the default commands.
    let responders = new Set<EditorRequest>();
    const checkResponders = () => {
      if (!active || dead) return;
      const current = new Set(EDITOR_REQUEST_NAMES.filter(answers));
      const arrived = (name: EditorRequest) => current.has(name) && !responders.has(name);
      const extensionsArrived = arrived("extensions");
      const slashChanged = arrived("slash-commands") || current.has("image-upload") !== responders.has("image-upload") || current.has("file-upload") !== responders.has("file-upload");
      responders = current;
      if (extensionsArrived) askExtensions();
      if (slashChanged) askSlashCommands();
    };
    afterRender(checkResponders);
    let stopAnnouncements: (() => void) | undefined;
    const slashExtension = createLoomaSlashCommandExtension({
      commands: defaultSlashCommands(),
      onOpenImagePicker: () => uiState.fileInput?.click(),
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
    const codeUi = observeRecord({ open: false, pos: 0, language: "auto", text: "", grammarVersion: 0, placement: {} as CSSProperties });
    let codeHighlighting: ReturnType<typeof createCodeHighlighting> | undefined;
    let codeLanguageNames: readonly string[] = [];
    const loadForCodeBlock = (editor: Editor, language: unknown, text: string) => codeHighlighting?.loadForCodeBlock(editor, language, text);
    uiState.editor = undefined;
    let session: LoomaEditorSession<Editor> | undefined;
    let edited = false;
    const build = (content: JSONContent) => {
      const highlighting = codeHighlighting ??= createCodeHighlighting(props.codeLanguages, () => { codeUi.grammarVersion += 1; });
      codeLanguageNames = highlighting.languageNames;
      edited = false;
      const consumerMention = consumerExtensions.some((extension) => extension.name === "mention");
      session = createEditorSession({
        extensions: [
          ...getDefaultEditorExtensions({
            references: props.references,
            placeholder: props.placeholder,
            linkBaseUrl: props.linkBaseUrl,
            mention: consumerMention ? false : mentionExtension,
            disableHighlight: props.disableHighlight,
            codeLanguages: props.codeLanguages ?? undefined,
            codeLowlight: highlighting.lowlight,
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
          attributes: { role: "textbox", "aria-multiline": "true", "aria-label": props.label, "aria-readonly": String(!props.editable) },
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
                uiState.editorStateVersion += 1;
                const instance = uiState.editor;
                if (instance?.isFocused && (instance.state.selection.empty || selectedLinkReference(instance)) && isLinkActive(instance) && uiState.linkState.surface !== "popover") {
                  linkPopup?.setAnchor(() => link.getBoundingClientRect());
                  linkPopup?.show();
                }
              });
              return false;
            },
          },
        },
        onCreate: ({ editor: instance }) => {
          instance.state.doc.descendants((node) => {
            if (node.type.name === "codeBlock") loadForCodeBlock(instance, node.attrs.language, node.textContent);
          });
        },
        onFocus: ({ editor: instance }) => rememberSelection(instance),
        onSelectionUpdate: ({ editor: instance }) => {
          rememberSelection(instance);
          if (floatingFormattingMode()) {
            formatting?.selectionChanged();
            if (!formattingActive()) formattingPopup?.hide();
          }
        },
        onUpdate: ({ editor: instance }) => {
          edited = true;
          const value = instance.getJSON();
          emit("change", { content: value });
        },
      });
      // Later setOptions calls must keep the installed node views, not the
      // constructor-only placeholder that prevented the initial source request.
      delete session.editor.options.editorProps.nodeViews;
      session.subscribe(() => { uiState.editorStateVersion += 1; });
      uiState.editor = session.editor;
      const engine = createLinkEditing({
        editor: session.editor,
        search: () => answers("link-search") ? async (query) => (await askLatest<LoomaLinkTarget[]>("link-search", { query })) ?? [] : null,
        resolve: () => async (href) => await askLatest<LoomaLinkTarget>("link-resolve", { href }),
        baseUrl: () => props.linkBaseUrl,
        references: () => props.references !== undefined,
      });
      engine.subscribe(() => { uiState.linkState = engine.state; });
      linkEditing = engine;
      const chips = createChipEditing({ editor: session.editor, isEditable: () => props.editable });
      chips.subscribe(() => { uiState.chipState = chips.state; });
      chipEditing = chips;
      const footnotes = createFootnoteEditing({ editor: session.editor, isEditable: () => props.editable });
      footnotes.subscribe(() => { uiState.footnoteState = footnotes.state; });
      footnoteEditing = footnotes;
      footnoteContentExtensions = createFootnoteContentExtensions(session.editor);
      const footnoteOwner = session.editor;
      const insertedFootnote = ({ transaction }: { transaction: import("@tiptap/pm/state").Transaction }) => {
        const inserted = transaction.getMeta(LOOMA_FOOTNOTE_INSERTED) as { label: string; occurrence: number } | undefined;
        if (!inserted) return;
        void nextTick(() => {
          if (!uiState.editor || uiState.editor.isDestroyed) return;
          let position: number | undefined, occurrence = 0;
          uiState.editor.state.doc.descendants((node, offset) => {
            if (position !== undefined) return false;
            if (node.type.name === "loomaFootnoteReference" && node.attrs.label === inserted.label && ++occurrence === inserted.occurrence) position = offset;
          });
          if (position !== undefined) openFootnoteEditor(position);
        });
      };
      footnoteOwner.on("transaction", insertedFootnote);
      footnoteOwner.on("destroy", () => footnoteOwner.off("transaction", insertedFootnote));
      const imageUploads = createImageUploads({
        editor: session.editor,
        // Paste and drop ask even without a known responder, so a plain listener still uploads them.
        upload: () => (file, init) => ask<LoomaImageDescriptor>("image-upload", { file }, init),
        onError: (error, file) => emit("upload-error", { error, file }),
      });
      imageUploads.subscribe(() => { uiState.uploadState = imageUploads.state; });
      uploads = imageUploads;
      attachmentUploads = createFileUploads({ editor: session.editor, upload: () => (file, init) => ask<LoomaFileDescriptor>("file-upload", { file }, init), onError: (error, file) => emit("upload-error", { error, file }), onState: value => { uiState.fileUploadState = value; } });
      const instance = session.editor;
      formatting = createFormattingSelection({
        editor: instance,
        canHold: () => floatingFormattingMode() && !tableResizeActive && props.editable,
        menuOpen: () => slash.active || mention.active,
        shownAtCaret: () => activeRangeActions(instance).length > 0,
        onHold: (selection) => {
          notify();
          void nextTick(() => {
            formattingPopup?.setAnchor(() => posToDOMRect(instance.view, selection.from, selection.to));
            formattingPopup?.show();
          });
        },
      });
    };
    // A late extensions answer rebuilds the editor. An unedited document is parsed again from the
    // host's content, so nodes the new extensions define are kept.
    const rebuild = () => {
      const previous = session!;
      const content = edited ? previous.editor.getJSON() : props.content;
      linkEditing?.destroy();
      chipEditing?.close();
      footnoteEditing?.close();
      formatting?.destroy();
      uploads?.cancel();
      attachmentUploads?.cancel();
      previous.destroy();
      build(content);
      renderedRefs(sourceRefs);
    };
    onConnect(() => {
      const element = uiState.root!;
      stopAnnouncements = onResponderAnnounced(element, (name) => {
        if (!EDITOR_REQUEST_NAMES.some(request => request === name)) return;
        uiState.responderVersion += 1;
        checkResponders();
      });
      // The first render had no root to find known responders from.
      uiState.responderVersion += 1;
      responders = new Set(EDITOR_REQUEST_NAMES.filter(answers));
      askExtensions();
      askSlashCommands();
    });
    // The declaration's document mount; the session moves the editor's view into it.
    const attachDocument = (element: unknown) => {
      if (element instanceof HTMLElement) session?.attach(element);
    };
    onDispose(() => {
      attachmentUploads?.cancel();
      connection.abort();
      stopAnnouncements?.();
      linkEditing?.destroy();
      session?.destroy();
    });

    const openLinkEditor = (context = false) => {
      const instance = uiState.editor;
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
        focusPart(elementRef("linkForm") ?? uiState.linkFormRoot);
      });
    };
    const dismissLink = (restoreFocus = true) => {
      linkEditing?.close();
      const range = uiState.linkState.range;
      if (restoreFocus && range) uiState.editor?.chain().focus().setTextSelection(range.to).run();
      // The held gesture that opened the editor has ended; a later click at this caret shows the link card.
      formatting?.dismiss(uiState.editor?.state.selection ?? null);
      linkPopup?.hide();
      formattingPopup?.hide();
    };
    observe(() => props.editable, (editable) => {
      formatting?.press.cancel();
      formatting?.release();
      uiState.editor?.setEditable(editable, false);
      uiState.editor?.setOptions({ editorProps: { attributes: { role: "textbox", "aria-multiline": "true", "aria-label": props.label, "aria-readonly": String(!editable) } } });
      if (!editable) formattingPopup?.hide();
      if (uiState.editor) imageDelivery.reset(uiState.editor);
      uiState.root?.querySelectorAll<HTMLElement>("[data-looma-chip], [data-looma-footnote-ref]").forEach((chip) => {
        chip.setAttribute("aria-disabled", String(!editable));
      });
      if (!editable) chipEditing?.close();
      if (!editable) footnoteEditing?.close();
    });
    observe([() => uiState.linkState.surface === "popover", () => uiState.tablePickerOpen, () => uiState.formatOpen], ([linking, table, format]) => {
      if (linking || table || format || !floatingFormattingMode() || uiState.editor?.isFocused
        || formattingPopup?.element.contains(document.activeElement)) return;
      formatting?.release();
      formattingPopup?.hide();
    });
    observe(() => props.rangeActions, () => {
      const instance = uiState.editor;
      if (instance) instance.view.dispatch(instance.state.tr.setMeta("loomaRangeActionsChanged", true));
    });

    observe(() => props.label, (label) => {
      uiState.editor?.setOptions({
        editorProps: { attributes: { role: "textbox", "aria-multiline": "true", "aria-label": label, "aria-readonly": String(!props.editable) } },
      });
    });
    observe([() => props.resolveImageAttributes, () => props.resolveImageSource], () => {
      const instance = uiState.editor;
      if (instance) imageDelivery.reset(instance);
    });
    observe(() => props.content, (value) => {
      const instance = uiState.editor;
      if (!instance || !session) return;
      const wasFocused = instance.isFocused;
      if (session.setContent(value, lastFocusedSelection) && wasFocused) rememberSelection(instance);
    }, { deep: true });
    observe(() => props.references, (value) => { if (uiState.editor) setReferenceDisplay(uiState.editor, value ?? {}); }, { deep: true });

    const closeTableUi = () => {
      Object.assign(tableUi, LOOMA_TABLE_CONTROLS_CLOSED);
      tableUi.menuOpen = false;
      tableUi.menuScope = "cell";
      tableUi.geometry = null;
      overlayTableElement = null;
      mobileDock.tableInactive();
    };

    const updateMobileViewport = () => {
      uiState.mobile = usesMobileDock(window.innerWidth);
      if (!uiState.mobile) {
        uiState.mobileToolbarStyle = {};
        return;
      }

      nextTick(() => {
        const placement = mobileDockPlacement(getVisualViewportRect(window), uiState.mobileToolbarShell?.getBoundingClientRect().height || 56);
        uiState.mobileToolbarStyle = { left: `${placement.left}px`, top: `${placement.top}px`, width: `${placement.width}px` };
      });
    };

    // Like the table toolbar, the language picker floats above the code block holding the cursor.
    let codeBlurTimer: ReturnType<typeof setTimeout> | undefined;
    const updateCodeUi = (focusSettled = false) => {
      const instance = uiState.editor?.isDestroyed ? undefined : uiState.editor;
      const block = instance ? codeBlockAtSelection(instance) : null;
      if (!instance || !props.editable || !codeLanguageNames.length || !block) {
        codeUi.open = false;
        return;
      }
      loadForCodeBlock(instance, block.language === "auto" ? null : block.language, block.text);
      if (!instance.isFocused && !uiState.codeLanguageShell?.contains(document.activeElement)) {
        // The editor blurs before focus lands; the picker stays if that focus lands in it.
        clearTimeout(codeBlurTimer);
        if (codeUi.open && !focusSettled) codeBlurTimer = setTimeout(() => updateCodeUi(true), 0);
        else codeUi.open = false;
        return;
      }
      codeUi.open = true;
      codeUi.pos = block.pos;
      codeUi.language = block.language;
      codeUi.text = block.text;
      codeUi.placement = codeLanguagePickerPlacement(block.element.getBoundingClientRect());
    };
    const codeLanguageOptions = () => {
      // The lowlight registry is mutable rather than reactive; this version tracks async imports.
      void codeUi.grammarVersion;
      const detected = codeUi.open && codeUi.text.trim() ? codeHighlighting?.lowlight.highlightAuto(codeUi.text).data?.language : null;
      return codeLanguageChoices(codeUi.language, typeof detected === "string" ? detected : null, codeLanguageNames);
    };
    const chooseCodeLanguage = (value: string) => {
      if (uiState.editor) setCodeBlockLanguage(uiState.editor, codeUi.pos, value, codeLanguageNames);
    };
    const onCodeTransaction = () => updateCodeUi();
    observe(() => props.editable, () => nextTick(onCodeTransaction));
    onDispose(() => clearTimeout(codeBlurTimer));

    const updateTableUi = () => {
      const instance = uiState.editor;
      if (hoveredTableCell && (!instance || instance.isDestroyed || !instance.view.dom.contains(hoveredTableCell))) hoveredTableCell = null;
      const focusInTableUi = [uiState.tableToolbarShell, uiState.tableOverlayShell, uiState.tableMenuShell, uiState.mobileToolbarShell]
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
      Object.assign(tableUi, tableControls(state, selectedTableIsActive, uiState.mobile));
      const selectedCell = selectedTableIsActive ? selectedTableCellElement(instance) : null;
      const geometry = measureTableOverlayGeometry(
        table,
        selectedCell,
        hoveredTableCell && table.contains(hoveredTableCell) ? hoveredTableCell : null,
      );
      tableUi.rows = Math.max(0, geometry.rowBoundaries.length - 1);
      tableUi.cols = Math.max(0, geometry.columnBoundaries.length - 1);
      tableUi.geometry = geometry;
      tableUi.toolbarTarget = table.closest("[data-looma-table-block]")?.querySelector<HTMLElement>("[data-looma-table-toolbar-host]") ?? null;
      tableUi.overlayStyle = tableOverlayPlacement(rect, uiState.root!.getBoundingClientRect());
    };

    const onEditorFocus = () => {
      uiState.editorFocused = true;
      updateTableUi();
      updateCodeUi();
      updateMobileViewport();
    };

    const onEditorBlur = () => {
      formatting?.press.cancel();
      queueMicrotask(updateTableUi);
      updateCodeUi();
      setTimeout(() => {
        if (!tableInteractionActive && !uiState.editor?.isFocused && !uiState.mobileToolbarShell?.contains(document.activeElement)) uiState.editorFocused = false;
        if (!uiState.editor?.isFocused && !formattingPickerOpen() && !formattingPopup?.element.contains(document.activeElement)) {
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

    observe(() => uiState.editor, (instance, previous) => {
      unbindEditorUi(previous);
      bindEditorUi(instance);
    }, { immediate: true });

    const onViewportChange = (event?: Event) => {
      // A menu's own scroll does not move its anchor or change the active table.
      if (event?.type === "scroll" && event.target instanceof Node
        && (uiState.tableToolbarShell?.contains(event.target) || uiState.tableMenuShell?.contains(event.target))) return;
      // The shared viewport pass runs a frame later; a change from before the press did not move it.
      formatting?.press.viewportChanged(event);
      const wasMobile = uiState.mobile;
      if (slash.active && slash.getRect) slash.rect = slash.getRect();
      if (mention.active && mention.getRect) mention.rect = mention.getRect();
      updateMobileViewport();
      if (wasMobile !== uiState.mobile) formatting?.release();
      updateTableUi();
      updateCodeUi();
      if (floatingFormattingMode() && uiState.editor && !formattingActive()) formattingPopup?.hide();
      tableUi.menuOpen = false;
    };

    let stopViewport: (() => void) | undefined;
    const popupRef = (name: "codeLanguageShell" | "mobileToolbarShell", preserveChrome = false) => {
      let presentation: ReturnType<typeof createViewportSurface> | undefined;
      return (node: unknown) => {
        const element = node instanceof HTMLElement ? node : null;
        if (uiState[name] === element) return;
        presentation?.destroy();
        uiState[name] = element;
        presentation = element ? createViewportSurface(element, { bare: true, preserveChrome }) : undefined;
        presentation?.show();
      };
    };
    const codeLanguageRef = popupRef("codeLanguageShell", true);
    const mobileToolbarRef = popupRef("mobileToolbarShell", true);
    // Inline table controls stay in the document's positioning and scroll context.
    // Menus and popups retain viewport/top-layer presentation.
    const tableOverlayRef = (node: unknown) => {
      uiState.tableOverlayShell = node instanceof HTMLElement ? node : null;
    };
    const onDocumentPointerDown = (event: PointerEvent) => {
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      const inElement = (element: HTMLElement | null) => Boolean(
        element && (path.includes(element) || (event.target instanceof Node && element.contains(event.target)))
      );
      if (uiState.linkState.surface !== "none" && !inElement(elementRef("linkForm") ?? uiState.linkFormRoot)) dismissLink(false);
      const inTableUi = inElement(uiState.tableToolbarShell)
        || inElement(uiState.tableOverlayShell)
        || inElement(uiState.tableMenuShell)
        || inElement(uiState.mobileToolbarShell);
      tableInteractionActive = inTableUi;
      if (inTableUi) setTimeout(() => { tableInteractionActive = false; }, 0);

      if (
        (tableUi.toolbarOpen || tableUi.overlayOpen || tableUi.menuOpen)
        && !inElement(uiState.root)
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
        || !(uiState.root?.contains(event.target) || formattingPopup?.element.contains(event.target) || linkPopup?.element.contains(event.target))
        || !(uiState.formatOpen || formattingPopup?.isOpen() || linkPopup?.isOpen())) return false;
      dismissFormatting();
      return true;
    };
    // Escape keeps the selection and hides its tools until the reader selects again.
    const dismissFormatting = () => {
      formatting?.dismiss();
      uiState.formatOpen = false;
      formattingPopup?.hide();
      linkPopup?.hide();
    };
    // Each selection surface is rendered in its own host element and registered with the editor while mounted.
    const surfaceRef = (assign: (surface: SelectionSurface | null) => void, options: (element: HTMLElement, instance: Editor) => SelectionSurfaceOptions) => {
      let current: SelectionSurface | null = null;
      let owner: Editor | undefined;
      return (node: unknown) => {
        const element = node instanceof HTMLElement ? node : null;
        if (current?.element === element && owner === uiState.editor) return;
        current?.destroy();
        owner = uiState.editor;
        current = element && uiState.editor ? createSelectionSurface(options(element, uiState.editor)) : null;
        assign(current);
      };
    };
    const editorRoot = () => uiState.root ? [uiState.root] : [];
    const formattingSurfaceRef = surfaceRef((surface) => { formattingPopup = surface; }, (element, instance) => ({
      editor: instance,
      element,
      pluginKey: "looma-text-formatting-menu",
      shouldShow: ({ editor: menuEditor }) =>
        (props.toolbarMode !== "popover" || !props.toolbarOpen)
        && !slash.active && !mention.active
        && (!props.editable && (props.selectionActions.length > 0 || props.rangeActions.length > 0) || menuEditor.isFocused || formattingPopup?.element.contains(document.activeElement) || uiState.linkState.surface === "context" || formattingPickerOpen())
        && formattingActive(),
      boundary: () => props.toolbarMode === "contextual" ? uiState.root : null,
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
        (from === to || Boolean(selectedLinkReference(menuEditor))) && isLinkActive(menuEditor) && uiState.linkState.surface !== "popover"
        && !formatting?.dismissed(menuEditor.state.selection)
        && Boolean(menuEditor.isFocused || uiState.linkState.surface === "context" || linkPopup?.element.contains(document.activeElement))
        && !(props.toolbarMode === "contextual" && floatingFormattingMode() && formattingActive()),
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
        const instance = uiState.editor;
        const table = instance ? selectedTableElement(instance) : null;
        if (instance && table) normalizeActiveTableColumnWidths(instance, table);
        nextTick(updateTableUi);
      });
    };

    const imageForElement = (element: HTMLImageElement) => {
      const instance = uiState.editor;
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
      return element && uiState.editor?.view.dom.contains(element) ? element : null;
    };

    const activateImage = (element: HTMLImageElement, trigger: "keyboard" | "pointer") => {
      const image = imageForElement(element);
      if (image) emit("image-activate", { ...image, trigger });
    };

    const chipElementForEvent = (event: Event): HTMLElement | null => {
      const element = event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-looma-chip]") : null;
      return element && uiState.editor?.view.dom.contains(element) ? element : null;
    };

    const footnoteElementForEvent = (event: Event): HTMLElement | null => {
      const element = event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-looma-footnote-ref]") : null;
      return element && uiState.editor?.view.dom.contains(element) ? element : null;
    };

    const onChipClickCapture = (event: MouseEvent) => {
      const reference = footnoteElementForEvent(event);
      if (reference && uiState.editor && props.editable) {
        event.preventDefault();
        event.stopPropagation();
        openFootnoteSurface(uiState.editor.view.posAtDOM(reference, 0), "actions");
        return;
      }
      const chip = chipElementForEvent(event);
      if (chip && uiState.editor && props.editable) {
        event.preventDefault();
        // ui-popover attaches its own anchor click toggle. Handle chips here so
        // a click on the open chip cannot close and immediately reopen it.
        event.stopPropagation();
        openChipEditor(uiState.editor, uiState.editor.view.posAtDOM(chip, 0));
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
      const reference = footnoteElementForEvent(event);
      if (reference && uiState.editor && props.editable) {
        event.preventDefault();
        openFootnoteSurface(uiState.editor.view.posAtDOM(reference, 0), "actions");
        return;
      }
      const chip = chipElementForEvent(event);
      if (chip && uiState.editor && props.editable) {
        event.preventDefault();
        openChipEditor(uiState.editor, uiState.editor.view.posAtDOM(chip, 0));
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
      const instance = uiState.editor;
      if (!instance || !imageDelivery.markRenditionFailed(instance, image.src)) return;
      emit("image-rendition-error", { ...image, trigger: "programmatic" });
    };

    const onLinkNavigationModifier = (event: KeyboardEvent | PointerEvent) => {
      const dom = uiState.editor?.view.dom;
      const active = isApplePlatform() ? event.metaKey : event.ctrlKey;
      if (dom && dom.hasAttribute("data-link-navigation") !== active) dom.toggleAttribute("data-link-navigation", active);
    };
    const clearLinkNavigationModifier = () => uiState.editor?.view.dom.removeAttribute("data-link-navigation");

    onConnect(() => {
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
      uiState.root?.addEventListener("error", onImageError, true);
    });
    onDispose(() => {
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
      uiState.root?.removeEventListener("error", onImageError, true);
      unbindEditorUi(uiState.editor);
      if (dragLeaveTimer) clearTimeout(dragLeaveTimer);
      if (tablePointerFrame !== null) cancelAnimationFrame(tablePointerFrame);
    });

    const onAttachmentChange = async (event: Event) => {
      const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = "";
      if (file) await attachmentUploads?.insert(file);
    };

    const onFileChange = async (event: Event) => {
      const input = event.target as HTMLInputElement;
      const files = Array.from(input.files ?? []);
      input.value = "";
      await uploads?.insert(files);
    };

    const onDrop = async (event: DragEvent) => {
      event.preventDefault();
      uiState.dragOver = false;
      if (!props.editable) return;
      const files = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith("image/"));
      await uploads?.insert(files);
    };

    const onContextMenu = (event: MouseEvent) => {
      const instance = uiState.editor;
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
      if (!uiState.editor) return;
      handleTableAction(uiState.editor, detail);
      tableUi.menuOpen = false;
      nextTick(updateTableUi);
    };

    const runOverlayAction = (detail: Parameters<typeof handleTableOverlayAction>[1]) => {
      const instance = uiState.editor;
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
        uiState.resizeHintFor = handle.id;
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
      if (handle && (!(event.relatedTarget instanceof Node) || !handle.contains(event.relatedTarget))) uiState.resizeHintFor = "";
      const fromCell = event.target instanceof HTMLElement
        ? event.target.closest<HTMLTableCellElement>("td, th")
        : null;
      if (!fromCell || fromCell !== hoveredTableCell) return;
      const next = event.relatedTarget;
      const toCell = next instanceof HTMLElement
        ? next.closest<HTMLTableCellElement>("td, th")
        : null;
      if (toCell || (next instanceof Node && uiState.tableOverlayShell?.contains(next))) return;
      hoveredTableCell = null;
      nextTick(updateTableUi);
    };

    const onEditorPointerLeave = (event: PointerEvent) => {
      uiState.resizeHintFor = "";
      const next = event.relatedTarget;
      if (
        next instanceof Node
        && (
          uiState.tableOverlayShell?.contains(next)
          || uiState.tableToolbarShell?.contains(next)
          || uiState.tableMenuShell?.contains(next)
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
          uiState.root?.contains(next)
          || uiState.tableToolbarShell?.contains(next)
          || uiState.tableMenuShell?.contains(next)
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



  const focusPart = (element: HTMLElement | null) => element?.dispatchEvent(new CommandEvent("command", { command: "--focus" }));
  const commands = new Map<string, () => void>();
  function tools(instance: Editor, context: string, textOnly = false, full = false): Tool[] {
    const tool = (label: string, icon: LoomaIconName, selected: boolean, disabled: boolean, run: () => void, shortcut = ""): Tool => {
      const id = `${toolbarScope}-${context}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      commands.set(id, run);
      return { id, kind: "icon", label, icon, active: selected, disabled, expanded: false, shortcut };
    };
    const plain = (id: string, label: string): Tool => ({ id, kind: "text", label, icon: "", active: false, disabled: false, expanded: false, shortcut: "" });
    let separatorIndex = 0;
    const separator = (): Tool => ({ ...plain(`${context}-separator-${separatorIndex++}`, ""), kind: "separator" });
    const text = [
      tool("Bold", "bold", instance.isActive("bold"), !instance.can().toggleBold(), () => instance.chain().focus().toggleBold().run(), "Mod-b"),
      tool("Italic", "italic", instance.isActive("italic"), !instance.can().toggleItalic(), () => instance.chain().focus().toggleItalic().run(), "Mod-i"),
      tool("Underline", "underline", instance.isActive("underline"), !instance.can().toggleUnderline(), () => instance.chain().focus().toggleUnderline().run(), "Mod-u"),
      tool("Strike", "strikethrough", instance.isActive("strike"), !instance.can().toggleStrike(), () => instance.chain().focus().toggleStrike().run(), "Mod-Shift-s"),
      ...(authorHighlight ? [tool("Highlight", "highlighter", instance.isActive("highlight"), !instance.can().toggleHighlight(), () => instance.chain().focus().toggleHighlight().run(), "Mod-Shift-h")] : []),
      tool("Inline code", "code-xml", instance.isActive("code"), !instance.can().toggleCode(), () => instance.chain().focus().toggleCode().run(), "Mod-e"),
    ];
    const linkId = full ? `${linkAnchorId}-full` : textOnly ? `${linkAnchorId}-selection` : linkAnchorId;
    text.push({ ...plain(linkId, "Link"), kind: "icon", icon: "link", active: isLinkActive(instance), expanded: uiState.linkState.surface === "popover" });
    let result: Tool[] = textOnly ? text : [
      ...text, separator(),
      ...([1, 2, 3] as const).map(level => tool(`Heading ${level}`, `heading-${level}`, instance.isActive("heading", { level }), false, () => instance.chain().focus().toggleHeading({ level }).run(), `Mod-Alt-${level}`)),
      tool("Bullet list", "list", instance.isActive("bulletList"), false, () => instance.chain().focus().toggleBulletList().run(), "Mod-Shift-8"),
      tool("Numbered list", "list-ordered", instance.isActive("orderedList"), false, () => instance.chain().focus().toggleOrderedList().run(), "Mod-Shift-7"),
      tool("Blockquote", "quote", instance.isActive("blockquote"), !instance.can().toggleBlockquote(), () => instance.chain().focus().toggleBlockquote().run(), "Mod-Shift-b"),
      tool("Code block", "braces", instance.isActive("codeBlock"), !instance.can().toggleCodeBlock(), () => instance.chain().focus().toggleCodeBlock().run(), "Mod-Alt-c"),
      { ...plain(blockActionAnchorId, "Block actions"), kind: "icon", icon: "ellipsis" }, separator(),
      { ...plain(tablePickerAnchorId, "Insert table"), kind: "icon", icon: "table", active: uiState.tablePickerOpen, expanded: uiState.tablePickerOpen },
      tool("Attach file", "paperclip", false, uiState.fileUploadState.uploading || !answers("file-upload"), () => uiState.attachmentInput?.click()),
      tool(uiState.uploadState.uploading ? "Uploading image" : "Insert image", "image", false, uiState.uploadState.uploading || !answers("image-upload"), () => uiState.fileInput?.click()),
      separator(),
      tool("Undo", "undo", false, !instance.can().undo(), () => instance.chain().focus().undo().run(), "Mod-z"),
      tool("Redo", "redo", false, !instance.can().redo(), () => instance.chain().focus().redo().run(), isApplePlatform() ? "Mod-Shift-z" : "Mod-y"),
    ];
    if (!props.editable) result = [];
    else if (props.compactToolbar && !uiState.mobile && !full) result = [text[0]!, text[1]!, text.at(-1)!, { ...plain(formatAnchorId, "Format"), expanded: uiState.formatOpen }];
    const actions: Tool[] = [];
    if (!full) {
      if (instance.state.selection.empty) {
        for (const action of groupRangeActions(activeRangeActions(instance))) {
          const id = `${toolbarScope}-${context}-range-${action.id}`;
          commands.set(id, () => { emit("range-action", action.detail); formattingPopup?.hide(); });
          actions.push(plain(id, action.label));
        }
      } else if (selectsPassage(instance.state)) {
        for (const action of props.selectionActions) {
          const id = `${toolbarScope}-${context}-selection-${action.id}`;
          commands.set(id, () => {
            const detail = selectionActionDetail(instance.state, action.id);
            if (detail) emit("selection-action", detail);
            formattingPopup?.hide();
          });
          actions.push(plain(id, action.label));
        }
      }
    }
    return uiState.mobile ? [...actions, ...result] : [...result, ...actions];
  }
  const tableActions = (): TableContextMenuAction[] => {
    const actions: TableContextMenuAction[] = ["align-left", "align-center", "align-right", "background-none", "background-gray", "background-yellow", "background-blue", "background-green", "background-red", "clear-cells"];
    const capabilities = tableUi.capabilities;
    for (const [capability, action] of [
      ["canAddRowBefore", "add-row-before"], ["canAddRowAfter", "add-row-after"],
      ["canAddColumnBefore", "add-column-before"], ["canAddColumnAfter", "add-column-after"],
      ["canToggleHeaderRow", "toggle-header-row"], ["canToggleHeaderColumn", "toggle-header-column"],
      ["canMoveRowUp", "move-row-up"], ["canMoveRowDown", "move-row-down"],
      ["canMoveColumnLeft", "move-column-left"], ["canMoveColumnRight", "move-column-right"],
      ["canMergeCells", "merge-cells"], ["canSplitCell", "split-cell"],
      ["canDeleteRow", "delete-row"], ["canDeleteColumn", "delete-column"], ["canDeleteTable", "delete-table"],
    ] as const) if (capabilities[capability]) actions.push(action);
    return actions;
  };
  let previousView: Record<string, unknown> | undefined;
  function snapshot() {
    const instance = uiState.editor;
    commands.clear();
    const link = uiState.linkState;
    const shown = link.selected ? [link.selected] : link.results;
    const image = instance ? selectedImage(instance)?.node : undefined;
    let imageTarget = "";
    if (image) { imageTarget = imageTargets.get(image) ?? `image-${++imageTargetSequence}`; imageTargets.set(image, imageTarget); }
    const slashGroups: Array<{ label: string; rows: Array<{ id: string; value: string; title: string; description: string; icon: string; keywords: string }> }> = [];
    for (const [index, item] of slash.items.entries()) {
      const label = item.group ?? "";
      if (slashGroups.at(-1)?.label !== label) slashGroups.push({ label, rows: [] });
      slashGroups.at(-1)!.rows.push({ id: item.id ?? `${item.title}-${index}`, value: item.id ?? item.title, title: item.title, description: item.description ?? "", icon: item.icon ?? "", keywords: [...item.keywords, item.id ?? ""].join(" ") });
    }
    const rawHref = instance?.getAttributes("link").href;
    const href = typeof rawHref === "string" ? rawHref : "";
    const context = props.toolbarMode === "contextual" && floatingFormattingMode() && formattingActive();
    const next = {
      ready: Boolean(instance), mobile: uiState.mobile, editable: props.editable, dragOver: uiState.dragOver,
      formatting: Boolean(instance && (props.editable || props.selectionActions.length || props.rangeActions.length) && !uiState.mobile && props.toolbarMode !== "sticky"),
      contextual: props.toolbarMode === "contextual", sticky: Boolean(instance && props.editable && !uiState.mobile && props.toolbarMode === "sticky"),
      popover: Boolean(instance && props.editable && !uiState.mobile && props.toolbarMode === "popover" && props.toolbarTriggerId),
      mobileToolbar: Boolean(instance && (props.editable || props.selectionActions.length && !instance.state.selection.empty || activeRangeActions(instance).length) && uiState.mobile && (uiState.editorFocused || link.surface === "popover" || !props.editable)),
      tools: instance && (uiState.mobile || props.toolbarMode === "sticky") ? tools(instance, "main") : [],
      selectionTools: instance && !uiState.mobile && props.toolbarMode !== "sticky" ? tools(instance, "selection", props.toolbarMode === "popover") : [],
      fullTools: instance && !uiState.mobile && (props.compactToolbar || props.toolbarMode === "popover") ? tools(instance, "full", false, true) : [],
      compactFormat: props.editable && props.compactToolbar && !uiState.mobile,
      formatOpen: uiState.formatOpen, formatAnchorId, blockActionAnchorId, tablePickerAnchorId,
      tablePickerOpen: uiState.tablePickerOpen, mobileToolbarMode: uiState.mobileToolbarMode,
      mobileToolbarStyle: uiState.mobileToolbarStyle, resizeHintFor: uiState.resizeHintFor,
      density: props.editable ? "comfortable" : props.contentDensity,
      placement: uiState.mobile ? "top-start" : "bottom-start",
      linkAnchorId: uiState.linkPopoverAnchorId, chipAnchorId, footnoteAnchorId,
      linkOpen: link.surface === "popover", linkContext: Boolean(instance && (link.surface === "context" || (instance.state.selection.empty || selectedLinkReference(instance)) && isLinkActive(instance)) && link.surface !== "popover" && formattingActive()),
      linkInFormatting: context, linkForm: link.surface === "context",
      link: { existing: Boolean(link.range?.existing), searchable: answers("link-search"), mode: link.mode, value: answers("link-search") ? link.query : link.href, placeholder: answers("link-search") ? `Search ${props.linkTargetLabel.toLowerCase()}s or paste a URL…` : "https://example.com", newTab: link.newTab, textEditable: link.textEditable, text: link.text, error: link.error ?? "", status: linkFormStatus(link), results: shown.map(({ id, label, detail }) => ({ id, label, detail: detail ?? "" })), selected: link.selected?.id ?? "", href, openHref: validLinkHref(href) ?? "", label: link.current?.label ?? "", detail: link.current?.detail ?? "", targetLabel: props.linkTargetLabel },
      chip: { open: uiState.chipState.open, label: uiState.chipState.label, color: uiState.chipState.color },
      footnote: { open: uiState.footnoteState.open, surface: uiState.footnoteSurface ?? "", content: uiState.footnoteState.note },
      image: { placement: normalizeImagePlacement(image?.attrs.placement), alt: image?.attrs.alt ?? "", target: imageTarget },
      files: { uploading: uiState.fileUploadState.uploading, failed: Boolean(uiState.fileUploadState.failed), progress: uploadProgressText(uiState.fileUploadState.progress, "Attaching file…") },
      upload: { uploading: uiState.uploadState.uploading, failed: Boolean(uiState.uploadState.failed), progress: uploadProgressText(uiState.uploadState.progress) },
      slash: { active: slash.active, query: slash.query, selectedIndex: slash.selectedIndex, anchorRect: menuAnchorRect(slash.rect), groups: slashGroups },
      mention: { active: mention.active && (mention.loading || mention.items.length > 0), query: mention.query, items: mention.items, selectedIndex: mention.selectedIndex, anchorRect: menuAnchorRect(mention.rect), loading: mention.loading, id: mentionMenuId },
      code: { open: codeUi.open, language: codeUi.language, languages: codeLanguageOptions(), placement: codeUi.placement },
      table: { toolbarOpen: tableUi.toolbarOpen, overlayOpen: Boolean(instance && props.editable && !uiState.mobile && tableUi.overlayOpen), menuOpen: tableUi.menuOpen, scope: tableUi.menuScope, alignment: tableUi.alignment, background: tableUi.background ?? "", headerRow: tableUi.headerRow, headerColumn: tableUi.headerColumn, geometry: tableUi.geometry, overlayPlacement: tableUi.overlayStyle, menuPlacement: tableUi.menuStyle, actions: tableActions() },
    };
    previousView = retainView(previousView, next) as typeof next;
    return previousView as typeof next;
  }
  const handleTool = (id: string, press = false, focus = false) => {
    if (id === linkAnchorId || id === `${linkAnchorId}-full` || id === `${linkAnchorId}-selection`) {
      uiState.linkPopoverAnchorId = id;
      const selection = uiState.editor?.state.selection;
      if (press) linkPressedSelection = selection && !selection.empty ? { from: selection.from, to: selection.to } : null;
      // The linked Popover owns click toggling; opening here a second time loses the pressed range.
    } else if (!press && !focus) commands.get(id)?.();
  };
  let sourceRefs: Record<string, HTMLElement | undefined> = {};
  const currentPart = (...parts: Array<HTMLElement | undefined>) => parts.find(part => part?.isConnected) ?? parts.find(Boolean);
  const elementRef = (name: string): HTMLElement | undefined => {
    // Native refs can retain an inactive branch; events belong to the connected part.
    if (name === "linkForm") return currentPart(sourceRefs.linkForm, sourceRefs.contextLinkForm, sourceRefs.floatingLinkForm);
    if (name === "linkCard") return currentPart(sourceRefs.contextLinkCard, sourceRefs.floatingLinkCard);
    if (name === "footnotePopover") return currentPart(sourceRefs.footnotePopover, sourceRefs.footnoteActions);
    return sourceRefs[name];
  };
  const inside = (name: string, event: Event) => event.target instanceof Node && Boolean(elementRef(name)?.contains(event.target));
  function handle(event: Event) {
    const detail = (event as CustomEvent<Record<string, any>>).detail ?? {};
    if (event.type === "tool-action") { handleTool(detail.id); return; }
    if (event.type === "tool-press") { handleTool(detail.id, true); return; }
    if (event.type === "tool-focus") { handleTool(detail.id, false, true); return; }
    if (inside("linkForm", event)) {
      switch (event.type) {
        case "destination": linkEditing?.setDestination(detail.value); break;
        case "clear": linkEditing?.clear(); break;
        case "choose": { const target = (uiState.linkState.selected ? [uiState.linkState.selected] : uiState.linkState.results).find(item => item.id === detail.id); if (target) linkEditing?.choose(target); break; }
        case "new-tab": linkEditing?.setNewTab(detail.newTab); break;
        case "text": linkEditing?.setText(detail.text); break;
        case "save": if (linkEditing?.apply(true)) dismissLink(); break;
        case "dismiss": dismissLink(); break;
      }
      return;
    }
    if (inside("linkCard", event)) { if (event.type === "edit") openLinkEditor(true); if (event.type === "remove") linkEditing?.remove(); return; }
    if (inside("chipEditor", event)) {
      if (event.type === "label") chipEditing?.setLabel(detail.label);
      if (event.type === "color") chipEditing?.setColor(detail.color);
      if (event.type === "done") closeChip(true);
      return;
    }
    if (inside("imageTools", event) && uiState.editor) {
      if (event.type === "placement") updateSelectedImage(uiState.editor, { placement: detail.placement, ...(detail.placement.startsWith("wrap-") ? { width: null, height: null } : {}) });
      if (event.type === "describe") updateSelectedImage(uiState.editor, { alt: detail.alt });
      if (event.type === "delete" && selectedImage(uiState.editor) && props.editable) uiState.editor.chain().focus().deleteSelection().run();
      return;
    }
    if (inside("codeTools", event) && event.type === "language") { chooseCodeLanguage(detail.value); return; }
    if (inside("slashMenu", event)) { if (event.type === "highlight") slash.highlight?.(detail.index); if (event.type === "select") slash.select?.(detail.index); return; }
    if (inside("mentionMenu", event)) { if (event.type === "highlight") { mention.selectedIndex = detail.index; mention.highlight?.(detail.index); } if (event.type === "select") mention.select?.(detail.index); return; }
    if (inside("tablePicker", event) && event.type === "insert") { uiState.editor?.chain().focus().insertTable(detail as any).run(); uiState.tablePickerOpen = false; return; }
    if (inside("blockActions", event) && event.type === "action") { if (props.editable && uiState.editor) runBlockAction(uiState.editor, detail.action); return; }
    if (inside("tableMenu", event) || inside("tableTools", event) || inside("mobileTableTools", event)) { if (event.type === "action") runTableAction(detail as any); return; }
    if (inside("tableOverlay", event)) { runOverlayAction({ action: event.type, ...detail } as any); return; }
    if (event.type === "close" && inside("chipPopover", event)) chipEditing?.close();
    if (event.type === "close" && inside("footnotePopover", event)) closeFootnote(detail.reason === "escape");
    if (inside("toolbarPopover", event)) { if (event.type === "open") emit("toolbar-open", {}); if (event.type === "close") emit("toolbar-close", {}); }
    if (inside("formatPopover", event)) { if (event.type === "open") uiState.formatOpen = true; if (event.type === "close") uiState.formatOpen = false; }
    if (inside("tablePopover", event)) { if (event.type === "open") uiState.tablePickerOpen = true; if (event.type === "close") uiState.tablePickerOpen = false; }
    if (inside("linkPopover", event)) {
      if (event.type === "open") openLinkEditor();
      if (event.type === "close") {
        if (uiState.linkState.surface === "popover") linkEditing?.close();
        linkPressedSelection = null;
        const current = uiState.editor?.state.selection, range = uiState.linkState.range;
        if (current && !current.empty && range && current.from === range.from && current.to === range.to) uiState.editor?.commands.setTextSelection(current.to);
      }
    }
    if (event.type === "change" && inside("footnoteField", event)) footnoteEditing?.setNote(detail.content);
    if (event.type === "done" && inside("footnoteEditor", event)) closeFootnote(true);
  }
  const click = (event: MouseEvent) => {
    const action = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-editor-action]")?.dataset.editorAction : undefined;
    switch (action) {
      case "file-cancel": attachmentUploads?.cancel(); break;
      case "file-retry": void attachmentUploads?.retry(); break;
      case "image-cancel": uploads?.cancel(); break;
      case "image-retry": void uploads?.retry(); break;
      case "formatting": mobileDock.showFormatting(); uiState.editor?.commands.focus(); void nextTick(updateMobileViewport); break;
      case "footnote-go": uiState.footnoteSurface = null; footnoteEditing?.goToNote(); break;
      case "footnote-edit": uiState.footnoteSurface = null; void nextTick(() => { if (uiState.footnoteState.open) uiState.footnoteSurface = "editor"; }); break;
    }
    onImageClick(event);
  };
  function renderedRefs(source: Record<string, HTMLElement | undefined>) {
    sourceRefs = source;
    // Native hosts resolve named refs lazily; their ref facade is not an enumerable record.
    const refs: Record<string, HTMLElement | undefined> = Object.fromEntries([
      "mount", "fileInput", "attachmentInput", "formattingShell", "linkShell", "imageShell",
      "codeShell", "mobileShell", "tableOverlayShell", "tableToolbarShell", "tableMenuShell",
      "chipEditor", "imageTools", "codeTools", "slashMenu", "mentionMenu", "tablePicker",
      "blockActions", "tableMenu", "tableTools", "mobileTableTools", "tableOverlay", "chipPopover",
      "footnoteActions", "footnoteGo", "footnoteField", "footnoteEditor", "toolbarPopover", "formatPopover",
      "tablePopover", "linkPopover",
    ].map(name => [name, source[name]]));
    refs.linkForm = elementRef("linkForm");
    refs.linkCard = elementRef("linkCard");
    refs.footnotePopover = elementRef("footnotePopover");
    uiState.fileInput = refs.fileInput as HTMLInputElement ?? null;
    uiState.attachmentInput = refs.attachmentInput as HTMLInputElement ?? null;
    setLinkFormRoot(refs.linkForm);
    setChipEditorRoot(refs.chipEditor);
    if (tableToolbarHome && tableToolbarHome.element !== refs.tableToolbarShell) restoreTableToolbar();
    const tableToolbar = refs.tableToolbarShell;
    if (tableToolbar && tableUi.toolbarTarget && tableUi.toolbarOpen) {
      tableToolbarHome ??= { element: tableToolbar, parent: tableToolbar.parentNode!, next: tableToolbar.nextSibling };
      if (tableToolbar.parentNode !== tableUi.toolbarTarget) tableUi.toolbarTarget.append(tableToolbar);
    }
    uiState.tableToolbarShell = tableToolbar ?? null;
    uiState.tableMenuShell = refs.tableMenuShell ?? null;
    formattingSurfaceRef(refs.formattingShell);
    linkSurfaceRef(refs.linkShell);
    imageSurfaceRef(refs.imageShell);
    codeLanguageRef(refs.codeShell);
    mobileToolbarRef(refs.mobileShell);
    tableOverlayRef(refs.tableOverlayShell);
    attachDocument(refs.mount);
    for (const callback of rendered) callback();
  }
  const listen = (target: EventTarget, name: string, callback: EventListener, capture = false) => {
    target.addEventListener(name, callback, capture);
    disposed.push(() => target.removeEventListener(name, callback, capture));
  };
  return {
    get editor() { return uiState.editor; },
    snapshot,
    refreshServices() { askSlashCommands(); if (uiState.editor) imageDelivery.reset(uiState.editor); },
    update(next: Partial<DocumentEditorProps>) { Object.assign(props, next); propsVersion++; notify(); },
    rendered: renderedRefs,
    connect() {
      if (active || dead) return;
      uiState.root = options.root;
      active = true;
      for (const callback of connected) callback();
      listen(options.root, "command", event => {
        if (event.target !== options.root) return;
        const command = (event as EditorCommandEvent).command;
        if (command === "--focus" || command === "--focus-end") uiState.editor?.commands.focus(command === "--focus-end" ? "end" : "start");
      });
      listen(options.root, "toggle", event => {
        if ((event as ToggleEvent).newState !== "open") return;
        if (event.target === elementRef("footnoteActions") && uiState.footnoteSurface === "actions") elementRef("footnoteGo")?.focus();
        if (event.target === elementRef("footnotePopover") && uiState.footnoteSurface === "editor") focusFootnoteField();
      }, true);
      listen(options.root, "mousedown", event => { if (inside("tableOverlayShell", event)) onTableOverlayMouseDown(event as MouseEvent); });
      listen(options.root, "pointerleave", event => { if (event.target === uiState.tableOverlayShell) onTableOverlayPointerLeave(event as PointerEvent); }, true);
      listen(options.root, "contextmenu", onContextMenu as EventListener);
      listen(options.root, "pointerover", onEditorPointerOver as EventListener);
      listen(options.root, "pointerout", onEditorPointerOut as EventListener);
      listen(options.root, "pointerleave", onEditorPointerLeave as EventListener);
      listen(options.root, "drop", event => { void onDrop(event as DragEvent); });
      listen(options.root, "click", onChipClickCapture as EventListener, true);
      listen(options.root, "click", click as EventListener);
      listen(options.root, "dblclick", onImageDoubleClick as EventListener);
      listen(options.root, "keydown", onImageKeyDown as EventListener);
      listen(options.root, "dragover", (event) => { event.preventDefault(); if (props.editable && Array.from((event as DragEvent).dataTransfer?.types ?? []).includes("Files")) uiState.dragOver = true; });
      listen(options.root, "dragleave", () => { if (dragLeaveTimer) clearTimeout(dragLeaveTimer); dragLeaveTimer = setTimeout(() => { uiState.dragOver = false; }, 100); });
      listen(options.root, "change", (event) => { if (event.target === uiState.fileInput) void onFileChange(event); if (event.target === uiState.attachmentInput) void onAttachmentChange(event); });
      for (const name of ["tool-action", "tool-press", "tool-focus", "destination", "clear", "choose", "new-tab", "text", "save", "dismiss", "edit", "remove", "label", "color", "done", "placement", "describe", "delete", "language", "highlight", "select", "insert", "action", "open", "close", "change", "add-row-before", "add-row-after", "add-column-before", "add-column-after", "select-row", "select-column", "reorder-row", "reorder-column", "open-cell-menu", "open-row-menu", "open-column-menu"]) listen(options.root, name, handle);
      listen(options.root, "extensions", (event) => {
        if (!inside("footnoteField", event)) return;
        const request = event as RequestEvent<null, AnyExtension[]>;
        request.respondWith([...footnoteContentExtensions, Extension.create({ name: "footnoteOwner", priority: 25, onCreate() { footnoteField = this.editor; focusFootnoteField(); }, addKeyboardShortcuts: () => ({ Escape: () => { closeFootnote(true); return true; } }) })]);
      }, true);
      notify();
    },
    focus(position: "start" | "end" = "start") { uiState.editor?.commands.focus(position); },
    destroy() {
      if (dead) return;
      dead = true;
      restoreTableToolbar();
      for (const callback of disposed.reverse()) callback();
      formattingSurfaceRef(null); linkSurfaceRef(null); imageSurfaceRef(null); codeLanguageRef(null); mobileToolbarRef(null);
      chipEditing?.close(); footnoteEditing?.close(); uploads?.cancel();
    },
  };

}
