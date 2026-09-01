import { Component, Host, Prop, h } from '@stencil/core';

@Component({
  tag: 'ui-icon-button',
  styleUrl: 'ui-icon-button.css',
  shadow: true,
})
export class UIIconButton {
  @Prop({ reflect: true }) disabled = false;
  @Prop() label = '';
  @Prop({ reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @Prop({ reflect: true }) variant: 'ghost' | 'outline' | 'solid' = 'ghost';

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
