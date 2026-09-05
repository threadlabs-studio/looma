# Anticipatory affordances

Looma interactive surfaces use a shared four-stage language:

1. **Guide** — a quiet dot or line shows that an action exists without competing
   with the content.
2. **Near** — one or more controls take shape when the pointer approaches them.
3. **Direct** — hover or keyboard focus applies the accent, cursor, guide line,
   and contextual tooltip.
4. **Active** — pressed, selected, or dragging state gives unambiguous feedback.

The table editor is the reference implementation. Its row and column insertion
points begin as guide dots, reveal neutral `+` controls on approach, and become
accented controls with full guide lines and tooltips on direct intent. A hovered
cell reveals row and column selectors before the editor is focused; an actually
selected cell adds its cell-menu action. Column boundaries use the same language
for drag resizing.

## Interaction scope

`ui-affordance-scope` coordinates descendant controls marked with
`data-ui-affordance`, including `ui-icon-button anticipatory`.

```html
<ui-affordance-scope near-radius="16">
  <ui-icon-button anticipatory label="Add item"><!-- Lucide plus --></ui-icon-button>
  <ui-icon-button anticipatory label="Pin item"><!-- Lucide pin --></ui-icon-button>
</ui-affordance-scope>
```

The scope uses one `pointermove` listener, one animation-frame update, and one
geometry cache for all descendants. It measures again only after an explicit
refresh, scroll, resize, or visual-viewport change. It does not create a listener
or observer per control.

Near regions are virtual presentation state rather than hit targets. This lets
multiple regions overlap naturally while the visible control remains the only
element that can receive a click or drag. It also avoids external margins and
prevents invisible halos from blocking editor selections.

For custom integrations, `createProximityCoordinator(scope, options)` exposes
the same controller used by the component. Call `refresh()` after changing the
set or position of anchors and `destroy()` when the scope is removed.

## Container and descendant state

The scope reflects `data-ui-interaction="engaged"` while any descendant is near
and sets `--ui-affordance-scope-engaged: 1`. Components own their direct and
active visuals, while containers can use the reflected state or inherited custom
property to gently reveal downstream context.

Keep container effects restrained: reveal relevant controls, strengthen a guide,
or adjust a local surface. Do not restyle unrelated descendants or make content
move when the state changes.

## Theme contract

Apps theme the language through semantic tokens rather than component-specific
colors:

- `--ui-affordance-guide-size`
- `--ui-affordance-guide-opacity`
- `--ui-affordance-guide-color`
- `--ui-affordance-near-color`
- `--ui-affordance-direct-color`
- `--ui-affordance-active-color`
- `--ui-affordance-motion`

Keyboard focus skips directly to the direct state. Coarse pointers show the
actionable control immediately, because touch has no meaningful near-hover.
Reduced-motion preferences continue to flow through Looma's motion tokens.
