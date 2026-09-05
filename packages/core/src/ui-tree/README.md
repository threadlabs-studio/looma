# `ui-tree`

## Purpose

Coordinate an accessible hierarchy and reusable drag/drop language without
owning application data.

## SSR Markup Contract

```html
<ui-tree label="Project pages">
  <ui-tree-item item-id="brief" label="Project brief" drag-type="page" sortable>
    <a href="/brief">Project brief</a>
  </ui-tree-item>
</ui-tree>
```

## API

- `label`: accessible tree name.
- `hover-expand-delay`: milliseconds before a closed inside target expands.
- `reorder`: emits source/target ids, kinds, scopes, `position`, and
  `trigger: "pointer"`.

The application applies and persists the requested move. Looma owns full-row
drag imagery, source state, valid-target classification, insertion lines,
containment highlighting, and hover intent.
