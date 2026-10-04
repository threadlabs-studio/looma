# Changelog

## Unreleased

- Tooltips and popovers follow moving controls so hints do not cover their triggers.
- Column-resize hints stay inside fitting tables, including narrow screens and larger text.

- Repeated component rows use inline text expressions; the updated converter emits the same direct Vue bindings as `$value`, without per-row text components.
- Contextual formatting gives slash-command and mention suggestions priority, so their results remain clickable.
- Trees retain a keyboard entry point when row controllers load later or a hidden tree becomes visible, preserving the last focused row.
- Contextual editor controls stay inside the document area rather than covering actions above it; link actions share that surface without covering formatting commands.

- Component text uses `{$variable}` for inline values and slot fallbacks. IDs and accessible labels use `concat()`; Intl `format()` is reserved for localized presentation.
- Meters without `valueText` announce a whole percentage in the current browser or server locale, so assistive technology reads the appropriate digits and spacing. Explicit `valueText` stays verbatim, and fill widths remain locale-independent CSS percentages.
- IconButton can match an adjacent Button’s height with `matchButton` (`match-button` in HTML), including themed sizes and touch controls. Compact icon buttons keep their existing sizes.

- Touch tree rows keep labels separate from actions after tapping, including RTL and multiple selection.
- Touch input text stays readable inside small captions without disabling browser zoom.
- Editors can opt into a contextual toolbar with full commands at a focused caret or text selection; the existing mobile dock remains unchanged.
- Resizing a table column no longer adds a one-pixel scrollbar when the drag ends. Repeated reconciliation keeps fitting tables within the editor and preserves scrolling for wide tables.

- Badge and combobox chip labels retain room for their full text, including descenders, while long labels still ellipsize.
- Long badge and combobox chip labels truncate with an ellipsis inside their surface, preserving their full accessible text.
- Radio Group's value consistently owns initial selection and form-reset selection in HTML and Vue, even when a child Radio is authored checked. The disabled example declares its selection on the group.

- Combobox can highlight a sole authored suggestion and commit it with Tab while preserving normal focus movement. Both behaviors are opt-in.

- Trees can reserve guided move activation for keyboard and touch, leaving desktop grips drag-only. Guided moves offer a visible standard Cancel button, Escape, and source-handle cancellation without changing order.
- Navigation disclosure labels, icons, and carets stay neutral when expanded; selection color remains reserved for current destinations.

- Sidebar resize handles report the requested width while layout animation settles, including when restoring a saved width.

- Disclosures can require one named-group member to stay open, animate bounded fill transfers, and rotate custom indicators without replacing them. Navigation headers and Nav Items share icon columns, spacing, and hover treatment; Nav Items support a trailing slot. Navigation icon columns now keep the body-size width at either density rather than shrinking compact icons below their neighbours.
- Feedback, reveal, and layout motion derive from shared duration and easing tokens. Docked sidebars animate occupied width, keep their content canvas stable, disable hidden controls, and support a collapsed-width hook for a separate rail. Drag resizing remains immediate and reduced motion disables transitions.

- Badge supports a rounded square for icon marks beside headings, using the existing semantic tones and shared spacing and radius tokens.

- List Items can wrap full titles and descriptions on narrow screens while preserving one-line rows by default. The shared icon catalog includes a notification bell.

- List Items can highlight several new items with a quiet accent wash without announcing a current or selected destination. Badges support a small dot shape with an accessible state label.

- Single-selection trees report a row’s default action on click or Enter, including an already selected row; selection and activation remain separate events.

- On phones, Link stays available during a held press and its picker keeps the toolbar anchor while its field has focus.

- Small Scroll Areas leave room after three compact results for the overflow fade, keeping the third location readable.

- Compact search results keep their title and location together when app buttons inherit body typography, so three rows fit before scrolling.

- Borders, dividers, emphasis edges, and keyboard focus now follow shared semantic width tokens across components and the editor.
- **Visual default change for selected rows (0.23):** navigation, trees, lists, search results, and choices share a faint accent surface, readable accent text, and selection corners. Nav Item keeps regular label weight and has no stripe by default; `variant="line"` provides a square, continuous edge marker. The previous rounded surface and inset stripe combined incompatible edge treatments; the surface default works alongside other row selections, while apps that need an edge explicitly choose `variant="line"`. Existing instance hooks remain available.
- Nav Item supports compact rows. The icon catalog includes compass and history icons.

- Disclosure can fill the available height in a bounded accordion, keeping its header visible while a nested Scroll Area scrolls. Its indicator slot accepts a custom decorative icon.

- Link pickers use standard fields, flat rich search results, and primary/secondary actions. With a destination search provider, one field searches or accepts a pasted full URL without switching modes. Existing-link actions use the same controls and UI font. Compact results show three rows before scrolling. Link is available from selected text, and `linkBaseUrl` makes newly inserted same-origin links relative across picker and paste flows.

- Typing `/link` opens the editor's link picker, including host-supplied destination search when available.
- Editor links can search host-provided destinations separately from website URLs. Existing links show the destination's full address or resolved title, with clear edit, remove, and open actions.
- Tooltips now close immediately when another tooltip, popup, dialog, Search Shell, sidebar drawer, toast, or editor toolbar opens, including while a delayed tooltip is queued. Nested modal dialogs keep one visible backdrop and closing a child leaves its parent open.
- Editor selection and link toolbars escape clipped containers. The editor guide now shows how sticky and selection toolbars behave, and Input Group gives fixed affixes a neutral surface and divider.

- Looma now uses HTML Next alpha.19. Its controllers read declared props through `host.props.<name>.value`, matching HTML Next’s separate prop handles. This preserves the existing component API while allowing the host to expose each prop’s supplied input and validity independently from component-owned state.
- Badges can use `size="xs"` for compact counts beside small controls, with the usual tone and variant choices.

- Search Shell stays open when a component inside it, such as a Tooltip on its Clear button, reports its own `close`. Only the dialog closing itself closes the shell.
- A `<kbd>` in Tooltip's or Menu Item's `shortcut` slot reads in the surrounding type in Vue too, instead of the browser's monospace.
- Looma now uses HTML Next alpha.18. Combobox expressions use dotted list indexes (`rows.0` and `internalItems.0`) so they compile under the updated expression grammar; the public Combobox API is unchanged.
- The editor toolbar's shortcut hints show ⌘ on a Mac in a secure context too, where the browser reports the platform as "macOS" rather than "MacIntel".
- Tooltip has a `shortcut` slot: a keyboard shortcut follows the label after a thin divider, in smaller, quieter text, as Menu Item shows one. The editor toolbar's tooltips now show each command's shortcut this way, written for the reader's platform (⌘B on Apple devices, Ctrl+B elsewhere).
- Mention rows keep a highlighted person's initials visible: on the highlighted row the initials circle takes the surface colour with a fine accent ring instead of blending into the highlight. A photo Avatar placed in a Mention Menu Item's `start` slot shows as its own circle, without the initials circle behind it.
- Looma now uses HTML Next alpha.16. Vue components that validate their props no longer overflow the call stack on mount in a DOM without native form validity, such as happy-dom in component tests.
- `@threadlabs/looma/vue/editor` also exports the menus' authored rows: `EditorMentionMenuItem`, `EditorSlashMenuItem`, and `EditorSlashMenuGroup`, so an app can compose the editor's person and command rows from the editor entry point alone.
- Looma now uses HTML Next alpha.15. Its component definitions declare typed literal state values and rely on the new value constraints and validity behavior. This changes authored definitions; the public component tags and JavaScript arrays retain their existing shape.
- Avatar Group has an `xs` size for a group inside a line of small text: xs avatars overlap by a smaller amount and the +N badge matches their size.
- Extra-small Buttons have 1px more room above and below their content and 1px less at each side, so an avatar inside an `xs` pill no longer touches its edge. Under touch, an `xs` Button keeps its size inside its line of text and takes presses through an invisible touch-sized hit area, as link Buttons do, instead of growing to the touch minimum.
- Vue components accept a bare boolean attribute as `true`, as Vue does: `<Avatar decorative />` now works instead of throwing. This follows HTML Next alpha.14.
- Button has an `xs` size (1.5rem) and a `shape="pill"` option with fully rounded ends, for a small choice inside a line of text, such as a status or a person.
- Menu has a `size="sm"` option that matches a small trigger: smaller text, shorter rows, a smaller check, and a narrower minimum width.
- **Visual change for radio Menu Items:** the chosen item now shows a check instead of a filled radio circle, the same mark checkbox items use. A radio circle reads as a form control inside a menu, and a check is the convention people expect there. Unchosen items keep an empty slot, so labels stay aligned.
- **Visual change for Ghost Button:** while pressed or holding its menu open, it sinks into a light surface with a faint edge, instead of a darker tinted fill. The darker fill read as heavier than hover, so an open menu's trigger looked stuck.
- Avatar's `xs` initials are smaller (9px), so two initials sit comfortably inside the 1.25rem circle. Every size sets its own line height, so the initials sit the same wherever the avatar appears.
- Avatar has an `xs` size (1.25rem) with the smallest initials, for naming a person inline in a line of small text.
- Component definitions use HTML Next's `list` declaration for nested collections. This changes authored definitions only; consumers still receive JavaScript arrays and use the same component APIs.
- Nested Tree items now advance by one indent per level, keeping deeper pages and folders aligned instead of shifting them progressively farther right.
- Looma's declarative component definitions use `from:attr` for reactive one-way values. Component consumers keep the same HTML and Vue APIs. Authors of custom HTML Next definitions should replace `:attr` with `from:attr` in rendered markup, use typed literal `value` on `<state>`, and use `expr:value` for action-time expressions on `<set>` and `<dispatch>`.
- **Breaking runtime requirement:** Looma now supports Node 22.13 and Node 24, matching its HTML Next dependency. Node 20 is no longer supported.
- **Breaking for Table Overlay:** its catch-all `action` event is replaced by named insertion, selection, reorder, and menu events. Listen for `add-row-before`, `add-row-after`, `add-column-before`, `add-column-after`, `select-row`, `select-column`, `reorder-row`, `reorder-column`, `open-cell-menu`, `open-row-menu`, or `open-column-menu` and read the fields directly from each event detail. The editor adapter continues to handle these actions.
- Tree marquee measures the rendered name instead of a full-width link and its padding, so short names stay still and long names stop at a narrow fade before row actions without extra travel.
- Mention suggestions open only when an author types `@`. Pasted or loaded `@` text, clicking into
  it later, and `@` in inline code or code blocks no longer start a search.
- The app-triggered editor toolbar now uses the same compact floating surface as the selection toolbar. A caret inside a link shows nearby actions to open, edit, or remove it; the edit action uses the same link form as the toolbar button.
- **Changed default for `LoomaEditor` code blocks:** apps that omitted `codeLanguages` previously had no language picker or syntax highlighting, even though they could insert code blocks. The editor now offers every bundled Highlight.js grammar in its searchable picker. An explicit choice loads only its grammar; Auto loads 20 common grammars when code is present. This makes code blocks useful in the usual editor setup without adding grammars to documents that contain no code. Pass `{}` to retain plain code blocks, or a grammar map to keep an application-owned list.
- Editor table options stay within the viewport, scroll to every action, and close with Escape or an outside click. Row and column grips can drag to reorder while clicks still open their action menus. The options swatches are round and have more room, and paragraphs after tables have a larger gap.
- Strict Comboboxes keep typed search text visible even when their selected value is controlled. Leaving an unmatched search restores the previous label without reporting a new selection. Editable code blocks no longer inherit prose spell-check, while ordinary editor text still does.
- `LoomaEditor` has a `popover` toolbar mode: the full toolbar opens from an app's own button
  (`toolbarTriggerId`, `v-model:toolbar-open`), and selecting text shows a text-only bubble. Use it
  when the page already has a place for tools, such as a page bar.
- Menu Item now spaces slotted icons from their labels. Ghost Button and Icon Button stay visibly pressed while an anchored Menu or Popover is open; Popover also reports that open state on its trigger with `aria-expanded`.
- **Breaking for Listbox:** its visible upgraded root is now an ARIA listbox with styled choice rows instead of a native `<select size>`. The native control's option styling could not show the same checked choices as Combobox or follow Looma's surface treatment; an additive variant would leave the default Listbox with the same problem. A plain native select remains visible before JavaScript upgrades the component, then becomes hidden and disabled. Authored `<option>` children, `value`/`values`, `name`, reset, and required form validation still work. Code that queried the root as an `HTMLSelectElement` or read `selectedOptions` must use its `change` event (`detail.value` and `detail.values`) or the authored options instead. The root remains focusable and supports arrows, typeahead, click, and Space to toggle multiple choices.
- Combobox and Listbox now draw multiple-choice rows and checkmarks from the same style rules. Checkbox's Select all example demonstrates how a group restores the native mixed state after one item changes.
- Input and Textarea rest with a softer control edge and gain a modestly stronger edge on hover. Error and readonly borders stay stable on hover; Input Group and Select also preserve error borders.
- Fallback Avatars use a quiet accent edge; the active ring uses a finer accent line. Subtle Badges have slightly lighter fills, and tag shapes keep a visible edge around their point.
- Spinner now uses a rounded SVG arc that changes length over a faint circular track. Button and Icon Button loading states share this motion, and reduced-motion mode holds the arc still.
- Spinner draws its ring on the rendered element, restoring loading indicators in Button and Icon Button. The Button loading example now starts pressable and demonstrates the transition.
- Solid Icon Button keeps its accent fill in generated CSS, so its light icon stays readable. Boxed Button links resist ordinary page link underlines.
- Search Shell removes redundant internal divider lines; Search Result Rows use spacing and hover or selected surfaces. Side Tooltip pointers draw both edges toward their trigger, Checkbox checks sit centrally, and Input Group affixes use muted text.
- Component pages put examples and API immediately after a short introduction, with longer guidance below.

- Editable code blocks now show a compact language selector when the app registers syntax
  grammars. **Auto** names the detected language; a manual choice is saved in the document and
  can be cleared back to Auto. Typing three backticks starts a code block immediately.
- Code block syntax grammars are now opt-in through `codeLanguages` on `LoomaEditor`
  and `getDefaultEditorExtensions`. Apps can load only the languages they use; Looma
  styles the highlighted tokens with theme-aware colors.

- The code language selector floats above the code block holding the cursor, like the table toolbar,
  instead of reserving empty space at the top of every editable code block.
- Pasted Markdown or HTML code blocks no longer end with an extra empty line. The newline that
  closes a code block's last line is dropped; a blank line the author typed stays.
- Adjacent span labels from pasted HTML layout wrappers keep a readable space
  when the wrapper is reconstructed as editor text.
- The Link toolbar keeps selected text when pressing its button moves focus out of the editor.
- A short YAML frontmatter block at the start of pasted Markdown stays as an editable
  YAML code block, while the following heading and body become document structure.
- Two-column editor tables now fit their available width and wrap cell text. Tables
  with many columns or deliberately wide saved columns still scroll horizontally.
- The inline chip editor now opens below a chip on a narrow page when there is room,
  so editing a chip near the page heading does not cover the title and actions.
  It still flips above when the viewport has more room there.
- **Breaking for Input:** `type` selects the declared `value` and Vue `modelValue` type. Number and range modes use a JavaScript number; other modes use a string. An omitted value without a default is `null`, and a number field reports `null` when its text contains no number. Generated Vue types preserve the relationship. Numeric bindings keep in-progress text such as `12.`, `1.0`, and `1e3` without moving the caret.
- New hooks, all additive and unset by default, so an app styles these from a class of its own:
  - Button: `--ui-button-white-space` (for example `nowrap` to keep a label on one line). Unset, a
    button still wraps as its container does.
  - Select: `--ui-select-surface`, `--ui-select-border`, `--ui-select-border-hover`, and
    `--ui-select-focus-border`, matching Input's.
  - Widths: `--ui-input-inline-size`, `--ui-select-inline-size`, `--ui-nav-item-inline-size`, and
    `--ui-form-field-min-inline-size`.
  - Form Field: `--ui-form-field-label-text`, `--ui-form-field-label-font-size`,
    `--ui-form-field-help-text`, and `--ui-form-field-help-font-size`.
- Text's `as` adds heading levels, `h2` to `h6`, for a heading below a Page Header's `h1` and a
  Section's `h2`. A Text heading takes its size and weight from `size` and `weight`, not from the
  browser's heading styles.
- Docs: the conventions page no longer describes a host reset, `@layer components`, `.ui-scope`,
  font-stack presets, or `data-ui-inherit-typography`. Those belonged to packages Looma retired
  before this one; no current component or runtime implements them. The page now says what does
  apply: components style themselves and inherit everything else from the page.

- Pasting recognizable rendered HTML now keeps its headings and inline formatting even when the accompanying
  plain text resembles Markdown. Literal Markdown or HTML copied as source still becomes editable
  document structure; native editor content stays native.
- Disabled Button and Icon Button use a flat neutral surface, border, and text so their disabled
  state remains clear across variants and tones. The default danger red is brighter in light and
  dark themes. `loading` is the preferred Button and Icon Button prop; `pending` remains as a
  deprecated alias. Spinner rotation uses a centered square box and Button gives it a consistent
  gap from the label.
- Combobox disables Clear when there is no text or selection to clear. Multiple selections stay
  in a single scrolling field row, and the readonly and disabled examples retain their disclosure
  caret so the control type remains visible. Authored `<option selected>` elements now set the
  initial selection when `value`, `items`, and `selectedValues` are unset; form reset restores it.
- Anticipatory Icon Button icons grow into view with a short settle instead of appearing instantly;
  reduced-motion users get an immediate reveal.
- Checkable Menu and Context Menu items draw their checkbox or radio shape even when unchecked,
  so their meaning is visible before activation. The checkable context example uses a Looma Button
  and names the right-click gesture.
- Scroll Area measures its edges for the fade, including browsers where CSS scroll timelines do
  not animate it. The authored area remains scrollable before enhancement.
- Separator's default line sits midway between the theme's regular and strong borders, so it
  remains visible without dominating the content it divides.
- Dialog removes the lines below its header and above its actions. Long content scrolls in a
  Scroll Area whose mask fades into the dialog surface, including custom themes.
- Menu adds `inline` for a visible, in-flow action list. Its first example now renders in the
  preview instead of opening an unanchored overlay. Disabled Menu items use a neutral surface and
  muted text instead of opacity alone.
- Search Shell's action row no longer picks up a site's generic `.footer` styles. Its docs preview
  retains the shell surface across the full panel. The timed Toast example dismisses after three
  seconds.
- Tooltip has a more defined edge and a broader pointer with enough trigger clearance on every
  side. Checkbox's checkmark sits further inside its box and settles quickly into view; Radio's
  label aligns with Checkbox's first line.
- Switch transitions its track and thumb colours over the same short interval as its movement.
  Disabled switches use a flat muted track and thumb, without the dark active thumb or inset shine.
- Enabled Checkbox and Switch controls now use the same control border strength as Input, Select,
  Textarea, and Combobox. Overlay surfaces share a stronger edge through `--ui-overlay-border`,
  bringing Popover, Tooltip, Menu, Dialog, and related surfaces into the same border family. This
  changes the default wherever an app left those border tokens unset, so controls and floating
  surfaces have consistent definition without per-component overrides.
- Disabled choice descriptions, Combobox options, Search Result Rows, floating actions, editor menu
  items, and Tree rows use the same muted text treatment as disabled fields instead of leaving
  strong nested text or dimming the entire control with opacity.
- Avatar Group removes the light cutout ring around each avatar. Later avatars and the overflow
  count cast a one-pixel dark edge over the circle beneath; standalone Avatar borders stay as they
  were. The old edge-ring hook remains available for custom styling.
- Checkbox and Switch reuse the same shallow field inset as Input, Select, Textarea, and Combobox.
  Outlined and solid Icon Buttons use the Button family's small raised shadow and soft highlight;
  disabled variants remain flat.
- The action shadow is now visible as a small two-pixel lift on outlined and solid Buttons. It
  settles into the existing inset pressed shadow over a short transition, making their interaction
  feel related without increasing their size or rounding.
- The light theme's warning amber is a little brighter. Warning labels still use the separate
  subtle text token, while solid warning surfaces retain readable white text.
- Subtle Badge fills and edges are stronger, bringing them closer to solid badges while keeping
  their text and light surface treatment. Breadcrumb items now reset page list margins and size
  chevrons to match slotted icons, keeping the trail on one visual line.
- Callout's default leading inset is smaller, bringing the icon closer to its coloured rule while
  keeping the text and trailing side comfortably padded.
- Danger Card now uses a soft danger surface and a strong leading edge, so its tone is clear beyond
  a red rectangle border. Its example includes the destructive action the card describes.
- Description List tiles have the same defined edge as outlined Cards, and its grid and tiles
  layouts fill the available width. Disclosure hover uses a faint wash of its foreground colour.
- List supports direct native `<li>` children, optional bullets, and a numbered `<ol>` alongside
  structured List Items. Its native list fills the available width; native cards and structured
  cards share the outlined surface border.
- Meter adds a small highlight to the fill and shallow inset shading to its track.
- Nav Item's current-page indicator is a straight line with square ends.
- Spinner uses a centered CSS ring with a short trailing arc and a faster sweep near the end of
  each turn; reduced-motion mode holds the ring still.
- Page Header centers its action against the title block and fills the available width;
  the first example's New page button no longer sits optically high.
- Section spaces its heading and content within the native section. The example no longer puts an
  isolated divider between cards; danger sections use the same soft surface and leading edge as
  danger Cards.
- Docs page heading borders no longer leak into a Section component's own heading in previews.
- Status Message's panel uses the same defined border strength as other panels. Outline Icon Button
  uses the shared control border instead of the separator border.
- Table's compact controls example aligns the Name header with names after their checkboxes and
  centers the Actions header over its buttons.
- Separator, Tabs, Disclosure, table headers, Sidebar, Top Bar, and divided Sections share one
  medium divider border. Panels and cards use the stronger surface edge; interactive controls use
  the control border.
- Rich authored Tabs use the same button styles as generated tabs. Panel padding no longer lands
  on authored tab buttons.
- A visual roles guide now defines divider, surface, floating, control, action, disabled, and tone
  treatments across components. Older editor popups use the same surface edge as Menu and Popover,
  with the shared divider for internal rules.
- Tree's click and keyboard move example now applies its reorder events so items actually move.
- Tree's multiple selection works in bundled builds: descendant items are expanded into an array
  before filtering, so selecting a checkbox no longer throws. The example applies requested IDs
  to its items, allowing several checkboxes to remain selected.
- The Editor docs now use one guide with section links in the sidebar. An interactive editor
  playground demonstrates toolbar placement, highlighting, slash commands, mentions, and tables.
  Empty mention and slash menu header areas stay hidden in the docs build.
- **Breaking (0.16.0): Dialog is non-modal again unless you set `modal`.** `<ui-dialog modal>` and
  `<Dialog modal>` open it with `showModal()`: top layer, backdrop, the rest of the page inert, and
  page scroll locked. Without `modal` it opens with `show()`, as before 0.15 and like native
  `<dialog>`. `closedby` stays, and when unset it now follows native `<dialog>`: `closerequest`
  (Escape closes) for a modal dialog, `none` for a non-modal one. `alert` dialogs are always modal.
  `size`, `alert`, and the trigger `open` event are unchanged.
  - What went wrong: 0.15.0 flipped the default to modal without a stated reason in its changelog
    or pull request, and replaced `modal` with the negative name `modeless`, which the rule that an
    omitted boolean means `false` forced. Every app that never set the option silently changed
    behaviour: its non-modal dialogs started trapping the page, showing a backdrop, locking scroll,
    and closing on Escape, and `modal` stopped doing anything.
  - Why an additive change wasn't enough: the default itself was the problem. A new option can't
    give back the non-modal default to apps that never set anything, and keeping modal as the
    default would keep the negative name.
  - Migration: an app that relied on 0.15's modal default adds `modal` to each dialog that should be
    modal. `modeless` is deprecated and does nothing now; it is still accepted, `modal` wins when both
    are set, and it can be removed. A non-modal dialog that should still close on Escape sets
    `closedby="closerequest"`.
- LoomaEditor adds clickable inline chips through `/chip` or `insertLoomaChip()` on selected text.
  A focused popover edits the label and six theme colors; each chip gets a slightly stronger,
  theme-matched border and persists as a semantic text span within its paragraph.
- Subtle badges and tags now have a slightly darker tone-matched edge instead of a border identical
  to their fill. Colored solid and outline variants keep their existing treatments.
- Tree `marquee`: a long name fades out fully before the leading icon as it slides (it faded to
  the icon's middle), rests at the end, then scrolls again while the row stays hovered or keyboard
  focused; it used to stop at the end. Keyboard focus on the item itself, as the tree roves, now
  starts it. A touch pointer, or the focus a tap leaves, no longer does.
- LoomaEditor adds a `disableHighlight` prop (and `getDefaultEditorExtensions` a
  `disableHighlight` option). When set, authors can't highlight: no Highlight button, no
  `Mod-Shift-H`, no `==text==` typing or paste rule, and pasted `<mark>` keeps only its text.
  Highlights already in the document still show. Off by default, so nothing changes.
- LoomaEditor recognizes Markdown and HTML document source by its contents when pasted, even if
  the clipboard also carries preformatted HTML. Headings, lists, links, tables, and source code
  blocks become editable editor content. Source markup is reconstructed as supported editor nodes,
  rather than inserted verbatim; surplus layout wrappers lose their tags while retaining ordinary text.
- Pasted HTML elements with an inline `display: none` declaration are omitted with their contents.
  A paste containing only such elements leaves the document unchanged. Literal HTML inside a code
  block remains code text.
- The focused empty-editor placeholder remains readable when the active-block marker is enabled.

## v0.15.4

- Warning text (`--ui-warning-subtle-text`, used by subtle warning Badges and warning Text) mixes 55%
  of the warning colour with the ink instead of 85%, so a theme can choose a bright, saturated amber
  for tints, borders, and icons and its warning text still reads at 4.5:1 on every surface. Warning
  text in the default theme is slightly darker.

## v0.15.3

- Badge adds a `--ui-badge-color` hook for categorical labels that should not borrow a status tone.
  Set to any CSS colour, it derives the badge's wash, text, and edge from the theme's surface and
  text, keeping 4.5:1 text contrast in light and dark themes and in every variant. It overrides
  `tone`; `--ui-badge-surface`, `--ui-badge-text`, and `--ui-badge-border` override it.
- Combobox options accept `data-tag-color`, reported as `tag.color` and applied to the tag's badge as
  its `--ui-badge-color`.

## v0.15.2

- Form Field adds a `label-action` slot for a small action about the label, such as a help
  button. It sits after the label, centred on its first line, and never makes the label row
  taller, so fields in one grid row keep the same gap between label and control.
- `tokens.css` adds one base rule: an element with `tabindex="-1"` that only script focuses, such
  as a page's `<h1 tabindex="-1">` after navigation, no longer draws a focus ring. Controls,
  links, editable regions, and elements with a `role` keep theirs.

## v0.15.1

- Cluster adds `wrap` (`wrap` or `nowrap`). The default still wraps; `nowrap` keeps a small group,
  such as a meter and its value in a table cell, on one row at its items' own sizes.

## v0.15.0

- LoomaEditor's toolbar now opens a link form for selected text, an existing link, or a new link
  at the caret. The form supports safe URL schemes and relative URLs, live preview, new-tab choice,
  and link removal while preserving the editor selection through form focus.
- LoomaEditor's Block actions menu inserts below, duplicates, and deletes the active top-level
  block; it is available in the same keyboard-accessible toolbar on desktop and mobile.
- Search Shell now moves keyboard focus between enabled result rows from its search field and
  closes on Escape. `dismissible` controls backdrop dismissal alone.
- Listbox is a visible native option collection with single or multiple selection, controlled
  initial values, form reset, and field radius and danger theming. It keeps native keyboard and
  assistive technology behavior.
- Grid adds an optional `columns` cap while keeping its intrinsic minimum width and responsive
  column reduction. Switcher adds an optional `limit` that stacks all children when their count
  exceeds the allowed row length; it updates when children or the limit change.
- Popover and Tooltip accept all twelve side and alignment placements. Shared positioning flips
  toward available space, shifts inside the viewport, and respects RTL for top/bottom alignment.
  Each has a local CSS offset hook; Tooltip defaults to centered `top` and shows consecutive hints
  immediately while the previous one is visible or has recently closed.
- Tabs adds `activation="manual"`: arrows and Home/End move focus without switching panels,
  and Enter or Space selects the focused tab. Automatic activation remains the default.
- Tabs accepts authored buttons in its `tab` slot for rich labels such as icons and counts. Their
  values link to panel IDs; the controller supplies tab and panel ARIA relationships and skips
  disabled authored tabs in keyboard navigation.
- Disclosure adds `name` for exclusive groups, an authored `summary` slot that overrides the text
  shorthand, and `heading-level` for accordion heading semantics. Closed panels remain available to
  find-in-page and fragment links, which open the matching panel and close its named peer.
- Insert Table Grid now inserts when a cell is activated, with one roving tab stop, arrow-key
  navigation, and 44px touch cells; the extra confirmation button is removed.
- Editor Toolbar now gives its authored controls one Tab stop and uses Left/Right and Home/End to
  move focus among enabled commands, including when Vue updates the toolbar.
- Slash Menu accepts authored Slash Menu Item and Group children, filters their labels and keywords,
  and supports empty, header, and footer slots. Mention Menu accepts authored Mention Menu Item
  children with an Avatar start slot plus empty and header slots. Both retain their data `items`
  option, respect an authored accessible label, and include a stable `value` beside `index` in
  `select` and `highlight` events. Hard-coded English suggestion headers and hints are removed;
  Mention Menu's loading status can be localized.
- Table Toolbar and Table Context Menu now offer header row and column toggles when the editor
  enables them. They announce the current setting as checked; LoomaEditor's integration executes
  the matching Tiptap commands and keeps that state in sync with the table. Row and column move
  actions use the table package's move commands and are offered only when the destination is valid.
  Table Overlay's row and column handles now open a menu scoped to their axis after selecting it;
  a cell handle keeps the full menu.
- Tree adds a click or tap move path and a keyboard move mode for sortable items, emitting the
  existing `reorder` detail with the corresponding trigger. The move handle stays available at a
  44px target on touch. Typing a visible item name moves focus to it. Tree Item adds `lazy`, making
  an empty branch expandable and busy until its children arrive.
- Tree adds `selection="none|single|multiple"` and a `select` request containing ordered IDs.
  Single mode selects by row click or Space; multiple mode shows checkboxes and selects descendants
  with a branch. Tree Item's `selected` prop remains controlled by the application, while a
  partly selected branch displays a mixed checkbox. `none` remains the default for navigation trees.
- Dialog is modal by default; `modeless` replaces `modal`. `closedby="closerequest"` closes on Escape,
  `"any"` also closes on an outside press, and `"none"` requires an action, replacing `dismissible`.
  `alert` adds alert dialog semantics and hides the header close button, `size` offers small, medium,
  large, and fullscreen layouts, and trigger activation now emits `open`.
- Editable accepts Save and Cancel labels, a draft placeholder, and native required and maximum
  length constraints; invalid drafts remain open and do not emit `change`.
- Form Field only displays and describes its authored error slot while `invalid` is true.
- Menu and Context Menu gain named groups, native separators, link items, shortcut hints, wrapping
  arrow navigation, Home/End, and typeahead across enabled items.
- Menu Item adds checkbox and radio choices with `aria-checked`, a `change` event, and a Lucide
  check indicator. Radio choices are exclusive within their nearest Menu Group. Checkable choices
  keep Menu or Context Menu open, and their `select` detail includes the resulting `checked` value.
- Toast Region supports six logical placements and a single `duration` setting (0 means persistent),
  replacing `auto`. It appears whenever it has authored or generated content; `open`, `message`,
  and the region-wide `close` event are removed. Programmatic `show()` keeps per-toast tone and
  duration options. New `ui-toast` authors semantic tone, rich content, an action slot, and its own
  `dismiss` event; the application removes authored toasts after that event.
- Textarea adds `autosize`, which grows and shrinks with content while keeping `rows` as its
  minimum height where CSS field sizing is supported. Other browsers keep native row sizing.
- Checkbox and Radio Group add `invalid`. Their native controls expose `aria-invalid`, and their
  validation styling follows `--ui-field-danger` or a local component hook.
- Combobox adds `invalid`, `open-on-focus`, and `loading`. The list can
  show an authored `empty` slot after loading; busy state is announced while options are being
  supplied. `filter="none"` lets applications supply their own filtered option set.
- Button and Icon Button add `pending`: they keep focus and accessible names, show a spinner,
  expose busy and disabled state, and suppress activation until the action finishes. Pending links
  cannot navigate; pending submit buttons cannot submit.
- Callout adds the `neutral` tone for a muted aside, matching the semantic tone vocabulary. The
  existing `note` spelling remains an alias.
- Avatar adds square shape, decorative semantics, and a Lucide person glyph when no image or name
  is available. Avatar Group adds `total` for truncated markup and a templated `overflow-label`;
  it preserves each Avatar's shape and follows the global round radius.
- Badge adds `variant="outline"` across semantic tones and both pill and pointed tag shapes,
  including RTL and forced-colour edges.
- Theming now has an optional inherited group layer between global theme values and local
  component hooks. `--ui-field-radius` and `--ui-field-danger` style related form controls together;
  `--ui-action-radius` styles Button and Icon Button; `--ui-overlay-radius`, `-surface`, `-border`,
  and `-shadow` style related floating surfaces. Unset group values retain every previous default.
  Local hooks on each field and overlay can override those group values for one instance. The
  theming guide explains the three levels, precedence, theme boundaries, and practical recipes.
  Round controls and status shapes now follow the global `--ui-radius-round` value.

## v0.14.8

- Combobox: `filter` sets how the list narrows as the user types. `label`, the default, lists the
  options whose label contains the text, as before. `none` lists every authored option, for options
  already narrowed elsewhere, such as a server search, so a result that matched on data other than
  its label still shows. Grouping, keyboard navigation, the empty state, creating, and free text work
  the same. Leaving a strict combobox still commits the highlighted option, an exact label, or the
  first label the text begins; with `none`, the only option listed also counts, whatever its label.

## v0.14.7

- Combobox: an option can carry a description, a muted line under its label, and a tag, a Badge
  after it, from `data-description`, `data-tag`, and `data-tag-tone` (one of Badge's six tones,
  `neutral` by default) on its `<option>`. The label stays the option's accessible name, what
  filtering matches, and what a choice commits; the tag and description are its accessible
  description (`aria-labelledby` and `aria-describedby` on the option). Item events and `items`
  carry them as `description` and `tag: { label, tone? }`. An option without them renders and
  reports as before. A new "Descriptions and tags" example shows a grouped directory search.

## v0.14.6

- Form Field: in development, warns in the console when it links a label that has no `for`, which
  works only once JavaScript runs; when its input's `id` is not unique in its document or shadow
  root; and when its label's `for` points at an element other than its input. Each warning names the
  native fix: an `id` on the input and a matching `for` on the label, or the input inside the
  label. Input Group warns the same way when an affix's `id` is not unique. Linking is unchanged.
  Production builds, where the bundler sets `process.env.NODE_ENV` to `"production"`, do not warn.
- Form Field examples link the label with `for` and `id`, and the docs add "Labels without
  JavaScript".

## v0.14.5

- Text: the `danger` and `success` tones now use the same text-safe tokens as `info` and `warning`
  (`--ui-danger-subtle-text`, `--ui-success-subtle-text`, as on a subtle Badge), so text and badges in
  one tone match. Danger and success text shifts slightly toward the text colour.

## v0.14.4

- Text: `tone` adds `info`, for something moving forward normally, and `warning`, for something that
  needs attention, matching Badge and Meter, so text or an inline icon (`<ui-text tone="warning">`
  around a `<ui-icon>`) can carry either state. Each is set in the tone's text-safe colour
  (`--ui-info-subtle-text`, `--ui-warning-subtle-text`, as on a subtle Badge), at 4.5:1 or more on
  every surface in light, dark, and high contrast; say the state in the words too.

## v0.14.3

- Meter: `segments` draws the bar as that many equal segments with a gap between them, from 2 to
  12, so it reads as a count of steps ("step 4 of 6") rather than as a percentage, such as an order
  moving from placed to delivered in a table cell. Set `max` to the same number and `value` to the
  steps done so whole segments fill; a value between steps fills part of one. Say the step in
  `valueText` ("Shipped, step 4 of 6"). The segments are drawn as it renders, before JavaScript, and
  each keeps its own outline in forced colours. `0`, the default, draws the continuous bar as before.

## v0.14.2

- New: Meter (`ui-meter`, Vue `Meter`) shows how far along something is at a glance, such as the
  share of an invoice collected or of a checklist done. `value` runs from 0 to `max` (1 by default, as
  on a native `<meter>`) and is clamped to it, so an empty meter still shows its track and a full one
  fills it. It is `role="meter"` with its bounds and value as ARIA values, named by `label` (or
  `aria-labelledby`), and reads `valueText` ("$750 of $1,240 collected"), or the whole percentage
  without it. `tone` (`neutral`, `accent`, `info`, `success`, `warning`, `danger`, as on Badge)
  colours the fill to carry a state, each at 3:1 or more against the track and the page in light and
  dark; say the state in `valueText` too. `size="sm"` is a thin bar for a table cell or a list row;
  `--ui-meter-inline-size` sets the width. The fill and the ARIA values derive from the props as it
  renders, so a server render and the first render in HTML already draw and state the value.

## v0.14.1

- New: Table (`ui-table`, Vue `Table`) styles an authored `<table>` in place: caption, header and
  row headers, and row separators. A cell's `data-ui-align` (`start`, `center`, or `end`; `start`
  when unset) sets its content along the row, such as `end` for a column of figures. `density`
  (`comfortable`, `compact`) sets the row height, and every row is at least one control tall, so a
  row holding a checkbox or a small button lines up with the rest. `sticky-header` keeps the header
  in view in a table of bounded height. A table wider than its container scrolls sideways with the
  shared edge fade; while it scrolls, it is a region named by its caption that the keyboard can
  focus and scroll. Presentation only: no sorting, paging, or row selection.
- Description List: `layout="stacked"` sets every term above its value; `layout="grid"` sets the
  pairs in columns, term above value; `columns` (`2`, `3`, or `4`) caps how many columns grid and
  tiles set; `density="compact"` sets the pairs close together. A list still sizes as before, so a
  rows list does not stack on its own in a narrow space; use `stacked` there.

## v0.14.0

Breaking: `size` on Input and Select is now Looma's `sm | md | lg`, not the native attribute.

- Breaking: a numeric `size` on `ui-input` (a character width) fails the option's type with HR002,
  which stops every component on the page from upgrading. Migration: drop `size` and set the width in
  CSS, such as `inline-size: 12ch` on the input.
- Breaking: `ui-select` no longer renders a native listbox for `size` above 1 (a numeric `size` fails
  the same way); a select is always a single-choice dropdown. Migration: use a `multiple` Combobox for
  a list that shows several choices at once.
- Breaking: a small Combobox (`size="sm"`) sets smaller text, to match a small Button and Input.
  Migration: use the default `md` where body-size text matters more than the small height.
- On Input and Select, change `size` after render through the option (the Vue prop or a DOM factory's
  props). The element's own `size` property is the native one, and `data-size` only records the
  option.
- Every form control takes Button's `size`, so one size across a row lines up. Input and Select take
  `sm`, `md`, and `lg` (32, 40, and 48px, with Button's padding and type sizes; Select's chevron
  shrinks at `sm`), and so do Textarea (padding and type size; `rows` still sets its height) and
  Combobox, which already had `sm` and now also takes `lg`, sets smaller text at `sm`, and keeps a
  `multiple` field at the small or large height. Checkbox, Radio, and Switch take `sm`, `md`, and `lg`
  and align rather than shrink: the box or track keeps its size, the label takes that size's type,
  and its first line centres in that control height, so it shares a row's height and baseline. `md`
  is the default and unchanged.
- Input Group takes its input's size: a `sm` or `lg` Input inside it makes the whole frame that
  height, so a small group lines up with small buttons and fields.
- Under a coarse pointer every `sm` control grows to the 44px touch minimum, and the text fields keep
  body-size text (iOS zooms into a focused field under 16px). A small Button now grows too, as a boxed
  button was documented to: its size rule outranked the coarse-pointer minimum.

## v0.13.6

- Icon draws without JavaScript. `ui-icon` derives its shapes from `name` as it renders, so a Vue
  server render (`renderToString`) and the first render in HTML carry the whole SVG; before, the
  shapes came from a controller, so the server sent an empty `<svg>` and the icon appeared only once
  JavaScript ran. Changing `name` still redraws it, and `image` keeps its rectangle's `ry`.

## v0.13.5

- Combobox `selectedValues` controls a `multiple` combobox's selection by option value, so a form field
  with a fixed option list can start from data and stay bound: Vue `v-model:selected-values`. Each value
  shows as a badge with its option's label and submits under `name`. Adding or removing one, by
  pointer, keyboard, or badge, reports `selected-values-change` (`{ selectedValues, trigger }`) with
  the new list; setting it reports nothing. Uncontrolled `multiple` and `items` work as before.
- A `multiple` combobox shows a repeated `selectedValues` entry once, and typing the label of an option
  already chosen, then a token separator or Enter, clears the text instead of adding it again.

## v0.13.4

- New icon: `help` (Lucide's circle-help), for `<ui-icon name="help">`. Icon Button sizes a slotted
  `ui-icon` the way it sizes a slotted `svg`, at every size; it drew at the text size before. Icon
  Button documents the help toggletip: a round ghost Icon Button labelled for what it explains, with
  the help icon, and a `ui-tooltip trigger="click"` for it.
- Cluster takes `justify` (`start`, `center`, `end`, `between`), as Stack does, so a row can push a
  title and its actions to opposite ends.
- Docs: styling guidance no longer selects `data-component`. It is a marker a runtime renders, an
  implementation detail that differs by target, not API. Set a component's hooks through a class of your own on it,
  and make a product-wide default in a component of your own that wraps Looma's. A rule test keeps
  docs, examples, READMEs, and this changelog from selecting runtime markers.

## v0.13.3

- Affordance Scope: `guide` sets what marks an anticipatory control at rest. `dot` (the default,
  unchanged) shows the small guide dot; `none` shows nothing until the pointer nears the control, it
  is hovered, or it takes focus. It reaches every guide inside the scope, including a sidebar's
  resize line and the editor table's handles.

## v0.13.2

- `@nextwebwg/html-next` moves to `1.0.0-alpha.7`. Its polymorphic root is an `as` prop that chooses
  between explicit native roots with `$match`, not an `as` attribute that retags one element. Button,
  Nav Item, Card, and Text are rewritten on it, and `as` works as before in HTML, the DOM factories,
  and Vue. The Vue components now get `as` from the conversion itself, so the build step that patched
  it in is gone. Changing `as` after a component renders swaps in the chosen element and keeps its
  state, content, and attributes; in HTML and the DOM factories it keeps focus too.
- Card and Text list `as` among their documented options, with the elements each can render.
- Combobox hides its validation message with `issues.length` again, now that the HTML runtime reads a
  list's length.
- A rendered component's `data-*` attributes record the options it was given. Writing one no longer
  changes the option; set the option on the component instead.

## v0.13.1

- Avatar Group takes `size` (`sm` or `md`), to match small avatars: the +N badge is the same size,
  and they overlap by 0.25rem instead of 0.5rem so their initials stay clear of the next one.

## v0.13.0

- Breaking: component hooks no longer inherit. A hook (`--ui-<component>-*`, such as
  `--ui-stack-gap`, `--ui-button-surface`, or `--ui-nav-item-indicator-color`) styles only the
  component whose root it is set on. Each is registered with
  `@property --ui-x { syntax: "*"; inherits: false; }` in the component's own stylesheet, which
  reaches the document in HTML, in the prebuilt styles, and in Vue's `components.css`. Before, a hook
  set on a container reached every nested component of that kind and overrode its default, and even
  its props: `--ui-stack-gap: 0` on an outer Stack collapsed every Stack inside it, `gap="l"` or
  not. A hook set on the component itself still beats its default and, where documented, its prop.
  Theme tokens (`--ui-accent`, `--ui-text`, the spacing and type steps, and everything else in
  `tokens.css`) and the editor's `--ui-editor-*` hooks inherit as before.
- Migration: set a hook on each component rather than on a container, `:root`, or a theme block,
  through a class of your own on it. To change every instance, wrap the component in one of your own
  that sets its hooks. Do not select the markers a runtime renders (`data-component` and the like):
  they are an implementation detail that can change, not API.
  Icons are `1em`, so a container sizes the icons in it with `font-size`; `--ui-icon-size` now sizes
  one icon. `--ui-tree-indent`, `--ui-tree-gutter`, and `--ui-tree-drop-color` go on the Tree and
  still reach its items; `--ui-tree-item-*` goes on each item.
- Parts inside a component, slotted children, and pseudo-elements read a hook through a private relay
  on the root (`--_ui-<hook>`), so a Callout's `--ui-callout-icon` still colours its icon, and not a
  nested Callout's. Looma components that configure the children they compose (Input Group's input,
  a compact Menu's items, a Tree's density and marquee, the editor's icons) set the child's defaults
  in private `--_ui-default-*` variables, below the child's own hooks.
- Separator styles its root in HTML as well as in Vue. Its rules named the `hr`, which in a scoped
  stylesheet matches only a descendant, so an HTML separator drew the browser's own rule.
- The editor's table overlay handles use their own hover colours; they read Icon Button's hooks,
  which no longer reach them.
- `tools/scripts/component-hook-inheritance-rule.test.mjs` fails when a stylesheet reads a component
  hook it has not registered as non-inheriting, reads its own hook anywhere but its root, or reads
  another component's hook.

## v0.12.7

- Muted text reads at WCAG AA. `--ui-text-muted` was the ink at 45% into the page, about 3.3:1 on
  white and 2.8:1 on the sunken surface, so help text, captions, descriptions, and the editor's
  placeholder were too light. It is now 62%, and `--ui-text-secondary` (and the control placeholder
  that follows it) is 80%, up from 72%, so each step stays visibly lighter than the one above it.
  Every text token now reaches 4.5:1 on every surface in the light, dark, and high-contrast themes.
- Disabled text keeps its paler look: `--ui-disabled-text` is the ink at 45%, no longer an alias of
  muted text, and Checkbox, Radio, Switch, Input, Textarea, Select, Combobox, Disclosure, and
  Editable read it for their disabled state.
- `data-contrast="high"` on the root takes its own ink. The light theme, and the dark theme when it
  follows the system preference, outranked its seeds, so the ink stayed `#1a1a1a` while its own
  secondary and muted steps applied, and both read darker than primary text.

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
