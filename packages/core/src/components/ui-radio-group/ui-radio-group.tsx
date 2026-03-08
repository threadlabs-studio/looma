import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { eventToTrigger } from '../../utils/events';
import { dispatchDetail } from '../../utils/events';

@Component({
  tag: 'ui-radio-group',
  styleUrl: 'ui-radio-group.css',
  shadow: true,
})
export class UIRadioGroup {
  @Element() host: HTMLElement;

  @Prop() value = '';
  @Prop() name = '';
  @Prop() orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Prop() disabled = false;
  @Prop() required = false;

  @State() internalValue = '';

  @Watch('value')
  syncFromProp() {
    this.internalValue = this.value;
  }

  @Watch('internalValue')
  @Watch('name')
  @Watch('orientation')
  @Watch('disabled')
  syncToRadios() {
    const radios = this.getRadios();
    radios.forEach((radio) => {
      (radio as HTMLElement & { checked: boolean; name: string }).checked =
        (radio.getAttribute('value') ?? '') === this.internalValue;
      (radio as HTMLElement & { name: string }).name = this.name || this.groupId;
      if (this.disabled) {
        radio.setAttribute('aria-disabled', 'true');
        radio.setAttribute('data-disabled', 'true');
      } else {
        radio.removeAttribute('aria-disabled');
        radio.removeAttribute('data-disabled');
      }
    });
    this.updateRovingTabindex();
  }

  private groupId = `ui-radio-group-${Math.random().toString(36).slice(2, 9)}`;

  componentDidLoad() {
    this.syncFromProp();
    this.syncToRadios();
    this.host.addEventListener('change', this.onRadioChange);
    this.host.addEventListener('keydown', this.onKeydown);
  }

  disconnectedCallback() {
    this.host.removeEventListener('change', this.onRadioChange);
    this.host.removeEventListener('keydown', this.onKeydown);
  }

  componentDidUpdate() {
    this.syncToRadios();
  }

  private getRadios(): Element[] {
    return Array.from(this.host.querySelectorAll('ui-radio'));
  }

  private updateRovingTabindex() {
    const radios = this.getRadios();
    const currentIndex = radios.findIndex((r) => (r.getAttribute('value') ?? '') === this.internalValue);
    radios.forEach((r, i) => {
      const input = r.querySelector('input[type="radio"]') as HTMLInputElement | null;
      if (input) {
        input.tabIndex = i === (currentIndex >= 0 ? currentIndex : 0) ? 0 : -1;
      }
    });
  }

  private setValue(newValue: string, trigger: 'keyboard' | 'pointer' | 'programmatic') {
    const prev = this.internalValue;
    this.internalValue = newValue;
    this.syncToRadios();
    dispatchDetail(this.host, 'select', { value: newValue, previousValue: prev, trigger });
    dispatchDetail(this.host, 'change', {
      checked: true,
      value: newValue,
      trigger,
    });
  }

  private onRadioChange = (e: Event) => {
    const target = (e.target as HTMLElement).closest?.('ui-radio');
    if (!target || target.getRootNode() !== this.host.getRootNode()) return;
    const value = target.getAttribute('value') ?? '';
    if (value && value !== this.internalValue) {
      this.setValue(value, eventToTrigger(e));
    }
  };

  private onKeydown = (e: KeyboardEvent) => {
    const radios = this.getRadios();
    if (radios.length === 0) return;
    const currentIndex = radios.findIndex((r) => (r.getAttribute('value') ?? '') === this.internalValue);
    const axis = this.orientation === 'vertical' ? 'vertical' : 'horizontal';
    const isPrev = axis === 'horizontal' ? e.key === 'ArrowLeft' : e.key === 'ArrowUp';
    const isNext = axis === 'horizontal' ? e.key === 'ArrowRight' : e.key === 'ArrowDown';
    if (!isPrev && !isNext) return;
    e.preventDefault();
    let nextIndex: number;
    if (isNext) {
      nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, radios.length - 1);
    } else {
      nextIndex = currentIndex <= 0 ? radios.length - 1 : currentIndex - 1;
    }
    const nextRadio = radios[nextIndex];
    const nextValue = nextRadio?.getAttribute('value') ?? '';
    if (nextValue) {
      this.setValue(nextValue, 'keyboard');
      (nextRadio?.querySelector('input[type="radio"]') as HTMLInputElement)?.focus();
    }
  };

  render() {
    return (
      <Host
        role="radiogroup"
        aria-orientation={this.orientation}
        data-orientation={this.orientation}
        data-disabled={this.disabled ? '' : undefined}
      >
        <slot />
      </Host>
    );
  }
}
