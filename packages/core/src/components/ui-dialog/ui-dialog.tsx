import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { openOverlay, closeOverlay, requestTopOverlayClose } from '../../overlay/manager';
import { dispatchDetail } from '../../utils/events';

@Component({
  tag: 'ui-dialog',
  styleUrl: 'ui-dialog.css',
  shadow: true,
})
export class UIDialog {
  @Element() host: HTMLElement;

  @Prop() open = false;
  @Prop({ attribute: 'default-open' }) defaultOpen = false;
  @Prop() modal = true;
  @Prop() dismissible = true;
  /** Accessible name forwarded to the native dialog surface. */
  @Prop() label?: string;

  @State() internalOpen = false;

  private overlayId = `ui-dialog-${Math.random().toString(36).slice(2, 11)}`;
  private dialogRef?: HTMLDialogElement;

  @Watch('open')
  syncFromProp() {
    this.internalOpen = this.open;
  }

  @Watch('internalOpen')
  syncOpen() {
    if (this.dialogRef) {
      if (this.internalOpen) {
        this.dialogRef.showModal();
        openOverlay({
          id: this.overlayId,
          modal: this.modal,
          element: this.host,
          dismissible: this.dismissible,
          requestClose: (reason, trigger) => this.handleRequestClose(reason, trigger),
        });
      } else {
        this.dialogRef.close();
        closeOverlay(this.overlayId);
      }
    }
  }

  componentDidLoad() {
    this.syncFromProp();
    this.internalOpen = this.internalOpen || this.defaultOpen;
    this.dialogRef?.addEventListener('close', this.onDialogClose);
    this.syncOpen();
  }

  disconnectedCallback() {
    this.dialogRef?.removeEventListener('close', this.onDialogClose);
    closeOverlay(this.overlayId);
  }

  componentDidUpdate() {
    this.syncOpen();
  }

  private handleRequestClose(reason: string, trigger: string) {
    this.internalOpen = false;
    dispatchDetail(this.host, 'close', {
      open: false,
      reason: reason as 'programmatic' | 'light-dismiss' | 'escape' | 'action',
      trigger: trigger as 'keyboard' | 'pointer' | 'programmatic',
    });
  }

  private onDialogClose = () => {
    if (this.internalOpen) {
      this.internalOpen = false;
      closeOverlay(this.overlayId);
      dispatchDetail(this.host, 'close', {
        open: false,
        reason: 'programmatic',
        trigger: 'programmatic',
      });
    }
  };

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
        <dialog
          ref={(el) => (this.dialogRef = el)}
          open={this.internalOpen}
          aria-label={this.label}
        >
          <slot />
        </dialog>
      </Host>
    );
  }
}
