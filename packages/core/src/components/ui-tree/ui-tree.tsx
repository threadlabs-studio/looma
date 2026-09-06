import { Component, Element, Host, Prop, h } from '@stencil/core';
import { dispatchDetail } from '../../utils/events';
import {
  classifyDropPosition,
  createHoverIntent,
  setElementDragImage,
  type DropPosition,
  type HoverIntentController,
} from '../../utils/drag-drop';

type TreeItemElement = HTMLElement & {
  itemId?: string;
  dropDepth?: number;
  subtreeDepth?: number;
  container?: boolean;
  sortable?: boolean;
  disabled?: boolean;
};

type DepthDropRejection = {
  reason: 'max-depth';
  maxDepth: number;
  resultingDepth: number;
};

type DropRejection = { reason: 'descendant' | 'incompatible' } | DepthDropRejection;

@Component({
  tag: 'ui-tree',
  styleUrl: 'ui-tree.css',
  shadow: true,
})
export class UITree {
  @Element() host: HTMLElement;

  @Prop() label = 'Tree';
  @Prop({ attribute: 'hover-expand-delay' }) hoverExpandDelay = 700;
  /** Maximum resulting item depth accepted by pointer reordering. Zero is unlimited. */
  @Prop({ attribute: 'max-depth' }) maxDepth = 0;

  private source: TreeItemElement | null = null;
  private target: TreeItemElement | null = null;
  private position: DropPosition | null = null;
  private rejectedTarget: TreeItemElement | null = null;
  private rejectedPosition: DropPosition | null = null;
  private rejection: DepthDropRejection | null = null;
  private hoverIntent: HoverIntentController | null = null;
  private structureObserver: MutationObserver | null = null;

  componentDidLoad() {
    this.hoverIntent = createHoverIntent(this.hoverExpandDelay, this.expandTarget);
    this.host.addEventListener('dragstart', this.onDragStart);
    this.host.addEventListener('drag', this.onDrag);
    this.host.addEventListener('dragenter', this.onDragOver);
    this.host.addEventListener('dragover', this.onDragOver);
    this.host.addEventListener('dragleave', this.onDragLeave);
    this.host.addEventListener('drop', this.onDrop);
    this.host.addEventListener('dragend', this.onDragEnd);
    this.host.addEventListener('keydown', this.onKeyDown);
    this.syncStructuralLevels();
    this.structureObserver = new MutationObserver(this.syncStructuralLevels);
    this.structureObserver.observe(this.host, { childList: true, subtree: true });
  }

  disconnectedCallback() {
    this.hoverIntent?.destroy();
    this.host.removeEventListener('dragstart', this.onDragStart);
    this.host.removeEventListener('drag', this.onDrag);
    this.host.removeEventListener('dragenter', this.onDragOver);
    this.host.removeEventListener('dragover', this.onDragOver);
    this.host.removeEventListener('dragleave', this.onDragLeave);
    this.host.removeEventListener('drop', this.onDrop);
    this.host.removeEventListener('dragend', this.onDragEnd);
    this.host.removeEventListener('keydown', this.onKeyDown);
    this.structureObserver?.disconnect();
    this.structureObserver = null;
  }

  private syncStructuralLevels = () => {
    for (const item of Array.from(this.host.querySelectorAll<TreeItemElement>('ui-tree-item'))) {
      item.dispatchEvent(new CustomEvent('ui-tree-structure-sync'));
    }
  };

  private itemFromEvent(event: Event): TreeItemElement | null {
    return (event.composedPath().find(node => (
      node instanceof HTMLElement && node.localName === 'ui-tree-item'
    )) as TreeItemElement | undefined) ?? null;
  }

  private itemId(item: TreeItemElement): string {
    return item.itemId || item.getAttribute('item-id') || '';
  }

  private rowFor(item: TreeItemElement): HTMLElement | null {
    return item.shadowRoot?.querySelector<HTMLElement>('[part="row"]') ?? null;
  }

  private itemAtPoint(clientX: number, clientY: number): TreeItemElement | null {
    let element = this.host.ownerDocument.elementFromPoint(clientX, clientY);
    while (element) {
      if (element.localName === 'ui-tree-item' && this.host.contains(element)) {
        return element as TreeItemElement;
      }
      const root = element.getRootNode();
      element = root instanceof ShadowRoot ? root.host : element.parentElement;
    }
    return null;
  }

  private isWithinTree(node: EventTarget | null): boolean {
    let element: HTMLElement | null = node instanceof HTMLElement ? node : null;
    while (element) {
      if (element === this.host || this.host.contains(element)) return true;
      const root = element.getRootNode();
      element = root instanceof ShadowRoot ? root.host as HTMLElement : element.parentElement;
    }
    return false;
  }

  private acceptsChildren(item: TreeItemElement): boolean {
    return Boolean(item.container ?? item.hasAttribute('container'))
      && !Boolean(item.disabled ?? item.hasAttribute('disabled'));
  }

  private itemMetadata(item: TreeItemElement) {
    return {
      type: item.getAttribute('data-drag-type') || item.getAttribute('drag-type') || 'item',
      scope: item.getAttribute('data-drop-scope') || item.getAttribute('drop-scope') || '',
      accepts: (item.getAttribute('data-accepts') || item.getAttribute('accepts') || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean),
    };
  }

  private constraintDepth(item: TreeItemElement): number {
    if (item.dropDepth !== undefined) return item.dropDepth;
    const dropDepth = item.getAttribute('drop-depth');
    if (dropDepth !== null) return Number(dropDepth);
    return Number(item.getAttribute('aria-level')) || 1;
  }

  private subtreeDepth(item: TreeItemElement): number {
    if (item.subtreeDepth !== undefined) return Math.max(0, Math.floor(item.subtreeDepth));
    const override = item.getAttribute('subtree-depth');
    if (override !== null) return Math.max(0, Math.floor(Number(override)));

    return Array.from(item.querySelectorAll<TreeItemElement>('ui-tree-item')).reduce((deepest, descendant) => {
      let nesting = 0;
      let ancestor = descendant.parentElement?.closest('ui-tree-item') ?? null;
      while (ancestor && ancestor !== item) {
        nesting += 1;
        ancestor = ancestor.parentElement?.closest('ui-tree-item') ?? null;
      }
      return ancestor === item ? Math.max(deepest, nesting + 1) : deepest;
    }, 0);
  }

  private dropRejection(source: TreeItemElement, target: TreeItemElement, position: DropPosition): DropRejection | null {
    // A tree item can never move into (or beside) one of its own descendants.
    // Reject the target before showing any insertion affordance so the preview
    // stays truthful instead of promising a move the consumer must undo.
    if (source.contains(target)) return { reason: 'descendant' };
    const sourceMeta = this.itemMetadata(source);
    const targetMeta = this.itemMetadata(target);
    if (position === 'inside') {
      if (!this.acceptsChildren(target)
        || (targetMeta.accepts.length > 0 && !targetMeta.accepts.includes(sourceMeta.type))) {
        return { reason: 'incompatible' };
      }
    } else if (sourceMeta.type !== targetMeta.type) {
      return { reason: 'incompatible' };
    }

    const maxDepth = Math.max(0, Math.floor(this.maxDepth));
    if (maxDepth > 0) {
      const targetDepth = Math.max(0, Math.floor(this.constraintDepth(target)));
      const subtreeDepth = this.subtreeDepth(source);
      const resultingDepth = targetDepth + (position === 'inside' ? 1 : 0) + subtreeDepth;
      if (resultingDepth > maxDepth) return { reason: 'max-depth', maxDepth, resultingDepth };
    }
    return null;
  }

  private clearTarget() {
    this.target?.removeAttribute('data-drop-position');
    this.target = null;
    this.position = null;
    this.hoverIntent?.cancel();
  }

  private clearRejection() {
    this.rejectedTarget = null;
    this.rejectedPosition = null;
    this.rejection = null;
  }

  private finishDrag() {
    this.source?.removeAttribute('data-dragging');
    this.source = null;
    this.clearTarget();
    this.clearRejection();
  }

  private expandTarget = (itemId: string) => {
    const item = Array.from(this.host.querySelectorAll<TreeItemElement>('ui-tree-item'))
      .find(candidate => this.itemId(candidate) === itemId);
    if (!item || item.getAttribute('aria-expanded') !== 'false') return;
    item.dispatchEvent(new CustomEvent('ui-tree-auto-expand'));
  };

  private onDragStart = (event: DragEvent) => {
    const item = this.itemFromEvent(event);
    if (!item || !Boolean(item.sortable ?? item.hasAttribute('sortable'))
      || Boolean(item.disabled ?? item.hasAttribute('disabled'))) return;
    const fromHandle = event.composedPath().some(node => (
      node instanceof HTMLElement && node.getAttribute('part') === 'drag-handle'
    ));
    if (!fromHandle) {
      event.preventDefault();
      return;
    }
    const sourceId = this.itemId(item);
    const row = this.rowFor(item);
    if (!sourceId || !row) {
      event.preventDefault();
      return;
    }

    this.source = item;
    item.setAttribute('data-dragging', 'true');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', sourceId);
    }
    setElementDragImage(event.dataTransfer, row);
  };

  private updateTarget(target: TreeItemElement | null, clientY: number, dataTransfer: DataTransfer | null): boolean {
    if (!this.source) return false;
    if (!target || target === this.source) {
      this.clearTarget();
      this.clearRejection();
      return false;
    }
    const row = this.rowFor(target);
    if (!row) return false;

    const position = classifyDropPosition(row.getBoundingClientRect(), clientY, this.acceptsChildren(target));
    const rejection = this.dropRejection(this.source, target, position);
    if (rejection) {
      if (dataTransfer) dataTransfer.dropEffect = 'none';
      this.clearTarget();
      if (rejection.reason === 'max-depth') {
        this.rejectedTarget = target;
        this.rejectedPosition = position;
        this.rejection = rejection;
      } else {
        this.clearRejection();
      }
      return false;
    }
    this.clearRejection();
    if (dataTransfer) dataTransfer.dropEffect = 'move';
    if (this.target !== target || this.position !== position) {
      this.clearTarget();
      this.target = target;
      this.position = position;
      target.setAttribute('data-drop-position', position);
    }

    if (position === 'inside' && target.getAttribute('aria-expanded') === 'false') {
      this.hoverIntent?.schedule(this.itemId(target));
    } else {
      this.hoverIntent?.cancel();
    }
    return true;
  }

  private onDrag = (event: DragEvent) => {
    if (!this.source || (event.clientX === 0 && event.clientY === 0)) return;
    const target = this.itemAtPoint(event.clientX, event.clientY);
    // Native dragenter does not fire when a nested source moves onto an
    // ancestor row: the pointer was already inside that ancestor's host. The
    // source drag event still carries the live pointer coordinates, so use it
    // to keep ancestor/outdent feedback current.
    if (target) this.updateTarget(target, event.clientY, event.dataTransfer);
  };

  private onDragOver = (event: DragEvent) => {
    if (!this.source) return;
    const target = this.itemFromEvent(event);
    if (this.updateTarget(target, event.clientY, event.dataTransfer)) {
      event.preventDefault();
    }
  };

  private onDragLeave = (event: DragEvent) => {
    if (this.isWithinTree(event.relatedTarget)) return;
    if (this.itemAtPoint(event.clientX, event.clientY)) return;
    this.clearTarget();
    this.clearRejection();
  };

  private dispatchReorder(source: TreeItemElement, target: TreeItemElement, position: DropPosition) {
    const sourceId = this.itemId(source);
    const targetId = this.itemId(target);
    if (!sourceId || !targetId) return;
    if (position === 'inside') this.expandTarget(targetId);
    const sourceMeta = this.itemMetadata(source);
    const targetMeta = this.itemMetadata(target);
    dispatchDetail(this.host, 'reorder', {
      sourceId,
      targetId,
      position,
      sourceType: sourceMeta.type,
      targetType: targetMeta.type,
      sourceScope: sourceMeta.scope,
      targetScope: targetMeta.scope,
      trigger: 'pointer' as const,
    });
  }

  private dispatchReorderRejected(
    source: TreeItemElement,
    target: TreeItemElement,
    position: DropPosition,
    rejection: DepthDropRejection,
  ) {
    const sourceId = this.itemId(source);
    const targetId = this.itemId(target);
    if (!sourceId || !targetId) return;
    dispatchDetail(this.host, 'reorder-rejected', {
      sourceId,
      targetId,
      position,
      reason: 'max-depth' as const,
      maxDepth: rejection.maxDepth,
      resultingDepth: rejection.resultingDepth,
      trigger: 'pointer' as const,
    });
  }

  private onDrop = (event: DragEvent) => {
    if (!this.source || !this.target || !this.position) return;
    event.preventDefault();
    this.dispatchReorder(this.source, this.target, this.position);
    this.finishDrag();
  };

  private onDragEnd = (event: DragEvent) => {
    if (this.source) {
      if (this.rejectedTarget && this.rejectedPosition && this.rejection) {
        this.dispatchReorderRejected(this.source, this.rejectedTarget, this.rejectedPosition, this.rejection);
        this.finishDrag();
        return;
      }
      const target = this.itemAtPoint(event.clientX, event.clientY);
      if (target && target !== this.source) {
        const row = this.rowFor(target);
        if (row) {
          const position = classifyDropPosition(row.getBoundingClientRect(), event.clientY, this.acceptsChildren(target));
          const rejection = this.dropRejection(this.source, target, position);
          if (!rejection) {
            this.dispatchReorder(this.source, target, position);
          } else if (rejection.reason === 'max-depth') {
            this.dispatchReorderRejected(this.source, target, position, rejection);
          }
        }
      }
    }
    this.finishDrag();
  };

  private visibleItems(): TreeItemElement[] {
    return Array.from(this.host.querySelectorAll<TreeItemElement>('ui-tree-item'))
      .filter(item => item.getClientRects().length > 0 && !item.hasAttribute('disabled'));
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const current = this.itemFromEvent(event);
    if (!current) return;
    const items = this.visibleItems();
    const index = items.indexOf(current);
    if (index < 0) return;

    const next = event.key === 'ArrowDown' ? items[index + 1] : event.key === 'ArrowUp' ? items[index - 1] : null;
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  render() {
    return (
      <Host role="tree" aria-label={this.label || 'Tree'}>
        <slot />
      </Host>
    );
  }
}
