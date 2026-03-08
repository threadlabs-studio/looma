import { Component, Prop, Element, Watch, Host, h } from '@stencil/core';
import { eventToTrigger } from '../../utils/events';
import { dispatchDetail } from '../../utils/events';

@Component({
  tag: 'ui-radio',
  styleUrl: 'ui-radio.css',
  shadow: true,
})
export class UIRadio {
  @Element() host: HTMLElement;

  @Prop() checked = false;
  @Prop({ attribute: 'default-checked' }) defaultChecked = false;
  @Prop() disabled = false;
  @Prop() name = '';
  @Prop() required = false;
  @Prop() value = 'on';

  private slotRef?: HTMLSlotElement;

  @Watch('checked')
  @Watch('disabled')
  @Watch('name')
  @Watch('required')
  @Watch('value')
  syncToInput() {
    const input = this.getInput();
    if (!input) return;
    this.host.dataset.disabled = this.disabled ? 'true' : '';
    input.checked = this.checked;
    input.disabled = this.disabled;
    input.name = this.name;
    input.required = this.required;
    input.value = this.value;
  }

  componentDidLoad() {
    if (!this.checked && this.defaultChecked) {
      this.checked = true;
    }
    this.slotRef?.addEventListener('slotchange', () => this.syncToInput());
    this.syncToInput();
    const input = this.getInput();
    input?.addEventListener('change', this.onInputChange);
  }

  disconnectedCallback() {
    const input = this.getInput();
    input?.removeEventListener('change', this.onInputChange);
  }

  componentDidUpdate() {
    this.syncToInput();
  }

  private getInput(): HTMLInputElement | null {
    const slot = this.host.shadowRoot?.querySelector('slot');
    const nodes = slot?.assignedElements() ?? Array.from(this.host.children);
    return (nodes.find((el) => el instanceof HTMLInputElement && el.type === 'radio') as HTMLInputElement) ?? null;
  }

  private onInputChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input || !input.checked) return;
    dispatchDetail(this.host, 'change', {
      checked: true,
      value: this.value,
      trigger: eventToTrigger(e),
    });
  };

  render() {
    return (
      <Host
        role="radio"
        aria-checked={String(this.checked)}
        aria-disabled={String(this.disabled)}
        data-disabled={this.disabled ? '' : undefined}
      >
        <slot ref={(el) => (this.slotRef = el)} />
      </Host>
    );
  }
}
