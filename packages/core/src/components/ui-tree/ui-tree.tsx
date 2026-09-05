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
  container?: boolean;
  sortable?: boolean;
  disabled?: boolean;
};

@Component({
  tag: 'ui-tree',
  styleUrl: 'ui-tree.css',
  shadow: true,
})
export class UITree {
  @Element() host: HTMLElement;

  @Prop() label = 'Tree';
  @Prop({ attribute: 'hover-expand-delay' }) hoverExpandDelay = 700;

  private source: TreeItemElement | null = null;
  private target: TreeItemElement | null = null;
  private position: DropPosition | null = null;
  private hoverIntent: HoverIntentController | null = null;

  componentDidLoad() {
    this.hoverIntent = createHoverIntent(this.hoverExpandDelay, this.expandTarget);
    this.host.addEventListener('dragstart', this.onDragStart);
    this.host.addEventListener('dragover', this.onDragOver);
    this.host.addEventListener('dragleave', this.onDragLeave);
    this.host.addEventListener('drop', this.onDrop);
    this.host.addEventListener('dragend', this.onDragEnd);
    this.host.addEventListener('keydown', this.onKeyDown);
  }

  disconnectedCallback() {
    this.hoverIntent?.destroy();
    this.host.removeEventListener('dragstart', this.onDragStart);
    this.host.removeEventListener('dragover', this.onDragOver);
    this.host.removeEventListener('dragleave', this.onDragLeave);
    this.host.removeEventListener('drop', this.onDrop);
    this.host.removeEventListener('dragend', this.onDragEnd);
    this.host.removeEventListener('keydown', this.onKeyDown);
  }

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

  private permitsDrop(source: TreeItemElement, target: TreeItemElement, position: DropPosition): boolean {
    // A tree item can never move into (or beside) one of its own descendants.
    // Reject the target before showing any insertion affordance so the preview
    // stays truthful instead of promising a move the consumer must undo.
    if (source.contains(target)) return false;
    const sourceMeta = this.itemMetadata(source);
    const targetMeta = this.itemMetadata(target);
    if (position === 'inside') {
      return this.acceptsChildren(target)
        && (targetMeta.accepts.length === 0 || targetMeta.accepts.includes(sourceMeta.type));
    }
    return sourceMeta.type === targetMeta.type;
  }

  private clearTarget() {
    this.target?.removeAttribute('data-drop-position');
    this.target = null;
    this.position = null;
    this.hoverIntent?.cancel();
  }

  private finishDrag() {
    this.source?.removeAttribute('data-dragging');
    this.source = null;
    this.clearTarget();
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

  private onDragOver = (event: DragEvent) => {
    if (!this.source) return;
    const target = this.itemFromEvent(event);
    if (!target || target === this.source) {
      this.clearTarget();
      return;
    }
    const row = this.rowFor(target);
    if (!row) return;

    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const position = classifyDropPosition(row.getBoundingClientRect(), event.clientY, this.acceptsChildren(target));
    if (!this.permitsDrop(this.source, target, position)) {
      this.clearTarget();
      return;
    }
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
  };

  private onDragLeave = (event: DragEvent) => {
    const related = event.relatedTarget;
    if (related instanceof Node && this.host.contains(related)) return;
    this.clearTarget();
  };

  private onDrop = (event: DragEvent) => {
    if (!this.source || !this.target || !this.position) return;
    event.preventDefault();
    const sourceId = this.itemId(this.source);
    const targetId = this.itemId(this.target);
    if (sourceId && targetId) {
      const sourceMeta = this.itemMetadata(this.source);
      const targetMeta = this.itemMetadata(this.target);
      dispatchDetail(this.host, 'reorder', {
        sourceId,
        targetId,
        position: this.position,
        sourceType: sourceMeta.type,
        targetType: targetMeta.type,
        sourceScope: sourceMeta.scope,
        targetScope: targetMeta.scope,
        trigger: 'pointer' as const,
      });
    }
    this.finishDrag();
  };

  private onDragEnd = () => {
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
