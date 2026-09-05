import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { eventToTrigger } from '../../utils/events';
import { dispatchDetail } from '../../utils/events';
import { createViewportSurface, type ViewportSurface } from '../../overlay/positioning';

@Component({
  tag: 'ui-toast-region',
  styleUrl: 'ui-toast-region.css',
  shadow: true,
})
export class UIToastRegion {
  @Element() host: HTMLElement;

  @Prop() open = true;

  @State() internalOpen = true;

  private surface: ViewportSurface | null = null;

  @Watch('open')
  syncFromProp() {
    this.internalOpen = this.open;
  }

  @Watch('internalOpen')
  syncSurface() {
    if (this.internalOpen) this.surface?.show();
    else this.surface?.hide();
  }

  componentDidLoad() {
    this.surface = createViewportSurface(this.host);
    this.syncFromProp();
    this.syncSurface();
    this.host.addEventListener('click', this.onClick);
  }

  disconnectedCallback() {
    this.host.removeEventListener('click', this.onClick);
    this.surface?.destroy();
    this.surface = null;
  }

  private getToasts(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll('[data-ui-toast]'));
  }

  private updateOpenState() {
    const toasts = this.getToasts();
    this.internalOpen = toasts.length > 0;
  }

  private onClick = (e: Event) => {
    const dismissBtn = (e.target as HTMLElement).closest?.('[data-ui-toast-dismiss]');
    if (!dismissBtn) return;
    const toast = dismissBtn.closest?.('[data-ui-toast]');
    if (!toast) return;
    const id = (toast as HTMLElement).id ?? '';
    toast.setAttribute('aria-hidden', 'true');
    (toast as HTMLElement).remove();
    dispatchDetail(this.host, 'dismiss', {
      id,
      reason: 'action',
      trigger: eventToTrigger(e),
    });
    this.updateOpenState();
    if (this.getToasts().length === 0) {
      dispatchDetail(this.host, 'close', {
        open: false,
        reason: 'action',
        trigger: eventToTrigger(e),
      });
    }
  };

  render() {
    return (
      <Host
        role="region"
        aria-label="Notifications"
        data-open={this.internalOpen ? '' : undefined}
      >
        <slot />
      </Host>
    );
  }
}
