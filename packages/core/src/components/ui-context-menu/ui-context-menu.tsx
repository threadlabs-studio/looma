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
    this.host.addEventListener('select', this.onMenuSelect);
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
    this.host.removeEventListener('select', this.onMenuSelect);
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

  private onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      requestTopOverlayClose('escape', 'keyboard');
    }
  };

  private onMenuSelect = (e: CustomEvent) => {
    const detail = e.detail;
    dispatchDetail(this.host, 'select', {
      value: detail.value,
      trigger: detail.trigger,
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
        <ui-menu open={this.internalOpen} ref={(el) => { this.menuEl = el; }}>
          <slot />
        </ui-menu>
      </Host>
    );
  }

  componentDidRender() {
    this.attachMenuListener();
  }
}
