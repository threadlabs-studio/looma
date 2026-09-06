import { Component, Host, Prop, h } from '@stencil/core';

/** A compact, non-interactive metadata label. */
@Component({
  tag: 'ui-chip',
  styleUrl: 'ui-chip.css',
  shadow: true,
})
export class UIChip {
  /** `tag` has a square leading edge and an angled trailing edge; `pill` is fully rounded. */
  @Prop() appearance: 'tag' | 'pill' = 'tag';

  render() {
    return <Host data-appearance={this.appearance}><slot /></Host>;
  }
}
