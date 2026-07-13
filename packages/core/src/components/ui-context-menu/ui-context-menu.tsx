import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { openOverlay, closeOverlay, requestTopOverlayClose } from '../../overlay/manager';
import { dispatchDetail } from '../../utils/events';

@Component({
  tag: 'ui-context-menu',
  styleUrl: 'ui-context-menu.css',
  shadow: true,
})
export class UIContextMenu {
  @Element() host: HTMLElement;

  @Prop() open = false;
  @Prop({ attribute: 'default-open' }) defaultOpen = false;

  @State() internalOpen = false;

  private overlayId = `ui-context-menu-${Math.random().toString(36).slice(2, 11)}`;
  private trigger: HTMLElement | null = null;
  private pointerX = 0;
  private pointerY = 0;

  @Watch('open')
  syncFromProp() {
    this.internalOpen = this.open;
  }

  @Watch('internalOpen')
  syncOverlay() {
    if (this.internalOpen) {
      openOverlay({
        id: this.overlayId,
        modal: false,
        element: this.host,
        dismissible: true,
        requestClose: (reason, trigger) => this.handleRequestClose(reason, trigger),
      });
    } else {
      closeOverlay(this.overlayId);
    }
  }

  componentDidLoad() {
    this.syncFromProp();
    this.internalOpen = this.internalOpen || this.defaultOpen;
    this.resolveTrigger();
    this.attachTriggerListeners();
    this.host.addEventListener('keydown', this.onKeydown);
    this.host.addEventListener('click', this.onItemClick);
    this.syncOverlay();
  }

  componentDidUpdate() {
    this.resolveTrigger();
    this.attachTriggerListeners();
    this.syncOverlay();
  }

  disconnectedCallback() {
    this.detachTriggerListeners();
    this.host.removeEventListener('keydown', this.onKeydown);
    this.host.removeEventListener('click', this.onItemClick);
    closeOverlay(this.overlayId);
  }

  private resolveTrigger() {
    this.trigger = this.host.parentElement;
  }

  private attachTriggerListeners() {
    this.detachTriggerListeners();
    if (!this.trigger) return;
    this.trigger.addEventListener('contextmenu', this.onContextMenu);
  }

  private detachTriggerListeners() {
    if (!this.trigger) return;
    this.trigger.removeEventListener('contextmenu', this.onContextMenu);
  }

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
    this.internalOpen = true;
    dispatchDetail(this.host, 'open', {
      open: true,
      reason: 'action',
      trigger: 'pointer',
    });
    this.syncOverlay();
  };

  private handleRequestClose(reason: string, trigger: string) {
    this.internalOpen = false;
    dispatchDetail(this.host, 'close', {
      open: false,
      reason: reason as 'programmatic' | 'light-dismiss' | 'escape' | 'action',
      trigger: trigger as 'keyboard' | 'pointer' | 'programmatic',
    });
  }

  private isItemDisabled(item: HTMLElement): boolean {
    return (
      item.getAttribute('aria-disabled') === 'true' ||
      item.hasAttribute('disabled') ||
      item.getAttribute('disabled') === 'true' ||
      (item as HTMLElement & { disabled?: boolean }).disabled === true
    );
  }

  private onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      requestTopOverlayClose('escape', 'keyboard');
      return;
    }
    // Bridge slotted ui-menu-item activation: ui-menu's own keydown handler
    // cannot find slotted children via querySelector, so we handle Enter/Space
    // on the host and dispatch select/close from the context menu.
    if (e.key === 'Enter' || e.key === ' ') {
      const target = (e.target as HTMLElement).closest?.('ui-menu-item');
      if (!target) return;
      if (this.isItemDisabled(target)) return;
      e.preventDefault();
      const value = target.getAttribute('value') ?? target.getAttribute('data-value') ?? '';
      dispatchDetail(this.host, 'select', { value, trigger: 'keyboard' });
      dispatchDetail(this.host, 'close', {
        open: false,
        reason: 'action',
        trigger: 'keyboard',
      });
      this.internalOpen = false;
      this.syncOverlay();
    }
  };

  private onItemClick = (e: MouseEvent) => {
    // Bridge slotted ui-menu-item click activation: ui-menu's own click handler
    // cannot find slotted children via querySelector, so we handle clicks on
    // the host and dispatch select/close from the context menu.
    const item = (e.target as HTMLElement).closest?.('ui-menu-item');
    if (!item) return;
    if (this.isItemDisabled(item)) return;
    const value = item.getAttribute('value') ?? item.getAttribute('data-value') ?? '';
    dispatchDetail(this.host, 'select', { value, trigger: 'pointer' });
    dispatchDetail(this.host, 'close', {
      open: false,
      reason: 'action',
      trigger: 'pointer',
    });
    this.internalOpen = false;
    this.syncOverlay();
  };

  render() {
    return (
      <Host
        role="menu"
        data-open={this.internalOpen ? '' : undefined}
        onKeyDown={this.onKeydown}
        style={{
          position: 'fixed',
          left: `${this.pointerX}px`,
          top: `${this.pointerY}px`,
          display: this.internalOpen ? 'block' : 'none',
        }}
      >
        <ui-menu open={this.internalOpen}>
          <slot />
        </ui-menu>
      </Host>
    );
  }
}
