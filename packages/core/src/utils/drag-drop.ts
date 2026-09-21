/** Relative insertion target resolved from a pointer's vertical row position. */
export type DropPosition = 'before' | 'inside' | 'after';

/**
 * Controls one replaceable delayed intent keyed by the hovered target.
 *
 * @lifecycle `cancel` clears pending work but permits reuse; `destroy` provides
 * terminal cleanup for owners even though this controller holds no other state.
 */
export interface HoverIntentController {
  schedule(key: string): void;
  cancel(): void;
  destroy(): void;
}

/**
 * Classify the pointer against stable edge bands. Containers reserve their
 * middle half for containment; leaf rows split cleanly at their midpoint.
 */
export function classifyDropPosition(
  rect: Pick<DOMRect, 'top' | 'bottom' | 'height'>,
  clientY: number,
  acceptsChildren: boolean,
): DropPosition {
  const progress = rect.height > 0
    ? Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
    : 0.5;

  if (!acceptsChildren) return progress < 0.5 ? 'before' : 'after';
  if (progress < 0.25) return 'before';
  if (progress > 0.75) return 'after';
  return 'inside';
}

/**
 * Uses the rendered row—not the tiny handle—as the browser drag preview.
 *
 * @contract Missing or non-browser data-transfer implementations are a no-op;
 * otherwise the preview is inset from the left and vertically centered.
 */
export function setElementDragImage(dataTransfer: DataTransfer | null, element: HTMLElement): void {
  if (!dataTransfer || typeof dataTransfer.setDragImage !== 'function') return;
  const { height } = element.getBoundingClientRect();
  dataTransfer.setDragImage(element, 16, Math.max(0, height / 2));
}

/**
 * Creates a keyed, replaceable hover timer for expansion and disclosure intent.
 *
 * Scheduling the same pending key is idempotent; scheduling a different key
 * cancels the prior intent so only the newest target can fire.
 *
 * @lifecycle Cancellation and destruction suppress pending callbacks. Once an
 * intent fires, the controller returns to an idle reusable state.
 */
export function createHoverIntent(
  delay: number,
  onIntent: (key: string) => void,
): HoverIntentController {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pendingKey: string | undefined;

  function cancel() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    pendingKey = undefined;
  }

  return {
    schedule(key) {
      if (pendingKey === key && timer) return;
      cancel();
      pendingKey = key;
      timer = setTimeout(() => {
        timer = undefined;
        const resolvedKey = pendingKey;
        pendingKey = undefined;
        if (resolvedKey) onIntent(resolvedKey);
      }, Math.max(0, delay));
    },
    cancel,
    destroy: cancel,
  };
}
