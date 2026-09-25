# Changelog

## v0.12.9

- Combobox `selectedValues` controls a `multiple` combobox's selection by option value, so a form field
  with a fixed option list can start from data and stay bound: Vue `v-model:selected-values`. Each value
  shows as a badge with its option's label and submits under `name`. Adding or removing one, by
  pointer, keyboard, or badge, reports `selected-values-change` (`{ selectedValues, trigger }`) with
  the new list; setting it reports nothing. Uncontrolled `multiple` and `items` work as before.

## v0.12.6

- Avatar takes `active`: a ring in the success colour (`--ui-avatar-active-ring`) for someone active
  now, such as editing the same page. It is an outline, so it survives the circle's clip and the
  overlap in an Avatar Group. The ring is not announced; say what it means in `alt`.
- Avatar takes `size`: `md` (2.5rem, the default) or `sm` (1.75rem, smaller initials) for a row of
  people in a toolbar or header.

## v0.12.5

- `@nextwebwg/html-next` is pinned to `1.0.0-alpha.5` instead of `^1.0.0-alpha.5`. A caret range on a
  prerelease admits later alphas, and the next one is expected to replace the root `as` form that
  Button and Nav Item are compiled from; Looma moves to it, with both components rewritten, in one
  release.

## v0.12.4

- New: Nav Item (`ui-nav-item`, Vue `NavItem`), one destination in a side or rail navigation: a
  `leading` icon, the label, and an optional one-line `description`, each line ending in an
  ellipsis. Like Button, `as="a"` with `href` makes it a real link (`target` and `rel` pass to it),
  and without it it is a `button type="button"` for switching views. `current` sets `aria-current`
  (`page`, or `current="step"` / `"location"`) and draws the selected surface, a stronger label, and
  a solid bar on the inline-start edge that mirrors in right-to-left pages and stays in forced
  colors. Hooks: `--ui-nav-item-indicator-width`, `--ui-nav-item-indicator-color`, and
  `--ui-nav-item-current-surface`. Group items in a native `nav` and a List; there is no wrapper.
- Icons: `truck`, `receipt`, `credit-card`, `book-user`, `settings`, `users`, `layout-dashboard`,
  and `calculator`, from Lucide.
- Icon draws a shape's `line` elements. `italic`, `strikethrough`, and `underline` were missing
  strokes in `ui-icon`, and the new `credit-card` and `calculator` need them.

## v0.12.3

- Badge sizes to its label wherever it sits. In a browser with `text-box-trim` it was a block, so in
  a plain block container (a table cell's `div`) it stretched to the container's full width; it is
  now an inline-block, which still centres the glyphs and still stops at `max-width: 100%`.
- A neutral Badge has no outline. Its border was a grey mix of the secondary text colour, while
  every other tone's border is its own fill; the neutral border is now its fill too, in both
  variants. Forced colors still draw the edge of every badge.

## v0.12.2

- Input Group: the focus ring shows when the input inside is focus-visible, as a lone Input's does,
  and turns danger-coloured on an invalid input. The frame reads the shared control tokens with a
  lone Input's fallbacks (its resting border was lighter, and its hover darker) and is a lone
  Input's height (it was 2px taller). A disabled input fades the frame without the `disabled` prop.
- Input Group: a click or tap on an affix, or anywhere in the frame, focuses the input without
  selecting the affix or moving the caret, and does nothing when disabled. A text affix is the
  input's accessible description, merged with any `aria-describedby`, and is hidden on its own so
  it is read once; the label stays the name.
- Input: with forced colors, which drop box shadows, the focus ring is an outline
  (`--ui-input-focus-outline`). New hooks `--ui-input-border-width` and `--ui-input-min-block-size`.
- Form Field in Vue links its help and error text to the control as its description. Named slots
  carry no `slot` attribute there, so the field did not find them.

## v0.12.1

- Input Group takes an `action` slot: one button at the end of the field, inside its border, for the
  one thing the field is for ("Continue" after a site's address). A small button keeps the field at
  its usual height. The group's focus ring now follows the field's focus, not the action's.

## v0.12.0

- Sidebar drawer: opening or closing it no longer overflows the call stack. The sidebar reports
  each change with its own `toggle` event, which shares the popover's event name and bubbles, so
  its handler for the popover's toggle heard its own report and reported again, forever (a
  `RangeError`, and a flood of `open: false` for Vue `@toggle`). It now answers only the popover's
  own ToggleEvent, so each open and close is one `toggle` event, with or without a `width`.
- Editor: a rule test keeps every default slash command's icon in `ui-icon`'s catalog, and the
  heading commands' icon names are type-checked rather than cast. Before v0.11.0 most of them
  (Heading 2 and 3, the lists, the callouts, the code blocks, Divider, Image) drew an empty box.
- Radio, Checkbox, and Switch take a `description` slot: a line under the label saying what the
  choice means. It is the input's accessible description, not part of its name. Apps were putting
  the label and the explanation side by side in the default slot, where they ran together.
- A disabled Button or Icon Button keeps its own look and is washed out by one filter,
  `--ui-disabled-filter` (`saturate(0.2) contrast(0.75) brightness(1.25)`; the dark theme dims
  instead, and high contrast only drops colour). Override per component with
  `--ui-button-disabled-filter` or `--ui-icon-button-disabled-filter`. Breaking: the recoloured
  disabled tones are gone, and so are Icon Button's `--ui-icon-button-disabled-text`, `-surface`, and
  `-border` hooks and Button's link-variant use of `--ui-button-disabled-text`.

## v0.11.6

- Only a link-style Button takes the touch hit area added in 0.11.5. On every button it reached over
  close neighbours (a small button just below another took presses meant for it); a boxed button
  already grows to the control minimum under a coarse pointer.

## v0.11.5

- Under touch input, a Button's press lands within the control minimum (44px) through an invisible hit
  area centred on it, as IconButton's does. A standalone link-style button, such as a "See all" beside
  a heading, was a smaller target than the rest.

## v0.11.4

- A link in running Text or a Callout is underlined, so it stands apart from the words around it by more than
  colour (WCAG 1.4.1).
- A Form Field's error reads in the danger colour. It used the accent colour, so an error looked
  like a link.
- An invalid input inside an Input Group marks the group's one border, not a second red border inside
  it. Input's invalid border and focus ring take hooks (`--ui-input-invalid-border`,
  `--ui-input-invalid-focus-shadow`), documented on the Input page.

## v0.11.3

- Tree marquee: every name slides at the same speed. The duration was clamped between 1.4s and 10s,
  so a name only a little too long crawled and a very long one rushed.

## v0.11.2

- New: Input Group (`ui-input-group`, Vue `InputGroup`), an Input with fixed text before or after it
  (`prefix`, `suffix`), such as a domain after a site's name. The group draws one border and one
  focus ring around the input and its affixes; the input inside keeps its form behaviour.
- List `density="compact"` sets a short list of facts close together, with no row padding, such as
  the features a plan includes.

## v0.11.1

- New: Action Bar (`ui-action-bar`, Vue `ActionBar`), the action row of a form or dialog, which
  places each action by what it does: `primary` (the one commit, a solid button) ends the row,
  `secondary` (also the default slot) sits just before it, and `tertiary` (Back, Cancel, a safe
  Discard) waits at the start edge. Logical edges mirror in right-to-left pages. Below 24rem of its
  own width it stacks full width, primary on top. Source and Tab order are tertiary, secondary,
  primary at every width. It only arranges; the buttons keep their own variants and tones.
  `--ui-action-bar-gap` sets the space between actions. It fills a dialog's `actions` footer.

## v0.11.0

- New view primitives, so a product's views are composed of components and style nothing of their
  own:
  - Text (`ui-text`): running text on the type scale in a tone that says what it is (default,
    secondary, muted, accent, danger, success), with `eyebrow` and `code` variants and `truncate`.
  - Page Header (`ui-page-header`): a view's one `h1`, with `leading`, `eyebrow`, `description`,
    and `actions`; `align="center"` for a standalone card.
  - Section (`ui-section`): an `h2` heading, description, actions, and content; `card`, `divided`,
    and a `danger` tone.
  - Status Message (`ui-status-message`): the one way to say loading, empty, or failed, with an
    optional action; `panel` and `fill` layouts; status and alert roles.
  - Spinner (`ui-spinner`), Card (`ui-card`: outlined, subtle, elevated), Description List
    (`ui-description-list` and `ui-description-item`: rows on a shared column, or tiles),
    Breadcrumbs (`ui-breadcrumbs` and `ui-breadcrumb-item`), and Cover (`ui-cover`), a layout
    primitive that centres a view's one card.
- Icons: `arrow-left`, `chevron-right`, `file-text`, `folder`, and `loader`. `ui-icon` drew from a
  hand-copied catalog that had fallen behind Looma's icon set (`bold`, `info`, `list`, and more drew
  nothing); it is now generated from `LOOMA_ICONS`, and a rule test keeps the two equal.
- Controllers find related parts by public contract, from their root: menu items by
  `role="menuitem"`, tree rows by `role="treeitem"`, radio groups by `role="radiogroup"`, never by
  the `data-component` styling marker. A rule test forbids implementation markers in controllers.
- Avatar Group rings each avatar in the surface colour and overlaps by 0.5rem, so initials stay
  whole.
- Storybook renders every component's own examples, so its stories cannot drift from the
  components: several showed a native control inside the component that draws its own (two
  checkboxes, a button in a button). Every component now has a story. The editor table playground,
  a Vue-only story in the vanilla Storybook, is removed.

## v0.10.12

- New: List (`ui-list`, Vue `List`) and List Item (`ui-list-item`, Vue `ListItem`), one shape for
  every entry a view lists: `leading` (an icon), the title (default slot), a one-line
  `description`, and `trailing` (a button or badge). Title and description are one line each and
  end in an ellipsis, so every item has the same height. A link in the title is the whole item: the
  icon and padding follow it, the item takes its hover surface and focus ring, and it stays a real
  link (router links and "open in new tab" work); a trailing control keeps its own clicks.
  `variant="card"` draws the same parts on a bordered surface, `layout="grid"` sets cards in
  columns, and `current` marks the item you are in.

## v0.10.11

- Tree marquee: a name that fits beside a row's controls no longer scrolls. It was measured against
  the label box, which always fills the row, so any row with controls slid by their width.
- Tree marquee: a sliding name passes under the row's icon and fades out there, instead of being
  cut off at a hard edge beside it. The fade was written but the hover fade overrode it.
- Tree marquee: the name stops where the fade before the controls begins, so its tail is fully
  readable rather than half faded.

## v0.10.10

- New: Scroll Area (`ui-scroll-area`, Vue `ScrollArea`), a region that scrolls when its content
  outgrows it, vertically or (`orientation="horizontal"`) sideways, and fades each edge that hides
  content. Only an edge with content past it fades; the fade grows in with the distance scrolled;
  content that fits shows none. The fade is a mask drawn by a CSS scroll-driven animation, so it
  blends into any surface and needs no script. `--ui-scroll-fade-size` sets its reach (24px).
- Every Looma scroller fades its edges the same way: Sidebar's content, Reel, the editor toolbar's
  row, a Dialog's body, Search Shell's results, and the editor's slash and mention menus. The editor
  toolbar's fades were mattes in its own colour, 32px wide, driven by a script; they are now the
  shared mask, 24px unless `--ui-editor-toolbar-fade-size` says otherwise. A rule test holds every
  scroller to the shared fade; menus and popovers, whose scroller is also their bordered surface,
  are listed until they get an inner scroller.

## v0.10.9

- A single Combobox reports the chosen option in its declared shape. `value-change` passed the
  list's row, with its view-only `selected` flag, as `option`; the Vue adapter's event check
  rejected it, so choosing an option threw `HR002` and `@value-change` never ran. It reports the
  option as `add-item` and `options-change` do.

## v0.10.8

- A click inside a tree row's menu (an options menu in `actions`, say) is the menu's, not the row's.
  A leaf row followed its label link and a branch row toggled when a menu item was clicked, because
  only links, buttons, and form fields counted as controls; menu items, options, checkboxes, tabs,
  and the other interactive roles now count too.
- Avatar initials use the theme's subtle accent text on the soft accent surface, as a subtle accent
  Badge does. They used the solid accent, which a light accent leaves below text contrast.

## v0.10.7

- Multiple Combobox reports `options-change` with options in their declared shape. Its rows carried
  the list's view-only `selected` flag, which failed the event's type check; with a consumer that
  owns `query`, the failure happened inside Vue's update and stopped the component rendering, so an
  item created on Enter never appeared.

## v0.10.6

- A tree item's drag handle sits beside what it drags. A leaf row's handle takes the empty
  disclosure column right before its icon, where it used to sit outside the row, a column and an
  indent away (25px from a nested icon, now 7px). A branch's handle sits just outside its
  disclosure. The handle has no resting surface, which read as a faint patch, and takes the hover
  tint only when pointed at.

## v0.10.5

- Combobox with `allowCreate` highlights the offer to create what was typed when nothing else
  matches, so Enter creates it. In multiple mode, Enter with nothing highlighted commits the typed
  text as a token separator does (choosing an exact match, or creating). Before, only a separator
  such as a comma did.
- Multiple Combobox shows a consumer's changes at once: an option added while the list is open (the
  one just created, say) appears without another keystroke, and an item the consumer adds or removes
  is checked or unchecked in the list immediately rather than at the next search.

## v0.10.4

- A leaf tree row whose label is a link is that link everywhere a control is not: a click on its
  `leading` icon or its padding follows the link, with the same modifier keys, so a modified click
  still opens a new tab. Controls keep their own behaviour and a branch row still expands. This lets
  an icon live in `leading`, where it stays put while a long name scrolls with `marquee`, without
  shrinking the row's link to the name. The Tree page documents where icons and links go.

## v0.10.3

- `ui-tree` takes `marquee`: a name too long for its row scrolls while that row is hovered or
  focused, then returns. Off by default, set on the tree, and overridable per item. The distance
  counts the width the hover controls overlay, which is the part an app-side marquee could not see:
  measured against the label alone, a name that overflows only by the controls' width never scrolls
  at all, and a longer one stops with its tail still underneath them. A name that fits stays still,
  and reduced motion keeps the fade instead.

## v0.10.2

- In Vue, `v-model:value` on Radio Group hears each choice once. A choice is reported as both
  `select` and `change`, and the Vue adapter updated the model for each, so a handler bound to
  `update:value` ran twice for one click. The same holds for any component that reports one change
  through more than one event: the adapter now updates a modeled prop once per change. (HTML Next
  1.0.0-alpha.5.)

## v0.10.1

- The editor toolbar is always one row. When its controls outgrow the space it has, the row scrolls
  sideways instead of wrapping into several lines, and each edge that hides controls fades into the
  toolbar's own colour; a row that fits shows no fade. The fades are mattes over the row rather than
  a mask, so a floating toolbar keeps its border and shadow, and right-to-left rows fade the right
  edges. `--ui-editor-toolbar-fade-size` sets the fade's width (32px). `--ui-editor-toolbar-row-gap`
  is gone with the wrapping it spaced.

## v0.10.0

- Combobox shows its validation message in HTML too. The message hid while `validation.issues`
  had entries because the HTML runtime cannot read an array's `length`; Vue was unaffected.
- **Breaking:** a named Combobox submits its value, not the label shown in the field. The visible
  input no longer carries `name`; a hidden field does. Single mode sends one entry (the selected
  option's value, the typed text when `allowFreeText` is set and nothing is selected, or an empty
  string), and multiple mode sends one entry per chosen item's value, so `name="tags"` with two
  items submits `tags=alpha&tags=beta` rather than the input's leftover text. A disabled combobox
  sends nothing. Server code that read the label from the form must read the value instead. An
  unnamed combobox renders no hidden field.
- Radio Group's `required` works. It was declared but did nothing; now the group states
  `aria-required="true"`, marks each of its radios required, and native form validation fails until
  one is checked, as for a required native radio group. A radio's own `required` still counts.
- A disabled or read-only Combobox can no longer be cleared. Its clear and disclosure buttons are
  disabled with the rest of the field (the badges and help button already were), and a click that
  reaches them anyway changes nothing.
- Search Result Row's `selected` reaches assistive technology: the row's button states
  `aria-current="true"` as well as taking the highlighted surface. It had been visual only.
- Checkbox and Switch take `name`, passed to the native input, so they submit with a form: checked
  sends `name=value` (value defaults to `on`) and unchecked sends nothing, as a native checkbox
  does. Without it, neither could submit at all.
- Clicking from an Editable that is being edited into another field saves the edit and leaves focus
  in the field that was clicked. It had pulled focus back to the Editable a frame later, which
  closed a combobox list the click had just opened.
- A form's `reset()` returns every Looma control to its `value` or `checked` prop, in HTML and in
  Vue, as a native control returns to its default. Textarea had reset to empty, Select to its first
  option, Checkbox, Switch, and Radio to unchecked (in Vue, to whatever was last checked), Radio
  Group to no choice, and Combobox kept its selection while its field went blank. As with native
  controls, a reset fires no change events.
- Radio Group's `disabled` disables its radios through its native fieldset, so a radio disabled on
  its own stays disabled when the group is enabled. The group had re-enabled it.
- A required multiple Combobox is satisfied by its chosen items. Native validation had still
  required text in the input, so the form could not be submitted, and validation reported "A value
  is required." with items chosen.
- A browser test puts every Looma form control in a real form, in HTML and in Vue, and asserts the
  exact `FormData` entries it submits, what it leaves out (unchecked, disabled, the in-place
  Editable), and what `reset()` restores. A rule test fails when a control with a `name` prop or a
  native form control is missing from it.

## v0.9.2

- Every component option is documented where authors read it. The API tab shows each option's
  description beside its name (the generator had been dropping it), and 95 options that said only
  "tone token." or "Control size." now explain what they do, what each value means, and what they
  pair with. A polymorphic root is listed as an `as` option, so Button's `as="a"` appears in its
  API. A rule test fails on any option without a real description.

## v0.9.1

- The editor toolbar drops Checklist and Divider so it fits on one row at page width. Both remain in
  the slash menu, and typing `[ ]` or `---` still makes them.

## v0.9.0

- **Breaking:** Context Menu opens only on a context click: right-click, Shift+F10 or the Menu key
  on the focused target, or a touch long-press (about half a second, which iOS Safari needs since
  it fires no `contextmenu`). A plain click or Enter on the `for` element no longer opens it, and it
  no longer sets `aria-haspopup` or `aria-expanded` on that element. For a visible button that opens
  the same actions, pair a `ui-menu` with it.

## v0.8.1

- The editor's active-block marker is quieter. It steps aside while text is being typed and returns
  once typing pauses, instead of riding along with every keystroke. Focus moving to the editor's
  own toolbar or a menu, or leaving and coming straight back, no longer blinks it off. It fades in
  rather than snapping on (reduced motion makes that instant), and it is thinner and lighter by
  default: 1px in `--ui-border` rather than 2px in `--ui-border-strong`.
  `--ui-editor-active-block-width` and `--ui-editor-active-block-color` still set both.
## v0.8.0

- **Breaking:** the type scale derives entirely from `--ui-font-size`. `--ui-font-size-sm` is now
  `0.875 ×` the base instead of a second value a theme had to set, so changing the base moves every
  step together; a theme that set `--ui-font-size-sm` to anything else should drop it.
- **Breaking:** `--ui-font-size-ui` (15px at the default base) is gone. It sat one pixel from body
  copy and one from `sm`, so a tree label next to body text read as a near miss rather than a step.
  Tree items use `sm`; set `--ui-tree-item-font-size` to keep a different size.
- Components no longer hard-code font sizes. Form-field labels (were `0.95rem`), help and errors,
  small and large buttons, avatars, the avatar-group count, the table menus, the combobox label,
  and the slash menu's keyboard hints (were `10px`) take their size from the scale, so they follow a
  theme's base size. A rule test keeps new ones out.

## v0.7.4

- Badge takes `shape="tag"`: flat at the start and pointed at the end, the label silhouette Chip
  had before it was folded into Badge and lost in the move. `pill` stays the default.
  `--ui-badge-point` sets the point's depth; right-to-left text points the other way.
- A button can be a link: `as="a"` with `href` renders a real `<a>` that looks and responds
  exactly like the button in every variant, tone, size, and state, so an app never hand-styles a
  link to look like one. `target` and `rel` pass to the link. A link is a link to assistive
  technology — no `role="button"`, no `type`, no `disabled` — and a disabled one drops its `href`
  and states `aria-disabled="true"` with the disabled look, so it cannot be followed or focused.
  `as` is HTML Next's polymorphic root, so it works the same in HTML, the DOM factories, and Vue
  (`<Button as="a" href="…">`), and server-rendered output is the link itself.
- `type` is a declared prop (`button`, the default, `submit`, or `reset`), so a button keeps the type
  its author gives it now that a link has none. `aria-disabled` is set from `disabled`: a disabled
  link states it, and an author-supplied `aria-disabled` no longer passes through.
- Hover and press no longer test `:enabled`, which a link never matches; they test "not disabled
  and not `aria-disabled`", which is `:enabled` for a button at the same specificity. A button looks
  and responds as before.

## v0.7.3

- A disabled ghost button is a light wash of its tone again, in every tone. It was an opaque mix
  28% of the way from the page to the tone's hue, which reads light for accent but, for neutral,
  whose hue is the ink, came out a mid-grey slab louder than the enabled button. It now washes the
  faded tone the way hover washes the live one.
- Releases no longer push to `main`. The release job stamped the version into a commit and pushed
  it, which `main`'s pull-request protection rejects, so two merges never reached npm. Each job now
  rebuilds the same release commit in its own runner, and the release is recorded as an annotated
  `vX.Y.Z` tag after it publishes.

## v0.7.2

- The editor marks the block you are editing with a bar in the gutter beside it, so the caret's
  whereabouts survive looking away without putting a border or a fill around the text. Anything
  drawn around the reading column reads as a form field; the margin is the one place an editing
  cue can live without changing how the prose reads. The bar marks the outermost block rather
  than the caret's own line, which would move on every wrap, or a nested list item, which would
  step in and out of the list's inset. It is absent while the editor is unfocused.
  `--ui-editor-active-block-color`, `--ui-editor-active-block-width`, and
  `--ui-editor-active-block-offset` style it; a consumer that zeroes
  `--ui-editor-content-padding-inline` must leave the bar room on its own wrapper.

## v0.7.1

- The table context menu's `max-width` counts its padding and border, so the menu keeps to the
  footprint it promises rather than exceeding it by the padding.

## v0.7.0

- Colour comes from eleven seeds: five intents, two intent foregrounds, three surfaces, and the
  ink. Every neutral, hover, tint, border, and disabled colour is mixed from them, so a theme
  states those eleven and stops. Light, dark, and high contrast set the same set — dark dropped 18
  restated values, and high contrast keeps only the overrides it exists for. `docs/tokens` shows
  the seeds and what falls out of them.
- **Breaking:** buttons take a `tone` and a `variant`. Tone is the colour (accent, neutral, danger,
  success, warning, info) and applies to every variant; variant is the volume (solid, outline,
  ghost, link). A destructive secondary action is `tone="danger" variant="outline"` rather than a
  missing case. `variant="danger"` still resolves to a solid danger button, and the default tone is
  now `accent` rather than `neutral`.
- An outline is an outline: its tone at the edge over that same tone at 5%. It used to be a filled
  grey box with a white highlight, which read as a solid button and belonged to no palette. Every
  variant now shares one corner, edge, highlight, and shadow, and pressing moves the shadow inside
  instead of lifting the button.
- Disabled is derived from the tone it disables and mixed toward the page: a disabled danger button
  still reads as danger, a dark theme dims where a light one lightens, and each variant keeps its
  shape — a disabled outline is still an outline. A disabled ghost takes a light surface, since it
  has no hover to fall back on.
- **Breaking:** `ui-select` drops `multiple`. Multi-select is the combobox's job, and a multiple
  combobox now checks its options in place: chosen options stay in the list with a checkbox, toggle
  off when chosen again, and report `aria-selected` — which they never did while they were being
  removed from the list.

- A checked checkbox draws its tick again. Lowering expands a shorthand into longhands, and
  `border: solid var(--ui-text-on-accent)` came out with empty values, leaving the tick styleless
  and so zero-width.
- New `--ui-pressed` token: the counterpart to `--ui-raised`, for a control that takes its shadow
  inside while pressed.

## v0.6.5

- The converted Vue components share one controller host module instead of each carrying its own,
  so an app that uses several components ships less of them.

- The Vue components share one controller host and event dispatcher instead of repeating both in
  every component. Vue output is 31% less JavaScript (202 kB, from 293 kB), loaded as one shared
  chunk rather than 33 copies. Nothing in the public contract moves: props, events, slots, and
  exposed methods are unchanged, and the shared module is internal. Needs
  `@nextwebwg/html-next` 1.0.0-alpha.3, which generates it.

## v0.6.4

- Tree Item's hover actions overlay the end of the row instead of reserving a column, so a long
  label uses the full row width and fades where the controls begin. The disclosure chevron is
  tighter and aligns with the content above it.

## v0.6.3

- The editor toolbar labels its buttons with a Looma tooltip instead of the browser's `title`: one
  tooltip follows the row, waiting before the first button and moving immediately along it, and it
  shows on keyboard focus, which `title` never did.

## v0.6.2

- Combobox with `multiple` keeps the items it selects. It reported each choice and waited for the
  consumer to pass `items` back, so selecting an option appeared to do nothing. A consumer that
  sets `items` still owns them.
- Combobox's help affordance is a circled question mark beside the field, not a bare `?` inside the
  box, and it opens its tooltip on press. A control's box holds its value.
- Tooltip takes `trigger`: `hover` (also opens on keyboard focus), `click` for a help button where
  hovering a question mark says nothing, or `focus`.

## v0.6.1

Fixes for 0.6.0, found by a new rule that checks every token a stylesheet reads is defined.

- The editor's stylesheet still referenced tokens 0.6.0 renamed (`--ui-radius-1`/`-2`,
  `--ui-editor-toolbar-bg`, `--ui-space-1-5`). `var()` with no fallback is invalid when the name is
  undefined, so those radii computed as 0 and `--ui-editor-toolbar-surface` was ignored.
- Restored `--ui-font-size-xl`, `--ui-font-size-2xl`, and `--ui-line-height-relaxed`, which the
  editor's prose reads: 0.6.0 removed them as unread.
- The editor toolbar marks an active mark with a tint, not a solid fill. Solid is the strongest
  emphasis and means "this is the action to take"; a row of nineteen controls should not shout at
  rest. `--ui-editor-toolbar-active-surface`, `-text`, and `-border` set it. Each toggle now also
  reports `aria-pressed`.
- The pinned editor toolbar wraps instead of scrolling behind a hidden scrollbar, so controls that
  do not fit the text column stay reachable.
- Tokens that never matched their component are renamed: `--ui-layout-gap` is `--ui-stack-gap` and
  `--ui-cluster-gap`; `--ui-toast-enter-duration`/`-exit-duration` are
  `--ui-toast-region-enter-duration`/`-exit-duration`. Per-instance values the component sets
  itself (the insert-table grid's dimensions, the table swatch colours) are private.

## v0.6.0

Migrating a theme:

- Set the contract (about 40 values) and delete everything that restated a derived value: the
  `*-solid`/`*-soft` intent pairs, `--ui-surface-default`/`-elevated`/`-canvas`/`-hover`,
  `--ui-text-primary`, `--ui-font-family-*`, `--ui-font-normal`/`-semibold`/`-bold`,
  `--ui-space-5`/`-6`, `--ui-shadow-xs`/`-md`/`-xl`, `--ui-motion-base`. A converted product theme
  dropped from 104 declarations to 74, and a third of it was restating Looma's own derivation.
- Rename: `-bg`/`-color` component tokens are `-surface`/`-text`; `--ui-radius-1`…`-4`/`-xl` are
  `-sm`/`-md`/`-lg`/`-dialog`; `--ui-text-sm` is `--ui-font-size-sm`; `--ui-color-focus` is
  `--ui-focus-ring`; `--ui-tree-row-min-height` is `--ui-tree-item-min-block-size`.
- If you redefined an Icon Button per-size token (`--ui-icon-button-size-sm`/`-size-lg`), set
  `--ui-icon-button-size` on the element instead; the `size` prop resolves the default.
- If you want a disabled state other than the neutral default, set `--ui-disabled-surface` and
  `--ui-disabled-text` once, rather than per component.

- The editor's editing surface carries `role="textbox"` and `aria-multiline="true"` with its
  `label`. A name on a plain `contenteditable` div is prohibited by ARIA, which rc.1 tripped.
- Disabled is a contract decision: `--ui-disabled-surface` and `--ui-disabled-text` give every
  component the same neutral disabled state at full opacity, instead of each variant fading its
  own colours. `--ui-<component>-disabled-*` still overrides it.
- `tone="accent"` on Button tints an outline, ghost, or link button with the accent colour, for a
  secondary action that still reads as the primary path.
- The editor toolbar's `--ui-editor-toolbar-button-size` and `-mobile-button-size` work again:
  they set `--ui-icon-button-size`, which replaced the per-size tokens.

### Also in 0.6.0

Breaking: the theming surface. A product themes Looma through a contract of about 40 values; every
other global derives from them. See the entries below for the renames and removals.

- Editor: a `label` prop names the editing surface (default "Document"). Without it the text box
  had no accessible name, which fails WCAG 4.1.2.
- `--ui-surface-muted` and `--ui-radius-lg` are contract values, not derived ones: a palette with
  its own middle neutral, or a product that rounds large surfaces differently, sets them rather
  than accepting the derivation.
- Theming has a contract: about 40 `--ui-*` values (intent colour, neutrals, focus, type, space,
  radius, elevation, motion, and the shared control sizes) that a product sets to theme Looma.
  Every other global is derived from them, so a theme that sets only the contract stays coherent.
- The duplicate `oklch` palette is gone: one palette per theme, in the theme files.
- Removed the parallel radius and text scales: `--ui-radius-1`…`-4` and `--ui-radius-xl` are
  `--ui-radius-sm`, `-md`, `-lg`, and `-dialog`; `--ui-text-sm` was a font size and is
  `--ui-font-size-sm`; `--ui-color-focus` is `--ui-focus-ring`; `--ui-space-1-5` and
  `--ui-space-12` are gone.
- Tree Item's label cell stretches its slotted content, so a link in the label slot is the row's
  hit area instead of sizing to its own text.
- Light dismiss needs a press it can place: a pointerdown reporting no coordinates (assistive
  technology, or a synthetic event) no longer closes a dismissible overlay.
- `--ui-control-min-block-size` is `44px`, not `2.75rem`: WCAG counts CSS pixels, so a smaller root
  font must not shrink a touch target below the minimum.
- `density="compact"` on Menu, Tabs, Disclosure, and Tree: rows trade padding and type size for
  fit. Nothing has to rescale a global token to compact a menu any more. Menu Item reads
  `--ui-menu-item-padding-block`/`-padding-inline`, `-font-size`, `-radius`, and `-hover-surface`.
- One token vocabulary, `--ui-<component>[-<variant>][-<state>]-<property>`: `-bg` and `-color`
  become `-surface` and `-text` (Icon Button, Top Bar, Search Shell, Search Result Row, Editor
  Toolbar), and the state comes before the property (`--ui-button-ghost-hover-surface`,
  `--ui-button-link-text`).
- Tokens that restated a prop are gone: `--ui-icon-button-size-sm`/`-size-lg` (the `size` prop
  resolves the size; `--ui-icon-button-size` still overrides it on an element), and the Floating
  Action Button's colour and size family (it reads the accent and control values directly, and
  keeps `--ui-floating-action-button-inset-block-end`/`-inset-inline-end`/`-z-index`).
- Names that never matched their component are renamed or gone: `--ui-field-*`, `--ui-option-*`,
  and `--ui-multi-combobox-*` are `--ui-combobox-*`; `--ui-z-overlay` is
  `--ui-context-menu-z-index`; the tree's row tokens carry the name of the component that reads
  them (`--ui-tree-item-min-block-size`, `-font-size`, `-label-padding-block`/`-inline`).
- Every component colour token's fallback chain ends in a semantic token, and the dead literal
  fallbacks on global tokens are gone.
- A dark theme's intent tones take a dark foreground (`--ui-on-accent`, `--ui-on-danger`), since
  its solid tones are light.

- Editor: the formatting toolbar's Insert table opens its grid. The button toggled the picker and
  the popover anchored to it toggled it back on the same click.
- Tests: the editor's table and slash-menu UI is covered in the browser.

## v0.5.2

- The Vue components are converted by `@nextwebwg/html-next` (it replaces the deprecated
  `@nextwebwg/declarative-components`) and read as hand-written Vue: props by name, typed values
  with no helper object, `v-if`/`v-for` on elements, and dprint formatting.
- Breaking (types only): optional Vue props are declared `name?: T`, not `T | null`; pass
  `undefined`, not `null`, to leave one unset.
- `v-model:<prop>` works wherever an event reports a prop: `v-model:open` on Dialog, Menu, Context
  Menu, Popover, Tooltip, Disclosure, Search Shell, and Toast Region; `v-model:query` on Combobox;
  `v-model:checked` on Checkbox, Radio, and Switch.
- Select: `v-model` selects the model's option once the slotted options exist, and after
  hydration. It had shown the first option.
- Form Field: its label, help, and error regions are styled however they are slotted: `#label` in
  Vue as well as `slot="label"` in HTML.

- Icon Button: on coarse pointers and once touch input is used, an invisible hit area at least
  `--ui-control-min-block-size` square is centred on the button, so it is a touch target without
  growing visually.

- Tree Item: the label spans the row height and centres its content, and
  `--ui-tree-label-padding-block` / `--ui-tree-label-padding-inline` set its padding, so slotted
  label content such as a link can fill the row as its hit area.

- Search Shell: a dismissible shell closes on the first Escape, including from inside its search
  field (the browser otherwise spends that Escape clearing the field).
- Search Shell: the search region shows focus with an accent edge, themed by
  `--ui-search-shell-focus-color` (default `--ui-control-focus`).
- Button: `align="start"` lays content out from the start edge with start-aligned text (option
  rows such as a create chooser), and `stretch` fills the container's inline size.
- Popover: an anchor toggle dispatches one `open` or `close` with its real trigger. It had
  reported opens as `programmatic` and dispatched each anchor close twice.
- Dialog: the header close button is a touch target (`--ui-control-min-block-size`) on coarse
  pointers and once touch input is used.
- Tree Item: drop feedback (the inside highlight and the before/after insertion indicator) styles
  only the target row, not every row nested in an expanded container.
- Tests: Tree drag and drop is covered in the browser (reorder detail, inside drops and
  hover-expand, indicators, max-depth and accepts rejection, the full-row drag image).

## v0.5.1 Candidate

- Button: a ghost button reads `--ui-button-ghost-text`, not `--ui-button-text`, so theming the
  outline text leaves ghost buttons alone.
- Button and Icon Button: disabled styling is themable. `--ui-button-disabled-opacity`,
  `-surface`, `-border`, and `-text`; `--ui-icon-button-disabled-opacity`, `-bg`, `-border`, and
  `-color`. Unset, each falls back to the variant's own colours at 0.6 opacity, as before.
- `@threadlabs/looma/vue` exports `trackInputModality(document)`. Call it once on the client so
  touch sizing (`html[data-ui-input-modality="touch"]`) applies app-wide after the first touch;
  Tree Item still starts it on mount.

## v0.5.0 Candidate

Breaking: Looma is one package built from one set of component definitions.

- The Vue components are converted from the definitions by HTML Next and contain no HTML Next
  runtime: each renders its native root with Vue. Import their styles once from
  `@threadlabs/looma/vue.css`. Input, Textarea, and Select keep `v-model`.
- Components follow the styling model of the Declarative HTML Components proposal: styles are
  scoped to each component, customization is through `--ui-*` custom properties, and a component's
  props are styled through its own state, not reflected `data-*` attributes.
- Removed: `@threadlabs/looma/core`, `/layout`, `/loader`, `/core/declarative`,
  `/core/declarative-generated`, and the `layout.css`, `styles.css`, and `editor.css`
  stylesheets. Component styles ship with each component; `tokens.css` and the themes remain.
- `@threadlabs/looma` registers every component (layout and editor included) for HTML pages;
  `@threadlabs/looma/components/*` are the component files for pages without a build.
- Chip, deprecated since 0.3, is removed; use Badge.
- A consumer's attributes on a component win over the component's own (a `type` on a Button,
  for example), and a consumer's `class` is kept.
- Fixes: Menu items take keyboard focus; the Floating Action Button no longer stretches to the
  viewport width; toasts authored inside a Toast Region show while `open` is set; the context menu
  is one surface; checkbox, radio, and switch events report keyboard and pointer triggers.

## v0.4.0 Candidate

Breaking: `@threadlabs/looma/react` and `@threadlabs/looma/svelte` are removed.
React support is in development: it ships once HTML Next converts components to
React without its runtime. The optional `react` and `svelte` peer dependencies
are removed with them. The documentation shows HTML and Vue examples only.

## v0.3.1 Candidate

- Vue Input, Textarea, and Select support `v-model` (`modelValue` and
  `update:modelValue`, from the native `input` event, or `change` for Select).
- Vue handlers for native `input` and `change` events receive the event itself;
  component events still receive their `detail`.
- Select renders its authored `<option>` children in every adapter: HTML Next
  parses `<select>` content by the HTML Standard's rules.
- Tree Item has a `label` slot: content such as a link replaces the label text,
  while `label` stays the item's accessible name and names its disclosure and
  drag handle. Framework adapters also render declared text (`$value`) directly
  instead of filling it in after mount.

## v0.3.0 Candidate

Breaking: Looma components are HTML Next declarative components. Each
`ui-*` invocation lowers to its native root (`<button>`, `<input>`, `<dialog>`,
and so on); no custom elements are registered.

- Props are HTML attributes. Values are typed by HTML Next's type system;
  `list`, `record`, and `object` props are written as JSON attribute text.
  Components no longer expose JavaScript properties on their roots, and only
  props an author supplies are reflected as `data-<name>`.
- Attributes written on an invocation, including `class`, `style`, `id`,
  `type`, `name`, and `aria-*`, land on the native root.
- Components read their public `--ui-*` tokens with fallbacks instead of
  redeclaring them, so tokens set on an ancestor apply (for example
  `--ui-dialog-viewport-gap: 0` for an edge-to-edge dialog).
- Button gains `variant="link"`: an inline text action with no box, the
  inherited font, an underline that strengthens on hover, and a focus ring.
- Rebuild `ui-sidebar` as the sidebar panel only (an `<aside>`), no longer a
  two-pane layout: `width`, `resizable` with bounds, `collapsed`, and below its
  `breakpoint` an off-canvas drawer; a `commandfor`/`command="--toggle"` button
  toggles it, reported by a `toggle` event.
- Rename `ui-center` to `ui-container` (Vue, React: `Container`): a centred column
  with a maximum width and gutters.
- Rename `ui-inline` to `ui-cluster`. A cluster always wraps and has no
  `wrap` or `justify` props.
- Combobox: drop function-valued hooks, option descriptions, and option
  metadata. Single selection uses `value`; multiple selection uses `items`.
  A selected value's label follows later changes to its authored option.
- Remove the Valibot field adapter and its optional peer dependency.
- Dialog gains a titled header with a close button, a scrolling body, and an
  `actions` footer. Toast Region gains `auto` and `duration`. Tooltip gains
  `inverse`. Tabs gain `stretch` and scroll on overflow. Icon Button gains
  `round`. Editable gains `hint` and `actions`.
- Tree Item `expand` no longer bubbles and never changes ancestors or
  siblings.
- Overlays resolve `for` targets that appear later, treat backdrop presses as
  outside presses, measure position without mid-animation transforms, and
  close correctly when `open` is `false`. Context Menu renders its menu inside
  its positioned surface and leaves focus alone after a light dismiss.
- High-contrast themes use high-contrast accent and danger colors.
- Server-rendered components hydrate into the same instance their authored
  markup lowers into, including slot content not yet shown, using HTML
  Next's rendered form (slot range markers and `serializeRenderedForm`).
  Framework adapters no longer write a `data-looma-managed` ownership marker,
  and Vue slot regions use the native `slot` attribute.
- A visual pass across controls: control and icon sizing, raised surfaces,
  focus halos, overlay elevation, and select and combobox affordances.
- Publish the component option audit, which records the options each
  component adopts after 0.3.

## v0.2.20 Candidate

- Preserve editor focus while table-overlay controls are pressed, so a managed
  overlay cannot replace the pointer target before its insertion click fires.

## v0.2.19 Candidate

- Project slash commands to the managed menu's display-only item contract,
  keeping internal keywords and executable callbacks out of component props.

## v0.2.18 Candidate

- Convert native editor suggestion rectangles to Looma's structural anchor
  contract before rendering managed mention and slash menus, preventing a
  mount-time validation error from freezing asynchronous results at loading.

## v0.2.17 Candidate

- Keep async mention suggestions current while a query is typed one character
  at a time, so fast input cannot leave the menu stuck in its loading state.

## v0.2.16 Candidate

- Preserve every Vue-owned TreeItem slot across SSR hydration when conditional
  controls precede the row regions, so folder icons, labels, actions, and
  children remain visible after declarative controller attachment.

## v0.2.15 Candidate

- Forward generated Combobox query, selection, creation, and focus events
  through Vue using its component-listener contract, so controlled queries no
  longer revert while typing and separator-driven item creation reaches apps.
- Preserve omitted controlled Boolean props as `undefined` in generated Vue
  adapters, so Editable, menus, disclosures, form controls, and tree items keep
  their documented uncontrolled behavior until an owner supplies state.
- Keep sole default-slot children direct in generated Vue roots, preserving
  native child-selector layout and measurements for Sidebar, Switcher, Reel,
  and other single-region primitives.

## v0.2.13 Candidate

- Preserve Vue-owned flow anchors during SSR hydration and make generated Vue
  roots reconcile their actual structure, so later conditional updates cannot
  shift labels, actions, children, or other projected content between regions.

## v0.2.12 Candidate

- Keep Vue-owned default-slot content in its intended component region across
  reactive updates, including labels beside named leading and action regions.

## v0.2.11 Candidate

- Preserve Vue-owned conditional content added after mount in named slots, so
  framework updates remain in the intended component region.

## v0.2.10 Candidate

- Preserve conditional framework subtrees during native-root attachment, so
  nested components in named slots remain intact, and keep hidden native roots
  out of layout.

## v0.2.9 Candidate

- Preserve Vue named-slot content when declarative controllers attach to native
  roots, and keep optional-region visibility synchronized with controller state.

## v0.2.8 Candidate

- Render conditional Vue tree-item controls directly so server markup hydrates
  without browser-parsed template nodes changing its child structure.

## v0.2.7 Candidate

- Preserve server-rendered framework component roots during package registration
  so adapters can hydrate without Looma rewriting their child structure first.

## v0.2.6 Candidate

- Interpret pasted HTML and Markdown document markup as editable structure while
  preserving programming-language source and explicit code-block paste as code.
- Keep paste as one Undo/Redo history step, make command availability reactive,
  and add an opt-in sticky desktop toolbar for always-visible editor controls.

## v0.2.5 Candidate

- Keep defined menu-item spacing on its single shadow-owned surface while
  retaining the styled pre-upgrade and no-JavaScript fallback.

## v0.1.28 Candidate

- Keep anchored popovers and menus inside visual-viewport gutters, falling back
  from native anchor placement when the rendered surface would overflow.
- Give popovers and menus one painted, scroll-owning surface and prevent
  pre-upgrade fallback chrome from surviving as a second wrapper after upgrade.
- Include dialog chrome in viewport sizing so compact modal content does not
  introduce avoidable nested scrolling.

## v0.1.27 Candidate

- Keep selected values to a single bounded line by default, including custom
  chip renderers, with an explicit CSS token for another finite maximum width.

## v0.1.26 Candidate

- Let multi-value combobox consumers opt into separator-driven token entry.
  Typing a configured separator commits an exact suggestion or creates the
  current query, clears synchronously, and keeps focus ready for the next item.
- Preserve unmatched text when creation is disabled, and forward the new
  `tokenSeparators` contract through the supported Vue adapter.

## v0.1.25 Candidate

- Add a domain-neutral `ui-editable` reveal primitive with explicit activation,
  outside-click dismissal, Escape handling, and predictable focus transfer.
- Add a controlled `ui-multi-combobox` for keyboard-navigable selected values,
  optimistic consumer updates, metadata, and custom item and option rendering.
- Extend Combobox composition with visually hidden labels, inline start content,
  popup footer content, and imperative input focus.

## v0.1.24 Candidate

- Add compact semantic `ui-chip` metadata and `ui-callout` primitives, including
  persisted editor callout nodes and Info, Note, and Warning slash commands.
- Make tree nesting structural, with derived accessibility depth and indentation,
  and add keyboard navigation that preserves slotted interactive content.
- Define controlled primitive state explicitly: omitted values use local defaults;
  supplied false and empty values remain controlled until the owner accepts a
  requested change.
- Generate typed Vue adapter props and emitted event details from the public
  component API, and fail CI when generated API metadata or declarations drift.

## v0.1.23 Candidate

- Add a domain-neutral smart combobox with contextual async suggestions, separate
  query/selection state, connected disclosure/help, rich options, and typed Vue models.
- Add Standard Schema field validation, a separate optional Valibot adapter,
  non-destructive display formatting, and scoped restrained typography hooks.
- Make tooltip descriptions accessible and optionally pinnable by click/touch,
  preserving hover/focus access and Escape dismissal.
- Expand closed tree targets before committing containment reorders, so moved
  items render immediately as the target's first child.
- Add optional hierarchy/subtree depth metadata, truthful disabled pointer
  feedback, and structured rejection events for known-invalid depth-limited drops.

## v0.1.22 Candidate

Nested sources keep parent-level outdent feedback current from their native
`drag` coordinates. This covers ancestor rows that cannot receive a new
`dragenter` because the gesture began inside their expanded subtree.

## v0.1.21 Candidate

Tree drop targets become active on native `dragenter`, so short gestures
can highlight and commit before Chromium emits a later `dragover`. Drop
feedback also survives transitions across a tree item's shadow boundary,
preserving nested insertion bars while folders open recursively.

## v0.1.20 Candidate

Short native tree drags complete at the item beneath the released pointer
even when Chromium ends the gesture without emitting `dragover` or `drop`.
Normal drops remain unchanged, while canceled and outside-tree drags still do
nothing.

## v0.1.19 Candidate

Tree insertion feedback stays aligned with the resulting hierarchy. Nested
sibling bars use the child level, while an `after` drop on an expanded folder
appears below its complete subtree. An `inside` drop is defined as the first
position in the target's compatible child list.

## v0.1.18 Candidate

The editor exposes a domain-neutral people-mention extension and an accessible,
bounded mention menu for static or asynchronous workspace providers. Context
menus keep keyboard focus inside their active top-layer surface, and table
row/column selectors rest as subtle centered bars that expand to full drag
handles on hover or focus.

## v0.1.17 Candidate

Menus, popovers, context menus, tooltips, and toast regions share one top-layer
windowing contract, so scrolling and clipping ancestors cannot hide them.
Native CSS Anchor Positioning is preferred for anchored surfaces; a lightweight
flip/shift fallback runs only while one is open. Tooltips wait for pointer
intent by default, expose configurable show/hide delays, and still open
immediately for keyboard focus.

Trees default to compact 32px rows and a 15px dense-interface text token, then
animate to 44px targets only after real touch input. Looma's default sans font
uses the native system UI stack. Controlled Vue editor updates preserve an
active ProseMirror selection without stealing focus from another control.
The editor and interactive Storybook table picker use the same anchored,
light-dismissible popover instead of hand-positioned floating panels.

## v0.1.16 Candidate

Vue adapters preserve Stencil's hydration marker across consumer class updates,
so responsive rerenders cannot leave already-rendered components invisible.
This candidate supersedes `0.1.15` for Vue consumers using the new semantic tree
components.

## v0.1.15 Candidate

Applications can build semantic, themeable trees with consistent disclosure,
selection, indentation, and contextual action slots. Pointer reordering uses
the complete row as its drag image, mutes the source in place, distinguishes
capped before/after insertion from container drops, and expands closed targets
after deliberate hover intent.

The public core also exposes reusable drop-position, drag-image, and hover-intent
utilities. Looma filters incompatible and descendant targets before showing a
move cursor or visual preview; applications retain data, authorization,
domain-specific validation, keyboard/touch action menus, and persistence.

## v0.1.14 Candidate

The turnkey Vue editor accepts provider-neutral image upload metadata
and resolve responsive rendition attributes at render time without persisting
CDN URLs in editor JSON. Image activation is accessible in editable and
read-only modes, failed renditions fall back to the stored master once, and
failed uploads can retry the same `File`.

Hosts retain control over image storage, CDN policy, viewer presentation, and
telemetry through typed callbacks and events. Looma owns only the reusable
editor interaction and delivery seam.

## v0.1.13 Candidate

Release qualification compiles and executes the exact public consumer
fixture against the packed facade before npm publication. The fixture uses the
typed `heading-1` Lucide key, so icon-contract drift is caught before immutable
package bytes reach the registry. Its Tiptap core, PM, and Vue dependencies are
also aligned on the same supported 2.27 line for a complete SSR consumer graph.

## v0.1.12 Candidate

The turnkey editor separates table discovery from editing: hovering a cell
reveals its row and column handles before focus, while selecting it adds the
cell-action menu and table toolbar. Column resizing stays anchored to compact
112px-minimum cells, and wide tables scroll as one surface on narrow screens.

Editor controls share an opinionated, typed Lucide icon registry and
token-driven ghost-button treatment. The insert-table picker preserves a
committed size while previewing hover choices, the mobile slash menu selects
the intended block type, and Storybook exercises the real editor instead of
fixed interaction states.

## v0.1.11 Candidate

Empty body cells expose reliable column-resize handles in the turnkey Vue
editor and the standalone Looma table extension. Tiptap's structural cell
minimum matches Looma's rendered 112px minimum, and its inward boundary probe
stays inside empty cells so a direct hover can begin a real column drag.

## v0.1.10 Candidate

The turnkey Vue editor anticipates table actions with contextual guide dots,
near-hover insertion and selection controls, direct-hover tooltips, exact
merged-cell geometry, and reliable column dragging. Row, column, and cell
selection can reach background, merge, split, clear, and logical-boundary
insertion commands without giving up normal text editing.

Core also introduces a themeable `ui-affordance-scope` and shared virtual
proximity coordinator. One listener and one animation-frame batch per scope can
reveal overlapping nearby actions without adding invisible hit targets, while
touch and keyboard paths retain visible controls. Mobile editor controls use one
scrollable, snap-aligned dock, and wide tables scroll as a whole around
minimum-width cells.

## v0.1.9 Candidate

The Vue `Sidebar` adapter declares its custom-element-owned light-DOM resize
handle as an expected hydration difference. Nuxt and other server-rendered Vue
applications can use the resizable sidebar without false hydration mismatch
errors while retaining the pointer, keyboard, and persistent-width behavior
introduced in `0.1.8`.

## v0.1.8 Candidate

The `ui-sidebar` layout primitive supports opt-in pointer resizing with
configurable bounds and durable local-storage persistence. A visible separator
handle exposes the same adjustment through keyboard controls, including Home,
End, and arrow-key steps, so resizing does not depend on precise pointer input.

## v0.1.7 Candidate

Mobile editors use the visual viewport when the software keyboard is open.
The turnkey Vue editor presents exactly one touch-scrollable, snap-aligned dock
above the keyboard, switches that dock between formatting and table actions,
and provides a clear route back to formatting. Slash commands and table menus
remain inside the visible viewport.

Narrow tables retain useful cell widths inside a horizontal scroll wrapper;
desktop table boundaries keep their hover insertion and drag-resize affordances.
The dialog primitive can also forward an accessible label directly to its native
dialog surface, avoiding nested application dialog shells.

## v0.1.6 Candidate

Table editing keeps structural and appearance controls available during cell
selections. The table toolbar exposes cell backgrounds and explicit merge/split
actions, row-boundary hover reveals insertion controls, column boundaries retain
drag resizing, and final paragraphs no longer add trailing space inside cells.

Vue consumers can use `LoomaEditor` as a complete editor whose formatting,
slash-command, upload, focus, and table-control behavior is owned by Looma.
Existing Tiptap editors can adopt the same table behavior independently through
`LoomaTableKit` or `getLoomaTableExtensions()`. All editor controls resolve through
Looma semantic tokens so host theme overrides style the entire editor consistently.

All workspace packages and repository fixtures share the release version so
build and test output cannot misleadingly report an older internal version.

## v0.1.5 Candidate

Measured `ui-center` surfaces retain horizontal auto margins after Looma's
light-DOM reset, so they center inside wider parents instead of sticking to the
inline-start edge.

## v0.1.4 Candidate

Layout and common overlay surfaces preserve their intended display modes
through Looma's light-DOM reset and stay within narrow or safe-area-constrained
viewports. Grid minimums collapse without horizontal overflow, centered content
remains fluid, mobile search fills the dynamic viewport, and fixed controls,
menus, popovers, tabs, and dialogs have explicit responsive bounds.

The layout package also adds intrinsic `ui-switcher`, `ui-sidebar`, and
keyboard-focusable `ui-reel` primitives, with matching Vue, React, and Svelte
adapter exports.

Property-controlled dialogs use their rendered `data-open` state for host
visibility, matching framework adapters that set the `open` property rather
than reflecting an HTML attribute.

## v0.1.3 Candidate

Buttons expose a typed `outline`, `solid`, `destructive`, and `ghost`
appearance contract with a more distinctive default theme. Editor consumers
gain a reusable floating toolbar frame, compact table menus, precisely aligned
table-edge insertion controls, and outline-free table editing.

## v0.1.2 Candidate

Table context menus stay within the browser viewport when opened near an
edge, so every available table action remains reachable without requiring a
larger viewport.

## v0.1.1 Candidate

Looma Release 1 publishes one installable package with the same supported
subpaths introduced in `0.1.0`. The editor dependency contract is corrected so
the concrete Tiptap extensions used by Looma's preset ship inside the editor subpath;
consumers provide only their compatible Tiptap core or framework lifecycle
package. The protected release proof also runs its external SSR consumer on the
declared Node 20 runtime.

`0.1.0` reached npm during the first publication rehearsal but failed the clean
public-consumer gate. It is superseded by this Candidate and is not a supported
Release 1 artifact.

## v0.1.0 Candidate

> Deprecated: the package omitted runtime dependencies required by its editor
> entry. Use `0.1.1` or the `candidate` tag after qualification completes.

Looma Release 1 defines one Candidate package for direct custom-element consumers
and supported Vue 3 applications:

- `@threadlabs/looma` and `/core` expose the core web-component and overlay surface.
- `/layout` exposes light-DOM layout primitives.
- `/editor` and `/editor/extensions` expose editor elements and optional Tiptap helpers.
- `/vue` exposes the supported Release 1 adapter.
- Explicit `.css` subpaths expose tokens, themes, layout, core, and editor styles.

Candidate means this package is installable and qualified for its documented
surface, while APIs may still change before Stable. It does not imply completion
of the component roadmap or Stable support parity.

Editor table actions preserve document data and have keyboard and accessibility
coverage. `E-TBL-003` remains an accepted Candidate visual-polish limitation;
data loss or corruption is not accepted. React and Svelte adapters remain
deferred repository previews and are not part of this release.

Install the package through the npm `candidate` dist-tag and follow
the [Getting Started guide](https://threadlabs-studio.github.io/looma/docs/getting-started)
and [Candidate support boundary](https://threadlabs-studio.github.io/looma/docs/release-1-support)
before adoption.

```sh
pnpm add @threadlabs/looma@candidate
```
