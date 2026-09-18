import { Component, Element, Event, type EventEmitter, Host, Method, Prop, State, Watch, h } from '@stencil/core';
import { createAnchoredSurface, type AnchoredSurface } from '../../overlay/positioning';
import { openOverlay, closeOverlay } from '../../overlay/manager';
import { formatEditingValue, validateField, type FieldResult } from '../../field/validation';
import type { ComboboxConfig, ComboboxOption, ComboboxChange, ComboboxValidationState } from '../../field/combobox';
import type { MultiComboboxItem, MultiComboboxItemChange, MultiComboboxCreate } from '../../field/multi-combobox';

/**
 * A single editable field with contextual suggestions, optional help and field validation.
 * With `multiple`, it becomes a multi-value tag field: `value` holds the selected
 * items, chips render before the cursor, and add/remove/create item events fire.
 */
@Component({ tag: 'ui-combobox', styleUrl: 'ui-combobox.css', shadow: true })
export class UICombobox {
  @Element() host: HTMLElement;
  /** Accessible visible label, associated with the native text input. */
  @Prop() label = '';
  @Prop() placeholder = '';
  @Prop() name = '';
  /**
   * Controlled canonical value. Undefined selects uncontrolled mode; null means no selection.
   * With `multiple`, this is the controlled list of selected items instead.
   */
  @Prop() value?: string | null | readonly MultiComboboxItem[];
  @Prop() defaultValue?: string;
  /** Render selected values as removable chips before the cursor. `value` becomes the item list. */
  @Prop({ reflect: true }) multiple = false;
  /** Characters that commit the current query and leave the input ready for the next item (multiple only). */
  @Prop() tokenSeparators: readonly string[] = [];
  /** Controlled raw editing text; independent of canonical selection. */
  @Prop() query?: string;
  @Prop() defaultQuery = '';
  /** Immutable configuration; replace the object/context when dependencies change. */
  @Prop() config: ComboboxConfig = {};
  @Prop() disabled = false;
  @Prop({ attribute: 'readonly' }) readOnly = false;
  @Prop() required = false;
  @Prop() size: 'sm' | 'md' = 'md';
  /** Keep the native label accessible while allowing compact composed controls. */
  @Prop({ attribute: 'label-visibility' }) labelVisibility: 'visible' | 'sr-only' = 'visible';
  @Prop() disclosure = false;
  @Prop() clearable = false;
  /** Optional description shown by the connected question-mark button. */
  @Prop() help = '';

  @Event({ eventName: 'query-change' }) queryChange: EventEmitter<{ query: string; display: string; trigger: 'keyboard' | 'pointer' | 'programmatic' }>;
  /** Single mode: the ComboboxChange. Multiple mode: the full current item list on any change. */
  @Event({ eventName: 'value-change' }) valueChange: EventEmitter<ComboboxChange | readonly MultiComboboxItem[]>;
  @Event({ eventName: 'free-entry' }) freeEntry: EventEmitter<ComboboxChange>;
  @Event({ eventName: 'create-entry' }) createEntry: EventEmitter<ComboboxChange>;
  @Event({ eventName: 'dependency-invalidate' }) dependencyInvalidate: EventEmitter<ComboboxChange>;
  @Event({ eventName: 'validation-change' }) validationChange: EventEmitter<ComboboxValidationState>;
  /** Supplies the current result rows for framework-owned rich slots. */
  @Event({ eventName: 'options-change' }) optionsChange: EventEmitter<readonly ComboboxOption[]>;
  /** Multiple mode: a suggestion or exact-match token was committed as a new item. */
  @Event({ eventName: 'add-item' }) addItem: EventEmitter<MultiComboboxItemChange>;
  /** Multiple mode: a selected item was removed via chip keyboard controls. */
  @Event({ eventName: 'remove-item' }) removeItem: EventEmitter<MultiComboboxItemChange>;
  /** Multiple mode: an unmatched query was submitted for creation. */
  @Event({ eventName: 'create-item' }) createItem: EventEmitter<MultiComboboxCreate>;

  @State() raw = '';
  @State() display = '';
  @State() selected: string | null = null;
  @State() expanded = false;
  @State() rows: readonly ComboboxOption[] = [];
  @State() active = -1;
  @State() loading = false;
  @State() helpOpen = false;
  @State() lookupError = '';
  @State() validation: ComboboxValidationState = { status: 'pristine', touched: false, dirty: false, issues: [] };

  private input?: HTMLInputElement;
  private popup?: HTMLElement;
  private field?: HTMLElement;
  private surface?: AnchoredSurface;
  private lookup?: AbortController;
  private validationRun?: AbortController;
  private lookupTimer?: ReturnType<typeof setTimeout>;
  private composing = false;
  private initialRaw = '';
  private overlayId = `ui-combobox-${Math.random().toString(36).slice(2)}`;
  private alive = false;
  private fullSet = false;
  private knownOptions = new Map<string, ComboboxOption>();
  private awaitingLabel: string | null = null;
  private proposedChange?: { value: string | null; query: string };
  private formattedRaw?: string;
  private formattedWith?: ComboboxConfig['format'];

  /** Multiple mode: the controlled selected items (from `value`). Empty otherwise. */
  private get items(): readonly MultiComboboxItem[] {
    return this.multiple && Array.isArray(this.value) ? this.value : [];
  }
  private get selectedValues() { return new Set(this.items.map(item => item.value)); }

  componentWillLoad() {
    if (this.multiple) {
      this.selected = null;
      this.raw = this.query ?? this.defaultQuery;
      this.display = this.raw;
      this.initialRaw = this.raw;
      this.applyServerIssues();
      return;
    }
    this.selected = (this.value !== undefined ? this.value : this.defaultValue ?? null) as string | null;
    this.raw = this.query ?? this.defaultQuery;
    if (this.query === undefined && !this.raw && this.selected !== null) {
      this.raw = this.config.options?.find(row => row.value === this.selected)?.label ?? this.selected;
    }
    if (this.query === undefined && this.selected !== null && this.raw === this.selected) this.awaitingLabel = this.selected;
    this.display = this.raw;
    this.initialRaw = this.raw;
    this.applyServerIssues();
  }
  connectedCallback() { this.alive = true; this.setupSurface(); }
  componentDidLoad() { this.setupSurface(); }
  componentDidUpdate() {
    if (this.input && !this.composing && this.input.value !== this.display) this.input.value = this.display;
    if (this.expanded) this.surface?.refresh();
  }
  disconnectedCallback() {
    this.alive = false;
    this.close();
    this.validationRun?.abort();
    this.surface?.destroy();
    this.surface = undefined;
  }
  private setupSurface() {
    if (!this.surface && this.popup && this.field) this.surface = createAnchoredSurface(this.popup, { anchor: this.field, placement: 'bottom-start' });
  }
  @Watch('value') syncValue() {
    // Multiple mode: `value` is the item list; Stencil re-renders chips on reference change.
    if (this.multiple || this.value === undefined) return;
    this.selected = this.value as string | null;
    if (this.query === undefined) {
      const proposal = this.proposedChange;
      const option = this.config.options?.find(row => row.value === this.selected)
        ?? (this.selected === null ? undefined : this.knownOptions.get(this.selected));
      const nextRaw = proposal?.value === this.selected ? proposal.query : option?.label ?? this.selected ?? '';
      if (proposal?.value !== this.selected || nextRaw !== this.raw) {
        this.raw = nextRaw;
        this.display = this.raw;
        this.formattedRaw = undefined;
      }
      this.awaitingLabel = !option && this.selected !== null ? this.selected : null;
    }
    this.resetValidation();
  }
  @Watch('query') syncQuery() {
    if (this.query === undefined || this.query === this.raw) return;
    // Only a selection proposal's query echo retains an uncontrolled identity.
    // Other owner text replacements are edits, just like native input.
    if (this.value === undefined && this.proposedChange?.query !== this.query) this.selected = null;
    this.awaitingLabel = null;
    this.formattedRaw = undefined;
    this.raw = this.query;
    this.display = this.raw;
    this.resetValidation();
    if (this.expanded) this.search('input');
  }
  @Watch('disabled') @Watch('readOnly') syncDisabled() {
    if (this.disabled || this.readOnly) { this.close(); this.resetValidation(); }
  }
  @Watch('config') syncConfig(next: ComboboxConfig, previous: ComboboxConfig) {
    this.validationRun?.abort();
    const contextChanged = next.context !== previous?.context;
    const sourceChanged = next.provider !== previous?.provider || next.options !== previous?.options;
    if (sourceChanged || contextChanged) this.knownOptions.clear();
    if (contextChanged) {
      this.close();
      const policy = next.invalidation ?? 'retain-query';
      if (this.multiple) {
        if (policy === 'clear') this.setMultiQuery('', 'programmatic');
      } else {
        const value = policy === 'retain' ? this.selected : null;
        const query = policy === 'clear' ? '' : this.raw;
        this.commit(value, query, null, 'invalidation', 'programmatic');
      }
      this.validation = { status: 'pristine', touched: false, dirty: this.raw !== this.initialRaw, issues: [] };
    } else if (sourceChanged && this.query === undefined && this.selected !== null) {
      const option = next.options?.find(row => row.value === this.selected);
      this.raw = option?.label ?? this.selected;
      this.display = this.raw;
      this.awaitingLabel = !option && next.provider ? this.selected : null;
      this.formattedRaw = undefined;
    }
    this.applyServerIssues();
    if (this.expanded) this.search('context');
  }
  private applyServerIssues() {
    const issues = this.config.issues ?? [];
    if (issues.length) this.setValidation({ issues }, this.validation.touched);
    else this.resetValidation();
  }
  private resetValidation() {
    this.validationRun?.abort();
    this.validation = { status: 'pristine', touched: this.validation.touched, dirty: this.raw !== this.initialRaw, issues: [] };
    this.validationChange?.emit(this.validation);
  }
  private cancelLookup() {
    clearTimeout(this.lookupTimer);
    this.lookup?.abort();
    this.lookup = undefined;
    this.loading = false;
  }
  private close() {
    this.expanded = false;
    this.active = -1;
    this.cancelLookup();
    this.surface?.hide();
    closeOverlay(this.overlayId);
  }
  private open(reason: 'input' | 'disclosure' = 'input') {
    if (this.disabled || this.readOnly) return;
    this.expanded = true;
    if (this.popup && this.field) this.popup.style.minWidth = `${this.field.getBoundingClientRect().width}px`;
    this.surface?.show();
    openOverlay({ id: this.overlayId, element: this.popup!, relatedElements: [this.host], modal: false,
      requestClose: () => this.close() });
    this.search(reason);
  }
  private search(reason: 'input' | 'disclosure' | 'context') {
    this.cancelLookup();
    this.fullSet = reason === 'disclosure';
    this.active = -1;
    this.lookupError = '';
    const config = this.config;
    const query = this.fullSet ? '' : this.raw;
    const controller = new AbortController();
    this.lookup = controller;
    const apply = (options: readonly ComboboxOption[]) => {
      if (controller.signal.aborted || !this.alive) return;
      for (const option of options) this.knownOptions.set(option.value, option);
      const selectedOption = this.selected === null ? undefined : this.knownOptions.get(this.selected);
      if (this.query === undefined && this.awaitingLabel === this.selected && selectedOption) {
        this.raw = selectedOption.label;
        this.display = this.raw;
        this.awaitingLabel = null;
        this.formattedRaw = undefined;
        this.resetValidation();
      }
      const ids = new Set<string>();
      const selected = this.multiple ? this.selectedValues : undefined;
      this.rows = options.filter(option => {
        if (ids.has(option.id)) return false;
        ids.add(option.id);
        if (this.fullSet) return true;
        // Multiple mode always hides already-selected items and, absent an owner
        // filter, falls back to a client label match (there is no unfiltered pass-through).
        if (selected) return !selected.has(option.value)
          && (config.filter ? config.filter(option, query, config.context)
            : option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
        return config.filter ? config.filter(option, query, config.context)
          : config.provider ? true : option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase());
      });
      const groups = new Map<string, ComboboxOption[]>();
      for (const row of this.rows) {
        const group = row.group ?? '';
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group)!.push(row);
      }
      this.rows = [...groups.values()].flat();
      this.loading = false;
      this.optionsChange.emit(this.rows);
    };
    if (!config.provider) { apply(config.options ?? []); return; }
    this.rows = [];
    this.loading = true;
    this.lookupTimer = setTimeout(async () => {
      try { apply(await config.provider!({ query, context: config.context, signal: controller.signal, reason })); }
      catch (error) {
        if (controller.signal.aborted || !this.alive) return;
        this.loading = false;
        this.lookupError = error instanceof Error ? error.message : 'Unable to load suggestions.';
      }
    }, reason === 'disclosure' ? 0 : Math.max(0, config.debounce ?? 200));
  }
  private get canCreate() {
    const candidates = this.config.options ? [...this.config.options, ...this.rows] : this.rows;
    return Boolean(this.config.allowCreate && this.raw.trim() && !this.loading && !this.lookupError
      && !candidates.some(row => row.label.toLocaleLowerCase() === this.raw.toLocaleLowerCase()));
  }
  private format(timing: 'input' | 'blur') {
    if ((this.config.formatOn ?? 'blur') !== timing || !this.input) return;
    // Selection is now in display coordinates; do not map it as raw a second time.
    if (this.formattedRaw === this.raw && this.formattedWith === this.config.format) return;
    const result = formatEditingValue(this.raw, {
      start: this.input.selectionStart ?? this.raw.length, end: this.input.selectionEnd ?? this.raw.length,
      direction: this.input.selectionDirection ?? 'none',
    }, this.config.format);
    this.formattedRaw = this.raw;
    this.formattedWith = this.config.format;
    this.display = result.display;
    if (this.input.value !== result.display) {
      this.input.value = result.display;
      this.input.setSelectionRange(result.selection.start, result.selection.end, result.selection.direction);
    }
  }
  private onInput = (event: InputEvent) => {
    // Composition updates remain entirely native until compositionend.
    if (this.composing || event.isComposing) return;
    this.awaitingLabel = null;
    this.formattedRaw = undefined;
    this.raw = this.input!.value;
    this.display = this.raw;
    this.resetValidation();
    this.format('input');
    this.queryChange.emit({ query: this.raw, display: this.display, trigger: 'keyboard' });
    if (this.selected !== null) this.commit(null, this.raw, null, 'clear', 'keyboard');
    this.open();
    if (this.config.validateOn === 'input') void this.validate();
    queueMicrotask(() => {
      if (this.query !== undefined && this.query !== this.raw) this.syncQuery();
    });
  };
  private commit(value: string | null, query: string, option: ComboboxOption | null, kind: ComboboxChange['kind'], trigger: ComboboxChange['trigger']) {
    this.awaitingLabel = null;
    const queryChanged = query !== this.raw;
    if (this.value === undefined) this.selected = value;
    if (this.query === undefined && queryChanged) { this.raw = query; this.display = query; this.formattedRaw = undefined; }
    this.resetValidation();
    const detail: ComboboxChange = { value, query, option, kind, trigger };
    const proposal = { value, query };
    this.proposedChange = proposal;
    this.valueChange.emit(detail);
    if (queryChanged) this.queryChange.emit({ query, display: query, trigger });
    if (kind === 'create') this.createEntry.emit(detail);
    if (kind === 'free-entry') this.freeEntry.emit(detail);
    if (kind === 'invalidation') this.dependencyInvalidate.emit(detail);
    // Settle after all owner notifications (including Vue's queued update).
    // A retained prop does not fire a Stencil watcher, so rejection must be
    // reconciled explicitly while the proposal still identifies an edit echo.
    queueMicrotask(() => {
      if (this.proposedChange !== proposal) return;
      if (this.value !== undefined && this.value !== proposal.value) this.syncValue();
      if (this.query !== undefined && this.query !== proposal.query) {
        if (this.value === undefined) { this.selected = null; this.resetValidation(); }
        this.syncQuery();
      }
      this.proposedChange = undefined;
    });
  }
  private choose(index: number, trigger: 'keyboard' | 'pointer') {
    const option = this.rows[index];
    if (option?.disabled) return;
    if (this.multiple) {
      if (option) this.addSelectedItem(option, trigger);
      else if (this.canCreate && index === this.rows.length) this.createSelectedItem(this.raw.trim(), trigger);
      else return;
      this.setMultiQuery('', trigger);
      this.close();
      this.input?.focus();
      return;
    }
    if (option) this.commit(option.value, option.label, option, 'selection', trigger);
    else if (this.canCreate && index === this.rows.length) this.commit(null, this.raw, null, 'create', trigger);
    else return;
    this.close();
    this.input?.focus();
    if (this.config.validateOn !== 'submit') queueMicrotask(() => void this.validate());
  }
  // --- Multiple-mode helpers ---------------------------------------------
  private emitItems(items: readonly MultiComboboxItem[]) { this.valueChange.emit(items); }
  private setMultiQuery(query: string, trigger: 'keyboard' | 'pointer' | 'programmatic') {
    if (this.query === undefined) { this.raw = query; this.display = query; this.formattedRaw = undefined; }
    if (this.input) this.input.value = query;
    this.queryChange.emit({ query, display: query, trigger });
  }
  private addSelectedItem(option: MultiComboboxItem, trigger: 'keyboard' | 'pointer') {
    this.addItem.emit({ item: option, index: this.items.length, trigger });
    this.emitItems([...this.items, option]);
  }
  private createSelectedItem(query: string, trigger: 'keyboard' | 'pointer') {
    if (!query) return;
    this.createItem.emit({ query, trigger });
  }
  private commitQuery(trigger: 'keyboard' | 'pointer') {
    const query = this.raw.trim();
    if (!query) return;
    const normalized = query.toLocaleLowerCase();
    const option = this.rows.find(row => row.label.trim().toLocaleLowerCase() === normalized);
    if (option) { this.setMultiQuery('', trigger); this.addSelectedItem(option, trigger); }
    else if (this.config.allowCreate) { this.setMultiQuery('', trigger); this.createSelectedItem(query, trigger); }
  }
  private removeItemAt(index: number, trigger: 'keyboard' | 'pointer' | 'programmatic') {
    const item = this.items[index];
    if (!item || item.disabled || this.disabled || this.readOnly) return;
    this.removeItem.emit({ item, index, trigger });
    this.emitItems(this.items.filter((_, position) => position !== index));
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
      event.preventDefault(); event.stopPropagation(); this.removeItemAt(index, 'keyboard');
    }
  };
  private handleMultipleKeydown(event: KeyboardEvent): boolean {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
    if (this.tokenSeparators.includes(event.key)) {
      event.preventDefault(); event.stopPropagation(); this.commitQuery('keyboard'); return true;
    }
    if (this.raw || (this.input?.selectionStart ?? 0) > 0) return false;
    if (event.key === 'ArrowLeft' && this.items.length) { event.preventDefault(); this.focusItem(this.items.length - 1); return true; }
    if (event.key === 'Backspace' && this.items.length) { event.preventDefault(); this.removeItemAt(this.items.length - 1, 'keyboard'); return true; }
    return false;
  }
  private move(key: string) {
    const indices = this.rows.flatMap((row, index) => row.disabled ? [] : [index]);
    if (this.canCreate) indices.push(this.rows.length);
    if (!indices.length) return;
    const current = indices.indexOf(this.active);
    const next = key === 'Home' ? 0 : key === 'End' ? indices.length - 1
      : key === 'ArrowDown' ? Math.min(current + 1, indices.length - 1)
      : current < 0 ? indices.length - 1 : Math.max(0, current - 1);
    this.active = indices[next];
    requestAnimationFrame(() => this.host.shadowRoot?.getElementById(`option-${this.active}`)?.scrollIntoView({ block: 'nearest' }));
  }
  private onKeydown = (event: KeyboardEvent) => {
    if (this.composing || event.isComposing || this.disabled || this.readOnly) return;
    if (this.multiple && this.handleMultipleKeydown(event)) return;
    if (event.key === 'Escape' && this.expanded) { event.preventDefault(); event.stopPropagation(); this.close(); return; }
    if (event.key === 'Tab') { this.close(); return; }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.expanded) this.open('disclosure');
      this.move(event.key);
    } else if ((event.key === 'Home' || event.key === 'End') && this.expanded && this.active >= 0) {
      event.preventDefault(); this.move(event.key);
    } else if (event.key === 'Enter' && this.expanded) {
      if (this.active >= 0) { event.preventDefault(); this.choose(this.active, 'keyboard'); }
      else if (this.config.allowFreeText) { event.preventDefault(); this.commit(null, this.raw, null, 'free-entry', 'keyboard'); this.close(); }
    }
  };
  private onFocusOut = (event: FocusEvent) => {
    if (event.relatedTarget instanceof Node && this.host.shadowRoot?.contains(event.relatedTarget)) return;
    this.close();
    this.format('blur');
    this.validation = { ...this.validation, touched: true };
    if (!this.multiple && this.config.allowFreeText && this.selected === null) this.commit(null, this.raw, null, 'free-entry', 'keyboard');
    if ((this.config.validateOn ?? 'blur') === 'blur') void this.validate();
  };
  private setValidation(result: FieldResult, touched = this.validation.touched) {
    const blocking = result.issues.some(issue => issue.severity !== 'warning');
    this.validation = { status: blocking ? 'error' : result.issues.length ? 'warning' : 'valid',
      touched, dirty: this.raw !== this.initialRaw, ...result };
    this.validationChange?.emit(this.validation);
  }
  /** Validate for submission. Caller submits only non-pending, non-error output. */
  @Method() async validate(): Promise<ComboboxValidationState> {
    this.validationRun?.abort();
    const run = new AbortController();
    this.validationRun = run;
    this.validation = { ...this.validation, status: 'pending', output: undefined };
    this.validationChange.emit(this.validation);
    try {
      const result = await validateField({ raw: this.raw, value: this.selected, context: this.config.context, signal: run.signal }, this.config);
      if (this.required && !this.raw.trim()) result.issues = [...result.issues, { message: 'A value is required.' }];
      else if (this.raw && this.selected === null && !this.config.allowFreeText && !this.config.allowCreate) result.issues = [...result.issues, { message: 'Choose a suggestion.' }];
      if (result.issues.some(issue => issue.severity !== 'warning')) result.output = undefined;
      if (!run.signal.aborted && this.alive) this.setValidation(result);
    } catch { /* Aborted work never becomes current field state. */ }
    return this.validation;
  }
  /** Focus the native editing input from a composed control. */
  @Method() async focusInput() { this.input?.focus(); }
  render() {
    const description = [this.helpOpen ? 'help-text' : '', this.validation.issues.length ? 'validation' : ''].filter(Boolean).join(' ') || undefined;
    const status = this.loading ? 'Loading suggestions…' : this.lookupError || (this.expanded ? `${this.rows.length} suggestions available.` : '');
    const groups = [...new Set(this.rows.map(row => row.group ?? ''))];
    return <Host data-size={this.size} data-validation={this.validation.status} onFocusout={this.onFocusOut}>
      <label htmlFor="input" part="label" class={this.labelVisibility === 'sr-only' ? 'sr-only' : undefined}>{this.label}{this.required ? ' *' : ''}</label>
      <div class="field" part="field" ref={element => this.field = element}
        onClick={event => { if (!event.composedPath().some(node => node instanceof HTMLButtonElement)) this.input?.focus(); }}>
        <slot name="start" />
        {this.multiple && <div class="items" role="group" aria-label={`Selected ${this.label}`}>
          {this.items.map((item, index) => <button type="button" part="item" class="item" data-value={item.value}
            tabIndex={-1} disabled={this.disabled || this.readOnly || item.disabled}
            aria-label={`${item.label}, press Delete or Backspace to remove`}
            onKeyDown={event => this.onItemKeyDown(event, index)}>
            <slot name={`item-${item.id}`}><ui-chip appearance="pill">{item.label}</ui-chip></slot>
          </button>)}
        </div>}
        <input id="input" ref={element => this.input = element} role="combobox" aria-autocomplete="list"
          aria-expanded={String(this.expanded)} aria-controls="listbox" aria-activedescendant={this.expanded && this.active >= 0 ? `option-${this.active}` : undefined}
          aria-describedby={description} aria-invalid={String(this.validation.status === 'error')} aria-busy={String(this.validation.status === 'pending')}
          value={this.display} placeholder={this.placeholder} name={this.name || undefined} disabled={this.disabled} readOnly={this.readOnly} required={this.required}
          autoComplete="off" part="input" onInput={this.onInput} onKeyDown={this.onKeydown}
          onCompositionstart={() => this.composing = true} onCompositionend={() => { this.composing = false; this.onInput(new InputEvent('input')); }} />
        {this.clearable && <button type="button" part="affordance" aria-label={`Clear ${this.label}`} disabled={this.disabled || this.readOnly}
          onClick={() => { this.commit(null, '', null, 'clear', 'pointer'); this.close(); this.input?.focus(); }}>×</button>}
        {this.help && <button id="help" type="button" part="affordance" aria-label={`Help for ${this.label}`} disabled={this.disabled}><span aria-hidden="true">?</span></button>}
        {this.disclosure && <button type="button" part="affordance" aria-label={`Suggestions for ${this.label}`} aria-controls="listbox" aria-expanded={String(this.expanded)}
          disabled={this.disabled || this.readOnly} onClick={() => { if (this.expanded) this.close(); else this.open('disclosure'); this.input?.focus(); }}><span aria-hidden="true">⌄</span></button>}
      </div>
      {this.help && <ui-tooltip id="help-text" for="help" toggleOnClick={true} onOpen={() => this.helpOpen = true} onClose={() => this.helpOpen = false}>{this.help}</ui-tooltip>}
      <div class="popup" part="popup" hidden={!this.expanded} ref={element => this.popup = element}>
        <div id="listbox" role="listbox" aria-label={`${this.label} suggestions`} aria-busy={String(this.loading)}>
          {groups.map(group => <div role={group ? 'group' : 'presentation'} aria-label={group || undefined}>
            {group && <div class="group" part="group">{group}</div>}
            {this.rows.map((row, index) => (row.group ?? '') !== group ? null : <div id={`option-${index}`} role="option" aria-selected={String(this.selected === row.value)}
              aria-disabled={String(Boolean(row.disabled))} data-active={this.active === index ? '' : undefined} part="option" class="option"
              onPointerDown={event => event.preventDefault()} onClick={() => this.choose(index, 'pointer')}>
              <slot name={`option-${row.id}`}><span class="primary" part="option-primary">{row.label}</span>{row.description && <span class="secondary" part="option-secondary">{row.description}</span>}</slot>
            </div>)}
          </div>)}
          {this.canCreate && <div id={`option-${this.rows.length}`} role="option" aria-selected="false" class="option" part="option" data-active={this.active === this.rows.length ? '' : undefined}
            onPointerDown={event => event.preventDefault()} onClick={() => this.choose(this.rows.length, 'pointer')}><slot name="create">Create “{this.raw}”</slot></div>}
        </div>
        {this.loading ? <div class="message"><slot name="loading">Loading suggestions…</slot></div>
          : this.lookupError ? <div class="message"><slot name="error">{this.lookupError}</slot></div>
          : !this.rows.length && !this.canCreate ? <div class="message"><slot name="empty">No suggestions.</slot></div> : null}
        <slot name="footer" />
      </div>
      <div id="validation" class="message" part="validation" hidden={!this.validation.issues.length}>
        {this.validation.issues.map(issue => <div>{issue.message}</div>)}
      </div>
      <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">{status} {this.validation.status === 'pending' ? 'Checking value…' : this.validation.issues.map(issue => issue.message).join(' ')}</div>
    </Host>;
  }
}
