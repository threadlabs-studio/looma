# Looma Event Schema

Props/attributes are **initial values only**. Components do not reflect state back to the DOM. State changes are communicated via events with a consistent payload shape. This enables algorithmic adapter generation.

## Event Payload Shapes

All state-change events include `trigger: 'keyboard' | 'pointer' | 'programmatic'`.

### open / close

```ts
{ open: boolean; reason: 'programmatic' | 'light-dismiss' | 'escape' | 'action'; trigger }
```

**Components:** ui-disclosure, ui-dialog, ui-popover, ui-tooltip, ui-menu, ui-toast-region

### select

```ts
{ value: string; previousValue?: string; trigger }
```

**Components:** ui-tabs, ui-menu, ui-radio-group

### change

```ts
{ checked: boolean; value: string; trigger }
```

**Components:** ui-checkbox, ui-switch, ui-radio, ui-radio-group

### input / change (value-only)

```ts
{ value: string; trigger }
```

**Components:** ui-input

### dismiss

```ts
{ id: string; reason: string; trigger }
```

**Components:** ui-toast-region

## Adapter Generation

Adapters map:

1. **Props → attributes** on mount/update (one-way)
2. **Events → callbacks** with typed detail

The schema is deterministic: each event name has a fixed detail shape. Adapters can be generated from this schema without per-component logic.
