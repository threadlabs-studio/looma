import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { eventToTrigger, dispatchDetail } from '../../utils/events';

@Component({
  tag: 'ui-checkbox',
  styleUrl: 'ui-checkbox.css',
  shadow: true,
})
export class UICheckbox {
  @Element() host: HTMLElement;

  @Prop() checked = false;
  @Prop({ attribute: 'default-checked' }) defaultChecked = false;
  @Prop() disabled = false;
  @Prop() indeterminate = false;
  @Prop() required = false;
  @Prop() value = 'on';

  @State() internalChecked = false;

  private slotRef?: HTMLSlotElement;

  @Watch('checked')
  syncFromProp() {
    this.internalChecked = this.checked;
  }

  @Watch('internalChecked')
  @Watch('indeterminate')
  @Watch('disabled')
  @Watch('required')
  syncToInput() {
    const input = this.getInput();
    if (!input) return;
    this.host.dataset.disabled = this.disabled ? 'true' : '';
    this.host.setAttribute('aria-disabled', String(this.disabled));
    input.checked = this.internalChecked;
    input.indeterminate = this.indeterminate;
    input.disabled = this.disabled;
    input.required = this.required;
    input.value = this.value;
  }

  componentDidLoad() {
    this.syncFromProp();
    this.internalChecked = this.internalChecked || this.defaultChecked;
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
    return (nodes.find((el) => el instanceof HTMLInputElement && el.type === 'checkbox') as HTMLInputElement) ?? null;
  }

  private onInputChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input) return;
    this.internalChecked = input.checked;
    this.indeterminate = input.indeterminate;
    dispatchDetail(this.host, 'change', {
      checked: this.internalChecked,
      value: this.value,
      trigger: eventToTrigger(e),
    });
  };

  render() {
    return (
      <Host
        role="checkbox"
        aria-checked={this.indeterminate ? 'mixed' : String(this.internalChecked)}
        aria-disabled={String(this.disabled)}
        data-disabled={this.disabled ? '' : undefined}
      >
        <slot ref={(el) => (this.slotRef = el)} />
      </Host>
    );
  }
}
