import { Component, State, h } from '@stencil/core';

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
  tag: 'ui-search-shell',
  styleUrl: 'ui-search-shell.css',
  shadow: true,
})
export class UISearchShell {
  @State() hasStatus = false;
  @State() hasFooter = false;

  private statusSlot?: HTMLSlotElement;
  private footerSlot?: HTMLSlotElement;

  componentDidLoad() {
    this.syncSlots();
  }

  private syncSlots = () => {
    this.hasStatus = slotHasContent(this.statusSlot);
    this.hasFooter = slotHasContent(this.footerSlot);
  };

  render() {
    return (
      <div class="search-shell" part="base">
        <slot name="backdrop" />

        <div class="search-shell__panel" part="panel">
          <div class="search-shell__search" part="search">
            <slot name="search" />
          </div>

          <div class="search-shell__status" part="status" hidden={!this.hasStatus}>
            <slot
              name="status"
              ref={(el) => (this.statusSlot = el as HTMLSlotElement)}
              onSlotchange={this.syncSlots}
            />
          </div>

          <div class="search-shell__body" part="body">
            <slot name="body" />
          </div>

          <div class="search-shell__footer" part="footer" hidden={!this.hasFooter}>
            <slot
              name="footer"
              ref={(el) => (this.footerSlot = el as HTMLSlotElement)}
              onSlotchange={this.syncSlots}
            />
          </div>
        </div>
      </div>
    );
  }
}
