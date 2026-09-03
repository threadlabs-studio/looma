import { Component, Prop, Element, Watch, Host, h } from '@stencil/core';
import { isActivationKey } from '../../utils/events';

@Component({
  tag: 'ui-button',
  styleUrl: 'ui-button.css',
  shadow: true,
})
export class UIButton {
  @Element() host: HTMLElement;

  @Prop({ reflect: true }) variant: 'outline' | 'solid' | 'destructive' | 'ghost' = 'outline';
  @Prop() size?: string;
  @Prop() disabled = false;

  private slotRef?: HTMLSlotElement;

  @Watch('variant')
  @Watch('size')
  @Watch('disabled')
  syncToButton() {
    const btn = this.getButton();
    if (!btn) return;
    this.host.dataset.variant = this.variant;
    this.host.dataset.size = this.size || '';
    this.host.dataset.disabled = this.disabled ? 'true' : '';
    btn.disabled = this.disabled;
  }

  componentDidLoad() {
    this.slotRef?.addEventListener('slotchange', () => this.syncToButton());
    this.syncToButton();
  }

  componentDidUpdate() {
    this.syncToButton();
  }

  private getButton(): HTMLButtonElement | null {
    const slot = this.host.shadowRoot?.querySelector('slot');
    const nodes = slot?.assignedElements() ?? Array.from(this.host.children);
    return (nodes.find((el) => el.tagName === 'BUTTON') as HTMLButtonElement) ?? null;
  }

  private onKeydown = (e: KeyboardEvent) => {
    const btn = this.getButton();
    if (btn || this.disabled || !isActivationKey(e)) return;
    e.preventDefault();
    this.host.click();
  };

  render() {
    return (
      <Host
        data-variant={this.variant}
        data-size={this.size || undefined}
        data-disabled={this.disabled ? '' : undefined}
        onKeyDown={this.onKeydown}
      >
        <slot ref={(el) => (this.slotRef = el)} />
      </Host>
    );
  }
}
