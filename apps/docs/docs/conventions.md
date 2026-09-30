# Conventions

These conventions keep contracts stable across core components and framework adapters.

## Naming

- Attributes use kebab-case (`open`, `aria-controls`).
- Properties use camelCase (`readOnly`, `selectedIndex`).
- Shared state names: `open`, `disabled`, `selected`, `value`, `invalid`, `readOnly`.

## Typed HTML attributes

At an ordinary HTML page boundary, every authored attribute begins as text. Looma attribute strings
are coerced according to the declared property type before a controller receives them. This creates
parity with native HTML controls, whose element contracts determine how authored attributes become
typed values and reflected properties.

- Strings remain strings.
- Number and integer declarations reject non-numeric values instead of silently passing strings.
- Enum declarations accept only their documented values.
- A bare boolean attribute means `true`; explicit `="true"` and `="false"` values coerce to their
  corresponding booleans. Omitting the attribute uses the declared default, which must be `false`
  unless a reviewed UX requirement documents the exception.
- Lists, records, objects, and functions are property-only inputs because HTML has no lossless,
  native syntax for them.

Expression syntax such as `from:modal="false"` belongs inside a Declarative Component template. It is
not consumer syntax for an HTML page; page authors write `<ui-dialog modal="false">` or omit
`modal`.

## Events

Event names describe the interaction, not the package or component that emitted it. The event target
already identifies its owner, so prefixes such as `looma-editor-*` make equivalent interactions
needlessly different across packages.

- Use `input` for continuous value updates while a user edits.
- Use `change` for committed form-control state.
- Use `select` for committing a choice from a menu, list, tab set, or other selection model.
- Use `highlight` when the active option moves without committing it.
- Use `open` and `close` for visibility lifecycle transitions.
- Use `action` for an application-owned command that the component requests but does not execute.
- Use a domain event such as `insert` only when its payload represents a distinct operation rather
  than ordinary selection or state change.

Events bubble and cross component boundaries. Their detail records the resulting state or requested
intent plus a `trigger` when keyboard, pointer, and programmatic origins are meaningful. Components
own interaction mechanics; applications own domain mutations requested by `action` events. Custom
event payload keys are semver-protected.

## State ownership

- Raw HTML exposes one native-like state name: `value`, `checked`, `open`, or `editing`.
- Framework adapters may offer controlled and initial-value ergonomics in framework-native casing,
  but those concepts do not add `default-*` attributes to the declarative HTML contract.
- User interaction updates the component's internal state and emits the documented native or custom
  event. Applications may write a new property value in response when they own that state.

## SSR and Lowering Contract

- SSR HTML must be meaningful before JS loads.
- Lowering may replace the `ui-*` invocation wrapper with its declared native root, but must preserve
  authored semantic descendants and slot meaning.
- Required ARIA relationships should be derivable from SSR markup.

## Spacing Rule

Components do not set external margins. Layout primitives own inter-component rhythm via `gap`.

## Styles and typography

Every component renders light-DOM native elements and preserves the content you author through its
slots.

- A component styles its own root and parts. Everything it does not set, such as the font family,
  inherits from the page as it would for any element.
- `tokens.css` puts its values in `@layer tokens` and its one base rule in `@layer base`, so
  unlayered theme CSS overrides them. Component styles are unlayered: change a component through its
  [hooks](/tokens), not by competing with its selectors.
- Components that present text or controls (Text, Button, Input, Badge, and so on) set the size,
  weight, and colour their design needs from the global type and colour tokens. Theme them through
  those tokens and the component's hooks, never by selecting the markup a runtime renders.

To give a page Looma's type, set it on the page itself:

```css
body {
  font-family: var(--ui-font-sans);
  font-size: var(--ui-font-size);
  line-height: var(--ui-line-height);
  color: var(--ui-text);
}
```
