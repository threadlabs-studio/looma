import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { openOverlay, closeOverlay, requestTopOverlayClose } from '../../overlay/manager';
import { dispatchDetail } from '../../utils/events';

@Component({
  tag: 'ui-tooltip',
  styleUrl: 'ui-tooltip.css',
  shadow: true,
})
export class UITooltip {
  @Element() host: HTMLElement;

  @Prop() for = '';
  @Prop() open = false;
  @Prop({ attribute: 'default-open' }) defaultOpen = false;

  @State() internalOpen = false;

  private overlayId = `ui-tooltip-${Math.random().toString(36).slice(2, 11)}`;
  private trigger: HTMLElement | null = null;

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
    closeOverlay(this.overlayId);
  }

  private resolveTrigger() {
    if (this.for) {
      this.trigger = document.getElementById(this.for);
    } else {
      this.trigger = this.host.previousElementSibling as HTMLElement;
    }
  }

  private attachTriggerListeners() {
    this.detachTriggerListeners();
    if (!this.trigger) return;
    this.trigger.addEventListener('pointerenter', this.onTriggerEnter);
    this.trigger.addEventListener('pointerleave', this.onTriggerLeave);
    this.trigger.addEventListener('focusin', this.onTriggerFocusIn);
    this.trigger.addEventListener('focusout', this.onTriggerFocusOut);
  }

  private detachTriggerListeners() {
    if (!this.trigger) return;
    this.trigger.removeEventListener('pointerenter', this.onTriggerEnter);
    this.trigger.removeEventListener('pointerleave', this.onTriggerLeave);
    this.trigger.removeEventListener('focusin', this.onTriggerFocusIn);
    this.trigger.removeEventListener('focusout', this.onTriggerFocusOut);
  }

  private onTriggerEnter = () => {
    this.internalOpen = true;
    dispatchDetail(this.host, 'open', { open: true, reason: 'action', trigger: 'pointer' });
    this.syncOverlay();
  };

  private onTriggerLeave = () => {
    this.internalOpen = false;
    dispatchDetail(this.host, 'close', { open: false, reason: 'action', trigger: 'pointer' });
    this.syncOverlay();
  };

  private onTriggerFocusIn = () => {
    this.internalOpen = true;
    dispatchDetail(this.host, 'open', { open: true, reason: 'action', trigger: 'keyboard' });
    this.syncOverlay();
  };

  private onTriggerFocusOut = (e: FocusEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && this.host.contains(related)) return;
    this.internalOpen = false;
    dispatchDetail(this.host, 'close', { open: false, reason: 'action', trigger: 'keyboard' });
    this.syncOverlay();
  };

  private handleRequestClose(reason: string, trigger: string) {
    if (reason === 'escape') {
      this.internalOpen = false;
      dispatchDetail(this.host, 'close', {
        open: false,
        reason: 'escape',
        trigger: trigger as 'keyboard' | 'pointer' | 'programmatic',
      });
      this.trigger?.focus();
    }
  }

  private onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      requestTopOverlayClose('escape', 'keyboard');
    }
  };

  render() {
    return (
      <Host
        role="tooltip"
        hidden={!this.internalOpen}
        data-open={this.internalOpen ? '' : undefined}
        onKeyDown={this.onKeydown}
      >
        <slot />
      </Host>
    );
  }
}
