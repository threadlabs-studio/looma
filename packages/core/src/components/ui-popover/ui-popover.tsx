import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { openOverlay, closeOverlay, requestTopOverlayClose } from '../../overlay/manager';
import { dispatchDetail } from '../../utils/events';

@Component({
  tag: 'ui-popover',
  styleUrl: 'ui-popover.css',
  shadow: true,
})
export class UIPopover {
  @Element() host: HTMLElement;

  @Prop() open = false;
  @Prop({ attribute: 'default-open' }) defaultOpen = false;

  @State() internalOpen = false;

  private overlayId = `ui-popover-${Math.random().toString(36).slice(2, 11)}`;

  @Watch('open')
  syncFromProp() {
    this.internalOpen = this.open;
  }

  @Watch('internalOpen')
  onOpenChange() {
    this.syncOverlay();
    if (this.internalOpen) {
      dispatchDetail(this.host, 'open', {
        open: true,
        reason: 'programmatic',
        trigger: 'programmatic',
      });
    } else {
      dispatchDetail(this.host, 'close', {
        open: false,
        reason: 'programmatic',
        trigger: 'programmatic',
      });
    }
  }

  private syncOverlay() {
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
    this.host.addEventListener('keydown', this.onKeydown);
    this.syncOverlay();
  }

  disconnectedCallback() {
    this.host.removeEventListener('keydown', this.onKeydown);
    closeOverlay(this.overlayId);
  }

  componentDidUpdate() {
    this.syncOverlay();
  }

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

  render() {
    return (
      <Host
        data-open={this.internalOpen ? '' : undefined}
        onKeyDown={this.onKeydown}
      >
        <slot />
      </Host>
    );
  }
}
