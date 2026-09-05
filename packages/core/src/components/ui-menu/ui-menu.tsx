import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { eventToTrigger } from '../../utils/events';
import { dispatchDetail } from '../../utils/events';
import { closeOverlay, openOverlay, requestTopOverlayClose } from '../../overlay/manager';
import {
  createAnchoredSurface,
  type AnchoredPlacement,
  type AnchoredSurface,
} from '../../overlay/positioning';

@Component({
  tag: 'ui-menu',
  styleUrl: 'ui-menu.css',
  shadow: true,
})
export class UIMenu {
  @Element() host: HTMLElement;

  @Prop() open = false;
  @Prop({ attribute: 'default-open' }) defaultOpen = false;
  /** Id of the control that anchors this menu in the top layer. */
  @Prop() for?: string;
  /** Preferred placement; Looma flips and shifts when space is constrained. */
  @Prop() placement: AnchoredPlacement = 'bottom-start';

  @State() internalOpen = false;

  private overlayId = `ui-menu-${Math.random().toString(36).slice(2, 11)}`;
  private anchor: HTMLElement | null = null;
  private surface: AnchoredSurface | null = null;

  @Watch('open')
  syncFromProp() {
    this.internalOpen = this.open;
  }

  @Watch('for')
  @Watch('placement')
  resetSurface() {
    this.setupSurface();
    this.syncSurface();
  }

  @Watch('internalOpen')
  syncSurface() {
    this.syncAnchorState();
    if (!this.surface) return;
    if (this.internalOpen) {
      this.surface.show();
      openOverlay({
        id: this.overlayId,
        modal: false,
        element: this.host,
        relatedElements: this.anchor ? [this.anchor] : undefined,
        dismissible: true,
        requestClose: (reason, trigger) => this.closeMenu(reason, trigger),
      });
    } else {
      this.surface.hide();
      closeOverlay(this.overlayId);
    }
  }

  componentDidLoad() {
    this.syncFromProp();
    this.internalOpen = this.internalOpen || this.defaultOpen;
    this.host.addEventListener('click', this.onItemClick);
    this.host.addEventListener('keydown', this.onKeydown);
    this.setupSurface();
    this.syncSurface();
  }

  disconnectedCallback() {
    this.host.removeEventListener('click', this.onItemClick);
    this.host.removeEventListener('keydown', this.onKeydown);
    this.surface?.destroy();
    this.surface = null;
    closeOverlay(this.overlayId);
  }

  private setupSurface() {
    this.surface?.destroy();
    this.surface = null;
    this.anchor = this.for ? this.host.ownerDocument.getElementById(this.for) : null;
    if (!this.anchor) return;
    this.surface = createAnchoredSurface(this.host, {
      anchor: this.anchor,
      placement: this.placement,
    });
  }

  private syncAnchorState() {
    if (!this.anchor) return;
    this.anchor.setAttribute('aria-haspopup', 'menu');
    this.anchor.setAttribute('aria-expanded', this.internalOpen ? 'true' : 'false');
  }

  private closeMenu(reason: string, trigger: string) {
    if (!this.internalOpen) return;
    this.internalOpen = false;
    dispatchDetail(this.host, 'close', {
      open: false,
      reason: reason as 'programmatic' | 'light-dismiss' | 'escape' | 'action',
      trigger: trigger as 'keyboard' | 'pointer' | 'programmatic',
    });
    if (reason === 'escape') this.anchor?.focus();
  }

  private getItems(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll('ui-menu-item'));
  }

  private isItemDisabled(item: HTMLElement): boolean {
    return (
      item.getAttribute('aria-disabled') === 'true' ||
      item.hasAttribute('disabled') ||
      item.getAttribute('disabled') === 'true' ||
      (item as HTMLElement & { disabled?: boolean }).disabled === true
    );
  }

  private onItemClick = (e: Event) => {
    const item = (e.target as HTMLElement).closest?.('ui-menu-item');
    if (!item || item.getRootNode() !== this.host.getRootNode()) return;
    if (this.isItemDisabled(item)) return;
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
    if (e.key === 'Escape') {
      e.preventDefault();
      requestTopOverlayClose('escape', 'keyboard');
      return;
    }
    const items = this.getItems().filter((i) => !this.isItemDisabled(i));
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
