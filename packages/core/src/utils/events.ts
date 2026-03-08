export type OverlayTrigger = 'keyboard' | 'pointer' | 'programmatic';

export function eventToTrigger(event: Event): OverlayTrigger {
  if (event instanceof KeyboardEvent) return 'keyboard';
  if (event instanceof PointerEvent || event instanceof MouseEvent) return 'pointer';
  return 'programmatic';
}

export function isActivationKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' ';
}

export function dispatchDetail<T>(el: HTMLElement, name: string, detail: T): void {
  el.dispatchEvent(new CustomEvent<T>(name, { detail, bubbles: true, composed: true }));
}
