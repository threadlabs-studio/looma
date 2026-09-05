import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { openOverlay, closeOverlay, requestTopOverlayClose } from '../../overlay/manager';
import { dispatchDetail } from '../../utils/events';
import {
  createAnchoredSurface,
  type AnchoredPlacement,
  type AnchoredSurface,
} from '../../overlay/positioning';

@Component({
  tag: 'ui-popover',
  styleUrl: 'ui-popover.css',
  shadow: true,
})
export class UIPopover {
  @Element() host: HTMLElement;

  @Prop() open = false;
  @Prop({ attribute: 'default-open' }) defaultOpen = false;
  /** Optional id of the element this popover follows in the top layer. */
  @Prop() for?: string;
  @Prop() placement: AnchoredPlacement = 'bottom-start';

  @State() internalOpen = false;

  private overlayId = `ui-popover-${Math.random().toString(36).slice(2, 11)}`;
  private anchor: HTMLElement | null = null;
  private surface: AnchoredSurface | null = null;

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

  @Watch('for')
  @Watch('placement')
  resetSurface() {
    this.setupSurface();
    this.syncSurface();
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

  private syncSurface() {
    if (!this.surface) return;
    if (this.internalOpen) this.surface.show();
    else this.surface.hide();
  }

  private syncOverlay() {
    this.syncSurface();
    if (this.internalOpen) {
      openOverlay({
        id: this.overlayId,
        modal: false,
        element: this.host,
        relatedElements: this.anchor ? [this.anchor] : undefined,
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
    this.setupSurface();
    this.syncOverlay();
  }

  disconnectedCallback() {
    this.host.removeEventListener('keydown', this.onKeydown);
    this.surface?.destroy();
    this.surface = null;
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
