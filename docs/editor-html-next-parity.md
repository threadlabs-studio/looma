# HTML Next editor parity

The document editor (`ui-editor`), short field (`ui-compact-editor`) and escaped renderer (`ui-compact-content`) have authored HTML Next definitions. Tiptap sessions and authoring behavior live in `src/editor`; framework components are compiled by the consumer’s Vite plugin.

This ledger records the authored editor parity checks and the source-only packaging qualification. The handwritten Vue implementations and their public exports have been removed together; framework consumers compile the HTML definitions.

## Verification

- Package build: 99 definitions and their catalog.
- Framework-neutral unit suite: 435 tests passed.
- Repository tooling and documentation checks: 407 tests passed.
- Shared browser behavior: 98 cases pass through the Vue Vite plugin; 97 pass natively, with the Vue event-binding case excluded. Six additional source/native mounting probes pass, including external native `commandfor` focus for the compact field.
- Document integration: 60 cases passed per target, including tables, menus, links, images, geometry, scrolling and responsive controls.
- Additional editor layout checks passed in the existing browser harness. Form participation verifies that internal chip controls do not submit with an enclosing form and that RadioGroup can target an external form.
- SSR covers the authored document fallback and escaped compact field/renderer output. The built documentation page additionally passes typing, native focus-end, toolbar-mode changes, selection tools, 375 px reflow and no-JavaScript fallback, with no page errors.
- `tests/framework-consumer/editor-contract.ts` maps every former editor prop and event to its source API and checks that removed instance/model APIs are absent for both editable components.
- Vue, React and Svelte documentation builds passed against published alpha.76, including named slots, package-source discovery and a local component in a hidden directory. The Vue fixture also checks the full and compact editor contracts with strict TypeScript declarations.

## Release prerequisites

The [HTML Next alpha.71 owner fixes](https://github.com/nextwebwg/html-next/pull/320) are published: hydration indexes following dynamic text, deferred bindings on projected controls, structured hydration metadata, and strictly typed React compositions. Controlled document and compact edits pass against the registry release, with zero content-metadata writes asserted for both native and Vite-converted Vue components. The [React computed-attribute correction](https://github.com/nextwebwg/html-next/pull/322) and [initial projected-binding and optional-peer import fixes](https://github.com/nextwebwg/html-next/pull/324) are also published, in alpha.72 and alpha.74 respectively.

The [shared-controller and compiler dependency correction](https://github.com/nextwebwg/html-next/pull/325) is published in alpha.75. The [framework compiler loading, Vite 7/8 compatibility and hidden-directory import fixes](https://github.com/nextwebwg/html-next/pull/326) are published in alpha.76. The runtime minimum is alpha.74; the complete framework source graph requires Vite adapter alpha.76. The final framework builds use the actual registry release, with no upstream patch.

The same 21,248-character document and 60 edits measured median update times of 1.9 ms for the former Vue editor, 1.9 ms for converted Vue, and 0.7 ms for native HTML with the owner fixes. No full-document DOM-attribute rewrites occurred. These are local comparative measurements, not universal latency guarantees.

The packed Looma 0.49.0 matrix passes with registry SDK alpha.76: minimal native SSR/types, strict Vue controls without editor peers, headless editor APIs, full editor SSR/types/build, and the installed documentation CLI with runtime-singleton, discovery, theme-save and reload checks. The default documentation catalog also builds all 154 routes with the documented editor peers. Post-publication registry application qualification remains required; the case table below records authored editor behavior.

## Case ledger

| Case | Vite-converted Vue | Native HTML |
| --- | --- | --- |
| Browser behavior: LoomaEditor footnotes (real browser) edits formatted multi-paragraph notes without flattening marks, links or other references | pass | pass |
| Browser behavior: LoomaEditor footnotes (real browser) keeps the floating editor and action row usable at touch width | pass | pass |
| Browser behavior: LoomaEditor footnotes (real browser) offers one-line icon actions or floating editing, without exposing source labels | pass | pass |
| Browser behavior: LoomaEditor footnotes (real browser) opens the floating editor on insertion and keeps references numbered in document order | pass | pass |
| Browser behavior: LoomaEditor history (real browser) bubble floating tools hide at a caret, dismiss with Escape, and reopen on a new selection | pass | pass |
| Browser behavior: LoomaEditor history (real browser) bubble floating tools support Select All and dismiss it with Escape | pass | pass |
| Browser behavior: LoomaEditor history (real browser) contextual floating tools hide at a caret, dismiss with Escape, and reopen on a new selection | pass | pass |
| Browser behavior: LoomaEditor history (real browser) contextual floating tools support Select All and dismiss it with Escape | pass | pass |
| Browser behavior: LoomaEditor history (real browser) dismisses held-caret formatting before cancelling an input rule | pass | pass |
| Browser behavior: LoomaEditor history (real browser) does not activate floating formatting while holding a table resize handle | pass | pass |
| Browser behavior: LoomaEditor history (real browser) does not spell-check code blocks while leaving prose spell-check available | pass | pass |
| Browser behavior: LoomaEditor history (real browser) floats the code language picker above the code block holding the cursor | pass | pass |
| Browser behavior: LoomaEditor history (real browser) gives mention suggestions priority over contextual formatting | pass | pass |
| Browser behavior: LoomaEditor history (real browser) gives slash suggestions priority over contextual formatting | pass | pass |
| Browser behavior: LoomaEditor history (real browser) hides the code language control when the editor becomes read-only | pass | pass |
| Browser behavior: LoomaEditor history (real browser) keeps a held-caret link picker anchored when its field takes focus | pass | pass |
| Browser behavior: LoomaEditor history (real browser) keeps contextual controls below document details at 1280px | pass | pass |
| Browser behavior: LoomaEditor history (real browser) keeps contextual controls below document details at 768px | pass | pass |
| Browser behavior: LoomaEditor history (real browser) keeps sticky Undo and Redo controls current for uncontrolled transactions | pass | pass |
| Browser behavior: LoomaEditor history (real browser) lazily offers HTML and highlights markup in a default editor | pass | pass |
| Browser behavior: LoomaEditor history (real browser) lets a person override a code block's detected language and saves the choice | pass | pass |
| Browser behavior: LoomaEditor history (real browser) offers a Highlight control only while authors may highlight | pass | pass |
| Browser behavior: LoomaEditor history (real browser) offers full contextual commands on selection and held press at a link caret | pass | pass |
| Browser behavior: LoomaEditor history (real browser) offers languages outside Auto without loading their grammars until selected | pass | pass |
| Browser behavior: LoomaEditor history (real browser) omits inline display-none source content from a formatted paste | pass | pass |
| Browser behavior: LoomaEditor history (real browser) opens the full toolbar from an app button in popover mode, with a text-only selection bubble | pass | pass |
| Browser behavior: LoomaEditor history (real browser) popover floating tools hide at a caret, dismiss with Escape, and reopen on a new selection | pass | pass |
| Browser behavior: LoomaEditor history (real browser) popover floating tools support Select All and dismiss it with Escape | pass | pass |
| Browser behavior: LoomaEditor history (real browser) selection activation keeps the formatting dock available at a caret on 375px viewports | pass | pass |
| Browser behavior: LoomaEditor history (real browser) selection activation keeps the formatting dock available at a caret on 767px viewports | pass | pass |
| Browser behavior: LoomaEditor history (real browser) selection activation supports a held press and cancels moving or released presses | pass | pass |
| Browser behavior: LoomaEditor history (real browser) shows SQL tokens with theme colors when the SQL grammar is configured | pass | pass |
| Browser behavior: LoomaEditor history (real browser) shows the link card when the same link caret is clicked after its editor closes | pass | pass |
| Browser behavior: LoomaEditor history (real browser) turns three typed backticks into a code block with the cursor inside | pass | pass |
| Browser behavior: LoomaEditor history (real browser) undoes and redoes a structured document paste with keyboard shortcuts | pass | pass |
| Browser behavior: LoomaEditor inline chips (real browser) creates and edits a colored inline chip through its focused popover | pass | pass |
| Browser behavior: LoomaEditor inline chips (real browser) places the chip editor below a chip near the top of a narrow page | pass | pass |
| Browser behavior: LoomaEditor managed suggestion menus keeps managed table insertion handles stable through a real pointer click | pass | pass |
| Browser behavior: LoomaEditor managed suggestion menus moves cell actions with hover and keyboard focus and dismisses table controls outside the table | pass | pass |
| Browser behavior: LoomaEditor managed suggestion menus projects native suggestion rectangles through the managed component boundary | pass | pass |
| Browser behavior: LoomaEditor managed suggestion menus projects slash commands to the managed menu item contract | pass | pass |
| Browser behavior: LoomaEditor node views composes a section from Disclosure and its settings, hides the settings from readers, and disconnects them once removed | pass | pass |
| Browser behavior: LoomaEditor node views draws a callout with Callout, follows tone and heading changes, and disconnects it once the node is removed | pass | pass |
| Browser behavior: LoomaEditor node views draws a divider with Separator, selects it on click, and disconnects it once the node is removed | pass | pass |
| Browser behavior: LoomaEditor node views draws an image with Image, selects it on click, commits a resize as the node's size, and disconnects once removed | pass | pass |
| Browser behavior: LoomaEditor node views keeps a section's open state its own when a section nested in its body toggles | pass | pass |
| Browser behavior: LoomaEditor node views leaves a read-only divider unselectable | pass | pass |
| Browser behavior: LoomaEditor node views lists the headings in a table of contents, follows edits, hides settings from readers, and disconnects once removed | pass | pass |
| Browser behavior: LoomaEditor node views refreshes cached reference display without an authored update and keeps link editing available | pass | pass |
| Browser behavior: LoomaEditor pastes Looma Markdown (real browser) edits tabs panel by panel and a figure's caption in place, then writes them back | pass | pass |
| Browser behavior: LoomaEditor pastes Looma Markdown (real browser) turns directives, task lists and nested containers into editor blocks | pass | pass |
| Browser behavior: LoomaEditor requests answers image-upload through the Vue event form, shows its progress, and cancels it | pass | Vue only |
| Browser behavior: LoomaEditor requests answers with the function prop ahead of the Vue event form and the document | pass | pass |
| Browser behavior: LoomaEditor requests asks mention-query with the query and limit, replaces older queries, and falls back to mentionItems on null | pass | pass |
| Browser behavior: LoomaEditor requests hears late responders: Insert image becomes available, and extensions rebuild the editor from the host's content | pass | pass |
| Browser behavior: LoomaEditor requests offers Insert image for a responder known before mount, and a plain listener still answers without being known | pass | pass |
| Browser behavior: LoomaEditor table layout (real browser) fits a two-column table to the page and wraps long cell text | pass | pass |
| Browser behavior: LoomaEditor table layout (real browser) keeps a fitting 375px table inside its wrapper after saving column widths (columns=2, border=1) | pass | pass |
| Browser behavior: LoomaEditor table layout (real browser) keeps a fitting 640.5px table inside its wrapper after saving column widths (columns=3, border=1) | pass | pass |
| Browser behavior: LoomaEditor table layout (real browser) keeps a fitting 640px table inside its wrapper after saving column widths (columns=3, border=1) | pass | pass |
| Browser behavior: LoomaEditor table layout (real browser) keeps a fitting 641px table inside its wrapper after saving column widths (columns=3, border=2) | pass | pass |
| Browser behavior: LoomaEditor table layout (real browser) keeps a many-column table scrollable instead of squeezing its cells | pass | pass |
| Browser behavior: LoomaEditor table layout (real browser) keeps list items compact and preserves rich-list separation at 375px | pass | pass |
| Browser behavior: LoomaEditor table layout (real browser) keeps list items compact and preserves rich-list separation at 640px | pass | pass |
| Browser behavior: LoomaEditor table layout (real browser) keeps the column-resize hint inside a fitting phone table with larger text | pass | pass |
| Browser behavior: LoomaEditor table layout (real browser) retains deliberately wide saved column widths as a scrollable table | pass | pass |
| Browser behavior: LoomaEditor task items names each checkbox by its item's text as the reader edits, and in saved HTML | pass | pass |
| Browser behavior: active block marker fades in rather than snapping on, as a thin, light line | pass | pass |
| Browser behavior: active block marker keeps the focused empty-editor placeholder at readable width | pass | pass |
| Browser behavior: active block marker keeps the page prompt hidden on an empty line above existing content | pass | pass |
| Browser behavior: active block marker marks the block being edited, and steps aside while text is typed | pass | pass |
| Browser behavior: active block marker stays while focus visits the editor's own controls or leaves only briefly | pass | pass |
| Browser behavior: applies link fields directly with no footer actions (1280px) | pass | pass |
| Browser behavior: applies link fields directly with no footer actions (375px) | pass | pass |
| Browser behavior: attaches a chosen file through its host responder as an editable link | pass | pass |
| Browser behavior: compact editing cancels Markdown with Escape and isolates conversion in undo history | pass | pass |
| Browser behavior: dismisses the expanded Format inventory on Escape and permits a fresh selection gesture | pass | pass |
| Browser behavior: document editing cancels Markdown with Escape and isolates conversion in undo history | pass | pass |
| Browser behavior: exposes full formatting through Format and preserves the selected range | pass | pass |
| Browser behavior: formats short text through native shortcuts and Markdown without document controls | pass | pass |
| Browser behavior: inserts an uploaded image, and offers Retry after a failed upload | pass | pass |
| Browser behavior: keeps a long destination compact and closes its actions when selecting a TOC (1280px) | pass | pass |
| Browser behavior: keeps a long destination compact and closes its actions when selecting a TOC (375px) | pass | pass |
| Browser behavior: keeps direct actions compact and emits the exact selection without editing it | pass | pass |
| Browser behavior: keeps editor popup anchors stable when links cross the phone breakpoint | pass | pass |
| Browser behavior: opens grouped range actions with a native caret click (editable, 1280px) | pass | pass |
| Browser behavior: opens grouped range actions with a native caret click (editable, 375px) | pass | pass |
| Browser behavior: opens grouped range actions with a native caret click (read-only, 1280px) | pass | pass |
| Browser behavior: opens grouped range actions with a native caret click (read-only, 375px) | pass | pass |
| Browser behavior: opens links with the platform navigation modifier (MacIntel) | pass | pass |
| Browser behavior: opens links with the platform navigation modifier (Win32) | pass | pass |
| Browser behavior: pastes a source document with front matter and a quoted pipe table as editable blocks | pass | pass |
| Browser behavior: permits read-only selection actions without exposing formatting | pass | pass |
| Browser behavior: puts selection actions in the existing narrow editing dock | pass | pass |
| Browser behavior: shows a compact Open link bar above a clicked link and dismisses it with Escape (1280px) | pass | pass |
| Browser behavior: shows a compact Open link bar above a clicked link and dismisses it with Escape (375px) | pass | pass |
| Browser behavior: shows file upload progress and retries without losing content at 1280px | pass | pass |
| Browser behavior: shows file upload progress and retries without losing content at 375px | pass | pass |
| Document integration: LoomaEditor automatic table of contents inserts from slash, configures standard dropdowns, and navigates in read-only mode | pass | pass |
| Document integration: LoomaEditor automatic table of contents uses the existing chip editor for /status | pass | pass |
| Document integration: LoomaEditor block actions duplicates, deletes, and inserts below the current top-level block | pass | pass |
| Document integration: LoomaEditor block actions keeps block actions available in the mobile toolbar | pass | pass |
| Document integration: LoomaEditor collapsible sections inserts a section, edits its summary and rich body, cancels settings, and exits with Mod-Enter | pass | pass |
| Document integration: LoomaEditor collapsible sections supports transient reader keyboard/touch toggles and reveals a collapsed heading from the TOC | pass | pass |
| Document integration: LoomaEditor column resize hints shows a standard tooltip without widening a fitting phone table | pass | pass |
| Document integration: LoomaEditor links accepts a pasted URL directly and returns to page search when replaced | pass | pass |
| Document integration: LoomaEditor links creates, edits, previews, and removes a link from selected text | pass | pass |
| Document integration: LoomaEditor links edits an existing relative URL in the combined destination field | pass | pass |
| Document integration: LoomaEditor links embeds the full toolbar as one compact surface in a formatting popover | pass | pass |
| Document integration: LoomaEditor links inserts linked text at a caret | pass | pass |
| Document integration: LoomaEditor links keeps a phone link trigger mounted throughout a held pointer press and field focus | pass | pass |
| Document integration: LoomaEditor links keeps selected text when the link button press collapses the editor selection | pass | pass |
| Document integration: LoomaEditor links keeps the URL flow distinct and rejects an unselected relative path | pass | pass |
| Document integration: LoomaEditor links keeps the icon gap compact and shows three results before scrolling | pass | pass |
| Document integration: LoomaEditor links links selected text from the selection menu and closes both menus | pass | pass |
| Document integration: LoomaEditor links normalizes same-site links pasted over selected text and in HTML without changing existing links | pass | pass |
| Document integration: LoomaEditor links opens the existing link form from slash, selects a host result by keyboard, and cancels | pass | pass |
| Document integration: LoomaEditor links opens the same link picker from the slash command | pass | pass |
| Document integration: LoomaEditor links resolves an existing host link and keeps the picker inside a phone viewport | pass | pass |
| Document integration: LoomaEditor links reveals link actions when the keyboard moves the caret into a link | pass | pass |
| Document integration: LoomaEditor links searches host targets, keeps their identity URL, and describes the chosen target | pass | pass |
| Document integration: LoomaEditor links shows link actions at a caret inside linked text and edits that link in place | pass | pass |
| Document integration: LoomaEditor links uses one standard form hierarchy with flat results and direct field changes | pass | pass |
| Document integration: LoomaEditor slash discovery extends or replaces one inventory and preserves duplicate-title identities and hover keyboard selection | pass | pass |
| Document integration: LoomaEditor slash discovery groups defaults, prioritizes callouts, and keeps unmatched queries visible without changing content | pass | pass |
| Document integration: LoomaEditor tables accepts empty native overlay geometry and hovered actions without controller errors | pass | pass |
| Document integration: LoomaEditor tables aligns cell text from the table toolbar | pass | pass |
| Document integration: LoomaEditor tables colors, merges, and splits a multi-cell selection | pass | pass |
| Document integration: LoomaEditor tables edits a cell from the right-click context menu | pass | pass |
| Document integration: LoomaEditor tables hides the table toolbar when focus leaves the table | pass | pass |
| Document integration: LoomaEditor tables inserts a 3 × 3 table from the slash menu | pass | pass |
| Document integration: LoomaEditor tables inserts a table sized from the toolbar's insert-table grid | pass | pass |
| Document integration: LoomaEditor tables keeps cell menus live after row deletion and tracks focus and scrolling | pass | pass |
| Document integration: LoomaEditor tables keeps inline table controls in the document beneath the context menu | pass | pass |
| Document integration: LoomaEditor tables keeps mobile table options open while their controls have focus | pass | pass |
| Document integration: LoomaEditor tables keeps table options reachable and dismissible in a short viewport | pass | pass |
| Document integration: LoomaEditor tables lists table options and edits rows from the table toolbar | pass | pass |
| Document integration: LoomaEditor tables moves rows and columns through the table action menu | pass | pass |
| Document integration: LoomaEditor tables opens row and column menus from their overlay handles | pass | pass |
| Document integration: LoomaEditor tables reflects saved cell backgrounds in both menus at 375px | pass | pass |
| Document integration: LoomaEditor tables reflects saved cell backgrounds in both menus at 720px | pass | pass |
| Document integration: LoomaEditor tables removes hovered cell controls when deleting the table | pass | pass |
| Document integration: LoomaEditor tables reorders rows and columns by dragging their grips | pass | pass |
| Document integration: LoomaEditor tables reveals only the hovered row boundary's insertion handle, which adds a row | pass | pass |
| Document integration: LoomaEditor tables spaces a paragraph following a table | pass | pass |
| Document integration: LoomaEditor tables toggles header row and column from table options with checked state | pass | pass |
| Document integration: LoomaEditor tables widens a column by dragging a cell's right edge without overflowing the editor | pass | pass |
| Document integration: atomic editor blocks keeps Tab in text and selects images by click without creating viewer tab stops | pass | pass |
| Document integration: atomic editor blocks selects a clicked divider for deletion and restores it with undo | pass | pass |
| Document integration: image controls drags corners with a locked aspect ratio, previews without persisting, and undoes once | pass | pass |
| Document integration: image controls layout shows one correctly typed bar on click at desktop and phone widths | pass | pass |
| Document integration: image controls projects rendition attributes onto the image and falls back without changing saved content | pass | pass |
| Document integration: image controls resolves legacy masters and responsive fallback without changing durable identity from html | pass | pass |
| Document integration: image controls resolves legacy masters and responsive fallback without changing durable identity from json | pass | pass |
| Document integration: image controls tooltips uses standard tooltips for every icon on hover and keyboard focus | pass | pass |
| Document integration: image controls uses one placement bar and a secondary description, preserving reader activation | pass | pass |
| Document integration: image controls wraps actual text on either side, centers, and contains floats at the editor boundary | pass | pass |
| Document integration: responsive image wrapping defaults to one-third of the column, stacks full-width on phones, and permits custom dragging | pass | pass |
