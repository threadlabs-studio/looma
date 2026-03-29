import { Component, Host, Prop, State, h } from '@stencil/core';

function slotHasContent(slot?: HTMLSlotElement): boolean {
  if (!slot) {
    return false;
  }

  return slot.assignedNodes({ flatten: true }).some((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return Boolean(node.textContent?.trim());
    }

    return true;
  });
}

@Component({
  tag: 'ui-search-result-row',
  styleUrl: 'ui-search-result-row.css',
  shadow: true,
})
export class UISearchResultRow {
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) selected = false;

  @State() hasLeading = false;
  @State() hasMeta = false;
  @State() hasExcerpt = false;
  @State() hasTrailing = false;

  private leadingSlot?: HTMLSlotElement;
  private metaSlot?: HTMLSlotElement;
  private excerptSlot?: HTMLSlotElement;
  private trailingSlot?: HTMLSlotElement;

  componentDidLoad() {
    this.syncSlots();
  }

  private syncSlots = () => {
    this.hasLeading = slotHasContent(this.leadingSlot);
    this.hasMeta = slotHasContent(this.metaSlot);
    this.hasExcerpt = slotHasContent(this.excerptSlot);
    this.hasTrailing = slotHasContent(this.trailingSlot);
  };

  render() {
    return (
      <Host>
        <button class="search-result-row" type="button" disabled={this.disabled} part="button">
          <span class="search-result-row__leading" part="leading" hidden={!this.hasLeading}>
            <slot
              name="leading"
              ref={(el) => (this.leadingSlot = el as HTMLSlotElement)}
              onSlotchange={this.syncSlots}
            />
          </span>

          <span class="search-result-row__content" part="content">
            <span class="search-result-row__title" part="title">
              <slot name="title" />
            </span>

            <span class="search-result-row__meta" part="meta" hidden={!this.hasMeta}>
              <slot
                name="meta"
                ref={(el) => (this.metaSlot = el as HTMLSlotElement)}
                onSlotchange={this.syncSlots}
              />
            </span>

            <span class="search-result-row__excerpt" part="excerpt" hidden={!this.hasExcerpt}>
              <slot
                name="excerpt"
                ref={(el) => (this.excerptSlot = el as HTMLSlotElement)}
                onSlotchange={this.syncSlots}
              />
            </span>
          </span>

          <span class="search-result-row__trailing" part="trailing" hidden={!this.hasTrailing}>
            <slot
              name="trailing"
              ref={(el) => (this.trailingSlot = el as HTMLSlotElement)}
              onSlotchange={this.syncSlots}
            />
          </span>
        </button>
      </Host>
    );
  }
}
