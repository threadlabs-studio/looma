import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { createId } from '../../utils/id';
import { eventToTrigger, isActivationKey, dispatchDetail } from '../../utils/events';

@Component({
  tag: 'ui-disclosure',
  styleUrl: 'ui-disclosure.css',
  shadow: true,
})
export class UIDisclosure {
  @Element() host: HTMLElement;

  @Prop() open = false;
  @Prop({ attribute: 'default-open' }) defaultOpen = false;
  @Prop() disabled = false;

  @State() internalOpen = false;
  @State() contentId = '';

  private trigger: HTMLElement | null = null;
  private content: HTMLElement | null = null;

  @Watch('open')
  syncFromProp() {
    this.internalOpen = this.open;
  }

  @Watch('internalOpen')
  syncState() {
    if (this.trigger) {
      this.trigger.setAttribute('aria-expanded', String(this.internalOpen));
    }
    if (this.content) {
      this.content.hidden = !this.internalOpen;
    }
  }

  componentDidLoad() {
    this.resolveParts();
    this.syncFromProp();
    this.internalOpen = this.internalOpen || this.defaultOpen;
    this.syncState();
    this.trigger?.addEventListener('click', this.onTriggerClick);
    this.trigger?.addEventListener('keydown', this.onTriggerKeydown);
  }

  disconnectedCallback() {
    this.trigger?.removeEventListener('click', this.onTriggerClick);
    this.trigger?.removeEventListener('keydown', this.onTriggerKeydown);
  }

  componentDidUpdate() {
    this.syncState();
  }

  private resolveParts() {
    this.trigger =
      this.host.querySelector('[data-ui-disclosure-trigger], button, [aria-controls]') as HTMLElement | null;
    const controlsId = this.trigger?.getAttribute('aria-controls') ?? '';
    if (controlsId) {
      this.content = document.getElementById(controlsId);
    } else {
      const children = Array.from(this.host.children);
      this.content = (children.find((c) => c !== this.trigger) as HTMLElement) ?? null;
    }
    if (this.trigger && this.content) {
      if (!this.content.id) {
        this.content.id = createId('disclosure-content');
      }
      this.trigger.setAttribute('aria-controls', this.content.id);
      this.contentId = this.content.id;
    }
    if (this.trigger instanceof HTMLButtonElement) {
      this.trigger.disabled = this.disabled;
    } else if (this.trigger) {
      this.trigger.setAttribute('aria-disabled', String(this.disabled));
    }
  }

  private setOpen(next: boolean, action: { reason: string; trigger: string }) {
    if (this.internalOpen === next) return;
    this.internalOpen = next;
    dispatchDetail(this.host, next ? 'open' : 'close', {
      open: next,
      reason: action.reason as 'programmatic' | 'light-dismiss' | 'escape' | 'action',
      trigger: action.trigger as 'keyboard' | 'pointer' | 'programmatic',
    });
  }

  private onTriggerClick = (e: Event) => {
    if (this.disabled) {
      e.preventDefault();
      return;
    }
    this.setOpen(!this.internalOpen, { reason: 'action', trigger: eventToTrigger(e) });
  };

  private onTriggerKeydown = (e: KeyboardEvent) => {
    if (this.disabled || !isActivationKey(e)) return;
    e.preventDefault();
    this.setOpen(!this.internalOpen, { reason: 'action', trigger: 'keyboard' });
  };

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
