# Token surface audit (2026-09-22)

Evidence for the 0.6 theming pass. Measured against `main` at 0.5.2, with Knit as the reference
consumer: one real product, fully themed, 162 `--ui-*` values set.

## What is there now

| | count |
|---|---|
| Global tokens defined in `tokens.css` | 135 |
| Component tokens (read by a component, defined by none) | 192 |
| Component tokens Knit sets in its theme | 36 |
| Component tokens Knit sets on a single component instance | 48 |
| Component tokens Knit never sets | 108 |
| Global tokens Knit sets | 68 |

Knit needs 162 values to theme one product. The target is about 35.

## Findings

### 1. Names that are read but never defined, and don't match their component

These resolve to their fallback in every case, so they are not an API a consumer can find: the name
appears in no stylesheet, and several don't carry their component's prefix.

```
--ui-layout-gap                 cluster, stack      → --ui-cluster-gap / --ui-stack-gap
--ui-field-label-color          combobox            → --ui-combobox-label-text
--ui-field-label-size           combobox            → --ui-combobox-label-font-size
--ui-field-label-weight         combobox            → (cut: use the type scale)
--ui-field-compact-size         combobox            → (cut)
--ui-field-affordance-color     combobox            → --ui-combobox-affordance-text
--ui-field-affordance-weight    combobox            → (cut)
--ui-option-primary-color       combobox            → --ui-combobox-option-text
--ui-option-primary-weight      combobox            → (cut)
--ui-field-message-color        combobox            → --ui-combobox-message-text
--ui-field-message-weight       combobox            → (cut)
--ui-multi-combobox-*           combobox (3)        → --ui-combobox-item-*
--ui-z-overlay                  context-menu        → --ui-context-menu-z-index (or a global z scale)
--ui-editor-table-grid-cols     insert-table-grid   → (cut: the grid is sized by its props)
--ui-editor-table-grid-rows     insert-table-grid   → (cut)
--ui-space-1-5                  3 editor components → (cut: use the space scale)
--ui-space-12                   textarea            → (cut)
--ui-font-family-mono           editor-slash-menu   → define in tokens.css or use the sans stack
--ui-color-focus                sidebar             → --ui-focus-ring
--ui-editor-table-context-swatch, --ui-editor-table-affordance-icon-stroke-width → (cut)
--ui-toast-enter-duration, --ui-toast-exit-duration → --ui-motion-* or one --ui-toast-duration
```

### 2. Tokens that restate a prop

`--ui-icon-button-size-sm` and `-size-lg` (plus their `min-*` twins) mirror the `size` prop. One
`--ui-icon-button-size` is enough: the component resolves `size` into its own default and a
consumer overrides the single token on the element. The same holds for `--ui-editor-toolbar-*`
icon sizing and `--ui-radio-size`, `--ui-checkbox-size`, `--ui-switch-track-width/-height`.

### 3. A component that restates another component

The Floating Action Button's 9 tokens (`-bottom`, `-inline-end`, `-size`, `-z-index`, `-bg`,
`-color`, `-hover-bg`, `-active-scale`, `-icon-size`) describe a round solid Icon Button at a fixed
position. Knit stopped using the component in 0.3 and positions an `IconButton` itself, themed with
`--ui-icon-button-*`. Cut the component's token family; keep the component only if it earns its
place as a layout primitive.

### 4. Colour tokens that don't end in a semantic token

Solid `Button` reads `--ui-action-primary-surface`; solid `IconButton` reads
`--ui-icon-button-solid-bg` with no fallback to it. So Knit sets both. Every component colour token
should end its fallback chain in a semantic token, and then most of them never need to be set.

### 5. Two vocabularies

`surface`/`text` (Button, Badge, Search Shell) against `bg`/`color` (Icon Button, FAB, Top Bar):
8 vs 13 and 8 vs 14 tokens. State position varies too (`-hover-bg` against `-ghost-hover` against
`-surface-hover`). One pattern, `--ui-<component>[-<variant>][-<state>]-<property>`, is lint-able.

### 6. Where Knit had to hijack a global

To compact menus, Knit sets `--ui-space-2`, `--ui-font-size-md`, `--ui-font-medium`,
`--ui-radius-2` and `--ui-surface-subtle` on `[role="menu"]`. That silently rescales anything
nested in a menu. This is the clearest missing-API signal: Menu Item (and Tabs, Disclosure, Tree)
need density, best expressed as a `density="compact"` prop.

## Proposed target

- **Semantic layer (~35 values):** palette (accent, danger, success, warning, info, surfaces, text,
  border), type scale, space scale, radius scale, elevation, motion, and the action/control pairs.
  A theme sets these and nothing else.
- **Component tokens:** only for geometry a semantic token can't express (`--ui-sidebar-width`,
  `--ui-tree-indent`, `--ui-search-shell-max-width`), each with a semantic fallback.
- **Props for discrete choices:** size, density, tone, variant, align, stretch.

Knit's own usage predicts the result: of the 84 component tokens it sets today, the ones that
survive are the geometry ones. The rest disappear behind semantics and props.

## Appendix: component tokens by component

`*` marks a token Knit sets somewhere.

- **avatar** — avatar-border avatar-surface avatar-text
- **avatar-group** — avatar-group-overlap-shadow
- **badge** — badge-padding-block* badge-padding-inline badge-border* badge-surface* badge-text* badge-font-size* badge-font-weight badge-line-height
- **button** — button-min-block-size* button-border* button-radius* button-surface* button-text* button-shadow* button-solid-shadow button-danger-shadow button-ghost-text button-ghost-hover button-ghost-active button-disabled-opacity* button-disabled-border* button-disabled-surface* button-disabled-text* button-link-color button-link-hover-color
- **callout** — callout-icon-column callout-gap callout-padding-block callout-padding-inline callout-border-width callout-border* callout-leading-border-width callout-surface* callout-text* callout-icon* callout-icon-size
- **checkbox** — checkbox-gap checkbox-size
- **cluster** — layout-gap
- **combobox** — field-label-color field-label-size field-label-weight field-compact-size field-affordance-color field-affordance-weight combobox-max-block-size option-primary-color option-primary-weight field-message-color field-message-weight multi-combobox-min-block-size* multi-combobox-input-min-inline-size* multi-combobox-item-max-inline-size
- **container** — container-measure container-gutters
- **context-menu** — z-overlay
- **dialog** — dialog-viewport-gap dialog-max-width* dialog-duration
- **editor-insert-table-grid** — editor-table-grid-cols editor-table-grid-rows
- **editor-mention-menu** — space-1-5
- **editor-slash-menu** — font-family-mono* editor-toolbar-icon-stroke-width
- **editor-table-context-menu** — space-1-5 editor-toolbar-icon-stroke-width editor-table-context-swatch
- **editor-table-overlay** — editor-table-affordance-icon-stroke-width icon-button-hover-bg* icon-button-hover-color*
- **editor-table-toolbar** — space-1-5 editor-toolbar-icon-size editor-toolbar-icon-stroke-width editor-table-toolbar-swatch
- **editor-toolbar** — editor-toolbar-z-index* editor-toolbar-gap* editor-toolbar-padding-block* editor-toolbar-padding-inline* editor-toolbar-min-height editor-toolbar-bg* editor-toolbar-border* editor-toolbar-divider* editor-toolbar-divider-margin* editor-toolbar-floating-padding editor-toolbar-floating-radius* editor-toolbar-floating-shadow editor-toolbar-mobile-min-height editor-toolbar-mobile-shadow*
- **floating-action-button** — floating-action-button-bottom floating-action-button-inline-end floating-action-button-size floating-action-button-z-index floating-action-button-bg floating-action-button-color floating-action-button-hover-bg floating-action-button-active-scale floating-action-button-icon-size
- **form-field** — form-field-help-min-block-size
- **grid** — grid-gap grid-min
- **icon** — icon-size icon-stroke-width
- **icon-button** — icon-button-size* icon-button-radius* icon-button-bg* icon-button-size-sm* icon-button-size-lg* icon-button-border* icon-button-outline-bg* icon-button-outline-color* icon-button-solid-bg* icon-button-solid-color* icon-button-hover-bg* icon-button-hover-color* icon-button-hover-border* icon-button-solid-hover-bg* icon-button-active-scale icon-button-disabled-opacity* icon-button-disabled-color* icon-button-disabled-border* icon-button-disabled-bg* icon-button-icon-size* icon-button-icon-stroke-width
- **input** — input-radius input-shadow control-placeholder input-focus-shadow
- **menu** — menu-viewport-gap
- **popover** — popover-viewport-gap
- **radio** — radio-gap radio-size
- **reel** — reel-gap reel-item-width
- **search-result-row** — search-result-row-min-height* search-result-row-padding-block* search-result-row-padding-inline* search-result-row-gap* search-result-row-bg search-result-row-border* search-result-row-hover-bg*
- **search-shell** — search-shell-z-index* search-shell-padding-top* search-shell-viewport-gap* search-shell-max-width* search-shell-max-height* search-shell-bg* search-shell-border* search-shell-radius* search-shell-shadow* search-shell-focus-color*
- **select** — select-radius select-shadow select-focus-shadow
- **separator** — separator-color
- **sidebar** — sidebar-width* sidebar-surface* sidebar-border* color-focus sidebar-backdrop
- **stack** — layout-gap
- **switch** — switch-gap switch-track-width switch-track-height
- **switcher** — switcher-gap switcher-threshold*
- **textarea** — space-12 textarea-radius textarea-shadow control-placeholder textarea-focus-shadow
- **toast-region** — toast-enter-duration toast-exit-duration
- **tooltip** — tooltip-border tooltip-max-inline-size tooltip-radius tooltip-surface tooltip-text tooltip-shadow tooltip-inverse-surface tooltip-inverse-text tooltip-arrow-size
- **top-bar** — top-bar-z-index* top-bar-height* top-bar-gap* top-bar-padding-inline* top-bar-bg* top-bar-border* top-bar-actions-gap*
- **tree** — tree-gutter
- **tree-item** — tree-item-depth tree-indent* tree-row-min-height* tree-font-size tree-drop-color* tree-label-padding-block* tree-label-padding-inline*
