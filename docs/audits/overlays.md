# Looma overlays audit: dialog, popover, tooltip, menu, context menu, toast

> **Evidence, not decisions.** These are the research notes behind the 0.3 option audit. They describe the API *before* 0.3, and some verdicts were overruled or already resolved. The binding decisions are in the [Component option audit](../../apps/docs/docs/component-library-audit.md).

Date: 2026-09-21. Scope: `ui-dialog`, `ui-popover`, `ui-tooltip`, `ui-menu` + `ui-menu-item`, `ui-context-menu`, `ui-toast-region`.

Looma baseline: the declared API before 0.3, checked against the component source in
`packages/core/src/declarative/components/*.html` and `controllers/*.js`.

Behavior found in the source that the JSON does not show:

- **Anchored surfaces (`shared/overlay.js`).** CSS anchor positioning with `position-try-fallbacks: flip-block, flip-inline` and a JS fallback that clamps to the viewport. Only `top|bottom` × `start|end` placement is honored: the code checks `startsWith("top")` / `endsWith("end")`, so `left`, `right` and centered alignment are **not implemented**. The gap is a fixed 4px.
- **`ui-dialog`.** Uses a native `<dialog>` (`show()` / `showModal()`). The close X in the header is always rendered. `dismissible=false` blocks **Escape** and outside-press. There is no `open` event.
- **`ui-menu`.** Handles ArrowUp/ArrowDown, Enter/Space and Escape. There is **no Home/End, no typeahead, no wrapping**, and no separators, groups, checkable items or submenus.
- **`ui-toast-region`.** The imperative `show(message, {tone, duration, auto, id})` exists. The declarative path is the invoker command `--show-toast`, and it takes its text from the source button's `value`, falling back to the `message` attr. Only `tone="danger"` is meaningful (it maps to `role=alert`). Timers pause on hover and focus. The README still documents the magic `data-ui-toast` / `data-ui-toast-dismiss` attributes, which violates the no-magic-data-* rule.

Libraries surveyed (10) plus APG as the normative reference:

- React Aria Components (RAC)
- Radix Primitives/Themes
- Headless UI (HUI)
- MUI
- Chakra v3 (Ark/Zag)
- Vuetify 3
- PrimeVue 4
- Quasar 2
- Shoelace / Web Awesome (WA)
- Spectrum Web Components (SWC)

Counts are approximate and come from official docs plus working knowledge of the APIs. Where a fact could not be confirmed on an official page during this audit it is marked **(uncertain)**. A capability is "common" when a majority of the libraries that ship the component have it.

---

## 1. `ui-dialog`

### Equivalents

| Library | Component |
|---|---|
| RAC | `Modal`/`ModalOverlay` + `Dialog` + `DialogTrigger` |
| Radix | `Dialog`, `AlertDialog` (Themes: `Dialog` with `size`, `maxWidth`) |
| HUI | `Dialog`, `DialogPanel`, `DialogTitle`, `Description` (v1) |
| MUI | `Dialog` + `DialogTitle`/`DialogContent`/`DialogActions` |
| Chakra | `Dialog` (parts: Trigger, Content, Header, Title, Description, Body, Footer, CloseTrigger) |
| Vuetify | `v-dialog` (+ `v-card`) |
| PrimeVue | `Dialog`, `ConfirmDialog` |
| Quasar | `q-dialog` (+ Dialog plugin) |
| WA | `wa-dialog` (Shoelace `sl-dialog`) |
| SWC | `sp-dialog`, `sp-dialog-wrapper`, `sp-alert-dialog` |

### Capabilities (10 libs)

| Capability | Count | Common? | Looma |
|---|---|---|---|
| open / defaultOpen | 10 | yes | `open` |
| Modal by default | ~9 (non-modal toggle only in Radix `modal`, PrimeVue `modal`, Quasar `seamless`, Chakra `modal`) | yes | **modal=false default** |
| Escape closes by default | 10 | yes (APG: required) | **only if `dismissible`** |
| Option to disable Escape | ~9 (RAC `isKeyboardDismissDisabled`, MUI `disableEscapeKeyDown`, Chakra `closeOnEscape`, PrimeVue `closeOnEscape`, Vuetify/Quasar `persistent`, Radix/WA via preventDefault) | yes | coupled into `dismissible` |
| Outside-click closes (toggleable) | 10 (on by default in Radix, HUI, MUI, Chakra, Vuetify, Quasar; opt-in in RAC `isDismissable`, PrimeVue `dismissableMask`, WA `light-dismiss`, SWC `dismissable` (uncertain)) | yes | coupled into `dismissible` |
| Title part/prop | 9 | yes | `label` |
| Description part (aria-describedby) | 5 (Radix, HUI, Chakra, MUI `DialogContentText`, RAC via aria) | borderline | none |
| Built-in close X | 3 built in (PrimeVue `closable`, WA, SWC `dismissable`) + 3 as parts (Radix Close, Chakra CloseTrigger, RAC `slot="close"`) | yes (as capability) | always on |
| Hide close X | PrimeVue `closable`, WA `without-header`, SWC | minority | none |
| Footer/actions area | 7 | yes | `actions` slot |
| Size / max width / fullscreen | 7 (MUI `maxWidth`/`fullScreen`, Chakra `size` incl. `full`, Vuetify `fullscreen`/`width`, PrimeVue `maximizable`/`breakpoints`, Quasar `maximized`/`full-width`, SWC `size`/`mode="fullscreen"`, Radix Themes `size`) | yes | CSS var `--ui-dialog-max-width` only |
| Position (top/bottom/side) | 3 (Chakra `placement`, PrimeVue `position`, Quasar `position`) | no | none |
| Scroll inside vs outside | 3 (MUI `scroll`, Chakra `scrollBehavior`, Vuetify `scrollable`) | no | body scrolls (fixed) |
| Initial focus control | ~8 (mostly through `autoFocus` on a child: RAC, HUI, WA `autofocus`; Radix `onOpenAutoFocus`; Chakra `initialFocusEl`) | yes | first focusable (native `autofocus` honored by `<dialog>`) |
| Return focus to trigger | ~9 (behavior; opt-outs: MUI `disableRestoreFocus`, Quasar `no-refocus`) | yes | native `<dialog>` restores focus |
| Alert dialog role | ~6 (RAC `role`, Radix `AlertDialog`, Chakra `role`, SWC `sp-alert-dialog`, PrimeVue `ConfirmDialog`, HUI `role` (uncertain)) | yes | none |
| Declarative trigger association | 6 (RAC, Radix, Chakra, Vuetify `activator`, WA `data-dialog`, SWC `overlay-trigger`) | yes | `for` |
| Cancelable close request | 5 (WA `wa-hide` preventDefault, Radix, RAC/MUI/HUI via controlled state) | borderline | none |
| Draggable / resizable | 1–2 (PrimeVue `draggable`) | no | none |
| open event / onOpenChange | 10 | yes | **only `close`** |

### Gaps

| Gap | Verdict | Reason | Proposed API |
|---|---|---|---|
| Escape must close by default (APG); separate outside-click from Escape | **add** | Today `dismissible=false` stops Escape from closing the dialog. That breaks the APG contract and differs from every surveyed library, and outside-click and Escape really are separate choices. | `closedby: "any" \| "closerequest" \| "none" = "closerequest"`. It mirrors the native HTML `<dialog closedby>` keyword (Chrome 134+, Firefox 141+, Safari support **uncertain**) and replaces `dismissible`. `any` = Escape + outside, `closerequest` = Escape/back gesture only, `none` = actions only. |
| Modal as the default | **add (rename)** | About 9/10 libraries and the APG "dialog (modal)" pattern treat modal as the default, but Looma's false-default boolean forces authors to opt into the common, accessible case. | Replace `modal` with `modeless: boolean = false`. |
| Alert dialog | **add** | Destructive confirmations need `role=alertdialog`, no X and no light dismiss (APG alertdialog). This is common and can't be expressed with today's attributes. | `alert: boolean = false` sets `role="alertdialog"`, hides the header X and forces `closedby` to at most `closerequest`. |
| Size / fullscreen | **add** | 7/10 libraries have it. The mobile fullscreen and wide-content cases are real, and a keyword is easier to discover and constrain than a raw CSS var. | `size: "sm" \| "md" \| "lg" \| "fullscreen" = "md"`. Keep `--ui-dialog-max-width` as the escape hatch. |
| `open` event | **add** | Every library exposes open state changes, and the other Looma overlays already emit `open`. | Event `open` `{open:true, reason, trigger}`. |
| Initial focus | skip | The native `autofocus` attribute on a child already works with `<dialog>`, so just document it. | Author writes `<input autofocus>`. |
| Return focus | skip | Native `<dialog>` restores focus on close. | — |
| Description | skip | Borderline common, and authors can reference body text themselves; add it only if audits show missing descriptions. | — |
| Cancelable close | skip | `closedby="none"` plus a controlled `open` covers the unsaved-changes guard. | — |
| Position / scroll mode / draggable | skip | Not common and no concrete need. | — |

### Looma extras

- **`for`: keep, but also honor native invokers.** Trigger association is common (6/10). The root is a native `<dialog>`, so `commandfor` + `command="show-modal" | "close" | "request-close"` already work without Looma. Recommend documenting the invokers as the primary path. Keep `for` only for the ARIA wiring it adds (`aria-haspopup=dialog`, `aria-controls`). Consider dropping `for` once invoker commands are Baseline (uncertain timing).
- **`dismissible`: drop**, replaced by `closedby`.
- **Always-on header X: keep**, with `alert` as the only way to suppress it. Timed and modal content should always have a visible exit.

---

## 2. `ui-popover`

### Equivalents

| Library | Component |
|---|---|
| RAC | `Popover` + `DialogTrigger` |
| Radix | `Popover` |
| HUI | `Popover` / `PopoverButton` / `PopoverPanel` |
| MUI | `Popover` (and `Popper`) |
| Chakra | `Popover` |
| Vuetify | `v-menu` (general-purpose activator overlay; there is no separate popover) |
| PrimeVue | `Popover` (formerly OverlayPanel) |
| Quasar | `q-menu` |
| WA | `wa-popover` (Shoelace `sl-popup` is lower-level) |
| SWC | `sp-popover` + `overlay-trigger` |

### Capabilities (10 libs)

| Capability | Count | Common? | Looma |
|---|---|---|---|
| open / defaultOpen | 10 | yes | `open` |
| 12-way placement (side + align) | 9 (PrimeVue auto only, uncertain) | yes | **string; only top/bottom-start/end work** |
| Offset along the main axis | 9 (RAC `offset`, Radix `sideOffset`, HUI `anchor.gap`, Chakra `gutter`, Vuetify/Quasar/SWC `offset`, WA `distance`, MUI via Popper) | yes | fixed 4px |
| Cross-axis offset | 6 (RAC `crossOffset`, Radix `alignOffset`, HUI `anchor.offset`, WA `skidding`, Quasar, Chakra) | yes | none |
| Collision flip / shift | 10 (automatic; toggles in RAC `shouldFlip`, Radix `avoidCollisions`, Chakra `flip`) | yes | automatic |
| Arrow | 6 (RAC, Radix, Chakra, PrimeVue, WA, SWC `tip`) | yes | none |
| Escape / outside dismiss | 10 (toggles in ~6) | yes | always |
| Modal / focus trap option | ~4 (Radix `modal`, Chakra `modal`, RAC `isNonModal`, HUI `focus`) | no | none |
| Initial focus control | ~5 | borderline | native `autofocus` works in popovers |
| Match trigger width | ~4 (Chakra `sameWidth`, Quasar `fit`, HUI CSS var, Vuetify) | no | none |
| Hover to open | 2 (Vuetify `open-on-hover`, Quasar) | no | none |
| Title / close parts | 3 (Radix Close, Chakra Title/CloseTrigger, HUI) | no | none |
| Trigger association | 10 | yes | `for` |

### Gaps

| Gap | Verdict | Reason | Proposed API |
|---|---|---|---|
| Full placement set, typed | **add** | `left`, `right` and centered alignment are common (9/10) and currently silently fail. A keyword union also gives validation. | `placement: "top" \| "top-start" \| "top-end" \| "bottom" \| "bottom-start" \| "bottom-end" \| "left" \| "left-start" \| "left-end" \| "right" \| "right-start" \| "right-end" = "bottom-start"` (logical-inline aliases optional). Map it onto `position-area` / `position-try-fallbacks`. |
| Offset / cross-offset | skip as attributes | This is a design-token decision, not a per-instance one. | Expose `--ui-popover-offset` (CSS) instead of the hard-coded 4px. |
| Arrow | skip | Common, but purely decorative for interactive popovers; the tooltip already has one. | — |
| Modal / focus trap | skip | Not common. Use `ui-dialog` when trapping is needed. | — |
| Initial focus | skip | Native `autofocus` inside a `popover` is honored. | — |
| Dismiss toggles | skip | Native `popover=auto` light dismiss is the right default. If a persistent panel is needed later, mirror native `popover="manual"`. | — |

### Looma extras

- None. `for` is common. Keep it: it adds anchoring and `aria-expanded`, and native `popovertarget` / implicit anchors are not yet universal.

---

## 3. `ui-tooltip`

### Equivalents

| Library | Component |
|---|---|
| RAC | `TooltipTrigger` + `Tooltip` (+ `OverlayArrow`) |
| Radix | `Tooltip` (+ `Tooltip.Provider`) |
| HUI | none |
| MUI | `Tooltip` |
| Chakra | `Tooltip` |
| Vuetify | `v-tooltip` |
| PrimeVue | `v-tooltip` directive |
| Quasar | `q-tooltip` |
| WA | `wa-tooltip` |
| SWC | `sp-tooltip` (+ `overlay-trigger`) |

### Capabilities (9 libs)

| Capability | Count | Common? | Looma |
|---|---|---|---|
| 12-way placement | 9 (PrimeVue 4 sides) | yes | **only top/bottom-start/end** |
| Default placement | `top` centered in RAC, WA, Radix, MUI (bottom), Chakra, Vuetify (end? uncertain) | centered is common | `top-start` |
| Offset | 8 | yes | fixed |
| Arrow | 7 (toggle: MUI `arrow`, Chakra `showArrow`, WA `without-arrow`) | yes | always on |
| Show delay | 9 (RAC 1500, Radix 700, MUI 100, WA 150, PrimeVue/Quasar 0) | yes | `show-delay` 500 |
| Hide delay | 7 (Radix has none; it uses `disableHoverableContent`) | yes | `hide-delay` 100 |
| Warm-up / skip-delay group | 3 (RAC global warmup/cooldown, Radix `skipDelayDuration`, MUI `enterNextDelay`) | no | unknown |
| Trigger modes (hover/focus/click/manual) | 5 (WA `trigger`, RAC `trigger="focus"`, MUI `disable*Listener`, Vuetify `open-on-*`, Chakra (uncertain)) | borderline | hover + focus |
| disabled | 6–7 | yes | none |
| Hoverable content (WCAG 1.4.13) | behavior in most; Radix and MUI have opt-outs | yes | yes (via `hide-delay`) |
| Color variant | SWC `variant` (info/positive/negative) only | no | `inverse` |
| Follow cursor | 1 (MUI) | no | none |

### Gaps

| Gap | Verdict | Reason | Proposed API |
|---|---|---|---|
| Full placement set + centered default | **add** | Same bug as the popover. Centered `top` is the near-universal default, and `-start` misaligns on small icon triggers. | Same `placement` keyword union, default `"top"`. |
| Warm-up / skip delay | **add as behavior** | After one tooltip shows, the next should show instantly, which is how toolbar scanning is expected to feel. No attribute is needed. | Module-level cooldown (~`hide-delay` + 300ms). No new attribute. |
| disabled | skip | Declaratively this equals not rendering the tooltip (`$if`), so a boolean adds nothing. | — |
| Arrow toggle | skip | Visual style belongs in the theme. | — |
| Trigger modes | skip | APG tooltip = hover + focus. Click-to-show content belongs in `ui-popover`, and `open` covers manual control. | — |
| Offset | skip (CSS var) | Token-level decision. | `--ui-tooltip-offset`. |

### Looma extras

- **`inverse`: drop.** Only SWC has a per-instance tooltip color, and there it is semantic (positive/negative). Tooltip surface is a system-wide theme decision that the `--ui-tooltip-surface` / `--ui-tooltip-text` tokens already cover; per-instance inversion invites inconsistency.
- `show-delay` / `hide-delay`: keep (common).

---

## 4. `ui-menu` + `ui-menu-item`

### Equivalents

| Library | Component |
|---|---|
| RAC | `MenuTrigger`, `Menu`, `MenuItem`, `MenuSection`, `Header`, `Separator`, `SubmenuTrigger`, `Keyboard` |
| Radix | `DropdownMenu` (Item, CheckboxItem, RadioGroup/RadioItem, Group, Label, Separator, Sub) |
| HUI | `Menu`, `MenuButton`, `MenuItems`, `MenuItem`, `MenuSection`, `MenuHeading`, `MenuSeparator` |
| MUI | `Menu` + `MenuItem` (+ `ListItemIcon`, `Divider`, `ListSubheader`) |
| Chakra | `Menu` (Item, CheckboxItem, RadioItemGroup, ItemGroup, Separator, ItemCommand, TriggerItem for submenus) |
| Vuetify | `v-menu` + `v-list` |
| PrimeVue | `Menu`, `TieredMenu` (submenus), model-driven |
| Quasar | `q-menu` + `q-list` / `q-item` |
| WA | `wa-dropdown` + `wa-dropdown-item` (`type="checkbox"`, `submenu` slot, `details` slot, `variant="danger"`) |
| SWC | `sp-action-menu` / `sp-menu`, `sp-menu-item`, `sp-menu-group`, `sp-menu-divider` |

### Capabilities (10 libs)

| Capability | Count | Common? | Looma |
|---|---|---|---|
| Separator | 10 | yes | **none** |
| Groups with heading | 9 | yes | **none** |
| Links (`href`) | 9 | yes | **none** |
| Icons | 8 | yes | default slot only |
| Typeahead | ~7 (RAC, Radix, HUI, MUI, Chakra, WA and SWC (uncertain)); APG "optional" | yes | **none** |
| Home/End, wrap | APG + RAC, Radix `loop`, Chakra `loopFocus`, HUI | yes | **none** |
| Submenus | 7 (RAC, Radix, Chakra, PrimeVue TieredMenu, Quasar, WA, SWC; Vuetify nesting (uncertain)) | yes | **none** |
| Keyboard shortcut hint | 6 (RAC `Keyboard`, Radix Themes `shortcut`, Chakra `ItemCommand`, WA `details` slot, SWC, MUI demo) | yes | **none** |
| Close-on-select control | 6 | yes | always closes |
| Checkbox items | 5 (RAC, Radix, Chakra, WA, SWC) | borderline (5/10) | **none** |
| Radio items | 4 (RAC, Radix, Chakra, SWC) | no (but tied to checkbox) | **none** |
| Disabled item | 10 | yes | `disabled` |
| Destructive variant | 3 (WA `variant="danger"`, Radix Themes `color`, Chakra style) | no | none |
| Placement / offset / flip | 10 | yes | `placement` (partial) |
| Long-press / hover trigger | 2–3 | no | none |

### Gaps

| Gap | Verdict | Reason | Proposed API |
|---|---|---|---|
| Separators | **add** | Universal, and needed to visually chunk commands. The native element already has `role=separator`. | Accept `<hr>` children in `ui-menu`. No new component. |
| Groups + heading | **add** | Common (9/10). Radio items also need it as their grouping boundary. | `<ui-menu-group label="Sort by">…items…</ui-menu-group>` → `role=group` + `aria-label`. |
| Typeahead, Home/End | **add as behavior** | APG keyboard contract; cheap. | No attributes. Match on item `textContent`. |
| Links | **add** | Navigation menus are a top use case, and nesting an `<a>` inside `role=menuitem` is invalid. | `ui-menu-item href: string = ""` renders the item as an `<a role=menuitem>`. Skip `target` until asked. |
| Keyboard shortcut hint | **add** | Common and cheap. It is display-only and needs no key binding. | `ui-menu-item` slot `shortcut` (`<kbd slot="shortcut">⌘K</kbd>`). |
| Checkbox / radio items | **add** | 5/10 is borderline, but "view options" menus can't be built otherwise, and `select` can't express checked state. | `ui-menu-item type: "action" \| "checkbox" \| "radio" = "action"`, `checked: boolean = false`. Radio exclusivity is scoped to the nearest `ui-menu-group`. Checkable items keep the menu open. `select` detail gains `checked`. Emits `change` (uncertain naming; match Looma conventions). |
| Submenus | **add (later stage)** | Common (7/10) and in APG, but it is the most complex piece; stage it after the items above. | Child markup: nest a `ui-menu` inside a `ui-menu-item` (`<ui-menu-item>Share<ui-menu slot="submenu">…</ui-menu></ui-menu-item>`). ArrowRight/Left open and close it. |
| Close-on-select control | skip | Checkable items keeping the menu open covers the real case (WA does the same). | — |
| Icons slot | skip | Default content can hold an icon, and CSS can align it. Add `slot="icon"` only if column alignment across items is needed. | — |
| Destructive tone | skip | Not common. Author CSS or a later token is enough. | — |
| `text-value` for typeahead | skip | `textContent` is enough until rich items exist. | — |

### Looma extras

- `ui-menu` `for` / `placement`: keep (common). Fix `placement` as in §2.
- README mentions `orientation` and `selected`, which are not in the API. **Drop from the docs**; menubar orientation is a separate component.

---

## 5. `ui-context-menu`

### Equivalents

| Library | Component |
|---|---|
| RAC | `MenuTrigger trigger="contextMenu"`: newer, seen on the official Menu page, (uncertain version) |
| Radix | `ContextMenu` |
| HUI | none |
| MUI | none (demo: `Menu` with `anchorReference="anchorPosition"`) |
| Chakra | `Menu.ContextTrigger` |
| Vuetify | none (a `v-menu` with a coordinate `target` is possible (uncertain)) |
| PrimeVue | `ContextMenu` (`global` option) |
| Quasar | `q-menu context-menu` |
| WA | none |
| SWC | none (uncertain) |

That makes 6 libraries.

### Capabilities (6 libs)

| Capability | Count | Common? | Looma |
|---|---|---|---|
| Open at pointer coordinates | 6 | yes | yes |
| Touch long-press opens | 3–4 (Radix, Chakra/Zag, RAC; PrimeVue (uncertain)) | yes | browser-dependent |
| Keyboard open (Shift+F10 / Menu key) | native `contextmenu` event | yes | yes (via native event) |
| Same item model as menu (checkbox, radio, sub, separator, group) | Radix, Chakra, RAC, PrimeVue | yes | inherits the `ui-menu` gaps |
| Disabled trigger | 2 (Radix `disabled`, Quasar) | no | none |
| Document-wide target | 1 (PrimeVue `global`) | no | none |
| Modal | 1 (Radix `modal`) | no | none |

### Gaps

| Gap | Verdict | Reason | Proposed API |
|---|---|---|---|
| Menu item types, separators, groups, typeahead, submenus | **add** (inherited) | Whatever `ui-menu` gains should work identically here, since it wraps `ui-menu`. | Same child markup as §4. |
| Long-press on touch | **add as behavior** | iOS Safari does not fire `contextmenu` on long-press, so touch users can't reach it today. | Built-in ~500ms long-press. No attribute. |
| disabled / global / modal | skip | Not common, and removing the element or `for` does the same. | — |

### Looma extras

- **Opening on plain click / keyboard activation of the `for` element: keep.** No library does this, but it gives a visible, touch-safe path to the same commands, and the README requires one. Document it clearly, because users won't expect it.

---

## 6. `ui-toast-region`

### Equivalents

| Library | Component |
|---|---|
| RAC | `ToastRegion` + `Toast` + `ToastQueue` (was `UNSTABLE_`; stability (uncertain)) |
| Radix | `Toast.Provider`/`Viewport`/`Root`/`Title`/`Description`/`Action`/`Close` |
| HUI | none |
| MUI | `Snackbar` (+ `Alert`); no built-in queue |
| Chakra | `createToaster` + `Toaster` |
| Vuetify | `v-snackbar`, `v-snackbar-queue` |
| PrimeVue | `Toast` + `ToastService` |
| Quasar | `Notify` plugin |
| Shoelace/WA | `sl-alert` + `.toast()` (Shoelace). WA 3 toast status (uncertain) |
| SWC | `sp-toast` (no region; the author supplies the container) |

That makes 9 libraries.

### Capabilities (9 libs)

| Capability | Count | Common? | Looma |
|---|---|---|---|
| Auto-dismiss duration | 9. Defaults: Radix 5000, Quasar 5000, Vuetify 5000, PrimeVue 3000; off by default in MUI, RAC, SWC, Shoelace. RAC advises ≥5s; SWC enforces ≥6000ms | yes | `auto` + `duration` |
| Persistent (no timeout) | 9 | yes | `auto=false` |
| Pause on hover/focus | Radix, RAC, MUI, Chakra/Zag (uncertain), Vuetify (uncertain), PrimeVue (uncertain) | yes | yes |
| Pause on window blur / page idle | Radix, MUI (`disableWindowBlurListener`), Chakra `pauseOnPageIdle` | no (3) | no |
| Screen position | 6 as a prop (MUI `anchorOrigin`, Chakra `placement`, Vuetify `location`, PrimeVue `position`, Quasar `position`, Shoelace fixed top-end); CSS in Radix/RAC | yes | fixed top-center |
| Tone / severity | 7 (Chakra `type`, PrimeVue `severity`, Quasar `type`, SWC `variant`, Shoelace `variant`, MUI via Alert, Vuetify `color`) | yes | `show({tone})` only; **not declarative** |
| Action button | 8 (Radix Action, MUI `action`, Chakra `action`, Vuetify `actions` slot, Quasar `actions`, SWC `action` slot, RAC content, PrimeVue template) | yes | **none** |
| Close button | ~7 (always on in some; `closable` in Chakra, PrimeVue, Quasar `closeBtn`) | yes | always on |
| Title + description | 5 (Radix, Chakra, PrimeVue summary/detail, Quasar message/caption, RAC) | borderline | message only |
| Max visible / stacking | 3–4 (Chakra `max`, RAC (uncertain), Vuetify queue, Quasar `group`) | no | unlimited |
| Keyboard jump to region | 2 (Radix F8, RAC F6 landmark) | no | none |
| Swipe to dismiss | 2 (Radix, Chakra) | no | none |
| Promise / loading toast | 2 (Chakra `promise`, Quasar `ongoing`) | no | none |
| Progress bar | 2 (Quasar `progress`, Vuetify `timer`) | no | none |

### Gaps

| Gap | Verdict | Reason | Proposed API |
|---|---|---|---|
| Declarative toast element (replacing the magic `data-ui-toast*`) | **add** | Authored toasts currently depend on magic data attributes, which the rules forbid, and tone and actions have no declarative form. | New child element `<ui-toast tone="…" duration="…">Message<button slot="action">Undo</button></ui-toast>`. The region owns the dismiss X. |
| Tone | **add** | Common (7/9). It also selects `role=status` vs `role=alert`. | `ui-toast tone: "neutral" \| "info" \| "success" \| "warning" \| "danger" = "neutral"`. |
| Action | **add** | Undo-style actions are the main reason toasts exist, and a timed action must be reachable (RAC/Radix guidance: provide an alternative path). | `ui-toast` slot `action`. Activation dismisses with `reason: "action"`; the author handles the button's own click or `command`. |
| Position | **add** | App-level choice, found in 6/9 libraries. It also drives enter-animation direction and stack order, which CSS alone doesn't flip cleanly. | `ui-toast-region placement: "top" \| "top-start" \| "top-end" \| "bottom" \| "bottom-start" \| "bottom-end" = "top"`. |
| Merge `auto` into `duration` | **add (simplify)** | Two attributes express one setting. | `duration: number = 0` on the region and per `ui-toast`, where `0` means persistent. Recommend a doc floor of ≥5000 (RAC guidance). |
| Pause on window blur | skip | Only 3 libraries; the hover/focus pause covers the main case. | — |
| Max visible, swipe, promise, progress, F6/F8 hotkey | skip | Not common and no concrete need. Revisit the hotkey if keyboard audits flag it. | — |
| Title / description parts | skip | Child markup (`<strong>` + text) covers it. | — |

### Looma extras

- **`message`: drop.** It is a fallback string for the `--show-toast` command, and the invoking button's `value` already carries the message. A generic "Notification" toast is never useful content.
- **`open`: drop.** No library gates the whole region. It should be visible whenever it holds toasts, and it is already hidden when empty. The region's `close` event can go with it; `dismiss` is the real contract.
- **`auto`: drop** (merged into `duration`).
- **Consumer-owned list (the region never removes authored toasts, and the author handles `dismiss`): keep.** It matches Radix/MUI controlled `open` and fits a declarative, data-driven list.

---

## 7. Function-valued options in other libraries → declarative equivalents

| Library option | Purpose | Looma declarative equivalent |
|---|---|---|
| Radix `onOpenAutoFocus` / `onCloseAutoFocus` (preventDefault); Chakra `initialFocusEl` / `finalFocusEl`; HUI v1 `initialFocus` ref | Focus targets | Native `autofocus` on a child. Native `<dialog>` / `popover` restore focus. |
| Radix `onEscapeKeyDown` / `onPointerDownOutside` / `onInteractOutside` (preventDefault); WA `wa-hide` preventDefault | Block dismissal | `closedby` keyword (`none` / `closerequest` / `any`) |
| RAC `Dialog` children render function `({close}) => …` | Close from content | Native `<button commandfor="dlg" command="request-close">`, or buttons in the `actions` slot |
| MUI `onClose(event, reason)` | Why it closed | `close` event detail `reason` (already present) |
| RAC `MenuItem onAction`, PrimeVue model `command: fn`, Quasar item `@click` + `v-close-popup` | Run a command | `select` event with the item `value` |
| RAC `onSelectionChange`, Radix `onCheckedChange` | Checked state | `type="checkbox\|radio"` + `checked`, reported in `select`/`change` detail |
| Radix / WA `onSelect` preventDefault (keep open) | Keep the menu open | Implicit for checkable items |
| PrimeVue model `visible: fn`, `disabled: fn` | Conditional items | Bound `disabled` attribute / `$if` on the child |
| HUI `MenuItem` render prop `({ focus })` | Focus styling | CSS `:focus-visible` |
| MUI `anchorEl` (element ref), Vuetify `activator` slot props, PrimeVue `ContextMenu.show(event)` | Anchor/trigger | `for` ID reference; native `contextmenu` event |
| MUI `popperOptions.modifiers`, Chakra `positioning.getAnchorRect` | Custom positioning | `placement` keyword + CSS anchor positioning / `position-try-fallbacks` |
| RAC `queue.add(content, {timeout, onClose})`, Chakra `toaster.create/promise`, Quasar `Notify.create({actions:[{handler}], onDismiss})`, PrimeVue `toast.add` | Show toasts / handle close | `<ui-toast>` children (data-driven list), `--show-toast` invoker command, `dismiss` event, `slot="action"` buttons |
| MUI `TransitionComponent`, `slots` / `slotProps` | Custom animation / parts | CSS `@starting-style` / `transition-behavior` (already used) |

---

## Sources

### React Aria Components
- https://react-aria.adobe.com/Modal
- https://react-aria.adobe.com/Dialog
- https://react-aria.adobe.com/Popover
- https://react-aria.adobe.com/Tooltip
- https://react-aria.adobe.com/Menu
- https://react-aria.adobe.com/Toast

### Radix
- https://www.radix-ui.com/primitives/docs/components/dialog
- https://www.radix-ui.com/primitives/docs/components/alert-dialog
- https://www.radix-ui.com/primitives/docs/components/popover
- https://www.radix-ui.com/primitives/docs/components/tooltip
- https://www.radix-ui.com/primitives/docs/components/dropdown-menu
- https://www.radix-ui.com/primitives/docs/components/context-menu
- https://www.radix-ui.com/primitives/docs/components/toast
- https://www.radix-ui.com/themes/docs/components/dialog

### Headless UI
- https://headlessui.com/react/dialog
- https://headlessui.com/react/popover
- https://headlessui.com/react/menu

### MUI
- https://mui.com/material-ui/react-dialog/
- https://mui.com/material-ui/react-popover/
- https://mui.com/material-ui/react-tooltip/
- https://mui.com/material-ui/react-menu/
- https://mui.com/material-ui/react-snackbar/
- https://mui.com/material-ui/api/snackbar/

### Chakra v3
- https://chakra-ui.com/docs/components/dialog
- https://chakra-ui.com/docs/components/popover
- https://chakra-ui.com/docs/components/tooltip
- https://chakra-ui.com/docs/components/menu
- https://chakra-ui.com/docs/components/toast
- https://ark-ui.com/docs/components/toast

### Vuetify
- https://vuetifyjs.com/en/components/dialogs/
- https://vuetifyjs.com/en/components/menus/
- https://vuetifyjs.com/en/components/tooltips/
- https://vuetifyjs.com/en/components/snackbars/
- https://vuetifyjs.com/en/components/snackbar-queue/

The API page fetch returned empty during this audit; the Vuetify facts come from the component docs and are partly uncertain.

### PrimeVue
The site now redirects primevue.org to primevue.dev.
- https://primevue.org/dialog/
- https://primevue.org/popover/
- https://primevue.org/tooltip/
- https://primevue.org/menu/
- https://primevue.org/tieredmenu/
- https://primevue.org/contextmenu/
- https://primevue.org/toast/

### Quasar
- https://quasar.dev/vue-components/dialog
- https://quasar.dev/vue-components/menu
- https://quasar.dev/vue-components/tooltip
- https://quasar.dev/quasar-plugins/notify

### Web Awesome / Shoelace
- https://webawesome.com/docs/components/dialog
- https://webawesome.com/docs/components/popover
- https://webawesome.com/docs/components/tooltip
- https://webawesome.com/docs/components/dropdown
- https://shoelace.style/components/alert

### Spectrum Web Components
- https://opensource.adobe.com/spectrum-web-components/components/dialog/
- https://opensource.adobe.com/spectrum-web-components/components/popover/
- https://opensource.adobe.com/spectrum-web-components/components/tooltip/
- https://opensource.adobe.com/spectrum-web-components/components/action-menu/
- https://opensource.adobe.com/spectrum-web-components/components/menu/
- https://opensource.adobe.com/spectrum-web-components/components/toast/

### WAI-ARIA APG
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/
- https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
- https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
- https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/

### HTML
- `dialog closedby`: https://html.spec.whatwg.org/multipage/interactive-elements.html#attr-dialog-closedby
- Invoker commands: https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-commandfor
