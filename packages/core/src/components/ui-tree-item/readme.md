# ui-tree-item



<!-- Auto Generated Below -->


## Properties

| Property          | Attribute          | Description                                                                                     | Type      | Default     |
| ----------------- | ------------------ | ----------------------------------------------------------------------------------------------- | --------- | ----------- |
| `accepts`         | `accepts`          | Comma-separated drag kinds accepted as children. Empty accepts every kind.                      | `string`  | `''`        |
| `container`       | `container`        | Whether this item accepts children and exposes disclosure behavior.                             | `boolean` | `false`     |
| `defaultExpanded` | `default-expanded` | Initial uncontrolled expansion value.                                                           | `boolean` | `false`     |
| `disabled`        | `disabled`         |                                                                                                 | `boolean` | `false`     |
| `dragType`        | `drag-type`        | Application-defined kind used to reject incompatible sibling drops.                             | `string`  | `'item'`    |
| `dropDepth`       | `drop-depth`       | Application hierarchy depth override used for drop constraints. Defaults to structural nesting. | `number`  | `undefined` |
| `dropScope`       | `drop-scope`       | Application-defined parent/list identity included with reorder events.                          | `string`  | `''`        |
| `expanded`        | `expanded`         | Controlled expansion value. When omitted, `default-expanded` initializes uncontrolled state.    | `boolean` | `undefined` |
| `itemId`          | `item-id`          | Stable application identifier emitted by tree interaction events.                               | `string`  | `''`        |
| `label`           | `label`            | Accessible name used by the disclosure and drag handle.                                         | `string`  | `''`        |
| `selected`        | `selected`         |                                                                                                 | `boolean` | `false`     |
| `sortable`        | `sortable`         | Whether this item participates in pointer drag and drop.                                        | `boolean` | `false`     |
| `subtreeDepth`    | `subtree-depth`    | Virtualized-tree descendant-depth override for the tree's max-depth drop constraint.            | `number`  | `undefined` |


## Shadow Parts

| Part               | Description |
| ------------------ | ----------- |
| `"actions"`        |             |
| `"children"`       |             |
| `"disclosure"`     |             |
| `"drag-handle"`    |             |
| `"drop-indicator"` |             |
| `"label"`          |             |
| `"leading"`        |             |
| `"row"`            |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
