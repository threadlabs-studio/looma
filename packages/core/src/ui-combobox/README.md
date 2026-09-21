# `ui-combobox`

One editable smart field with contextual suggestions and optional connected controls.
Domain queries, creation, and persistence belong to the consumer.

## Attributes and options

Every prop is an HTML attribute. Options are authored `<option>` children, grouped
with `<optgroup label>`; `disabled` on an option makes it unselectable.

```html
<ui-combobox label="Destination" disclosure clearable allow-free-text>
  <optgroup label="Saved destinations">
    <option value="north">North terminal</option>
    <option value="west" disabled>West terminal</option>
  </optgroup>
</ui-combobox>
```

- `label` names the native input through an internal label; `placeholder` is not a label.
- `value` is the canonical selection: a string in single mode, or in `multiple`
  mode a JSON list of `{ id, value, label, group?, disabled? }` items.
  `query` is the raw editing text, independently controllable.
- `multiple` shows selected items as removable chips; `token-separators` is a JSON
  list of characters that commit the current text as an item, e.g. `'[","]'`.
- `allow-free-text` keeps unmatched text as the value and emits `free-entry`.
  `allow-create` offers a create row and emits `create-entry` (`create-item` in
  multiple mode); the consumer persists and supplies the resulting selection.
- `disabled`, `readonly`, `required`, `name`, `size="sm|md"`, `clearable`,
  `disclosure`, `help`, `label-visibility="visible|sr-only"`.
- Suggestions are the authored options whose label contains the query
  (case-insensitive). To filter or load options elsewhere (for example a server
  search), listen for `query-change` and render the matching `<option>` children.
- `validate()` returns the current validation state; `focusInput()` focuses the input.

## Events

- `query-change`: `{ query, display, trigger }`.
- `value-change`, `free-entry`, `create-entry`: `{ value, query, option, kind, trigger }`.
- `add-item`, `remove-item`: `{ item, index, trigger }`; `create-item`: `{ query, trigger }`.
- `validation-change`: `{ status, touched, dirty, issues, output? }`.
- `options-change`: the current suggestion rows, for framework-owned rich rendering.

Slots: `start`, `option-${id}`, `loading`, `empty`, `error`, `create`, `footer`. Rich option slots must
contain noninteractive content with a visible primary label. Buttons/links inside
options are unsupported.

## Validation

Validation follows native constraints and the free-text policy: `required` rejects an
empty value, and without `allow-free-text` or `allow-create` unmatched text asks the
user to choose a suggestion. Validation runs when the field is left and after a
selection. Application-specific rules belong to the form: show them with `ui-form-field`
and its error message, driven by the form's own validation.

## Keyboard and accessibility

Input keeps native editing, selection, copy/paste, and composition. Up/Down opens
suggestions and moves the active option, skipping disabled rows. Home/End moves
through suggestions only after option navigation starts; otherwise native caret
behavior remains. Modified editing keys remain native. Enter selects the active row
or accepts configured free entry. Escape closes without clearing text. Tab closes
without choosing a suggestion and follows DOM focus order: input, optional clear,
help, disclosure, next field. Selection and disclosure return focus to the input.

The input, listbox, active descendant, label, validation message, and help description
share one shadow root. Help opens on hover/focus and pins on click/tap; Escape
closes it. Input description includes help only while it is open. Validation and
lookup status use a polite live region. Warning/error messages differ semantically,
not only by color. Provide a short label and reserve help for optional explanation.

## SSR and fallback

The custom element upgrades to a native input. For no-JS HTML, supply a light-DOM
native labeled input as fallback content inside the host; it is replaced visually
by the shadow field on upgrade. Vue adapter SSR preserves initial property values
and supports hydration; application-level no-JS form submission remains consumer-owned.

## Theme hooks

Uses existing control surface/border/focus and light/dark text tokens. Scoped hooks:
`--ui-field-label-color/size/weight` (primary, .875rem, 500),
`--ui-option-primary-color/weight` (primary, 500),
`--ui-option-secondary-color/weight` (secondary, 400),
`--ui-field-message-color/weight` (secondary, 400),
`--ui-field-affordance-color/weight` (secondary, 400),
`--ui-field-compact-size` (2rem), `--ui-combobox-max-block-size` (18rem).
Connected controls use a 44px minimum in coarse-pointer environments.

Deferred: multi-select, virtualization, full form orchestration, complex dependency
graphs, and advanced masks.
