# `ui-multi-combobox`

A controlled multi-value combobox composed from removable selected items and a
Looma combobox. The consumer owns the `items` collection, metadata, rendering,
and persistence; Looma emits proposed changes immediately.

`items` and `config` are JavaScript properties. Query may be controlled with
`query` or initialized with `default-query`. The remaining field props are
`label`, `placeholder`, `name`, `disabled`, `readonly`, and `required`.

Events:

- `add-item`: `{ item, index, trigger }`
- `remove-item`: `{ item, index, trigger }`
- `create-item`: `{ query, trigger }`
- `query-change`: `{ query, display, trigger }`
- `options-change`: the current combobox options

Left and Right move between the input and selected items when the input cursor
is at the start. Backspace removes the previous item from an empty input.
Backspace or Delete removes a focused item. `focusInput()` focuses the nested
native input.

The default selected-item renderer is a neutral Looma pill. Dynamic
`item-${id}` slots can replace it with any noninteractive presentation using the
full option metadata—for example colors, icons, avatars, or application tags.
Dynamic slots are `item-${id}` and `option-${id}`. Status and action slots are
`create`, `footer`, `loading`, `empty`, and `error`. Shadow part: `item`.
