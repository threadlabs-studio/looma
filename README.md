# Looma Monorepo

Looma is a stack-agnostic UI library based on web standards and Open UI principles.

## Release 1

Looma Release 1 is a public npm **Candidate `0.1.0`**, not a claim that every
component or framework adapter is Stable. The intended public package graph is:

- `@looma/tokens`: CSS tokens and themes.
- `@looma/layout`: light-DOM layout primitives with no external margins.
- `@looma/core`: shadow-DOM web components that enhance consumer-authored semantic light DOM.
- `@looma/editor`: light-DOM editor elements and Tiptap extension helpers.
- `@looma/vue`: the supported Release 1 framework adapter.

`@looma/react` and `@looma/svelte` remain repository previews and are not part
of the Release 1 public package set. Apps and documentation workspaces are private.

The `@looma` namespace is the intended namespace, but npm ownership and publish
authorization are an explicit release prerequisite. See the
[Release 1 support matrix](docs/release-support-matrix.md) and
[release checklist](docs/release-checklist.md) for the exact promise and gate status.

## Core Rules

- Accessibility first and mobile first.
- Progressive enhancement with SSR-first markup contracts.
- HTML and CSS first, JS as enhancement.
- Composition over configuration.
- No global magical state.
- No external margins in components.

## Documentation

- `docs/release-support-matrix.md`: public package, component, DOM, and proof boundary.
- `docs/architecture.md`: package and runtime architecture.
- `docs/adapters.md`: supported adapter contract and repository-preview status.
- `docs/component-qualification-guide.md`: Candidate and Stable evidence rules.
