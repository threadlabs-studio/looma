# Release 1 Support Matrix

Release 1 is a public npm **Candidate `0.1.12`** for the smallest Looma surface
needed by Knit. It is not semver `1.0.0`, a Stable declaration, or a
promise that every repository package and roadmap item is supported.

## Package Classification

| Package/workspace | R1 classification | Format and DOM contract | Required proof |
| --- | --- | --- | --- |
| `@threadlabs/looma` | Published Candidate | Explicit root/core, loader, layout, editor, editor-extension, Vue, and CSS subpaths | Singleton package integrity and behavioral qualification |
| implementation workspaces | Internal | Private modular build inputs | Not public artifacts |
| React and Svelte adapters | Internal/deferred | Repository preview only | Not an R1 gate or public promise |
| docs, Storybook, examples, tooling | Internal | Private workspaces | Release tooling/docs gates only |

The owner-approved public identity is `@threadlabs/looma`. Exact-name publish
authorization still requires the protected owner preflight before registry mutation.

## Published Source Elements

### Layout: published Candidate

`ui-center`, `ui-cluster`, `ui-grid`, `ui-inline`, `ui-reel`, `ui-separator`,
`ui-sidebar`, `ui-stack`, `ui-switcher`.

### Core: published Candidate

`ui-affordance-scope`, `ui-avatar`, `ui-avatar-group`, `ui-badge`, `ui-button`, `ui-checkbox`,
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

- Chromium proves the visible structural toolbar, keyboard dimension picker,
  outside-edge insertion overlay, cell backgrounds, merge/split, and column
  resizing; Tiptap round-trip tests prove structural operations retain existing
  table and surrounding content. Data loss or corruption remains release-blocking.
- AlertDialog, Listbox, Combobox, Drawer/Sheet, HoverCard, CommandPalette,
  Accordion group API, interactive Chip/Tag behavior, link editor, mentions, and
  emoji picker are deferred roadmap items.
- Domain behavior such as saves, upload transport, collaboration, presence, workspace/page
  concepts, and app-specific commands remains outside Looma.

## Runtime Contract

- Layout and editor elements render in light DOM.
- Core elements use shadow roots for upgraded UI and styles while preserving
  author-provided semantic light DOM through slots.
- No-JS fallback is the author's semantic light DOM, not Looma's shadow output.
- Public imports must be SSR-safe at module evaluation time.
- The internal Knit qualification harness must demonstrate server-process imports of `@threadlabs/looma`,
  `@threadlabs/looma/editor`, `@threadlabs/looma/editor/ui`, `@threadlabs/looma/editor/extensions`, `@threadlabs/looma/vue`, and `@threadlabs/looma/vue/editor`. The
  release gate repeats that proof from packed artifacts outside the workspace.

## Proof Status At Contract Freeze

| Evidence | Current status | Release requirement |
| --- | --- | --- |
| Exact source inventory | Source-derived classification and projection gate passing for all 42 tags | Must stay clean through publication |
| Knit linked-workspace build | Passing | Must repeat against approved packed artifacts |
| SSR imports through Knit graph | Passing for core/editor/editor extensions/Vue | Must repeat from clean tarball fixture |
| Package names publicly absent | Observed via unauthenticated npm lookup | Authenticated namespace ownership/publish authorization required |
| ContextMenu projections | API metadata, docs, navigation, contract README, Vue map/export, and render test complete | Must stay clean through publication |
| Browser/a11y/adapter/package gates | Chromium interaction and axe checks pass for representative core/editor surfaces; Vue registers and renders the supported baseline without warnings; Node imports public core and packed graph entries without DOM globals | Keep mandatory, unskipped, and warning-clean in CI |
| Turnkey editor and table kit | Vue browser behavior, theme-token inheritance, Tiptap table integrity, and Knit integration pass | Keep the complete and extension-only paths green |
| Packed package | One local `@threadlabs/looma@0.1.12` tarball passes content/export/hash inspection | License approval, clean protected build, and external/Knit fixtures remain |

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
