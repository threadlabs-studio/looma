# Looma audit: disclosure, navigation, collections

> **Evidence, not decisions.** These are the research notes behind the 0.3 option audit. They describe the API *before* 0.3, and some verdicts were overruled or already resolved. The binding decisions are in the [Component option audit](../../apps/docs/docs/component-library-audit.md).

Date: 2026-09-21. Components: `ui-disclosure`, `ui-tabs`, `ui-tree` / `ui-tree-item`, `ui-top-bar`, `ui-search-shell` (+ `ui-search-result-row`), `ui-affordance-scope`.

Looma's API is the declared API before 0.3. I also used an older Stencil build's `generated/component-api.json` to read component descriptions and event detail shapes. That build is older, and some defaults differ from the current API (for example, `near-radius` is 32 there and 16 now).

Libraries audited: React Aria Components (RAC), Radix Primitives (Radix), Headless UI (HUI), Material UI and MUI X (MUI), Chakra UI v3 / Ark (Chakra), Vuetify 3, PrimeVue 4, Quasar 2, Web Awesome / Shoelace (WA), Spectrum Web Components (SWC), and the WAI-ARIA APG.

Rules applied to every recommendation:
- Props must be attributes that have a text form.
- Function-valued options are not allowed.
- Booleans must default to false.
- No `data-*` attributes may be required of authors.
- An option is added only when it has real value.

"Common" means the capability is present in more than half of the libraries that ship the component. "(uncertain)" means I could not confirm the fact in official docs during this pass.

---

## 1. `ui-disclosure` (collapsible / accordion item)

**Current Looma API:** `disabled`, `open`, `summary="Details"`, events `open` and `close`, and the default slot.

### Equivalents

| Library | Single item | Group / accordion |
|---|---|---|
| RAC | `Disclosure` + `DisclosurePanel` | `DisclosureGroup` |
| Radix | `Collapsible` | `Accordion` |
| HUI | `Disclosure` | none |
| MUI | `Accordion` | none (the app manages exclusivity) |
| Chakra | `Collapsible` | `Accordion` |
| Vuetify | `v-expansion-panel` | `v-expansion-panels` (the item only exists inside the group) |
| PrimeVue | `AccordionPanel` (also `Panel toggleable`) | `Accordion` |
| Quasar | `QExpansionItem` | the `group` prop on the item (no wrapper) |
| WA | `wa-details` | the `name` attribute on the item (no wrapper, mirrors native `<details name>`) |
| SWC | `sp-accordion-item` | `sp-accordion` |
| Native HTML | `<details>` / `<summary>` | `<details name="…">` (exclusive group) |

### Capabilities (10 libraries)

| Capability | Libraries | Count | Common? | Looma |
|---|---|---|---|---|
| Open / default open | all | 10 | yes | yes (`open`) |
| Disabled | RAC, Radix, MUI, Chakra, Vuetify, PrimeVue, Quasar, WA, SWC | 9 | yes | yes |
| Accordion group, single vs multiple | RAC (`allowsMultipleExpanded`), Radix (`type`), Chakra (`multiple`), Vuetify (`multiple`), PrimeVue (`multiple`), Quasar (`group`), WA (`name`), SWC (`allow-multiple`) | 8 | yes | **no** |
| Rich summary content (markup, not a string) | all | 10 | yes | **no** (the `summary` attribute is a string) |
| Heading wrapper / heading level (APG requires it for accordions) | Radix (`Accordion.Header`), RAC (a `Heading` child), MUI (`slotProps.heading`, h3), SWC (`level`, default 3), PrimeVue/Chakra/Vuetify (uncertain) | 4–7 | yes (APG-mandated) | **no** |
| Lazy mount / unmount when closed | HUI (`unmount`), Radix (`forceMount`), Chakra (`lazyMount`, `unmountOnExit`), MUI (`unmountOnExit`), PrimeVue (`lazy`), Vuetify (`eager`) | 6 | yes | no |
| "Collapsible": whether all items may be closed in single mode | Radix, Chakra, Vuetify (`mandatory`, the inverse) | 3 | no | n/a |
| Visual variant / appearance | Chakra, Vuetify, WA, MUI (`square`, `disableGutters`) | 4 | no | no |
| Expand-icon placement | WA (`icon-placement`), Quasar (`switch-toggle-side`) | 2 | no | no |
| Cancelable toggle event | SWC | 1 | no | no |
| Arrow-key navigation between headers | Radix, PrimeVue, SWC (APG marks it optional) | 3 | no | no |

### Gaps

| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| Exclusive accordion grouping | **add** | 8 of 10 libraries support it, and the platform already solved it with `<details name>`, so the cost is small and the model is familiar. | `name: string = ""`. Opening one `ui-disclosure` closes the others with the same `name` (same semantics as native and WA). This needs no wrapper component. If the root becomes `<details>`, forward `name` to it and the browser enforces it. |
| Accordion wrapper component | **skip** | The `name` attribute covers exclusivity. "Multiple open" is already the default. The wrapper's remaining features (arrow keys, `collapsible`) are not common. | none |
| Rich summary | **add** | Counts, icons, and status badges in headers are routine, and a string attribute cannot hold them. | `summary` slot. Keep the `summary` attribute as a text shorthand; the slot wins when present. |
| Heading level | **add** | APG requires accordion headers to be headings, and only the author knows the document outline. | `heading-level: number = 0`. `0` means a plain button; `2` to `6` wraps the trigger in `<hN>`. (Uncertain: another option is to default to wrapping and require a level.) |
| Lazy mount / unmount | **skip** | This is a framework rendering concern. In HTML-first markup the content already exists, and keeping it findable is better. | Instead, hide closed content with `hidden="until-found"` or a native `<details>` root, so find-in-page and anchor links auto-open it (fire `open` with a new reason). Uncertain: whether RAC Disclosure does this; I did not confirm it in the docs. |
| Variant / icon placement | skip | Styling belongs to tokens and CSS parts, not props. | none |

### Extras

None. Every Looma option is common. The `summary` default of "Details" matches the native `<summary>` default, so keep it.

### Function-valued options elsewhere

Only change callbacks (`onExpandedChange`, `onValueChange`, `onChange`). Looma already has the `open` and `close` events.

**Sources**
- https://react-aria.adobe.com/Disclosure
- https://www.radix-ui.com/primitives/docs/components/accordion
- https://headlessui.com/react/disclosure
- https://mui.com/material-ui/api/accordion/
- https://chakra-ui.com/docs/components/accordion
- https://github.com/vuetifyjs/vuetify/tree/master/packages/vuetify/src/components/VExpansionPanel
- https://primevue.dev/accordion/
- https://quasar.dev/vue-components/expansion-item
- https://webawesome.com/docs/components/details
- https://opensource.adobe.com/spectrum-web-components/components/accordion/
- https://www.w3.org/WAI/ARIA/apg/patterns/accordion/

---

## 2. `ui-tabs`

**Current Looma API:** `label="Tabs"`, `orientation`, `stretch`, `value`, event `select`, default slot. Tab buttons are generated from child `<section aria-label>` panels.

### Equivalents and structure

| Library | Structure |
|---|---|
| RAC | `Tabs` > `TabList` > `Tab id` + `TabPanel id` |
| Radix | `Tabs.Root` > `List` > `Trigger value` + `Content value` |
| HUI | `TabGroup` > `TabList` > `Tab` + `TabPanels` > `TabPanel` (paired by index) |
| MUI | `Tabs` > `Tab value` (panels come from the app or `TabPanel` in `@mui/lab`) |
| Chakra | `Tabs.Root` > `List` > `Trigger value` + `Content value` |
| Vuetify | `v-tabs` > `v-tab value` (or an `items` array) + `v-tabs-window` > `v-tabs-window-item` |
| PrimeVue | `Tabs` > `TabList` > `Tab value` + `TabPanels` > `TabPanel value` |
| Quasar | `q-tabs` > `q-tab name` + `q-tab-panels` > `q-tab-panel name` |
| WA | `wa-tab-group` > `wa-tab panel="x"` (nav slot) + `wa-tab-panel name="x"` |
| SWC | `sp-tabs` > `sp-tab value label` + `sp-tab-panel value` |

Every library uses explicit Tab + Panel pairs linked by a value or index. None generates tabs from panels. Looma's generated approach saves markup and guarantees pairing. Its cost is that a tab can only carry a text label: there is no per-tab disabled state and no icon or badge.

### Capabilities (10 libraries)

| Capability | Libraries | Count | Common? | Looma |
|---|---|---|---|---|
| Selected value (controlled or default) | all | 10 | yes | yes (`value`) |
| Disabled individual tab | all | 10 | yes | **no** |
| Orientation / vertical | RAC, Radix, HUI, MUI, Chakra, Vuetify (`direction`), Quasar, WA (`placement`), SWC (`direction`), PrimeVue (uncertain) | 9–10 | yes | yes |
| Activation mode (automatic vs manual) | RAC (`keyboardActivation`), Radix (`activationMode`), HUI (`manual`), MUI (`selectionFollowsFocus`, default manual), Chakra (`activationMode`), PrimeVue (`selectOnFocus`, default manual), WA (`activation`), SWC (`auto`, default manual); Vuetify and Quasar (uncertain, no prop found) | 8 | yes | **no** |
| Overflow scrolling / scroll buttons | MUI (`variant="scrollable"`, `scrollButtons`), Vuetify (`show-arrows`), PrimeVue (`scrollable`), Quasar (auto arrows), WA (on by default, `without-scroll-controls`), SWC (`enableTabsScroll`) | 6 | yes | unknown (probably CSS only) |
| Lazy / force-mount panels | RAC, Radix, HUI, Chakra, PrimeVue, Vuetify (`eager`) | 6 | yes | n/a |
| Fitted / stretch / full width | MUI (`fullWidth`), Chakra (`fitted`), Vuetify (`grow`, `fixed-tabs`), Quasar (`align="justify"`) | 4 | no | yes (`stretch`) |
| Alignment (start / center / end) | MUI (`centered`), Chakra (`justify`), Vuetify (`align-tabs`), Quasar (`align`) | 4 | no | no |
| Visual variant | Chakra (`variant`), SWC (`quiet`, `emphasized`, `compact`), Vuetify (`stacked`, `inset`, `hide-slider`) | 3 | no | no |
| Size / density | Chakra, Vuetify, Quasar (`dense`), SWC | 4 | no | no |
| Link tabs (`href`) | RAC (`Tab href`), Quasar (`QRouteTab`) | 2 | no | no |
| Closable tabs | none built in (RAC, Chakra, and WA show app-level recipes) | 0 | no | no |
| Focus wrap at the ends | Radix (`loop`, default true), Chakra (`loopFocus`) | 2 | no | presumably built in |
| Deselectable | Chakra | 1 | no | no |

### Gaps

| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| Activation mode | **add** | APG treats this as a real choice: manual is right when a panel is expensive or loads on selection. 8 of 10 libraries expose it. | `activation: "auto" \| "manual" = "auto"` (WA naming; the APG default is automatic). |
| Disabled tab | **add** | Universal. It is also impossible today because `disabled` is not a valid attribute on `<section>`, and Looma may not invent `data-*` markers. | Optional child element `<ui-tab-panel label="…" value="…" disabled>` alongside plain `<section aria-label>`. A disabled tab stays focusable but cannot be selected (APG "focusable when disabled"; RAC and Radix behave the same way). |
| Rich tab label (icon or count) | **add** (with the above) | Count badges on tabs ("Comments 3") are very common, and a generated text-only button cannot carry them. | A `tab` slot inside `<ui-tab-panel>`, for example `<ui-tab-panel value="c"><span slot="tab">Comments <ui-badge>3</ui-badge></span>…</ui-tab-panel>`. Fall back to `label` or `aria-label` as the accessible name. |
| Overflow scroll | **add as behavior, no attribute** | 6 libraries handle overflow, but a scroll-snapping `overflow-inline: auto` tablist covers it natively. Arrow buttons are extra chrome that touch users do not need. | No attribute. The tablist scrolls when it overflows, and the selected tab is scrolled into view on selection. |
| Lazy / force-mount | **skip** | Panels are server markup. For find-in-page, consider `hidden="until-found"` panels plus a `beforematch` handler that selects the matching tab (uncertain: whether that is desirable UX for tabs). | none |
| Alignment, variants, size | skip | These are styling concerns; use tokens and `::part`. | none |
| Link tabs / closable | skip | APG says navigation should be a `nav` of links, not a tablist. No library ships closable tabs. | none |

### Extras

| Looma option | Common? | Verdict |
|---|---|---|
| `stretch` | 4 of 10 | **keep**. Tab buttons are generated and internal, so authors cannot lay them out with their own CSS. A component-owned fill-width switch is the cheapest hook, and it is a frequent mobile need. |
| `label="Tabs"` | APG requires the tablist to be labelled; RAC requires it | **keep, but change the default**. "Tabs" is a useless accessible name. Default to empty, and warn in development when both it and `aria-labelledby` are missing. |

### Function-valued options elsewhere

- MUI `action` (an imperative `updateIndicator()` handle): Looma does not need it because the indicator is CSS.
- RAC render-prop children: replaced by the slot and child markup.
- `onChange` / `onSelectionChange`: replaced by the `select` event.

**Sources**
- https://react-aria.adobe.com/Tabs
- https://www.radix-ui.com/primitives/docs/components/tabs
- https://headlessui.com/react/tabs
- https://mui.com/material-ui/api/tabs/
- https://chakra-ui.com/docs/components/tabs
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/components/VTabs/VTabs.tsx
- https://primevue.dev/tabs/
- https://quasar.dev/vue-components/tabs
- https://webawesome.com/docs/components/tab-group
- https://opensource.adobe.com/spectrum-web-components/components/tabs/
- https://www.w3.org/WAI/ARIA/apg/patterns/tabs/

---

## 3. `ui-tree` + `ui-tree-item`

**Current Looma API:**
- `ui-tree`: `hover-expand-delay=700`, `label="Tree"`, `max-depth=0`, events `reorder` and `reorder-rejected`.
- `ui-tree-item`: `accepts`, `container`, `disabled`, `drag-type="item"`, `drop-depth`, `drop-scope`, `expanded`, `item-id`, `label`, `selected`, `sortable`, `subtree-depth`, event `expand`, slots `leading`, `actions`, and default.

### Equivalents

| Library | Component |
|---|---|
| RAC | `Tree` + `TreeItem` (+ `TreeLoadMoreItem`, `TreeSection`) |
| Radix | none |
| HUI | none |
| MUI | MUI X `SimpleTreeView` / `RichTreeView` (reordering and lazy loading are **Pro**) |
| Chakra | `TreeView` (Ark) |
| Vuetify | `v-treeview` |
| PrimeVue | `Tree` |
| Quasar | `QTree` |
| WA | `wa-tree` + `wa-tree-item` |
| SWC | none (`sp-tree-view` is an open request; Spectrum CSS has treeview styles only) |

That is 7 libraries.

### Capabilities (7 libraries)

| Capability | Libraries | Count | Common? | Looma |
|---|---|---|---|---|
| Expanded state (keys or per item) | all | 7 | yes | yes (`expanded`) |
| Disabled items | RAC, MUI, Chakra, Vuetify, PrimeVue, Quasar, WA | 7 | yes | yes |
| Selection mode (none, single, multiple) | RAC (`selectionMode`), MUI (`multiSelect`, `disableSelection`), Chakra (`selectionMode`), Vuetify (`select-strategy`), PrimeVue (`selectionMode`), Quasar (`selected` + `ticked`), WA (`selection`) | 7 | yes | **partial**: per-item `selected`, but no mode, no `aria-multiselectable`, and no selection event |
| Selection-change event | all | 7 | yes | **no** |
| Lazy / async children | RAC (`hasChildItems`, load more), MUI (Pro `dataSource`), Chakra (`loadChildren`), Vuetify (`load-children`), PrimeVue (`loading` + `@node-expand`), Quasar (`lazy` + `@lazy-load`), WA (`lazy` + `wa-lazy-load`) | 7 | yes | **no** |
| Checkboxes / checked state | MUI (`checkboxSelection`), Chakra (`checkedValue`), Vuetify (`selectable`), PrimeVue (`selectionMode="checkbox"`), Quasar (`tick-strategy`), WA (`selection="multiple"` renders checkboxes) | 6 | yes | no |
| Selection propagation (parent/child tri-state) | MUI (`selectionPropagation`), Vuetify (`select-strategy="classic"`), PrimeVue (checkbox), Quasar (`leaf`), WA (`multiple`), Chakra (uncertain) | 5–6 | yes | no |
| Typeahead | RAC, Chakra (`typeahead`), MUI, APG-recommended; others uncertain | 3+ | built-in behavior, not an option | unknown |
| Expansion trigger (whole row vs chevron only) | MUI (`expansionTrigger`), Chakra (`expandOnClick`), Vuetify (`open-on-click`), Quasar (uncertain) | 3–4 | borderline | no |
| Filter / search | Vuetify (`search`), PrimeVue (`filter`), Quasar (`filter`) | 3 | no | no |
| Drag-and-drop reorder | RAC (`dragAndDropHooks`), MUI (Pro `itemsReordering`), PrimeVue (`draggableNodes`, `droppableNodes`, scopes, `validateDrop`) | 3 | **no** | yes (a Looma strength) |
| Keyboard alternative for drag | RAC (keyboard DnD) | 1 | no | **no** (`reorder` detail says `trigger: 'pointer'`) |
| Expand all by default | Vuetify (`open-all`), Quasar (`default-expand-all`) | 2 | no | no |
| Accordion (one branch open) | Quasar | 1 | no | no |
| Inline label editing | MUI (`isItemEditable`) | 1 | no | no |
| Indent guides | Vuetify (`indent-lines`), Quasar (connectors), WA (CSS vars) | 3 | no | unknown |

### Gaps

| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| Selection mode | **add** | Universal. Without a mode Looma cannot emit a correct `aria-multiselectable`, and it cannot tell a navigation tree (selection means "current") from a file-manager tree (multi-select for bulk actions). | On `ui-tree`: `selection: "none" \| "single" \| "multiple" = "single"`. Uncertain: pick the default that matches today's behavior. `multiple` renders checkboxes and cascades to descendants (WA model). Keep per-item `selected` as the declarative state. |
| Selection event | **add** | Universal. Without it, apps have to observe attributes. | On `ui-tree`: event `select`, detail `{ ids: string[]; trigger }`, consistent with `ui-tabs` `select`. |
| Lazy children | **add** | Universal, and it is the only realistic way to show large file and folder trees. | On `ui-tree-item`: `lazy: boolean = false`. The item shows a chevron with no children, sets `aria-busy` on expand until child `ui-tree-item`s are appended, and the existing `expand` event is the load signal (WA model). No function is needed. |
| Keyboard / single-pointer alternative for reorder | **add** | WCAG 2.2 SC 2.5.7 (Dragging Movements) requires a non-drag alternative, and RAC ships keyboard DnD. This is a compliance gap, not a nice-to-have. | Built-in behavior with no attribute: a "Move" mode on a focused sortable item (for example Ctrl/Cmd+Arrow, or an actions-slot menu with Move up / Move down / Indent / Outdent). It emits the same `reorder` event with `trigger: 'keyboard'`. |
| Separate checkbox attribute | **skip** | Folding it into `selection="multiple"` (WA) avoids a second, overlapping option. | none |
| Propagation modes (leaf, independent, classic) | **skip** | Five-way strategy enums (Vuetify, Quasar) have value only in niche pickers. Wait for a real case. | Later: `selection="leaf"` if needed. |
| Expansion trigger | **skip** | Behavior default instead: a row click expands only when the row is not a link or selectable action; otherwise only the chevron expands. | none |
| Typeahead | **add as behavior, no attribute** | APG-recommended, and it costs nothing to configure. | none |
| Filter, expand-all, accordion, editing | skip | Not common. Apps filter markup themselves, and expand-all is `expanded` on each item. | none |

### Extras (drag-and-drop surface, 3 of 7 libraries)

DnD is not common, but it is Looma's reason for this component, so keep it. Trim the knobs that no library exposes and that have no clear author need.

| Looma option | Closest precedent | Verdict |
|---|---|---|
| `sortable` (item) | MUI `isItemReorderable` (fn), PrimeVue `draggableNodes` | **keep**. It is the declarative form of a predicate. |
| `drag-type`, `accepts` (item) | RAC `acceptedDragTypes` / `getItems` types | **keep**. |
| `drop-scope` (item) | PrimeVue `draggableScope` / `droppableScope` | **keep**. |
| `container` (item) | RAC `hasChildItems`, Quasar `expandable` | **keep**. It marks a branch that accepts "inside" drops even when empty, and it pairs with `lazy`. |
| `max-depth` (tree) | none; MUI `canMoveItemToNewPosition` (fn) is used for this | **keep**. It is the declarative replacement for the most common validation function. |
| `drop-depth`, `subtree-depth` (item, no default) | none | **drop from the author surface if they can be derived from the DOM**. They look like computed or internal state. Uncertain: whether the lazy-loaded subtrees case (children not in the DOM) needs `subtree-depth` supplied by the author. If it does, keep only `subtree-depth` and document it for lazy items. |
| `hover-expand-delay=700` (tree) | none expose it (RAC auto-expands on drag hover internally; uncertain whether that is configurable) | **drop**. Make it a fixed internal constant, and reintroduce it if users ask. |
| `item-id` | RAC `id`, Chakra `value`, Quasar `node-key` | **keep**. Note that `id` is not usable because it must be document-unique; `item-id` is fine. |
| `reorder-rejected` event | PrimeVue `validateDrop` pattern | **keep**. Also make `reorder` cancelable (`preventDefault()` means reject), which is the declarative equivalent of `validateDrop` / `shouldAcceptItemDrop`. |
| `label` (tree) | APG requires a label | keep; same note as tabs about the "Tree" default. |

### Function-valued options elsewhere, with declarative equivalents

| Function option | Library | Looma equivalent |
|---|---|---|
| `loadChildren(item)` | Chakra, Vuetify | `lazy` + `expand` event; the app appends children |
| `dataSource.getTreeItems` / `getChildrenCount` | MUI Pro | same |
| `isItemDisabled`, `isItemSelectionDisabled` | MUI | `disabled` on the item |
| `isItemReorderable` | MUI | `sortable` |
| `canMoveItemToNewPosition` | MUI | `max-depth`, `accepts` / `drag-type`, `drop-scope`, cancelable `reorder` |
| `shouldAcceptItemDrop`, `getDropOperation` | RAC | `accepts` + cancelable `reorder` |
| `validateDrop` + accept callback | PrimeVue | cancelable `reorder`, and `reorder-rejected` |
| `getItemLabel`, `getItemId`, `getItemChildren` | MUI | child markup (`label`, `item-id`, nesting) |
| `isItemEditable` | MUI | skip (or an app-provided input in the default slot) |
| `select-strategy` (fn form) | Vuetify | `selection` keyword |
| `filter-method` / `customFilter` | Quasar, Vuetify | app-owned (filter the markup) |

**Sources**
- https://react-aria.adobe.com/Tree
- https://mui.com/x/api/tree-view/rich-tree-view/
- https://mui.com/x/react-tree-view/rich-tree-view/ordering/
- https://mui.com/x/react-tree-view/rich-tree-view/lazy-loading/
- https://chakra-ui.com/docs/components/tree-view
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/components/VTreeview/VTreeviewChildren.tsx
- https://primevue.dev/tree/
- https://quasar.dev/vue-components/tree
- https://webawesome.com/docs/components/tree
- https://github.com/adobe/spectrum-web-components/labels/missing%20components (no tree)
- https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
- https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html

---

## 4. `ui-top-bar` (app bar / header)

**Current Looma API:** no attributes. Slots `leading`, default (title), `search`, `actions`. The root is `div`.

### Equivalents

| Library | Component |
|---|---|
| MUI | `AppBar` + `Toolbar` |
| Vuetify | `v-app-bar` (+ `v-toolbar`) |
| Quasar | `QHeader` + `QToolbar` |
| PrimeVue | `Toolbar` (a generic start/center/end bar, not app-bar specific; counted as partial) |
| WA | `wa-page` `header` slot (a layout region, partial) |
| SWC | none (`sp-top-nav` is site navigation, not an app bar) |
| RAC | none (`Toolbar` is the APG toolbar pattern) |
| Radix | none |
| HUI | none |
| Chakra | none |

That is 3 full and 2 partial, 5 in total.

### Capabilities (5 libraries)

| Capability | Libraries | Count | Common? | Looma |
|---|---|---|---|---|
| Start / title / end regions | MUI (children), Vuetify (`prepend`, `title`, `append`), Quasar (`QToolbarTitle`), PrimeVue (`start`, `center`, `end`) | 4 | yes | yes (slots) |
| Position: fixed / sticky / static | MUI (`position`), Vuetify (app layout, `absolute`), Quasar (layout `view`), WA (sticky by default, `disable-sticky`) | 4 | yes | **no** |
| Elevation / border | MUI (`elevation=4`), Vuetify (`elevation`, `flat`, `border`), Quasar (`elevated`, `bordered`) | 3 | yes | no |
| Density / height | MUI (`Toolbar variant="dense"`), Vuetify (`density`, `height`), Quasar (`height-hint`) | 3 | yes | no |
| Scroll behavior (hide / reveal / elevate on scroll) | Vuetify (`scroll-behavior`), Quasar (`reveal`); MUI is recipe-only (`useScrollTrigger`) | 2 | no | no |
| Extension row (tabs under the bar) | Vuetify (`extension` slot), WA (`subheader` slot), Quasar (stacked toolbars) | 3 | yes | no |
| Bottom placement | MUI, Vuetify (`location`) | 2 | no | no |
| Color | MUI, Vuetify, Quasar | 3 | yes | no |
| Semantic `<header>` / banner landmark | Quasar (renders `<header>` since 2.25), Vuetify (`tag="header"`), MUI (`<header>`) | 3 | yes | **no** (the root is `div`; the earlier HTML Next example used `<header>`) |

### Gaps

| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| Banner landmark | **add** | This is an accessibility basic, not an option. | Render the root as `<header>`. No attribute. |
| Sticky / fixed position | **skip the attribute** | `ui-top-bar { position: sticky; inset-block-start: 0 }` on the host is native CSS, and a prop would only wrap it. | Document the CSS. |
| Elevate on scroll | **skip the attribute** | CSS scroll-driven animations (`animation-timeline: scroll()`) can raise a shadow with no JS. MUI does not ship it as a prop either. | Document a token-based CSS recipe. |
| Hide / reveal on scroll | skip | Only 2 libraries, and it is a divisive pattern. Add it only if a Looma app needs it. | Later: `reveal: boolean = false`. |
| Elevation, density, color | skip | Styling belongs to tokens and parts. | none |
| Extension row | **skip for now** | Authors can place `ui-tabs` after `ui-top-bar` inside their own sticky wrapper. A slot only helps when the bar owns the stickiness, which it does not. | Revisit with `slot="extension"` if the bar ever owns positioning. |

### Extras

The `search` slot is a Looma-specific region. No library has a dedicated one; it is the equivalent of Vuetify `append` or PrimeVue `center`. **Keep it**, because it supports the mobile collapse-to-icon behavior, which is real value. If the bar does nothing responsive with the slot, fold it into `actions`.

### Function-valued options elsewhere

MUI `useScrollTrigger({ target, threshold })` becomes CSS scroll-driven animation. Vuetify `scroll-target` is a selector string, but it has no Looma need.

**Sources**
- https://mui.com/material-ui/api/app-bar/
- https://mui.com/material-ui/react-app-bar/
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/components/VAppBar/VAppBar.tsx
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/components/VToolbar/VToolbar.tsx
- https://quasar.dev/layout/header-and-footer
- https://primevue.dev/toolbar/
- https://webawesome.com/docs/components/page
- https://opensource.adobe.com/spectrum-web-components/components/top-nav/

---

## 5. `ui-search-shell` (+ `ui-search-result-row`) — command palette / search dialog

**Current Looma API:**
- `ui-search-shell`: `dismissible`, `label="Search"`, `modal`, `open`, event `close`, slots `search`, `status`, `body`, `footer`.
- `ui-search-result-row`: `disabled`, `selected`, slots `leading`, `title`, `meta`, `excerpt`, `trailing`.

Per the component's description, the shell owns overlay layout, while the app owns the query, results, and routing.

### Equivalents

| Library | Component |
|---|---|
| Vuetify | `VCommandPalette` (**labs**, not stable) |
| PrimeVue | `CommandMenu` (+ `Dialog` for the overlay) |
| RAC | no dedicated component. The documented "command palette" example is `Autocomplete` + `SearchField` + `Menu` inside `Modal`. |
| Chakra | none (the v3.26 `Listbox` is positioned as a palette building block) |
| HUI | none (the pattern is `Combobox` inside `Dialog`) |
| Radix | none (third-party `cmdk` builds on Radix Dialog; cited for comparison only, since it is not in the audit list) |
| MUI | none |
| Quasar | none |
| WA | none |
| SWC | none |

That is 2 dedicated components and 1 documented recipe. The capability counts below use Vuetify, PrimeVue, RAC's recipe, and cmdk as a reference.

### Capabilities

| Capability | Where | Common? | Looma |
|---|---|---|---|
| Open / close, modal overlay | Vuetify (dialog props), PrimeVue (Dialog), RAC (Modal), cmdk (`Command.Dialog`) | yes | yes (`open`, `modal`) |
| Inline (non-modal) rendering | cmdk (`Command`), RAC (Autocomplete without Modal), PrimeVue (`CommandMenu` without Dialog) | yes | yes (`modal` false) |
| Arrow-key navigation of results while focus stays in the input (virtual focus, `aria-activedescendant`) | all | yes | **unknown**. Row `selected` suggests the app drives it. |
| Built-in filtering / ranking | Vuetify (`filter-*`), PrimeVue (`filter` fn, `keywords`), RAC (`filter` fn), cmdk (`filter`, `keywords`) | yes | no, by design (app-owned) |
| Groups / section headings | Vuetify (items), PrimeVue (nested model), cmdk (`Group heading`) | yes | via `body` markup |
| Empty state | Vuetify (`no-data-text`), cmdk (`Empty`), RAC (`renderEmptyState`) | yes | via `status` / `body` slots |
| Loading state | cmdk (`Loading`) | no | via the `status` slot |
| Global hotkey to open | Vuetify (`hotkey`); PrimeVue, RAC, and cmdk examples do it in app code | no (1 prop) | no |
| Close on select | Vuetify (`close-on-select`, default true) | no | app-owned |
| Placeholder | Vuetify, cmdk (input passthrough) | n/a | the author's `<input placeholder>` |
| Wrap around at list ends | cmdk (`loop`) | no | unknown |

### Gaps

| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| Keyboard result navigation (input keeps focus; Up/Down move the active `ui-search-result-row`; Enter activates it) | **add as behavior** | This is the defining behavior of every palette and search dialog, and apps re-implementing it is where accessibility breaks. It needs no option. | No attribute. The shell wires the `search`-slot `<input>` to the rows in `body` (combobox + listbox semantics, `aria-activedescendant`) and reflects the active row as `selected`. Uncertain: whether this already exists. |
| Built-in filtering | **skip** | Filtering is function-shaped (scoring) and Looma deliberately leaves it to the app. A `keywords` attribute on rows would only matter for a built-in filter. | none |
| Hotkey | **skip** | Only one library has it as a prop. Global shortcuts collide with app shortcuts and belong to the app. | Later, if wanted: `shortcut: string = ""` (for example `"Mod+K"`). |
| Close on select | skip | The app routes on select, so it can set `open=false`. | none |

### Extras

| Looma option | Verdict |
|---|---|
| `modal` | **keep**. Inline vs overlay is a real split, and the `false` default fits the boolean rule. |
| `dismissible` (default false) | **keep, but narrow the meaning**. Escape must always close a modal dialog (APG dialog pattern; RAC and Radix/cmdk always allow it). This attribute should govern only backdrop-click dismissal, matching RAC's `isDismissable` (default false). Uncertain: whether Escape currently depends on `dismissible`; if it does, fix that. |
| `status` slot | keep. It is the declarative home for cmdk-style `Loading` / `Empty` and should be an `aria-live` region. |
| `footer` slot | keep. It is the usual place for key hints. |
| `ui-search-result-row` slots (`title`, `meta`, `excerpt`) | keep. They are richer than the others (Vuetify has title/subtitle only) and fit site search, which is broader than command palettes. |

### Function-valued options elsewhere, with declarative equivalents

| Function option | Library | Looma equivalent |
|---|---|---|
| `filter(value, search, keywords)` | cmdk, RAC, PrimeVue | app-owned filtering; the app re-renders the rows |
| `onValueChange` / `onSelect` | cmdk | native `input` event on the slotted input; native `click` on the row `<button>` (Enter via virtual focus) |
| `onOpenChange` | cmdk, RAC | `open` attribute + `close` event |
| `container` (portal target element) | cmdk | not needed: top layer (`<dialog>` / popover) replaces portals |

**Sources**
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/labs/VCommandPalette/VCommandPalette.tsx
- https://primevue.dev/commandmenu/
- https://react-aria.adobe.com/Autocomplete
- https://chakra-ui.com/blog/chakra-3.26-listbox-is-here
- https://headlessui.com/react/combobox
- https://github.com/pacocoursey/cmdk (reference only)
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://www.w3.org/WAI/ARIA/apg/patterns/combobox/

---

## 6. `ui-affordance-scope` (proximity-revealed controls)

**Current Looma API:** `near-radius=16` (the older build defaulted to 32) and the default slot.

### Equivalents

None in any audited library (RAC, Radix, HUI, MUI, Chakra, Vuetify, PrimeVue, Quasar, WA, SWC) and no APG pattern. The nearest idiom everywhere is hover or focus-within reveal of row actions (for example RAC `data-hovered` / `data-focus-within` styling, or CSS `:hover` on list rows). That is binary; it has no distance-based "near" stage.

### Capability table

Not applicable, since no peers exist.

### Extras

| Option | Verdict |
|---|---|
| The component itself | **keep**. It is a distinctive Looma interaction model with a coherent spec (`docs/anticipatory-affordances.md`: guide, near, direct, active), and one shared pointer listener per scope is the right architecture. |
| `near-radius` | **keep**. It is geometry that JavaScript consumes, and a number attribute is the right form. Reconcile the 16 vs 32 default between builds. |

### Guardrails (not options)

- **Magic `data-*` marker.** The design doc says participants are marked with `data-ui-affordance`. That conflicts with the no-magic-`data-*` rule. Participation should be a declared attribute on Looma components (`ui-icon-button anticipatory` already exists) or a declared attribute on the scope. Uncertain: whether the current build still reads `data-ui-affordance`.
- **Keyboard and touch.** Controls must not depend on proximity to be discoverable. They should be revealed on `:focus-within` / `:focus-visible`, and fully shown under `@media (hover: none)` or `(pointer: coarse)`.
- **Reflected state.** The container state is reflected as `data-ui-interaction="engaged"`. That is output-only, which is acceptable, but a custom state (`:state(engaged)`) would be the cleaner declarative form.

---

## Summary of recommendations

| Component | Add | Drop / change |
|---|---|---|
| `ui-disclosure` | `name` (exclusive group, like `<details name>`); `summary` slot; `heading-level: number = 0`; `hidden="until-found"` / `<details>` behavior | none |
| `ui-tabs` | `activation: "auto" \| "manual" = "auto"`; optional `<ui-tab-panel label value disabled>` child with a `tab` slot for rich labels; overflow scrolling as behavior | `label`: no "Tabs" default |
| `ui-tree` | `selection: "none" \| "single" \| "multiple"` (multiple renders checkboxes); `select` event; `lazy` on items; keyboard reorder (WCAG 2.5.7); typeahead; cancelable `reorder` | drop `hover-expand-delay`; drop `drop-depth` / `subtree-depth` if derivable from the DOM |
| `ui-top-bar` | render `<header>` | none (document sticky and elevate-on-scroll CSS rather than adding props) |
| `ui-search-shell` | built-in input-to-results keyboard navigation (`aria-activedescendant`) | narrow `dismissible` to backdrop click; Escape always closes |
| `ui-affordance-scope` | nothing | replace the `data-ui-affordance` marker with a declared attribute; ensure focus and coarse-pointer reveal |
