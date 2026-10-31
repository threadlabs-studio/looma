# Looma Event Schema

Props/attributes provide initial values and can be updated by the consumer. Components do not reflect
interaction state back into those attributes. Events report changes or requests; consumers that own
state update the corresponding prop. The `<defs>` in each component is the exact event contract used
by adapter generation.

## Event Payload Shapes

Interaction events generally include `trigger: 'keyboard' | 'pointer' | 'programmatic'`.
The editor suggestion menus' `highlight` and `select` events report `{ index, value }` without a
trigger. Check a component's API for its exact detail shape.

### open / close

```ts
{ open: boolean; reason: 'programmatic' | 'light-dismiss' | 'escape' | 'action'; trigger }
```

**Components:** ui-disclosure, ui-dialog, ui-popover, ui-tooltip, ui-menu, ui-context-menu.
The available reasons differ by component; for example, a Tooltip may close after an anchor leaves,
while a Menu may close on light dismissal.

### select

Tabs and Radio Group report `{ value, previousValue, trigger }`. Menu and Context Menu report
`{ value, checked?, trigger }`, where `checked` is present for a checkable choice. Tree reports
`{ ids: string[], trigger }`: the requested selected IDs in tree order. Tree Item `selected` remains
consumer controlled. Editor suggestion menus report `{ index, value }`.
Calendar reports `{ value, trigger }` for every accepted day activation, including
an already selected date. Its `input` and `change` events report only a changed
selection; month/year navigation does not change the selected date.

Date Range Picker reports `input` and `change` with
`{ value: { start: string, end: string }, trigger }`. Endpoints are inclusive
`YYYY-MM-DD` dates. Choosing an existing endpoint or completing a two-click calendar range commits
both endpoints immediately. An unfinished first click or partial typed pair
does not replace the previously accepted range. Its `query-change`
includes `{ endpoint: 'start' | 'end', query }`; `validation-change` includes
`{ invalid, message, endpoint? }` so applications can associate field errors.

### month-change

Calendar reports `{ month: string, trigger }` when user navigation or a `focus-date`
request changes the visible ISO `YYYY-MM`. External prop replacements report no event.

### navigate

Pagination reports `{ page: number, previousPage: number, trigger }` for an enabled page activation. The consumer updates `page`; links keep native navigation and modified clicks do not request an in-place update.

### activate

Tree in single-selection mode reports `{ id: string, trigger: 'keyboard' | 'pointer' }`
when a row is clicked or Enter is pressed. This is a default-action request,
including for an already selected item; it never changes consumer-owned state.
Space requests selection only. Controls, disabled rows, and multiple-selection
checkboxes do not activate. Trees without selection retain their link and
expansion behavior.

### change

```ts
{ checked: boolean; value: string; trigger }
```

**Components:** ui-checkbox, ui-switch, ui-radio, ui-radio-group. A checkable ui-menu-item adds its
`type` (`checkbox` or `radio`). Editable instead reports `{ value, previousValue, trigger }`.

### input / change (value-only)

```ts
{ value: string; trigger }
```

**Components:** ui-input, ui-date-field, ui-date-picker, ui-time-field, ui-time-picker

### file selection

File Input reports `change` with `{ files: File[], trigger }` after accepting a
selection, removal or drop. The array contains native File objects, including an
empty array after removing the last file. A rejected proposal reports `reject`
with `{ files: File[], message }` and preserves the previously accepted selection.
Applications own upload transport and progress.

### dismiss

```ts
{ id: string; reason: string; trigger }
```

**Components:** ui-toast and ui-toast-region. `reason` is `action` or `timeout`. For an authored
Toast, the consumer removes the toast after its `dismiss` request; Region removes generated toasts.

### query-change

```ts
{ query: string; display: string; trigger }
```

**Components:** ui-combobox

### selected-values-change

```ts
{ selectedValues: string[]; trigger }
```

The whole new list of selected option values, reported when the user adds or removes one; setting
`selectedValues` reports nothing. Vue binds it as `v-model:selected-values`.

**Components:** ui-combobox (`multiple`)

### Editor image activation

`ui-editor` and its framework projections dispatch native `CustomEvent`s. Read the following payload from `event.detail`:

```ts
type ImageDetail = {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  responsive?: boolean;
  trigger: 'keyboard' | 'pointer' | 'programmatic';
};
```

- `image-activate` uses `pointer` or `keyboard` and lets a host open its viewer.
- `image-rendition-error` uses `programmatic` after Looma removes transient
  rendition attributes and restores the resolved master (the stored source when
  the `image-delivery` request supplies no source resolver).

Neither event includes provider-specific URLs beyond the stored `src`.

**Components:** ui-editor

### reorder

```ts
{
  sourceId: string;
  targetId: string;
  position: 'before' | 'inside' | 'after';
  sourceType: string;
  targetType: string;
  sourceScope: string;
  targetScope: string;
  trigger: 'keyboard' | 'pointer' | 'programmatic';
}
```

**Components:** ui-tree

For `position: 'inside'`, consumers insert the source first in the target's
compatible child list. Before/after positions are relative to the target's
complete subtree boundary, not only its visible row. A move handle supports click/tap and keyboard
placement in addition to dragging.

### expand

```ts
{ id: string; expanded: boolean; trigger }
```

**Components:** ui-tree-item

## Controller requests

Date Field, Time Field and Time Picker accept a native `set-value` CustomEvent
on their rendered root, with detail `{ value: string, trigger?: 'keyboard' |
'pointer' | 'programmatic' }`. The canonical value must satisfy the field's
constraints. An accepted request replaces the editable draft, including an invalid
draft whose last accepted value is unchanged. A changed accepted value emits the
usual input/change events once. Rejected requests leave the value and draft
validity unchanged. Dispatch a cancelable event to observe rejection through
`dispatchEvent()` returning false, including for disabled or readonly fields.
The request does not change the external reset seed. Use ordinary
value props for application state reflection; picker compositions use this request
to commit an explicit choice. A native `validate` event checks the current draft
and reports validation-change.

Toast Region accepts a native `show-toast` CustomEvent dispatched on its rendered
root, with detail `{ message: string, id?: string, tone?: 'neutral' | 'info' |
'success' | 'warning' | 'danger', duration?: number }`. `id` identifies the
later `dismiss` event; event dispatch does not return the generated ID. The
existing `--show-toast` invoker command reads the source button's `value`.

Combobox accepts a native `validate` event or a `command` event with `command: '--validate'` and
reports validation through its existing `validation-change` event. Focus its
native `input[role="combobox"]` directly. These replace generated `show()`,
`validate()`, and `focusInput()` element methods. Controllers use the named
`connect(host)` lifecycle and return cleanup for their DOM setup.

An HTML Next parent can target a child through its own local ref. For example,
`<dispatch target="customer" event="validate">` addresses
`<ui-combobox $ref="customer">`; a repeated ref addresses every rendered child.
Declare the outgoing `validate` event with type `unknown` in the parent, and
attach `on:validation-change` to the combobox to read its result through
`$$event.detail`. JavaScript requests the same interaction with
`combobox.dispatchEvent(new Event('validate'))` and listens with
`combobox.addEventListener('validation-change', callback)`.

## Adapter Generation

Adapters map:

1. **Props → attributes** on mount/update (one-way)
2. **Events → callbacks** with typed detail

Event names can have component-specific details; adapter generation reads each component's declared
event type, rather than assuming that one name implies one universal payload.

### Segmented input selection

An Input configured with `segments` accepts a native `select-first-segment` event
to select its first editable block after a composing owner changes the displayed
representation. It leaves focus with the caller. Ordinary focus selects that
block automatically. Native input events continue to carry the edited text;
Date Field and Time Field own parsing and emit canonical values through their
existing input/change events.
