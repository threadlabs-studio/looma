import type { Editor } from "@tiptap/core";
import { validLinkHref } from "./content";
import { siteRelativeHref } from "./extensions/relative-links";
import { getReferenceDisplay, referenceDisplay, setReferenceDisplay } from "./reference-display";
import { NodeSelection } from "@tiptap/pm/state";

/** Whether the current selection identifies an automatically labelled link. */
export function selectedLinkReference(editor: Editor) {
  const selection = editor.state.selection;
  return selection instanceof NodeSelection && selection.node.type.name === "loomaReference" ? selection.node : null;
}
export const isLinkActive = (editor: Editor): boolean => editor.isActive("link") || Boolean(selectedLinkReference(editor));

/** A destination supplied by the host application, such as a page or record. */
export interface LoomaLinkTarget {
  id: string;
  label: string;
  detail?: string;
  href: string;
}

/**
 * Finds host records for a link without teaching the editor how they are stored.
 * @ownership The host checks access and returns durable, openable href values.
 * @failure A rejection leaves the existing document untouched and shows a retryable search error.
 */
export type LinkSearch = (query: string) => Promise<LoomaLinkTarget[]>;

/**
 * Describes a saved host link so a renamed record can show its current label.
 * @ownership The host resolves identity and access; Looma keeps the saved href as is.
 * @failure A rejection leaves the original href visible and editable.
 */
export type LinkResolve = (href: string) => Promise<LoomaLinkTarget | null>;

/** The link form's state and the resolved target of the link at the caret. */
export interface LoomaLinkEditingState {
  /** Where the form shows: nowhere, in the toolbar's popover, or in place of the link card. */
  readonly surface: "none" | "popover" | "context";
  /** The range the form links, and whether it was already a link when the form opened. */
  readonly range: { readonly from: number; readonly to: number; readonly existing: boolean } | null;
  readonly mode: "target" | "url";
  readonly query: string;
  readonly href: string;
  readonly text: string;
  readonly textEditable: boolean;
  readonly newTab: boolean;
  readonly error: string;
  readonly results: readonly LoomaLinkTarget[];
  readonly searching: boolean;
  readonly selected: LoomaLinkTarget | null;
  /** What the link at the caret resolves to, for the link card. */
  readonly current: LoomaLinkTarget | null;
}

export interface LoomaLinkEditingOptions {
  editor: Editor;
  /** Read on each use, so a host can change them while the editor runs. */
  search: () => LinkSearch | null | undefined;
  resolve: () => LinkResolve | null | undefined;
  baseUrl: () => string;
  /** Enables automatically labelled references for newly inserted host targets. */
  references?: () => boolean;
}

/**
 * The editor's link form as a state machine: what the form holds, how it applies to the
 * document as the reader types, and the host's search and resolve calls.
 *
 * @ownership The host owns presentation: where the form shows, focus, and which selection it
 * opens on. This owns the form's state and the link mark it writes.
 * @lifecycle Listens to the editor's transactions until `destroy()`; results of a search or lookup
 * that finish after a newer one, or after `destroy()`, are dropped.
 */
export interface LoomaLinkEditing {
  readonly state: LoomaLinkEditingState;
  /** Calls `listener` after every state change; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Opens the form on `from`–`to`, filled from the link there if there is one. */
  open(from: number, to: number, surface: "popover" | "context"): void;
  setDestination(value: string): void;
  clear(): void;
  choose(target: LoomaLinkTarget): void;
  setNewTab(newTab: boolean): void;
  setText(text: string): void;
  /**
   * Writes the form's link to its range without moving focus.
   * @failure Returns false and leaves the document unchanged when the destination or text is
   * missing or invalid; `reportError` also sets the form's error.
   */
  apply(reportError?: boolean): boolean;
  close(): void;
  /** Removes the link at the caret. */
  remove(): void;
  destroy(): void;
}

/** The status line above search results: progress, a hint, or an empty result. */
export function linkFormStatus(state: LoomaLinkEditingState): string {
  if (state.searching) return "Searching…";
  if (state.selected) return "";
  if (state.query.trim().length < 2) return "Type at least two letters to search.";
  return state.results.length || state.error ? "" : "No results found.";
}

export const LOOMA_LINK_EDITING_IDLE: LoomaLinkEditingState = Object.freeze({
  surface: "none", range: null, mode: "url", query: "", href: "", text: "", textEditable: false, newTab: true,
  error: "", results: [], searching: false, selected: null, current: null,
});

export function createLinkEditing(options: LoomaLinkEditingOptions): LoomaLinkEditing {
  const { editor } = options;
  const listeners = new Set<() => void>();
  const cache = new Map<string, LoomaLinkTarget | null>();
  let state = LOOMA_LINK_EDITING_IDLE;
  let searchSequence = 0;
  let resolveSequence = 0;
  let currentHref: string | null = null;
  let destroyed = false;
  let automaticText = false;

  const set = (patch: Partial<LoomaLinkEditingState>) => {
    const previous = state;
    state = { ...state, ...patch };
    if (state.query !== previous.query || state.mode !== previous.mode || state.surface !== previous.surface) void search();
    listeners.forEach((listener) => listener());
  };

  const search = async () => {
    const sequence = ++searchSequence;
    const { query, mode, surface, selected } = state;
    state = { ...state, results: [], searching: false };
    const find = options.search();
    if (!find || mode !== "target" || surface === "none" || query.trim().length < 2 || (selected && query === selected.label)) return;
    state = { ...state, searching: true };
    try {
      const results = await find(query.trim());
      if (sequence === searchSequence && !destroyed) set({ results: results.filter((target) => validLinkHref(target.href)) });
    } catch {
      if (sequence === searchSequence && !destroyed) set({ error: "Search is unavailable. Try again." });
    } finally {
      if (sequence === searchSequence && !destroyed) set({ searching: false });
    }
  };

  const resolveCurrent = async (href: string | null) => {
    const sequence = ++resolveSequence;
    if (state.current) set({ current: null });
    const resolve = options.resolve();
    if (!href || !resolve) return;
    if (cache.has(href)) {
      set({ current: cache.get(href) ?? null });
      return;
    }
    try {
      const target = await resolve(href);
      if (sequence === resolveSequence && !destroyed) { cache.set(href, target); set({ current: target }); }
    } catch {
      // A failed lookup leaves the original destination visible and editable.
    }
  };

  const onTransaction = () => {
    const reference = selectedLinkReference(editor);
    const display = reference ? referenceDisplay(reference, getReferenceDisplay(editor)) : null;
    const href = display?.href ?? (editor.isActive("link") ? String(editor.getAttributes("link").href ?? "") : null);
    if (reference && display && href) {
      resolveSequence += 1;
      const target = { id: String(reference.attrs.id), label: display.label, href };
      cache.set(href, target);
      if (state.current?.id !== target.id || state.current.label !== target.label || state.current.href !== href) set({ current: target });
      currentHref = href;
    } else if (href !== currentHref) {
      currentHref = href;
      void resolveCurrent(href);
    }
    // Moving the caret off the link being edited in place ends that edit.
    if (state.surface === "context" && editor.state.selection.from !== state.range?.from) set({ surface: "none" });
  };
  editor.on("transaction", onTransaction);

  const apply = (reportError = false) => {
    const range = state.range;
    if (editor.isDestroyed || !range) return false;
    const fail = (error: string) => {
      if (reportError) set({ error });
      return false;
    };
    const href = state.mode === "target" ? validLinkHref(state.selected?.href ?? "") : validLinkHref(state.href);
    if (!href) return fail(state.mode === "target" ? "Choose a destination from the results." : "Enter an http, https, mailto, tel, or relative URL.");
    if (state.mode === "url" && options.search() && !range.existing && !/^(https?:|mailto:|tel:)/i.test(href)) {
      return fail("Enter a full website, email, or phone URL, or choose a destination.");
    }
    const baseUrl = options.baseUrl();
    const attrs = { href: baseUrl ? siteRelativeHref(href, baseUrl) : href, target: state.newTab ? "_blank" : "_self", rel: state.newTab ? "noopener noreferrer" : null };
    // Update the captured range without taking focus from the field being edited.
    const current = editor.state.selection;
    const chain = editor.chain().setTextSelection({ from: range.from, to: range.to });
    if (automaticText && state.mode === "target" && state.selected && (options.references?.() || selectedLinkReference(editor))) {
      const target = state.selected;
      const previous = editor.state.doc.nodeAt(range.from);
      const sameTarget = previous?.type.name === "loomaReference" && previous.attrs.id === target.id;
      chain.insertContent({ type: "loomaReference", attrs: { id: target.id, kind: "link", href: sameTarget ? previous.attrs.href : attrs.href, label: sameTarget ? previous.attrs.label : target.label, target: attrs.target } }).setNodeSelection(range.from).run();
      set({ range: { from: range.from, to: range.from + 1, existing: true }, error: "" });
      return true;
    }
    if (state.textEditable) {
      const text = state.text.trim();
      if (!text) return fail("Enter link text.");
      chain.insertContent({ type: "text", text, marks: [{ type: "link", attrs }] }).setTextSelection(range.from).run();
      set({ range: { from: range.from, to: range.from + text.length, existing: true }, error: "" });
    } else {
      if (range.existing && range.from === range.to) chain.extendMarkRange("link");
      chain.setLink(attrs).setTextSelection({ from: current.from, to: current.to }).run();
      set({ range: { ...range, existing: true }, error: "" });
    }
    return true;
  };

  return {
    get state() { return state; },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    open(from, to, surface) {
      const empty = from === to;
      const reference = selectedLinkReference(editor);
      const existing = isLinkActive(editor);
      const attrs = reference?.attrs ?? (existing ? editor.getAttributes("link") : {});
      const href = typeof attrs.href === "string" ? attrs.href : "";
      const display = reference ? referenceDisplay(reference, getReferenceDisplay(editor)) : null;
      const selected = reference ? { id: String(reference.attrs.id), label: display!.label, href: display!.href ?? href } : cache.get(href) ?? null;
      automaticText = Boolean(reference) || empty && !existing;
      set({
        surface,
        range: { from, to, existing },
        textEditable: Boolean(reference) || empty && !existing,
        href,
        newTab: attrs.target !== "_self",
        text: display?.label ?? (empty && !existing ? "" : editor.state.doc.textBetween(from, to)),
        error: "",
        selected,
        mode: reference || options.search() && (!existing || selected) ? "target" : "url",
        query: selected?.label ?? href,
      });
      const resolve = options.resolve();
      if (existing && !reference && resolve && !cache.has(href)) {
        void resolve(href).then((target) => {
          cache.set(href, target);
          if (!destroyed && state.href === href && target) set({ selected: target, mode: "target", query: target.label });
        }).catch(() => {});
      }
    },
    setDestination(value) {
      if (options.search() || selectedLinkReference(editor)) {
        const trimmed = value.trim();
        const url = /^(https?:\/\/|mailto:|tel:)/i.test(trimmed) || Boolean(state.range?.existing && /^(\/|\.\.?\/|#|\?)/.test(trimmed));
        set({ query: value, mode: url ? "url" : "target", selected: null, href: value, error: "" });
      } else {
        set({ href: value, error: "" });
      }
      apply();
    },
    clear() {
      set({ query: "", href: "", mode: "target", selected: null, error: "" });
    },
    choose(target) {
      cache.set(target.href, target);
      if (options.references?.() || selectedLinkReference(editor)) setReferenceDisplay(editor, { ...getReferenceDisplay(editor), [`link:${target.id}`]: { label: target.label, href: target.href } });
      set({
        selected: target, href: target.href, query: target.label, results: [], newTab: false, error: "",
        ...(state.textEditable && !state.text.trim() ? { text: target.label } : {}),
      });
      apply();
    },
    setNewTab(newTab) {
      set({ newTab });
      apply();
    },
    setText(text) {
      automaticText = false;
      set({ text, error: "" });
      apply();
    },
    apply,
    close() {
      if (state.surface !== "none") set({ surface: "none" });
    },
    remove() {
      const reference = selectedLinkReference(editor);
      if (reference) {
        editor.chain().focus().insertContent({ type: "text", text: referenceDisplay(reference, getReferenceDisplay(editor)).label }).run();
        set({ surface: "none" });
        return;
      }
      if (!editor.isActive("link")) return;
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      if (state.surface === "context") set({ surface: "none" });
    },
    destroy() {
      destroyed = true;
      listeners.clear();
      editor.off("transaction", onTransaction);
    },
  };
}
