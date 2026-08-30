# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Release qualification

### Candidate
An explicitly declared Looma package or component contract whose evidence covers its supported consumers while allowing documented limitations short of Stable guarantees.

### Behavioral Candidate
A Candidate evidence profile for Looma behavior that combines package-integrity proof with contract, interaction, accessibility, adapter, and priority-consumer evidence.

### Consumer qualification
The release process that proves exact Candidate artifacts work in an independently versioned priority consumer without workspace coupling, shared installation state, or fallback to other Looma artifacts.

### Release evidence
The source- and artifact-bound record of qualification inputs and gate outcomes used to make a release decision.

New evidence for an attempted qualification replaces older evidence, including when the new result is partial or failed.
