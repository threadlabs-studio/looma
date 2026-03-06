# `ui-tabs`

## Purpose

Organize content panels with roving tabindex keyboard navigation.

## SSR Markup Contract

```html
<ui-tabs>
  <div role="tablist" aria-label="Sections">
    <button role="tab" aria-selected="true" aria-controls="panel-a" id="tab-a">A</button>
    <button role="tab" aria-selected="false" aria-controls="panel-b" id="tab-b">B</button>
  </div>
  <section role="tabpanel" id="panel-a" aria-labelledby="tab-a">Panel A</section>
  <section role="tabpanel" id="panel-b" aria-labelledby="tab-b" hidden>Panel B</section>
</ui-tabs>
```

## Attributes

- `value`: selected tab id
- `orientation`: `horizontal` | `vertical`

## Properties

- `value: string`
- `defaultValue: string`
- `orientation: "horizontal" | "vertical"`

## Events

- `select`: `{ value: string, previousValue?: string, trigger: "keyboard" | "pointer" | "programmatic" }`

## Slots/Children

- Default children with tablist/tab/panel structure.

## Keyboard Behavior

- Arrow keys move focus between tabs.
- `Enter` or `Space` activates focused tab.

## ARIA

- Requires `tablist`, `tab`, and `tabpanel` roles and linking ids.
