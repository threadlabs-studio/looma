import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';

const OVERFLOW_ATTR = 'data-ui-avatar-group-overflow';

@Component({
  tag: 'ui-avatar-group',
  styleUrl: 'ui-avatar-group.css',
  shadow: true,
})
export class UIAvatarGroup {
  @Element() host: HTMLElement;

  @Prop() max = 5;
  @Prop() label = 'People';

  @State() overflowCount = 0;

  private slotRef?: HTMLSlotElement;

  @Watch('max')
  syncOverflow() {
    this.updateOverflow();
  }

  componentDidLoad() {
    this.slotRef?.addEventListener('slotchange', () => this.updateOverflow());
    this.updateOverflow();
  }

  componentDidUpdate() {
    this.updateOverflow();
  }

  private updateOverflow() {
    const slot = this.host.shadowRoot?.querySelector('slot');
    const nodes = slot?.assignedElements() ?? Array.from(this.host.children);
    const children = nodes.filter((el) => !el.hasAttribute(OVERFLOW_ATTR));
    const total = children.length;
    const visibleCount = Math.min(this.max, total);
    const overflowCount = total > this.max ? total - this.max : 0;

    children.forEach((el, i) => {
      (el as HTMLElement).hidden = i >= visibleCount;
      (el as HTMLElement).setAttribute('aria-hidden', String(i >= visibleCount));
    });

    this.overflowCount = overflowCount;
  }

  render() {
    return (
      <Host role="list" aria-label={this.label || undefined}>
        <slot />
        {this.overflowCount > 0 && (
          <span
            class="overflow"
            role="listitem"
            aria-label={`${this.overflowCount} more`}
            data-ui-avatar-group-overflow
          >
            +{this.overflowCount}
          </span>
        )}
      </Host>
    );
  }
}
