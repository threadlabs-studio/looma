# `ui-combobox`

One editable smart field with contextual suggestions, optional connected controls,
and schema-neutral validation. Single selection only. Domain queries, creation,
metadata, validation rules, and persistence belong to the consumer.

## State and API

- `label` names the native input through an internal label; `placeholder` is not a label.
- `value?: string | null` is the canonical selection. Undefined is uncontrolled;
  `default-value` initializes it. Null is an explicitly empty controlled selection.
- `query?: string` is raw editing text, independently controlled;
  `default-query` initializes uncontrolled text. Selection proposes its label as query.
- `config: ComboboxConfig` is a JavaScript property, never JSON in an attribute.
- `disabled`, `readonly`, `required`, `size="sm|md"`, `clearable`, `disclosure`, `help`.
- `validate()` returns the current field validation state, including normalized
  `output`, `issues`, `touched`, `dirty`, and `status`. Await validation before
  submitting; only `valid` or `warning` states are eligible for submission.
- The input's `name` describes its editing value. This component does not perform
  form submission or serialize normalized output; the consumer submits `output`.

`config.options` contains `{ id, value, label, description?, metadata?, group?, disabled? }`.
Use `mapComboboxOptions(records, map)` to map domain identities/values/labels and
retain the original typed record as metadata. IDs must be unique and stable.
`filter(option, query, context)` optionally overrides local label matching.

`config.provider({ query, context, signal, reason })` may return options directly
or asynchronously. Input requests debounce by `config.debounce` (200 ms default).
Disclosure queries immediately with an empty query and reason `disclosure`, without
rewriting the input. Providers own filtering unless `filter` is supplied.
Replaced requests, closing, unmount, and context changes abort requests; late results
and late errors are ignored even if a provider ignores its AbortSignal.

Replace `config.context` by identity when dependencies change. `invalidation` is
`retain-query` by default (clear canonical value, preserve text), `clear` (clear both),
or `retain` (retain both). Every context change cancels work, closes suggestions,
resets validation, and emits `dependency-invalidate`. Controlled owners must accept
or explicitly handle the proposed values. No cross-field dependency graph is owned here.

`allowFreeText` retains noncanonical editing text and emits `free-entry` on Enter
or leaving the field. `allowCreate` offers an explicit create row and emits
`create-entry`; the consumer performs persistence and supplies any resulting canonical
selection. Typing never silently deletes noncanonical text. Without either option,
validation asks for a canonical suggestion.

## Events

- `query-change`: `{ query, display, trigger }`.
- `value-change`, `free-entry`, `create-entry`, `dependency-invalidate`:
  `{ value, query, option, kind, trigger }`.
- `validation-change`: `{ status, touched, dirty, issues, output? }`.
- `options-change`: current option array, for framework-owned rich rendering.

Slots: `option-${id}`, `loading`, `empty`, `error`, `create`. Rich option slots must
contain noninteractive content, with a visible primary label. Buttons/links inside
options are unsupported. Use `::part(option-primary)` / `::part(option-secondary)`
for defaults; custom rich content uses the same documented CSS hooks.

## Validation and transformation

Core accepts the structural Standard Schema v1 `~standard.validate` contract via
`config.schema`. `parse(raw, request)` runs first; schema validation/transforms run
next; `normalize(output, request)` and optional `validator(output, request)` follow
successful schema validation. Each may be asynchronous. Requests include raw text,
canonical value, dependency context, and AbortSignal. Validation uses a separate
cancellation lifetime from suggestions. `config.issues` injects server/external
issues. Paths remain structured and unchanged. Issues default to blocking `error`;
`severity: 'warning'` preserves usable output and does not set `aria-invalid`.
Standard Schema failures are blocking unless an adapter explicitly supplies severity.

`validateOn` is `blur` by default, or `input` / `submit`. Submit timing means the
consumer calls `validate()` explicitly. This is field validation, not form orchestration.
Raw text is retained separately from formatted display and normalized output.
`format(raw, selection)` returns `{ display, selection: { start, end, direction? } }`
or undefined to decline. `formatOn` is `blur` by default or `input`. Every raw
character must survive in order; destructive results and invalid selection mappings
are declined. Parsing/normalization never overwrite display. IME composition is
left native until compositionend. A new user edit starts from the current native
editing buffer, including previously displayed punctuation.

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
