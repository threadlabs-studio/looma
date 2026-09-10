import { Component, Element, Event, type EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';
import { controlledOrDefault, isControlled } from '../../utils/controlled-state';
import type { EditableChange } from '../../field/editable';

/** Swaps an explicit presentation trigger for a focused editing control. */
@Component({ tag: 'ui-editable', styleUrl: 'ui-editable.css', shadow: true })
export class UIEditable {
  @Element() host: HTMLElement;
  /** Controlled edit state. Omit it to use defaultEdit and local interaction state. */
  @Prop() edit?: boolean;
  @Prop({ attribute: 'default-edit' }) defaultEdit = false;
  @Prop() disabled = false;

  @Event({ eventName: 'edit-change' }) editChange: EventEmitter<EditableChange>;
  @State() internalEdit = false;

  private trigger: HTMLElement | null = null;

  @Watch('edit')
  syncFromProp() {
    if (isControlled(this.edit)) this.internalEdit = this.edit;
  }

  componentWillLoad() {
    this.internalEdit = controlledOrDefault(this.edit, this.defaultEdit);
  }

  componentDidLoad() {
    this.host.ownerDocument.addEventListener('pointerdown', this.onDocumentPointerDown, true);
  }

  disconnectedCallback() {
    this.host.ownerDocument.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
  }

  private requestEdit(next: boolean, reason: EditableChange['reason'], trigger: EditableChange['trigger']) {
    if (this.disabled || this.internalEdit === next) return;
    if (!isControlled(this.edit)) this.internalEdit = next;
    this.editChange.emit({ edit: next, reason, trigger });
    if (next) requestAnimationFrame(() => this.focusEditor());
    else requestAnimationFrame(() => this.trigger?.focus());
  }

  private focusEditor() {
    const editRoot = this.host.querySelector<HTMLElement>('[slot="edit"]');
    const candidate = editRoot?.matches('input, textarea, select, button, [tabindex], ui-combobox, ui-multi-combobox')
      ? editRoot
      : editRoot?.querySelector<HTMLElement>('input, textarea, select, button, [tabindex], ui-combobox, ui-multi-combobox');
    const focusInput = (candidate as HTMLElement & { focusInput?: () => Promise<void> | void } | null)?.focusInput;
    if (typeof focusInput === 'function') void focusInput.call(candidate);
    else candidate?.focus();
  }

  private eventTrigger(event: Event) {
    return event.composedPath().find(node => node instanceof HTMLElement && node.hasAttribute('data-ui-editable-trigger')) as HTMLElement | undefined;
  }

  private onClick = (event: MouseEvent) => {
    if (this.internalEdit || this.disabled) return;
    const trigger = this.eventTrigger(event);
    if (!trigger) return;
    this.trigger = trigger;
    this.requestEdit(true, 'activate', 'pointer');
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (this.internalEdit && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.requestEdit(false, 'escape', 'keyboard');
      return;
    }
    if (this.internalEdit || !['Enter', ' '].includes(event.key)) return;
    const trigger = this.eventTrigger(event);
    if (!trigger) return;
    event.preventDefault();
    this.trigger = trigger;
    this.requestEdit(true, 'activate', 'keyboard');
  };

  private onDocumentPointerDown = (event: PointerEvent) => {
    if (!this.internalEdit || event.composedPath().includes(this.host)) return;
    this.requestEdit(false, 'light-dismiss', 'pointer');
  };

  render() {
    return <Host data-edit={this.internalEdit ? '' : undefined} data-disabled={this.disabled ? '' : undefined}
      onClick={this.onClick} onKeyDown={this.onKeyDown}>
      <div part="preview" hidden={this.internalEdit}><slot name="preview" /></div>
      <div part="edit" hidden={!this.internalEdit}><slot name="edit" /></div>
    </Host>;
  }
}
