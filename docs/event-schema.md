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

**Components:** ui-input

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

### Vue editor image activation

`LoomaEditor` emits framework-level events rather than custom-element events:

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

- `imageActivate` uses `pointer` or `keyboard` and lets a host open its viewer.
- `imageRenditionError` uses `programmatic` after Looma removes transient
  rendition attributes and restores the stored source.

Neither event includes provider-specific URLs beyond the stored `src`.

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

## Adapter Generation

Adapters map:

1. **Props → attributes** on mount/update (one-way)
2. **Events → callbacks** with typed detail

Event names can have component-specific details; adapter generation reads each component's declared
event type, rather than assuming that one name implies one universal payload.
