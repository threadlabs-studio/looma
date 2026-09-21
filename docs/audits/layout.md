# Looma layout primitives audit

> **Evidence, not decisions.** These are the research notes behind the 0.3 option audit. They describe the API *before* 0.3, and some verdicts were overruled or already resolved. The binding decisions are in the [Component option audit](../../apps/docs/docs/component-library-audit.md).

Date: 2026-09-21. Scope: `ui-stack`, `ui-cluster`, `ui-grid`, `ui-center`, `ui-switcher`, `ui-sidebar`, `ui-reel`, plus a separate audit of application sidebar / drawer / split-pane components. `ui-separator` is out of scope.

Looma API source: the declared API before 0.3.

Constraints applied: props are markup attributes (kebab-case, text-serializable), no function-valued options, booleans default to false, no author `data-*`, add only for real value, and a Cluster always wraps.

Libraries compared: Every Layout (EL), Chakra UI v3, Material UI (MUI), Radix Themes, Mantine, Vuetify 3, Quasar, React Spectrum (Spectrum), and Web Awesome (WA, successor to Shoelace) layout utilities. PrimeVue ships no layout primitives; its separate PrimeFlex CSS library is not counted. It is counted only in the sidebar/drawer section.

How to read counts: "n/N" means n of the N libraries that have an equivalent primitive expose the capability. A capability is **common** when a majority has it. Counts reflect the documented top-level API. Where a library gets the capability only from generic style props or utility classes, the table says so.

**Uncertainty note:** Every Layout's Cluster, Center, Reel, and Grid pages are now paywalled. Their prop lists below come from the published book and custom-element sources I remember, not from a fresh page fetch, so they are marked *(unverified)*. The Stack, Switcher, and Sidebar pages were fetched.

---

## 1. `ui-stack`

Looma: `gap` (xs–xl), `align` (start|center|end|stretch), `justify` (start|center|end|between).

| Library | Name |
|---|---|
| Every Layout | Stack |
| Chakra | Stack / VStack (HStack is the row variant) |
| MUI | Stack |
| Radix Themes | Flex `direction="column"` |
| Mantine | Stack |
| Vuetify | none; `d-flex flex-column` utility classes |
| Quasar | `column` + `q-gutter-*` CSS classes |
| Spectrum | Flex `direction="column"` |
| Web Awesome | `wa-stack` utility class |

| Capability | Count (/9) | Common? | Looma |
|---|---|---|---|
| gap / spacing token | 9 | yes | yes |
| cross-axis align | 8 (not EL) | yes | yes |
| main-axis justify | 6 (Chakra, Radix, Mantine, Spectrum, Vuetify/Quasar utilities) | yes | yes |
| direction switch (row/column) | 5 (Chakra, MUI, Radix, Spectrum, Quasar) | yes | no, by design (use Cluster/Switcher) |
| divider/separator prop | 2 (MUI `divider`, Chakra `separator`) | no | no |
| wrap | 3 (Chakra, Radix, Spectrum) | no | no |
| split after nth child (auto margin) | 1 (EL `splitAfter`) | no | no |
| recursive spacing | 1 (EL `recursive`) | no | no |

**Gaps:**
- Direction switch: **no real value.** Looma's separate named primitives cover this, and a Stack that can be a row is just Flex.
- Divider prop: **no.** Authors can put `<ui-separator>` in the markup, which is more declarative.
- `split-after: number` (EL): **low value.** It pins trailing items to the bottom, for example card footers. Author CSS `margin-block-start: auto` on one child does the same. Skip unless Looma forbids author CSS on children.

**Extras:** none. `justify` is common and useful when the stack has a height, so keep it.

---

## 2. `ui-cluster` (always wraps)

Looma: `gap`, `align`.

| Library | Name |
|---|---|
| Every Layout | Cluster |
| Chakra | Wrap (Chakra's HStack does not wrap by default) |
| MUI | Stack `direction="row" flexWrap="wrap" useFlexGap` (no dedicated component) |
| Radix Themes | Flex `wrap="wrap"` |
| Mantine | Group (`wrap` defaults to `wrap`) |
| Vuetify | `d-flex flex-wrap ga-*` utilities; `v-chip-group` for chips specifically |
| Quasar | `row wrap q-gutter-*` classes |
| Spectrum | Flex `wrap` |
| Web Awesome | `wa-cluster` |

| Capability | Count (/9) | Common? | Looma |
|---|---|---|---|
| gap | 9 | yes | yes |
| align (cross axis) | 9 | yes | yes |
| justify (main axis) | 9 | yes | **no** |
| separate row/column gap | 5 (Chakra, Radix, Spectrum, MUI via sx, Mantine `rowGap` style prop) | yes (mostly via style props) | no |
| grow children | 1 (Mantine `grow`) | no | no |
| non-wrapping mode | 7 | yes | no, by design |

**Gaps:**
- **`justify: "start" | "center" | "end"` (default start): real value.** It covers a right-aligned wrapping action row and a centered tag cloud. Every library has it. Leave out `between`: with wrapping it produces ragged last lines, and a justified single row belongs to a different primitive (Flex/Inline), per Looma's Cluster rule.
- Separate row/column gap: **low value.** Chip rows almost always use a uniform gap. Skip.
- `grow`: **no.** That behaviour belongs to a Flex/Switcher, not a chip cluster.
- Non-wrapping: **explicitly rejected.** If needed, it becomes a separate `ui-inline`/`ui-flex` (WA calls the justified row `wa-split`).

**Extras:** `align="stretch"` is unusual for chips, but it is harmless and consistent with the other primitives, so keep it. Optionally add `baseline` to `align`: Chakra, Radix, Mantine, Spectrum, and Vuetify all allow it through CSS values, and it helps with mixed-size text. Low priority.

---

## 3. `ui-grid`

Looma: `gap`, `min` (sm|md|lg). This is an auto-fill grid with a minimum column width.

| Library | Name |
|---|---|
| Every Layout | Grid (`min`, `space`) *(unverified)* |
| Chakra | SimpleGrid (`columns`, `minChildWidth`, `gap`); Grid (raw CSS grid) |
| MUI | Grid (12-column; `container`, `size`, `spacing`, `columns`) |
| Radix Themes | Grid (`columns`, `rows`, `flow`, `align`, `justify`, `gap`, `gapX`, `gapY`) |
| Mantine | SimpleGrid (`cols`, `spacing`, `verticalSpacing`, `minColWidth`, `autoFlow`, `type="container"`); Grid (12-col) |
| Vuetify | v-row / v-col (12-col, `cols`, `sm`…`xl`, `offset`, `dense`, `no-gutters`) |
| Quasar | `row` / `col-*` classes (12-col) |
| Spectrum | Grid (`areas`, `columns`, `rows`, `autoFlow`, `gap`…) |
| Web Awesome | `wa-grid` (`--min-column-size`) |

| Capability | Count (/9) | Common? | Looma |
|---|---|---|---|
| gap | 9 | yes | yes |
| min column width (intrinsic auto-fill) | 4 (EL, Chakra, Mantine, WA) | no | yes |
| explicit column count | 7 (Chakra, MUI, Radix, Mantine, Vuetify, Quasar, Spectrum) | yes | **no** |
| breakpoint-responsive columns | 5 (Chakra, MUI, Radix, Mantine, Vuetify) | yes | no, by design (intrinsic) |
| separate row/column gap | 5 | yes | no |
| per-child span/offset | 5 (MUI, Mantine Grid, Vuetify, Quasar, Spectrum) | yes | no |
| container-query mode | 1 (Mantine `type="container"`) | no | implicit |
| auto-fill vs auto-fit | 1 (Mantine `autoFlow`) | no | no |

**Gaps:**
- **`columns: number` as a maximum column count: real value.** The problem it solves is that `min` alone lets a card grid expand to 5–6 columns on wide screens. Capping it ("at most 3 across") is the most common reason people reach for an explicit column count. Keep the grid intrinsic: `repeat(auto-fill, minmax(max(min, 100%/columns - gap), 1fr))`. Using it as a fixed count instead would break on mobile, so do not.
- Breakpoint-responsive columns, spans, and offsets: **no.** These belong to the 12-column page-grid paradigm, which conflicts with the intrinsic design and needs responsive-object props.
- Separate row/column gap: **low value.** Skip.
- `min` scale: sm|md|lg is fine. Consider `number` (px/rem) only if the token steps prove too coarse in practice.

**Extras:** none.

---

## 4. `ui-center`

Looma: `measure` (narrow|wide), `gutters` (s|m|l). This is EL's Center: a max-width, horizontally centered box with inline padding.

**Naming note:** in Chakra and Mantine, `Center` means "flex-center the children on both axes." The component Looma calls Center is named **Container** in MUI, Chakra, Radix, Mantine, and Vuetify (`v-container`). Only EL calls it Center.

| Library | Name |
|---|---|
| Every Layout | Center (`max`, `gutters`, `andText`, `intrinsic`) *(unverified)* |
| Chakra | Container (`fluid`, `centerContent`, `maxW`) |
| MUI | Container (`maxWidth` xs–xl, `fixed`, `disableGutters`) |
| Radix Themes | Container (`size` 1–4 = 448/688/880/1136px, `align` left/center/right) |
| Mantine | Container (`size`, `fluid`, `strategy` block/grid) |
| Vuetify | v-container (`fluid`) |
| Quasar | none (QPage and CSS) |
| Spectrum | none (View with maxWidth) |
| Web Awesome | none (uncertain) |

| Capability (/6 with equivalent) | Count | Common? | Looma |
|---|---|---|---|
| max-width scale | 6 | yes | yes (`measure`, 2 steps) |
| gutters (inline padding) on/off or size | 4 (EL, MUI `disableGutters`, Mantine via padding, Chakra default px) | yes | yes |
| fluid (no max) | 3 (Chakra, Mantine, Vuetify) | no/half | no |
| center children (intrinsic) | 2 (EL `intrinsic`, Chakra `centerContent`) | no | no |
| text-align center | 1 (EL `andText`) | no | no |
| non-center alignment | 1 (Radix `align`) | no | no |

**Gaps:**
- `measure` has only 2 steps, while other libraries offer 4–5 (Radix 4, MUI 5). **Maybe.** Add a third step (for example `page` around 70–80rem) only if an app or the docs need a wide app-content width. Otherwise keep 2.
- `center-content: boolean` (EL `intrinsic`, Chakra `centerContent`): **modest real value.** It centers narrow children such as a sign-in card or an empty state inside the measure. Add it only when a real layout needs it.
- `fluid`: **no.** Just don't use the wrapper.
- `andText`: **no.** That is author CSS.

**Extras:** none. **Naming:** consider renaming to `ui-container`. It is the majority name, and it frees "Center" from the Chakra/Mantine meaning. This is lower priority than the Sidebar rename.

---

## 5. `ui-switcher`

Looma: `threshold` (xs–lg), `gap`, `align`. Every child goes row-to-column together once the container passes the threshold.

| Library | Name |
|---|---|
| Every Layout | Switcher (`threshold`, `space`, `limit`) |
| Web Awesome | none (uncertain; `wa-flank`/`wa-grid` cover nearby cases) |
| Chakra / MUI / Radix / Spectrum | no component; responsive `direction` on Stack/Flex (viewport breakpoints, not container width) |
| Mantine | no component; SimpleGrid `type="container"` is the closest |
| Vuetify / Quasar | no component; breakpoint classes |

Only EL has a true container-intrinsic switcher. The others fake it with viewport breakpoints (4 of 8 via responsive `direction`).

| Capability | Count | Common? | Looma |
|---|---|---|---|
| threshold | EL + 4 responsive-direction libs | yes | yes |
| gap | all | yes | yes |
| item-count limit | 1 (EL `limit`, default 4) | no | **no** |
| align | Stack/Flex libs | yes | yes |

**Gaps:**
- **`limit: number` (optional): real value.** Without it, 5–8 children squeezed into one row look broken even above the threshold. EL has it for that reason, and it is a single integer. Add it; unset means no limit.

**Extras:** `align` is useful for a mixed-height horizontal state, so keep it.

---

## 6. `ui-sidebar` (EL two-pane "Sidebar" layout) and the rename

Looma today mixes two things. One is EL's intrinsic two-pane layout (`side`, `width`, `gap`, `align`). The other is resize machinery (`resizable`, `min-width`, `max-width`, `resize-step`, `resize-label`, the `resize` event) that belongs to an application sidebar or splitter.

### What other libraries call the two-pane intrinsic pattern

| Library | Name | Notes |
|---|---|---|
| Every Layout | Sidebar; CSS class `with-sidebar` | `side`, `sideWidth`, `contentMin` (50%), `space`, `noStretch` |
| Web Awesome | **`wa-flank`** | `wa-flank:start` / `:end`, `--flank-size`, `--content-percentage` (50%). WA's docs describe it as "small thing next to a larger thing" and use avatar + text as the example. |
| Chakra / MUI / Radix / Mantine / Spectrum / Vuetify / Quasar | no dedicated component | built from Flex/Group with `grow` |

### (a) Rename recommendation

**Rename to `ui-flank`.** It is the only published alternative name for this exact pattern (Web Awesome, from the Shoelace team). It is short, it does not suggest navigation, and it fits both the avatar+text and aside+main uses. The alternative `ui-with-sidebar` (EL's original class) keeps the misleading word. Do not use `ui-split`, because WA uses `wa-split` for the push-apart row.

Flank API after the rename:
- keep `side: "start" | "end"`, `gap`, `align`, and `width` (flank target size). Possibly rename `width` to `flank-width` for clarity.
- optional, low value: `content-min: number` (percent, default 50) is the wrap threshold. EL and WA both expose it, but the default works nearly always. Add it only on demand.
- **move out:** `resizable`, `min-width`, `max-width`, `resize-step`, `resize-label`, and `resize`. A drag handle on a layout that wraps to a stacked column makes no sense. These belong to the application sidebar below.

### Application sidebar / navigation drawer / split pane: library survey

| Library | Component(s) | Key API |
|---|---|---|
| MUI | Drawer | `variant` permanent/persistent/temporary, `anchor` left/right/top/bottom, `open`, `onClose`, `hideBackdrop`, `elevation`, `transitionDuration`. No resize. |
| Vuetify | v-navigation-drawer | `v-model`, `location` (start), `width` (256), `rail` + `rail-width` (56), `expand-on-hover`, `permanent`, `temporary`, `persistent`, `mobile` / `mobile-breakpoint`, `disable-resize-watcher`, `scrim`, `touchless`, `floating`, `sticky`. No drag resize (uncertain for newest versions). |
| Quasar | QDrawer (inside QLayout) | `v-model`, `side`, `width` (300), `breakpoint` (1023), `behavior` default/desktop/mobile, `show-if-above`, `mini` + `mini-width` (57), `overlay`, `persistent`, `bordered`, `elevated`; events show/hide/mini-state. No drag resize (docs show a manual resize example only, uncertain). |
| Mantine | AppShell.Navbar / Aside; Drawer | `navbar={{ width, breakpoint, collapsed: { mobile, desktop } }}`, `layout` default/alt, `withBorder`, `transitionDuration`. No resize. |
| Chakra | Drawer | `open`, `placement` (end), `size` xs–full, `modal`, `closeOnEscape`, `closeOnInteractOutside`, `trapFocus`, `preventScroll`. Overlay only. |
| shadcn/ui (reference, not requested) | Sidebar + SidebarProvider | `side`, `variant` sidebar/floating/inset, `collapsible` offcanvas/icon/none, `open` / `defaultOpen`, Cmd/Ctrl+B shortcut, cookie persistence, mobile uses Sheet, SidebarTrigger, SidebarRail (a thin rail that toggles on click; I believe it does not drag-resize, uncertain). |
| PrimeVue | Drawer (formerly Sidebar); Splitter + SplitterPanel | Drawer: `visible`, `position` left/right/top/bottom/full, `modal`, `dismissable`, `blockScroll`, `showCloseIcon`. Splitter: `layout`, `gutterSize`, `step`, `stateKey` / `stateStorage` (persist sizes), panel `size` / `minSize` / `maxSize` / `collapsible`; events resizestart/resize/resizeend/collapse. PrimeVue v4 renamed Sidebar to Drawer (from memory; the fetched docs page was ambiguous). |
| Web Awesome / Shoelace | wa-split-panel; wa-drawer | Split panel: `position` (%), `position-in-pixels`, `primary` start/end (fixed pane on container resize), `snap`, `snap-threshold`, `orientation`, `disabled`, CSS `--min` / `--max`, `--divider-width`, `--divider-hit-area`, event `wa-reposition`, slots start/end/divider. Drawer: `open`, `placement` (end), `label`, `light-dismiss`, `without-header`, `with-footer`; events show/after-show/hide/after-hide. |
| Radix Themes | none (Radix primitives have Dialog only) | — |
| Spectrum | none. React Spectrum has no drawer or split view in its public stable API (uncertain; historical SplitView was internal). | — |

No single library covers the common app need: a drag-resizable pane on desktop that collapses behind a toggle into an off-canvas drawer on small screens. The app-shell drawers (Vuetify, Quasar, Mantine, shadcn) supply the responsive collapse, and the splitters (WA, PrimeVue) supply the drag. Looma's component should combine the two.

### Capability counts: application sidebar (/7: MUI, Vuetify, Quasar, Mantine AppShell, shadcn, PrimeVue Drawer, WA Drawer; Chakra Drawer is overlay-only and counted where applicable, /8)

| Capability | Count | Common? |
|---|---|---|
| open/visible state | 8/8 | yes |
| side/placement start/end | 8/8 | yes |
| width | 6 (MUI via sx, Vuetify, Quasar, Mantine, shadcn CSS var, Chakra `size`) | yes |
| permanent vs overlay mode | 5 (MUI variant, Vuetify permanent/temporary, Quasar behavior, Mantine collapsed.*, shadcn auto) | yes |
| automatic overlay below a breakpoint | 4 (Vuetify, Quasar, Mantine, shadcn) | half; this is the key feature for app sidebars |
| scrim/backdrop + light dismiss + Esc | 7 | yes |
| focus trap when overlay | 5 (Chakra, Vuetify, PrimeVue, WA, MUI Modal) | yes |
| mini/rail (icon-only collapsed) | 3 (Vuetify, Quasar, shadcn) | no |
| drag-to-resize | 0 drawers; 2 splitters (WA, PrimeVue) | no; needs the splitter capability |
| min/max size for resize | 2 splitters | no |
| keyboard resize step | 1 explicit (PrimeVue `step`); WA uses arrow keys | no |
| persist size/state | 2 (PrimeVue stateKey, shadcn cookie) | no |
| keyboard shortcut toggle | 1 (shadcn) | no |
| swipe gestures | 2 (Vuetify `touchless`, Quasar pan) | no |

### (b) Recommended declarative option set: `ui-app-sidebar` (or `ui-nav-drawer`)

Recommended name: **`ui-app-sidebar`**. It says "sidebar" in the way app developers mean it (shadcn, Vuetify "navigation drawer", Mantine "Navbar"). An acceptable alternative is `ui-drawer` for the overlay-only generic, if Looma wants one later.

| Attribute | Type / default | Why (real value) |
|---|---|---|
| `open` | boolean = false. Reflects the state. In docked mode, "closed" means collapsed/hidden; in drawer mode, "closed" means off-canvas. | Universal (8/8). The toggle button needs a state. Default-false satisfies the boolean rule. Name it `collapsed` instead if Looma wants the desktop default to be expanded: `collapsed` (false = expanded) reads better for desktop, and `open` reads better for the mobile drawer. **Recommend `collapsed`** because the desktop resting state is expanded. The drawer opens explicitly via the toggle, and its overlay state can be a separate read-only reflected attribute or state. |
| `side` | "start" \| "end" = "start" | Universal. |
| `width` | number (px) = 280 | Initial or current docked width (Vuetify 256, Quasar 300). Updated by dragging. |
| `min-width` / `max-width` | number = 200 / 480 | Clamp for drag resize (WA `--min` / `--max`, PrimeVue `minSize` / `maxSize`). Carry over from the current ui-sidebar. |
| `resizable` | boolean = false | Enables the drag handle (a `role="separator"` with aria-valuenow, arrow keys). Carry over. |
| `resize-step` | number = 16 | Keyboard arrow increment (PrimeVue `step`). Carry over. |
| `resize-label` | string = "Resize sidebar" | Accessible name for the handle. Carry over. |
| `breakpoint` | "sm" \| "md" \| "lg" = "md" (container or viewport width) | Below it the sidebar leaves the flow and becomes an off-canvas modal drawer with scrim, Esc/light dismiss, and a focus trap (Vuetify `mobile-breakpoint`, Quasar `breakpoint`, Mantine `breakpoint`). This is the core need. Use tokens, not a responsive object. |
| `persist` | string (storage key), unset = none | Remembers width and collapsed state across reloads (PrimeVue `stateKey`, shadcn cookie). Real value for resizable app sidebars, because users hate re-dragging. Optional, second phase. |

Events: `resize` (width), `toggle` (collapsed/open changed, mirroring `<details>`/popover `toggle`).

Slots: default (the navigation). The toggle button should be an ordinary `<ui-icon-button>` placed anywhere. Wire it with an HTML-native invoker pattern (`commandfor`/`command="toggle"`-style, or the Looma equivalent), not a function prop.

**Skip (no real value yet / YAGNI):**
- `mini`/`rail` icon-only mode (3/8). Real, but no app has asked for it yet. Add `rail` later as a keyword on a `collapse` attribute (`collapse="offcanvas" | "rail"`), following shadcn's `collapsible`.
- `expand-on-hover`, `floating`/`variant`, `elevated`/`bordered` (styling belongs in the theme), `touchless`/swipe gestures, keyboard shortcut (app-level concern), `snap` (WA), `behavior` force-mode override (Quasar; a breakpoint suffices), top/bottom placement (that is a sheet, not a sidebar).
- `permanent` (can't collapse): omit `resizable` and don't render a toggle. There is no need for a flag.

---

## 7. `ui-reel`

Looma: `gap`, `item-width` (sm|md|lg), `snap` (start|center). A horizontal scroll strip.

| Library | Name |
|---|---|
| Every Layout | Reel (`itemWidth`, `space`, `height`, `noBar`) *(unverified)* |
| Vuetify | v-slide-group (`show-arrows`, `center-active`, `mandatory`, `direction`) |
| Quasar | QScrollArea (generic) |
| Mantine | ScrollArea (generic); Carousel is a separate Embla package (`slideSize`, `slideGap`, `align`, `withControls`, `withIndicators`) |
| Radix Themes | ScrollArea (generic) |
| Web Awesome | wa-carousel (`slides-per-page`, `navigation`, `pagination`, `loop`, `autoplay`, `scroll-hint`, `orientation`) (uncertain on exact attribute list) |
| Chakra / MUI / Spectrum | none (MUI ImageList, Chakra ScrollArea v3 are generic scroll containers) |

| Capability (/5 reel/carousel-like: EL, Vuetify, Mantine Carousel, WA carousel, Looma-style) | Count | Common? | Looma |
|---|---|---|---|
| gap | 4 | yes | yes |
| item width / slides per page | 3 (EL, Mantine, WA) | yes | yes |
| snap alignment | 3 (Mantine `align`, WA, Vuetify center-active) | yes | yes |
| prev/next arrow controls | 3 (Vuetify, Mantine, WA) | yes | no |
| hide scrollbar | 1 (EL `noBar`) | no | no |
| fixed height | 1 (EL) | no | no |
| pagination dots, loop, autoplay | 1–2 (carousels) | no | no |

**Gaps:**
- Arrow controls: **low-to-moderate value, but not for a layout primitive.** A Reel is native scroll: touch, trackpad, and Shift+wheel all work, and focusable children are reachable by Tab. Arrows turn it into a carousel widget with extra a11y obligations. Skip, and build a separate `ui-carousel` if ever needed.
- `no-bar`/hide scrollbar: **no.** It hurts discoverability on desktop.
- `height`: **no.** Author CSS.

**Extras:** `snap` is common and cheap, so keep it. Consider allowing `snap` to be unset (no snapping), which is presumably already the default. `item-width` is common, so keep it.

---

## Summary of recommendations

| Component | Add | Drop / move | Rename |
|---|---|---|---|
| ui-stack | none | none | none |
| ui-cluster | `justify: start\|center\|end` | none | none (non-wrapping row goes to a future `ui-inline`/`ui-flex`) |
| ui-grid | `columns: number` as a **max** column cap | none | none |
| ui-center | optional `center-content`; maybe a 3rd `measure` step | none | consider `ui-container` (majority name) |
| ui-switcher | `limit: number` | none | none |
| ui-sidebar | none | move `resizable`, `min-width`, `max-width`, `resize-step`, `resize-label`, and `resize` to the app sidebar | **`ui-flank`** (Web Awesome precedent) |
| new ui-app-sidebar | `collapsed`, `side`, `width`, `min-width`, `max-width`, `resizable`, `resize-step`, `resize-label`, `breakpoint`, later `persist`; events `resize`, `toggle` | none | none |
| ui-reel | none | none | none |

## Sources

- Every Layout Sidebar: https://every-layout.dev/layouts/sidebar/
- Every Layout Stack: https://every-layout.dev/layouts/stack/
- Every Layout Switcher: https://every-layout.dev/layouts/switcher/
- Every Layout Cluster / Center / Reel / Grid (paywalled; props from memory): https://every-layout.dev/layouts/cluster/ , https://every-layout.dev/layouts/center/ , https://every-layout.dev/layouts/reel/ , https://every-layout.dev/layouts/grid/
- Web Awesome flank: https://webawesome.com/docs/utilities/flank/
- Web Awesome split: https://webawesome.com/docs/utilities/split/
- Web Awesome split panel: https://webawesome.com/docs/components/split-panel/
- Web Awesome drawer: https://webawesome.com/docs/components/drawer/
- MUI Drawer API: https://mui.com/material-ui/api/drawer/
- MUI Stack / Grid / Container: https://mui.com/material-ui/react-stack/ , https://mui.com/material-ui/react-grid/ , https://mui.com/material-ui/react-container/
- Vuetify VNavigationDrawer source: https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/components/VNavigationDrawer/VNavigationDrawer.tsx
- Vuetify grid / slide group: https://vuetifyjs.com/en/components/grids/ , https://vuetifyjs.com/en/components/slide-groups/
- Quasar QDrawer: https://quasar.dev/layout/drawer
- Quasar flex grid: https://quasar.dev/layout/grid/introduction-to-flexbox
- Mantine Group / SimpleGrid / AppShell: https://mantine.dev/core/group/ , https://mantine.dev/core/simple-grid/ , https://mantine.dev/core/app-shell/
- Mantine Stack / Center / Container: https://mantine.dev/core/stack/ , https://mantine.dev/core/center/ , https://mantine.dev/core/container/
- Chakra Wrap / Drawer: https://chakra-ui.com/docs/components/wrap , https://chakra-ui.com/docs/components/drawer
- Chakra Stack / SimpleGrid / Container / Center: https://chakra-ui.com/docs/components/stack , https://chakra-ui.com/docs/components/simple-grid , https://chakra-ui.com/docs/components/container , https://chakra-ui.com/docs/components/center
- Radix Themes Flex / Container / Grid: https://www.radix-ui.com/themes/docs/components/flex , https://www.radix-ui.com/themes/docs/components/container , https://www.radix-ui.com/themes/docs/components/grid
- React Spectrum Flex / Grid: https://react-spectrum.adobe.com/react-spectrum/Flex.html , https://react-spectrum.adobe.com/react-spectrum/Grid.html
- PrimeVue Splitter / Drawer: https://primevue.dev/splitter/ , https://primevue.dev/drawer/
- shadcn/ui Sidebar (reference): https://ui.shadcn.com/docs/components/sidebar

Fetched this session: EL Sidebar/Stack/Switcher, WA flank/split/split-panel/drawer, MUI Drawer API, Vuetify drawer source, Quasar drawer, PrimeVue splitter/drawer, Chakra wrap/drawer, Radix flex/container, Mantine group/simple-grid/app-shell, shadcn sidebar. The remaining per-library prop details come from prior knowledge of the official docs and should be spot-checked before implementation.
