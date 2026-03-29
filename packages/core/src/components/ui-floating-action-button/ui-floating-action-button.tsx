import { Component, Host, Prop, h } from '@stencil/core';

@Component({
  tag: 'ui-floating-action-button',
  styleUrl: 'ui-floating-action-button.css',
  shadow: true,
})
export class UIFloatingActionButton {
  @Prop({ reflect: true }) disabled = false;
  @Prop({ attribute: 'mobile-only', reflect: true }) mobileOnly = false;
  @Prop() label = '';

  render() {
    return (
      <Host data-disabled={this.disabled ? '' : undefined}>
        <button type="button" aria-label={this.label || undefined} disabled={this.disabled}>
          <slot />
        </button>
      </Host>
    );
  }
}
