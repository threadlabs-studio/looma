# Looma visual roles

The border, highlight, and shadow on a component should explain what it does. Choose the role
before choosing a colour or strength. These defaults apply in light and dark themes; tone changes
the hue, not the role. A public component hook can override the default for an app.

| Role | Border | Surface and light | Shadow | Use |
| --- | --- | --- | --- | --- |
| Content in the page | None | Page surface | None | Text, labels, layout, plain sections, and unboxed list rows |
| Divider | `--ui-border-divider` | None | None | Tabs baseline, separator, section and disclosure divisions, app chrome seams |
| Dense row hairline | `--ui-border-subtle` | None | None | Repeated table body rows where a full divider would become a grid |
| Enclosed surface | `--ui-border-strong` | Raised or quiet tinted surface | None | Cards, tiles, empty panels, in-flow bordered groups |
| Floating surface | `--ui-overlay-border` falling back to `--ui-border-strong` | Elevated surface | `--ui-overlay-shadow` or the matching elevation token | Menu, popover, tooltip, dialog, toast, search overlay, editor popups |
| Interactive field | `--ui-control-border` | Control surface, shallow `--ui-control-inset` | Inset, not raised | Input, textarea, select, combobox, listbox, checkbox, switch |
| Action | Tone edge for outlined Button; control edge for outlined Icon Button | Small `--ui-raised-highlight` on outline and solid | `--ui-raised`, changing to `--ui-pressed` when pressed | Button and Icon Button; ghost and link stay unboxed |
| Disabled control | `--ui-disabled-border` | `--ui-disabled-surface`; `--ui-disabled-text` | None | All disabled controls, regardless of enabled tone |
| Tone emphasis | Border follows its surface role, with a stronger leading edge if the message needs one | Soft tone surface | Role's normal shadow | Danger Card and Section, Callout, Toast |

`--ui-border-default` is the low-contrast neutral ramp step, used to derive the divider. It is not
a default panel edge. The divider sits between it and `--ui-border-strong`; controls use a stronger
edge because a user must recognize the target. Shadows and highlights should be visible at normal
size and disappear for disabled controls. They must not change the component's shape or spacing.

## Component audit

The families below cover every public component. A component with several variants can occupy
more than one role; for example, Section is plain by default and an enclosed surface as a card.

| Family | Components and treatment |
| --- | --- |
| Layout and plain content | Action Bar, Breadcrumbs and Breadcrumb Item, Cluster, Container, Cover, Description List rows/grid/stacked, Form Field, Grid, List native rows, Page Header, Radio Group, Reel, Scroll Area, Stack, Switcher, Text, Tree: no enclosing border or raised shadow |
| Divided content | Disclosure, Separator, Tabs, Top Bar, Sidebar, Section divided: shared divider; Table header uses it and dense body rows use the subtle hairline |
| Enclosed content | Card, Description List tiles, List cards and List Item cards, Section card, Status Message panel: strong surface border; Avatar and Avatar Group have an edge to separate images; Badge and Callout use their tone edge |
| Fields and choices | Checkbox, Combobox, Editable when editing, Input, Input Group, Listbox, Radio, Select, Switch, Textarea: control edge and shallow inset where a field has a track or well |
| Actions and navigation | Button, Icon Button, Floating Action Button: modest raised treatment when enabled; Menu Item, Nav Item, Search Result Row, Tree Item: selected/hover surface without a permanent enclosing border |
| Floating surfaces | Context Menu, Dialog, Menu, Popover, Search Shell, Toast, Toast Region, Tooltip, Editor Insert Table Grid, Editor Mention Menu, Editor Slash Menu, Editor Table Context Menu, Editor Table Toolbar, floating Editor Toolbar: strong edge and elevation |
| Other editor parts | Editor Mention Menu Item, Editor Slash Menu Group and Item, Editor Table Overlay, docked Editor Toolbar: control edges on interactive cells and dividers between regions, without another floating container around each row |
| Indicators and icons | Affordance Scope, Icon, Meter, Spinner: no generic panel border; Meter has a shallow inset track and highlighted fill |

When adding a component or variant, put it in a family and use that family's tokens. Check the
rendered light and dark examples beside an existing member of the same family, including hover,
pressed, disabled, and focus states where relevant.

## Shared dimensions and selection geometry

Ordinary borders and dividers use `--ui-border-width` (1px). Emphasis edges use
`--ui-accent-line-width`, which aliases that width unless deliberately overridden. Keyboard focus
uses `--ui-focus-width` (2px), with its offset following the same dimension. A thicker emphasis
edge is a theme choice, not a component-specific default.

Selected rows use `--ui-selection-surface`, `--ui-selection-text`, and
`--ui-selection-radius`. Navigation uses regular label weight. A surface treatment has shared
corners and no stripe; Nav Item's explicit line variant has square corners and a continuous
logical-start edge. Forced colors preserve a complete outline for surface selection and the edge
for line selection. Keyboard focus has its own outline.

CSS-drawn glyph strokes, circular radii, lighting shadows, and placement corrections are geometry,
not surface-border roles. Keep those distinctions when extending the source policy test. Component
hooks remain the last, instance-specific level of the token chain.
