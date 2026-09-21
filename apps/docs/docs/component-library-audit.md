# Component Option Audit

Last updated: 2026-09-21 (Looma 0.3)

Looma compared the configuration options of each baseline component against the equivalent components in other UI libraries. This page records the decisions. Looma 0.3 publishes the decisions; most additions ship after 0.3.

## Method

- **Libraries:** React Aria Components, Radix, Headless UI, Material UI, Chakra UI v3 / Ark, Vuetify 3, PrimeVue 4, Quasar 2, Web Awesome (Shoelace's successor) and Spectrum Web Components. Layout adds Every Layout and Mantine. The editor is compared with Tiptap, BlockNote, Plate, Lexical and Novel. The WAI-ARIA Authoring Practices are the behaviour reference. Only official docs and official source repositories were used.
- **Common** means that most of the libraries with an equivalent component offer the option. Being common only makes an option a candidate; Looma adds it only if it has real value.
- **Looma's rules:**
  - Props are HTML attributes, and every value has a text form.
  - Function-valued options become attributes, child markup, slots or events.
  - Booleans default to `false`.
  - Authors never have to write `data-*` attributes.
- **Uncommon options** that Looma already had were kept only where they have real value. The others are listed under "Declined" or "Drop".

The per-family evidence, with counts and sources, is in the repository: [layout](https://github.com/threadlabs-studio/looma/blob/main/docs/audits/layout.md), [form controls](https://github.com/threadlabs-studio/looma/blob/main/docs/audits/form-controls.md), [combobox](https://github.com/threadlabs-studio/looma/blob/main/docs/audits/combobox.md), [actions and display](https://github.com/threadlabs-studio/looma/blob/main/docs/audits/actions-display.md), [overlays](https://github.com/threadlabs-studio/looma/blob/main/docs/audits/overlays.md), [navigation and collections](https://github.com/threadlabs-studio/looma/blob/main/docs/audits/navigation-collections.md) and [editor](https://github.com/threadlabs-studio/looma/blob/main/docs/audits/editor.md). Where this page and the evidence disagree, this page wins.

## Changed in 0.3

- **Consumer attributes land on the native root.** `class`, `id`, `type`, `name`, `form`, `aria-pressed` and other native attributes written on `ui-button`, `ui-icon-button`, `ui-input`, `ui-textarea`, `ui-select` and `ui-dialog` reach the native element. The audit's conditional `type`, `name`, `value`, `form` and `pressed` props are therefore not needed.
- **Structured values are attributes.** Props with `list`, `record` or `object` types are declared with HTML Next's type system; in HTML their attribute text is JSON, parsed against the declared shape. This covers editor menu `items` and `anchor-rect`, table `geometry`, table menu `actions` (which replace the nine undeclared `can-*` booleans) and combobox `items`.
- **Combobox** drops function hooks, option descriptions and option metadata. `value` (single) and `items` (multiple) are separate props.
- **Cluster** always wraps and has no `wrap` or `justify` props.
- **Tabs** gain `stretch`, and the tab list scrolls when it overflows.
- **Tree Item** `expand` no longer bubbles. It fires only on the item that was toggled. Expanding or collapsing never changes an ancestor or sibling.
- **Dialog** has a header with a title and a close button, a scrolling body, and an `actions` footer.
- **Toast Region** gains `auto` and `duration`, and pauses its timers on hover and focus.
- **Tooltip** gains `inverse` for a dark surface.
- **Editable** gains `hint` and `actions`, and keeps the same size while editing.

## Bugs found

Fix these first. They are defects, not new options.

| Component | Defect |
|---|---|
| Checkbox, Switch | No `name`, so they never submit with a form. |
| Radio Group | Arrow keys work on one axis only. The APG and native radios use all four. |
| Dialog | Escape closes the dialog only when `dismissible` is set. Escape must always close a modal dialog. |
| Search Shell | Verify that Escape does not depend on `dismissible`. |
| Popover, Tooltip, Menu | `placement` ignores `left`, `right` and centred values. |
| Tree | Reordering has no keyboard or single-pointer alternative (WCAG 2.2 SC 2.5.7). |
| Form Field | The `error` slot is announced as a description even while the field is valid. |
| Editable | An empty value renders an invisible click target with no accessible text. |
| Editor Toolbar | Toggle buttons expose their state only through `data-active`, not `aria-pressed`. |
| Insert Table Grid | `header-row` is ignored, and the header checkbox always starts checked. |
| Slash Menu, Mention Menu | They overwrite an author's `aria-label`, and their header and hint text is hard-coded English. |
| Separator | Verify that a slotted label is exposed to assistive technology. The `separator` role hides its children. |
| Toast Region, Affordance Scope | Authors still write `data-*` markers. Toast Region's stories use `data-ui-toast` and `data-ui-toast-dismiss`. Affordance Scope's controller finds participants other than Looma controls through `[data-ui-affordance]`. Replace both with declared attributes or elements. |

## Layout

| Component | Adopt | Declined |
|---|---|---|
| `ui-stack` | none | Direction switch (that is a Cluster or Switcher), divider prop (write `<ui-separator>`), `split-after` (author CSS) |
| `ui-cluster` | none | `justify`: spreading items apart is not a cluster, and a justified row would be a separate flex primitive. Non-wrapping mode, separate row and column gaps, `grow` |
| `ui-grid` | `columns: number`, a maximum column count that keeps the grid intrinsic | Breakpoint columns, spans and offsets (they belong to the 12-column paradigm) |
| `ui-center` | Rename to `ui-container`. The component holds content in a centred column with a maximum width, such as settings, activity and legal pages. `center` suggests centring on both axes, and `Container` is what most libraries call this. Make the `measure` steps cover the column widths apps use | `fluid` (just don't use the wrapper), `center-content` (no use case yet) |
| `ui-switcher` | `limit: number`, the most items allowed in the horizontal state | none |
| `ui-sidebar` | The sidebar panel only; the main content is not part of it. Props: `collapsed`, `side`, `width`, `min-width`, `max-width`, `resizable`, `resize-step`, `resize-label` and `breakpoint`. Below the breakpoint it becomes an off-canvas drawer. Events `resize` and `toggle`. Later: `persist`. The page's own layout places the sidebar next to the main content | The current two-pane layout (side plus main), including under another name. A small item with trailing content is a Cluster. Also declined: rail or mini mode, expand on hover, swipe gestures, keyboard shortcut, snapping |
| `ui-reel` | none | Arrow controls (build a carousel instead), hidden scrollbar, `height` |

## Form controls

| Component | Adopt | Declined |
|---|---|---|
| `ui-input` | `size: "sm" \| "md"`. New `ui-input-group` with `start` and `end` slots for icons, units and buttons | Variant, built-in label, hint or error (Form Field owns these), clearable, counter, mask, debounce |
| `ui-textarea` | `autosize` (`field-sizing: content`, with `rows` as the minimum) | Size, variant, counter, resize prop (CSS) |
| `ui-select` | `size: "sm" \| "md"`. With `multiple`, the selection is `values: list(string)`, the selected option values (written in HTML as `values='["red","blue"]'`); `value` stays a single string. The options stay `<option>` children | Placeholder prop (use a disabled first `<option>`), clearable, variant |
| `ui-checkbox` | `name` (bug), `invalid` | Size (a token), checkbox group (use `<fieldset>`), readonly, label placement |
| `ui-radio-group` | `invalid`. `change` detail becomes `{ value, previousValue, trigger }`. Drop the duplicate `select` event. `label` defaults to `""`. `orientation` defaults to `vertical` | Size, hint, readonly |
| `ui-switch` | `name` (bug) | Size (tokens), on/off track labels, readonly, invalid |
| `ui-form-field` | Show and describe the `error` slot only while the field is invalid. Fall back to the control's native `validationMessage`. Add a CSS required marker | Keyed per-validity messages (for now), orientation |
| `ui-editable` | `save-label`, `cancel-label`, `placeholder`, `required` and `maxlength` (invalid text does not commit). `label` defaults to `""` | Multiline (for now), arbitrary edit content, activation and submit modes |
| `ui-combobox` | `loading` with an `empty` slot, `filter: "contains" \| "none"` (`none` for server-side filtering), `open-on-focus`, `invalid` | Function hooks, option descriptions, debounce, minimum characters, virtualization, custom match functions |

Validation stays declarative everywhere. Validation functions are replaced by native constraint attributes, `setCustomValidity()`, the `invalid` prop and Form Field's error slot.

## Actions and display

| Component | Adopt | Declined |
|---|---|---|
| `ui-button` | `pending`: keeps focus and the label, sets `aria-disabled` and shows a spinner | `type`, `name`, `value` and `form` (native attributes already reach the button), a separate tone axis, icon slots. Deferred: rendering as a link |
| `ui-icon-button` | `pending` | `pressed` (write native `aria-pressed`), tone |
| `ui-badge` | `outline` variant | Size (badges follow the font size), icon, pill, anchored count badge (a separate component if ever needed) |
| `ui-callout` | Rename tone `note` to `neutral` to match Badge | Icon slot (a per-tone icon is built in), variant, size, `dismissible` (a candidate if banners need it), live region (write native `role`) |
| `ui-avatar` | `size`, `shape: "circle" \| "square"`, a built-in person glyph when there is no image or name, `decorative` | Status event, lazy loading, background colour |
| `ui-avatar-group` | `total` (the true count when the markup is truncated), `overflow-label` (template text with `{count}`), `size` (together with Avatar) | Spacing (a token) |
| `ui-separator` | none (see the label bug) | Thickness, colour, `decorative` |

## Overlays

| Component | Adopt | Declined |
|---|---|---|
| `ui-dialog` | `closedby: "any" \| "closerequest" \| "none"` (native vocabulary) replaces `dismissible`. `modeless` replaces `modal`, so modal is the default. `alert` (`role="alertdialog"`, no close button). `size: "sm" \| "md" \| "lg"`. An `open` event | A fullscreen presentation, initial or return focus props (native `autofocus` and `<dialog>` already do this), description, draggable |
| `ui-popover` | The full `placement` set as a typed keyword. A `--ui-popover-offset` token | Arrow, modal or focus trap (use Dialog), dismiss toggles |
| `ui-tooltip` | The full `placement` set, defaulting to `top`. Instant display for the next tooltip after one has shown | `disabled`, trigger modes, arrow toggle. The evidence suggested dropping `inverse`; Looma keeps it for dark tooltips |
| `ui-menu`, `ui-menu-item` | `<hr>` separators. `ui-menu-group` with a `label`. Typeahead and Home/End. `href` link items. A `shortcut` slot. `type: "action" \| "checkbox" \| "radio"` with `checked`. Later: submenus | A close-on-select option, an icon slot, a destructive tone |
| `ui-context-menu` | Everything Menu gains. Long-press opens it on touch | `disabled`, `global`, `modal` |
| `ui-toast-region` | A declarative `<ui-toast>` child with `tone`, `duration` and an `action` slot. `placement` on the region. Drop `message` and `open` | Merging `auto` into `duration` (Looma keeps the `auto` switch), maximum visible, swipe, promise toasts, hotkey |

## Navigation and collections

| Component | Adopt | Declined |
|---|---|---|
| `ui-disclosure` | `name` for exclusive groups (like `<details name>`), a `summary` slot, `heading-level`, closed content that find-in-page can reveal | An accordion wrapper, lazy mounting, variants |
| `ui-tabs` | `activation: "auto" \| "manual"`. An optional `ui-tab-panel` child with `disabled` and a `tab` slot for rich labels. `label` defaults to `""` | Lazy panels, link tabs, closable tabs, variants |
| `ui-tree`, `ui-tree-item` | `selection: "none" \| "single" \| "multiple"`, a `select` event, `lazy` items, keyboard reordering (bug), typeahead, a cancelable `reorder`. Drop `hover-expand-delay`. Drop `drop-depth` and `subtree-depth` if they can be derived | Propagation modes, filtering, expand-all, a separate checkbox option |
| `ui-top-bar` | Render a `<header>` | Sticky and elevate-on-scroll props (documented CSS recipes instead), hide on scroll |
| `ui-search-shell` | Built-in keyboard navigation from the input to the result rows. `dismissible` governs backdrop clicks only | Built-in filtering, hotkey |
| `ui-affordance-scope` | Reveal on focus and on coarse pointers | none |

## Editor

| Component | Adopt | Declined |
|---|---|---|
| `ui-editor-toolbar` | Declare `floating`. Roving focus between controls. `aria-pressed` on toggles (bug). Use `ui-separator` for groups | Automatic overflow, `label` |
| `ui-editor-slash-menu` | Child item markup with `keywords`, groups, filtering inside the component, an `empty` slot, a `footer` slot for key hints | `placement`, loading, shortcut badges |
| `ui-editor-mention-menu` | Child item markup with an avatar `start` slot, an `empty` slot, a `header` slot | Grouping, filtering inside the component |
| `ui-editor-insert-table-grid` | Honour `header-row` (bug). Keyboard grid navigation. A click inserts immediately | A separate insert button (unless touch testing needs it) |
| `ui-editor-table-toolbar`, `ui-editor-table-context-menu` | Header row and column toggles. `scope: "cell" \| "row" \| "column"` on the context menu. Move row and move column actions. Theme tokens for cell backgrounds. The toolbar stops duplicating the context menu | Vertical alignment, borders, text colour, sort, duplicate, freeze, striping |
| `ui-editor-table-overlay` | Row and column handles open a scoped menu | Drag-to-reorder (deferred; the move actions come first), a selection overlay |

## Earlier audit

The March 2026 family-level audit, which decided which component families Looma owns, is in [docs/component-library-audit.md](https://github.com/threadlabs-studio/looma/blob/main/docs/component-library-audit.md).
