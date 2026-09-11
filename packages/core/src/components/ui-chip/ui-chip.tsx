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

  /** Compact typography size. */
  @Prop() size: 'xs' | 'sm' = 'xs';

  render() {
    return (
      <Host data-appearance={this.appearance} data-size={this.size}>
        <span class="chip__surface"><span class="chip__label"><slot /></span></span>
      </Host>
    );
  }
}
