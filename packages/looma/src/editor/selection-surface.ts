import { isNodeSelection, posToDOMRect, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { closeOverlay, createAnchoredSurface, openOverlay } from "../components/shared/overlay.js";

type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };

/** What `shouldShow` receives on each selection or document change. */
export interface SelectionSurfaceContext {
  editor: Editor;
  view: EditorView;
  state: EditorState;
  oldState?: EditorState;
  from: number;
  to: number;
}

export interface SelectionSurfaceOptions {
  editor: Editor;
  /**
   * The surface element, the only child of a host element that stays in place. It leaves the
   * document while closed, so its content is absent rather than hidden, and returns to the host,
   * in the top layer, while open.
   */
  element: HTMLElement;
  pluginKey: string;
  shouldShow(context: SelectionSurfaceContext): boolean;
  /** Waits this long after the last change before deciding, for non-empty selections. */
  updateDelay?: number;
  placement?: "top" | "bottom";
  /** The rectangle to anchor to; the selection's by default. */
  anchor?: () => Rect;
  /** Keeps the surface inside this element as well as the viewport. */
  boundary?: () => HTMLElement | null;
  maxWidth?: () => number | null;
  /** Elements whose pointer presses do not dismiss the surface, such as the editor's own root. */
  related?: () => HTMLElement[];
  /** Return false to keep the surface open, for example while a picker in it has focus. */
  onHide?: () => boolean | void;
  /** Escape or a press outside reached this surface first on the shared overlay stack. */
  onDismiss?: (reason: "escape" | "light-dismiss") => void;
}

/** A selection-anchored surface: the editor's floating toolbar, link card, and image actions. */
export interface SelectionSurface {
  readonly element: HTMLElement;
  isOpen(): boolean;
  show(): void;
  hide(): void;
  /** Anchors to `anchor` until the next change the surface decides on. */
  setAnchor(anchor: () => Rect): void;
  destroy(): void;
}

let surfaceSequence = 0;

/**
 * Shows `element` beside the selection whenever `shouldShow` allows, as Tiptap's bubble menu does,
 * and presents it through Looma's shared overlay layer: in the top layer, placed by the shared
 * flip/shift policy, travelling with its anchor, and registered on the overlay stack.
 *
 * @lifecycle Registers a ProseMirror plugin now; `destroy()` unregisters it and closes the surface.
 * The editor destroying its view closes the surface too.
 * @contract A press inside the surface keeps it open when the editor blurs; dragging hides it.
 */
export function createSelectionSurface(options: SelectionSurfaceOptions): SelectionSurface {
  const { editor, element } = options;
  const document = element.ownerDocument;
  const id = `looma-selection-surface-${++surfaceSequence}`;
  const selectionRect = (): Rect => {
    const { view, state } = editor;
    const { ranges } = state.selection;
    const from = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));
    if (isNodeSelection(state.selection)) {
      let node = view.nodeDOM(from) as HTMLElement | null;
      const wrapper = node?.dataset?.nodeViewWrapper ? node : node?.querySelector?.<HTMLElement>("[data-node-view-wrapper]");
      if (wrapper) node = wrapper.firstChild as HTMLElement | null;
      if (node instanceof Element) return node.getBoundingClientRect();
    }
    return posToDOMRect(view, from, to);
  };
  let anchor: () => Rect = options.anchor ?? selectionRect;
  let lastRect: Rect | null = null;
  let open = false;
  let destroyed = false;
  let preventHide = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const presentation = createAnchoredSurface(element, {
    // The anchor can stop resolving mid-transaction; keep the last good place until it does again.
    anchor: () => {
      if (editor.isDestroyed) return lastRect;
      try { lastRect = anchor(); } catch { /* keep the last rectangle */ }
      return lastRect;
    },
    placement: options.placement ?? "top",
    gap: 10,
    viewportGap: 5,
    boundary: options.boundary,
    maxWidth: options.maxWidth,
    bare: true,
  });
  const host = element.parentElement;
  element.hidden = true;
  element.tabIndex = 0;
  element.remove();

  const show = () => {
    if (destroyed) return;
    if (!open) {
      open = true;
      openOverlay({
        id, modal: false, element, relatedElements: options.related?.() ?? [], dismissible: true,
        requestClose: (reason) => {
          if (reason === "escape" || reason === "light-dismiss") options.onDismiss?.(reason);
          else hide();
        },
      });
    }
    if (!element.isConnected) host?.append(element);
    presentation.show();
  };
  const close = () => {
    open = false;
    presentation.hide();
    element.remove();
    closeOverlay(document, id);
  };
  const hide = () => {
    if (!open || options.onHide?.() === false) return;
    close();
  };

  const decide = (view: EditorView, oldState: EditorState | undefined, selectionChanged: boolean, docChanged: boolean) => {
    const { state, composing } = view;
    if (composing || (!selectionChanged && !docChanged)) return;
    const { ranges } = state.selection;
    const from = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));
    if (!options.shouldShow({ editor, view, state, oldState, from, to })) {
      hide();
      return;
    }
    anchor = options.anchor ?? selectionRect;
    show();
    presentation.refresh();
  };
  const update = (view: EditorView, oldState?: EditorState) => {
    const selectionChanged = !oldState?.selection.eq(view.state.selection);
    const docChanged = !oldState?.doc.eq(view.state.doc);
    const delay = options.updateDelay ?? 0;
    if (delay > 0 && view.state.selection.from !== view.state.selection.to) {
      if (!selectionChanged && !docChanged) return;
      clearTimeout(timer);
      timer = setTimeout(() => decide(view, oldState, selectionChanged, docChanged), delay);
      return;
    }
    decide(view, oldState, selectionChanged, docChanged);
  };

  const onPointerDown = () => { preventHide = true; };
  const onDragStart = () => hide();
  // The selection settles after focus, so decide on the next task.
  const onFocus = () => { setTimeout(() => { if (!destroyed && !editor.isDestroyed) update(editor.view); }); };
  const onBlur = ({ event }: { event?: FocusEvent }) => {
    if (preventHide) {
      preventHide = false;
      return;
    }
    const next = event?.relatedTarget;
    if (next instanceof Node && (element.contains(next) || next === editor.view.dom)) return;
    hide();
  };
  const onElementBlur = (event: FocusEvent) => onBlur({ event });

  const key = new PluginKey(options.pluginKey);
  const plugin = new Plugin({
    key,
    view: (view) => {
      element.addEventListener("mousedown", onPointerDown, { capture: true });
      element.addEventListener("blur", onElementBlur);
      view.dom.addEventListener("dragstart", onDragStart);
      editor.on("focus", onFocus);
      editor.on("blur", onBlur);
      return {
        update,
        destroy() {
          clearTimeout(timer);
          element.removeEventListener("mousedown", onPointerDown, { capture: true });
          element.removeEventListener("blur", onElementBlur);
          view.dom.removeEventListener("dragstart", onDragStart);
          editor.off("focus", onFocus);
          editor.off("blur", onBlur);
          close();
        },
      };
    },
  });
  editor.registerPlugin(plugin);

  return {
    element,
    isOpen: () => open,
    show,
    hide,
    setAnchor(next) {
      anchor = next;
      presentation.refresh();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (!editor.isDestroyed) editor.unregisterPlugin(key);
      clearTimeout(timer);
      close();
      presentation.destroy();
    },
  };
}
