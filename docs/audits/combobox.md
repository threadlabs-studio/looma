# Combobox / Autocomplete configuration audit

> **Evidence, not decisions.** These are the research notes behind the 0.3 option audit. They describe the API *before* 0.3, and some verdicts were overruled or already resolved. The binding decisions are in the [Component option audit](../../apps/docs/docs/component-library-audit.md).

Researched 2026-09-21 from official docs and official source repos (main/master branches on that date). Anything not directly confirmed is marked **(uncertain)**.

Libraries counted in the synthesis (9 implementations): React Aria Components (RAC), Headless UI (HUI), Material UI (MUI), Ark UI / Chakra v3 (Ark), Vuetify (VAutocomplete + VCombobox, counted once), PrimeVue, Quasar (QSelect `use-input`), Web Awesome (WA), Spectrum Web Components (SWC). Radix and Shoelace have **no combobox** and are excluded from counts. WAI-ARIA APG is a behaviour reference, not counted.

"Majority" = present in 5 or more of the 9.

---

## Per-library inventory

### React Aria Components: `ComboBox`

Sources:
- https://react-aria.adobe.com/ComboBox (formerly react-spectrum.adobe.com/react-aria/ComboBox.html)
- https://react-aria.adobe.com/ListBox (async loading, empty state, sections, `textValue`)
- https://react-aria.adobe.com/useFilter
- Doc source: https://github.com/adobe/react-spectrum/blob/main/packages/dev/s2-docs/pages/react-aria/ComboBox.mdx
- Types: https://github.com/adobe/react-spectrum/blob/main/packages/react-stately/src/combobox/useComboBoxState.ts, https://github.com/adobe/react-spectrum/blob/main/packages/react-aria-components/src/ComboBox.tsx

1. Source: `children` (static `<ListBoxItem>`/`ComboBoxItem`), `defaultItems` (uncontrolled, filtered internally), `items` (controlled; app is responsible for filtering), render-function children. Async: no loading prop on ComboBox itself; use ListBox `renderEmptyState` (spinner during initial load) + `<ListBoxLoadMoreItem onLoadMore isLoading>` for infinite scroll; docs use `useAsyncList` (react-stately) as the loader. Input event: `onInputChange`. Debounce: none built in. Virtualization: `<Virtualizer layout=…>` wrapper (general RAC collection feature).
2. Filtering: `defaultFilter: (textValue, inputValue) => boolean`; default is locale-aware `contains` (from `useFilter`). `useFilter({sensitivity, ...Intl.CollatorOptions})` returns `contains`, `startsWith`, `endsWith`. No-filter: pass controlled `items`. Case sensitivity: via `useFilter` `sensitivity`. Min chars: none.
3. Value: `selectionMode: 'single' | 'multiple'`; `value`/`defaultValue`/`onChange` (item `id`, array when multiple; older `selectedKey`/`onSelectionChange` still in types). `inputValue`/`defaultInputValue`/`onInputChange` (text separate from value; reverts to selected item text on blur). `allowsCustomValue`. `menuTrigger: 'input' | 'focus' | 'manual'`. `onOpenChange(isOpen, menuTrigger)`. `allowsEmptyCollection` (keep popover open with no items). `shouldFocusWrap`. No clear button prop, no autoHighlight/autoSelect prop, no close-on-select prop **(uncertain for multiple mode behaviour)**. "Create" option is a recipe (`ListBoxItem onAction`).
4. Display: label = item children; `textValue` on items when children are not plain text. `disabledKeys` / item `isDisabled`. Sections: `ListBoxSection` + `Header`. Descriptions: `<Text slot="description">`. Empty: `renderEmptyState` on ListBox. Chips: `ComboBoxValue` render prop composed with `TagGroup` (multiple). `placeholder`.
5. Forms: `name`, `form`, `formValue: 'key' | 'text'`, `isRequired`, `isDisabled`, `isReadOnly`, `isInvalid`, `validate: (value) => ValidationError | true | null | undefined`, `validationBehavior: 'native' | 'aria'` (native constraint validation default), `errorMessage` (string or fn of ValidationResult), `description`, `FieldError`.
6. Parsing: none. With `allowsCustomValue`, value is the raw text.
7. Other functions: `children` render fn, `className`/`style` render fns, `errorMessage` fn, focus/key handlers.

### Radix Primitives / Radix Themes

Sources:
- https://www.radix-ui.com/primitives
- Package list: https://github.com/radix-ui/primitives/tree/main/packages/react (no `combobox` package)
- https://github.com/radix-ui/primitives/issues/1342 ("[New Primitive] Combobox", closed 2025-01-25 without a shipped primitive)
- Radix Themes components: https://github.com/radix-ui/themes/tree/main/packages/radix-ui-themes/src/components (only `select`)

**No combobox/autocomplete** in Primitives or Themes. Community uses Popover + `cmdk` (shadcn) or Base UI.

### Headless UI: `Combobox`

Source: https://headlessui.com/react/combobox

1. Source: children only (`ComboboxOption value`); no items prop. Async: none built in (app state). Input event: `ComboboxInput onChange`. Virtualization: `virtual={{ options, disabled? }}` on `Combobox` (render-prop children).
2. Filtering: none built in. Docs: "You are completely in charge of how you filter the results". No filter mode, no min chars.
3. Value: `value`/`defaultValue`/`onChange`, `multiple`, `by` (key or compare fn), `immediate` (open on focus), `onClose`. Custom value: recipe (render `ComboboxOption value={{id:null,name:query}}` "Create …"). No clearable, no autoHighlight prop **(uncertain whether first option is auto-activated)**.
4. Display: `ComboboxInput displayValue: (item) => string`. No grouping or empty-state component (docs use `empty:invisible` CSS). Option `disabled`. Placeholder via native input attribute.
5. Forms: `name`, `form` (hidden inputs), `disabled`, `invalid`. No required/readonly/validate props.
6. Parsing: none.
7. Other functions: `by`, `displayValue`, `virtual.disabled`, `onClose`.

### Material UI: `Autocomplete`

Sources:
- https://mui.com/material-ui/api/autocomplete/
- https://mui.com/material-ui/react-autocomplete/ (createFilterOptions, creatable, async, virtualization)

1. Source: `options` (array). Async: `loading`, `loadingText`, `onInputChange`, `open`/`onOpen`/`onClose`; server search recipe = `filterOptions={(x) => x}` + throttle (docs). Debounce: none built in. Virtualization: recipe via custom listbox slot + `react-window`.
2. Filtering: built in, default contains, case/accent-insensitive. `filterOptions(options, state)`; `createFilterOptions({ ignoreAccents, ignoreCase, limit, matchFrom: 'any' | 'start', stringify, trim })`. `filterSelectedOptions`. Min chars: none.
3. Value: `value`/`defaultValue`/`onChange(event, value, reason)` (reasons include `createOption`, `selectOption`, `removeOption`, `blur`, `clear`); `inputValue`/`onInputChange`; `multiple`; `freeSolo`; `disableClearable`, `clearOnBlur`, `clearOnEscape`, `autoHighlight`, `autoSelect` (commit highlighted on blur), `autoComplete` (inline completion = APG "both"), `openOnFocus`, `selectOnFocus`, `disableCloseOnSelect`, `blurOnSelect`, `handleHomeEndKeys`, `includeInputInList`, `disableListWrap`, `onHighlightChange`, `resetHighlightOnMouseLeave`. "Creatable" is a recipe (freeSolo + synthetic "Add X" option in `filterOptions`).
4. Display: `getOptionLabel`, `getOptionKey`, `isOptionEqualToValue`, `getOptionDisabled`, `disabledItemsFocusable`, `groupBy`, `renderGroup`, `renderOption`, `renderValue` (chips; `renderTags` is the older name **(uncertain which versions)**), `limitTags`, `getLimitTagsText`, `noOptionsText`, `loadingText`, `popupIcon`, `clearIcon`. Placeholder/label via `renderInput` TextField.
5. Forms: `disabled`, `readOnly`. `name`, `required`, `error`, `helperText` go on the TextField returned by `renderInput`. No validate fn. No hidden value input (submits the visible text) **(uncertain)**.
6. Parsing: none; `freeSolo` value is the typed string; app transforms in `onChange` (`reason === 'createOption'`).
7. Other functions: `renderInput` (required), `renderOption`, `renderGroup`, `renderValue`, `getLimitTagsText`, `filterOptions`, `getOptionLabel`, `getOptionKey`, `getOptionDisabled`, `groupBy`, `isOptionEqualToValue`. Headless `useAutocomplete` takes the same options.

### Ark UI `Combobox` (and Chakra UI v3 `Combobox`, which wraps it)

Sources:
- https://ark-ui.com/docs/components/combobox
- Doc source: https://github.com/chakra-ui/ark/blob/main/website/src/content/pages/components/combobox.mdx
- Examples: https://github.com/chakra-ui/ark/tree/main/packages/react/src/components/combobox/examples
- Props: https://github.com/chakra-ui/zag/blob/main/packages/machines/combobox/src/combobox.types.ts
- https://chakra-ui.com/docs/components/combobox ; examples https://github.com/chakra-ui/chakra-ui/tree/main/apps/compositions/src/examples (combobox-*.tsx)

1. Source: `collection` (required; `createListCollection` / `useListCollection({ initialItems, itemToString, itemToValue, isItemDisabled, groupBy, filter, limit })`). App renders `Combobox.Item` for each collection item. Async: `useAsyncList({ load({ filterText, signal }) })` hook (example "Async Search"), no loading prop. Input event: `onInputValueChange`. Virtualization: recipe with `@tanstack/virtual` + `scrollToIndexFn`; `limit` on `useListCollection` caps rendered items.
2. Filtering: not automatic in the machine. Pattern: `const { contains } = useFilter({ sensitivity: 'base' })` (Intl.Collator based; also `startsWith`, `endsWith`) passed as `useListCollection({ filter })`, then call `filter(inputValue)` in `onInputValueChange`. Min chars: Chakra example `openOnChange={(e) => e.inputValue.length > 2}`.
3. Value: `value`/`defaultValue` (string[] always), `onValueChange`, `onSelect`, `multiple`, `inputValue`/`defaultInputValue`, `allowCustomValue`, `inputBehavior: 'none' | 'autohighlight' | 'autocomplete'`, `selectionBehavior: 'replace' | 'clear' | 'preserve'`, `closeOnSelect`, `openOnClick`, `openOnChange` (bool or fn), `openOnKeyPress`, `loopFocus`, `open`/`defaultOpen`/`onOpenChange`, `highlightedValue`/`onHighlightChange`, `alwaysSubmitOnEnter`. Clear: `Combobox.ClearTrigger` part. Creatable: recipe (upsert synthetic item).
4. Display: `itemToString`, `itemToValue`, `isItemDisabled`, `groupBy` (collection), `Combobox.ItemGroup`/`ItemGroupLabel`, `Combobox.Empty`, `ItemText`, `ItemIndicator`, `placeholder`. Chips: app-composed (Chakra "tags-input-with-combobox"). No limitTags.
5. Forms: `name`, `form`, `required`, `disabled`, `readOnly`, `invalid`; Field composition (Chakra `Field.ErrorText`; RHF example). No validate fn.
6. Parsing: none; app normalizes in `onValueChange` / creatable upsert.
7. Other functions: `openOnChange` fn, `scrollToIndexFn`, `navigate`, `translations`, collection accessors.

### Vuetify: `v-autocomplete`, `v-combobox`

Sources:
- https://vuetifyjs.com/en/api/v-autocomplete/ , https://vuetifyjs.com/en/api/v-combobox/ (client-rendered; verified against source)
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/components/VAutocomplete/VAutocomplete.tsx
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/components/VCombobox/VCombobox.tsx
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/composables/filter.tsx
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/composables/list-items.ts
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/composables/validation.ts
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/components/VSelect/VSelect.tsx (`makeSelectProps`)

Split: `v-autocomplete` = must pick from items; `v-combobox` = free text allowed (model can be a string), `returnObject` defaults true, `hideNoData` defaults true.

1. Source: `items`. Async: `loading` (field loader bar / `loader` slot), `search` + `update:search` event, `no-filter`. Debounce: none. Virtualization: always on (internal `VVirtualScroll`).
2. Filtering: built in, contains, case-insensitive (`ignoreCase: true`), `ignore-accents`. `custom-filter(value, query, item)`, `custom-key-filter` (per-key fns), `filter-keys` (default `['title']`), `filter-mode: 'some' | 'every' | 'union' | 'intersection'` (how multiple keys combine, NOT contains/startsWith), `no-filter`. v-combobox also `always-filter`. Min chars: none.
3. Value: `modelValue`, `multiple`, `return-object`, `search` (input text), `clearable`, `auto-select-first: boolean | 'exact'`, `clear-on-select`, `open-on-focus`, `open-on-clear`, `close-on-input-click`, `menu`/`update:menu`, `hide-selected`. v-combobox: `delimiters: string[]`, `trim-values`, event `item:created`. Both: `item:added`, `item:removed`.
4. Display: `item-title`, `item-value`, `item-props`, `item-type` (`'divider' | 'subheader'` for grouping), `item-children`, `value-comparator`, `chips`, `closable-chips`, `no-data-text`, `hide-no-data`, `placeholder`, slots `item`, `chip`, `selection`, `subheader`, `divider`, `no-data`, `prepend-item`, `append-item`, `menu-header`, `menu-footer`. No limitTags.
5. Forms: `name`, `form`, `disabled`, `readonly`, `error`, `error-messages`, `max-errors`, `rules` (array of values, fns, or promise-returning fns returning `true | string`), `validate-on: 'blur' | 'input' | 'submit' | 'invalid-input'` (+ `lazy`), works with `v-form`. No `required` prop (use a rule).
6. Parsing: v-combobox `delimiters` (multiple: split typed text into chips), `trim-values`.
7. Other functions: `item-title`/`item-value`/`item-props` accept key, path array, or fn; `value-comparator`; `custom-filter`; `custom-key-filter`; `rules`; `counter-value`.

### PrimeVue: `AutoComplete`

Sources:
- https://primevue.dev/autocomplete/ (primevue.org redirects here)
- https://github.com/primefaces/primevue/blob/master/packages/primevue/src/autocomplete/AutoComplete.d.ts
- https://github.com/primefaces/primevue/blob/master/packages/primevue/src/autocomplete/BaseAutoComplete.vue

1. Source: `suggestions` (array the app sets). Async: `complete` event (`{ originalEvent, query }`) is the only search mechanism; `loading`, `loader`, `loadingIcon`. `minLength` (default 1), `delay` (default 300 ms debounce). Virtualization: `virtualScrollerOptions` (VirtualScroller; lazy loading via its options **(uncertain detail)**). `dropdown` button, `dropdownMode: 'blank' | 'current'`, `completeOnFocus`.
2. Filtering: none built in; app filters in `complete`. `searchLocale` only for messaging/typeahead **(uncertain)**.
3. Value: `modelValue`/`defaultValue`, `multiple`, `forceSelection` (reject free text; otherwise free text is allowed), `showClear`, `autoOptionFocus` (autohighlight), `selectOnFocus`, `focusOnHover`, `typeahead`, `dataKey`. No open-on-focus other than `completeOnFocus`.
4. Display: `optionLabel` (key or fn), `optionDisabled` (key or fn), `optionGroupLabel`, `optionGroupChildren` (grouping), `placeholder`, chips for multiple (`chip` slot, `removeTokenIcon`), `emptySearchMessage`, `showEmptyMessage`, `searchMessage`, `selectionMessage`, `emptySelectionMessage`, slots `option`, `optiongroup`, `empty`, `header`, `footer`, `loader`. No `optionValue` (source has a TODO). No limitTags.
5. Forms: `name`, `invalid`, `disabled`, `formControl` (for `@primevue/forms` `<Form :resolver>`; validation is form-level, e.g. Zod/Yup resolvers). No `required`/`readonly` props **(uncertain; not in d.ts)**.
6. Parsing: none.
7. Other functions: `optionLabel`, `optionDisabled`, `optionGroupLabel`, `optionGroupChildren` fns; events `option-select`, `option-unselect`, `dropdown-click`, `clear`, `before-show`, `hide`.

### Quasar: `QSelect` with `use-input`

Sources:
- https://quasar.dev/vue-components/select
- API JSON: https://github.com/quasarframework/quasar/blob/dev/ui/src/components/select/QSelect.json, https://github.com/quasarframework/quasar/blob/dev/ui/src/composables/private.use-field/use-field.json, https://github.com/quasarframework/quasar/blob/dev/ui/src/composables/private.use-validate/use-validate.json, https://github.com/quasarframework/quasar/blob/dev/ui/src/api.extends.json

1. Source: `options`. Async + filtering: `@filter(inputValue, doneFn(update), abortFn)` (also fired with empty input for lazy-loaded options), `@filter-abort`, `input-debounce`, `loading` (+ `loading` slot), `no-option-prefetch`. Infinite: `@virtual-scroll`. Virtualization built in (`virtual-scroll-item-size`, `virtual-scroll-slice-size`, etc.).
2. Filtering: none built in; app filters inside `@filter` callback. Min chars: docs recipe `if (val.length < 2) { abort(); return }`.
3. Value: `model-value`, `multiple`, `max-values`, `emit-value`, `map-options`, `@input-value`, `fill-input`, `hide-selected`, `clearable`, `new-value-mode: 'add' | 'add-unique' | 'toggle'`, `@new-value`, `@add`, `@remove`, `behavior: 'menu' | 'dialog' | 'default'`, `hover`, `disable-tab-selection`. No autohighlight prop **(uncertain)**.
4. Display: `option-label`, `option-value`, `option-disable` (each key or fn), `display-value`, `use-chips`, `no-chip-remove`, `no-option-label`, slots `option`, `selected-item`, `no-option`, `before-options`, `after-options`, `loading`. No built-in grouping **(uncertain; possible via option slot)**. Placeholder via attrs **(uncertain)**.
5. Forms: `name` (hidden input for native submit), `disable`, `readonly`, `error`, `error-message`, `rules` (fns or built-in rule names), `lazy-rules`, `reactive-rules`, works with `QForm`.
6. Parsing: `@new-value(inputValue, done(item?, mode?))`: app transforms/validates typed text and calls `done` with the resulting value (or nothing to reject).
7. Other functions: `option-*` fns, `rules`, `@filter`/`@new-value` callbacks.

### Shoelace / Web Awesome

Sources:
- https://shoelace.style/components/select (Shoelace: `sl-select` only, no typing/filtering; Shoelace is sunset)
- https://webawesome.com/docs/components/combobox/ (`<wa-combobox>`, Pro component, since 3.1)

Web Awesome `wa-combobox`:
1. Source: `<wa-option>` children. Async: none documented **(uncertain)**; `input` event + `inputValue`. No virtualization.
2. Filtering: built in, contains, case-insensitive. `filter: ((option, query) => boolean) | null`. No-filter: `filter = () => true`. No modes, no min chars.
3. Value: `value` (string, or array when `multiple`), `inputValue`, `multiple`, `allow-custom-value` (single only), `allow-create` (shows "Create …" option; creates a `<wa-option>`), `with-clear`, `open`, `show()`/`hide()`.
4. Display: option text, `getTag(option, index)` for multiple tags, `max-options-visible` (like limitTags, default 3), `placeholder`, `label`, `hint`. Grouping/empty state **(uncertain; not documented on the page)**.
5. Forms: form-associated custom element: `name`, `form`, `required`, `disabled`, `validators` (static Validator objects), `validationTarget`, `setCustomValidity()`, `resetValidity()`, `wa-invalid` event, `formStateRestoreCallback`.
6. Parsing: `wa-create` event (`{ inputValue }`, cancelable): `preventDefault()` to normalize/validate/persist yourself.
7. Other functions: `filter`, `getTag`.

### Spectrum Web Components: `sp-combobox`

Sources:
- https://opensource.adobe.com/spectrum-web-components/components/combobox/
- https://github.com/adobe/spectrum-web-components/blob/main/1st-gen/packages/combobox/src/Combobox.ts

1. Source: `options` array (`{value, itemText}`) or `<sp-menu-item>` children. Async: `pending`, `pending-label`; `input` event. No virtualization.
2. Filtering: `autocomplete: 'list' | 'none'`. `list` filters with case-insensitive **startsWith** (source uses `toLowerCase().startsWith`). No custom fn.
3. Value: single only; `value` is the text (free text always allowed); `open`. No clear, no multiple.
4. Display: option text, `placeholder`, `label`, `quiet`, `size`. No grouping/empty state **(uncertain)**.
5. Forms (inherits Textfield): `name`, `required`, `disabled`, `readonly`, `invalid`, `pattern`, `minlength`, `maxlength`, slots `help-text`, `negative-help-text`.
6. Parsing: `allowed-keys` (regex restricting typed characters). No transform.
7. Other functions: none.

### WAI-ARIA APG combobox pattern

Source: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/

- `aria-autocomplete="none"`: popup suggestions do not change as user types.
- `aria-autocomplete="list"` manual selection: typed text becomes the value unless the user picks a suggestion.
- `aria-autocomplete="list"` automatic selection: first suggestion auto-highlighted and becomes the value on blur unless another is chosen (= MUI `autoHighlight`+`autoSelect`, Ark `autohighlight`, Vuetify `auto-select-first`).
- `aria-autocomplete="both"`: inline completion string after the caret (= MUI `autoComplete`, Ark `inputBehavior="autocomplete"`).
- Popup may be listbox, grid, tree, or dialog; `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-haspopup`.
- When to open is implementation-defined (Down Arrow, button, focus, or typing).
- Keys: Down/Up, Enter, Escape (optionally clears), Alt+Down, Alt+Up.
- Examples: Select-Only; Editable with Both List and Inline Autocomplete; Editable with List Autocomplete; Editable Without Autocomplete; Grid Popup; Date Picker.

---

## Synthesis

### Capability x library

Legend: Y = built-in option, R = documented recipe/composition only, - = absent, ? = uncertain. **Common** = Y in 5+ of 9.

| Capability | RAC | HUI | MUI | Ark/Chakra | Vuetify | PrimeVue | Quasar | WA | SWC | Y count | Common |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Items array prop | Y | - | Y | Y | Y | Y | Y | - | Y | 7 | **yes** |
| Static option children | Y | Y | - | R | - | - | - | Y | Y | 4 | no |
| Input-text change event | Y | Y | Y | Y | Y | Y | Y | Y | Y | 9 | **yes** |
| Loading state prop | R | - | Y | R | Y | Y | Y | ? | Y | 5 | **yes** |
| Loading/empty content text/slot | Y | - | Y | Y | Y | Y | Y | ? | Y | 7 | **yes** |
| Debounce | - | - | - | - | - | Y | Y | - | - | 2 | no |
| Min characters | - | - | - | R | - | Y | R | - | - | 1 | no |
| Infinite load more | Y | - | - | - | - | ? | Y | - | - | 2 | no |
| Virtualization | Y | Y | R | R | Y | Y | Y | - | - | 5 | **yes** (borderline) |
| Built-in filtering | Y | - | Y | R | Y | - | - | Y | Y | 5 | **yes** |
| Filter match keyword (contains/startsWith) | R (fns) | - | Y (`matchFrom`) | R (fns) | - | - | - | - | Y (fixed startsWith) | 2 | no |
| Custom filter fn | Y | R | Y | Y | Y | R | R | Y | - | 5 | **yes** |
| Turn off filtering (server filters) | Y (`items`) | n/a | Y (identity fn) | n/a | Y (`no-filter`) | n/a | n/a | Y (fn) | Y (`none`) | - | (every lib supports app-side filtering) |
| Case/accent sensitivity option | Y | - | Y | Y | Y (accents) | - | - | - | - | 4 | no |
| Multiple | Y | Y | Y | Y | Y | Y | Y | Y | - | 8 | **yes** |
| Custom/free text value | Y | R | Y | Y | Y | Y | Y | Y | Y | 8 | **yes** |
| Built-in "Create X" option | R | R | R | R | Y (combobox) | - | Y | Y | - | 3 | no |
| Clearable | - | - | Y | Y (part) | Y | Y | Y | Y | - | 6 | **yes** |
| Separate value vs input text | Y | Y | Y | Y | Y | - | Y | Y | - | 7 | **yes** |
| Auto-highlight first | - | ? | Y | Y | Y | Y | ? | ? | - | 4 | no |
| Inline completion (APG both) | - | - | Y | Y | - | - | - | - | - | 2 | no |
| Open on focus/click option | Y | Y | Y | Y | Y | Y (`completeOnFocus`) | - | - | - | 6 | **yes** |
| Close-on-select option | - | - | Y | Y | - | - | - | - | - | 2 | no |
| Label accessor | R (`textValue`) | Y (input only) | Y | Y | Y | Y | Y | - | - | 6 | **yes** |
| Value accessor / equality | Y (`id`) | Y (`by`) | Y | Y | Y | - | Y | - | - | 6 | **yes** |
| Option disabled | Y | Y | Y | Y | Y | Y | Y | Y ? | ? | 7+ | **yes** |
| Grouping | Y | - | Y | Y | Y | Y | ? | ? | ? | 5 | **yes** |
| Option description | Y | - | R | R | R | R | R | - | - | 1 | no |
| Chips/tags for multiple | R | - | Y | R | Y | Y | Y | Y | - | 5 | **yes** |
| limitTags / max visible | - | - | Y | - | - | - | - | Y | - | 2 | no |
| Placeholder | Y | native | via input | Y | Y | Y | ? | Y | Y | 7+ | **yes** |
| name | Y | Y | via input | Y | Y | Y | Y | Y | Y | 9 | **yes** |
| required (boolean) | Y | - | via input | Y | rule | - | rule | Y | Y | 5 | **yes** |
| disabled | Y | Y | Y | Y | Y | Y | Y | Y | Y | 9 | **yes** |
| readonly | Y | - | Y | Y | Y | - | Y | - | Y | 6 | **yes** |
| invalid flag | Y | Y | via input | Y | Y | Y | Y | Y (native) | Y | 9 | **yes** |
| error message prop/slot | Y | - | via input | part | Y | - | Y | native msg | slot | 5 | **yes** |
| Validate fn / rules | Y | - | - | - | Y | form-level | Y | Y (validator objs) | - | 3-4 | no |
| Native constraint validation | Y | - | - | - | - | - | - | Y | Y | 3 | no |
| Parse/transform typed text | - | - | - | - | delimiters | - | Y (event) | Y (event) | - | 0 fn props | no |

Common set (majority): items array, input-change event, loading state + loading/empty content, built-in filtering with a custom filter override, multiple, free-text/custom value, clearable, value separate from input text, open-on-focus option, label/value accessors, option disabled, grouping, chips for multiple, placeholder, name, required, disabled, readonly, invalid + error message. Virtualization is borderline (5, of which Vuetify/Quasar are always-on).

### Function-valued options

| Function option | Libraries with it as a component prop | Count | Used for |
|---|---|---|---|
| Custom filter | RAC `defaultFilter`, MUI `filterOptions`, Vuetify `custom-filter`/`custom-key-filter`, WA `filter`; Ark via `useListCollection({ filter })` hook | 4 props + 1 hook | Match algorithm (fuzzy, multi-field, locale). Also used to *disable* filtering (MUI identity fn, WA `() => true`) and to inject a synthetic "Create" option (MUI recipe). |
| Label accessor | MUI `getOptionLabel`, Ark `itemToString`, Vuetify `item-title`, PrimeVue `optionLabel`, Quasar `option-label`, HUI `displayValue` | 6 | Object option -> display/search string. Vuetify, PrimeVue, Quasar accept a **string key** too; MUI, Ark, HUI are fn-only. |
| Value accessor / equality | MUI `isOptionEqualToValue`, `getOptionKey`; HUI `by`; Ark `itemToValue`; Vuetify `item-value`, `value-comparator`; Quasar `option-value` | 5 | Object option -> identity/submitted value. HUI, Vuetify, Quasar accept a key string. |
| Disabled accessor | MUI `getOptionDisabled`, Ark `isItemDisabled`, PrimeVue `optionDisabled`, Quasar `option-disable`, Vuetify `item-props` | 5 | Per-option disabled flag. PrimeVue/Quasar accept key strings. |
| Group accessor | MUI `groupBy`, Ark `groupBy`, PrimeVue `optionGroupLabel`/`optionGroupChildren` | 3 | Section headers. RAC/Vuetify express groups structurally instead. |
| Validate fn | RAC `validate`, Vuetify `rules`, Quasar `rules`; WA `validators` (objects, not a plain fn) | 3 (+1) | Custom error message for a value. PrimeVue delegates to a form-level resolver. |
| Async loader | **none as a component prop** | 0 | All libs use events (`onInputChange`, `update:search`, `complete`, `@filter`, `input`) + app-set items + `loading`. RAC and Ark offer a separate `useAsyncList({ load })` hook. Quasar's `@filter` passes `update`/`abort` callbacks. |
| Parse/transform typed text | **none as a component prop** | 0 | Quasar `@new-value(input, done)` and WA cancelable `wa-create` are events; Vuetify `delimiters`/`trim-values` are keywords. |
| Render fns | MUI `renderInput`/`renderOption`/`renderGroup`/`renderValue`/`getLimitTagsText`, WA `getTag`, RAC render children | framework-specific | Presentation; Vue/web-component libs use slots instead. |
| Open condition fn | Ark `openOnChange` (bool or fn) | 1 | e.g. min characters. |
| Scroll fn | Ark `scrollToIndexFn` | 1 | Virtualization integration. |

### Function-valued capabilities commonly expressed without functions

- **Filtering**: most libs filter by default (contains, case-insensitive) with no config. Keyword forms: MUI `createFilterOptions({ matchFrom: 'any' | 'start', ignoreCase, ignoreAccents, limit, trim })` (config object, though it produces a fn), SWC `autocomplete="list|none"` (APG terms), Vuetify `no-filter`, `filter-keys`, `filter-mode`, `ignore-accents`. "Server filters" is expressed as *filtering off + listen to the input event + set items*, which every library supports; HUI, PrimeVue, Quasar have *only* this mode.
- **Label/value/disabled accessors**: string property keys (Vuetify `item-title="name"`, PrimeVue `optionLabel="name"`, Quasar `option-label="name"`, HUI `by="id"`), or no accessor at all because options are elements whose text/`value`/`disabled` are attributes (RAC children/`textValue`, WA `<wa-option>`, SWC `<sp-menu-item>`, HUI `<ComboboxOption value disabled>`).
- **Async loading**: events + app-rendered/assigned options + a `loading`/`pending` boolean (MUI, Vuetify, PrimeVue, Quasar, SWC). Debounce and min length as numbers (PrimeVue `delay`, `minLength`; Quasar `input-debounce`).
- **Validation**: booleans + native constraint validation (`required`, `pattern`, `minlength`: RAC `validationBehavior="native"`, WA, SWC), `setCustomValidity()` (WA), and `invalid` + `errorMessage` props set by the app (RAC, HUI, Ark, PrimeVue, Vuetify `error-messages`, Quasar `error-message`).
- **Creating/parsing values**: keyword/boolean (`allow-create`, `new-value-mode`, `freeSolo`, `allowsCustomValue`, `allowCustomValue`, `delimiters`, `trim-values`, `forceSelection`) plus an event the app can intercept (`wa-create` cancelable, Quasar `@new-value`, Vuetify `item:created`, MUI `onChange` reason `createOption`).
- **Grouping**: structural markup (RAC `ListBoxSection`, Ark `ItemGroup`, Vuetify `item-type: 'subheader'`) rather than a group fn.
- **Open behaviour**: keywords/booleans (RAC `menuTrigger`, HUI `immediate`, MUI `openOnFocus`, Vuetify `open-on-focus`, Ark `openOnClick`).
