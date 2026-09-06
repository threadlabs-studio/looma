import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { dispatchDetail, eventToTrigger } from '../../utils/events';

@Component({
  tag: 'ui-select',
  styleUrl: 'ui-select.css',
  shadow: true,
})
export class UISelect {
  @Element() host: HTMLElement;

  @Prop() value?: string;
  @Prop({ attribute: 'default-value' }) defaultValue = '';
  @Prop() disabled = false;
  @Prop() invalid = false;
  @Prop() required = false;

  @State() internalValue = '';

  private slotRef?: HTMLSlotElement;

  @Watch('value')
  syncFromProp() {
    if (this.value !== undefined) this.internalValue = this.value;
  }

  @Watch('internalValue')
  @Watch('defaultValue')
  @Watch('disabled')
  @Watch('invalid')
  @Watch('required')
  syncToSelect() {
    const select = this.getSelect();
    if (!select) return;
    this.host.dataset.invalid = this.invalid ? 'true' : '';
    // Preserve values owned by a framework-bound slotted select. Supplying a
    // host value opts into controlled behavior; otherwise only an explicit
    // default is applied when the native select has no selection.
    if (this.value !== undefined) select.value = this.internalValue;
    else if (!select.value && this.defaultValue) select.value = this.defaultValue;
    select.disabled = this.disabled;
    select.required = this.required;
    select.setAttribute('aria-invalid', this.invalid ? 'true' : 'false');
  }

  componentDidLoad() {
    this.syncFromProp();
    this.slotRef?.addEventListener('slotchange', () => this.syncToSelect());
    this.syncToSelect();
    const select = this.getSelect();
    select?.addEventListener('input', this.onInput);
    select?.addEventListener('change', this.onChange);
  }

  disconnectedCallback() {
    const select = this.getSelect();
    select?.removeEventListener('input', this.onInput);
    select?.removeEventListener('change', this.onChange);
  }

  componentDidUpdate() {
    this.syncToSelect();
  }

  private getSelect(): HTMLSelectElement | null {
    const slot = this.host.shadowRoot?.querySelector('slot');
    const nodes = slot?.assignedElements() ?? Array.from(this.host.children);
    return (nodes.find((el) => el.tagName === 'SELECT') as HTMLSelectElement) ?? null;
  }

  private onInput = (e: Event) => {
    const select = e.target as HTMLSelectElement;
    if (!select) return;
    this.internalValue = select.value;
    dispatchDetail(this.host, 'input', {
      value: this.internalValue,
      trigger: eventToTrigger(e),
    });
  };

  private onChange = (e: Event) => {
    const select = this.getSelect();
    if (!select) return;
    this.internalValue = select.value;
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
