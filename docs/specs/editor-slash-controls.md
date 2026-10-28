# Editor slash controls

The editor should help writers link knowledge, organize long documents, and insert
repeated content without leaving the keyboard. This specification extends the
existing editor contract; it does not replace its slash, link, or chip controls.

S1–S4 and S8 ship on current main. S5 and S6 use the existing host command
extension point; they do not require dedicated template or date services in
Looma. S7 retains the shipped ordinary-link model and completes its upload
progress and recovery UI.

| Spec | Ticket |
| --- | --- |
| S1 | [Status alias and link verification #275](https://github.com/threadlabs-studio/looma/issues/275) |
| S2 | [Automatic table of contents #276](https://github.com/threadlabs-studio/looma/issues/276) |
| S3 | [Collapsible sections #277](https://github.com/threadlabs-studio/looma/issues/277) |
| S4 | [Slash inventory and discovery #278](https://github.com/threadlabs-studio/looma/issues/278) |
| S5 | [Snippets and decisions #279](https://github.com/threadlabs-studio/looma/issues/279) |
| S6 | [Dates #280](https://github.com/threadlabs-studio/looma/issues/280) |
| S7 | [Files and attachments #281](https://github.com/threadlabs-studio/looma/issues/281) |
| S8 | [Markdown conversion #282](https://github.com/threadlabs-studio/looma/issues/282) |

## Shared interaction contract

- Use the current link control as the composition reference. Pickers consume
  FormField, InputGroup/Input, SearchResultRow, Button, Menu/MenuItem, Popover,
  and layout primitives as appropriate. Do not introduce native-control or CSS debt.
- Describe accepted input, choice, selected state, cancellation, and primary
  action before building a picker. Match full and compact existing-item controls.
- Keep keyboard focus predictable, support Escape, and fit a 375px viewport.
- Preserve existing command names and node formats. Add aliases rather than
  renaming established controls. Use the shared Lucide icon catalog.
- Looma owns generic editing and UI. Hosts own record catalogs, authorization,
  storage, templates, and application workflows.
- New nodes require editable/read-only rendering, JSON and semantic HTML
  round-trips, undo/redo, and documented plain-text/Markdown projection behavior.
  A host must qualify its search, import/export, and change-review paths before
  deploying a new persisted node.
- Keep asynchronous picker cancellation from changing unrelated content or
  applying results at stale document positions.

## S1 — Status alias and existing link verification

Retain **Chip** and add `status` to its searchable aliases. `/status` opens the
same label/color editor and stores the existing `loomaChip` node. A status label
is authored document content, not an application workflow or verification state.

`/link` already exists on current main. Verify it uses the same destination/URL
form as the toolbar, respects host search, supports keyboard result selection,
and cancels without inserting a link. Preserve the unified destination field.

Acceptance:

- `/status` finds Chip and inserts an editable label/color chip.
- `/chip`, `/badge`, and `/tag` keep working; no duplicate Status menu row.
- `/link` is available in the turnkey editor and invokes its standardized form.
- Headless inventories omit Link when no picker callback exists.
- Browser coverage exercises slash insertion, keyboard selection, cancellation,
  saved content, and compact link actions.

## S2 — Automatic table of contents

`/toc`, `/contents`, and `/tableofcontents` insert one **Table of contents** block
at the caret. It immediately lists headings throughout the document. The writer
never wraps content, selects a range, or manually chooses headings to include.

The block exposes only two initial choices: **Formatting** (plain, bulleted, or
numbered) and **Heading depth** (through H1, H2, or H3). Default to plain formatting
through H3. Respect hierarchy even when a document starts at H2 or skips a level;
do not invent empty entries. The choices use standard dropdown/menu primitives.

Writer flow: insert the block and see its contents immediately; activate its
settings control to change formatting/depth; apply the choices or cancel; return
to writing. Readers see navigable links and no editing controls. With no matching
headings, show a short explanation rather than a broken or empty control.

Persist configuration and durable heading anchors, not a copied heading list.
Derive entries from the current document on insertion, heading edits, moves,
deletions, and external content replacement. Clicking a link navigates within
the current editor and must not follow the ordinary external-link editing flow.

Acceptance:

- Inserting above or below headings produces the same whole-document entries.
- Text/level edits, reordering, deletion, and undo/redo update the entries.
- Duplicate heading labels have distinct anchors. Renaming or moving a heading
  preserves its anchor; duplicated anchors are repaired without losing content.
- Formatting and depth round-trip in JSON and HTML and do not store stale entries.
- HTML contains a named navigation landmark and real links to heading IDs.
- Settings use shared primitives, support keyboard and touch, and fit at 375px.
- Read-only mode keeps links usable and hides settings.
- Hosts can inspect heading entries/configuration to implement Markdown/plain-text
  projections without scraping editor DOM. The documented fallback is a linked
  list (Markdown) or heading labels (plain text).

## S3 — Collapsible sections

Add **Expand**, searchable through `/expand`, `/toggle`, and `/details`, with an
editable summary and an ordinary block-content body. Render semantic
`details`/`summary` in HTML. Insertion requires no surrounding-page wrapper.

Writer flow: `/expand` inserts an open editing body and places the caret inside;
ordinary editor commands create its blocks. Section settings accept summary text
and the initial reader expansion state. Save applies the draft; Cancel/Escape
discard it. Cmd/Ctrl+Enter creates a paragraph after the innermost section. Readers
toggle the shared Disclosure without persisting those temporary choices.

Acceptance:

- Authors can edit summary/body, insert lists/code/tables, and leave the section.
- Readers can toggle with keyboard or touch; read-only content remains usable.
- JSON/HTML round-trip summary, body, and intended default expansion.
- Reader toggling is transient and does not mark the document edited.
- Search and plain-text projections include collapsed content. Anchor navigation
  and host review navigation can reveal the destination section.
- Markdown uses a documented HTML-details or fully expanded fallback; never
  discard hidden content.

## S4 — Extensible slash inventory and discovery

Expose an additive turnkey-editor command customization boundary, backed by the
existing headless inventory. Hosts must not install a second competing slash
extension to add application commands.

Acceptance:

- Hosts can retain defaults and add commands, or explicitly replace the inventory.
- Commands have stable identities and optional groups without breaking old items.
- Exact names/aliases rank before substring matches. `/callout` prioritizes
  callouts over the current quote keyword match.
- Groups distinguish basic blocks, callouts, insertions, and host content.
- A no-results state remains visible and accessible while typing an unmatched query.
- Commands requiring absent host capabilities are omitted, and unsupported
  insertion contexts do not offer destructive/dead actions.
- Keyboard navigation and managed-menu item identity work after filtering.

## S5 — Host-owned snippets and decision composition

The existing `slash-commands` request supplies the default inventory and accepts
host commands with an editor and insertion range. Hosts can offer their own
snippet catalog, preview, search, or decision outline through that boundary.
Use existing schema nodes, validate an independent copy before insertion, and
commit insertion as one transaction. Template storage, permissions, choice UI,
and application-specific document outlines remain host-owned.

A dedicated snippet provider or built-in decision template is not part of the
core editor contract. The editor owns its shared command menu and ordinary
content rendering. See the [host command guide](../../apps/docs/docs/editor.mdx#host-commands).

## S6 — Host-owned date commands

A host command can insert an explicit date or the date at activation as ordinary
text. Use an unambiguous calendar representation such as `YYYY-MM-DD`; a date
picker can use the shared Input with `type="date"`. Host choice UI owns cancel
and focus restoration, and insertion remains a normal undoable editor transaction.

No dedicated date node, live clock value, reminder, or scheduling service is
required. The host command guide includes a Today example that evaluates the
local calendar date when the command runs.

## S7 — Files and attachments

`/file` and `/attachment` use the host's `file-upload` responder. Looma owns
insertion and progress/error/retry UI; the host owns transport, permissions,
storage, and the durable `href`. Keep the existing ordinary-link document format.

Acceptance:

- The command is absent when the capability is unavailable.
- Selection/upload/cancellation/retry follow the current media ownership model.
- The durable `href` is the host-owned identity. The filename, MIME type, and
  size remain readable ordinary document content.
- Read-only content exposes an accessible file name and download/open action.
- JSON/HTML round-trip and Markdown retain the file destination. Plain text
  retains its name and metadata; URL-bearing plain-text exports remain a host projection.
- No executable embed or arbitrary iframe is required for the initial contract.

## S8 — Markdown conversion for supported rich content

Markdown paste and semantic interchange already ship. The editor guide describes
paste behavior; `packages/looma/EXPRESSIVE-MARKDOWN.md` defines supported export
and import behavior, including explicit errors for unsupported schema content.

Acceptance:

- Convert GFM task-list text into interactive task nodes on document paste.
- Convert supported GitHub/Obsidian alert syntax into existing callout tones;
  document mappings for unsupported tones and preserve their readable text.
- Support the documented TOC/expand fallback once those nodes ship.
- Preserve literal markup inside code blocks, a single undoable paste, and
  sanitization. Unsupported constructs remain readable or are explicitly reported.
- Test pasted content, stored nodes, semantic HTML, and host projection results;
  syntax recognition alone is not a round-trip guarantee.

## Verification

The editor extension and Markdown fixture suites cover pasted content, stored
nodes, semantic HTML, safe conversion, and portable projections. The file-upload
unit tests cover retained insertion positions, retry/cancel, late progress, and
independent undo; browser request tests cover visible recovery controls at desktop
and 375px. No dependency upgrade, framework migration, or new visual primitive
is required by these contracts.

## Desktop floating activation

Floating formatting surfaces open only on text selection (including Select All) or a primary pointer press held for 500ms without moving more than 8px. Releasing early, dragging, cancellation, blur, or changing viewport cancels a pending press. Escape dismisses the current surface until a new selection or held press; moving the caret dismisses a held-press surface. Formatting actions preserve their selected target. Link and table pickers retain their toolbar anchor while their fields have focus. Persistent toolbars and explicitly opened formatting popovers remain available. Small viewports (up to 767px), including mouse-driven windows, retain their formatting dock while editing. Read-only content never exposes editing controls.
