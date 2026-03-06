# Adapter Parity

Adapters must remain thin wrappers around the same light DOM contracts.

## Mapping Matrix

| Core Tag | React (`@ui/react`) | Vue (`@ui/vue`) | Svelte (`@ui/svelte`) |
| --- | --- | --- | --- |
| `ui-stack` | `Stack` | `Stack` | native element + `bindAdapter` |
| `ui-inline` | `Inline` | `Inline` | native element + `bindAdapter` |
| `ui-cluster` | `Cluster` | `Cluster` | native element + `bindAdapter` |
| `ui-grid` | `Grid` | `Grid` | native element + `bindAdapter` |
| `ui-center` | `Center` | `Center` | native element + `bindAdapter` |
| `ui-separator` | `Separator` | `Separator` | native element + `bindAdapter` |
| `ui-disclosure` | `Disclosure` | `Disclosure` | native element + `bindAdapter` |
| `ui-tabs` | `Tabs` | `Tabs` | native element + `bindAdapter` |
| `ui-dialog` | `Dialog` | `Dialog` | native element + `bindAdapter` |
| `ui-popover` | `Popover` | `Popover` | native element + `bindAdapter` |
| `ui-menu` | `Menu` | `Menu` | native element + `bindAdapter` |
| `ui-menu-item` | `MenuItem` | `MenuItem` | native element + `bindAdapter` |
| `ui-button` | `Button` | `Button` | native element + `bindAdapter` |
| `ui-input` | `Input` | `Input` | native element + `bindAdapter` |
| `ui-form-field` | `FormField` | `FormField` | native element + `bindAdapter` |
| `ui-tooltip` | `Tooltip` | `Tooltip` | native element + `bindAdapter` |
| `ui-toast-region` | `ToastRegion` | `ToastRegion` | native element + `bindAdapter` |
| `ui-checkbox` | `Checkbox` | `Checkbox` | native element + `bindAdapter` |
| `ui-switch` | `Switch` | `Switch` | native element + `bindAdapter` |

## Event Parity

- `open`: `{ open: true, reason, trigger }`
- `close`: `{ open: false, reason, trigger }`
- `select`: `{ value, previousValue, trigger }`
- `change`: `{ checked, value, trigger }`
- `dismiss`: `{ id, reason, trigger }`

Adapters must not introduce behavior divergence or Shadow DOM.
