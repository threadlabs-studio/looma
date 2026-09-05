import { describe, expect, it, vi } from 'vitest';

import {
  classifyDropPosition,
  createHoverIntent,
  setElementDragImage,
} from './drag-drop';

describe('drag and drop geometry', () => {
  const rect = { top: 100, bottom: 200, height: 100 } as DOMRect;

  it('reserves clear edge bands for before and after insertion', () => {
    expect(classifyDropPosition(rect, 110, true)).toBe('before');
    expect(classifyDropPosition(rect, 150, true)).toBe('inside');
    expect(classifyDropPosition(rect, 190, true)).toBe('after');
  });

  it('splits non-container rows into before and after targets', () => {
    expect(classifyDropPosition(rect, 125, false)).toBe('before');
    expect(classifyDropPosition(rect, 175, false)).toBe('after');
  });
});

describe('drag and drop feedback', () => {
  it('uses the complete supplied element as the native drag image', () => {
    const row = document.createElement('div');
    Object.defineProperty(row, 'getBoundingClientRect', {
      value: () => ({ width: 240, height: 40 }),
    });
    const setDragImage = vi.fn();

    setElementDragImage({ setDragImage } as unknown as DataTransfer, row);

    expect(setDragImage).toHaveBeenCalledWith(row, 16, 20);
  });

  it('fires hover intent once and cancels stale targets', () => {
    vi.useFakeTimers();
    const intent = vi.fn();
    const controller = createHoverIntent(500, intent);

    controller.schedule('folder-a');
    vi.advanceTimersByTime(250);
    controller.schedule('folder-b');
    vi.advanceTimersByTime(499);
    expect(intent).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(intent).toHaveBeenCalledOnce();
    expect(intent).toHaveBeenCalledWith('folder-b');

    controller.destroy();
    vi.useRealTimers();
  });
});
