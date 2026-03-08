import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { eventToTrigger, dispatchDetail } from '../../utils/events';

@Component({
  tag: 'ui-input',
  styleUrl: 'ui-input.css',
  shadow: true,
})
export class UIInput {
  @Element() host: HTMLElement;

  @Prop() value = '';
  @Prop({ attribute: 'default-value' }) defaultValue = '';
  @Prop() disabled = false;
  @Prop() invalid = false;
  @Prop({ attribute: 'readonly' }) readOnly = false;

  @State() internalValue = '';

  private slotRef?: HTMLSlotElement;

  @Watch('value')
  syncFromProp() {
    this.internalValue = this.value;
  }

  @Watch('internalValue')
  @Watch('defaultValue')
  @Watch('disabled')
  @Watch('invalid')
  @Watch('readOnly')
  syncToInput() {
    const input = this.getInput();
    if (!input) return;
    this.host.dataset.invalid = this.invalid ? 'true' : '';
    input.value = this.internalValue;
    input.defaultValue = this.defaultValue;
    input.disabled = this.disabled;
    input.readOnly = this.readOnly;
    input.setAttribute('aria-invalid', this.invalid ? 'true' : 'false');
  }

  componentDidLoad() {
    this.syncFromProp();
    this.slotRef?.addEventListener('slotchange', () => this.syncToInput());
    this.syncToInput();
    const input = this.getInput();
    input?.addEventListener('input', this.onInput);
    input?.addEventListener('change', this.onChange);
  }

  disconnectedCallback() {
    const input = this.getInput();
    input?.removeEventListener('input', this.onInput);
    input?.removeEventListener('change', this.onChange);
  }

  componentDidUpdate() {
    this.syncToInput();
  }

  private getInput(): HTMLInputElement | null {
    const slot = this.host.shadowRoot?.querySelector('slot');
    const nodes = slot?.assignedElements() ?? Array.from(this.host.children);
    return (nodes.find((el) => el.tagName === 'INPUT') as HTMLInputElement) ?? null;
  }

  private onInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input) return;
    this.internalValue = input.value;
    dispatchDetail(this.host, 'input', {
      value: this.internalValue,
      trigger: eventToTrigger(e),
    });
  };

  private onChange = (e: Event) => {
    const input = this.getInput();
    if (!input) return;
    this.internalValue = input.value;
    dispatchDetail(this.host, 'change', {
      value: this.internalValue,
      trigger: eventToTrigger(e),
    });
  };

  render() {
    return (
      <Host data-invalid={this.invalid ? '' : undefined}>
        <slot ref={(el) => (this.slotRef = el)} />
      </Host>
    );
  }
}
