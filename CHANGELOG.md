# Changelog

## Unreleased

No changes yet.

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
