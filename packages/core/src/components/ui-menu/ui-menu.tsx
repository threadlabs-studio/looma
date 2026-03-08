import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { eventToTrigger } from '../../utils/events';
import { dispatchDetail } from '../../utils/events';

@Component({
  tag: 'ui-menu',
  styleUrl: 'ui-menu.css',
  shadow: true,
})
export class UIMenu {
  @Element() host: HTMLElement;

  @Prop() open = false;
  @Prop({ attribute: 'default-open' }) defaultOpen = false;

  @State() internalOpen = false;

  @Watch('open')
  syncFromProp() {
    this.internalOpen = this.open;
  }

  componentDidLoad() {
    this.syncFromProp();
    this.internalOpen = this.internalOpen || this.defaultOpen;
    this.host.addEventListener('click', this.onItemClick);
    this.host.addEventListener('keydown', this.onKeydown);
  }

  disconnectedCallback() {
    this.host.removeEventListener('click', this.onItemClick);
    this.host.removeEventListener('keydown', this.onKeydown);
  }

  private getItems(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll('ui-menu-item'));
  }

  private onItemClick = (e: Event) => {
    const item = (e.target as HTMLElement).closest?.('ui-menu-item');
    if (!item || item.getRootNode() !== this.host.getRootNode()) return;
    if (item.getAttribute('aria-disabled') === 'true') return;
    const value = item.getAttribute('value') ?? item.getAttribute('data-value') ?? '';
    dispatchDetail(this.host, 'select', { value, trigger: eventToTrigger(e) });
    dispatchDetail(this.host, 'close', {
      open: false,
      reason: 'action',
      trigger: eventToTrigger(e),
    });
    this.internalOpen = false;
  };

  private onKeydown = (e: KeyboardEvent) => {
    const items = this.getItems().filter((i) => i.getAttribute('aria-disabled') !== 'true');
    if (items.length === 0) return;
    const target = (e.target as HTMLElement).closest?.('ui-menu-item');
    const currentIndex = target && target instanceof HTMLElement ? items.indexOf(target) : -1;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (target && currentIndex >= 0) {
        const value = target.getAttribute('value') ?? target.getAttribute('data-value') ?? '';
        dispatchDetail(this.host, 'select', { value, trigger: 'keyboard' });
        dispatchDetail(this.host, 'close', {
          open: false,
          reason: 'action',
          trigger: 'keyboard',
        });
        this.internalOpen = false;
      }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex =
        e.key === 'ArrowDown'
          ? currentIndex < 0
            ? 0
            : Math.min(currentIndex + 1, items.length - 1)
          : currentIndex <= 0
            ? items.length - 1
            : currentIndex - 1;
      (items[nextIndex] as HTMLElement).focus();
    }
  };

  render() {
    return (
      <Host role="menu" aria-orientation="vertical" data-open={this.internalOpen ? '' : undefined}>
        <slot />
      </Host>
    );
  }
}
