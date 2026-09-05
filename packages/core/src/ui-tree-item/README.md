# `ui-tree-item`

## Purpose

Provide one semantic, themeable hierarchy row with disclosure, a Lucide drag
grip, contextual actions, and nested children.

## API

- `item-id`, `label`, `depth`
- `container`, `expanded`, `default-expanded`
- `sortable`, `drag-type`, `drop-scope`, `accepts`
- `selected`, `disabled`
- Slots: default label, `leading`, `actions`, `children`
- `expand`: `{ id, expanded, trigger }`

`depth` supplies `aria-level`; nested markup contributes one 16px logical
visual step. Interactive label and action content remains the author's semantic
no-JS fallback.
