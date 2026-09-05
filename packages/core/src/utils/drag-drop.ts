export type DropPosition = 'before' | 'inside' | 'after';

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

/** Use the rendered row—not the tiny handle—as the browser drag preview. */
export function setElementDragImage(dataTransfer: DataTransfer | null, element: HTMLElement): void {
  if (!dataTransfer || typeof dataTransfer.setDragImage !== 'function') return;
  const { height } = element.getBoundingClientRect();
  dataTransfer.setDragImage(element, 16, Math.max(0, height / 2));
}

/** A keyed, replaceable hover timer suitable for expansion and disclosure intent. */
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
