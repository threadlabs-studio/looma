# Component System and When to Add Components

This doc describes the shared component hierarchy, design rules, and **when to build components in Looma vs in a consuming app** (e.g. Knit or LoadOps). It is the source of truth for the atomic design system; app specs reference it.

## Pre-1.0 driver apps

Knit and LoadOps are Looma's primary product-driver apps until v1.0. Component
needs found in those apps should flow into Looma when they are generic: controls,
layout primitives, generic molecules, theme tokens, accessibility behavior, and
reusable interaction patterns.

The driver apps may own domain-specific compositions, routes, data wiring, and
business workflows. They should not add app-local copies of generic controls.
If the right primitive is missing, the normal path is: define the generic Looma
API, implement and qualify it in Looma, publish or consume the approved
Candidate, then use it in the app.

## Component hierarchy

- **Atoms:** Button, Input, Badge, Icon, Checkbox, Radio, etc. — single-purpose, no layout assumptions.
- **Molecules:** Composed from atoms; e.g. SearchInput, FormField, TagPicker. Still domain-neutral where possible.
- **Organisms:** Full features. Looma ships domain-neutral organisms such as its turnkey Editor; product-specific organisms such as a workspace tree or PageHeader stay in the app.
- **Templates:** Layout shells (WorkspaceLayout, AuthLayout). App-owned.
- **Pages:** Thin route components that wire templates and data. App-owned.

Looma ships **atoms**, **layout primitives** (Stack, Inline, Grid, Center, Cluster, Switcher, Sidebar, Reel), reusable **molecules**, and deliberately complete domain-neutral organisms such as the editor. Product-domain organisms and all templates/pages stay in the app.

Interactive atoms and molecules can participate in an explicit
`ui-affordance-scope`. The scope supplies Looma's shared guide, proximity,
direct-intent, and active-state language without changing layout or adding
invisible hit targets. See [Anticipatory affordances](./anticipatory-affordances.md).

## When to add a component to Looma

- **Do add:** Primitives (buttons, inputs, dialogs, menus, toasts, avatars, badges), layout (Stack, Inline, Grid), and generic molecules that do not encode app-domain entities (e.g. a generic search result row, not “Knit page row”).
- **Do not add:** Components that are tied to one product’s domain (workspace, collection, page, folder, collaborator). Those live in the app; Looma stays domain-neutral.
- **Promote from app when:** An app builds a molecule that would clearly benefit other apps (e.g. AvatarGroup was promoted from Knit, and LoadOps may surface form-heavy transport workflows). Extract a domain-neutral API; keep app-specific behavior in the app.

## When an app (e.g. Knit or LoadOps) should create components

- **Use Looma first:** For any UI that maps to a primitive (button, input, dialog, menu, form field, etc.), use or wrap Looma. Do not reimplement.
- **Add app components when:** You need domain-specific molecules or organisms (PageCard, FolderTreeNode, workspace navigation, quote intake, shipment detail). Build them on top of Looma atoms and layout; keep styling on tokens and conventions below. The app assembles Looma primitives and any Looma editor surfaces, integrates data, and handles events; it does not fork shared controls or behavior.
- **Follow the same rules:** No external margins; use design tokens; support variant/size/disabled/loading where it makes sense. See [Conventions](./conventions.md) and [Tokens](./tokens.md).

## Design rules (Looma and apps)

### No external margins

Every component is responsible only for its own pixels. No component sets `margin-top/bottom/left/right` on itself. Layout and spacing between components are owned by the parent via layout primitives (`Stack`, `Inline`, `Grid`, etc.). This keeps components composable anywhere. See [Conventions — No External Margin Rule](./conventions.md#no-external-margin-rule).

### Design tokens

All visual values (colors, typography, spacing, radius, shadows, transitions) are defined as CSS custom properties (e.g. `--ui-surface`, `--ui-text`). Components reference tokens, not raw values. Themes (light/dark) override tokens; components do not branch on theme. See [Tokens](./tokens.md).

### Dark mode

Theme is applied via token overrides (e.g. `.dark` or `[data-theme="dark"]`). The palette swaps without component logic; avoid scattering `dark:` or theme checks in components.

### Component API conventions

Interactive components support consistent props where applicable: `variant` (e.g. primary | secondary | ghost | danger), `size` (sm | md | lg), `disabled`, `loading`. Use typed `defineProps` (or equivalent) and stable event payloads. See [Conventions](./conventions.md).

## Summary

| Layer        | Looma                          | App (e.g. Knit or LoadOps)               |
|-------------|---------------------------------|-----------------------------------------|
| Atoms       | ✅ Button, Input, Dialog, …     | Use Looma only                          |
| Layout      | ✅ Stack, Inline, Grid, …       | Use Looma only                          |
| Molecules   | Generic, reusable               | Domain molecules (PageCard, shipment row…) |
| Organisms   | Domain-neutral features (Editor) | Domain features (workspace tree, quote intake) |
| Templates   | —                               | WorkspaceLayout, AuthLayout             |
| Pages       | —                               | Route components                        |

Component system and design tokens are defined here. App product specs should point back to this doc for shared UI boundaries.
