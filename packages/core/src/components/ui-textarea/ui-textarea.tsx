import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { dispatchDetail, eventToTrigger } from '../../utils/events';

@Component({
  tag: 'ui-textarea',
  styleUrl: 'ui-textarea.css',
  shadow: true,
})
export class UITextarea {
  @Element() host: HTMLElement;

  @Prop() value = '';
  @Prop({ attribute: 'default-value' }) defaultValue = '';
  @Prop() disabled = false;
  @Prop() invalid = false;
  @Prop({ attribute: 'readonly' }) readOnly = false;
  @Prop() rows = 4;

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
  @Watch('rows')
  syncToTextarea() {
    const textarea = this.getTextarea();
    if (!textarea) return;
    this.host.dataset.invalid = this.invalid ? 'true' : '';
    textarea.value = this.internalValue;
    textarea.defaultValue = this.defaultValue;
    textarea.disabled = this.disabled;
    textarea.readOnly = this.readOnly;
    textarea.rows = this.rows;
    textarea.setAttribute('aria-invalid', this.invalid ? 'true' : 'false');
  }

  componentDidLoad() {
    this.syncFromProp();
    this.slotRef?.addEventListener('slotchange', () => this.syncToTextarea());
    this.syncToTextarea();
    const textarea = this.getTextarea();
    textarea?.addEventListener('input', this.onInput);
    textarea?.addEventListener('change', this.onChange);
  }

  disconnectedCallback() {
    const textarea = this.getTextarea();
    textarea?.removeEventListener('input', this.onInput);
    textarea?.removeEventListener('change', this.onChange);
  }

  componentDidUpdate() {
    this.syncToTextarea();
  }

  private getTextarea(): HTMLTextAreaElement | null {
    const slot = this.host.shadowRoot?.querySelector('slot');
    const nodes = slot?.assignedElements() ?? Array.from(this.host.children);
    return (nodes.find((el) => el.tagName === 'TEXTAREA') as HTMLTextAreaElement) ?? null;
  }

  private onInput = (e: Event) => {
    const textarea = e.target as HTMLTextAreaElement;
    if (!textarea) return;
    this.internalValue = textarea.value;
    dispatchDetail(this.host, 'input', {
      value: this.internalValue,
      trigger: eventToTrigger(e),
    });
  };

  private onChange = (e: Event) => {
    const textarea = this.getTextarea();
    if (!textarea) return;
    this.internalValue = textarea.value;
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
