# `ui-editable`

Swaps a presentation surface for an editing surface without owning domain state.
Put the normal rendered content in the `preview` slot and the active control in
the `edit` slot. Mark one explicit preview descendant with
`data-ui-editable-trigger`; pointer activation, Enter, or Space opens editing.

`edit?: boolean` is controlled and `default-edit` initializes uncontrolled state.
`disabled` prevents activation. `edit-change` emits `{ edit, reason, trigger }`,
where `reason` is `activate`, `light-dismiss`, `escape`, or `programmatic`.

Opening focuses the editing control (including Looma controls exposing
`focusInput()`). Escape and an outside pointer press close editing and return
focus to the original trigger. Preview links and other controls remain normal
unless explicitly marked as the trigger.

Shadow parts: `preview`, `edit`.
