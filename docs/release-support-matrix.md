# Release 1 Support Matrix

Release 1 is a synchronized public npm **Candidate `0.1.0`** for the smallest
Looma graph needed by Knit. It is not semver `1.0.0`, a Stable declaration, or a
promise that every repository package and roadmap item is supported.

## Package Classification

| Package/workspace | R1 classification | Format and DOM contract | Required proof |
| --- | --- | --- | --- |
| `@looma/tokens` | Published Candidate | CSS-only | Package integrity |
| `@looma/layout` | Published Candidate | ESM + CJS; six light-DOM elements | Package integrity, SSR import, docs server consumption, existing behavior tests |
| `@looma/core` | Published Candidate | ESM + real CJS targets; 26 shadow-DOM elements with slotted semantic light-DOM fallback | Behavioral qualification |
| `@looma/editor` | Published Candidate | ESM; six guarded light-DOM elements plus extension helpers and CSS | Behavioral qualification, including accepted limits |
| `@looma/vue` | Published Candidate | ESM Vue adapter | Behavioral qualification for all published tags and Knit consumption |
| `@looma/react` | Internal/deferred | Repository preview only | Not an R1 gate or public promise |
| `@looma/svelte` | Internal/deferred | Repository preview only | Not an R1 gate or public promise |
| docs, Storybook, examples, tooling | Internal | Private workspaces | Release tooling/docs gates only |

The names use the intended `@looma` namespace. Public registry lookup currently
returns no package for the five planned names, but namespace ownership and publish
authorization remain unverified until an authenticated owner preflight passes.

## Published Source Elements

### Layout: published Candidate

`ui-center`, `ui-cluster`, `ui-grid`, `ui-inline`, `ui-separator`, `ui-stack`.

### Core: published Candidate

`ui-avatar`, `ui-avatar-group`, `ui-badge`, `ui-button`, `ui-checkbox`,
`ui-context-menu`, `ui-dialog`, `ui-disclosure`, `ui-floating-action-button`,
`ui-form-field`, `ui-icon-button`, `ui-input`, `ui-menu`, `ui-menu-item`,
`ui-popover`, `ui-radio`, `ui-radio-group`, `ui-search-result-row`,
`ui-search-shell`, `ui-select`, `ui-switch`, `ui-tabs`, `ui-textarea`,
`ui-toast-region`, `ui-tooltip`, `ui-top-bar`.

### Editor: published Candidate

`ui-editor-insert-table-grid`, `ui-editor-slash-menu`,
`ui-editor-table-context-menu`, `ui-editor-table-overlay`,
`ui-editor-table-toolbar`, `ui-editor-toolbar`.

Every element above must appear in source-derived API metadata, public docs,
navigation, and the supported Vue projection where applicable. A missing projection
is a release defect, not a reason to silently shrink the source inventory.

## Accepted And Deferred Product Surface

- `E-TBL-003` is an accepted Candidate visual-polish limitation. Chromium proves
  the visible structural toolbar, keyboard dimension picker, and keyboard-operable
  insertion overlay; Tiptap round-trip tests prove add-row/add-column operations
  retain existing table and surrounding content. Confluence-level polish remains
  deferred, while data loss or corruption remains release-blocking.
- AlertDialog, Listbox, Combobox, Drawer/Sheet, HoverCard, CommandPalette,
  Accordion group API, interactive Chip/Tag behavior, block menu, floating editor
  toolbar, link editor, mentions, and emoji picker are deferred roadmap items.
- Domain behavior such as save, uploads, collaboration, presence, workspace/page
  concepts, and app-specific commands remains outside Looma.

## Runtime Contract

- Layout and editor elements render in light DOM.
- Core elements use shadow roots for upgraded UI and styles while preserving
  author-provided semantic light DOM through slots.
- No-JS fallback is the author's semantic light DOM, not Looma's shadow output.
- Public imports must be SSR-safe at module evaluation time.
- Knit has demonstrated server-process imports of its linked `@looma/core`,
  `@looma/editor`, `@looma/editor/extensions`, and `@looma/vue` entry graph. The
  release gate repeats that proof from packed artifacts outside the workspace.

## Proof Status At Contract Freeze

| Evidence | Current status | Release requirement |
| --- | --- | --- |
| Exact source inventory | Source-derived classification and projection gate passing for all 38 tags | Must stay clean through publication |
| Knit linked-workspace build | Passing | Must repeat against approved packed artifacts |
| SSR imports through Knit graph | Passing for core/editor/editor extensions/Vue | Must repeat from clean tarball fixture |
| Package names publicly absent | Observed via unauthenticated npm lookup | Authenticated namespace ownership/publish authorization required |
| ContextMenu projections | API metadata, docs, navigation, contract README, Vue map/export, and render test complete | Must stay clean through publication |
| Browser/a11y/adapter/package gates | Chromium interaction and axe checks pass for representative core/editor surfaces; Vue registers and renders the supported baseline without warnings; Node imports public core and packed graph entries without DOM globals | Keep mandatory, unskipped, and warning-clean in CI |
| Editor E-TBL-003 | Accepted Candidate visual limitation with Chromium and Tiptap data-integrity evidence | Do not claim Confluence parity; any data loss remains release-blocking |
| Packed package graph | Five local `0.1.0` tarballs pass content/export/DAG/hash inspection | License approval, clean protected build, and external/Knit fixtures remain |

Automated accessibility does not replace manual assistive-technology, forced-color,
zoom/reflow, or platform long-press checks. Those are documented manual Candidate
checks for the public docs and consumer pass; essential actions do not depend on
long-press because ContextMenu and editor table controls provide visible native
buttons.

The core build has one narrowly handled Stencil diagnostic: Stencil recommends
`dist/index.cjs.js`, but that filename is not executable as CommonJS under this
package's `type: module`. The release uses the tested real `dist/index.cjs` target,
and the warning policy fails if this diagnostic changes or any additional Stencil
warning appears.

No row in this matrix authorizes registry mutation. Publication occurs only after
the separate release checklist is fully approved.
