# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

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

*Avoid:* Priority Consumer

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
