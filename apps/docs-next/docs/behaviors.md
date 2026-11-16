---
title: Behaviors
description: Find the interaction rules that Looma controls share and learn where to keep widget-specific decisions.
---

# Behaviors

Start with [Blocks](/blocks/) when you are designing a screen. Start with [Components](/components/) when you need a standard control. Use this guide when a custom interaction needs the same keyboard, focus, or form behavior as an existing control.

| Task | Shared behavior | Component responsibilities |
| --- | --- | --- |
| Move through choices or commands | Collection navigation finds the next eligible position, including endpoints and optional wrapping. | Listbox and Combobox decide when to commit. Menu, Context Menu, and Search Shell move focus. Tabs and the editor toolbar interpret direction and orientation. |
| Bring the active item into view | Active-item reveal keeps the target visible in its nearest scrolling surface. | An input can retain focus while a highlighted option moves. A menu can move focus to the actual item. |
| Present a temporary surface | Overlay utilities coordinate placement, stacking, and dismissal. | Dialog owns modality. Popover owns its anchor. Menu owns keyboard entry and item activation. |
| Navigate available dates | Date navigation moves through the calendar with date constraints. | Calendar owns its current day and visible month. Date Picker and Date Range Picker own draft, commit, and form values. |
| Restore form defaults | Form reset waits for the browser to restore native defaults before controllers reconcile their state. | Each field owns its control, validation, and submitted value. |

## Compose behavior into a control

1. Name the action and pick the closest existing interaction. A command menu, a choice list, and a search field can share navigation even though they commit differently.
2. Decide what holds focus, what is active, and what has been committed. Keep these separate when a user can browse options before choosing.
3. Bind the behavior to semantic HTML and the component's events. Cover disabled items, data changes, keyboard cancellation, and reconnection.
4. Use the finished control in a block and test its fit alongside realistic content and adjacent controls.

## Use the behavior API

Import collection navigation and deferred focus from `@threadlabs/looma/behaviors`. For example, an option list can calculate the next active source index while leaving commitment to its select action.

```js
import { enabledOptionIndices, nextActiveIndex } from "@threadlabs/looma/behaviors";

const enabled = enabledOptionIndices(options);
const next = nextActiveIndex(enabled, activeIndex, event.key, { wrap: true });
if (next >= 0) setActiveIndex(next);
```

`nextCollectionPosition` is for an already filtered collection, such as a toolbar's eligible buttons. Translate horizontal arrows into forward and backward movement according to the component's orientation and reading direction. `deferredFocus(window)` schedules the latest focus request after rendering. Call its `cancel()` method on disconnect.

The component definitions remain the public entry points for overlay, date, and form orchestration.
