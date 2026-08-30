# Changelog

## v0.1.0 Candidate

Looma Release 1 defines a synchronized Candidate package graph for Vue 3 and
direct custom-element consumers:

- `@threadlabs/looma-tokens`
- `@threadlabs/looma-layout`
- `@threadlabs/looma-core`
- `@threadlabs/looma-editor`
- `@threadlabs/looma-vue`

Candidate means this graph is installable and qualified for its documented
surface, while APIs may still change before Stable. It does not imply completion
of the component roadmap or Stable support parity.

Editor table actions preserve document data and have keyboard and accessibility
coverage. `E-TBL-003` remains an accepted Candidate visual-polish limitation;
data loss or corruption is not accepted. React and Svelte adapters remain
deferred repository previews and are not part of this release graph.

Install the synchronized graph through the npm `candidate` dist-tag and follow
the [Getting Started guide](https://threadlabs-studio.github.io/looma/docs/getting-started)
and [Candidate support boundary](https://threadlabs-studio.github.io/looma/docs/release-1-support)
before adoption.

```sh
pnpm add @threadlabs/looma-tokens@candidate @threadlabs/looma-layout@candidate @threadlabs/looma-core@candidate @threadlabs/looma-editor@candidate @threadlabs/looma-vue@candidate
```
