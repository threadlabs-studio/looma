# Editor slash controls

The editor should help writers link knowledge, organize long documents, and insert
repeated content without leaving the keyboard. This specification extends the
existing editor contract; it does not replace its slash, link, or chip controls.

The first implementation covers S1 and S2. S3–S8 are separately tracked follow-up
work.

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

## S5 — Reusable snippets and decision composition

Add a host-provided snippet picker under `/snippet` and `/template`. Insert
independent copies of valid editor content. Template storage and access belong
to the host; this feature does not create live/synced content.

Provide `/decision` as an ordinary block composition for a decision, its reason,
and alternatives. Do not introduce application approval or review state.

Acceptance:

- Search/choice/preview/cancel/insert use the shared picker conventions.
- Snippets use existing schema nodes and insert in one undoable operation.
- Editing one inserted copy does not edit the source or another copy.
- Host failures preserve content and provide retryable feedback.
- Decision content works in HTML, Markdown, plain text, and existing change review.

## S6 — Dates

Add `/date` and `/today`. Begin with explicit date selection and ordinary
document text; a semantic date chip is a separate later contract.

Acceptance:

- `/date` opens a standard date control and commits only the chosen date.
- `/today` inserts the date at activation, not a value that changes when read.
- Dates remain legible and unambiguous across locales and time zones.
- Cancellation preserves content; insertion is undoable and portable.
- A date does not schedule a reminder or change host review state.

## S7 — Files and attachments

Add `/file` and `/attachment` when a host supplies an attachment service. Looma
owns insertion, progress/error UI, and a generic durable attachment descriptor;
the host owns upload transport, permissions, storage, and downloadable links.

Acceptance:

- The command is absent when the capability is unavailable.
- Selection/upload/cancellation/retry follow the current media ownership model.
- The descriptor retains identity, name, MIME type, size, and durable link.
- Read-only content exposes an accessible file name and download/open action.
- JSON/HTML round-trip and Markdown/plain-text projections retain the file link.
- No executable embed or arbitrary iframe is required for the initial contract.

## S8 — Markdown conversion for supported rich content

Define a supported conversion matrix rather than promising compatibility with
every Markdown flavor. Prioritize content already representable in the editor.

Acceptance:

- Convert GFM task-list text into interactive task nodes on document paste.
- Convert supported GitHub/Obsidian alert syntax into existing callout tones;
  document mappings for unsupported tones and preserve their readable text.
- Support the documented TOC/expand fallback once those nodes ship.
- Preserve literal markup inside code blocks, a single undoable paste, and
  sanitization. Unsupported constructs remain readable or are explicitly reported.
- Test pasted content, stored nodes, semantic HTML, and host projection results;
  syntax recognition alone is not a round-trip guarantee.

## First implementation units

1. Characterize `/link`, add the status alias, and exercise its existing picker.
2. Implement TOC schema, heading anchors, derived entries, semantic serialization,
   and focused document-edit/undo tests.
3. Compose compact TOC settings with current shared controls. Verify keyboard,
   read-only, 375px layout, and visual hierarchy alongside the link control.
4. Update editor docs and changelog; run package build, focused editor/browser
   checks with one worker, typecheck, composition/style policy, and documentation checks.

No dependency upgrade, framework migration, or unrelated toolbar redesign is
required by the first implementation.
