import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../styles.css';

const flushStencil = async () => {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
};

function dragEvent(type: string, clientY: number, dataTransfer: Partial<DataTransfer> = {}) {
  const event = new DragEvent(type, { bubbles: true, composed: true, cancelable: true, clientY });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  return event;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('ui-tree drag and hierarchy interactions', () => {
  it('uses one bounded logical indentation step and complete tree semantics', async () => {
    document.body.innerHTML = `
      <ui-tree label="Project pages">
        <ui-tree-item item-id="root" label="Root" depth="1" container default-expanded>
          <span>Root</span>
          <ui-tree-item slot="children" item-id="child" label="Child" depth="2" container default-expanded>
            <span>Child</span>
            <ui-tree-item slot="children" item-id="grandchild" label="Grandchild" depth="3">
              <span>Grandchild</span>
            </ui-tree-item>
          </ui-tree-item>
        </ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const tree = document.querySelector('ui-tree')!;
    const root = document.querySelector<HTMLElement>('ui-tree-item[item-id="root"]')!;
    const child = document.querySelector<HTMLElement>('ui-tree-item[item-id="child"]')!;
    const grandchild = document.querySelector<HTMLElement>('ui-tree-item[item-id="grandchild"]')!;
    const rootRow = root.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const childRow = child.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const grandchildRow = grandchild.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;

    expect(tree.getAttribute('role')).toBe('tree');
    expect(tree.getAttribute('aria-label')).toBe('Project pages');
    expect(root.getAttribute('role')).toBe('treeitem');
    expect(root.getAttribute('aria-level')).toBe('1');
    expect(root.getAttribute('aria-expanded')).toBe('true');
    expect(child.getAttribute('aria-level')).toBe('2');
    expect(Math.round(childRow.getBoundingClientRect().left - rootRow.getBoundingClientRect().left)).toBe(16);
    expect(Math.round(grandchildRow.getBoundingClientRect().left - childRow.getBoundingClientRect().left)).toBe(16);
  });

  it('shows capped insertion feedback and emits an exact before/after move', async () => {
    document.body.innerHTML = `
      <ui-tree label="Pages">
        <ui-tree-item item-id="a" label="Alpha" sortable><span>Alpha</span></ui-tree-item>
        <ui-tree-item item-id="b" label="Beta" sortable><span>Beta</span></ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const tree = document.querySelector('ui-tree')!;
    const source = document.querySelector<HTMLElement>('ui-tree-item[item-id="a"]')!;
    const target = document.querySelector<HTMLElement>('ui-tree-item[item-id="b"]')!;
    const sourceHandle = source.shadowRoot!.querySelector<HTMLElement>('[part="drag-handle"]')!;
    const sourceRow = source.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const targetRow = target.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const setDragImage = vi.fn();
    const moves: unknown[] = [];
    tree.addEventListener('reorder', event => moves.push((event as CustomEvent).detail));

    sourceHandle.dispatchEvent(dragEvent('dragstart', 0, {
      setData: vi.fn(),
      setDragImage,
      effectAllowed: 'move',
    }));
    const targetRect = targetRow.getBoundingClientRect();
    targetRow.dispatchEvent(dragEvent('dragover', targetRect.top + 2, { dropEffect: 'move' }));
    await flushStencil();

    expect(source.getAttribute('data-dragging')).toBe('true');
    expect(setDragImage).toHaveBeenCalledWith(
      sourceRow,
      16,
      Math.round(sourceRow.getBoundingClientRect().height / 2),
    );
    expect(target.getAttribute('data-drop-position')).toBe('before');
    const indicator = target.shadowRoot!.querySelector<HTMLElement>('[part="drop-indicator"]')!;
    expect(getComputedStyle(indicator).display).not.toBe('none');
    expect(getComputedStyle(indicator, '::before').borderRadius).not.toBe('0px');

    targetRow.dispatchEvent(dragEvent('drop', targetRect.top + 2, { dropEffect: 'move' }));
    expect(moves).toEqual([{
      sourceId: 'a',
      targetId: 'b',
      position: 'before',
      sourceType: 'item',
      targetType: 'item',
      sourceScope: '',
      targetScope: '',
      trigger: 'pointer',
    }]);
    expect(source.hasAttribute('data-dragging')).toBe(false);
    expect(target.hasAttribute('data-drop-position')).toBe(false);
  });

  it('suppresses misleading insertion feedback for incompatible sibling kinds', async () => {
    document.body.innerHTML = `
      <ui-tree label="Pages">
        <ui-tree-item item-id="page" label="Page" drag-type="page" sortable><span>Page</span></ui-tree-item>
        <ui-tree-item item-id="folder" label="Folder" drag-type="folder" accepts="page,folder" container>
          <span>Folder</span>
        </ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const source = document.querySelector<HTMLElement>('ui-tree-item[item-id="page"]')!;
    const folder = document.querySelector<HTMLElement>('ui-tree-item[item-id="folder"]')!;
    const sourceHandle = source.shadowRoot!.querySelector<HTMLElement>('[part="drag-handle"]')!;
    const folderRow = folder.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    sourceHandle.dispatchEvent(dragEvent('dragstart', 0, { setData: vi.fn(), setDragImage: vi.fn() }));
    const rect = folderRow.getBoundingClientRect();

    folderRow.dispatchEvent(dragEvent('dragover', rect.top + 1, { dropEffect: 'move' }));
    await flushStencil();
    expect(folder.hasAttribute('data-drop-position')).toBe(false);

    folderRow.dispatchEvent(dragEvent('dragover', rect.top + (rect.height / 2), { dropEffect: 'move' }));
    await flushStencil();
    expect(folder.getAttribute('data-drop-position')).toBe('inside');
  });

  it('never advertises a drop into a source item descendant', async () => {
    document.body.innerHTML = `
      <ui-tree label="Pages">
        <ui-tree-item item-id="folder" label="Folder" drag-type="folder" accepts="page,folder" sortable container default-expanded>
          <span>Folder</span>
          <ui-tree-item slot="children" item-id="child" label="Child folder" drag-type="folder" accepts="page,folder" sortable container>
            <span>Child folder</span>
          </ui-tree-item>
        </ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const source = document.querySelector<HTMLElement>('ui-tree-item[item-id="folder"]')!;
    const child = document.querySelector<HTMLElement>('ui-tree-item[item-id="child"]')!;
    const sourceHandle = source.shadowRoot!.querySelector<HTMLElement>('[part="drag-handle"]')!;
    const childRow = child.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;

    sourceHandle.dispatchEvent(dragEvent('dragstart', 0, { setData: vi.fn(), setDragImage: vi.fn() }));
    const rect = childRow.getBoundingClientRect();
    childRow.dispatchEvent(dragEvent('dragover', rect.top + (rect.height / 2), { dropEffect: 'move' }));
    await flushStencil();

    expect(child.hasAttribute('data-drop-position')).toBe(false);
  });

  it('distinguishes folder containment and expands a closed target after hover intent', async () => {
    document.body.innerHTML = `
      <ui-tree label="Pages" hover-expand-delay="20">
        <ui-tree-item item-id="page" label="Page" sortable><span>Page</span></ui-tree-item>
        <ui-tree-item item-id="folder" label="Folder" sortable container>
          <span>Folder</span>
          <ui-tree-item slot="children" item-id="nested" label="Nested"><span>Nested</span></ui-tree-item>
        </ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const tree = document.querySelector('ui-tree')!;
    const source = document.querySelector<HTMLElement>('ui-tree-item[item-id="page"]')!;
    const folder = document.querySelector<HTMLElement>('ui-tree-item[item-id="folder"]')!;
    const sourceHandle = source.shadowRoot!.querySelector<HTMLElement>('[part="drag-handle"]')!;
    const folderRow = folder.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const expanded: unknown[] = [];
    folder.addEventListener('expand', event => expanded.push((event as CustomEvent).detail));

    sourceHandle.dispatchEvent(dragEvent('dragstart', 0, { setData: vi.fn(), setDragImage: vi.fn() }));
    const rect = folderRow.getBoundingClientRect();
    folderRow.dispatchEvent(dragEvent('dragover', rect.top + (rect.height / 2), { dropEffect: 'move' }));
    await flushStencil();

    expect(folder.getAttribute('data-drop-position')).toBe('inside');
    expect(folder.getAttribute('aria-expanded')).toBe('false');
    await new Promise(resolve => setTimeout(resolve, 30));
    await flushStencil();
    expect(folder.getAttribute('aria-expanded')).toBe('true');
    expect(expanded).toEqual([{ id: 'folder', expanded: true, trigger: 'pointer' }]);
  });
});
