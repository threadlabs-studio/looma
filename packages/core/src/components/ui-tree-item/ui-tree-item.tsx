import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';
import { dispatchDetail, eventToTrigger } from '../../utils/events';
import { loomaIconMarkup } from '../../icons';

type TreeTrigger = 'keyboard' | 'pointer' | 'programmatic';

@Component({
  tag: 'ui-tree-item',
  styleUrl: 'ui-tree-item.css',
  shadow: true,
})
export class UITreeItem {
  @Element() host: HTMLElement;

  /** Stable application identifier emitted by tree interaction events. */
  @Prop({ attribute: 'item-id' }) itemId = '';
  /** Accessible name used by the disclosure and drag handle. */
  @Prop() label = '';
  /** Application hierarchy depth override used for drop constraints. Defaults to structural nesting. */
  @Prop({ attribute: 'drop-depth' }) dropDepth?: number;
  /** Virtualized-tree descendant-depth override for the tree's max-depth drop constraint. */
  @Prop({ attribute: 'subtree-depth' }) subtreeDepth?: number;
  /** Whether this item accepts children and exposes disclosure behavior. */
  @Prop() container = false;
  /** Whether this item participates in pointer drag and drop. */
  @Prop() sortable = false;
  /** Application-defined kind used to reject incompatible sibling drops. */
  @Prop({ attribute: 'drag-type' }) dragType = 'item';
  /** Application-defined parent/list identity included with reorder events. */
  @Prop({ attribute: 'drop-scope' }) dropScope = '';
  /** Comma-separated drag kinds accepted as children. Empty accepts every kind. */
  @Prop() accepts = '';
  /** Controlled expansion value. When omitted, `default-expanded` initializes uncontrolled state. */
  @Prop() expanded?: boolean;
  /** Initial uncontrolled expansion value. */
  @Prop({ attribute: 'default-expanded' }) defaultExpanded = false;
  @Prop() selected = false;
  @Prop() disabled = false;

  @State() internalExpanded = false;
  @State() structuralLevel = 1;
  @State() tabStop = false;

  @Watch('expanded')
  syncExpandedFromProp() {
    // A defined prop owns the rendered state; clearing it resumes the current
    // uncontrolled state instead of replaying the initial default.
    if (this.expanded !== undefined) this.internalExpanded = this.expanded;
  }

  componentWillLoad() {
    this.internalExpanded = this.expanded ?? this.defaultExpanded;
    this.updateStructuralLevel();
  }

  connectedCallback() {
    this.host.addEventListener('ui-tree-auto-expand', this.onAutoExpand);
    this.host.addEventListener('ui-tree-structure-sync', this.updateStructuralLevel);
    this.host.addEventListener('ui-tree-roving-tab-stop', this.onRovingTabStop);
    this.host.addEventListener('ui-tree-request-expanded', this.onExpansionRequest);
  }

  disconnectedCallback() {
    this.host.removeEventListener('ui-tree-auto-expand', this.onAutoExpand);
    this.host.removeEventListener('ui-tree-structure-sync', this.updateStructuralLevel);
    this.host.removeEventListener('ui-tree-roving-tab-stop', this.onRovingTabStop);
    this.host.removeEventListener('ui-tree-request-expanded', this.onExpansionRequest);
  }

  private updateStructuralLevel = () => {
    const tree = this.host.closest('ui-tree');
    let ancestor = this.host.parentElement?.closest('ui-tree-item') ?? null;
    let level = 1;

    while (ancestor && tree?.contains(ancestor)) {
      level += 1;
      ancestor = ancestor.parentElement?.closest('ui-tree-item') ?? null;
    }

    if (this.structuralLevel !== level) this.structuralLevel = level;
  };

  private setExpanded(expanded: boolean, trigger: TreeTrigger) {
    const current = this.isExpanded();
    if (!this.container || this.disabled || current === expanded) return;
    if (this.expanded === undefined) this.internalExpanded = expanded;
    dispatchDetail(this.host, 'expand', { id: this.itemId, expanded, trigger });
    this.host.dispatchEvent(new CustomEvent('ui-tree-expansion-change'));
  }

  private isExpanded(): boolean {
    return this.expanded ?? this.internalExpanded;
  }

  private onAutoExpand = () => {
    this.setExpanded(true, 'pointer');
  };

  private onRovingTabStop = (event: Event) => {
    this.tabStop = Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active) && !this.disabled;
  };

  private onExpansionRequest = (event: Event) => {
    const detail = (event as CustomEvent<{ expanded?: boolean; trigger?: TreeTrigger }>).detail;
    if (typeof detail?.expanded === 'boolean') this.setExpanded(detail.expanded, detail.trigger ?? 'keyboard');
  };

  private onDisclosureClick = (event: MouseEvent) => {
    event.stopPropagation();
    this.setExpanded(!this.isExpanded(), eventToTrigger(event));
  };

  private onDisclosureKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    event.stopPropagation();
    this.setExpanded(event.key === 'ArrowRight', 'keyboard');
  };

  private onRowClick = (event: MouseEvent) => {
    if (!this.container || this.disabled) return;
    const path = event.composedPath();
    const interactive = path.some((node) => node instanceof HTMLElement && (
      node.matches('a, button, input, select, textarea, [role="button"], [role="link"]')
      || node.getAttribute('slot') === 'actions'
    ));
    if (!interactive) this.setExpanded(!this.isExpanded(), eventToTrigger(event));
  };

  render() {
    const level = this.structuralLevel;
    const expanded = this.isExpanded();
    const disclosureLabel = `${expanded ? 'Collapse' : 'Expand'} ${this.label || 'item'}`;
    const dragLabel = `Drag ${this.label || 'item'} to reorder`;

    return (
      <Host
        role="treeitem"
        aria-label={this.label || undefined}
        aria-level={String(level)}
        aria-expanded={this.container ? String(expanded) : undefined}
        aria-selected={String(this.selected)}
        aria-disabled={this.disabled ? 'true' : undefined}
        data-container={this.container ? '' : undefined}
        data-selected={this.selected ? '' : undefined}
        data-disabled={this.disabled ? '' : undefined}
        data-drag-type={this.dragType || 'item'}
        data-drop-scope={this.dropScope || undefined}
        data-accepts={this.accepts || undefined}
        tabIndex={this.disabled || !this.tabStop ? -1 : 0}
        style={{
          '--ui-tree-item-depth': String(level - 1),
          'margin-inline-start': level > 1 ? 'var(--ui-tree-indent, 16px)' : '0px',
        }}
      >
        <div class="row" part="row" onClick={this.onRowClick}>
          {this.sortable && !this.disabled ? (
            <button
              class="drag-handle"
              part="drag-handle"
              type="button"
              draggable={true}
              aria-label={dragLabel}
              title={dragLabel}
            >
              <span innerHTML={loomaIconMarkup('grip-vertical')} />
            </button>
          ) : null}
          {this.container ? (
            <button
              class="disclosure"
              part="disclosure"
              type="button"
              aria-label={disclosureLabel}
              aria-expanded={String(expanded)}
              disabled={this.disabled}
              onClick={this.onDisclosureClick}
              onKeyDown={this.onDisclosureKeydown}
            >
              <span
                class={{ 'disclosure-icon': true, 'disclosure-icon--expanded': expanded }}
                innerHTML={loomaIconMarkup('chevron-down')}
              />
            </button>
          ) : <span class="disclosure-spacer" aria-hidden="true" />}
          <span class="leading" part="leading"><slot name="leading" /></span>
          <span class="label" part="label"><slot /></span>
          <span class="actions" part="actions"><slot name="actions" /></span>
          <span class="drop-indicator row-drop-indicator" part="drop-indicator" aria-hidden="true" />
        </div>
        {this.container ? (
          <div class="children" part="children" role="group" hidden={!expanded}>
            <slot name="children" />
          </div>
        ) : null}
        <span class="drop-indicator subtree-drop-indicator" part="drop-indicator" aria-hidden="true" />
      </Host>
    );
  }
}
