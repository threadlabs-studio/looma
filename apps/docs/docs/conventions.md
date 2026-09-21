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

Expression syntax such as `:modal="false"` belongs inside a Declarative Component template. It is
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

## DOM and style isolation contract

All component families lower to light-DOM native roots while preserving consumer-authored semantic content through slots. To keep host integration predictable:

- Light-DOM Looma hosts apply a scoped reset (`all: revert-layer`) and re-add required defaults from Looma tokens.
- Each Looma host uses token-driven typography/color by default (`--ui-font-*`, `--ui-text-*`).
- Component subtrees use scoped border-box (`host`, `host *`, `host *::before`, `host *::after`).
- We do not apply a global page reset from Looma packages.

### Hybrid Layer Strategy

Looma uses a hybrid `@layer` approach so isolation stays robust while theming stays overridable:

- **Unlayered (contract):** Host reset (`all: revert-layer`), scoped box-sizing, core typography baseline, and `data-ui-inherit-typography` behavior. `revert-layer` removes unrelated unlayered defaults while revealing Looma's own component-layer display and sizing declarations; later unlayered page CSS can still compose the host.
- **Layered (theme/variants):** Component visual styles (colors, borders, sizes, variants) and utilities (`.ui-scope`, `.ui-font-*`) live in `@layer components` and `@layer utilities`. Unlayered page CSS can override them for theming.

### Opt-in Typography Inheritance

Some surfaces should intentionally blend with host typography (for example markdown prose containers). For those cases, set:

- `data-ui-inherit-typography` on a Looma host element.

When present, Looma host typography is inherited for:

- `font-family`, `font-size`, `line-height`, `font-weight`, `color`
- `direction`, `writing-mode`, `text-orientation`
- `text-rendering`, `font-feature-settings`, `font-variation-settings`

### Utility Pattern (`.ui-scope`)

Use `.ui-scope` on a container when you want an explicit Looma baseline in host apps:

```html
<section class="ui-scope">
  <ui-stack gap="m">
    <ui-button>Save</ui-button>
  </ui-stack>
</section>
```

`.ui-scope` applies token-driven baseline typography/color and scoped border-box to descendants.

### Utility Pattern (Font Stack Presets)

Use utility classes or a data attribute to opt into a font stack preset per subtree:

```html
<section class="ui-scope ui-font-neo-grotesque">
  <ui-button>Save</ui-button>
</section>

<section class="ui-scope" data-ui-font-stack="rounded">
  <ui-badge>Beta</ui-badge>
</section>
```

Supported presets:

- `system` (`.ui-font-system` or `data-ui-font-stack="system"`)
- `neo-grotesque` (`.ui-font-neo-grotesque` or `data-ui-font-stack="neo-grotesque"`)
- `humanist` (`.ui-font-humanist` or `data-ui-font-stack="humanist"`)
- `rounded` (`.ui-font-rounded` or `data-ui-font-stack="rounded"`)
