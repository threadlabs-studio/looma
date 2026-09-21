/**
 * Module-wide coordination for dismissible surfaces in one browser realm.
 *
 * Individual components own rendering and open state. This module owns only
 * the cross-component invariants: Escape/light-dismiss target the most recently
 * opened surface, document listeners exist only while needed, and scroll stays
 * locked until the last modal closes. A component must therefore close its
 * record during teardown even if its DOM node has already disconnected.
 */

/** Why an overlay was asked to close; this describes intent, not state ownership. */
export type OverlayCloseReason =
  | "programmatic"
  | "light-dismiss"
  | "escape"
  | "action";

/** Input modality that initiated an overlay state transition. */
export type OverlayTrigger = "keyboard" | "pointer" | "programmatic";

/**
 * A live entry in the overlay stack.
 *
 * `requestClose` is deliberately a request rather than a mutation. Controlled
 * components notify their owner and may remain open; uncontrolled components
 * may close immediately. The manager must not guess which mode is active.
 *
 * @ownership The component owns the element and open state. The manager borrows
 * the record only to coordinate stack order, dismissal, and modal accounting.
 */
export interface OverlayRecord {
  id: string;
  modal: boolean;
  element: HTMLElement;
  /** Controls that are part of the overlay interaction boundary (for example,
   * the button that toggles an anchored menu). */
  relatedElements?: readonly HTMLElement[];
  dismissible?: boolean;
  requestClose: (reason: OverlayCloseReason, trigger: OverlayTrigger) => void;
}

const stack: OverlayRecord[] = [];
const scrollLockAttribute = "data-ui-scroll-lock";

let modalCount = 0;
let listenersAttached = false;

function syncScrollLock(): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  if (modalCount > 0) {
    root.setAttribute(scrollLockAttribute, "true");
    root.style.overflow = "hidden";
    return;
  }

  root.removeAttribute(scrollLockAttribute);
  root.style.removeProperty("overflow");
}

function getOverlayDismissible(record: OverlayRecord): boolean {
  return record.dismissible ?? true;
}

function handleEscape(event: KeyboardEvent): void {
  if (event.key !== "Escape") {
    return;
  }
  requestTopOverlayClose("escape", "keyboard");
}

function handleLightDismiss(event: PointerEvent): void {
  const top = getTopOverlay();
  if (!top || !getOverlayDismissible(top)) {
    return;
  }

  // A document listener sees a shadow host as event.target. Use the composed
  // path so connected controls inside a field remain inside the overlay boundary.
  const boundary = [top.element, ...(top.relatedElements ?? [])];
  if (event.composedPath().some(target => target instanceof Node
    && boundary.some(element => element.contains(target)))) return;

  requestTopOverlayClose("light-dismiss", "pointer");
}

function ensureListeners(): void {
  if (listenersAttached || typeof document === "undefined") {
    return;
  }
  document.addEventListener("keydown", handleEscape);
  document.addEventListener("pointerdown", handleLightDismiss, { capture: true });
  listenersAttached = true;
}

function removeListenersIfIdle(): void {
  if (!listenersAttached || stack.length > 0 || typeof document === "undefined") {
    return;
  }
  document.removeEventListener("keydown", handleEscape);
  document.removeEventListener("pointerdown", handleLightDismiss, { capture: true });
  listenersAttached = false;
}

/**
 * Moves an overlay to the top of the interaction stack.
 * Reopening an existing id replaces its record so modal accounting cannot be
 * incremented twice and the newest callbacks/related elements take effect.
 *
 * @lifecycle The record remains active until its id is closed or replaced;
 * callers must close it during teardown even after the element disconnects.
 */
export function openOverlay(record: OverlayRecord): void {
  closeOverlay(record.id);
  stack.push(record);
  if (record.modal) {
    modalCount += 1;
    syncScrollLock();
  }
  ensureListeners();
}

/** Removes an overlay record and releases global resources when the stack empties. */
export function closeOverlay(id: string): void {
  const index = stack.findIndex((record) => record.id === id);
  if (index >= 0) {
    const [record] = stack.splice(index, 1);
    if (record?.modal) {
      modalCount = Math.max(0, modalCount - 1);
      syncScrollLock();
    }
  }
  removeListenersIfIdle();
}

/** Returns the most recently opened live record without mutating stack order. */
export function getTopOverlay(): OverlayRecord | undefined {
  return stack.at(-1);
}

/** Reports whether an id currently owns Escape and light-dismiss handling. */
export function isTopOverlay(id: string): boolean {
  return getTopOverlay()?.id === id;
}

/**
 * Routes a dismissal request to the topmost overlay only.
 *
 * Returning `true` means a request was delivered, not that the overlay closed;
 * controlled owners decide whether and when the corresponding state changes.
 */
export function requestTopOverlayClose(reason: OverlayCloseReason, trigger: OverlayTrigger): boolean {
  const top = getTopOverlay();
  if (!top) {
    return false;
  }

  if (!getOverlayDismissible(top) && (reason === "escape" || reason === "light-dismiss")) {
    return false;
  }

  top.requestClose(reason, trigger);
  return true;
}
