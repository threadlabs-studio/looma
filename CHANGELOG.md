# Changelog

## Unreleased

No changes yet.

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
