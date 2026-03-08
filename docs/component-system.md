# Component System and When to Add Components

This doc describes the shared component hierarchy, design rules, and **when to build components in Looma vs in a consuming app** (e.g. Knit). It is the source of truth for the atomic design system; app specs reference it.

## Component hierarchy

- **Atoms:** Button, Input, Badge, Icon, Checkbox, Radio, etc. — single-purpose, no layout assumptions.
- **Molecules:** Composed from atoms; e.g. SearchInput, FormField, TagPicker. Still domain-neutral where possible.
- **Organisms:** Full features (Editor, Sidebar, PageHeader). Usually app-specific; Looma only promotes when clearly reusable.
- **Templates:** Layout shells (WorkspaceLayout, AuthLayout). App-owned.
- **Pages:** Thin route components that wire templates and data. App-owned.

Looma ships **atoms**, **layout primitives** (Stack, Inline, Grid, Center, Cluster), and **molecules** that are clearly reusable across apps. Organisms and above stay in the app unless they become generic enough to promote.

## When to add a component to Looma

- **Do add:** Primitives (buttons, inputs, dialogs, menus, toasts, avatars, badges), layout (Stack, Inline, Grid), and generic molecules that do not encode app-domain entities (e.g. a generic search result row, not “Knit page row”).
- **Do not add:** Components that are tied to one product’s domain (workspace, collection, page, folder, collaborator). Those live in the app; Looma stays domain-neutral.
- **Promote from app when:** An app builds a molecule that would clearly benefit other apps (e.g. AvatarGroup was promoted from Knit). Extract a domain-neutral API; keep app-specific behavior in the app.

## When an app (e.g. Knit) should create components

- **Use Looma first:** For any UI that maps to a primitive (button, input, dialog, menu, form field, etc.), use or wrap Looma. Do not reimplement.
- **Add app components when:** You need domain-specific molecules or organisms (PageCard, FolderTreeNode, EditorToolbar, Sidebar). Build them on top of Looma atoms and layout; keep styling on tokens and conventions below.
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

| Layer        | Looma                          | App (e.g. Knit)                          |
|-------------|---------------------------------|-----------------------------------------|
| Atoms       | ✅ Button, Input, Dialog, …     | Use Looma only                          |
| Layout      | ✅ Stack, Inline, Grid, …       | Use Looma only                          |
| Molecules   | Generic, reusable               | Domain molecules (PageCard, TreeItem…)  |
| Organisms   | Rare promotions                 | Editor, Sidebar, PageHeader, …          |
| Templates   | —                               | WorkspaceLayout, AuthLayout             |
| Pages       | —                               | Route components                        |

Component system and design tokens are defined here. For “when Knit builds components,” see Knit’s product spec, which points back to this doc.
