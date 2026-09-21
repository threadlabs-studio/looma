export type OverlayTrigger = 'keyboard' | 'pointer' | 'programmatic';

/**
 * Collapses browser event classes into Looma's stable interaction vocabulary.
 * Synthetic events intentionally become `programmatic`; trusting `isTrusted`
 * would make framework dispatch and test environments produce inconsistent API.
 */
export function eventToTrigger(event: Event): OverlayTrigger {
  if (event instanceof KeyboardEvent) return 'keyboard';
  if (event instanceof PointerEvent || event instanceof MouseEvent) return 'pointer';
  return 'programmatic';
}

/** Space and Enter share activation semantics for Looma-authored controls. */
export function isActivationKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' ';
}

/**
 * Emits a public component event across shadow/framework boundaries.
 * Bubbling and composition are fixed here so controllers do not accidentally
 * create events that work only for a particular rendering strategy.
 */
export function dispatchDetail<T>(el: HTMLElement, name: string, detail: T): void {
  el.dispatchEvent(new CustomEvent<T>(name, { detail, bubbles: true, composed: true }));
}
