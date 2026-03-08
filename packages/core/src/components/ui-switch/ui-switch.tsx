import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { dispatchDetail } from '../../utils/events';

@Component({
  tag: 'ui-switch',
  styleUrl: 'ui-switch.css',
  shadow: true,
})
export class UISwitch {
  @Element() host: HTMLElement;

  @Prop() checked = false;
  @Prop({ attribute: 'default-checked' }) defaultChecked = false;
  @Prop() disabled = false;
  @Prop() required = false;
  @Prop() value = 'on';

  @State() internalChecked = false;

  @Watch('checked')
  syncFromProp() {
    this.internalChecked = this.checked;
  }

  componentDidLoad() {
    this.syncFromProp();
    this.internalChecked = this.internalChecked || this.defaultChecked;
  }

  private toggle = (trigger: 'keyboard' | 'pointer' | 'programmatic') => {
    if (this.disabled) return;
    this.internalChecked = !this.internalChecked;
    dispatchDetail(this.host, 'change', {
      checked: this.internalChecked,
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
            this.internalChecked = (e.target as HTMLInputElement).checked;
            dispatchDetail(this.host, 'change', {
              checked: this.internalChecked,
              value: this.value,
              trigger: 'pointer',
            });
          }}
        />
        <slot />
      </Host>
    );
  }
}
