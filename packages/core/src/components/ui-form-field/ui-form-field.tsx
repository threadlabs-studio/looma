import { Component, Prop, Element, Host, h } from '@stencil/core';
import { createId } from '../../utils/id';

@Component({
  tag: 'ui-form-field',
  styleUrl: 'ui-form-field.css',
  shadow: true,
})
export class UIFormField {
  @Element() host: HTMLElement;

  @Prop() invalid = false;
  @Prop() disabled = false;
  @Prop() required = false;

  componentDidLoad() {
    this.wire();
  }

  componentDidUpdate() {
    this.wire();
  }

  private wire() {
    const label = this.host.querySelector('label');
    const input = this.host.querySelector('input, textarea, select');
    const help = this.host.querySelector('[data-slot="help"]');
    const error = this.host.querySelector('[data-slot="error"], [role="alert"]');

    if (!input) return;

    if (!input.id) {
      input.id = createId('form-field-input');
    }
    if (label && !label.getAttribute('for')) {
      label.setAttribute('for', input.id);
    }

    const describedIds: string[] = [];
    if (help) {
      if (!help.id) help.id = createId('form-field-help');
      describedIds.push(help.id);
    }
    if (error) {
      if (!error.id) error.id = createId('form-field-error');
      describedIds.push(error.id);
    }
    if (describedIds.length) {
      input.setAttribute('aria-describedby', describedIds.join(' '));
    }

    (input as HTMLInputElement).disabled = this.disabled;
    (input as HTMLInputElement).required = this.required;
    input.setAttribute('aria-invalid', this.invalid ? 'true' : 'false');
  }

  render() {
    return (
      <Host
        data-invalid={this.invalid ? '' : undefined}
        data-disabled={this.disabled ? '' : undefined}
        data-required={this.required ? '' : undefined}
      >
        <slot />
      </Host>
    );
  }
}
