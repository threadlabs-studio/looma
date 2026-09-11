# `ui-multi-combobox`

A controlled multi-value combobox composed from removable selected items and a
Looma combobox. The consumer owns the `items` collection, metadata, rendering,
and persistence; Looma emits proposed changes immediately.

`items` and `config` are JavaScript properties. Query may be controlled with
`query` or initialized with `default-query`. `tokenSeparators` can opt the
control into token-style entry: typing a configured character commits an exact
visible option, or creates the trimmed query when `allowCreate` is enabled,
then leaves the input focused for the next item. Its default is empty, so
ordinary multi-combobox values can contain punctuation. The remaining field
props are `label`, `placeholder`, `name`, `disabled`, `readonly`, and
`required`.

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

Selected items default to a `12rem` maximum inline size and truncate long labels
to one line. Override `--ui-multi-combobox-item-max-inline-size` with another
finite length when a different density is needed. Avoid effectively unbounded
values such as `100%`: a single selected item can crowd out the text cursor and
make the editing control unusable on narrow screens.
