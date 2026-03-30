# Component Library Audit

This page summarizes a broader audit of Looma's shipped and proposed component surface against modern React, Vue, and web-component libraries plus richer editor ecosystems. The goal is not to copy another library's taxonomy. It is to confirm which component families are consistently expected, which feature options recur, and where Looma should close real parity gaps.

## Corpus

Reviewed libraries:

- General UI libraries: Radix Primitives, React Aria Components, Headless UI, Material UI, Chakra UI, Vuetify, PrimeVue, Quasar, Shoelace, FAST, Spectrum Web Components
- Editor ecosystems: Tiptap open-source docs, BlockNote, Plate, Lexical

Context7-backed review was used for Radix Primitives, Vuetify, and Shoelace, with official docs used for the remaining libraries.

## Main Findings

### The stable component set is larger than Looma's current shipped baseline

The recurring baseline across the audited libraries is:

- Layout: stack, inline/group, grid, container/center, separator
- Forms and actions: button, text input, field wrapper, checkbox, radio group, switch, textarea, select/listbox/combobox
- Overlay and navigation: dialog, popover, tooltip, menu/dropdown, tabs, disclosure/accordion, toast/snackbar
- Display: badge/chip/tag, avatar/avatar group
- Shell recipes: app bar/top bar, search shell/command palette, result row, floating action button
- Editor UI: fixed toolbar, floating toolbar, slash menu, block side menu, table controls, link editing, mentions, emoji

### Naming varies, but the families are still obvious

- `Badge`, `Chip`, and `Tag` usually belong to the same family
- `Disclosure` and `Accordion` are usually the same pattern at different abstraction levels
- `Menu`, `Dropdown Menu`, `Action Menu`, and `Context Menu` are the same core family
- `Input`, `Field`, `FormField`, and `TextField` often split into:
  - a control primitive
  - a field wrapper that owns label/help/error wiring

### The strongest API conventions are consistent

- State naming converges on:
  - `open/defaultOpen`
  - `value/defaultValue`
  - `checked/defaultChecked`
- Visual options converge on:
  - `variant`
  - `size`
  - `disabled`
  - color or tone props such as `color`, `severity`, `tone`, or `colorPalette`
- Collection components often need a stronger selection vocabulary than simple `value`, for example `selectionMode`, `selectedKeys`, and `disabledKeys`

## Looma-Specific Findings

### Current mismatches in Looma's own source of truth

There is no active docs/API mismatch in the shipped surface right now. The real requirement is to keep generated metadata, adapter docs, and sidebar discoverability aligned as new primitives land.

### Looma is directionally right on naming

Looma's current naming and state conventions already line up well with the broader ecosystem:

- `value/defaultValue`
- `open/defaultOpen`
- `checked/defaultChecked`
- semantic slots such as `trigger`, `content`, `label`, `help`, `error`

The bigger issue is family coverage and feature depth, not naming drift.

## Recommended Gaps

### P0

- Keep generated metadata, adapter docs, and sidebar discoverability aligned as new primitives ship
- Add missing high-frequency primitives:
  - `Listbox`
  - `Combobox` after the simpler select path is stable
- Deepen current high-frequency primitives:
  - `ui-button`: loading and icon-placement guidance
  - `ui-input`: clearable, size, and adornment strategy
  - `ui-menu`: submenu and checkable-item direction
  - `ui-toast-region`: severity and action guidance
- Close the biggest editor parity gaps:
  - block menu / block side menu
  - floating toolbar
  - link editing UI

### P1

- Lock overlay positioning vocabulary before more overlay APIs ship
- Document Looma's field strategy more explicitly:
  - `ui-input` for the control
  - `ui-form-field` for label/help/error composition
- Add stronger slot guidance for prefix/suffix versus leading/trailing usage

### P2

- Decide whether grouped accordion behavior should become first-class beyond `ui-disclosure`
- Decide whether interactive chip/tag behavior should stay separate from `ui-badge`
- Expand search-shell guidance for grouped results, empty states, and keyboard-hint footers
- Revisit multi-action FAB behavior only if real app demand appears

## Canonical Family Summary

| Family | Looma status | Recommended action |
| --- | --- | --- |
| Layout primitives | Shipped | Keep |
| Button / input / field / checkbox / radio / switch | Shipped | Keep and deepen |
| Textarea | Shipped | Extend later |
| Select / listbox / combobox | Partly shipped via `ui-select` | Add listbox/combobox depth next |
| Dialog / popover / tooltip / menu / tabs / toast | Shipped | Keep and deepen |
| Disclosure / accordion | Partly shipped | Extend only if grouped usage becomes common |
| Badge / avatar / avatar group | Shipped | Keep |
| Top bar / search shell / result row | Shipped as recipe-level primitives | Keep as recipe-level |
| Floating action button | Shipped | Keep |
| Editor toolbar / slash menu / table controls | Partly shipped | Keep |
| Editor floating toolbar / block menu / link editing | Planned or missing | Prioritize |

## Sources

### Context7-backed

- Radix Primitives: https://www.radix-ui.com/primitives
- Vuetify: https://vuetifyjs.com/en/components/all/
- Shoelace: https://shoelace.style/components/button

### Official docs

- React Aria: https://react-aria.adobe.com/
- Headless UI: https://headlessui.com/
- Material UI: https://mui.com/components/
- Chakra UI: https://chakra-ui.com/docs/components/concepts/overview
- PrimeVue: https://primevue.org/
- Quasar: https://quasar.dev/vue-components
- FAST: https://fast.design/docs/1.x/components/getting-started
- Spectrum Web Components: https://opensource.adobe.com/spectrum-web-components/
- Tiptap: https://tiptap.dev/docs/editor/getting-started/style-editor/custom-menus
- BlockNote: https://www.blocknotejs.org/docs/react/components
- Plate: https://platejs.org/docs
- Lexical: https://lexical.dev/docs/intro
