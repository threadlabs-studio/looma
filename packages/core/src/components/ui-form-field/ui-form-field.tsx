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

  private observer: MutationObserver | null = null;
  private activeInput: HTMLElement | null = null;
  private ownedDescriptionIds = new Set<string>();
  private wireQueued = false;

  componentDidLoad() {
    this.observer = new MutationObserver(this.scheduleWire);
    this.observer.observe(this.host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-describedby', 'data-slot', 'id', 'role'],
    });
    this.wire();
  }

  componentDidUpdate() {
    this.scheduleWire();
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    this.observer = null;
    this.removeOwnedDescriptions(this.activeInput);
    this.activeInput = null;
    this.ownedDescriptionIds.clear();
  }

  private descriptionIds(input: HTMLElement): string[] {
    return Array.from(new Set(
      (input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean),
    ));
  }

  private removeOwnedDescriptions(input: HTMLElement | null) {
    if (!input || this.ownedDescriptionIds.size === 0) return;
    const remaining = this.descriptionIds(input)
      .filter(id => !this.ownedDescriptionIds.has(id));
    if (remaining.length > 0) input.setAttribute('aria-describedby', remaining.join(' '));
    else input.removeAttribute('aria-describedby');
  }

  private scheduleWire = () => {
    if (this.wireQueued) return;
    this.wireQueued = true;
    queueMicrotask(() => {
      this.wireQueued = false;
      this.wire();
    });
  };

  private wire() {
    const label = this.host.querySelector('label');
    const input = this.host.querySelector<HTMLElement>('input, textarea, select');
    const help = this.host.querySelector('[data-slot="help"]');
    const error = this.host.querySelector('[data-slot="error"], [role="alert"]');

    if (input !== this.activeInput) {
      this.removeOwnedDescriptions(this.activeInput);
      this.activeInput = input;
      this.ownedDescriptionIds.clear();
    }
    if (!input) return;

    if (!input.id) {
      input.id = createId('form-field-input');
    }
    if (label && !label.getAttribute('for')) {
      label.setAttribute('for', input.id);
    }

    const previousOwnedIds = this.ownedDescriptionIds;
    const externalIds = this.descriptionIds(input)
      .filter(id => !previousOwnedIds.has(id));
    const describedIds: string[] = [];
    if (help) {
      if (!help.id) help.id = createId('form-field-help');
      describedIds.push(help.id);
    }
    if (error) {
      if (!error.id) error.id = createId('form-field-error');
      describedIds.push(error.id);
    }
    const nextOwnedIds = describedIds.filter(id => !externalIds.includes(id));
    const nextDescribedIds = Array.from(new Set([...externalIds, ...describedIds]));
    const nextDescribedBy = nextDescribedIds.join(' ');
    if (input.getAttribute('aria-describedby') !== nextDescribedBy) {
      if (nextDescribedBy) input.setAttribute('aria-describedby', nextDescribedBy);
      else input.removeAttribute('aria-describedby');
    }
    this.ownedDescriptionIds = new Set(nextOwnedIds);

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
        <slot onSlotchange={this.scheduleWire} />
      </Host>
    );
  }
}
