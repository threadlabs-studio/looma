# Release 1 Support Matrix

Release 1 describes the public npm surface of `@threadlabs/looma`. It is pre-1.0: not a Stable
declaration, and not a promise that every repository package and roadmap item is supported.

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

`ui-action-bar`, `ui-container`, `ui-cover`, `ui-grid`, `ui-cluster`, `ui-reel`, `ui-scroll-area`, `ui-separator`,
`ui-sidebar`, `ui-stack`, `ui-switcher`.

### Core: published

`ui-affordance-scope`, `ui-avatar`, `ui-avatar-group`, `ui-badge`, `ui-button`, `ui-checkbox`,
`ui-breadcrumbs`, `ui-breadcrumb-item`, `ui-callout`, `ui-card`, `ui-description-list`, `ui-description-item`, `ui-table`, `ui-page-header`, `ui-section`, `ui-spinner`, `ui-meter`, `ui-status-message`, `ui-text`, `ui-combobox`, `ui-context-menu`, `ui-dialog`, `ui-disclosure`, `ui-editable`,
`ui-form-field`, `ui-icon-button`, `ui-input`, `ui-input-group`, `ui-list`, `ui-list-item`, `ui-listbox`, `ui-menu`, `ui-menu-group`, `ui-menu-item`,
`ui-nav-item`, `ui-popover`, `ui-radio`, `ui-radio-group`, `ui-search-result-row`,
`ui-search-shell`, `ui-select`, `ui-switch`, `ui-tabs`, `ui-textarea`,
`ui-toast`, `ui-toast-region`, `ui-tooltip`, `ui-top-bar`, `ui-tree`, `ui-tree-item`.

### Editor: published

`ui-editor-insert-table-grid`, `ui-editor-mention-menu`, `ui-editor-mention-menu-item`,
`ui-editor-slash-menu`, `ui-editor-slash-menu-group`, `ui-editor-slash-menu-item`,
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
- Alert semantics use `ui-dialog alert`; visible choice uses Listbox; a responsive drawer uses
  Sidebar; Search Shell covers a command palette; named Disclosure groups cover exclusive
  accordions; the turnkey editor includes link editing. These do not need duplicate components.
- Nested menus, hover-only rich cards, gutter block dragging, an interactive single Chip, and an
  emoji picker remain deferred until a distinct use case justifies their interaction models.
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
- A consumer qualification harness must demonstrate server-process imports of `@threadlabs/looma`,
  `@threadlabs/looma/editor`, `@threadlabs/looma/editor/ui`, `@threadlabs/looma/editor/extensions`, `@threadlabs/looma/vue`, and `@threadlabs/looma/vue/editor`. The
  release gate repeats that proof from packed artifacts outside the workspace.

Qualification scope and execution limits are defined in
[change-dependent qualification](change-dependent-qualification.md).

## Proof status

| Evidence | Current status | Release requirement |
| --- | --- | --- |
| Exact source inventory | Contract-derived classification and projection gates cover 73 definitions: 71 published, one deferred, one internal | Must stay clean through publication |
| Browser, accessibility and adapter gates | Affected HTML/Vue and editor regressions run in Chromium; exhaustive docs axe/contrast/theme and other-engine checks are explicit extended verification | Keep selected cases mandatory and unskipped; inspect deferred coverage |
| Docs and component catalog | Changed docs build and route/example coverage run automatically; Storybook and exhaustive docs browser/visual checks run explicitly | Keep source definitions, examples and navigation in sync |
| Packed package | A local `@threadlabs/looma@0.15.0` tarball passes the facade consumer matrix, TypeScript checks, and SSR imports | Repeat from the final release commit |

Automated accessibility does not replace manual assistive-technology, forced-color,
zoom/reflow, or platform long-press checks. Those are documented manual
checks for the public docs and consumer pass; essential actions do not depend on
long-press because ContextMenu and editor table controls provide visible native
buttons.

The shipping core build uses the declarative graph and does not invoke Stencil.
Legacy source remains only as migration input and drift evidence; it is not part
of the packed runtime or public API.

No row in this matrix authorizes registry mutation. Publication follows the protected release
workflow.
