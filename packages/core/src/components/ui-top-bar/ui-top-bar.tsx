import { Component, Element, Host, State, h } from '@stencil/core';

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
  tag: 'ui-top-bar',
  styleUrl: 'ui-top-bar.css',
  shadow: true,
})
export class UITopBar {
  @Element() host: HTMLElement;

  @State() hasLeading = false;
  @State() hasSearch = false;
  @State() hasActions = false;

  private leadingSlot?: HTMLSlotElement;
  private searchSlot?: HTMLSlotElement;
  private actionsSlot?: HTMLSlotElement;

  componentDidLoad() {
    this.syncSlots();
  }

  private syncSlots = () => {
    this.hasLeading = slotHasContent(this.leadingSlot);
    this.hasSearch = slotHasContent(this.searchSlot);
    this.hasActions = slotHasContent(this.actionsSlot);
  };

  render() {
    return (
      <Host>
        <header class="top-bar" part="base">
          <div class="top-bar__leading" hidden={!this.hasLeading}>
            <slot
              name="leading"
              ref={(el) => (this.leadingSlot = el as HTMLSlotElement)}
              onSlotchange={this.syncSlots}
            />
          </div>

          <div class="top-bar__title">
            <slot />
          </div>

          <div class="top-bar__search" hidden={!this.hasSearch}>
            <slot
              name="search"
              ref={(el) => (this.searchSlot = el as HTMLSlotElement)}
              onSlotchange={this.syncSlots}
            />
          </div>

          <div class="top-bar__actions" hidden={!this.hasActions}>
            <slot
              name="actions"
              ref={(el) => (this.actionsSlot = el as HTMLSlotElement)}
              onSlotchange={this.syncSlots}
            />
          </div>
        </header>
      </Host>
    );
  }
}
