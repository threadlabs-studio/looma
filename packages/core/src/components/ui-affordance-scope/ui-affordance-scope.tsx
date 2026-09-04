import { Component, Element, Host, Prop, Watch, h } from '@stencil/core';
import { createProximityCoordinator, type ProximityCoordinator } from '../../overlay/positioning';

@Component({
  tag: 'ui-affordance-scope',
  styleUrl: 'ui-affordance-scope.css',
  shadow: true,
})
export class UIAffordanceScope {
  @Element() host: HTMLElement;

  /** Distance outside each registered affordance that reveals its near state. */
  @Prop({ attribute: 'near-radius', reflect: true }) nearRadius = 32;

  private coordinator: ProximityCoordinator | null = null;

  componentDidLoad() {
    this.connectCoordinator();
  }

  disconnectedCallback() {
    this.coordinator?.destroy();
    this.coordinator = null;
  }

  @Watch('nearRadius')
  connectCoordinator() {
    this.coordinator?.destroy();
    this.coordinator = createProximityCoordinator(this.host, {
      nearRadius: this.nearRadius,
    });
  }

  private onSlotChange = () => {
    this.coordinator?.refresh();
  };

  render() {
    return (
      <Host>
        <slot onSlotchange={this.onSlotChange} />
      </Host>
    );
  }
}
