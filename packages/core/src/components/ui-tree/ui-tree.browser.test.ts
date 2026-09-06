import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from '@vitest/browser/context';

import '../../styles.css';
import { initializeInputModality } from '../../input-modality';

const flushStencil = async () => {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
};

function dragEvent(type: string, clientY: number, dataTransfer: Partial<DataTransfer> = {}, clientX = 0) {
  const event = new DragEvent(type, { bubbles: true, composed: true, cancelable: true, clientX, clientY });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  return event;
}

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-ui-input-modality');
  vi.restoreAllMocks();
});

describe('ui-tree drag and hierarchy interactions', () => {
  it('stays compact for desktop and animates to touch targets only after real touch input', async () => {
    initializeInputModality(document);
    document.body.innerHTML = `
      <ui-tree label="Pages">
        <ui-tree-item item-id="page" label="Page"><span>Page</span></ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const item = document.querySelector<HTMLElement>('ui-tree-item')!;
    const row = item.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    expect(row.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(row).fontSize).toBe('15px');

    document.body.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      pointerType: 'touch',
    }));
    expect(document.documentElement.dataset.uiInputModality).toBe('touch');
    expect(getComputedStyle(item).getPropertyValue('--ui-tree-row-min-height').trim()).toBe('44px');
    await new Promise(resolve => setTimeout(resolve, 220));
    expect(row.getBoundingClientRect().height).toBe(44);
  });

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

    const incompatibleTransfer = { dropEffect: 'move' as DataTransfer['dropEffect'] };
    const incompatibleDrag = dragEvent('dragover', rect.top + 1, incompatibleTransfer);
    folderRow.dispatchEvent(incompatibleDrag);
    await flushStencil();
    expect(folder.hasAttribute('data-drop-position')).toBe(false);
    expect(incompatibleDrag.defaultPrevented).toBe(false);
    expect(incompatibleTransfer.dropEffect).toBe('none');

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

  it('rejects a move whose deepest descendant would exceed the configured depth', async () => {
    document.body.innerHTML = `
      <ui-tree label="Folders" max-depth="3">
        <ui-tree-item item-id="source" label="Source" depth="1" subtree-depth="1" drag-type="folder" accepts="folder" sortable container>
          <span>Source</span>
        </ui-tree-item>
        <ui-tree-item item-id="target" label="Target" depth="4" drop-depth="2" drag-type="folder" accepts="folder" sortable container>
          <span>Target</span>
        </ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const tree = document.querySelector('ui-tree')!;
    const source = document.querySelector<HTMLElement>('ui-tree-item[item-id="source"]')!;
    const target = document.querySelector<HTMLElement>('ui-tree-item[item-id="target"]')!;
    const sourceHandle = source.shadowRoot!.querySelector<HTMLElement>('[part="drag-handle"]')!;
    const targetRow = target.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const rect = targetRow.getBoundingClientRect();
    const clientX = rect.left + (rect.width / 2);
    const clientY = rect.top + (rect.height / 2);
    const rejected: unknown[] = [];
    const moves: unknown[] = [];
    tree.addEventListener('reorder-rejected', event => rejected.push((event as CustomEvent).detail));
    tree.addEventListener('reorder', event => moves.push((event as CustomEvent).detail));
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(target);

    sourceHandle.dispatchEvent(dragEvent('dragstart', 0, { setData: vi.fn(), setDragImage: vi.fn() }));
    const transfer = { dropEffect: 'move' as DataTransfer['dropEffect'] };
    const hovering = dragEvent('dragover', clientY, transfer, clientX);
    targetRow.dispatchEvent(hovering);

    expect(hovering.defaultPrevented).toBe(false);
    expect(transfer.dropEffect).toBe('none');
    expect(target.hasAttribute('data-drop-position')).toBe(false);

    sourceHandle.dispatchEvent(dragEvent('dragend', clientY, {}, clientX));
    expect(moves).toEqual([]);
    expect(rejected).toEqual([{
      sourceId: 'source',
      targetId: 'target',
      position: 'inside',
      reason: 'max-depth',
      maxDepth: 3,
      resultingDepth: 4,
      trigger: 'pointer',
    }]);
  });

  it('leaves depth validation opt-in for item kinds with different nesting semantics', async () => {
    document.body.innerHTML = `
      <ui-tree label="Pages" max-depth="3">
        <ui-tree-item item-id="page" label="Page" drag-type="page" sortable>
          <span>Page</span>
        </ui-tree-item>
        <ui-tree-item item-id="folder" label="Folder" depth="4" drop-depth="3" drag-type="folder" accepts="page,folder" container>
          <span>Folder</span>
        </ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const page = document.querySelector<HTMLElement>('ui-tree-item[item-id="page"]')!;
    const folder = document.querySelector<HTMLElement>('ui-tree-item[item-id="folder"]')!;
    const pageHandle = page.shadowRoot!.querySelector<HTMLElement>('[part="drag-handle"]')!;
    const folderRow = folder.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const rect = folderRow.getBoundingClientRect();
    const transfer = { dropEffect: 'none' as DataTransfer['dropEffect'] };

    pageHandle.dispatchEvent(dragEvent('dragstart', 0, { setData: vi.fn(), setDragImage: vi.fn() }));
    const hovering = dragEvent('dragover', rect.top + (rect.height / 2), transfer);
    folderRow.dispatchEvent(hovering);

    expect(hovering.defaultPrevented).toBe(true);
    expect(transfer.dropEffect).toBe('move');
    expect(folder.getAttribute('data-drop-position')).toBe('inside');
  });

  it('expands a closed folder before committing a containment drop', async () => {
    document.body.innerHTML = `
      <ui-tree label="Pages">
        <ui-tree-item item-id="page" label="Page" drag-type="page" sortable><span>Page</span></ui-tree-item>
        <ui-tree-item item-id="folder" label="Folder" drag-type="folder" drop-scope="root" accepts="page,folder" container>
          <span>Folder</span>
        </ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const tree = document.querySelector('ui-tree')!;
    const source = document.querySelector<HTMLElement>('ui-tree-item[item-id="page"]')!;
    const folder = document.querySelector<HTMLElement>('ui-tree-item[item-id="folder"]')!;
    const sourceHandle = source.shadowRoot!.querySelector<HTMLElement>('[part="drag-handle"]')!;
    const folderRow = folder.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const moves: unknown[] = [];
    const eventOrder: string[] = [];
    folder.addEventListener('expand', () => eventOrder.push('expand'));
    tree.addEventListener('reorder', event => {
      eventOrder.push('reorder');
      moves.push((event as CustomEvent).detail);
    });

    sourceHandle.dispatchEvent(dragEvent('dragstart', 0, { setData: vi.fn(), setDragImage: vi.fn() }));
    const rect = folderRow.getBoundingClientRect();
    folderRow.dispatchEvent(dragEvent('dragover', rect.top + (rect.height / 2), { dropEffect: 'move' }));
    expect(folder.getAttribute('data-drop-position')).toBe('inside');

    folderRow.dispatchEvent(dragEvent('drop', rect.top + (rect.height / 2), { dropEffect: 'move' }));
    await flushStencil();
    expect(folder.getAttribute('aria-expanded')).toBe('true');
    expect(eventOrder).toEqual(['expand', 'reorder']);
    expect(moves).toEqual([expect.objectContaining({
      sourceId: 'page',
      targetId: 'folder',
      position: 'inside',
      sourceType: 'page',
      targetType: 'folder',
      targetScope: 'root',
    })]);
  });

  it('commits a short native drag that ends on a folder before dragover fires', async () => {
    document.body.innerHTML = `
      <ui-tree label="Pages">
        <ui-tree-item item-id="source" label="Source" drag-type="folder" accepts="page,folder" sortable draggable="true" part="drag-handle" container>
          <span>Source</span>
        </ui-tree-item>
        <ui-tree-item item-id="folder" label="Folder" drag-type="folder" accepts="page,folder" sortable draggable="true" part="drag-handle" container>
          <span>Folder</span>
        </ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const tree = document.querySelector('ui-tree')!;
    const source = document.querySelector<HTMLElement>('ui-tree-item[item-id="source"]')!;
    const folder = document.querySelector<HTMLElement>('ui-tree-item[item-id="folder"]')!;
    const folderRow = folder.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const folderRect = folderRow.getBoundingClientRect();
    const clientX = folderRect.left + (folderRect.width / 2);
    const clientY = folderRect.top + (folderRect.height / 2);
    const elementAtDropPoint = document.elementFromPoint(clientX, clientY);
    const moves: unknown[] = [];
    tree.addEventListener('reorder', event => moves.push((event as CustomEvent).detail));

    expect(elementAtDropPoint?.localName).toBe('ui-tree-item');
    expect((elementAtDropPoint as HTMLElement).getAttribute('item-id')).toBe('folder');

    source.dispatchEvent(dragEvent('dragstart', clientY, {
      setData: vi.fn(),
      setDragImage: vi.fn(),
      effectAllowed: 'move',
    }, clientX));
    expect(source.getAttribute('data-dragging')).toBe('true');
    source.dispatchEvent(dragEvent('dragend', clientY, {}, clientX));

    expect(moves).toEqual([{
      sourceId: 'source',
      targetId: 'folder',
      position: 'inside',
      sourceType: 'folder',
      targetType: 'folder',
      sourceScope: '',
      targetScope: '',
      trigger: 'pointer',
    }]);

    source.dispatchEvent(dragEvent('dragstart', clientY, {
      setData: vi.fn(),
      setDragImage: vi.fn(),
    }, clientX));
    source.dispatchEvent(dragEvent('dragend', -1, {}, -1));
    expect(moves).toHaveLength(1);
  });

  it('supports a browser-driven full-row drag into a folder', async () => {
    document.body.innerHTML = `
      <ui-tree label="Pages">
        <ui-tree-item item-id="source" label="Source" drag-type="folder" accepts="page,folder" sortable draggable="true" part="drag-handle" container>
          <span>Source</span>
        </ui-tree-item>
        <ui-tree-item item-id="folder" label="Folder" drag-type="folder" accepts="page,folder" sortable draggable="true" part="drag-handle" container>
          <span>Folder</span>
        </ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const tree = document.querySelector('ui-tree')!;
    const source = document.querySelector<HTMLElement>('ui-tree-item[item-id="source"]')!;
    const folder = document.querySelector<HTMLElement>('ui-tree-item[item-id="folder"]')!;
    const folderRow = folder.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const folderRect = folderRow.getBoundingClientRect();
    const moves: unknown[] = [];
    tree.addEventListener('reorder', event => moves.push((event as CustomEvent).detail));

    await userEvent.dragAndDrop(source, folder, {
      targetPosition: { x: folderRect.width / 2, y: folderRect.height / 2 },
    });

    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({
      sourceId: 'source',
      targetId: 'folder',
      position: 'inside',
      trigger: 'pointer',
    });
  });

  it('keeps drop feedback while dragleave crosses a tree item shadow boundary', async () => {
    document.body.innerHTML = `
      <ui-tree label="Pages">
        <ui-tree-item item-id="source" label="Source" drag-type="folder" accepts="folder" sortable container>
          <span>Source</span>
        </ui-tree-item>
        <ui-tree-item item-id="target" label="Target" drag-type="folder" accepts="folder" sortable container>
          <span>Target</span>
        </ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const source = document.querySelector<HTMLElement>('ui-tree-item[item-id="source"]')!;
    const target = document.querySelector<HTMLElement>('ui-tree-item[item-id="target"]')!;
    const sourceHandle = source.shadowRoot!.querySelector<HTMLElement>('[part="drag-handle"]')!;
    const targetRow = target.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const targetLabel = target.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!;
    const targetRect = targetRow.getBoundingClientRect();

    sourceHandle.dispatchEvent(dragEvent('dragstart', 0, { setData: vi.fn(), setDragImage: vi.fn() }));
    targetRow.dispatchEvent(dragEvent('dragover', targetRect.top + (targetRect.height / 2), { dropEffect: 'move' }));
    expect(target.getAttribute('data-drop-position')).toBe('inside');

    const shadowTransition = dragEvent('dragleave', targetRect.top + (targetRect.height / 2));
    Object.defineProperty(shadowTransition, 'relatedTarget', { value: targetLabel });
    targetRow.dispatchEvent(shadowTransition);

    expect(target.getAttribute('data-drop-position')).toBe('inside');
  });

  it('establishes drop feedback as soon as a native drag enters a row', async () => {
    document.body.innerHTML = `
      <ui-tree label="Pages">
        <ui-tree-item item-id="source" label="Source" drag-type="folder" accepts="folder" sortable container>
          <span>Source</span>
        </ui-tree-item>
        <ui-tree-item item-id="target" label="Target" drag-type="folder" accepts="folder" sortable container>
          <span>Target</span>
        </ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const source = document.querySelector<HTMLElement>('ui-tree-item[item-id="source"]')!;
    const target = document.querySelector<HTMLElement>('ui-tree-item[item-id="target"]')!;
    const sourceHandle = source.shadowRoot!.querySelector<HTMLElement>('[part="drag-handle"]')!;
    const targetRow = target.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const targetRect = targetRow.getBoundingClientRect();

    sourceHandle.dispatchEvent(dragEvent('dragstart', 0, { setData: vi.fn(), setDragImage: vi.fn() }));
    const entering = dragEvent('dragenter', targetRect.bottom - 1, { dropEffect: 'move' });
    targetRow.dispatchEvent(entering);

    expect(entering.defaultPrevented).toBe(true);
    expect(target.getAttribute('data-drop-position')).toBe('after');
  });

  it('tracks an ancestor row from source drag coordinates when dragenter cannot refire', async () => {
    document.body.innerHTML = `
      <ui-tree label="Folders">
        <ui-tree-item item-id="target" label="Target" drag-type="folder" accepts="folder" sortable container default-expanded>
          <span>Target</span>
          <ui-tree-item slot="children" item-id="source" label="Source" drag-type="folder" accepts="folder" sortable container>
            <span>Source</span>
          </ui-tree-item>
        </ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const source = document.querySelector<HTMLElement>('ui-tree-item[item-id="source"]')!;
    const target = document.querySelector<HTMLElement>('ui-tree-item[item-id="target"]')!;
    const sourceHandle = source.shadowRoot!.querySelector<HTMLElement>('[part="drag-handle"]')!;
    const targetRow = target.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const targetRect = targetRow.getBoundingClientRect();
    const clientX = targetRect.left + (targetRect.width / 2);
    const clientY = targetRect.bottom - 1;

    sourceHandle.dispatchEvent(dragEvent('dragstart', 0, { setData: vi.fn(), setDragImage: vi.fn() }));
    sourceHandle.dispatchEvent(dragEvent('drag', clientY, { dropEffect: 'move' }, clientX));

    expect(target.getAttribute('data-drop-position')).toBe('after');
    const indicator = Array.from(target.shadowRoot!.querySelectorAll<HTMLElement>('[part="drop-indicator"]'))
      .find(candidate => getComputedStyle(candidate).display !== 'none');
    expect(indicator).toBeDefined();
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

    expect(folder.getAttribute('data-drop-position')).toBe('inside');
    expect(folder.getAttribute('aria-expanded')).toBe('false');
    await new Promise(resolve => setTimeout(resolve, 30));
    await flushStencil();
    expect(folder.getAttribute('aria-expanded')).toBe('true');
    expect(expanded).toEqual([{ id: 'folder', expanded: true, trigger: 'pointer' }]);

    const nested = document.querySelector<HTMLElement>('ui-tree-item[item-id="nested"]')!;
    const nestedRow = nested.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const nestedRect = nestedRow.getBoundingClientRect();
    nestedRow.dispatchEvent(dragEvent('dragover', nestedRect.top + 1, { dropEffect: 'move' }));
    await flushStencil();
    expect(nested.getAttribute('data-drop-position')).toBe('before');
    const nestedIndicator = Array.from(nested.shadowRoot!.querySelectorAll<HTMLElement>('[part="drop-indicator"]'))
      .find(indicator => getComputedStyle(indicator).display !== 'none');
    expect(nestedIndicator).toBeDefined();
    expect(nestedIndicator!.getBoundingClientRect().left).toBeGreaterThan(folderRow.getBoundingClientRect().left);
  });

  it('keeps nested insertion and parent-level outdent feedback aligned with the resulting hierarchy', async () => {
    document.body.innerHTML = `
      <ui-tree label="Folders">
        <ui-tree-item item-id="source" label="Source" depth="1" drag-type="folder" accepts="folder" sortable container>
          <span>Source</span>
        </ui-tree-item>
        <ui-tree-item item-id="target" label="Target" depth="1" drag-type="folder" drop-scope="root" accepts="folder" sortable container default-expanded>
          <span>Target</span>
          <ui-tree-item slot="children" item-id="child-a" label="Child A" depth="2" drag-type="folder" drop-scope="target" accepts="folder" sortable container>
            <span>Child A</span>
          </ui-tree-item>
          <ui-tree-item slot="children" item-id="child-b" label="Child B" depth="2" drag-type="folder" drop-scope="target" accepts="folder" sortable container>
            <span>Child B</span>
          </ui-tree-item>
        </ui-tree-item>
      </ui-tree>
    `;
    await flushStencil();

    const tree = document.querySelector('ui-tree')!;
    const source = document.querySelector<HTMLElement>('ui-tree-item[item-id="source"]')!;
    const target = document.querySelector<HTMLElement>('ui-tree-item[item-id="target"]')!;
    const childA = document.querySelector<HTMLElement>('ui-tree-item[item-id="child-a"]')!;
    const childB = document.querySelector<HTMLElement>('ui-tree-item[item-id="child-b"]')!;
    const sourceHandle = source.shadowRoot!.querySelector<HTMLElement>('[part="drag-handle"]')!;
    const targetRow = target.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const childARow = childA.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const childBRow = childB.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!;
    const moves: unknown[] = [];
    tree.addEventListener('reorder', event => moves.push((event as CustomEvent).detail));

    sourceHandle.dispatchEvent(dragEvent('dragstart', 0, { setData: vi.fn(), setDragImage: vi.fn() }));

    const targetRect = targetRow.getBoundingClientRect();
    targetRow.dispatchEvent(dragEvent('dragover', targetRect.top + (targetRect.height / 2), { dropEffect: 'move' }));
    expect(target.getAttribute('data-drop-position')).toBe('inside');

    const childBRect = childBRow.getBoundingClientRect();
    childBRow.dispatchEvent(dragEvent('dragover', childBRect.top + 1, { dropEffect: 'move' }));
    await flushStencil();
    expect(childB.getAttribute('data-drop-position')).toBe('before');
    const nestedIndicator = Array.from(childB.shadowRoot!.querySelectorAll<HTMLElement>('[part="drop-indicator"]'))
      .find(indicator => getComputedStyle(indicator).display !== 'none')!;
    expect(Math.round(nestedIndicator.getBoundingClientRect().left - targetRow.getBoundingClientRect().left)).toBe(17);

    childBRow.dispatchEvent(dragEvent('drop', childBRect.top + 1, { dropEffect: 'move' }));
    expect(moves.at(-1)).toMatchObject({
      sourceId: 'source',
      targetId: 'child-b',
      position: 'before',
      sourceScope: '',
      targetScope: 'target',
    });

    const childAHandle = childA.shadowRoot!.querySelector<HTMLElement>('[part="drag-handle"]')!;
    childAHandle.dispatchEvent(dragEvent('dragstart', 0, { setData: vi.fn(), setDragImage: vi.fn() }));
    targetRow.dispatchEvent(dragEvent('dragover', targetRect.bottom - 1, { dropEffect: 'move' }));
    await flushStencil();
    expect(target.getAttribute('data-drop-position')).toBe('after');
    const parentIndicator = Array.from(target.shadowRoot!.querySelectorAll<HTMLElement>('[part="drop-indicator"]'))
      .find(indicator => getComputedStyle(indicator).display !== 'none')!;
    const targetBounds = target.getBoundingClientRect();
    const parentIndicatorBounds = parentIndicator.getBoundingClientRect();
    expect(Math.round(parentIndicatorBounds.left)).toBe(Math.round(targetRow.getBoundingClientRect().left + 1));
    expect(Math.round((parentIndicatorBounds.top + parentIndicatorBounds.bottom) / 2)).toBe(Math.round(targetBounds.bottom));
    expect(parentIndicatorBounds.top).toBeGreaterThan(childARow.getBoundingClientRect().bottom);

    targetRow.dispatchEvent(dragEvent('drop', targetRect.bottom - 1, { dropEffect: 'move' }));
    expect(moves.at(-1)).toMatchObject({
      sourceId: 'child-a',
      targetId: 'target',
      position: 'after',
      sourceScope: 'target',
      targetScope: 'root',
    });
  });
});
