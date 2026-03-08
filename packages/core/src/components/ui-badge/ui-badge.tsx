import { Component, Prop, Host, h } from '@stencil/core';

@Component({
  tag: 'ui-badge',
  styleUrl: 'ui-badge.css',
  shadow: true,
})
export class UIBadge {
  @Prop() variant?: string;
  @Prop() tone?: string;

  render() {
    return (
      <Host
        data-variant={this.variant || undefined}
        data-tone={this.tone || undefined}
      >
        <slot />
      </Host>
    );
  }
}
