# Component Library Audit

Last updated: 2026-03-29

This audit compares Looma's shipped and proposed component surface against a broader set of modern UI libraries. The goal is to confirm a durable component set, identify common feature expectations, and update Looma's roadmap with benchmarked gaps instead of library-by-library intuition.

## Scope

- Looma baseline:
  - `generated/component-api.json`
  - component READMEs in `packages/core/src/ui-*/README.md`
  - public component docs in `apps/docs/docs/components/`
  - `docs/component-roadmap.md`
  - `docs/editor-roadmap.md`
- External corpus:
  - General UI libraries: Radix Primitives, React Aria Components, Headless UI, Material UI, Chakra UI, Vuetify, PrimeVue, Quasar, Shoelace, FAST, Spectrum Web Components
  - Editor ecosystems: Tiptap open-source docs, BlockNote, Plate, Lexical
- Source policy:
  - Official docs and official repos only
  - Context7-backed review for Radix Primitives, Vuetify, and Shoelace

## Looma Baseline

### Shipped now

- Layout: `ui-stack`, `ui-inline`, `ui-cluster`, `ui-grid`, `ui-center`, `ui-separator`
- Forms/actions: `ui-button`, `ui-icon-button`, `ui-input`, `ui-select`, `ui-textarea`, `ui-form-field`, `ui-checkbox`, `ui-radio`, `ui-radio-group`, `ui-switch`
- Overlay/display/navigation: `ui-dialog`, `ui-popover`, `ui-tooltip`, `ui-menu`, `ui-menu-item`, `ui-disclosure`, `ui-tabs`, `ui-toast-region`, `ui-badge`, `ui-avatar`, `ui-avatar-group`
- App-shell / recipe level: `ui-floating-action-button`, `ui-search-shell`, `ui-search-result-row`, `ui-top-bar`
- Editor: `ui-editor-toolbar`, `ui-editor-slash-menu`, `ui-editor-table-context-menu`, `ui-editor-table-toolbar`, `ui-editor-insert-table-grid`, `ui-editor-table-overlay`

### Source-of-truth mismatches

No active mismatch is open after syncing generated metadata, adapter docs, and public docs discoverability for the shipped surface. Keep this section empty unless a real drift appears again.

## Cross-Library Patterns

### Canonical families are stable

Across React-first, Vue-first, and web-component libraries, the recurring families are stable:

- Layout: stack/flex row/group/grid/container/divider
- Forms/actions: button, text input/text field, field/form control wrapper, checkbox, radio group, switch, select/listbox/combobox
- Overlay/navigation: dialog/modal, popover, tooltip, menu/dropdown/context menu, tabs, disclosure/accordion, toast/snackbar/notification
- Display: badge/chip/tag, avatar/avatar group
- Shell recipes: app bar/top nav, command palette/search shell, result row/list item, floating action button
- Editor UI: fixed toolbar, floating/bubble toolbar, slash/suggestion menu, block side menu, table controls, link editing, mentions, emoji

### Naming variation is real, but it clusters

- `Badge` / `Chip` / `Tag` are often the same family with different emphasis on dismissibility or selection.
- `Disclosure` / `Accordion` are the same family when a library exposes both a single item and grouped pattern.
- `Menu` / `Dropdown Menu` / `Action Menu` / `Context Menu` are the same family with different trigger and selection models.
- `Input` / `TextField` / `Field` / `FormField` split into two common models:
  - single primitive input only
  - composed field wrapper that owns label/help/error
- `Top Bar` is usually `App Bar`, `Top Nav`, `Header`, or `Navigation Bar`.
- `Floating Action Button` is usually `FAB`, `Floating Action Button`, `Speed Dial`, or `QFab`.

### Common API conventions

The ecosystem converges on a few patterns:

- Controlled/uncontrolled state:
  - React/headless systems: `open/defaultOpen`, `value/defaultValue`, `checked/defaultChecked`, `selectedKeys/defaultSelectedKeys`
  - Vue systems: `modelValue` or `v-model`, plus boolean props like `disabled`, `readonly`, `invalid`
  - Web components: reflected attributes such as `open`, `checked`, `disabled`, `value`
- Visual variants:
  - `variant` is the dominant term in Radix, MUI, Chakra, PrimeVue, Shoelace, and Spectrum
  - Vuetify leans on `variant`, `density`, `rounded`, `elevation`, `color`
  - PrimeVue often uses `severity`, `variant`, `size`, `fluid`, `invalid`
  - Quasar commonly uses style booleans and design props: `filled`, `outlined`, `standout`, `borderless`, `flat`, `round`, `dense`, `color`
- Selection collections:
  - React Aria strongly standardizes `selectionMode`, `selectedKeys`, `defaultSelectedKeys`, `onSelectionChange`, `disabledKeys`
  - Menu/listbox ecosystems commonly separate item identity from label text via `value`, `id`, or `key`
- Composition:
  - React Aria and Chakra rely heavily on slots/parts/subcomponents
  - Radix and Headless UI rely on multi-part composition with `Root`, `Trigger`, `Content`, `Item`, etc.
  - Shoelace, FAST, and Spectrum lean on element slots such as `prefix`, `suffix`, `icon`, `label`, `start`, `end`

### What this means for Looma

- Looma's current conventions are directionally correct:
  - `value/defaultValue`, `open/defaultOpen`, `checked/defaultChecked`
  - semantic slot names
  - light DOM SSR-first contracts
- The main gap is not vocabulary drift. The main gap is missing families and missing commonly expected feature depth inside existing families.

## Canonical Family Matrix

### Layout

| Family | External names seen | Common features / API patterns | Looma status | Recommendation |
| --- | --- | --- | --- | --- |
| Stack / vertical layout | `Stack`, `VStack`, `QList`-adjacent layout, `fast-*` layout handled externally | `gap`, alignment, justified distribution, responsive spacing | Shipped as `ui-stack` | Keep |
| Inline / row layout | `Inline`, `Flex`, `Group`, `Wrap`, `HStack` | `gap`, `align`, `justify`, wrapping, responsive collapse | Shipped as `ui-inline` and `ui-cluster` | Keep; document `cluster` vs `inline` intent more clearly |
| Grid | `Grid`, `SimpleGrid`, `Container` + grid, responsive grid | `gap`, column sizing, min width, responsive breakpoints | Shipped as `ui-grid` | Keep |
| Center / container | `Container`, `Center`, `Box`, `Fluid`, `PageContainer` | readable measure, gutters, max width, full-width toggle | Shipped as `ui-center` | Keep |
| Separator / divider | `Separator`, `Divider`, `Fieldset` separators | `orientation`, decorative vs semantic role | Shipped as `ui-separator` | Keep |

### Forms and actions

| Family | External names seen | Common features / API patterns | Looma status | Recommendation |
| --- | --- | --- | --- | --- |
| Button | `Button`, `ActionButton`, `IconButton`, `sp-button`, `fast-button`, `sl-button`, `q-btn` | `variant`, `size`, `color`/`tone`, loading, disabled, icon slots, link mode, grouped buttons | Shipped as `ui-button` and `ui-icon-button` | Extend: add explicit loading and icon-slot conventions to roadmap |
| Text input | `Input`, `TextField`, `InputText`, `QInput`, `sl-input`, `sp-textfield` | `value`, `defaultValue`, `disabled`, `readonly`, `invalid`, placeholder, clearable, full-width/fluid, size, variant | Shipped as `ui-input` | Extend: plan `clearable`, `size`, and explicit `prefix`/`suffix` or adornment pattern |
| Field wrapper | `Field`, `FormField`, `TextField`, `FormControl`, `QField` | label, help text, error text, required, invalid, disabled, orientation, slot/part composition | Shipped as `ui-form-field` | Keep; treat as Looma's canonical field wrapper |
| Checkbox | `Checkbox`, `CheckboxCard` | `checked/defaultChecked`, disabled, invalid, indeterminate, value, label composition | Shipped as `ui-checkbox` | Keep |
| Radio / radio group | `Radio`, `RadioGroup`, segmented/choice variants | `value`, `name`, `orientation`, `disabled`, `required`, `onChange`/`onSelectionChange` | Shipped as `ui-radio` and `ui-radio-group` | Keep |
| Switch | `Switch`, `Toggle`, `ToggleSwitch` | `checked/defaultChecked`, disabled, required, labeling, size | Shipped as `ui-switch` | Keep |
| Textarea | `Textarea`, `TextArea`, `QInput type=textarea`, `sl-textarea` | rows, auto-resize, invalid, resize behavior, count/help integration | Shipped as `ui-textarea` | Extend later with auto-resize and count/help guidance |
| Select / listbox / combobox | `Select`, `Listbox`, `ComboBox`, `QSelect`, `fast-select`, `sp-picker`, `sl-select` | controlled selection, option identity, filtering/search, disabled items, sections, keyboard nav, empty state | Partly shipped via `ui-select` | Add listbox/combobox depth after the native-select baseline is stable |

### Overlay, navigation, display

| Family | External names seen | Common features / API patterns | Looma status | Recommendation |
| --- | --- | --- | --- | --- |
| Dialog / modal | `Dialog`, `AlertDialog`, `Drawer`, modal shell | `open/defaultOpen`, modal vs non-modal, dismissible/persistent, focus management, overlay, close reasons | Shipped as `ui-dialog` | Extend: roadmap should add explicit persistent/dismissible terminology in public API notes |
| Popover | `Popover`, `HoverCard`, `PopupProxy`, anchored region | `open/defaultOpen`, `placement` or `side` + `align`, collision handling, anchor, focus rules | Shipped as `ui-popover` | Extend: document side/align vocabulary decision before API growth |
| Tooltip | `Tooltip`, `ToggleTip`, contextual help | trigger by focus/hover, delay, placement, disabled trigger behavior | Shipped as `ui-tooltip` with anchored top-layer positioning and configurable pointer-intent delays | Keep; add disabled-trigger guidance as usage grows |
| Menu / dropdown / context menu | `Menu`, `Dropdown Menu`, `Action Menu`, `Context Menu`, `QMenu` | open state, item roles, submenus, checkable items, auto-close, positioning, trigger/content/item composition | Shipped as `ui-menu` and `ui-menu-item` | Extend: add submenu and checkable-item roadmap notes |
| Tabs | `Tabs`, `TabList`, `TabPanels`, `fast-tabs`, `QTabs` | `value/defaultValue`, orientation, activation mode, overflow/scroll arrows, indicators | Shipped as `ui-tabs` | Extend: roadmap note for overflow handling if Looma wants parity with app-bar usage |
| Disclosure / accordion | `Disclosure`, `Accordion`, `Collapse`, `Expansion Panel` | single vs multi-open grouping, disabled items, controlled open state | Partly shipped via `ui-disclosure` | Extend: decide whether grouped accordion stays recipe-level or becomes first-class |
| Toast / snackbar / notification | `Toast`, `Snackbar`, `ToastRegion`, `Banner` | live region, stacking, dismiss, severity, action button, duration, placement | Shipped as `ui-toast-region` | Extend: roadmap note for severity/action API |
| Badge / chip / tag | `Badge`, `Chip`, `Tag`, `StatusLight` | variant, tone/severity/color, removable/closable, selectable, icon support, pill/rounded | Shipped as `ui-badge` | Extend: plan whether dismissible/selectable chip stays separate from badge |
| Avatar / avatar group | `Avatar`, `AvatarGroup`, `User`, identity badge | image/fallback, label, size, status, overflow count | Shipped as `ui-avatar` and `ui-avatar-group` | Keep |
| Top bar / app bar | `App Bar`, `Top Nav`, `Header`, `Top Nav Item` | leading actions, title slot, search slot, trailing actions, sticky behavior, responsive collapse | Shipped as `ui-top-bar` | Keep as recipe-level Looma primitive; no rename needed |
| Floating action button | `Floating Action Button`, `FAB`, `Speed Dial`, `QFab` | primary action, expandable sub-actions, hide/show label, icon-only, sticky positioning, mobile emphasis | Shipped as `ui-floating-action-button` | Keep |

### Search and command-shell recipes

| Family | External names seen | Common features / API patterns | Looma status | Recommendation |
| --- | --- | --- | --- | --- |
| Search shell / command palette | command palette, search dialog, omnibox, quick search | open state, keyboard shortcut, search slot, grouped results, loading/empty/footer slots, responsive dialog behavior | Shipped as `ui-search-shell` | Keep as recipe-level primitive; add optional feature checklist as usage grows |
| Result row / list item | list row, command item, option row, action row | selected/active state, disabled, leading/trailing visuals, metadata, excerpt/description | Shipped as `ui-search-result-row` | Keep; add optional keyboard/selection-state guidance in roadmap |

### Editor primitives

| Family | External names seen | Common features / API patterns | Looma status | Recommendation |
| --- | --- | --- | --- | --- |
| Fixed toolbar | formatting toolbar, static toolbar | bold/italic/link/code/list buttons, block-type select, active state, disabled state, icon buttons | Shipped as `ui-editor-toolbar` shell | Extend: define a default action taxonomy and slot contract |
| Floating / bubble toolbar | bubble menu, floating toolbar | selection-triggered positioning, inline mark actions, link editing, hide/show rules | Planned only | Add to editor roadmap as a P0 parity gap |
| Slash menu | slash command, suggestion menu, command menu | trigger char, filtering, aliases, grouping, icons, keyboard navigation, empty state | Shipped as `ui-editor-slash-menu` | Keep; extend grouped items and richer metadata if needed |
| Block side menu / block handle | block menu, block side menu, gutter plus menu | duplicate, delete, turn into, drag handle, insert below | Planned only | Add to editor roadmap as a P0 parity gap |
| Table overlay | row/column insertion affordances | hover controls, insert before/after, table-local positioning | Shipped as `ui-editor-table-overlay` | Keep |
| Table context menu / toolbar | table menu, table action bar | add/delete row/column, merge/split, align cell content, header row/column, delete table | Shipped partly | Extend: call out merge/split and header controls explicitly |
| Insert-table grid | insert table picker | row/column preview, header-row option, keyboard selection | Shipped | Keep |
| Link editing | link toolbar, link popover | create/edit/remove link, validation, target/rel options, preview | Missing | Add to editor roadmap as a P0 parity gap |
| Mentions | mention menu, inline combobox | trigger char, async items, keyboard navigation, chip/inline rendering | Shipped as `ui-editor-mention-menu` and `createLoomaMentionExtension()` | Keep the host provider bounded and domain-neutral |
| Emoji | emoji picker, emoji grid suggestion menu | trigger char, grid navigation, search/filter | Planned only | Keep on roadmap |

## Recommended Gap Tiers

### P0: baseline gaps to close next

1. Keep documentation and API source-of-truth aligned as new primitives ship:
   - generated metadata
   - adapter parity docs
   - docs/sidebar discoverability
2. Add missing high-frequency form families:
   - `Listbox`
   - `Combobox` after select/listbox baseline is stable
3. Deepen existing high-frequency primitives:
   - `ui-button`: loading, icon placement, link-mode guidance
   - `ui-input`: clearable, size, prefix/suffix/adornment strategy
   - `ui-toast-region`: severity/action guidance
   - `ui-menu`: submenu/checkable-item roadmap
4. Close editor parity gaps with the strongest external recurrence:
   - block side menu / block menu
   - floating toolbar
   - link editing UI

### P1: naming and API normalization gaps

1. Lock overlay positioning vocabulary:
   - decide when Looma uses `placement`
   - decide whether future overlays also expose `side` + `align`
2. Document field strategy more explicitly:
   - `ui-input` is the control primitive
   - `ui-form-field` is the composed label/help/error wrapper
3. Add slot naming guidance for icon/adornment-heavy primitives:
   - likely `prefix` / `suffix` for input-like components
   - keep `leading` / `trailing` for row and shell recipes
4. Add a future collection-state guideline before Looma adds listbox/tree/tag group families:
   - single choice: `value/defaultValue`
   - multi-choice collections: plan for `selectedKeys/defaultSelectedKeys` or an equivalent

### P2: useful but lower-priority promotions

1. Grouped accordion API if `ui-disclosure` grows into a first-class multi-item pattern
2. Dismissible/selectable chip or tag family if `ui-badge` starts carrying interaction
3. Search-shell optional features:
   - grouped sections
   - keyboard shortcut hint row
   - empty/loading slots as first-class docs guidance
4. FAB expansion/speed-dial semantics if Knit or another app needs sub-actions

## Suggested Roadmap Adjustments

### Component roadmap

- Add a benchmark-driven gap section with P0/P1/P2 priorities
- Move `Listbox` and `Combobox` into the candidate queue
- Add a "source-of-truth fixes" item for adapter parity docs and future docs/API drift
- Keep `ui-top-bar`, `ui-search-shell`, and `ui-search-result-row` as recipe-level Looma primitives rather than forcing them into lower-level generic abstractions

### Editor roadmap

- Add an ecosystem parity section that explicitly calls out:
  - block menu / block side menu
  - floating toolbar
  - link editing UI
  - mentions
  - emoji
- Treat tables as partly shipped but not yet parity-complete until merge/split and richer table actions are closed out

## Sources

### Context7-backed

- Radix Primitives:
  - https://www.radix-ui.com/primitives
  - Context7 library: `/websites/radix-ui_primitives`
- Vuetify:
  - Context7 library: `/vuetifyjs/vuetify`
  - https://vuetifyjs.com/en/components/all/
- Shoelace:
  - Context7 library: `/shoelace-style/shoelace`
  - https://shoelace.style/components/button

### Official docs

- React Aria:
  - https://react-aria.adobe.com/
  - https://react-spectrum.adobe.com/react-aria/selection.html
  - https://react-spectrum.adobe.com/react-aria/Group.html
- Headless UI:
  - https://headlessui.com/
- Material UI:
  - https://mui.com/components/
  - https://mui.com/material-ui/react-button/
  - https://mui.com/material-ui/react-text-field/
- Chakra UI:
  - https://chakra-ui.com/docs/components/concepts/overview
  - https://chakra-ui.com/docs/components/button
  - https://chakra-ui.com/docs/components/field
- PrimeVue:
  - https://primevue.org/
  - https://primevue.org/forms
  - https://primevue.org/inputtext/
  - https://primevue.org/passthrough
- Quasar:
  - https://quasar.dev/vue-components
  - https://quasar.dev/vue-components/input/
  - https://quasar.dev/vue-components/field/
  - https://quasar.dev/vue-components/menu/
  - https://quasar.dev/vue-components/tabs/
  - https://quasar.dev/vue-components/floating-action-button/
- FAST:
  - https://fast.design/docs/1.x/introduction/
  - https://fast.design/docs/1.x/components/getting-started
  - https://fast.design/docs/1.x/api/fast-components
- Spectrum Web Components:
  - https://opensource.adobe.com/spectrum-web-components/
  - https://opensource.adobe.com/spectrum-web-components/components/button/
  - https://opensource.adobe.com/spectrum-web-components/components/action-menu/
- Tiptap:
  - https://tiptap.dev/docs/editor/getting-started/style-editor/custom-menus
  - https://tiptap.dev/docs/editor/extensions/functionality/floatingmenu
- BlockNote:
  - https://www.blocknotejs.org/
  - https://www.blocknotejs.org/docs/react/components
  - https://www.blocknotejs.org/docs/ui-components/formatting-toolbar
  - https://www.blocknotejs.org/docs/ui-components/suggestion-menus
- Plate:
  - https://platejs.org/docs
  - https://platejs.org/docs/slash-command
  - https://platejs.org/docs/api/floating
- Lexical:
  - https://lexical.dev/
  - https://lexical.dev/docs/intro
