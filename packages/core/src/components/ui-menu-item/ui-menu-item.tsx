import { Component, Prop, Host, h } from '@stencil/core';

@Component({
  tag: 'ui-menu-item',
  styleUrl: 'ui-menu-item.css',
  shadow: true,
})
export class UIMenuItem {
  @Prop() disabled = false;
  @Prop() value = '';

  render() {
    return (
      <Host
        role="menuitem"
        tabIndex={this.disabled ? -1 : 0}
        aria-disabled={this.disabled ? 'true' : undefined}
        data-value={this.value || undefined}
      >
        <slot />
      </Host>
    );
  }
}
