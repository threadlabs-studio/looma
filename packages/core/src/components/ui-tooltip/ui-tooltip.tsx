import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { openOverlay, closeOverlay, requestTopOverlayClose } from '../../overlay/manager';
import { dispatchDetail } from '../../utils/events';
import {
  createAnchoredSurface,
  type AnchoredPlacement,
  type AnchoredSurface,
} from '../../overlay/positioning';

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
  @Prop() placement: AnchoredPlacement = 'top-start';
  /** Pointer hover intent delay in milliseconds. Keyboard focus is immediate. */
  @Prop({ attribute: 'show-delay' }) showDelay = 500;
  /** Pointer leave grace period in milliseconds. */
  @Prop({ attribute: 'hide-delay' }) hideDelay = 100;

  @State() internalOpen = false;

  private overlayId = `ui-tooltip-${Math.random().toString(36).slice(2, 11)}`;
  private trigger: HTMLElement | null = null;
  private surface: AnchoredSurface | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  @Watch('open')
  syncFromProp() {
    this.clearTimers();
    this.internalOpen = this.open;
  }

  @Watch('for')
  @Watch('placement')
  resetSurface() {
    this.syncTrigger();
    this.setupSurface();
    this.syncOverlay();
  }

  @Watch('internalOpen')
  syncOverlay() {
    if (this.internalOpen) {
      this.surface?.show();
      openOverlay({
        id: this.overlayId,
        modal: false,
        element: this.host,
        relatedElements: this.trigger ? [this.trigger] : undefined,
        dismissible: true,
        requestClose: (reason, trigger) => this.handleRequestClose(reason, trigger),
      });
    } else {
      this.surface?.hide();
      closeOverlay(this.overlayId);
    }
  }

  componentDidLoad() {
    this.syncFromProp();
    this.internalOpen = this.internalOpen || this.defaultOpen;
    this.syncTrigger();
    this.setupSurface();
    this.host.addEventListener('keydown', this.onKeydown);
    this.syncOverlay();
  }

  componentDidUpdate() {
    this.syncTrigger();
  }

  disconnectedCallback() {
    this.clearTimers();
    this.detachTriggerListeners();
    this.surface?.destroy();
    this.surface = null;
    this.host.removeEventListener('keydown', this.onKeydown);
    closeOverlay(this.overlayId);
  }

  private syncTrigger() {
    const next = this.for
      ? this.host.ownerDocument.getElementById(this.for)
      : this.host.previousElementSibling as HTMLElement | null;
    if (next === this.trigger) return;
    this.detachTriggerListeners();
    this.trigger = next;
    this.attachTriggerListeners();
    this.surface?.setAnchor(next);
  }

  private setupSurface() {
    this.surface?.destroy();
    this.surface = createAnchoredSurface(this.host, {
      anchor: this.trigger,
      placement: this.placement,
    });
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

  private clearShowTimer() {
    if (this.showTimer === null) return;
    clearTimeout(this.showTimer);
    this.showTimer = null;
  }

  private clearHideTimer() {
    if (this.hideTimer === null) return;
    clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }

  private clearTimers() {
    this.clearShowTimer();
    this.clearHideTimer();
  }

  private setInteractionOpen(nextOpen: boolean, trigger: 'pointer' | 'keyboard') {
    if (this.internalOpen === nextOpen) return;
    this.internalOpen = nextOpen;
    dispatchDetail(this.host, nextOpen ? 'open' : 'close', {
      open: nextOpen,
      reason: 'action',
      trigger,
    });
  }

  private onTriggerEnter = () => {
    this.clearHideTimer();
    if (this.internalOpen || this.showTimer !== null) return;
    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      this.setInteractionOpen(true, 'pointer');
    }, Math.max(0, this.showDelay));
  };

  private onTriggerLeave = () => {
    this.clearShowTimer();
    if (!this.internalOpen || this.hideTimer !== null) return;
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      this.setInteractionOpen(false, 'pointer');
    }, Math.max(0, this.hideDelay));
  };

  private onTriggerFocusIn = () => {
    this.clearTimers();
    this.setInteractionOpen(true, 'keyboard');
  };

  private onTriggerFocusOut = (e: FocusEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && this.host.contains(related)) return;
    this.clearTimers();
    this.setInteractionOpen(false, 'keyboard');
  };

  private handleRequestClose(reason: string, trigger: string) {
    if (reason === 'escape') {
      this.clearTimers();
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
