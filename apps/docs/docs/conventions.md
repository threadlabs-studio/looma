# Conventions

These conventions keep contracts stable across core components and framework adapters.

## Naming

- Attributes use kebab-case (`default-open`, `aria-controls`).
- Properties use camelCase (`defaultOpen`).
- Shared state names: `open`, `disabled`, `selected`, `value`, `invalid`, `readonly`.

## Events

- Prefer native events where semantics already exist (`input`, `change`, `focus`, `blur`).
- Custom events keep stable lowercase names and semver-protected payload keys.
- Core payload shapes:
  - `open`: `{ open: true, reason, trigger }`
  - `close`: `{ open: false, reason, trigger }`
  - `select`: `{ value, previousValue, trigger }`

## Controlled and Uncontrolled

- Value contract: `value` + `defaultValue`.
- Open contract: `open` + `defaultOpen`.
- Controlled state wins when provided.
- Events still emit user intent even in controlled mode.

## SSR Upgrade Contract

- SSR HTML must be meaningful before JS loads.
- Upgrade behavior cannot rewrite authored tree shape.
- Required ARIA relationships should be derivable from SSR markup.

## Spacing Rule

Components do not set external margins. Layout primitives own inter-component rhythm via `gap`.
