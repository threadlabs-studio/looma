import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { eventToTrigger } from '../../utils/events';
import { dispatchDetail } from '../../utils/events';
import { controlledOrDefault, isControlled } from '../../utils/controlled-state';

@Component({
  tag: 'ui-radio',
  styleUrl: 'ui-radio.css',
  shadow: true,
})
export class UIRadio {
  @Element() host: HTMLElement;

  /** Controlled checked state. Omit it to use defaultChecked and local interaction state. */
  @Prop() checked?: boolean;
  @Prop({ attribute: 'default-checked' }) defaultChecked = false;
  @Prop() disabled = false;
  @Prop() name = '';
  @Prop() required = false;
  @Prop() value = 'on';

  @State() internalChecked = false;

  private slotRef?: HTMLSlotElement;

  @Watch('checked')
  syncFromProp() {
    if (isControlled(this.checked)) this.internalChecked = this.checked;
  }

  @Watch('disabled')
  @Watch('name')
  @Watch('required')
  @Watch('value')
  syncToInput() {
    const input = this.getInput();
    if (!input) return;
    this.host.toggleAttribute('data-disabled', this.disabled);
    input.checked = this.internalChecked;
    input.disabled = this.disabled;
    input.name = this.name;
    input.required = this.required;
    input.value = this.value;
  }

  componentDidLoad() {
    this.internalChecked = controlledOrDefault(this.checked, this.defaultChecked);
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
    if (!isControlled(this.checked)) this.internalChecked = true;
    else this.syncToInput();
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
        aria-checked={String(this.internalChecked)}
        aria-disabled={String(this.disabled)}
        data-disabled={this.disabled ? '' : undefined}
      >
        <slot ref={(el) => (this.slotRef = el)} />
      </Host>
    );
  }
}
