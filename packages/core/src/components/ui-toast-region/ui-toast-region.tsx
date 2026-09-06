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

  @State() internalOpen = false;

  private surface: ViewportSurface | null = null;
  private contentObserver: MutationObserver | null = null;
  private pendingDismiss: {
    toast: HTMLElement;
    trigger: 'keyboard' | 'pointer' | 'programmatic';
  } | null = null;

  @Watch('open')
  syncFromProp() {
    this.syncContents();
  }

  @Watch('internalOpen')
  syncSurface() {
    if (this.internalOpen) this.surface?.show();
    else this.surface?.hide();
  }

  componentDidLoad() {
    this.surface = createViewportSurface(this.host);
    this.contentObserver = new MutationObserver(this.syncContents);
    this.contentObserver.observe(this.host, { childList: true, subtree: true });
    this.syncContents();
    this.syncSurface();
    this.host.addEventListener('click', this.onClick);
  }

  disconnectedCallback() {
    this.host.removeEventListener('click', this.onClick);
    this.contentObserver?.disconnect();
    this.contentObserver = null;
    this.surface?.destroy();
    this.surface = null;
  }

  private getToasts(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll('[data-ui-toast]'));
  }

  private syncContents = () => {
    const nextOpen = this.open && this.getToasts().length > 0;
    const wasOpen = this.internalOpen;
    const completedDismiss = this.pendingDismiss && !this.host.contains(this.pendingDismiss.toast)
      ? this.pendingDismiss
      : null;
    this.internalOpen = nextOpen;

    if (wasOpen && !nextOpen && completedDismiss) {
      dispatchDetail(this.host, 'close', {
        open: false,
        reason: 'action',
        trigger: completedDismiss.trigger,
      });
    }
    if (completedDismiss || !this.open) this.pendingDismiss = null;
  };

  private onClick = (e: Event) => {
    const dismissBtn = (e.target as HTMLElement).closest?.('[data-ui-toast-dismiss]');
    if (!dismissBtn) return;
    const toast = dismissBtn.closest?.('[data-ui-toast]');
    if (!toast) return;
    const id = (toast as HTMLElement).id ?? '';
    const trigger = eventToTrigger(e);
    this.pendingDismiss = { toast: toast as HTMLElement, trigger };
    dispatchDetail(this.host, 'dismiss', {
      id,
      reason: 'action',
      trigger,
    });
  };

  render() {
    return (
      <Host
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        data-open={this.internalOpen ? '' : undefined}
      >
        <slot />
      </Host>
    );
  }
}
