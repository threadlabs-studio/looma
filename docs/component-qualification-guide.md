# Component Qualification Guide

This guide distinguishes repository implementation from a public support promise.

## Component, Recipe, And Token

- **Component:** reusable semantic primitive with a behavioral/API contract.
- **Recipe:** composition pattern built from components and layout primitives.
- **Token:** design primitive or semantic variable, not a renderable UI element.

## Qualification Levels

- **Draft:** an initial contract and implementation exist, but required evidence
  may be incomplete.
- **Candidate:** the explicitly declared package/component contract has release
  evidence for its supported consumers. Candidate may retain documented limits
  and is not a Stable or universal-framework claim.
- **Stable:** the full supported contract passes all qualification checks and is
  protected by semver compatibility expectations.

## Release 1 Evidence Profiles

Release 1 uses two honest Candidate evidence profiles:

### Package-integrity Candidate

Used by `@threadlabs/looma-tokens` and `@threadlabs/looma-layout`:

- public manifest, license, repository, and export metadata are correct;
- packed contents contain every documented runtime/style/type entry;
- every advertised module format has a real built target;
- a clean external fixture installs and consumes the tarball;
- SSR imports and the package's existing tests pass where applicable.

### Behavioral Candidate

Used by `@threadlabs/looma-core`, `@threadlabs/looma-editor`, and `@threadlabs/looma-vue`. It includes all
package-integrity evidence plus:

- source tags and public projections are complete and classified;
- contract documentation covers semantics, attributes/properties/events/slots,
  SSR/no-JS behavior, keyboard/focus, mobile/touch, and known limits;
- unit, accessibility, adapter render, and required real-browser behavior pass;
- Knit consumes the approved package artifacts through its release-critical flow.

React and Svelte do not satisfy the Release 1 behavioral profile and are deferred.

## Stable Evidence

Stable additionally requires the complete supported-platform and adapter matrix,
closed or explicitly versioned behavioral gaps, long-term compatibility policy,
and semver-protected APIs. Release 1 does not claim Stable status.

## Non-Qualification Conditions

- A package or component has not been classified as published, internal, accepted,
  or deferred.
- An export map advertises a missing artifact or unsupported module format.
- Adapter-only behavior diverges from the element contract.
- Event detail, SSR/no-JS, keyboard/focus, or mobile/touch behavior is undocumented.
- A component injects external margins.
- Generated API, docs, navigation, or the supported Vue surface omits a published tag.

The [Release 1 support matrix](./release-support-matrix.md) is the product-specific
application of these rules.
