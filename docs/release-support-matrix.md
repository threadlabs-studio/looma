# Release 1 Support Matrix

Release 1 is the published npm surface of `@threadlabs/looma`, the smallest surface needed by
Knit. It is pre-1.0: not a Stable declaration, and not a promise that every repository package and
roadmap item is supported.

## Package Classification

| Package/workspace | R1 classification | Format and DOM contract | Required proof |
| --- | --- | --- | --- |
| `@threadlabs/looma` | Published | Explicit root/core, loader, layout, editor, editor-extension, Vue, and CSS subpaths | Singleton package integrity and behavioral qualification |
| implementation workspaces | Internal | Private modular build inputs | Not public artifacts |
| React | In development | Not published | None |
| docs, Storybook, examples, tooling | Internal | Private workspaces | Release tooling/docs gates only |

The owner-approved public identity is `@threadlabs/looma`. Exact-name publish
authorization still requires the protected owner preflight before registry mutation.

## Published Source Elements

### Layout: published

`ui-container`, `ui-grid`, `ui-cluster`, `ui-reel`, `ui-scroll-area`, `ui-separator`,
`ui-sidebar`, `ui-stack`, `ui-switcher`.

### Core: published

`ui-affordance-scope`, `ui-avatar`, `ui-avatar-group`, `ui-badge`, `ui-button`, `ui-checkbox`,
`ui-callout`, `ui-chip`, `ui-combobox`, `ui-context-menu`, `ui-dialog`, `ui-disclosure`, `ui-editable`, `ui-floating-action-button`,
`ui-form-field`, `ui-icon-button`, `ui-input`, `ui-menu`, `ui-menu-item`,
`ui-popover`, `ui-radio`, `ui-radio-group`, `ui-search-result-row`,
`ui-search-shell`, `ui-select`, `ui-switch`, `ui-tabs`, `ui-textarea`,
`ui-toast-region`, `ui-tooltip`, `ui-top-bar`, `ui-tree`, `ui-tree-item`.

### Editor: published

`ui-editor-insert-table-grid`, `ui-editor-mention-menu`, `ui-editor-slash-menu`,
`ui-editor-table-context-menu`, `ui-editor-table-overlay`,
`ui-editor-table-toolbar`, `ui-editor-toolbar`.

Every component above must appear in contract-derived API metadata, public docs,
navigation, and the supported Vue projection where applicable. A missing projection
is a release defect, not a reason to silently shrink the source inventory.

## Accepted And Deferred Product Surface

- Chromium proves the visible structural toolbar, keyboard dimension picker,
  outside-edge insertion overlay, cell backgrounds, merge/split, and column
  resizing; Tiptap round-trip tests prove structural operations retain existing
  table and surrounding content. Data loss or corruption remains release-blocking.
- AlertDialog, Listbox, Drawer/Sheet, HoverCard, CommandPalette,
  Accordion group API, interactive single Chip behavior, link editor, and emoji
  picker are deferred roadmap items.
- Mention suggestions are capped, keyboard- and pointer-operable, and accept a
  host-owned async provider; directory authorization remains outside Looma.
- Domain behavior such as saves, upload transport, collaboration, presence, workspace/page
  concepts, and app-specific commands remains outside Looma.

## Runtime Contract

- Core, layout, and editor invocations lower to their declared native light-DOM roots.
- Authored semantic content is preserved through declared slots, and no custom-element
  registry or shadow-root implementation is part of the public model.
- No-JS fallback is the author's semantic light DOM; lowering and controller behavior require JavaScript.
- Public imports must be SSR-safe at module evaluation time.
- The internal Knit qualification harness must demonstrate server-process imports of `@threadlabs/looma`,
  `@threadlabs/looma/editor`, `@threadlabs/looma/editor/ui`, `@threadlabs/looma/editor/extensions`, `@threadlabs/looma/vue`, and `@threadlabs/looma/vue/editor`. The
  release gate repeats that proof from packed artifacts outside the workspace.

## Proof Status At Contract Freeze

| Evidence | Current status | Release requirement |
| --- | --- | --- |
| Exact source inventory | Contract-derived classification and projection gate passing for all 48 tags | Must stay clean through publication |
| Knit linked-workspace build | Passing | Must repeat against approved packed artifacts |
| SSR imports through Knit graph | Passing for core/editor/editor extensions/Vue | Must repeat from clean tarball fixture |
| Package names publicly absent | Observed via unauthenticated npm lookup | Authenticated namespace ownership/publish authorization required |
| ContextMenu projections | API metadata, docs, navigation, contract README, Vue map/export, and render test complete | Must stay clean through publication |
| Browser/a11y/adapter/package gates | Chromium interaction and axe checks pass for representative core/editor surfaces; Vue registers and renders the supported baseline without warnings; Node imports public core and packed graph entries without DOM globals | Keep mandatory, unskipped, and warning-clean in CI |
| Turnkey editor and table kit | Vue browser behavior, theme-token inheritance, Tiptap table integrity, and Knit integration pass | Keep the complete and extension-only paths green |
| Packed package | One local `@threadlabs/looma@0.6.5` tarball passes content/export/hash inspection | License approval, clean protected build, and external/Knit fixtures remain |

Automated accessibility does not replace manual assistive-technology, forced-color,
zoom/reflow, or platform long-press checks. Those are documented manual
checks for the public docs and consumer pass; essential actions do not depend on
long-press because ContextMenu and editor table controls provide visible native
buttons.

The shipping core build uses the declarative graph and does not invoke Stencil.
Legacy source remains only as migration input and drift evidence; it is not part
of the packed runtime or public API.

No row in this matrix authorizes registry mutation. Publication occurs only after
the separate release checklist is fully approved.
