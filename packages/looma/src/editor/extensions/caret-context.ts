import { Extension } from "@tiptap/core";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { getVisualViewportRect } from "../viewport";

/** Configures the amount of surrounding text to show while editing. */
export interface LoomaCaretContextOptions {
  /** Number of line heights to keep visible on each side of the caret. Zero disables the behavior. */
  lines: number;
}

function nearestScrollport(element: HTMLElement, owner: Window): Element | null {
  const documentPort = owner.document.scrollingElement;
  for (let port: Element | null = element; port && port !== documentPort;) {
    if (/^(auto|scroll|overlay)$/.test(owner.getComputedStyle(port).overflowY) &&
        port.scrollHeight > port.clientHeight) return port;
    const root = port.getRootNode();
    port = port.parentElement ?? ("host" in root ? (root as ShadowRoot).host : null);
  }
  return documentPort;
}

function revealContext(view: EditorView, owner: Window, lines: number) {
  const selection = view.state.selection;
  if (!view.editable || !view.hasFocus() || view.composing || !(selection instanceof TextSelection) || !selection.empty) return;
  const port = nearestScrollport(view.dom, owner);
  if (!port) return;
  const scrollLimit = port.scrollHeight - port.clientHeight;
  if (scrollLimit <= 0) return;

  const viewport = getVisualViewportRect(owner);
  let { top, bottom } = viewport;
  let scale = 1;
  if (port !== owner.document.scrollingElement) {
    const rect = port.getBoundingClientRect();
    const height = (port as HTMLElement).offsetHeight;
    scale = height ? rect.height / height : 1;
    if (!scale) return;
    const contentTop = rect.top + port.clientTop * scale;
    top = Math.max(top, contentTop);
    bottom = Math.min(bottom, contentTop + port.clientHeight * scale);
  }

  const caret = view.coordsAtPos(selection.head);
  const caretHeight = caret.bottom - caret.top;
  if (caretHeight <= 0 || bottom - top < caretHeight) return;
  const { node } = view.domAtPos(selection.head);
  const element = node.nodeType === 1 ? node as Element : node.parentElement;
  const lineHeight = element && Number.parseFloat(owner.getComputedStyle(element).lineHeight);
  const context = Math.min(lines * (lineHeight ? lineHeight * scale : caretHeight), (bottom - top - caretHeight) / 2);
  const delta = caret.top < top + context ? caret.top - top - context : Math.max(0, caret.bottom - bottom + context);
  if (!delta) return;
  const current = port.scrollTop;
  const target = Math.max(0, Math.min(scrollLimit, current + delta / scale));
  // Immediate minimal movement keeps repeated keypresses responsive and avoids
  // inheriting smooth scrolling from the host, including in reduced-motion mode.
  if (Math.abs(target - current) >= 1) port.scrollTo({ top: target, behavior: "instant" });
}

/**
 * Keeps nearby text visible when a collapsed caret reaches either edge of its scrollport.
 * @contract Opt in with a positive line count. The document and its selection stay intact.
 * @lifecycle Coalesces caret movement, typing and clicks into one measurement per frame.
 */
export const LoomaCaretContext = Extension.create<LoomaCaretContextOptions>({
  name: "loomaCaretContext",
  addOptions: () => ({ lines: 0 }),
  addProseMirrorPlugins() {
    const lines = Math.floor(this.options.lines);
    if (!Number.isFinite(lines) || lines < 1) return [];
    return [new Plugin({
      view(view) {
        const document = view.dom.ownerDocument;
        const owner = document.defaultView;
        if (!owner) return {};
        let frame: number | undefined;
        let pointing = false;
        const schedule = () => {
          if (pointing || frame !== undefined) return;
          frame = owner.requestAnimationFrame(() => {
            frame = undefined;
            if (!pointing) revealContext(view, owner, lines);
          });
        };
        const beginPointing = () => { pointing = true; };
        const endPointing = () => { pointing = false; };
        const click = (event: MouseEvent) => {
          if (!event.detail) return;
          const position = view.posAtCoords({ left: event.clientX, top: event.clientY });
          // A changed pointer selection arrives in update. Until then the
          // previous caret can lie outside the scrollport after manual scrolling.
          if (position?.pos === view.state.selection.head) schedule();
        };
        view.dom.addEventListener("pointerdown", beginPointing);
        view.dom.addEventListener("click", click);
        view.dom.addEventListener("compositionend", schedule);
        document.addEventListener("pointerup", endPointing, true);
        document.addEventListener("pointercancel", endPointing, true);
        return {
          update(_view, previous) {
            if (!view.state.selection.eq(previous.selection) || view.state.doc !== previous.doc) schedule();
          },
          destroy() {
            if (frame !== undefined) owner.cancelAnimationFrame(frame);
            view.dom.removeEventListener("pointerdown", beginPointing);
            view.dom.removeEventListener("click", click);
            view.dom.removeEventListener("compositionend", schedule);
            document.removeEventListener("pointerup", endPointing, true);
            document.removeEventListener("pointercancel", endPointing, true);
          },
        };
      },
    })];
  },
});
