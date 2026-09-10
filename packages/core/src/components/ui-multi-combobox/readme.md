# ui-multi-combobox



<!-- Auto Generated Below -->


## Overview

A multi-value combobox with removable, customizable selected items.

## Properties

| Property       | Attribute       | Description | Type                           | Default     |
| -------------- | --------------- | ----------- | ------------------------------ | ----------- |
| `config`       | --              |             | `ComboboxConfig`               | `{}`        |
| `defaultQuery` | `default-query` |             | `string`                       | `''`        |
| `disabled`     | `disabled`      |             | `boolean`                      | `false`     |
| `items`        | --              |             | `readonly MultiComboboxItem[]` | `[]`        |
| `label`        | `label`         |             | `string`                       | `''`        |
| `name`         | `name`          |             | `string`                       | `''`        |
| `placeholder`  | `placeholder`   |             | `string`                       | `''`        |
| `query`        | `query`         |             | `string`                       | `undefined` |
| `readOnly`     | `readonly`      |             | `boolean`                      | `false`     |
| `required`     | `required`      |             | `boolean`                      | `false`     |


## Events

| Event            | Description | Type                                                                                                   |
| ---------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| `add-item`       |             | `CustomEvent<MultiComboboxItemChange>`                                                                 |
| `create-item`    |             | `CustomEvent<MultiComboboxCreate>`                                                                     |
| `options-change` |             | `CustomEvent<readonly ComboboxOption<unknown>[]>`                                                      |
| `query-change`   |             | `CustomEvent<{ query: string; display: string; trigger: "keyboard" \| "pointer" \| "programmatic"; }>` |
| `remove-item`    |             | `CustomEvent<MultiComboboxItemChange>`                                                                 |


## Methods

### `focusInput() => Promise<void>`



#### Returns

Type: `Promise<void>`




## Shadow Parts

| Part     | Description |
| -------- | ----------- |
| `"item"` |             |


## Dependencies

### Depends on

- [ui-combobox](../ui-combobox)
- [ui-chip](../ui-chip)

### Graph
```mermaid
graph TD;
  ui-multi-combobox --> ui-combobox
  ui-multi-combobox --> ui-chip
  ui-combobox --> ui-tooltip
  style ui-multi-combobox fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
