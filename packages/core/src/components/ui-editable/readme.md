# ui-editable



<!-- Auto Generated Below -->


## Overview

Swaps an explicit presentation trigger for a focused editing control.

## Properties

| Property      | Attribute      | Description                                                                    | Type      | Default     |
| ------------- | -------------- | ------------------------------------------------------------------------------ | --------- | ----------- |
| `defaultEdit` | `default-edit` |                                                                                | `boolean` | `false`     |
| `disabled`    | `disabled`     |                                                                                | `boolean` | `false`     |
| `edit`        | `edit`         | Controlled edit state. Omit it to use defaultEdit and local interaction state. | `boolean` | `undefined` |


## Events

| Event         | Description | Type                          |
| ------------- | ----------- | ----------------------------- |
| `edit-change` |             | `CustomEvent<EditableChange>` |


## Shadow Parts

| Part        | Description |
| ----------- | ----------- |
| `"edit"`    |             |
| `"preview"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
