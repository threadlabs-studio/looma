import { Component, Element, Event, type EventEmitter, Host, Method, Prop, State, Watch, h } from '@stencil/core';
import type { ComboboxChange, ComboboxConfig, ComboboxOption } from '../../field/combobox';
import type { MultiComboboxCreate, MultiComboboxItem, MultiComboboxItemChange } from '../../field/multi-combobox';

/** A multi-value combobox with removable, customizable selected items. */
@Component({ tag: 'ui-multi-combobox', styleUrl: 'ui-multi-combobox.css', shadow: true })
export class UIMultiCombobox {
  @Element() host: HTMLElement;
  @Prop() label = '';
  @Prop() placeholder = '';
  @Prop() items: readonly MultiComboboxItem[] = [];
  @Prop() config: ComboboxConfig = {};
  @Prop() query?: string;
  @Prop() defaultQuery = '';
  @Prop() disabled = false;
  @Prop({ attribute: 'readonly' }) readOnly = false;
  @Prop() required = false;
  @Prop() name = '';

  @Event({ eventName: 'query-change' }) queryChange: EventEmitter<{ query: string; display: string; trigger: 'keyboard' | 'pointer' | 'programmatic' }>;
  @Event({ eventName: 'add-item' }) addItem: EventEmitter<MultiComboboxItemChange>;
  @Event({ eventName: 'remove-item' }) removeItem: EventEmitter<MultiComboboxItemChange>;
  @Event({ eventName: 'create-item' }) createItem: EventEmitter<MultiComboboxCreate>;
  @Event({ eventName: 'options-change' }) optionsChange: EventEmitter<readonly ComboboxOption[]>;

  @State() raw = '';
  @State() rows: readonly ComboboxOption[] = [];

  private combobox?: HTMLUiComboboxElement;
  private filteredConfig?: ComboboxConfig;
  private filteredConfigSource?: ComboboxConfig;
  private filteredSelection = '';

  componentWillLoad() { this.raw = this.query ?? this.defaultQuery; }

  @Watch('query')
  syncQuery() {
    if (this.query !== undefined) this.raw = this.query;
  }

  private get selectedValues() { return new Set(this.items.map(item => item.value)); }

  private get comboboxConfig(): ComboboxConfig {
    const selectionKey = this.items.map(item => item.value).join('\u0000');
    if (this.filteredConfig && this.filteredConfigSource === this.config && this.filteredSelection === selectionKey) {
      return this.filteredConfig;
    }
    const ownerFilter = this.config.filter;
    const selected = this.selectedValues;
    this.filteredConfigSource = this.config;
    this.filteredSelection = selectionKey;
    this.filteredConfig = {
      ...this.config,
      filter: (option, query, context) => !selected.has(option.value)
        && (ownerFilter ? ownerFilter(option, query, context) : option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())),
    };
    return this.filteredConfig;
  }

  private setQuery(query: string, trigger: 'keyboard' | 'pointer' | 'programmatic') {
    if (this.query === undefined) this.raw = query;
    this.queryChange.emit({ query, display: query, trigger });
  }

  private onQueryChange = (event: CustomEvent<{ query: string; display: string; trigger: 'keyboard' | 'pointer' | 'programmatic' }>) => {
    event.stopPropagation();
    this.setQuery(event.detail.query, event.detail.trigger);
  };

  private onOptionsChange = (event: CustomEvent<readonly ComboboxOption[]>) => {
    event.stopPropagation();
    this.rows = event.detail;
    this.optionsChange.emit(event.detail);
  };

  private onValueChange = (event: CustomEvent<ComboboxChange>) => {
    event.stopPropagation();
    if (event.detail.kind !== 'selection' || !event.detail.option) return;
    const item = event.detail.option;
    this.addItem.emit({ item, index: this.items.length, trigger: event.detail.trigger });
    // ui-combobox emits its selection value before the matching label query.
    // Clear after both owner notifications so the stale label cannot win.
    queueMicrotask(() => this.setQuery('', event.detail.trigger));
  };

  private onCreateEntry = (event: CustomEvent<ComboboxChange>) => {
    event.stopPropagation();
    const query = event.detail.query.trim();
    if (!query) return;
    this.setQuery('', event.detail.trigger);
    this.createItem.emit({ query, trigger: event.detail.trigger });
  };

  private remove(index: number, trigger: MultiComboboxItemChange['trigger']) {
    const item = this.items[index];
    if (!item || item.disabled || this.disabled || this.readOnly) return;
    this.removeItem.emit({ item, index, trigger });
    requestAnimationFrame(() => {
      const buttons = this.host.shadowRoot?.querySelectorAll<HTMLButtonElement>('[part="item"]') ?? [];
      const next = buttons[Math.min(index, buttons.length - 1)] ?? buttons[index - 1];
      if (next && next.dataset.value !== item.value) next.focus();
      else void this.focusInput();
    });
  }

  private focusItem(index: number) {
    this.host.shadowRoot?.querySelectorAll<HTMLButtonElement>('[part="item"]')[index]?.focus();
  }

  private onItemKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault(); event.stopPropagation(); this.focusItem(Math.max(0, index - 1));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault(); event.stopPropagation();
      if (index === this.items.length - 1) void this.focusInput(); else this.focusItem(index + 1);
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault(); event.stopPropagation(); this.remove(index, 'keyboard');
    }
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || this.disabled || this.readOnly || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const input = event.composedPath().find(node => node instanceof HTMLInputElement) as HTMLInputElement | undefined;
    if (!input || this.raw || (input.selectionStart ?? 0) > 0) return;
    if (event.key === 'ArrowLeft' && this.items.length) {
      event.preventDefault(); this.focusItem(this.items.length - 1);
    } else if (event.key === 'Backspace' && this.items.length) {
      event.preventDefault(); this.remove(this.items.length - 1, 'keyboard');
    }
  };

  @Method()
  async focusInput() { await this.combobox?.focusInput(); }

  render() {
    return <Host onKeyDown={this.onKeyDown}>
      <ui-combobox ref={element => this.combobox = element} label={this.label} label-visibility="sr-only"
        placeholder={this.placeholder} name={this.name} value={null} query={this.raw} config={this.comboboxConfig}
        size="sm" disabled={this.disabled} readOnly={this.readOnly} required={this.required}
        onQuery-change={this.onQueryChange} onValue-change={this.onValueChange}
        onCreate-entry={this.onCreateEntry} onOptions-change={this.onOptionsChange}>
        <div slot="start" class="items" role="group" aria-label={`Selected ${this.label}`}>
          {this.items.map((item, index) => <button type="button" part="item" class="item" data-value={item.value}
            tabIndex={-1} disabled={this.disabled || this.readOnly || item.disabled}
            aria-label={`${item.label}, press Delete or Backspace to remove`}
            onKeyDown={event => this.onItemKeyDown(event, index)}>
            <slot name={`item-${item.id}`}><ui-chip appearance="pill">{item.label}</ui-chip></slot>
          </button>)}
        </div>
        {this.rows.map(option => <span slot={`option-${option.id}`}><slot name={`option-${option.id}`}>{option.label}</slot></span>)}
        <span slot="create"><slot name="create">Create “{this.raw}”</slot></span>
        <span slot="loading"><slot name="loading">Loading suggestions…</slot></span>
        <span slot="empty"><slot name="empty">No suggestions.</slot></span>
        <span slot="error"><slot name="error">Unable to load suggestions.</slot></span>
        <div slot="footer"><slot name="footer" /></div>
      </ui-combobox>
    </Host>;
  }
}
