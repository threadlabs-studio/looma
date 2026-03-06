export type OverlayCloseReason =
  | "programmatic"
  | "light-dismiss"
  | "escape"
  | "action";

export type OverlayTrigger = "keyboard" | "pointer" | "programmatic";

export interface OverlayRecord {
  id: string;
  modal: boolean;
  element: HTMLElement;
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

  const target = event.target;
  if (target instanceof Node && top.element.contains(target)) {
    return;
  }

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

export function openOverlay(record: OverlayRecord): void {
  closeOverlay(record.id);
  stack.push(record);
  if (record.modal) {
    modalCount += 1;
    syncScrollLock();
  }
  ensureListeners();
}

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

export function getTopOverlay(): OverlayRecord | undefined {
  return stack.at(-1);
}

export function isTopOverlay(id: string): boolean {
  return getTopOverlay()?.id === id;
}

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
