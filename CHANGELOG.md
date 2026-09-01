# Changelog

## v0.1.0 Candidate

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
