import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { eventToTrigger } from '../../utils/events';
import { dispatchDetail } from '../../utils/events';

@Component({
  tag: 'ui-tabs',
  styleUrl: 'ui-tabs.css',
  shadow: true,
})
export class UITabs {
  @Element() host: HTMLElement;

  @Prop() value = '';
  @Prop({ attribute: 'default-value' }) defaultValue = '';
  @Prop() orientation: 'horizontal' | 'vertical' = 'horizontal';

  @State() internalValue = '';

  @Watch('value')
  syncFromProp() {
    this.internalValue = this.value;
  }

  @Watch('internalValue')
  @Watch('orientation')
  syncState() {
    const tabs = this.getTabs();
    if (tabs.length === 0) return;

    tabs.forEach((tab) => {
      const tabId = (tab as HTMLElement).id ?? tab.getAttribute('aria-controls') ?? '';
      const isSelected = tabId === this.internalValue;
      tab.setAttribute('aria-selected', String(isSelected));
      (tab as HTMLElement).tabIndex = isSelected ? 0 : -1;

      const controlsId = tab.getAttribute('aria-controls');
      if (controlsId) {
        const panel = this.host.querySelector(`#${CSS.escape(controlsId)}`) ?? document.getElementById(controlsId);
        if (panel) {
          (panel as HTMLElement).hidden = !isSelected;
        }
      }
    });
  }

  componentDidLoad() {
    this.syncFromProp();
    if (!this.internalValue && this.defaultValue) {
      this.internalValue = this.defaultValue;
    }
    if (!this.internalValue) {
      const tabs = this.getTabs();
      if (tabs.length > 0) {
        this.internalValue = tabs[0]?.id ?? tabs[0]?.getAttribute('aria-controls') ?? '';
      }
    }
    this.syncState();
    this.host.addEventListener('keydown', this.onKeydown);
    this.host.addEventListener('click', this.onClick);
  }

  disconnectedCallback() {
    this.host.removeEventListener('keydown', this.onKeydown);
    this.host.removeEventListener('click', this.onClick);
  }

  componentDidUpdate() {
    this.syncState();
  }

  private getTabs(): Element[] {
    return Array.from(this.host.querySelectorAll('[role="tab"]'));
  }

  private setValueFromTab(tab: Element, trigger: 'keyboard' | 'pointer' | 'programmatic') {
    const newValue = (tab as HTMLElement).id ?? tab.getAttribute('aria-controls') ?? '';
    if (!newValue) return;
    const prev = this.internalValue;
    this.internalValue = newValue;
    this.syncState();
    dispatchDetail(this.host, 'select', { value: newValue, previousValue: prev || undefined, trigger });
  }

  private onClick = (e: Event) => {
    const tab = (e.target as HTMLElement).closest?.('[role="tab"]');
    if (!tab || !this.host.contains(tab)) return;
    this.setValueFromTab(tab, eventToTrigger(e));
  };

  private onKeydown = (e: KeyboardEvent) => {
    const tab = (e.target as HTMLElement).closest?.('[role="tab"]');
    if (!tab || !this.host.contains(tab)) return;
    const tabs = this.getTabs();
    if (tabs.length === 0) return;
    const currentIndex = tabs.indexOf(tab);
    const isVertical = this.orientation === 'vertical';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    if (e.key === nextKey || e.key === prevKey) {
      e.preventDefault();
      const nextIndex =
        e.key === nextKey
          ? Math.min(currentIndex + 1, tabs.length - 1)
          : currentIndex <= 0
            ? tabs.length - 1
            : currentIndex - 1;
      this.setValueFromTab(tabs[nextIndex]!, 'keyboard');
      (tabs[nextIndex] as HTMLElement).focus();
    }
  };

  render() {
    return (
      <Host
        orientation={this.orientation}
        data-orientation={this.orientation}
      >
        <slot />
      </Host>
    );
  }
}
