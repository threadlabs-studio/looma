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
  /** One-based visual and semantic nesting level. */
  @Prop() depth = 1;
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
  /** Initial controlled expansion value. */
  @Prop() expanded = false;
  /** Initial uncontrolled expansion value. */
  @Prop({ attribute: 'default-expanded' }) defaultExpanded = false;
  @Prop() selected = false;
  @Prop() disabled = false;

  @State() internalExpanded = false;

  @Watch('expanded')
  syncExpandedFromProp() {
    this.internalExpanded = this.expanded;
  }

  componentWillLoad() {
    this.internalExpanded = this.expanded || this.defaultExpanded;
  }

  componentDidLoad() {
    this.host.addEventListener('ui-tree-auto-expand', this.onAutoExpand);
  }

  disconnectedCallback() {
    this.host.removeEventListener('ui-tree-auto-expand', this.onAutoExpand);
  }

  private setExpanded(expanded: boolean, trigger: TreeTrigger) {
    if (!this.container || this.disabled || this.internalExpanded === expanded) return;
    this.internalExpanded = expanded;
    dispatchDetail(this.host, 'expand', { id: this.itemId, expanded, trigger });
  }

  private onAutoExpand = () => {
    this.setExpanded(true, 'pointer');
  };

  private onDisclosureClick = (event: MouseEvent) => {
    event.stopPropagation();
    this.setExpanded(!this.internalExpanded, eventToTrigger(event));
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
    if (!interactive) this.setExpanded(!this.internalExpanded, eventToTrigger(event));
  };

  render() {
    const level = Math.max(1, Math.floor(this.depth));
    const disclosureLabel = `${this.internalExpanded ? 'Collapse' : 'Expand'} ${this.label || 'item'}`;
    const dragLabel = `Drag ${this.label || 'item'} to reorder`;

    return (
      <Host
        role="treeitem"
        aria-level={String(level)}
        aria-expanded={this.container ? String(this.internalExpanded) : undefined}
        aria-selected={String(this.selected)}
        aria-disabled={this.disabled ? 'true' : undefined}
        data-container={this.container ? '' : undefined}
        data-selected={this.selected ? '' : undefined}
        data-disabled={this.disabled ? '' : undefined}
        data-drag-type={this.dragType || 'item'}
        data-drop-scope={this.dropScope || undefined}
        data-accepts={this.accepts || undefined}
        tabIndex={this.disabled ? -1 : 0}
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
              aria-expanded={String(this.internalExpanded)}
              disabled={this.disabled}
              onClick={this.onDisclosureClick}
              onKeyDown={this.onDisclosureKeydown}
            >
              <span
                class={{ 'disclosure-icon': true, 'disclosure-icon--expanded': this.internalExpanded }}
                innerHTML={loomaIconMarkup('chevron-down')}
              />
            </button>
          ) : <span class="disclosure-spacer" aria-hidden="true" />}
          <span class="leading" part="leading"><slot name="leading" /></span>
          <span class="label" part="label"><slot /></span>
          <span class="actions" part="actions"><slot name="actions" /></span>
          <span class="drop-indicator" part="drop-indicator" aria-hidden="true" />
        </div>
        {this.container ? (
          <div class="children" part="children" role="group" hidden={!this.internalExpanded}>
            <slot name="children" />
          </div>
        ) : null}
      </Host>
    );
  }
}
