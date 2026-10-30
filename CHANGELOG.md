# Changelog

## Next release

- Theme customization uses shared Undo/Redo and one toolbar Reset instead of section resets. History shortcuts also work while a dropdown has focus, and preview cards align with their section heading.
- Filled accent materials retain a visible chromatic gradient on brighter palettes, within label-contrast limits; surface lighting remains restrained.

- SiteHeader uses compact spacing between the brand and mobile menu while preserving adjustable control targets. Native custom menus keep the same adjacent placement before JavaScript upgrades the header.
- Self-contained TOC exports write stable IDs for every heading and reserve anchors used inside authored navigation. Matching heading labels cannot redirect a saved link, including when original Markdown spellings are retained.

- Require Expressmark 0.5.1 or later so quoted pipe tables paste as editable tables instead of unsupported literal blocks.

- Markdown exports can request `{ tableOfContents: "entries" }` for saved navigation with current heading links. Reader-built placeholders remain the default, authored navigation remains intact, and native editor content is never rewritten.

- Keep SiteHeader's mobile hamburger in the inline navigation's position beside the brand, with the same gap. Only the actions remain at the trailing edge; the brand no longer expands to push the menu away.

- Installed consumer verification refreshes registry metadata while reusing package files, so a newly published compatible peer is not hidden by stale offline metadata.

- Qualify the fixed navigation in 0.46.1 so documentation consumers can admit later compatible versions with a stable minimum. Custom native menu triggers remain usable without JavaScript at every breakpoint.

- SiteHeader keeps desktop navigation outside its closed mobile dialog. Opening the drawer moves the same live navigation into the native modal and dismissal restores it, avoiding an invalid presentational dialog role while preserving link state and keyboard behavior.


- Fieldset sections use internal gaps and padding instead of margins. A description and actions without body content no longer leave an extra gap above the bottom padding; legend and content alignment stays consistent.

- **Breaking:** LoomaEditor reads and writes Markdown only through Expressmark, with `expressmark` 0.4.0 or later. `@threadlabs/looma/markdown/markdown-it` (`createLoomaMarkdownIt` and the `loomaMarkdown` plugin), `loomaMarkdownToHtml`, `loomaMarkdownFromDoc` and the `markdown-it` dependency are removed: a second Markdown engine read and wrote documents differently from Markupress and every other Expressive Markdown tool, and could not keep footnote or link definitions where they are written. To migrate, read Markdown with `markdownToEditorDocument(markdown)` from `@threadlabs/looma/editor/expressmark` and give the editor its JSON in place of `loomaMarkdownToHtml(markdown)`, and write with `editorDocumentToMarkdown(editor.getJSON(), { original: markdown })` (or `editorToMarkdown(editor, { original })`) in place of `loomaMarkdownFromDoc(editor.state.doc)`.

- With `original`, the Markdown a document was read from, an unedited document is written back byte for byte, front matter, line endings and spacing included, and an edit leaves the source of every other block alone. An edited block keeps the spellings it still reads as, such as `_` emphasis, `*` bullets or a setext heading; spacing next to it is one blank line. Raw HTML blocks are written through Expressmark's safe HTML profile.

- **Breaking:** A footnote's note stays where its definition is written. `LoomaFootnotes` and the `loomaFootnotes` section node are removed; each note is a `loomaFootnote` block, which the editor shows as a one-item list numbered by its first reference. Saved HTML still collects the notes into one `<section data-footnotes>` in number order, and reads back as before. A definition nothing refers to stays in the document; deleting a note's last reference removes the note, and a note restored for a reference joins the end of the document. To migrate saved editor JSON, replace each `loomaFootnotes` node with its `loomaFootnote` children.

- Link reference definitions, `[label]: url "title"`, are `loomaLinkDefinition` blocks where they are written, rendering nothing. A link that uses one keeps its label and its `full`, `collapsed` or `shortcut` form in the link mark's `reference` and `referenceType` attributes and is written as a reference while the definition still gives its destination and title. Links keep their `title`.

- **Breaking:** A table of contents is written as its `::toc` placeholder with its settings, and readers build its entries; Markdown no longer holds a copy of the entries. Reading Markdown gives each heading without an authored ID the anchor its text derives, and writing adds `{#id}` only where a reader would not derive the ID.

- A task list can hold plain items beside tasks, as `- [x] Done` next to `- Item` reads in GFM.

- Pasted Markdown is read by Expressmark. Pasted HTML source, and Markdown holding content the editor cannot represent, is read as HTML.

- The Looma Markdown fixtures are Expressive Markdown: tabs are `:::: tabs {group=…}` holding `::: tab [Label]` containers, a nested container takes a longer marker than its parent, a title holding braces is bracketed, an alert's marker may be followed by its title, a mixed list's `- [x]` item is a task, and `::: aside` is a container the editor does not hold, so its fixture is removed. Each fixture's canonical Markdown is what Expressmark writes for it, and LoomaEditor writes every fixture back byte for byte.

- Keep danger fieldsets on a neutral surface with a uniform rounded frame; heading, border and action colors carry the warning. Raise fieldset heading text one pixel for optical alignment.

- Give fieldset legends the standard Section heading size, clearly larger than body text, and use concise titles in the example. Long headings remain covered by wrapping tests.

- Add Section’s `fieldset` variant: a native legend joins its heading to a rounded bordered frame, with descriptions, actions, wrapped titles and danger groups supported in HTML and Vue.

- Keep Looma’s raised surfaces in its warm canvas family, so cards, sidebars and fields share the surface palette.

- Add subtle mark and label hover feedback to Checkbox, Radio and Switch in checked, unchecked and mixed states, while preserving disabled and invalid appearances. Selected marks use their own readable hover paint so compact controls remain visible independently of button strength. Selected radios keep a flat face at rest and on hover so material lighting does not distort the perceived selection dot. Give editable fields a slightly clearer shared hover border.

- **Breaking:** Rename the Clear starting theme and its `clear` identifier to Minimal (`minimal`) so it cannot be mistaken for a reset action. Update saved recipe `origin` and `presets.palette` values from `clear` to `minimal`.

- Balance Button and IconButton hover across solid, outline and ghost appearances using shared perceptual color steps. Reflections move with filled controls, quiet hovers retain their resting material, and deep accent washes retain visible pigment. Gold no longer washes toward white on hover. Outline washes and subtle semantic surfaces, including badges, share a restrained chroma adjustment. Re-export saved theme CSS to adopt the calibrated light/dark paints.

- Exclude Markupress 0.14.4 from documentation integrations: its package metadata caps Looma below 0.45. Compatible versions retain the minimum-version range, and fresh installs keep strict peer checks.

- Keep colored outline Button and IconButton hover visible at maximum material finish by using the shared neutral reflection for their raised hover surface. The accent pigment wash and pressed appearance remain intact.

- **Breaking:** SiteHeader now owns mobile navigation. Supply `brand`, `navigation`, and optional `actions` once; below its breakpoint it provides a hamburger after the logo and a full-height scrolling modal drawer with a dark backdrop, focus management, scroll locking, and dismissal. To use the automatic drawer, remove your custom `menu` slot, duplicated mobile links, panel, and handlers. An explicit `menu` slot still replaces the trigger for separately owned navigation surfaces such as a combined documentation sidebar. The previous consumer-owned menu left basic mobile navigation incomplete and inconsistent; an automatic default removes that assembly work. Use `menu-label` and `close-label` to localize the controls. Drawer links use regular navigation weight rather than inheriting the desktop header’s semibold emphasis.

- Keep documentation cards stationary and make their full lower panel a single link with hover, pressed and keyboard-focus feedback. Tighten the introductory numbered steps so their labels stay with their explanations.

- Keep disabled IconButton actions flat when a neutral outline or solid variant supplies its own shadow.

- Show file-upload progress and retryable errors in the editor. Retry keeps its original mapped insertion point; inserting an attachment is a separate undo step so it does not remove intervening typing.

- Regenerate visual review images from base and candidate source checkouts, cache them temporarily, and attach appearance differences for normal PR review. Stop committing baseline PNGs; rendering, functional, text-inventory, and accessibility checks remain enforced. Replace `visual:update` with source changes followed by `visual:test`.

- Enforce the outline contrast minimum against the composited wash and material surface in light and dark themes. Recalculate borders when finish or lighting changes; text retains its separate readability threshold. Re-export saved theme CSS to adopt the corrected contrast.

- Use the actual accent pigment for translucent Button and IconButton outline washes, with a clearer tint at rest and on hover, instead of washing the surface with darkened text ink.

- Derive colored outline borders from their pigment and the chosen border contrast minimum, independently of readable text. Keep outline hover borders in the same color family. The default remains 2:1; Gold retains its 2.1:1 setting. Re-export saved theme CSS to adopt the corrected borders.

- Keep inverse count text readable over both light and dark filled controls by deriving its ink from the control’s foreground polarity.

- Select the starting theme directly in the customizer summary, preview font names in their own typefaces with glyph-only downloads, and load complete font families when selected.

- Give expanded Disclosure content more space above and below while keeping closed panels fully collapsed. Group the named accordion example into adjacent rows and use Text so paragraph margins do not add uneven space.

- Make the tokens guide easier to scan with a layer diagram, focused examples and collapsible reference tables. Move detailed theme settings into a theme reference. Remove documentation-site syntax and repository maintenance pages from the public guide; link to Markupress for site syntax. Documentation navigation links can set `position: "start"` to appear before generated sections; the public site now leads with Get started.

- Keep customizer settings compact and backed by opaque panels, with on-demand help and a persistent theme summary/history toolbar. Optional accents use one clearable swatch each; numeric controls offer compact exact editing without separate step buttons.

- Balance filled and outlined hover through material reflections, add faint accent outline fills, and keep supporting accents explicitly selectable. Outlines share quiet elevation and retain their keyboard focus halo. Bookish defaults focus to primary. Maximum material transparency primarily affects the rim and adds slight content transmission. Re-export saved recipes to adopt the updated material and state derivations.

- Keep editor controls internal to the complete Editor documentation instead of listing their implementation parts as public components. Move Curve Editor to Extras.

- Keep Tree row hover continuous behind the expansion caret and use action cursors for expandable and selectable rows. Strengthen field recession in the Looma starting theme.

- Spread material reflection across the complete control face without a localized bright dot, with a gentler response on light pigments and a stronger, saturation-preserving reflection on dark fills. Gold links use readable amber derived from the primary hue.


- Render documentation and catalog descriptions with Expressmark's standard syntax, requiring Markupress 0.12 and Expressmark 0.2.2 to preserve native code literally. Guides use bracketed callout titles and adjacent tab panels; component invocations and code examples keep their meaning. The portable editor adapter still defaults to compatible interchange; select `syntax: "standard"` when exchanging content with Markupress.

- Use contextual link ink for SiteHeader selected and hovered navigation, preserving contrast when a theme has deep action fills.

- **Breaking:** Footnote editing follows document numbering automatically. Remove EditorFootnoteEditor’s `label`, `editable`, and `error` props and `label`/`go` event handlers. Use its default slot for rich editing and `done` for Escape dismissal. Changes apply live; Escape or clicking away closes the editor. Adding a footnote opens its floating rich-text editor; an existing reference offers a one-line action bar with an icon-only Go to note control and an Edit note button. Rich note blocks and marks remain intact.

- Fade dialogs in at their final rendered size. Keep intrinsic height animation for content changes after opening.

- Use the shared raised surface behind component previews, removing the decorative grid and accent tint. The public docs no longer replace shared sunken-surface and border roles with fixed cream/beige colors.

- Curate Clear, Gold, Bookish, Editorial, Night and Garden using supporting accents, neutral relationships, status mappings, typography and material controls. Bookish uses primary-color info/success with restrained warning/error colors, coral/leather accents and Open Sans/Newsreader. Preserve the Looma and Wiki recipes.

- Rebalance shared status colors: quiet green surfaces use the same chroma budget as other hues, semantic pigments stay subordinate to the primary accent, and warning uses amber rather than the red-orange family. Contextual semantic ink adjusts lightness while retaining hue. Dark warm surfaces receive a bounded tonal and chroma lift to retain their color. Tip shares the existing Info palette and its governed relationship controls, using an advice icon to distinguish its purpose. The customizer offers Semantic colors, Less color, and Primary + icons relationships; individual status mappings remain available in advanced controls. Standalone amber actions use `--ui-on-warning` and contrast-safe hover/pressed fills; re-export saved recipes to update existing CSS.

- Give documentation cards concise authored summaries while retaining full reference introductions. Clarify Application toolbar versus SiteHeader, and show inline status messages inside an existing content boundary.

- Require Markupress 0.10.3 for section navigation with a continuous sidebar background to the footer. Category links open filtered card galleries; only the current category’s reference links appear beneath it. Galleries preserve section selection across navigation and render their cards before JavaScript. The Section dropdown navigates; a wider responsive Filter components field searches only the current view and resets when changing sections.

- Use authored component display names in the documentation catalog, removing redundant Editor prefixes from editor reference headings, cards and navigation.

- Share semantic background, foreground and border roles across subtle Badge, toned Card, Callout, Toast and generated notifications. Text inherits its containing surface or control’s foreground, with the document root supplying the body-text role, so composed status content keeps the same colors. Optional overlay group overrides remain available without masking semantic defaults.

- Separate dark canvas and content elevations, strengthen shared dark neutral and selection derivation, and use shared mode-aware soft-color roles for subtle badges so light status backgrounds remain pale.

- Add optional secondary and tertiary brand families to Button, IconButton, Badge, Card, Meter and Text. Palette controls expose neutral relationships, fill strength, shared boundary contrast, semantic/harmonized/brand status relationships, derived saturation, and accent assignments for selection, focus and links. Light/dark specimens include all statuses and shared control boundaries; saved recipes and exports retain the relationships.

- Require Markupress 0.10.2 for package-generated documentation so the shared responsive header includes native section navigation on mobile home pages and keeps its logo visible.

- Pre-render documentation examples directly in their cards and share the page's CSS and HTML Next runtime. Remove preview iframes, standalone frame routes, and cross-frame theme/resize messages. Project examples now run as trusted page code; example IDs and their control relationships are scoped per specimen.
- Give the directory compact, readable examples, portable image assets, and short plain-text summaries while retaining full examples and descriptions in the reference. Image uses a pastoral vector illustration; Avatar keeps its portrait. Skeleton samples fill their stage, floating pickers start closed, and Table Overlay can contain an optional table surface whose real cells supply its geometry.
- Reuse self-hosted fonts in documentation without a redundant Google Fonts stylesheet, and serve font assets once instead of embedding copies for isolated frames.
- Keep editor suggestion surfaces reactive when only their open state, anchor geometry or slash query changes, including keyboard and touch interaction in the compact examples.

- Keep SiteHeader full width in centered layouts and let long branding shrink within its mobile row, preserving the visible logo and trailing controls. Direct action slots reserve adjustable space for compact controls’ invisible targets.

- Keep colored callout backgrounds pale and visibly tinted with opaque perceptual colors, preserving hue and readable text in light and dark themes.
- **Breaking:** Public component styling hooks now inherit from `:root` and ancestors, with nearer instance declarations taking precedence. Inherited hooks retain their documented precedence over component props; use `initial` to restore a subtree’s prop-driven fallback. Internal stack measurements and affordance state use private properties. Remove ancestor hook declarations that previously had no effect if those components should keep their defaults.

- Add SiteHeader with brand, navigation, action and menu-trigger slots. It owns responsive layout and keeps branding and navigation aligned beside controls of different heights; applications retain routing and drawer behavior.
- **Breaking:** Button now renders a native link whenever `href` is supplied, including `href=""`, and a native button otherwise. Remove Button's `as` prop: replace `as="a" href="…"` with `href="…"`; omit `href` for button actions. Disabled and loading links retain their navigation guards.

- Start the shared customizer with the Looma identity and add Gold as a complete selectable theme with portable Lato/Fraunces fonts. Keep Clear as an explicit neutral starting point; move standalone LightEditor documentation into Extras.
- Derive filled-action colors, readable labels and quieter secondary edges as a shared family. Preserve chromatic reflections and separate decorative glass transparency from frosting while keeping content plates opaque.
- Give switch thumbs and empty checkbox/radio frames the shared material lighting and inset depth. Keep the current Safari preview, selection and control geometry fixes throughout theme customization.
- Suppress disabled link activation before application click handlers, including router callbacks, and restore it when disabled is cleared.
- Keep single-column editor specimens in page flow on narrow screens so tall material samples cannot cover controls being touched or dragged.

- Use a lighter relative-color wash for colored callout backgrounds, deriving the hue from their tone while preserving borders, text and document spacing.

- Let Typography customize field-label size independently or follow body text by default, preserving that choice in recipes and CSS exports.
- Give rhythm a vertical role: it opens text lines and stacked groups without spreading horizontal navigation or action rows. Spacing still adjusts gaps and padding. Size and Material editors now include grouped actions, fields, ordinary and expressive surfaces, and usable floating previews.
- **Breaking:** Share neutral solid/outline action and form-field borders through `--ui-control-border` and its hover role. A configurable contrast floor (default 2:1) balances quiet boundaries against declared surfaces. Replace separate `--ui-neutral-border` / hover / active settings with the shared control roles.

- Render the theme customizer’s status paragraph at the base body-text size, keeping field help and captions on the supporting-text scale.
- **Breaking:** Default FormField and Combobox labels to the body-text size so the field’s instruction is larger than its supporting help. This increases labels for themes that did not explicitly size them. Set the shared `--ui-field-label-font-size` to `var(--ui-font-size-sm)` to retain compact labels; existing per-component label-size hooks still take precedence.

- Isolate component-template whitespace at the shared editor surface, keeping callouts and disclosures compact while preserving authored spaces and line breaks. Colored callouts use the same tone-tinted subtle surface as subtle badges in light and dark themes.

- Schedule customizer preview layout outside resize notification delivery, preventing intermittent Safari ResizeObserver loop warnings while preserving preview sizing.

- Keep Combobox option taps working in Safari by retaining input focus during `mousedown` rather than cancelling touch `pointerdown`. Exercise theme, palette, material and font selection with real taps in the Safari audit.
- Use the shared small IconButton for Dialog close actions, including its icon, visible sizing and focus treatment. Touch no longer enlarges the visible close control.
- Authorize each isolated preview's bundled runtime by its content hash, so Safari runs interactive examples and applies live theme changes without granting previews access to their parent page.
- Resolve the actual root-font unit before deriving shared control heights, keeping Safari's registered lengths aligned with both the base-font token and direct root-font changes.
- Keep native text fields inside the shared control box in Safari, including grouped fields, instead of letting native text metrics enlarge them beyond matching buttons.

- Use published Markupress 0.10 instead of a bootstrap tarball for corrected header alignment, themed home actions, and live hero content.
- Rework the public homepage around a live component showcase and clearer paths to building and theming. Center the documentation header while preserving its text baseline, and give home actions an explicit themed accent.
- Admit Vite 7 and 8 for the optional documentation tooling peer after installed documentation build and local-writer verification.

- Update to Expressmark 0.2 and explicitly select CommonMark/GFM syntax for editor interchange, preserving existing document round trips.


### Focused theme customization

- Start customization on a dashboard of current theme decisions. Open Palette, Material & light, Typography, Size & spacing, or Motion as separate editors, with relevant live samples beside their controls. Editor links support reload and browser navigation; Overview restores the dashboard position and focus.
- Move the full component browser and export/save actions into their own destinations. Keep exact adjustments within their subject and remove nearby-style locks and the preview/apply/cancel workflow.
- Keep LightEditor focused on direct manipulation and keyboard movement; open **Exact position** when coordinate entry is needed.
- Centre Button label text using its own cap-height text box; keep inline link actions inline and boxed links the same height as buttons. Draw Checkbox ticks with a centred mask, independent of font metrics and the mixed-state bar.
- Give choice hover a subtle accent fill without a focus-ring outline; preserve keyboard focus and forced-color indication. Relax Wiki and Night spacing defaults and give the sampler a clearer content hierarchy.

### Neutral controls, rhythm and state coverage

- Open all choices from a committed Combobox label, preserve actual search drafts, and let the disclosure button close without focus reopening the popup.
- Buttons and IconButtons now default to neutral. Use `tone="accent"` or `preset="primary"` for accent emphasis. IconButton’s superseded `auto` tone is removed; select an explicit tone. This changes existing unqualified action colors and is released on the 0.38 line.
- Coordinate gaps and unitless tight/body/relaxed line-height multipliers through `--ui-rhythm`. Starter themes demonstrate distinct typography, geometry, material, motion and rhythm.
- Use subtle accent for menu hover and the shared selection surface for checked rows. Ghost pressed/open backgrounds strengthen their tone wash instead of becoming lighter than hover.
- Keep Base colors visible; explain color relationships with selectable cards and color previews; compare compact light/dark samples. Main and optional heading fonts can be shared or selected separately. Theme changes groups Undo/Redo/Reset; Reset restores the selected starter, while removing the Custom theme header chip clears the browser override. Inherited palette/material selections use muted selected-value emphasis through Select’s and Combobox’s `muted` option. Starting-point, palette, material and nearby-style choices use the styled dropdown; palette choices show four color swatches in the list and selected field.
- Replace redundant full-viewport component gallery captures with compact state sheets and inventories, including finite prop values, authored examples, pointer/keyboard states and authored interactions. Core controls also run through every starter palette in both modes.

- Search the full component catalog from the theme customizer, with nine previews initially and a Show more action; explicitly added examples remain alongside existing choices. Include typography in the compact sampler, give starting themes broader type/spacing/material/motion identities, and pair Forest & cream with warm cream surfaces and neutral fills.
- Give neutral-outline text and icon actions the same restrained border and transparent resting surface, with shared neutral hover/pressed fills. The sampler compares solid accent, outline accent, solid neutral, outline neutral, icon and ghost in that order.
- Add Skeleton placeholders for incoming text, avatars and media, with responsive dimensions and optional reduced-motion-aware animation. Placeholders stay decorative; the application owns loading status and content replacement.

- Skeleton now shimmers from left to right by default instead of remaining static or fading in and out. The previous default made pending content look like a static placeholder; the travelling highlight now communicates loading on every ordinary Skeleton. Reduced-motion preferences still keep it static. To retain a static placeholder, pass `animated: false` in Vue or `from:animated="false"` in HTML Next. This default change is a pre-1.0 breaking minor.

- Keep keyboard-active suggestions, choices, menu actions and search/link results in view with the fast motion token. Reveal scrolls only the control's own panel, follows rapid navigation, stops on close, and honors reduced motion. This corrects invisible selections and abrupt focus scrolling for keyboard users; no consumer API changes are needed.

- Add Pagination for controlled result navigation, including native links, bounded numbered pages and previous/next navigation without known totals. Its number and navigation actions share Button’s new opt-in square minimum size; longer values remain readable.

- Allow compatible later pre-1.0 minor releases of Threadlabs dependencies instead of restricting consumers to individual minor versions. Lockfiles retain the tested versions.

- Use MarkupKit 0.2 and Markupress 0.10 in the documentation generator and public docs, including the `mk:` HTML API.

- Keep nested form controls in sync when a field changes its disabled, required or invalid state, including re-enabling a textarea.

- Show the editor writing prompt only while the whole document is empty, including when an empty first line precedes text, an image or a divider.

- Use the shared Markupress appearance control to cycle Automatic, Light and Dark from one button; local setup guidance selects the corresponding documentation theme. Correct field and choice descriptions so they no longer promise a visible touch-size floor.

- Documentation customization requires Markupress 0.9.1 for the shared removable header status chip. Sidebar navigation examples render real links.

### Expressive materials and compact controls

- Keep the theme's visible control sizes on touch instead of raising the whole family from a 44px floor. Buttons, fields, swatches and companion icon buttons retain matching sizes. Hit-area dimensions remain adjustable and separate from visible geometry; compact choices are valid.
- Let glassiness and glow reach a richer upper response while retaining gentle lower settings, opaque readable content planes and reduced-transparency behavior. Action edge light follows the outer silhouette instead of drawing an inner frame.
- Add CycleButton, a compact reusable icon control that cycles named states without replacing its native button or moving keyboard focus. It uses IconButton's existing visual semantics.
- Put a dense live documentation sampler in the customizer on desktop and mobile, reserve sidebar space for focus treatment, and remove the ambiguous page-entry theme comparison. Undo/Redo and staged nearby-style previews remain available.
- Explain local design-system naming, logo configuration, HTML Next component discovery, categories and ownership attribution.


### Document-root theme scale

- `--ui-font-size` sets the document root in px (16px by default); type, choice geometry, spacing and control roominess derive from `1rem` so they scale once. Base text editing accepts 14–24px, with arithmetic calculated on entry. Other length editors retain px/rem conversion, and visible size samples show actual rem/px heights.
- This changes the scope of customized base type: ordinary rem-based page layout now scales too. Set the seed on `:root`, rather than nested theme boundaries. Replace relative recipe `text-size` values with an explicit px base; for example, `1.0625rem` under the former 16px root becomes `17px`. No compatibility conversion guesses a previous root.
- Keep document-root font sizing free of registered relative-length dependency cycles; derived type roles and geometry read the resolved root.
- Allow six minutes for the public docs build: measured build/setup/upload work exceeded the former five-minute cutoff despite completing its steps.

### Relational theme editing and reversible exploration

- Replace recipe `control-size` with numeric `control-roominess` (desired control height divided by base type size). Shared buttons, fields and swatches derive their boxes from the same type relationship. Relative-length bounds scale with the root font. Touch retains the visible small/medium/large ladder; adjustable hit areas remain separate.
- Rename recipe `density` and CSS `--ui-density` to `spacing` and `--ui-spacing`, matching the direction of the control: increasing it adds space. These pre-1.0 replacements have no compatibility aliases. `--ui-control-size` remains a derived height role.
- Generate coordinated warmth, intensity and neighboring/complementary surface relationships with perceptual color operations and gamut/readability bounds. Both color modes retain the palette identity; disabled roles stay distinct. These palette transformations are recipe inputs, compiled into resolved color roles rather than inert CSS properties.
- Preserve finger grab offsets in LightEditor, support background placement and directional presets, and restore the gesture start on Escape or pointer cancellation. LightEditor adds a `cancel` event with restored x/y coordinates; CurveEditor shares the same grab-offset and cancellation contract, reporting its restored value. Frame-coalesced previews avoid storage writes during a drag; release commits one undoable decision.
- Add undo/redo, reset to the retained starting point, and preview/apply/cancel for nearby variations with palette, material and type/spacing locks.
- Explain material dependencies and reuse documentation cards in the focused material and paired palette editors. Geometry shows aligned size samples and spacing progression; motion includes an interactive documentation example.
- Add searchable Google font selection and actual face loading for body/display roles, with the operating system's font as the default. Optional recipe `fonts` provenance travels with JSON; downloaded CSS and locally saved CSS include Google Fonts imports before rules. Self-hosted/custom stacks remain an advanced option.
- Organize the complete theme-property reference by palette, type, geometry, material, illumination and motion, distinguishing generator inputs, live CSS levers and derived roles.

### Documentation workspaces and control polish

- Customize uses its Starting point, Palette and Material controls as its sidebar. Detailed decisions, example selection and export tools open on demand; the Editor playground also leaves out documentation navigation while editor reference pages keep their own section.
- Shared catalog cards use Stack spacing for their content and the directory groups. Keep the directory's cards inside Grid through Markdown rendering, restoring columns and gaps. Separator examples use Stack and Cluster spacing rather than adding component margins.
- Vertical wheel gestures over Tabs scroll the page instead of being captured by the tab strip. Horizontal gestures retain native strip scrolling.
- Keep Tooltip arrow shoulders level by scaling after rotation, in both native HTML and generated Vue.
- Reel examples have enough items to show meaningful overflow and use native item wrappers for scroll snapping without reaching into component roots.
- Derive a distinct placeholder color against the field surface, so hints stay readable and visibly quieter than entered text in paired themes.

### Migration: semantic surface treatment

- Replace Card `variant="glass"` with `treatment="expressive"`; add `variant="elevated"` only when the surface also needs a lift. Standard elevated cards retain their subtle treatment. The removed glass value has no compatibility alias on this pre-1.0 release line.
- Card danger tone now changes only its palette. The previous squared corners and leading stripe made a danger card a different shape from other cards, even when the theme reduced the stripe to an ordinary border. Alerts retain their own accent treatment.
- Solid neutral Button and IconButton use calm surface fills in both modes instead of text-color fills. Appearance remains independent of tone; existing solid neutral actions keep their labels and behavior.
- The starting-point API uses `bookish`; remove uses of the obsolete `library` name.

### Material and palette refinement

- Add focused Material and Palette views backed by the same persistent recipe as the main customizer. Presets retain their identity after refinement, show customized status, and restore one family without discarding other decisions.
- Add LightEditor with pointer, touch, keyboard and exact coordinate editing. Shared relative light position, spread, strength, finish and glow generate material responses across controls, fields, expressive cards and floating surfaces. Bookish uses a top-centre radial reflection; edge lighting remains present when a theme supplies action shadows.
- Bound reflection peaks and neutral fills for readable text in the generated light/dark pair. Export the complete formula-based theme, including reduced-transparency behavior and the optional preset identities in recipes.
- Replace the long native example select with a searchable Looma Combobox and an explicit Add to preview action.
- Keep NumberInput's normalized unit display stable when composed controls update its value, while form reset retains its original default.
- Native Select follows its nearest light/dark boundary and shares field material, with readable mode-specific chevrons.
- Keep editor references in the Editor section rather than appending them to the general Components navigation.
- Keep shared depth, spacing and light response consistent between the documentation shell and isolated examples when a remembered theme restores before baseline styles.
- Bundle independent preview entries with bounded concurrency and overlap isolated consumer checks with the installed documentation build; retain the complete qualification matrix and its time limits.
- IconButton’s `auto` tone names its previous variant-dependent omitted behavior. Explicit tones and existing variant names remain supported; use `auto` when code explicitly represents the default.

### Improvements

- Add ColorPicker: square or circular swatch buttons with shared control sizing, RGB/hex editing, repeat-click toggle, Escape and outside dismissal.
## v0.34.0

### Migration: readable theme recipes
- Theme recipes now reject numeric values outside the shared readability bounds. Apply the bounds shown by the customizer or its `themeFields` metadata when importing an older recipe. Color seeds remain editable and derive readable roles in both modes. Editor-only limits would leave imports, repository saves and exports able to reproduce unreadable results, so the canonical validator governs every path.
- Keep documentation customization across navigation, reload and tabs until reset, including the complete navigation shell and isolated example cards. Add Bookish and compact Wiki themes, coordinated palette choices, paired light/dark exports and nested mode boundaries, with bounded readable text, outlines and disabled states.
- Add reusable NumberInput, Slider and CurveEditor controls with arithmetic on entry, units, shared bounds, pointer/touch and keyboard editing. Use them in the package customizer alongside typography and floating-surface documentation cards.
- Add independent action presets to Button and IconButton, intent tones to icon actions, display/heading/label/caption text roles, and a glass Card surface. Shared glassiness and surface separation preserve an opaque content plane while popup purpose and measured size govern the surrounding material.

## v0.33.1

- Ship the Markupress/MarkupKit documentation generator and Looma theme customizer through `@threadlabs/looma/docs` and `looma-docs`. The public site uses the same component catalog and live example cards as project documentation. Export a formula-based CSS theme, save it locally with conflict detection, and discover project HTML Next components in shared categories.

## v0.33.0

- Editor formatting-back and image-upload retry actions use Looma Button. Regenerate the declarative icon catalogs so the attachment icon renders consistently.
- Add opt-in `theme-system.css`: seven shared density, size/spacing curve and material levers derive existing public roles. Existing token and palette defaults remain unchanged without the import. Single-line control padding fits the common height independently of page spacing growth.
- Checkbox and radio marks, multi-select option marks and switch tracks derive from the base text size. Choice labels align on their first line across text sizes; switch thumb size and travel follow its track dimensions.
- Checkbox keeps its rounded-square identity under large corner themes, and its check reveal uses the shared motion duration. ColorPicker also preserves its square default when the theme uses pill-shaped controls.
- Form Field respects an explicit label target, skips hidden form values, and names composite field triggers. Plain-text help and errors describe their control in both HTML and Vue. ColorPicker submits a named value, omits disabled values and restores its latest external value on reset.
- Add shared display-font, action content-inset and press-response roles. Themes can carry these decisions across heading and action components through public tokens; existing defaults remain the fallback.
- Component flow, alignment, gaps, margins, padding and box sizing no longer yield to
  ordinary host CSS or normal inline styles. Accidental consumer overrides changed
  component behavior without going through its public API. Public props and custom
  properties remain configurable. Migrate ordinary layout overrides to supported
  props/hooks; add a missing shared capability to the primitive. Explicit consumer
  `!important` is the deliberate cascade escape hatch. An additive hook alone cannot
  prevent existing ordinary selectors from corrupting internal geometry.
- Checkbox alignment follows the label's first line at every inherited font size,
  including wrapped labels and descriptions. It no longer combines a fixed em
  offset for the default size with a different rule for small and large sizes.
- Builds reject unprotected component layout declarations; consumer pages must not
  compensate for missing component capabilities by styling their private structure.

## v0.32.1

- Attach files through LoomaEditor’s File attachment insertion command and toolbar. The additive `fileUpload` responder retains a file and answers with its name, size, content type and download URL; the editor inserts an ordinary editable link at the saved writing position. Failed or canceled uploads preserve the document.

## v0.32.0

- **Breaking:** Mentions are Expressive Markdown's `@` forms. LoomaEditor writes a mention as `@[Label]#ref` (`@[Label]` without an ID, and `@[Label]{ref="…"}` for an ID that is not a handle), and the markdown-it plugin reads `@handle`, `@[Label]` and `@[Label]#ref`, where an `@` at the start of a line or after whitespace starts a mention, to the same `<span data-type="mention">` as before. `:mention[Label]{id=…}` is text. All Markdown across Looma, Markupress and LoomaEditor is Expressive Markdown, which reads `:mention[…]` as text, so Markdown the editor saved read back without its mentions in every other Expressive tool; reading both forms would keep the old one in use. To keep mentions saved the old way, convert them before reading the document, for example with `markdown.replace(/:mention\[((?:\\.|[^\]])*)\]\{id=([^}\s]+)\}/g, "@[$1]#$2")`. The `mentions/person` fixture is `Thanks, @[Ada Lovelace]#u1.`, with the same HTML.

## v0.31.5

- LoomaEditor starts in apps whose bundler lowers classes to functions, such as Docusaurus's Babel preset. Footnote back-links and the table view were subclasses of ProseMirror and Tiptap classes; a lowered subclass calls its native base class without `new`, which throws "Class constructor cannot be invoked without 'new'". The footnote serializer now wraps ProseMirror's cached serializer, and the table view holds Tiptap's `TableView`. A tooling rule keeps editor code from subclassing a dependency's class.

## v0.31.4

- Looma builds with HTML Next 1.0.0-alpha.69, and `@nextwebwg/html-next` is a peer dependency at exactly `1.0.0-alpha.69`. No Looma component puts a slot directly inside table markup, so the new HT032 check needs no change. Search Shell renders result rows that an application adds to its body after it opens, and the arrow keys reach them.

## v0.31.3

- Keep floating editor toolbar shadows unclipped and show expanded formatting in one surface. Popover's additive `bare` option lets content supply its own surface.

## v0.31.2

- Keep inline table controls within the document so wheel scrolling over row and column drag handles continues scrolling the page. Use one sticky table toolbar below the table, with its full controls visible when space permits; dropdown menus retain top-layer placement.
- Respect the inherited `--ui-tooltip-show-delay` setting for pointer hints, including column resizing and editor toolbars; explicit tooltip delays still take precedence.

## v0.31.1

- LoomaEditor edits footnotes. `/footnote`, `editor.commands.insertLoomaFootnote()` and Mod+Alt+F insert a reference at the caret with an empty note, and move the caret into the note; typing or pasting `[^label]` makes a reference, with a note for a new label. Notes are numbered again on every edit by first reference and kept in that order at the end of the document, a note goes when its last reference is deleted, and a cut reference pasted back gets its note again. `renameLoomaFootnote(from, to)` relabels a note and every reference to it, and `goToLoomaFootnote()` (Mod+Alt+N) moves the caret between a reference and its note. The saved HTML is Looma Markdown's: notes carry their back-links, and numbers follow the document. Pasted Markdown footnotes join the document's notes.
- Footnote Editor (`ui-editor-footnote-editor`, Vue `EditorFootnoteEditor`) is the editor's footnote popover, opened by clicking a footnote reference: a label field that renames the footnote, a note field that edits a note of plain text and shows a formatted one read-only, and Go to note. It reports `text`, `label`, `go` and `done`.
- The icon set has `superscript`.

## v0.31.0

- **Breaking:** Component definitions select `module` and export named `connect(host)` for each connection. The old `controller` attribute/default initializer is removed. This lets the same resources work with HTML Next's module-only compiler and gives reconnects an explicit activation/cleanup lifetime; an alias would preserve the incompatible contract. Component props, events and rendered roots stay the same. Applications loading component definitions need a module-capable HTML Next runtime (the exact alpha.67 peer supports it). Any direct implementation-module imports must use `connect` instead of a default initializer, call it per connection and invoke its returned cleanup on disconnection. DOM setup no longer requires registering an internal connect hook.

## v0.30.9

- Alert dialogs use the same outer top, side and bottom inset. Their header no longer retains the smaller top inset that accounts for a regular dialog’s close button. Regular dialogs are unchanged.

## v0.30.8

- Looma Markdown has GitHub's footnotes. `[^label]` refers to a `[^label]:` definition, whose lines indented four spaces continue it. The markdown-it plugin numbers the notes by first reference and renders them after the document as GitHub does: a `<sup>` link per reference, and a `<section data-footnotes>` whose `<ol>` holds each note with links back to its references. IDs are `fn:label`, `fnref:label` and `fnref:label:2`, so they never meet a heading anchor. LoomaEditor reads and writes them as the `loomaFootnoteReference`, `loomaFootnotes` and `loomaFootnote` nodes, and Expressive Markdown carries them as `footnote` nodes. The conformance suite has a `footnotes` feature.

## v0.30.7

- Looma builds with HTML Next 1.0.0-alpha.67, and `@nextwebwg/html-next` is a peer dependency at exactly `1.0.0-alpha.67`.

## v0.30.6

- Looma builds with HTML Next 1.0.0-alpha.66, and `@nextwebwg/html-next` is a peer dependency at exactly `1.0.0-alpha.66`.

## v0.30.5

- Looma builds with HTML Next 1.0.0-alpha.65, and `@nextwebwg/html-next` is a peer dependency at exactly `1.0.0-alpha.65`. Server-rendered pages carry each component as `<template carrier="ui-…">` in place of the `<?carrier?>` processing instruction; no Looma component authors a `carrier` attribute.

## v0.30.4

- Looma builds with HTML Next 1.0.0-alpha.64, and `@nextwebwg/html-next` is a peer dependency at exactly `1.0.0-alpha.64`.

## v0.30.3

- Looma builds with HTML Next 1.0.0-alpha.63, and `@nextwebwg/html-next` is a peer dependency at exactly `1.0.0-alpha.63`. Declarations drop the removed `nullable` attribute: a value that may be missing is now an optional prop or field, and a missing value reads as null. Tree Item chooses between its Cancel button and its actions slot with `$match`, because `$if` has no else branch. Runtime behavior is unchanged, but the generated TypeScript declarations change in two ways:
  - Combobox's `value-change`, `free-entry` and `create-entry` details declare `value` and `option` as optional (`value?: string | null`), not required `string | null`. Listbox's `value` prop and Editor Table Overlay's `geometry.activeCell` are optional in the same way. The events still carry `value: null` and `option: null` when nothing is chosen, so code that compares with `null` keeps working; code that assigns them to a `string | null` variable needs `?? null`.
  - Optional fields of object props and event details, such as an option's `group`, `description` and `tag`, also accept `null`, as HTML Next now treats a null field as missing. The Vue declarations import these types from `vue/props.d.ts`, which ships with the package.

## v0.30.2

- Expressive Markdown exports keep ordinary brackets, intraword underscores and at signs readable, while preserving literal syntax on import.

## v0.30.1

- Menu and Popover triggers stop looking pressed after a conditionally mounted overlay closes, including when the consumer controls `aria-expanded`.

## v0.30.0

- **Breaking:** Looma builds with HTML Next 1.0.0-alpha.58, and `@nextwebwg/html-next` is a peer dependency at exactly `1.0.0-alpha.58`. That release names every slot with an identifier and removes computed slot names, so three Looma slots change, and Looma declares 0.30.0:
  - Form Field's `label-action` slot is now `labelAction`. Migrate with `slot="labelAction"` (Vue `#labelAction`).
  - Combobox's per-option slots `option-<id>` become one scoped `option` slot that receives each suggestion as `option`, and its per-item slots `item-<id>` become one scoped `item` slot that receives each chosen item as `item`. Migrate a set of per-id slots to one `<template slot="option">` that reads `$option` (or `<template slot="item">` that reads `$item`), branching on `$option.id` where one option needs different content; Vue uses `#option="{ option }"` and `#item="{ item }"`. In plain HTML, a template with bindings needs HTML Next's live parser on the page.
  - An additive alias cannot keep the old names: HTML Next 1.0.0-alpha.58 rejects a slot name that is not an identifier, and a computed one, at build time.
  - Examples and LoomaEditor set component props with `componentRegistry.update`, which replaces HTML Next's `updateComponentProps`.
- Switcher, Reel and Cover lay out components passed into them, such as Card and Stack, as they lay out plain elements. Switcher sets its children on a grid that flips between one equal-width row and a stack at its threshold, and stacks above its limit; Reel gives every child its item width from a column grid; Cover keeps a child wider than itself in view from its start edge. Reel's snap alignment still applies only to plain elements, since a component's root is out of Reel's styling scope.
- Tooltip opens for a trigger that already has visible keyboard focus when the tooltip attaches, as it does when focus arrives later. A trigger focused before its tooltip connected, or before the tooltip's `for` named it, showed no hint until it was focused again.

## v0.29.18

- Center TOC gutter icons without text baseline spacing, and keep long-link action bars compact on phones. Supporting icons can use a secondary or muted tone without a text wrapper.

## v0.29.17

- Editor: TOC settings now sit quietly in the left gutter, revealing a lighter gear from a dot on proximity, hover, focus or TOC selection. Touch keeps the control visible.

## v0.29.16

- Editors can refresh cached link titles and mention names without changing document content or undo history. Automatically labelled links retain their original target IDs, custom wording stays editable, and Expressive Markdown serialization includes current display values and concrete TOC entries.

## v0.29.15

- Automatic tables of contents exclude headings inside other TOCs from editor navigation and Expressive Markdown exports. Authored navigation keeps its content and anchors.

## v0.29.14

- Expressive Markdown roundtrips preserve whitespace in formatted text, adjacent and nested formatting, literal entity text, and authored empty paragraphs.

## v0.29.13

- Convert saved editor documents to and from Expressive Markdown with the browser-independent `@threadlabs/looma/editor/expressmark` adapter. Unsupported content produces a location-bearing error instead of silently losing data. Imported table-of-contents links remain authored content, and tab groups can synchronize stable values across differently worded labels.

## v0.29.12

- LoomaEditor draws images with Image's Vanilla factory in place of a Vue app per image: the stored attributes with delivery's on top go to the inner `img`, an attribute delivery drops is removed, selection and editability set Image's props, a resize commit writes the node's size as one undo step, and Image disconnects when the image is deleted. With this, every LoomaEditor node view is built from Looma's Vanilla factories. LoomaEditor's behavior and public API stay the same.
- Looma builds with HTML Next 1.0.0-alpha.57, and `@nextwebwg/html-next` is a peer dependency at exactly `1.0.0-alpha.57`. Component rendering and behavior are unchanged.

## v0.29.11

- LoomaEditor composes the table of contents and its settings from List, Button, Text, Icon Button, Tooltip, Popover, Form Field and Menu through their Vanilla factories in place of a Vue app per table: entries rebuild only when the headings or the format change, the dropdowns edit a draft that Save writes and Cancel drops, readers see only the entries, and the components disconnect when the table is deleted. LoomaEditor's behavior and public API stay the same.
- Looma builds with HTML Next 1.0.0-alpha.56, and `@nextwebwg/html-next` is a peer dependency at exactly `1.0.0-alpha.56`. No Looma component declares head content in its carrier, so the release's head-declaration rule (HS002) needs no change, and component rendering is unchanged.

## v0.29.10

- LoomaEditor composes collapsible sections from Disclosure, Icon Button, Tooltip, Popover, Input, Checkbox and Button through their Vanilla factories in place of a Vue app per section: ProseMirror's content sits in Disclosure's slot, the settings popover saves the summary and whether the section starts expanded, readers see only the disclosure, and the components disconnect when the section is deleted. LoomaEditor's behavior and public API stay the same.

## v0.29.9

- LoomaEditor draws callouts with Callout's Vanilla factory in place of a Vue app per callout: ProseMirror's content sits in Callout's slot, tone and heading follow the node, and Callout disconnects when the callout is deleted. LoomaEditor's behavior and public API stay the same.

## v0.29.8

- LoomaEditor draws document dividers with Separator's Vanilla factory in place of a Vue app per divider: the editor creates the `<hr>`, sets its `selectable` and `selected` props as the selection and editability change, and Separator disconnects when the divider is deleted. The Vue output keeps HTML Next as an external peer import instead of bundling part of it, and carries the factory's styles in `vue.css`. LoomaEditor's behavior and public API stay the same.

## v0.29.7

- LoomaEditor's table controls move into a framework-neutral module: which of the toolbar and overlay a table shows, the selection's formatting and actions only in its own table, and where the toolbar and overlay sit. LoomaEditor's behavior and public API stay the same.
- LoomaEditor's code language picker moves into a framework-neutral module: the code block holding the selection, the choices with Auto naming the detected language and an unavailable saved language kept, the picker's place above or below the block, and saving a choice as its own undo step. LoomaEditor's behavior and public API stay the same.

## v0.29.6

- LoomaEditor's toolbar tooltip moves into a framework-neutral module: the first button waits 400 ms, moving along the row while it shows is immediate, and keyboard focus shows it at once. LoomaEditor's behavior and public API stay the same.

## v0.29.5

- Looma builds with HTML Next 1.0.0-alpha.55, and `@nextwebwg/html-next` is a peer dependency at exactly `1.0.0-alpha.55`. LoomaEditor asks its requests with `RequestEvent.request` and shows Insert image and link search whenever `RequestEvent.hasResponder` sees a responder on its path, including one registered with `RequestEvent.respond()` before the editor mounted, without waiting for a first upload. A responder added with a plain `addEventListener` still answers but is not seen. HTML Next's `respond()` is now `RequestEvent.respond()`.

## v0.29.4

- LoomaEditor's editing dock for narrow screens moves into a framework-neutral module: the 767px width it starts at, its place against the bottom of the visual viewport above an on-screen keyboard, and whether it shows formatting or table controls. LoomaEditor's behavior and public API stay the same.

## v0.29.3

- LoomaEditor's passage and range actions move into a framework-neutral module: the range actions at the caret, grouped by ID, and the selected passage with its context. `LoomaEditorSelectionAction` and the other action types are still exported from `@threadlabs/looma/vue/editor`. LoomaEditor's behavior and public API stay the same.

## v0.29.2

- LoomaEditor's chip editor moves into a framework-neutral module: it opens on one chip and writes each label and tone change to that chip, and closes when the chip is gone. LoomaEditor's behavior and public API stay the same.

## v0.29.1

- Looma builds with HTML Next 1.0.0-alpha.54, and `@nextwebwg/html-next` is a peer dependency at exactly `1.0.0-alpha.54`. HTML Next now keeps whitespace between inline elements as a space, as HTML does. Tooltip places its label and shortcut side by side in a row with a gap, so the space between them adds nothing; a long label wraps beside the shortcut. Image Toolbar, Link Form, and Code Language pass their nested components' boolean props as plain attributes again, since the Vue output now types them.

## v0.29.0

- **Breaking: LoomaEditor asks for uploads, mentions, links, slash commands, and extensions as [HTML Next requests](https://nextwebwg.org/declarative-components/javascript#requests).** Its callbacks each had their own shape (`uploadImage(file)`, `mentionProvider(query, { limit })`, `linkSearch(query)`, `linkResolve(href)`, `slashCommands(defaults)` or an array, and `extensions` as an array). None could be canceled or report progress, and only the component's parent could answer them. HTML Next defines one contract for a component that asks its consumer, which the editor generated from HTML Next will use. An additive option would leave two shapes for every callback. Every one is now a function prop `(detail, { signal, progress }) => answer`, whose answer is the value, `null` for none, or a promise of either: `extensions` (`null`, Tiptap extensions), `slashCommands` (`{ defaults }`, commands), `mentionQuery` (`{ query, limit }`, mention items), `linkSearch` (`{ query }`, link targets), `linkResolve` (`{ href }`, a link target), and `imageUpload` (`{ file }`, `{ src, alt?, width?, height?, responsive? }`). The same requests bubble from the editor as `RequestEvent`s, answered with `respondWith` from Vue's event form (`@image-upload`), an ancestor, or the document with HTML Next's `respond()`. The function prop answers first. `signal` aborts when the author types another character, cancels an upload, or the editor unmounts. Image uploads show their progress with a Cancel button. An `extensions` answer that arrives after the editor is built rebuilds it and keeps the document. To migrate, rename `uploadImage` to `imageUpload` and return `{ src }` where it returned a URL or `{ url }`; rename `mentionProvider` to `mentionQuery` and read `{ query, limit }` from its first argument; read `{ query }` in `linkSearch` and `{ href }` in `linkResolve`; read `{ defaults }` in `slashCommands` and pass an array as `() => commands`; and pass `extensions` as `() => extensions`. The types are `LoomaImageUploader`, `LoomaMentionQuery`, `LoomaLinkSearch`, `LoomaLinkResolve`, `LoomaEditorSlashCommands`, and `LoomaEditorExtensions`, each a `LoomaResponder` of its detail and answer; `LoomaImageUploadResult` is replaced by `LoomaImageDescriptor`. `createLoomaMentionExtension` and its `LoomaMentionProvider` are unchanged.

## v0.28.21

- LoomaEditor names each task item's checkbox by the item's text, so a screen reader announces the task instead of an unnamed checkbox. In the editor the checkbox follows the text as it is edited, and an empty item's checkbox is named "Task"; in saved HTML the checkbox carries the text as `aria-label`. The saved structure is unchanged, so earlier content reads as before.

## v0.28.20

- Looma builds with HTML Next 1.0.0-alpha.53, and `@nextwebwg/html-next` is a peer dependency at exactly `1.0.0-alpha.53`.
- Image Toolbar finds its description popover and field through refs, its controls use `data-placement` and `data-action` again, and Link Form and Code Language read a missing results or languages list as empty without a default. Their behavior and API stay the same.

## v0.28.22

- LoomaEditor's image uploads move into a framework-neutral module: each file goes to the host's `uploadImage` in turn, the image it returns is inserted at the selection, and a failed upload leaves the document unchanged and keeps the file for Retry. `LoomaImageUploader` and `LoomaImageUploadResult` are still exported from `@threadlabs/looma/vue/editor`. LoomaEditor's behavior and public API stay the same.

## v0.28.19

- A code marker can be shown as text: a backslash between `[` and `!`, `[\!code highlight]`, escapes it, so it highlights nothing and shows as `[!code highlight]`, with each further backslash shown as one. `applyLoomaCodeNotation` and the markdown-it plugin apply the escape, LoomaEditor keeps it as source and writes it back, and the Looma Markdown page's own example of the marker uses it.

## v0.28.18

- Looma Markdown's canonical HTML shows code as readers see it: a `[!code highlight]` comment is removed from the code, as the spec says. `applyLoomaCodeNotation` in `@threadlabs/looma/markdown` returns the code and the lines it highlights. `createLoomaMarkdownIt` and `loomaMarkdown` take `{ codeNotation: "keep" }` for an editor, and LoomaEditor uses it, so it still edits and writes the comment as source.
- A task list item's checkbox now has an accessible name: its checkbox and text share one label, `<li data-type="taskItem" data-checked="true"><label><input type="checkbox" disabled checked> Text</label></li>`. Every fixture's canonical HTML is checked with axe in Chromium.
- `splitLoomaFrontmatter` recognizes front matter whose values are lists or mappings, such as `aliases:` followed by list items, where it used to need a `key: value` line. Any YAML mapping between the `---` lines counts.

## v0.28.17

- `loomaMarkdownFromDoc` writes every form of Looma Markdown, so a document read from Markdown writes back as the same Markdown. Chips and mentions are directives (`:chip[Ready]{tone=green}`, `:mention[Ada]{id=u1}`), the table of contents is `::toc{…}`, task lists are GFM `- [x]` items, and an image is `![alt](src "title")` with braces for its size and placement. Code keeps its fence line (title, highlighted lines, line numbers). A table that fits GFM is a GFM table and any other is clean HTML. A heading carries `{#id}` only when its ID differs from the one its text derives. Text that would read as a Looma block or a heading's braces is escaped. Front matter is the host's page metadata and is not written.
- LoomaEditor holds headings 1 to 6 and keeps a code block's fence line in a new `meta` attribute, saved as `data-meta` on its `code`. Figures (`LoomaFigure` and `LoomaFigcaption`, saved as `<figure>` and written as `::: figure Caption`) and tabs (`LoomaTabs` and `LoomaTab`, saved as `<ui-tabs>` and written as `::: tabs` or `::: code-group`) are new nodes in the default preset. While editing, tabs show their panels one after another under their labels. A figure needs block images, so the preset leaves it out when `imageInline` is set.
- New heading IDs follow Looma Markdown's anchor rule: a heading gets the ID its text derives (`getting-started`) in place of a numbered `looma-heading-N`, and a derived ID follows the text when it changes. A custom ID stays with its heading through renames and moves, and so does every ID saved before this release, including `looma-heading-N`, so existing links keep working; Markdown writes those as `{#id}`.

## v0.28.16

- Looma Markdown is the named Markdown standard that Markupress renders and LoomaEditor reads and writes: CommonMark and GFM, Looma's `:::` blocks, and a Markdown form for everything the editor makes. Its page in the docs replaces Shared blocks. Colons name a Looma element and their number gives its scope (`:chip[Ready]{tone=green}`, `:mention[Ada]{id=u1}`, `::toc{depth=2}`, `::: figure Caption`), and braces after a heading, image or directive hold its attributes (`{#id}`, `{width=640 placement=wrap-left}`).
- `@threadlabs/looma/markdown` is a new entry point with Looma Markdown's vocabulary and pure rules: tones (`LOOMA_MEANING_TONES` shared by Callout and Badge, `LOOMA_BADGE_TONES`, `LOOMA_CALLOUT_TONES`, and the hues `LOOMA_CHIP_TONES` that chips and Swatch take), container names, brace attributes, the heading anchor rule (NFC and lowercase, keeping letters, numbers and combining marks in any script), fence info, front matter and writer markers. `@threadlabs/looma/markdown/markdown-it` is the reference implementation (`createLoomaMarkdownIt`, and `loomaMarkdown` as a plugin), and `@threadlabs/looma/markdown/fixtures` is the conformance suite with `normalizeLoomaHtml`.
- LoomaEditor reads Looma Markdown through that implementation. It now reads chips, mentions, the table of contents, task lists, image size and placement, GFM autolinks, and an image alone in its paragraph as a block image without an empty paragraph before it. Every heading read from Markdown gets its anchor. A closing `:::` closes the innermost container, a `:::` line inside fenced code stays code, `::: tabs` and `::: code-group` keep their panels' content, and `{open}` is a flag only on `details`. Front matter renders nothing when loaded with `loomaMarkdownToHtml`; pasting still keeps it as a YAML code block.
- `loomaMarkdownFromDoc` writes bullet items with `-` and closes a container on the line after its content.

## v0.28.15

- LoomaEditor adds `resolveImageSource` for browser-only master URLs, including legacy images without responsive metadata. Responsive renditions use the resolved master and fall back to it on failure, while saved JSON/HTML and image events keep their durable source. JSON documents apply delivery settings before the initial image request, and changing editability no longer emits a redundant document update.

## v0.28.14

- Component styles select their own state with `:host(:state(name))`, the form HTML Next 1.0.0-alpha.52 adopts from the Styling chapter in place of `:host-state([name])`, which it now reports as an error. Prop and state tests share one `:host()`, as in `:host([fill]:state(internalOpen))`. Looma builds with HTML Next 1.0.0-alpha.52 as its peer, which records a component's explicit props on its root as `data-<tag>-prop-<name>`, such as `data-ui-button-prop-tone`, in place of `data-<name>`, and marks converted Vue roots with `data-hn`. These are compiler markers, not Looma's API; a compact read-only LoomaEditor excerpt keeps its trimmed first and last margins by reading the new density record.

## v0.28.13

- LoomaEditor's choice of when its floating formatting tools show moves into a framework-neutral module: a text selection shows them, a press held still for half a second on the text shows them at its caret, and Escape hides them for that selection until the reader selects again. LoomaEditor keeps the tools' surface and its document listeners. Its behavior and public API stay the same.

## v0.28.12

- Swatch (`ui-swatch`) is a new form primitive: a round colour dot in the six chip tones (neutral, blue, green, yellow, red and purple) that is a native radio named by its tone. Inside a `ui-radio-group`, the group names the swatches, checks the one matching its value, moves between them with the arrow keys, and reports the choice. The checked and focused swatches show a ring at the focus width.
- Radio Group adds `label-visibility`: `sr-only` hides the legend visually and keeps it as the group's accessible name, for a row of choices whose purpose is already clear, such as colour swatches.
- Chip Editor (`ui-editor-chip-editor`) is the editor's chip editor as an HTML Next component, in HTML and Vue (`EditorChipEditor`): a field for the chip's text and a radio group of swatches for its colour, reporting `label`, `color`, and `done`. LoomaEditor uses it in place of its own form. The colours are now radios named by their tone ("Blue") in a group named Chip color for screen readers, rather than buttons named "Blue chip". A colour chosen with the pointer returns focus to the text, and the arrow keys move between colours.

## v0.28.11

- LoomaEditor's block actions and table overlay targeting move into framework-neutral editor modules: `runBlockAction` inserts a paragraph below, duplicates, or deletes the block holding the caret, and overlay actions first put the caret in the table and cell they name. LoomaEditor's behavior and public API stay the same.

## v0.28.10

- LoomaEditor's link editing moves into a framework-neutral link editing module: the link form's state, writing the link as the reader types, validation, the host's search and resolve calls, and the resolved target of the link at the caret. LoomaEditor keeps only presentation and focus. Its behavior and public API stay the same; `LoomaLinkTarget`, `LoomaLinkSearch`, and `LoomaLinkResolve` are still exported from `@threadlabs/looma/vue/editor`.

## v0.28.9

- Code Language (`ui-editor-code-language`) is the code block's language picker as an HTML Next component, in HTML and Vue (`EditorCodeLanguage`): a compact combobox of the languages the editor can highlight, with Auto first, that reports `language` when one is chosen. LoomaEditor uses it in place of its own combobox; the picker looks and behaves as before.

## v0.28.8

- Link Form (`ui-editor-link-form`) is the editor's link form as an HTML Next component, in HTML and Vue (`EditorLinkForm`): the destination field with its search results or Open in new tab, and a Text field for a new link. The editor passes its state in and applies each change the form reports (`destination`, `text`, `new-tab`, `choose`, `clear`, `save`, `dismiss`). LoomaEditor uses it in place of its own render code; the form looks and behaves as before.

## v0.28.7

- Link Card (`ui-editor-link-card`) and Block Actions (`ui-editor-block-actions`) are editor parts as HTML Next components, in HTML and Vue (`EditorLinkCard`, `EditorBlockActions`). Link Card shows a link's destination with Open link, Edit link, and Remove link, and reports `edit` and `remove`. Open link opens `open-href`, which the editor sets only for an http, https, mailto, tel, or relative address. Block Actions is the block menu (insert a paragraph below, duplicate, delete) and reports `action`. LoomaEditor uses both in place of its own render code; they look and behave as before, except that a block action now applies to the block holding the caret when it is chosen.

## v0.28.6

- Looma builds with HTML Next 1.0.0-alpha.51. Its Vue components mark their root with the component's tag as a class (`class="ui-button"`) rather than `data-component`, and scope their styles with native `@scope`; both markers are rendering details, not API, as the Tokens guide says. The editor surface, collapsible editor sections, and a mention row's slotted avatar match either marker. Vue `:host` rules have the live runtime's specificity, so a class an app or LoomaEditor sets on a component root overrides them as in HTML, and `:host` rules under an ancestor selector, such as compact controls on touch, match the component root. Expression arithmetic is decimal (`0.1 + 0.2` is `0.3`). Conditional content (`$if`, `$match`) keeps its elements, focus, and typed text when its decision does not change, and bindings write only changed values.
- `@nextwebwg/html-next` is a peer dependency at exactly `1.0.0-alpha.51`, so an app that also uses HTML Next installs one copy, shared with Looma. Looma's registration entry and its Vue and plain DOM components import HTML Next's runtime, and the code they ship is generated by this version; HTML Next alphas may break generated components in any release, so the range is exact until HTML Next 1.0. Apps that install with peer auto-installation (npm 7+, pnpm's default) need no change; otherwise add `@nextwebwg/html-next@1.0.0-alpha.51`.

## v0.28.5

- Image Toolbar (`ui-editor-image-toolbar`) is the editor's image actions bar as an HTML Next component, in HTML and Vue (`EditorImageToolbar`): four placement commands, a description form, and delete, each reported as a request (`placement`, `describe`, `delete`) for the editor to apply. LoomaEditor uses it in place of its Vue-only image controls; the bar, its tooltips, and the description form are unchanged.

## v0.28.4

- LoomaEditor's table row and column handles open in the top layer, beneath the table toolbar, the table context menu, and the editor's other floating tools, so no clipping or stacking context around the editor hides them and they never cover those controls.

## v0.28.3

- LoomaEditor's formatting toolbar, link card, and image actions use Looma's overlay layer instead of tippy.js: they open in the top layer beside the selection, follow it through scrolling and layout changes, stay inside the editor in `contextual` mode, and take part in the shared Escape and outside-press order with Looma's popovers and dialogs. Image actions now also open in the top layer. After the link editor closes, clicking the same link shows its link card.

## v0.28.2

- LoomaEditor creates its Tiptap editor through a framework-neutral editor session, which owns the editor's lifecycle, moves its view into the document element, and applies `modelValue` with the reader's selection kept. LoomaEditor's behavior and public API stay the same; `ready` and the exposed `editor` remain `@tiptap/vue-3`'s reactive `Editor`.

## v0.28.1

- LoomaEditor's link, shortcut, selection-geometry, image-delivery and code-highlighting helpers move from the Vue editor into Looma's framework-neutral editor modules, the first step toward LoomaEditor as an HTML Next component (`docs/plans/2026-10-14-editor-html-next-component.md`). LoomaEditor's behavior and public API stay the same.

## v0.28.0

- **Breaking: LoomaEditor saves callouts as Callout.** The callout node used to render and save its own `<aside data-looma-callout data-tone>`, styled by a copy of Callout's rules in the editor stylesheet. Callouts therefore looked different in the editor than in pages, and saved HTML matched neither Callout nor the Markdown that Markupress renders. The owner direction is one block vocabulary across components, the editor and Markdown. A saved `aside` keeps those two shapes apart, so an additive option cannot fix it. The node now saves `<ui-callout tone heading>`, and the Vue editor draws it with Callout itself; the separate editor styling is removed. Content saved as `<aside data-looma-callout>` still loads and is saved as Callout from then on. To migrate, register Looma's components wherever saved editor HTML is shown, and update code that queries or sanitizes `aside[data-looma-callout]` or `data-tone` to use `ui-callout` and `tone`.
- Editor callouts take every shared tone: note, tip, info, important, warning and danger. `caution` loads as `danger` and `neutral` as `note`. Each tone has a slash command; **Tip**, **Important** and **Danger** are new. The `caution` search alias moves from Warning to Danger, matching Callout. Callouts keep an optional `heading`.
- Editor Markdown works in both directions. Pasted Markdown now reads `::: tone Title` … `:::` callouts, GitHub `> [!NOTE]` alerts and `::: details Summary` sections. `loomaMarkdownToHtml` renders the same Markdown for `setContent`, and `loomaMarkdownFromDoc` writes a document as Markdown in that syntax.
- A new Shared blocks page documents the vocabulary that Markupress implements: syntax, component and editor node.
- Icons add `lightbulb` and `message-square-warning`.

## v0.27.5

- Callout adds the tones `tip` and `important`, and `caution` as an alias of `danger`, so its tones match VitePress, Docusaurus and GitHub alerts: note, tip, info, important, warning and danger. Each new tone has its own Lucide icon and colour. A `heading` option adds a short heading above the message. Existing tones keep their look; `note` remains the muted `neutral` aside.
- Tabs adds `group`: Tabs with the same group select the tab with the same label together across the page, and remember the choice in the browser for the next visit. A `value` the page sets wins over the remembered choice. Tabs without a group are unchanged.

## v0.27.3

- Selects share text inputs' subtle field outline with a slightly raised resting shadow; text inputs and searchable fields retain their inset shadow. Matching single-line sizes now have the same height, including touch combobox affordances. These corrected defaults apply to existing fields without configuration; they keep selected values, events and keyboard behavior unchanged.
- Button adds `variant="field"` for custom value pickers, using Select's neutral field edge and lift independently of action tone. Existing action variants are unchanged.

## v0.27.2

- Overlay badge counts use a quieter fill, keeping contrasting white text legible on saturated purple controls.

## v0.27.1

- Badge adds an opt-in overlay treatment for counts on filled controls: inherited text on a faint tint, without a rim or shadow, with a smaller 20px circle at the small size. Existing badge recipes are unchanged.

## v0.27.0

- **Breaking: authored toasts hide themselves when dismissed.** Previously a toast's close button, action, or `duration` only emitted `dismiss` and waited for the application to remove it, so a toast with no handler could not be closed and its duration did nothing visible. Dialog already closes itself and reports `close`; Toast now does the same: it sets the native `hidden` attribute, then emits the unchanged `dismiss` event. An opt-in option would leave the broken default in every app that never set it. Apps that remove the toast on `dismiss` keep working. To show a dismissed toast again, clear `hidden`, which also restarts its duration. A toast authored `hidden` waits to be shown before its duration starts. Toast Region ignores hidden toasts and closes once all of its toasts are hidden.
- Listbox caps its visible choices at `rows` and hides them until it upgrades. Its rule styled a nested component's root, which HTML Next's scoped styles never match, so it had no effect. Scroll Area adds a `padding` option (`none` by default, then `xs`, `sm`, `md`, `lg` on Card's scale) that scrolls with the content, keeping the scrollbar and fades at the edges.
- A colored accent edge now has straight corners on its side: danger Card and Section cards no longer round the corners their stripe runs into.
- Popovers and menus render in the browser's top layer, above page content and outside ancestor clipping, transforms and stacking contexts. One anchored with `for` stays attached to its anchor as the page scrolls or resizes. One without `for` stays at the place it is written and travels with it, instead of moving to the viewport corner. Table Context Menu follows the same model: in page flow it stays where it is written, and in a fixed or absolutely positioned box, as LoomaEditor places it, it keeps inside the viewport.
- Table Context Menu separators sit only between sections, with none above the first, and cell background swatches keep whole labels: three to a row at the menu's full width, fewer in a narrower menu.
- Dialog and non-modal Search Shell render in the native top layer, escaping clipping, transformed parents, and page stacking contexts while preserving non-modal interaction and focus return.
- Dialog optically balances its header inset and sizes to its content. Open dialogs animate content growth and shrinkage over the dialog motion duration instead of jumping; active resizing retargets, and reduced-motion users still resize immediately.
- Floating controls share one document scroll/viewport coordinator. Editor menus and floating toolbars also use the native top layer; suggestion snapshots can remeasure their caret anchor with `getRect()`. Static docs popup examples use isolated viewports instead of overriding production positioning. Dialog checks now compare desktop/mobile screenshots in both themes and sample real-motion positioning and stacking.
- Table context menus keep their minimum width inside narrow presentation viewports.

## v0.26.25

- Icon Button adds an anticipatory neutral rounded-bar guide and keeps pressed feedback from replacing positioning transforms.
- Hover/focus action tooltips dismiss on activation and persist only for keyboard-visible focus; click-trigger help toggletips retain their behavior.


- Link fields apply valid destination, text, and new-tab changes directly while preserving input focus. The popup has no footer buttons; Enter, Escape, or an outside click closes it, and nearby link actions retain Open and Remove.

## v0.26.24

- Editor link actions and formatting tools remain stable when changing between desktop and phone layouts. Editing a link focuses one visible form and keeps its controls inside the viewport.

## v0.26.23

- Multiple comboboxes can opt into clearing unfinished search text when focus leaves the control, without changing selected items, option creation, or the default query-preservation behavior.

## v0.26.22

- Hold Command on macOS or Control elsewhere over editor links for a pointer cursor and click to open a new tab. Clicking a link normally reveals compact Open, Edit, and Remove actions above it. Link forms separate link utilities from aligned Cancel and Save actions.

## v0.26.21

- Cell background menus recognize saved preset colors in both hex and RGB form, keeping the current color selected after an HTML round trip.

## v0.26.20

- Deleting a table dismisses its cell controls immediately, including controls opened by hovering a cell.

## v0.26.19

- Table cell actions follow hover and keyboard focus and remain usable after deleting a row. Empty cell state no longer interrupts table controls.
- Table options remain open and clickable on phones while their controls have focus, and escape the scrolling dock's clipping.
- Bulleted and numbered lists use compact spacing between items, including inside table cells, while retaining paragraph and nested-list separation.

## v0.26.18

- Menus support fixed icon columns that align labels across icon-bearing and text-only rows, including grouped items and links. Menu items accept decorative icons in a named slot and a danger tone for destructive actions.

## v0.26.17

- Meter can display mutually exclusive categories as one proportional distribution, with complete accessible descriptions and server-rendered geometry.

## v0.26.16

- Text supports opt-in font-edge trimming for compact headings and labels, so adjacent icons and surface padding can align without application styling overrides. Existing prose metrics stay unchanged.

## v0.26.15

- Escape cancels the latest Markdown conversion when no menu is open. Undo restores its complete literal source and Redo reapplies formatting in compact and document editors.

## v0.26.14

- Compact text badges have enough horizontal spacing to keep labels clear of their rounded edges. Ordinary badges and fixed circular or square marks retain their geometry.

## Unreleased

- Overlay counts keep a quiet circular boundary on filled actions while preserving text contrast.

- Compact fields reserve their initial editing height before mount, keeping surrounding scrolling layouts stable.

- Add a toolbar-free compact Vue editor and safe content renderer for short rich text, with bold, italic, inline code, Markdown typing and history shortcuts.

## v0.26.11

- Row highlights on colored Cards, Callouts and card Sections use a shade of the surrounding surface instead of an unrelated brand wash. Neutral panels retain brand highlights, including nested panels. Hover, selection and their faint edges stay coherent in light and dark themes; action intents and keyboard focus remain independent.

## v0.26.10

- Annotated editor ranges can expose grouped host actions at the caret in the contextual toolbar and narrow dock, including read-only documents.

## v0.26.9

- Hovered and selected rows use a slightly stronger accent tint, so their filled area remains distinct from softly colored panels while retaining the faint edge and stronger keyboard focus.

## v0.26.8

- Escape closes the complete Format inventory and its contextual selection gesture.

## v0.26.7

- Pale list, surface navigation and tree highlights have a faint continuous inset edge that stays visible on softly toned panels. Keyboard focus keeps its stronger ring, with no row size change or second border on framed list cards.

## v0.26.6

- Add opt-in compact editor formatting and host-owned passage actions, including read-only selections and the narrow editing dock.

## v0.26.5

- Boxed Button and IconButton actions use flat faces, fine edges and one soft shadow that keep joined actions readable, with inherited edge and shadow theme values. Circular inverse Badge counts use a tone-tinted surface with a lighter rim and readable tone ink in light themes, and a shaded surface in dark themes; inverse pills retain their existing appearance.

- Button adds a `badge` slot that keeps compact circular counts aligned with ordinary actions and matching Icon Buttons. Badge adds `size="sm"` with compact text that fits bounded counts such as `99+` in a 24px circle. Existing Badge sizes and default Button content retain their spacing.
- Neutral card Buttons use a quiet decorative border while standard outline actions retain their tone-colored edge.
- Input Group adds `variant="subtle"` for a muted composer surface with one shared frame around its textarea and action, retaining standard focus and field states.

## v0.26.4

- Toast, generated Toast Region messages, and Callout use an even rounded border instead of a thicker, differently colored leading edge. Toast tones color the whole outline; Callout retains its shaded background. This corrects the default shape for all notification consumers without changing props, dismissal behavior, or status semantics. Existing explicit border and surface hooks remain available.
- Every Toast tone now has a softly shaded surface, including a quiet muted neutral tone, and uses the small text scale. This makes authored and generated notifications more compact and gives every message a visible tone without requiring a variant. Explicit surface hooks continue to override the default.
- Toast's close icon sits slightly nearer the outer edge for more balanced spacing beside its message, while retaining its existing click and touch targets.

## v0.26.3

- Circular Badge labels center capitals and numerals by their visible capital height in browsers supporting text-box trimming; icons retain their existing alignment.
- Badge adds a larger 32px circle and 40px square with `size="lg"`, with room for short counts such as `30` and `99+`. Its `inverse` variant uses a partly translucent contrasting surface for labels on a filled control, retaining readable tone ink. Text pills and fixed text marks use the same capital-height/alphabetic-baseline centering. Ellipsis clips only horizontal overflow, keeping ascenders and descenders visible within the existing badge geometry.
- Inverse circular counts and round avatars have a shallow shadow, giving them a small amount of lift above the surrounding surface.
- List Item adds opt-in `align="title"` to keep leading and trailing marks beside the first title line when descriptions wrap. Existing rows retain centered alignment.

## v0.26.2

- Icon Button accepts accent and neutral tones and keeps native pressed outline toggles visibly selected with a light wash and inset shadow. Existing appearances remain unchanged when tone is omitted.
- Badge adds a fixed circular shape that centers a visible glyph or icon, including a compact 16px size.
- Container offers opt-in `fill` to keep readable lines while its scrolling content fits a bounded panel.

## v0.26.1

- Dialog body content aligns with its title in HTML and Vue, keeps short content compact, and uses equal side and bottom gutters around its actions. Dialog owns its body layout instead of styling a nested component root excluded by HTML scoping. Scroll Area adds opt-in `trim` to remove only projected content's outer block margins; existing scroll areas keep their margins.

## v0.26.0

- **Breaking runtime requirement:** Looma requires Node 22.22.2 or later in Node 22, or Node 24.15 or later in Node 24 (previously 22.13 and 24.0). Looma now depends on HTML Next 1.0.0-alpha.35, whose server rendering uses jsdom 30, and jsdom 30 supports only those releases. Keeping the older range would let apps install a renderer that their Node release does not support. To migrate, update Node within its current major version.
- Component definitions write references to their props and state as `$name`, the expression syntax HTML Next requires since 1.0.0-alpha.34. Props, events, slots and rendered markup are unchanged. HTML Next components that an app writes beside Looma use the same HTML Next version, so their expression references need `$` as well, and their `$sort` keys start from the loop item (`$sort="p.price"` under `$each="p of $products"`). HTML Next's 1.0.0-alpha.34 and 1.0.0-alpha.35 changelog entries list every affected attribute.

## v0.25.7

- Tree Item offers actionsVisible for persistent status and controls, with long labels fading beneath them at rest and on hover or focus.

## v0.25.6

- List rows show a quiet hover surface across their full hit area and retain their current state while hovered. List Item offers leadingInteractive to keep a leading control separate from the row link. Checkboxes accept an accessible label without visible text, and Cluster can align the first text baselines of wrapped columns.

## v0.25.5

- Cards offer soft accent, info, success and warning tones without changing the appearance of their child controls. Layout props let Stack accept a measured height or fill remaining space, Scroll Area fill remaining space, Cluster reserve action spacing, and Text grow beside other content. Textarea can cap visible rows while allowing extra text to scroll. Read-only editor excerpts can fit their content through contentDensity.

## v0.25.4

- Badges align and space ordinary icon-and-text content without clipping glyphs, and offer a leading `icon` slot that stays visible when labels truncate. Buttons now space ordinary icons and text consistently.

## v0.25.3

- Collapsed tree branches keep their own disclosure direction beneath expanded ancestors, matching the files they actually show.

## v0.25.2

- Multiline Input Group offers an upper-end action position with text space reserved for changing labels and pending indicators, keeping the native textarea resize grip clear. Existing below-text placement remains the default.

## v0.25.1

- Input Group supports multiline Textarea fields with an action below the text, sharing one border and accessible focus/invalid/disabled treatment in HTML and Vue.

## v0.25.0

- Vue consumers require Vue 3.5.43 or later so compiled generic Input declarations accept their declared modes. Input now declares the native file mode; file selection is read from the native change event’s `target.files`. Uncontrolled Vue Select components retain the browser’s first-option or authored selection.
- **Breaking: controller commands replace generated element methods.** Combobox's `validate()` and `focusInput()` and Toast Region's `show()` depended on `<method>`, an unsupported HTML Next construct outside the public proposal’s controller/event model. This removes that named-export bridge; aliases would require maintaining a separate imperative library adapter. Request combobox validation with a native `validate` event or `CommandEvent("command", { command: "--validate" })` and read `validation-change`; focus its native input directly. Add programmatic toasts with `CustomEvent("show-toast", { detail: { message, id?, tone?, duration? } })`; supply `id` when correlating `dismiss`. The existing `--show-toast` button command remains available. Controller connection subscriptions preserve setup and cleanup through reconnects. Component CSS now distinguishes resolved props with `:host([prop])` from mutable/computed state with `:host-state([state])`.

## v0.24.1

- Floating formatting supports Select All. Link and table pickers keep their toolbar anchor while editing; anchored surfaces retain their last valid position when a trigger becomes unavailable and wait for usable bounds before first opening.

## v0.24.0

- Holding a table column resize handle keeps floating text formatting closed.
- **Desktop floating toolbar behavior changes (0.24):** formatting opens on text selection or a held primary press and dismisses with Escape or caret movement. Previously, contextual tools appeared on every caret focus and obscured the writing surface. This shared default keeps floating tools tied to intent; an app-specific option would leave the obstructive default in other consumers. Apps needing persistent controls can use `toolbarMode="sticky"` or their explicit formatting popover. Small viewports retain the editing dock; toolbar placement defaults and document commands are unchanged.

## v0.23.25

- Card buttons center their grid row within spare height, so single-line labels sit vertically centered while wrapped labels retain top-aligned icons and content.

## v0.23.24

- Column-resize hints stay inside fitting tables, including narrow screens and larger text.
- Tooltips and popovers follow moving controls so hints do not cover their triggers.

## v0.23.23

- Button’s CardButton variant uses Button with its existing tones, an arbitrary icon slot, flexible top-aligned content, and a vertically centered action slot that defaults to a caret. Card borders and inline padding stay uniform.
- Separator can use strong emphasis when a composition needs clearer separation.

## v0.23.22

- Editable images no longer become viewer tab stops. Clicking selects the image and shows one contextual bar for block/center placement, left/right text wrapping, description, and deletion. Drag any corner to resize at the intrinsic aspect ratio; release commits one undo step, and Escape cancels. A shared Image primitive owns selection and resize handles; controls retain the UI font and standard hover/focus tooltips. Choosing wrapping uses one-third of the column on desktop and full-width stacking on small screens; corner dragging overrides the default size. Reading mode retains viewer activation and placement. Images fit narrow grid tracks without scrolling; full-width phone wrapping hides inactive resize handles. Image dimensions, placement, and responsiveness round-trip through the shared preset.
- Document dividers use the shared Separator’s optional selectable/selected states for a larger pointer target and selection feedback. Text/code Tab inserts a literal tab instead of skipping down the document; list indentation and table cell navigation keep precedence, and Shift-Tab outside them allows keyboard exit.
- `/expand`, `/toggle`, and `/details` insert collapsible sections with summary/default-expansion settings built from shared controls. Rich bodies round-trip through JSON and semantic HTML; plain text retains collapsed content. Reader toggles are temporary, and TOC navigation reveals hidden headings before focusing them.
- Turnkey editors accept `slashCommands` to extend or replace the existing inventory. Commands support stable IDs, optional groups, and capability predicates. Slash search ranks exact aliases first, prioritizes callouts over the quote alias, shows an accessible no-results state, and rejects stale menu selections. Hover and keyboard selection stay synchronized. Image is omitted without an upload/picker capability; literal code does not open slash suggestions.
- `/toc` inserts an automatic table of contents from document headings, with plain, bulleted, or numbered formatting and heading-depth settings built from shared controls. Heading anchors survive renames and moves, and read-only entries navigate without opening link editing. Headless integrations can inspect derived entries for document projections.
- `/status` finds the existing Chip command and retains its label/color editor and document format. Existing `/link` behavior is covered through slash insertion, keyboard destination selection, and cancellation.
- Escape closes only the top nested Menu or Popover, preserving its containing settings surface.

## v0.23.21

- Repeated component rows use inline text expressions; the updated converter emits the same direct Vue bindings as `$value`, without per-row text components.

## v0.23.20

- Radio Group's value consistently owns initial selection and form-reset selection in HTML and Vue, even when a child Radio is authored checked. The disabled example declares its selection on the group.

## v0.23.19

- Contextual formatting gives slash-command and mention suggestions priority, so their results remain clickable.

## v0.23.18

- Trees retain a keyboard entry point when row controllers load later or a hidden tree becomes visible, preserving the last focused row.
- Contextual editor controls stay inside the document area rather than covering actions above it; link actions share that surface without covering formatting commands.

## v0.23.17

- Component text uses `{$variable}` for inline values and slot fallbacks. IDs and accessible labels use `concat()`; Intl `format()` is reserved for localized presentation.
- Meters without `valueText` announce a whole percentage in the current browser or server locale, so assistive technology reads the appropriate digits and spacing. Explicit `valueText` stays verbatim, and fill widths remain locale-independent CSS percentages.

## v0.23.16

- IconButton can match an adjacent Button’s height with `matchButton` (`match-button` in HTML), including themed sizes and touch controls. Compact icon buttons keep their existing sizes.

## v0.23.15

- Touch tree rows keep labels separate from actions after tapping, including RTL and multiple selection.
- Touch input text stays readable inside small captions without disabling browser zoom.
- Editors can opt into a contextual toolbar with full commands at a focused caret or text selection; the existing mobile dock remains unchanged.

## v0.23.14

- Resizing a table column no longer adds a one-pixel scrollbar when the drag ends. Repeated reconciliation keeps fitting tables within the editor and preserves scrolling for wide tables.

## v0.23.13

- Badge and combobox chip labels retain room for their full text, including descenders, while long labels still ellipsize.

## v0.23.12

- Long badge and combobox chip labels truncate with an ellipsis inside their surface, preserving their full accessible text.

## v0.23.11

- Combobox can highlight a sole authored suggestion and commit it with Tab while preserving normal focus movement. Both behaviors are opt-in.

## v0.23.10

- Trees can reserve guided move activation for keyboard and touch, leaving desktop grips drag-only. Guided moves offer a visible standard Cancel button, Escape, and source-handle cancellation without changing order.
- Navigation disclosure labels, icons, and carets stay neutral when expanded; selection color remains reserved for current destinations.

## v0.23.9

- Sidebar resize handles report the requested width while layout animation settles, including when restoring a saved width.

## v0.23.8

- Disclosures can require one named-group member to stay open, animate bounded fill transfers, and rotate custom indicators without replacing them. Navigation headers and Nav Items share icon columns, spacing, and hover treatment; Nav Items support a trailing slot. Navigation icon columns now keep the body-size width at either density rather than shrinking compact icons below their neighbours.
- Feedback, reveal, and layout motion derive from shared duration and easing tokens. Docked sidebars animate occupied width, keep their content canvas stable, disable hidden controls, and support a collapsed-width hook for a separate rail. Drag resizing remains immediate and reduced motion disables transitions.

## v0.23.7

- Badge supports a rounded square for icon marks beside headings, using the existing semantic tones and shared spacing and radius tokens.

## v0.23.6

- List Items can wrap full titles and descriptions on narrow screens while preserving one-line rows by default. The shared icon catalog includes a notification bell.

## v0.23.5

- List Items can highlight several new items with a quiet accent wash without announcing a current or selected destination. Badges support a small dot shape with an accessible state label.

## v0.23.4

- Single-selection trees report a row’s default action on click or Enter, including an already selected row; selection and activation remain separate events.

## v0.23.3

- On phones, Link stays available during a held press and its picker keeps the toolbar anchor while its field has focus.

## v0.23.2

- Small Scroll Areas leave room after three compact results for the overflow fade, keeping the third location readable.

## v0.23.1

- Compact search results keep their title and location together when app buttons inherit body typography, so three rows fit before scrolling.

## v0.23.0

- Borders, dividers, emphasis edges, and keyboard focus now follow shared semantic width tokens across components and the editor.
- **Visual default change for selected rows (0.23):** navigation, trees, lists, search results, and choices share a faint accent surface, readable accent text, and selection corners. Nav Item keeps regular label weight and has no stripe by default; `variant="line"` provides a square, continuous edge marker. The previous rounded surface and inset stripe combined incompatible edge treatments; the surface default works alongside other row selections, while apps that need an edge explicitly choose `variant="line"`. Existing instance hooks remain available.
- Nav Item supports compact rows. The icon catalog includes compass and history icons.
- Disclosure can fill the available height in a bounded accordion, keeping its header visible while a nested Scroll Area scrolls. Its indicator slot accepts a custom decorative icon.

## v0.22.14

- Link pickers use standard fields, flat rich search results, and primary/secondary actions. With a destination search provider, one field searches or accepts a pasted full URL without switching modes. Existing-link actions use the same controls and UI font. Compact results show three rows before scrolling. Link is available from selected text, and `linkBaseUrl` makes newly inserted same-origin links relative across picker and paste flows.

## v0.22.13

- Typing `/link` opens the editor's link picker, including host-supplied destination search when available.

## v0.22.12

- Editor links can search host-provided destinations separately from website URLs. Existing links show the destination's full address or resolved title, with clear edit, remove, and open actions.

## v0.22.11

- Tooltips now close immediately when another tooltip, popup, dialog, Search Shell, sidebar drawer, toast, or editor toolbar opens, including while a delayed tooltip is queued. Nested modal dialogs keep one visible backdrop and closing a child leaves its parent open.
- Editor selection and link toolbars escape clipped containers. The editor guide now shows how sticky and selection toolbars behave, and Input Group gives fixed affixes a neutral surface and divider.

## v0.22.10

- Looma now uses HTML Next alpha.19. Its controllers read declared props through `host.props.<name>.value`, matching HTML Next’s separate prop handles. This preserves the existing component API while allowing the host to expose each prop’s supplied input and validity independently from component-owned state.

## v0.22.9

- Badges can use `size="xs"` for compact counts beside small controls, with the usual tone and variant choices.

## v0.22.8

- Search Shell stays open when a component inside it, such as a Tooltip on its Clear button, reports its own `close`. Only the dialog closing itself closes the shell.

## v0.22.7

- A `<kbd>` in Tooltip's or Menu Item's `shortcut` slot reads in the surrounding type in Vue too, instead of the browser's monospace.

## v0.22.6

- Looma now uses HTML Next alpha.18. Combobox expressions use dotted list indexes (`rows.0` and `internalItems.0`) so they compile under the updated expression grammar; the public Combobox API is unchanged.

## v0.22.5

- The editor toolbar's shortcut hints show ⌘ on a Mac in a secure context too, where the browser reports the platform as "macOS" rather than "MacIntel".

## v0.22.4

- Tooltip has a `shortcut` slot: a keyboard shortcut follows the label after a thin divider, in smaller, quieter text, as Menu Item shows one. The editor toolbar's tooltips now show each command's shortcut this way, written for the reader's platform (⌘B on Apple devices, Ctrl+B elsewhere).

## v0.22.3

- Mention rows keep a highlighted person's initials visible: on the highlighted row the initials circle takes the surface colour with a fine accent ring instead of blending into the highlight. A photo Avatar placed in a Mention Menu Item's `start` slot shows as its own circle, without the initials circle behind it.

## v0.22.2

- Looma now uses HTML Next alpha.16. Vue components that validate their props no longer overflow the call stack on mount in a DOM without native form validity, such as happy-dom in component tests.

## v0.22.1

- `@threadlabs/looma/vue/editor` also exports the menus' authored rows: `EditorMentionMenuItem`, `EditorSlashMenuItem`, and `EditorSlashMenuGroup`, so an app can compose the editor's person and command rows from the editor entry point alone.

## v0.22.0

- Looma now uses HTML Next alpha.15. Its component definitions declare typed literal state values and rely on the new value constraints and validity behavior. This changes authored definitions; the public component tags and JavaScript arrays retain their existing shape.
- Authors of custom HTML Next definitions use typed literal `value` on `<state>` and `expr:value` for
  action-time expressions on `<set>` and `<dispatch>`, in place of the `:value` expression.

## v0.21.6

- Avatar Group has an `xs` size for a group inside a line of small text: xs avatars overlap by a smaller amount and the +N badge matches their size.
- Extra-small Buttons have 1px more room above and below their content and 1px less at each side, so an avatar inside an `xs` pill no longer touches its edge. Under touch, an `xs` Button keeps its size inside its line of text and takes presses through an invisible touch-sized hit area, as link Buttons do, instead of growing to the touch minimum.

## v0.21.5

- Vue components accept a bare boolean attribute as `true`, as Vue does: `<Avatar decorative />` now works instead of throwing. This follows HTML Next alpha.14.
- Button has an `xs` size (1.5rem) and a `shape="pill"` option with fully rounded ends, for a small choice inside a line of text, such as a status or a person.
- Menu has a `size="sm"` option that matches a small trigger: smaller text, shorter rows, a smaller check, and a narrower minimum width.
- **Visual change for radio Menu Items:** the chosen item now shows a check instead of a filled radio circle, the same mark checkbox items use. A radio circle reads as a form control inside a menu, and a check is the convention people expect there. Unchosen items keep an empty slot, so labels stay aligned.
- **Visual change for Ghost Button:** while pressed or holding its menu open, it sinks into a light surface with a faint edge, instead of a darker tinted fill. The darker fill read as heavier than hover, so an open menu's trigger looked stuck.

## v0.21.4

- Avatar's `xs` initials are smaller (9px), so two initials sit comfortably inside the 1.25rem circle. Every size sets its own line height, so the initials sit the same wherever the avatar appears.

## v0.21.3

- Avatar has an `xs` size (1.25rem) with the smallest initials, for naming a person inline in a line of small text.

## v0.21.2

- Component definitions use HTML Next's `list` declaration for nested collections. This changes authored definitions only; consumers still receive JavaScript arrays and use the same component APIs.

## v0.21.1

- Nested Tree items now advance by one indent per level, keeping deeper pages and folders aligned instead of shifting them progressively farther right.

## v0.21.0

- Looma's declarative component definitions now use `from:attr` for reactive one-way values. This follows HTML Next alpha.12; component consumers keep the same HTML and Vue APIs. Authors of custom HTML Next definitions should replace `:attr` with `from:attr` in rendered markup. The `:value` expression on `<state>`, `<set>`, and `<dispatch>` keeps its existing syntax because it is evaluated when that declaration or handler runs.

## v0.20.0

- **Breaking runtime requirement:** Looma now supports Node 22.13 and Node 24, matching its HTML Next dependency. Node 20 is no longer supported.
- **Breaking for Table Overlay:** its catch-all `action` event is replaced by named insertion, selection, reorder, and menu events. Listen for `add-row-before`, `add-row-after`, `add-column-before`, `add-column-after`, `select-row`, `select-column`, `reorder-row`, `reorder-column`, `open-cell-menu`, `open-row-menu`, or `open-column-menu` and read the fields directly from each event detail. The editor adapter continues to handle these actions.
- **Breaking for Input:** `type` selects the declared `value` and Vue `modelValue` type. Number and range modes use a JavaScript number; other modes use a string. An omitted value without a default is `null`, and a number field reports `null` when its text contains no number. Generated Vue types preserve the relationship. Numeric bindings keep in-progress text such as `12.`, `1.0`, and `1e3` without moving the caret.

## v0.19.1

- Tree marquee measures the rendered name instead of a full-width link and its padding, so short names stay still and long names stop at a narrow fade before row actions without extra travel.

## v0.19.0

- **Changed default for `LoomaEditor` code blocks:** apps that omitted `codeLanguages` previously had no language picker or syntax highlighting, even though they could insert code blocks. The editor now offers every bundled Highlight.js grammar in its searchable picker. An explicit choice loads only its grammar; Auto loads 20 common grammars when code is present. This makes code blocks useful in the usual editor setup without adding grammars to documents that contain no code. Pass `{}` to retain plain code blocks, or a grammar map to keep an application-owned list.
- Editor table options stay within the viewport, scroll to every action, and close with Escape or an outside click. Row and column grips can drag to reorder while clicks still open their action menus. The options swatches are round and have more room, and paragraphs after tables have a larger gap.

## v0.18.6

- Mention suggestions open only when an author types `@`. Pasted or loaded `@` text, clicking into
  it later, and `@` in inline code or code blocks no longer start a search.

## v0.18.5

- The app-triggered editor toolbar now uses the same compact floating surface as the selection toolbar. A caret inside a link shows nearby actions to open, edit, or remove it; the edit action uses the same link form as the toolbar button.

## v0.18.4

- Strict Comboboxes keep typed search text visible even when their selected value is controlled. Leaving an unmatched search restores the previous label without reporting a new selection. Editable code blocks no longer inherit prose spell-check, while ordinary editor text still does.

## v0.18.3

- `LoomaEditor` has a `popover` toolbar mode: the full toolbar opens from an app's own button
  (`toolbarTriggerId`, `v-model:toolbar-open`), and selecting text shows a text-only bubble. Use it
  when the page already has a place for tools, such as a page bar.

## v0.18.2

- The code language selector floats above the code block holding the cursor, like the table toolbar,
  instead of reserving empty space at the top of every editable code block.

## v0.18.1

- Menu Item now spaces slotted icons from their labels. Ghost Button and Icon Button stay visibly pressed while an anchored Menu or Popover is open; Popover also reports that open state on its trigger with `aria-expanded`.

## v0.18.0

- **Breaking for Listbox:** its visible upgraded root is now an ARIA listbox with styled choice rows instead of a native `<select size>`. The native control's option styling could not show the same checked choices as Combobox or follow Looma's surface treatment; an additive variant would leave the default Listbox with the same problem. A plain native select remains visible before JavaScript upgrades the component, then becomes hidden and disabled. Authored `<option>` children, `value`/`values`, `name`, reset, and required form validation still work. Code that queried the root as an `HTMLSelectElement` or read `selectedOptions` must use its `change` event (`detail.value` and `detail.values`) or the authored options instead. The root remains focusable and supports arrows, typeahead, click, and Space to toggle multiple choices.
- Combobox and Listbox now draw multiple-choice rows and checkmarks from the same style rules. Checkbox's Select all example demonstrates how a group restores the native mixed state after one item changes.
- Input and Textarea rest with a softer control edge and gain a modestly stronger edge on hover. Error and readonly borders stay stable on hover; Input Group and Select also preserve error borders.
- Fallback Avatars use a quiet accent edge; the active ring uses a finer accent line. Subtle Badges have slightly lighter fills, and tag shapes keep a visible edge around their point.
- Spinner now uses a rounded SVG arc that changes length over a faint circular track. Button and Icon Button loading states share this motion, and reduced-motion mode holds the arc still.
- Pasted Markdown or HTML code blocks no longer end with an extra empty line. The newline that
  closes a code block's last line is dropped; a blank line the author typed stays.

## v0.17.4

- Spinner draws its ring on the rendered element, restoring loading indicators in Button and Icon Button. The Button loading example now starts pressable and demonstrates the transition.
- Solid Icon Button keeps its accent fill in generated CSS, so its light icon stays readable. Boxed Button links resist ordinary page link underlines.
- Search Shell removes redundant internal divider lines; Search Result Rows use spacing and hover or selected surfaces. Side Tooltip pointers draw both edges toward their trigger, Checkbox checks sit centrally, and Input Group affixes use muted text.
- Component pages put examples and API immediately after a short introduction, with longer guidance below.

## v0.17.3

- Republishes 0.17.2 unchanged: 0.17.2 reached npm, but its post-publish registry check failed, so
  it was never tagged.

## v0.17.2

- Editable code blocks now show a compact language selector when the app registers syntax
  grammars. **Auto** names the detected language; a manual choice is saved in the document and
  can be cleared back to Auto. Typing three backticks starts a code block immediately.

## v0.17.1

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

## v0.17.0

- Code block syntax grammars are now opt-in through `codeLanguages` on `LoomaEditor`
  and `getDefaultEditorExtensions`. Apps can load only the languages they use; Looma
  styles the highlighted tokens with theme-aware colors.

## v0.16.5

- Adjacent span labels from pasted HTML layout wrappers keep a readable space
  when the wrapper is reconstructed as editor text.

## v0.16.4

- The Link toolbar keeps selected text when pressing its button moves focus out of the editor.
- A short YAML frontmatter block at the start of pasted Markdown stays as an editable
  YAML code block, while the following heading and body become document structure.
- Two-column editor tables now fit their available width and wrap cell text. Tables
  with many columns or deliberately wide saved columns still scroll horizontally.
- The inline chip editor now opens below a chip on a narrow page when there is room,
  so editing a chip near the page heading does not cover the title and actions.
  It still flips above when the viewport has more room there.

## v0.16.3

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
- Input takes a number. Its `value` and Vue `modelValue` accept `string | number` (`modelValue`
  also takes `null`), so a `type="number"` field binds to a number, and it reports a number as the
  user types, or an empty string while it holds no number, as Vue's `v-model` does. The Vue
  `update:modelValue` event is still typed `string`; typing it from the value awaits the generator. Bound to a number, the field never writes
  over text that means the same number while the user types it: `12.`, `1.0`, `1e3`, or an empty
  field keep their text and caret. A field bound to text was rewritten on every keystroke, so typing
  `12.5`, Backspace, `8` lost the point.

## v0.16.2

- Pasting recognizable rendered HTML now keeps its headings and inline formatting even when the accompanying
  plain text resembles Markdown. Literal Markdown or HTML copied as source still becomes editable
  document structure; native editor content stays native.

## v0.16.1

- LoomaEditor adds clickable inline chips through `/chip` or `insertLoomaChip()` on selected text.
  A focused popover edits the label and six theme colors; each chip gets a slightly stronger,
  theme-matched border and persists as a semantic text span within its paragraph.
- Subtle badges and tags now have a slightly darker tone-matched edge instead of a border identical
  to their fill. Colored solid and outline variants keep their existing treatments.

## v0.16.0

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

## v0.15.7

- Tree `marquee`: a long name fades out fully before the leading icon as it slides (it faded to
  the icon's middle), rests at the end, then scrolls again while the row stays hovered or keyboard
  focused; it used to stop at the end. Keyboard focus on the item itself, as the tree roves, now
  starts it. A touch pointer, or the focus a tap leaves, no longer does.

## v0.15.6

- LoomaEditor adds a `disableHighlight` prop (and `getDefaultEditorExtensions` a
  `disableHighlight` option). When set, authors can't highlight: no Highlight button, no
  `Mod-Shift-H`, no `==text==` typing or paste rule, and pasted `<mark>` keeps only its text.
  Highlights already in the document still show. Off by default, so nothing changes.

## v0.15.5

- Pasted HTML elements with an inline `display: none` declaration are omitted with their contents.
  A paste containing only such elements leaves the document unchanged. Literal HTML inside a code
  block remains code text.

## v0.15.4

- Warning text (`--ui-warning-subtle-text`, used by subtle warning Badges and warning Text) mixes 55%
  of the warning colour with the ink instead of 85%, so a theme can choose a bright, saturated amber
  for tints, borders, and icons and its warning text still reads at 4.5:1 on every surface. Warning
  text in the default theme is slightly darker.
- LoomaEditor recognizes Markdown and HTML document source by its contents when pasted, even if
  the clipboard also carries preformatted HTML. Headings, lists, links, tables, and source code
  blocks become editable editor content. Source markup is reconstructed as supported editor nodes,
  rather than inserted verbatim; surplus layout wrappers lose their tags while retaining ordinary text.
- The focused empty-editor placeholder remains readable when the active-block marker is enabled.

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
