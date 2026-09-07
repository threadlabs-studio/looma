import { Component, Host, Prop, h } from '@stencil/core';
import { loomaIconMarkup, type LoomaIconName } from '../../icons';

export type CalloutTone = 'info' | 'note' | 'warning' | 'success' | 'error';

const toneIcons: Record<CalloutTone, LoomaIconName> = {
  info: 'info',
  note: 'notebook-pen',
  warning: 'triangle-alert',
  success: 'circle-check',
  error: 'circle-x',
};

/** A static semantic message with a tone-specific icon. */
@Component({
  tag: 'ui-callout',
  styleUrl: 'ui-callout.css',
  shadow: true,
})
export class UICallout {
  @Prop() tone: CalloutTone = 'info';

  render() {
    const icon = toneIcons[this.tone] ?? toneIcons.info;
    return (
      <Host role="note" data-tone={this.tone}>
        <div class="callout__surface">
          <span class="icon" aria-hidden="true" innerHTML={loomaIconMarkup(icon)} />
          <div class="content"><slot /></div>
        </div>
      </Host>
    );
  }
}
