import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';

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

  @Watch('max')
  syncOverflow() {
    this.updateOverflow();
  }

  componentDidLoad() {
    this.updateOverflow();
  }

  private visibleLimit(): number {
    return Number.isFinite(this.max) ? Math.max(0, Math.floor(this.max)) : 0;
  }

  private updateOverflow() {
    const children = Array.from(this.host.children);
    const total = children.length;
    const visibleLimit = this.visibleLimit();
    const overflowCount = total > visibleLimit ? total - visibleLimit : 0;

    if (this.overflowCount !== overflowCount) this.overflowCount = overflowCount;
  }

  render() {
    return (
      <Host role="group" aria-label={this.label || undefined}>
        <style>{`::slotted(:nth-child(n + ${this.visibleLimit() + 1})) { display: none !important; }`}</style>
        <slot onSlotchange={() => this.updateOverflow()} />
        {this.overflowCount > 0 && (
          <span
            class="overflow"
            role="img"
            aria-label={`${this.overflowCount} more ${this.overflowCount === 1 ? 'person' : 'people'}`}
            data-ui-avatar-group-overflow
          >
            +{this.overflowCount}
          </span>
        )}
      </Host>
    );
  }
}
