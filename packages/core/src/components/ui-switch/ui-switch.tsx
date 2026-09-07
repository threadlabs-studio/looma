import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { dispatchDetail } from '../../utils/events';
import { controlledOrDefault, isControlled } from '../../utils/controlled-state';

@Component({
  tag: 'ui-switch',
  styleUrl: 'ui-switch.css',
  shadow: true,
})
export class UISwitch {
  @Element() host: HTMLElement;

  /** Controlled checked state. Omit it to use defaultChecked and local interaction state. */
  @Prop() checked?: boolean;
  @Prop({ attribute: 'default-checked' }) defaultChecked = false;
  @Prop() disabled = false;
  @Prop() required = false;
  @Prop() value = 'on';

  @State() internalChecked = false;

  @Watch('checked')
  syncFromProp() {
    if (isControlled(this.checked)) this.internalChecked = this.checked;
  }

  componentDidLoad() {
    this.internalChecked = controlledOrDefault(this.checked, this.defaultChecked);
  }

  private toggle = (trigger: 'keyboard' | 'pointer' | 'programmatic') => {
    if (this.disabled) return;
    const checked = !this.internalChecked;
    if (!isControlled(this.checked)) this.internalChecked = checked;
    dispatchDetail(this.host, 'change', {
      checked,
      value: this.value,
      trigger,
    });
  };

  private onKeydown = (e: KeyboardEvent) => {
    if (e.key !== ' ' || this.disabled) return;
    e.preventDefault();
    this.toggle('keyboard');
  };

  private onClick = (e: MouseEvent) => {
    if ((e.target as Node) === this.host?.shadowRoot?.querySelector('input')) return;
    this.toggle('pointer');
  };

  render() {
    return (
      <Host
        role="switch"
        aria-checked={String(this.internalChecked)}
        aria-disabled={String(this.disabled)}
        data-disabled={this.disabled ? '' : undefined}
        tabIndex={this.disabled ? -1 : 0}
        onKeyDown={this.onKeydown}
        onClick={this.onClick}
      >
        <input
          type="checkbox"
          checked={this.internalChecked}
          disabled={this.disabled}
          required={this.required}
          value={this.value}
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const input = e.target as HTMLInputElement;
            const checked = input.checked;
            if (!isControlled(this.checked)) this.internalChecked = checked;
            dispatchDetail(this.host, 'change', {
              checked,
              value: this.value,
              trigger: 'pointer',
            });
            if (isControlled(this.checked)) input.checked = this.internalChecked;
          }}
        />
        <slot />
      </Host>
    );
  }
}
