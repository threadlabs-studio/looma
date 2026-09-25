# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Interaction design

### Anticipatory Affordance
An interactive cue that progresses from a quiet guide through near and direct intent to an active state, while keeping only the visible control in the pointer hit-test region.

## Styling

### Theme Token
A `--ui-*` custom property defined in `tokens.css` or a theme (`--ui-accent`, `--ui-text`, `--ui-space-4`). It inherits on purpose: set on an element, it themes the whole subtree.

### Component Hook
A `--ui-<component>-*` custom property a component reads to diverge from its default (`--ui-stack-gap`, `--ui-button-surface`). Registered with `@property` and `inherits: false`, so it styles only the component whose root it is set on, where it beats the component's default and props; set on an ancestor, it does nothing. The editor's `--ui-editor-*` hooks are the exception and inherit, since the editor is one surface of separate parts. `tools/scripts/component-hook-inheritance-rule.test.mjs` enforces the registration.

### Hook Relay
A root's private copy of its own hook, `--_ui-<hook>: var(--ui-<hook>)`, for the inner parts, slotted children, and pseudo-elements that read it: a non-inheriting hook has its value on the root alone.

### Parent Default
A private `--_ui-default-<hook>` a Looma component sets for the children it composes (Input Group's input, a compact Menu's items, a Tree's density, an editor surface's icons). The child reads it below its own hook, so a hook set on the child still wins.

## Release qualification

### Package Identity Graph
The package identities and their dependency, import, registry-policy,
generated-output, and consumer references that must agree for one release
artifact set to remain installable and verifiable.

### Package Identity Migration
A coordinated change to every affected node and edge in a Package Identity
Graph, completed by requalifying the resulting exact artifacts in an isolated
consumer.

### Candidate
An explicitly declared Looma package or component contract whose evidence covers its supported consumers while allowing documented limitations short of Stable guarantees.

### Behavioral Candidate
A Candidate evidence profile for Looma behavior that combines package-integrity proof with contract, interaction, accessibility, adapter, and integration-harness evidence.

### Consumer qualification
The release process that proves exact Candidate artifacts work through independent consumer checks and the deepest release-critical gates of an Integration Harness without workspace coupling, shared installation state, or artifact fallback.

### Integration Harness
An independently versioned real application used internally to exercise a library's deepest supported integration boundary without defining the library's audience or public API.

*Avoid as audience labels:* Priority Consumer, Knit developer

### Release evidence
The source- and artifact-bound record of qualification inputs and gate outcomes used to make a release decision.

New evidence for an attempted qualification replaces older evidence, including when the new result is partial or failed.

### Public Facade
The single consumer-facing package that projects selected, explicit entrypoints
from private modular workspaces; internal workspace identities remain
implementation details rather than separate products consumers coordinate.

### Facade Assembly
The deterministic build step that gathers declared JavaScript, declarations,
loaders, and CSS from private workspaces into the Public Facade, rewrites only
declared internal specifiers, and verifies the assembled tree against its export
and dependency boundaries. Release qualification separately verifies the packed
artifact.
