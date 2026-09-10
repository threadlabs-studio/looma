# Editable multi-combobox

## Why these primitives

The established library vocabulary separates three responsibilities:

- `Editable` swaps a presentation surface for an editing surface after an
  explicit click or keyboard activation.
- `MultiCombobox` is a multi-value input whose values are rendered as navigable,
  removable items followed by a text cursor.
- `Combobox` owns the optional autocomplete popup and custom-value proposal.

Looma composes those responsibilities instead of making a domain-specific tag
picker. Consumers own records, authorization, persistence, and optimistic
rollback.

## `ui-editable`

- `edit` + `default-edit` follow Looma's controlled/uncontrolled convention.
- `preview` and `edit` slots are mutually presented.
- A slotted element marked `data-ui-editable-trigger` activates editing by click,
  Enter, or Space.
- Entering edit mode focuses the first editable descendant.
- Escape and pointer interaction outside close edit mode and return focus to the
  trigger.
- `edit-change` communicates `{ edit, reason, trigger }`.

## `ui-multi-combobox`

- `items` contains the selected `{ id, value, label, disabled? }` values.
- `config` uses Looma's existing combobox option/provider contract.
- Selected items render inside the same outlined control as the text input.
- Left/Right move between selected items and the input. Backspace/Delete propose
  removal; Backspace from an empty input proposes removal of the last item.
- Selecting a suggestion emits `add-item`; creating emits `create-item`.
- Choosing or creating clears the query and closes the suggestion popup before
  consumer persistence begins.
- Selected items are neutral pills by default. Rich `item`/`option` slots and a
  popup `footer` slot allow framework adapters to render consumer-owned visuals
  such as colors, icons, avatars, or application tags from option metadata.

The component does not perform persistence and does not silently remove a
controlled item. Consumers optimistically update their records and roll back on
failure.
