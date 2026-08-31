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
A Candidate evidence profile for Looma behavior that combines package-integrity proof with contract, interaction, accessibility, adapter, and priority-consumer evidence.

### Consumer qualification
The release process that proves exact Candidate artifacts work in an independently versioned priority consumer without workspace coupling, shared installation state, or fallback to other Looma artifacts.

### Release evidence
The source- and artifact-bound record of qualification inputs and gate outcomes used to make a release decision.

New evidence for an attempted qualification replaces older evidence, including when the new result is partial or failed.

### Public Facade
The single consumer-facing package that projects selected, explicit entrypoints
from Looma's private modular workspaces. For Release 1, this is
`@threadlabs/looma`; internal workspace identities are implementation details,
not separate products consumers must coordinate.

### Facade Assembly
The deterministic build step that gathers declared JavaScript, declarations,
loaders, and CSS from private workspaces into the Public Facade, rewrites only
declared internal specifiers, and verifies that the packed artifact exactly
matches its export and dependency-boundary contracts.
