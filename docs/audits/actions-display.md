# Looma audit: actions and display family

> **Evidence, not decisions.** These are the research notes behind the 0.3 option audit. They describe the API *before* 0.3, and some verdicts were overruled or already resolved. The binding decisions are in the [Component option audit](../../apps/docs/docs/component-library-audit.md).

Scope: `ui-button`, `ui-icon-button`, `ui-badge`, `ui-callout`, `ui-avatar`, `ui-avatar-group`, `ui-separator`.
Baseline: the declared Looma API before 0.3. Research date: 2026-09-21.

Method: each library's official docs or source was checked for configuration surface. **Count** = libraries that have the capability out of the libraries that have the component. **Common** = present in a majority of those. "Native passthrough" means the library forwards arbitrary native attributes, so the capability exists without being listed as a prop. Facts marked *(uncertain)* could not be confirmed on an official page during this pass.

Libraries: RAC = React Aria Components, Radix = Radix Primitives + Themes (counted once), HUI = Headless UI, MUI = Material UI, Chakra = Chakra v3 / Ark, Vuetify = Vuetify 3, PrimeVue, Quasar, WA = Web Awesome (Shoelace successor), SWC = Spectrum Web Components.

## Cross-cutting findings

1. **Forwarding native attributes is the biggest open question.** Every React/Vue library forwards native attributes (`type`, `name`, `value`, `form`, `aria-pressed`, `role`, and so on) to the root element. Looma's JSON lists only declared attributes. If HTML Next does not forward undeclared host attributes to the generated `<button>`, then `ui-button` has **no way to set `type="submit"`**, and toggle buttons cannot set `aria-pressed`. Verify this first; several verdicts below depend on it.
2. **Magic `data-*` attribute in the avatar contract.** An older README shows `<span data-ui-avatar-fallback>` as an author-written child. That breaks the "no magic data-* for authors" rule. The newer JSON only exposes the `fallback` attribute, so this may already be fixed *(uncertain)*. If it is not fixed, the component should render the fallback internally.
3. **Naming consistency.** Badge uses `tone=neutral`, but callout has `note` and no `neutral`. Button folds tone into `variant=danger`. See the per-component sections.

---

## 1. ui-button

### Equivalents
| Library | Component |
|---|---|
| RAC | `Button` |
| Radix | Themes `Button` (Primitives: none) |
| HUI | `Button` |
| MUI | `Button` |
| Chakra | `Button` |
| Vuetify | `VBtn` |
| PrimeVue | `Button` |
| Quasar | `QBtn` |
| WA | `wa-button` |
| SWC | `sp-button` |
| APG | Button pattern |

### Capability table (n = 10)
| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| disabled | all | 10 | yes | `disabled` |
| visual variant (solid/outline/ghost/...) | Radix, MUI, Chakra, Vuetify, PrimeVue, Quasar, WA, SWC | 8 | yes | `variant` |
| size | Radix, MUI, Chakra, Vuetify, PrimeVue, Quasar, WA, SWC | 8 | yes | `size` |
| semantic color/tone, separate from variant | Radix `color`, MUI `color`, Chakra `colorPalette`, Vuetify `color`, PrimeVue `severity`, Quasar `color`, WA `variant`, SWC `variant` | 8 | yes | partial (`variant=danger`) |
| loading/pending state | RAC `isPending`, Radix `loading`, MUI `loading`, Chakra `loading`, Vuetify `loading`, PrimeVue `loading`, Quasar `loading`, WA `loading`, SWC `pending` | 9 | yes | **missing** |
| `type` submit/reset/button | RAC, HUI, WA explicit; rest via native passthrough | 10 | yes | **not declared** |
| form attrs (name/value/form/formaction...) | RAC, WA explicit; rest via passthrough | 10 | yes | **not declared** |
| render as link (`href`/asChild) | MUI, Vuetify, Quasar, WA `href`; Radix, Chakra, PrimeVue `asChild`; SWC `href` (deprecated in favor of native `<a>`) | 8 | yes | missing |
| start/end icon (prop or named slot) | MUI, Vuetify, PrimeVue, Quasar (props); WA `start`/`end`, SWC `icon` (slots); RAC, Radix, Chakra, HUI (children) | 6 dedicated | yes (6/10) | default slot only |
| full width / block | MUI `fullWidth`, Vuetify `block`, PrimeVue `fluid` | 3 | no | - |
| pill/rounded | Radix `radius`, Vuetify `rounded`, PrimeVue `rounded`, Quasar `rounded`, WA `pill` | 5 | no (not a majority) | - |
| loading text/indicator customization | Chakra `loadingText`/`spinner`, MUI `loadingIndicator`/`loadingPosition`, PrimeVue `loadingIcon`, Quasar `loading` slot, SWC `pending-label` | 5 | no | - |
| high-contrast / static color | Radix `highContrast`, SWC `static-color` | 2 | no | - |
| toggle/active | Vuetify `active` | 1 | no | - |
| caret | WA `with-caret` | 1 | no | - |
| ripple/elevation | MUI, Vuetify, Quasar | 3 | no (Material-specific) | - |

### Gaps
| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| Pending state | **add** | Nearly every library has it, and a correct pending button (keeps focus and accessible name, blocks repeat activation, exposes busy state) is easy to get wrong by hand. | `pending: boolean = false`. Sets `aria-disabled="true"` (not `disabled`, so focus is kept) and shows a spinner while keeping the label for AT. RAC and SWC also use the name `pending`. |
| `type` | **add** (if HTML Next does not forward native attributes) | A generated `<button>` inside a form defaults to `submit`, and authors must be able to choose. | `type: "button" \| "submit" \| "reset" = "button"` |
| `name` / `value` / `form` | **add only if there is no passthrough** | Multi-submit forms need them. With passthrough they are free. | `name: string = ""`, `value: string = ""`, `form: string = ""` |
| Render as link | **add, conditional** | Link-styled-as-button CTAs are universal. However, SWC deprecated `href` on buttons in favor of native `<a>`, which argues for a CSS-level pattern. | Preferred: `href: string = ""`, which switches the root to `<a>` if HTML Next templates allow a conditional root *(uncertain)*. Otherwise, document styling a native `<a>` and do not add an attribute. |
| Separate tone axis | **skip** | `variant=danger` covers the only tone buttons need in practice, and success/warning buttons are an anti-pattern. | - |
| Start/end icon slots | **skip** | Put an `<svg>` in the default slot as child markup. A CSS `gap` on the root handles spacing without named slots. | - |
| Loading text/indicator customization | **skip** | Not common. The spinner is a Looma concern, and the label stays visible. | - |

### Looma extras
- `variant=outline` as the default: most libraries default to solid. **keep**. The default is a design choice, not an API gap.

### Function-valued options elsewhere
| Library option | Declarative equivalent |
|---|---|
| RAC `onPress*`, `onHover*`, `onFocusChange` | Native `click`, `pointerenter`/`pointerleave`, `focus`/`blur` events |
| RAC `formAction` as a function | Native `formaction` URL, or a form `submit` event |
| RAC `children`/`className`/`style`/`render` as render-props | CSS state selectors (`:hover`, `:focus-visible`, `:disabled`, `[aria-busy]`) |
| MUI `loadingIndicator`, Chakra `spinner`/`loadingText` (nodes) | Built-in spinner. If customization is ever needed, use a `pending` slot. |
| Vuetify `icon`/`prepend-icon` (component or function IconValue) | Child `<svg>` markup |

---

## 2. ui-icon-button

### Equivalents
| Library | Component |
|---|---|
| RAC | `Button` + `aria-label` (no dedicated component) |
| Radix | Themes `IconButton` |
| HUI | `Button` (no dedicated component) |
| MUI | `IconButton` |
| Chakra | `IconButton` |
| Vuetify | `VIconBtn` (also `VBtn icon`) |
| PrimeVue | `Button` with `icon` and no `label` |
| Quasar | `QBtn` with `icon`/`round` |
| WA | `wa-button` containing an icon plus a label. Shoelace had `sl-icon-button`, and whether WA 3 kept `wa-icon-button` is *(uncertain)*. |
| SWC | `sp-action-button` (`label`, `quiet`) or `sp-button` with the `icon` slot and `label` |

### Capability table (n = 10)
| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| accessible label | all (`aria-label`/`label`) | 10 | yes | `label` |
| disabled | all | 10 | yes | `disabled` |
| size | Radix, MUI, Chakra, Vuetify, PrimeVue, Quasar, WA, SWC | 8 | yes | `size` |
| variant | Radix, Chakra, Vuetify, PrimeVue, Quasar, WA, SWC (`quiet`) | 7 | yes | `variant` |
| loading/pending | Radix, MUI, Chakra, Vuetify, PrimeVue, Quasar, WA, RAC | 8 | yes | **missing** |
| color/tone | Radix, MUI, Chakra, Vuetify, PrimeVue, Quasar, WA, SWC | 8 | yes | - |
| round/radius | Radix `radius`, Vuetify `rounded`, PrimeVue `rounded`, Quasar `round`, Chakra (style prop) | 5 | borderline | `round` |
| `type`/form attrs | same as button | 10 | yes | not declared |
| href | Vuetify, Quasar, WA, SWC | 4 | no | - |
| toggle/selected | Vuetify `active`/`active-icon`, SWC `selected`/`toggles` | 2 | no | - |
| edge offset | MUI `edge` | 1 | no | - |

### Gaps
| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| Pending | **add** | Same reasoning as button. Icon buttons often trigger async actions such as save, refresh, or delete. | `pending: boolean = false` |
| `type` | **add** (if there is no passthrough) | Icon buttons also live inside forms, for example a search submit. | `type: "button" \| "submit" \| "reset" = "button"` |
| Tone | **skip** | Use `danger` through a variant value if it is ever needed. No evidence it is needed yet. | - |
| Pressed/toggle | **skip** (unless there is no passthrough) | Not common. Native `aria-pressed` on the button is the APG answer. If attributes are not forwarded, add `pressed: boolean = false`, which renders `aria-pressed`. | - |

### Looma extras
- `anticipatory`: unique to Looma (proximity reveal inside `ui-affordance-scope`). **keep**. This is a deliberate Looma interaction feature, scoped and default false.
- `round`: 5 of 10 libraries. **keep**. Circular icon buttons are a real distinct shape (floating actions, avatars rows).
- `label` as an attribute instead of requiring `aria-label`: **keep**. It guarantees an accessible name and could double as the tooltip source.

### Function-valued options elsewhere
Same as button. Vuetify `icon`/`active-icon` (IconValue can be a function or component) maps to child `<svg>` markup, plus a CSS `[aria-pressed=true]` state for swapping the icon.

---

## 3. ui-badge

Looma's badge is a static label. For libraries where "Badge" means an anchored notification count, the static-label equivalent is listed instead.

### Equivalents
| Library | Component |
|---|---|
| RAC | none |
| Radix | Themes `Badge` |
| HUI | none |
| MUI | `Chip`. MUI `Badge` is a notification overlay. |
| Chakra | `Badge` |
| Vuetify | `VChip`. `VBadge` is a notification overlay. |
| PrimeVue | `Tag`. `Badge`/`OverlayBadge` show counts. |
| Quasar | `QBadge` |
| WA | `wa-badge` |
| SWC | `sp-badge` |

### Capability table (n = 8)
| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| color/tone | all | 8 | yes | `tone` |
| variant: solid/subtle | Radix, MUI Chip (filled), Chakra, Vuetify, Quasar (`transparent`/default), WA, SWC (`subtle`) | 7 | yes | `variant` |
| variant: **outline** | Radix, MUI Chip, Chakra, Vuetify, Quasar, WA, SWC | 7 | yes | **missing** |
| size | Radix, MUI Chip, Chakra, Vuetify, SWC | 5 | yes | missing |
| icon (prop/slot/children) | all | 8 | yes | default slot |
| pill/rounded | Radix, Vuetify, PrimeVue, Quasar, WA, Chakra (style) | 6 | yes | - |
| removable | MUI Chip, Vuetify VChip | 2 | no | - |
| clickable | MUI Chip, Vuetify VChip | 2 | no | - |
| anchored count/dot overlay | MUI Badge, Vuetify VBadge, PrimeVue OverlayBadge, Quasar `floating`, SWC `fixed` | 5 of all 10 | n/a (separate concept) | - |
| attention animation | WA `attention` | 1 | no | - |

### Gaps
| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| `outline` variant value | **add** | Seven of eight libraries have it. It is CSS-only, and it is the right low-emphasis choice on tinted or dense surfaces where `subtle` blends in. | `variant: "solid" \| "subtle" \| "outline" = "subtle"` |
| size | **skip** | Badges should scale with their context font size (the WA approach, em-based). A prop adds nothing that inheriting font size does not already do. | - |
| icon | **skip** | Child `<svg>` in the default slot already works. | - |
| pill | **skip** | The radius belongs to the theme, not to individual instances. | - |
| anchored notification count | **skip for now** | This is a different component (overlay plus count/max/dot). If it is needed, build a separate `ui-count-badge` instead of overloading this one. | - |

### Looma extras
- `tone=accent`: equivalent to WA/Radix brand color. **keep**.

### Function-valued options elsewhere
None material. MUI Chip `onDelete` and `deleteIcon` belong to the removable chip. The declarative form would be a `remove` event plus a built-in button, but that capability is out of scope.

---

## 4. ui-callout

### Equivalents
| Library | Component |
|---|---|
| RAC | none |
| Radix | Themes `Callout` (Root/Icon/Text) |
| HUI | none |
| MUI | `Alert` |
| Chakra | `Alert` (Root/Indicator/Content/Title/Description) |
| Vuetify | `VAlert` |
| PrimeVue | `Message` |
| Quasar | `QBanner` |
| WA | `wa-callout` |
| SWC | `sp-alert-banner`. SWC has no inline-alert element *(uncertain)*. React Spectrum has `InlineAlert`. |
| APG | Alert pattern (`role="alert"`, only for important, time-sensitive, dynamically shown messages) |

### Capability table (n = 8)
| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| status/tone | Radix (`color`), MUI, Chakra, Vuetify, PrimeVue, WA, SWC. Quasar uses color classes only. | 7 | yes | `tone` |
| status icon (default per tone, override or hide) | Radix Icon, MUI `icon`/`iconMapping`, Chakra Indicator, Vuetify `icon`, PrimeVue `icon`, Quasar `avatar` slot, WA `icon` slot, SWC (automatic) | 8 | yes | **missing** |
| variant | Radix, MUI, Chakra, Vuetify, PrimeVue, WA | 6 | yes | missing |
| size/density | Radix, Chakra, PrimeVue, WA, Vuetify (`density`), Quasar (`dense`) | 6 | yes | missing |
| dismissible + close event | MUI `onClose`, Vuetify `closable`, PrimeVue `closable`, SWC `dismissible`. Chakra is composition only. | 4 | no (half) | - |
| action slot | MUI `action`, Quasar `action`, SWC `action`, Vuetify `append` slot | 4 | no (half) | - |
| title | MUI AlertTitle, Chakra Title, Vuetify `title` | 3 | no | - |
| live-region role | MUI (`role=alert` default), PrimeVue (`role=alert`), others none/unspecified *(uncertain for Chakra/Vuetify)* | 2-4 | no | - |
| auto-dismiss | PrimeVue `life` | 1 | no | - |

### Gaps
| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| Status icon | **add** | All eight libraries have it. An icon conveys status without relying on color alone (WCAG 1.4.1). | `icon` named slot for an author-supplied `<svg aria-hidden="true">`. If Looma ships an icon set, render a per-tone default when the slot is empty, and add `icon-hidden: boolean = false` to suppress it. |
| variant | **skip** | A single well-tuned callout treatment per tone is enough. Visual-weight variants add theming surface without a clear use. | - |
| size | **skip** | Callouts size with their content. Density is not a real need here. | - |
| Dismissible | **skip (not common)**, noted as a candidate | Not a majority, and remembering a dismissal is app logic. If banners need it, add `dismissible: boolean = false` plus a `close` event, with Looma rendering the close button. | - |
| Action slot | **skip** | Buttons in the default slot already work. A slot only buys layout. | - |
| Live region | **skip (native)** | Authors put `role="status"` or `role="alert"` on the host. APG warns against `alert` on static content, so the default must stay off. Document this. | Native `role` on the host |

### Looma extras
- `tone=note`: no library has both `info` and `note`. Badge calls the neutral tone `neutral`, and Chakra uses `neutral` too. **keep the capability, rename `note` to `neutral`** so tone vocabulary is consistent across Looma.

### Function-valued options elsewhere
| Library option | Declarative equivalent |
|---|---|
| MUI `onClose`, PrimeVue `@close`/`@life-end`, Vuetify `update:modelValue` | `close` event (only if `dismissible` is ever added) |
| MUI `iconMapping`, `icon` nodes; Vuetify `icon` IconValue | `icon` slot |
| MUI `action` node | Default-slot child markup |

---

## 5. ui-avatar

### Equivalents
| Library | Component |
|---|---|
| RAC | none |
| Radix | Primitives `Avatar` (Root/Image/Fallback) + Themes `Avatar` |
| HUI | none |
| MUI | `Avatar` |
| Chakra | `Avatar` (Ark `Avatar`) |
| Vuetify | `VAvatar` |
| PrimeVue | `Avatar` |
| Quasar | `QAvatar` |
| WA | `wa-avatar` |
| SWC | `sp-avatar` |

### Capability table (n = 8)
| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| image src | all | 8 | yes | `src` |
| accessible label/alt | Radix (img alt), MUI `alt`, Chakra (img alt), PrimeVue `ariaLabel`, WA `label`, SWC `label`, Quasar (img child) | 7 | yes | `alt` |
| text/initials fallback | Radix Fallback, MUI children, Chakra `name`, Vuetify `text`, PrimeVue `label`, Quasar slot, WA `initials` | 7 | yes | `fallback`, `name` |
| fallback when the image fails | Radix, MUI, Chakra, WA; PrimeVue/Vuetify partial | 6 | yes | yes (per README) |
| icon fallback / default glyph | MUI (person icon), Chakra (generic icon), Vuetify `icon`, PrimeVue `icon`, Quasar `icon`, WA `icon` slot | 6 | yes | **missing** |
| shape (circle/rounded/square) | Radix `radius`, MUI `variant`, Chakra `shape`, Vuetify `rounded`, PrimeVue `shape`, Quasar `square`/`rounded`, WA `shape` | 7 | yes | **missing** |
| size | Radix, Chakra, Vuetify, PrimeVue, Quasar, SWC (WA via CSS `--size`) | 6 | yes | **missing** |
| background color | Radix, Chakra, Vuetify, Quasar | 4 | no (half) | - |
| image load status event | Radix `onLoadingStatusChange`, Chakra `onStatusChange`, WA `wa-error`, PrimeVue `error` | 4 | no (half) | - |
| decorative (hidden from AT) | SWC `is-decorative` | 1 | no | - |
| lazy loading | WA `loading` (others via img passthrough) | 1 explicit | no | - |
| srcset/sizes | MUI | 1 | no | - |
| fallback delay | Radix `delayMs` | 1 | no | - |
| href | SWC | 1 | no | - |
| initials derived from name | Chakra (`name`, customizable with `getInitials`) | 1 | no | `name` |

### Gaps
| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| size | **add** | Avatars appear at clearly different sizes (list row, comment, profile header), and a token scale keeps them consistent. | `size: "sm" \| "md" \| "lg" = "md"` (same scale as button). Arbitrary sizes through a CSS custom property. |
| shape | **add** | Square avatars for orgs, teams, and bots versus circular avatars for people is a real semantic distinction used across products. | `shape: "circle" \| "square" = "circle"`. "square" means the theme's rounded-square. |
| Icon fallback | **add (built-in, no attribute)** | When there is no image and no name, a generic person glyph beats the current bare "Avatar" label. | No new attribute. Render a default glyph when `src`, `name`, and `fallback` are all empty. |
| Decorative | **add** (uncommon but high value) | An avatar next to a visible name is the most common layout, and today it double-announces. `alt=""` cannot signal decorative because `""` is already the default. | `decorative: boolean = false`, which sets `aria-hidden="true"` and drops `role`/`aria-label`. |
| Status event | **skip** | Fallback is automatic, and few authors need to observe load failure. | - |
| Lazy loading | **skip** | Not common. Revisit if avatar-heavy feeds show a cost. | - |
| Background color | **skip** | A theme concern. Per-person colors derived from the name could be a later built-in without any attribute. | - |

### Looma extras
- `name` (derives both initials and the label): only Chakra has something similar. **keep**. One attribute gives initials plus an accessible name, which is real ergonomic value.
- `fallback` (explicit initials override): matches WA `initials` and Vuetify `text`. **keep**.
- Author-written `data-ui-avatar-fallback` child (README-era contract): **drop** if it is still present, because it is a magic `data-*` attribute. Render the fallback internally from `name`/`fallback`.

### Function-valued options elsewhere
| Library option | Declarative equivalent |
|---|---|
| Chakra `getInitials(name)` | `fallback` attribute (explicit initials) |
| Radix `onLoadingStatusChange`, Chakra `onStatusChange` | Automatic fallback. A native `error` event if it is ever needed. |
| MUI `imgProps`/`slotProps` | Specific declared attributes only, if justified |

---

## 6. ui-avatar-group

### Equivalents
| Library | Component |
|---|---|
| RAC | none |
| Radix | none |
| HUI | none |
| MUI | `AvatarGroup` |
| Chakra | `AvatarGroup` |
| Vuetify | `VAvatarGroup` (labs) |
| PrimeVue | `AvatarGroup` |
| Quasar | none |
| WA | none (CSS recipe in the avatar docs) |
| SWC | none |

### Capability table (n = 4)
| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| overlap/spacing control | MUI `spacing`, Chakra `spaceX`, Vuetify `gap` | 3 | yes | - |
| max visible with "+N" | MUI `max`, Vuetify `limit`. In Chakra and PrimeVue the author writes a manual "+N" avatar *(Chakra uncertain)*. | 2 | no | `max` |
| shared shape/size for children | MUI `variant`, Vuetify `size` | 2 | no | - |
| stacking order/reverse | Chakra `stacking`, Vuetify `reverse` | 2 | no | - |
| total count override | MUI `total` | 1 | no | - |
| custom surplus rendering | MUI `renderSurplus`, Vuetify `overflowText` | 2 | no | - |
| data-driven items | Vuetify `items` | 1 | no | - |
| hover expand, vertical | Vuetify `hoverable`, `vertical` | 1 | no | - |

### Gaps
| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| spacing | **skip** | Overlap is a theme value. A CSS custom property is enough. | - |
| total | **add** (uncommon, real value) | Servers should not render 200 avatars just to get "+195". Without `total`, the surplus count is wrong whenever the markup is truncated. | `total: number = 0`, where 0 means "count the children". The pill shows `total - max`. |
| Group size / shape | **add only if `ui-avatar` gains `size`/`shape`** | The "+N" pill is Looma-rendered and must match its siblings. | `size: "sm" \| "md" \| "lg" = "md"`, which applies to the pill and is inherited by children through CSS |
| Surplus label i18n | **add if Looma has no global i18n** | The pill's `aria-label` is English. This is the declarative replacement for MUI's `renderSurplus`. | `overflow-label: string = "{count} more"`, a template with a `{count}` token |

### Looma extras
- `max` (default 5, same as MUI): **keep**. It is the reason the component exists.
- `label` (default "People", `role=list`): no library does this. **keep**. A labeled list is the correct semantics for a group of people.

### Function-valued options elsewhere
| Library option | Declarative equivalent |
|---|---|
| MUI `renderSurplus(n)` | `overflow-label` template string |
| Vuetify `items` + `itemProps` (function) | Child `<ui-avatar>` markup |

---

## 7. ui-separator

### Equivalents
| Library | Component |
|---|---|
| RAC | `Separator` |
| Radix | Primitives `Separator` + Themes `Separator` |
| HUI | none |
| MUI | `Divider` |
| Chakra | `Separator` |
| Vuetify | `VDivider` |
| PrimeVue | `Divider` |
| Quasar | `QSeparator` |
| WA | `wa-divider` |
| SWC | `sp-divider` |
| ARIA | `separator` role (non-focusable static separator) |

### Capability table (n = 9)
| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| orientation | all | 9 | yes | `orientation` |
| thickness/size | Radix Themes `size`, Chakra `size`, Vuetify `thickness`, Quasar `size`, SWC `size`; WA via CSS `--width` | 5 (+1 CSS) | yes | - |
| color | Radix, Vuetify, Quasar, SWC `static-color`; WA via CSS `--color` | 4 (+1 CSS) | borderline | - |
| inset/spacing | MUI `variant`, Vuetify `inset`, Quasar `spaced`/`inset`; WA `--spacing` | 3 (+1 CSS) | no | - |
| label content | MUI children, Chakra `label` (example), PrimeVue slot, Vuetify slot *(uncertain)* | 4 | no | default slot |
| label alignment | MUI `textAlign`, PrimeVue `align`, Chakra *(uncertain)* | 2-3 | no | - |
| line style (dashed/dotted) | Chakra, Vuetify, PrimeVue | 3 | no | - |
| decorative (no semantics) | Radix `decorative` | 1 | no | - |
| element type | RAC `elementType`, MUI `component`, Radix `asChild` | 3 | no | - |

### Gaps
| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| thickness/size | **skip** | A single hairline token is the norm. Use a CSS custom property for exceptions. | - |
| color | **skip** | A theme concern (CSS). | - |
| decorative | **skip** | Uncommon. Keep `role="separator"` with `aria-orientation` only when vertical, per ARIA. | - |

### Looma extras
- Default slot (labeled divider, for example "or" in auth forms): uncommon (4/9) but valuable. **keep**. Caveat: in ARIA the `separator` role has presentational children, so a text label inside `role="separator"` is hidden from assistive technology. When the slot has content, Looma should put the label outside the separator element (for example two `role=separator` lines around a plain text node), or render it without the separator role *(behavior not verified in current Looma)*.

### Function-valued options elsewhere
None.

---

## Sources

- React Aria Components: https://react-aria.adobe.com/Button, https://react-aria.adobe.com/Separator *(URL assumed from the Button redirect pattern)*
- Radix Themes: https://www.radix-ui.com/themes/docs/components/button, .../icon-button, .../badge, .../callout, .../avatar, .../separator
- Radix Primitives: https://www.radix-ui.com/primitives/docs/components/avatar, https://www.radix-ui.com/primitives/docs/components/separator
- Headless UI: https://headlessui.com/react/button
- Material UI: https://mui.com/material-ui/api/button/, .../icon-button/, .../chip/, .../badge/, .../alert/, .../avatar/, .../avatar-group/, .../divider/
- Chakra UI v3: https://chakra-ui.com/docs/components/button, .../icon-button, .../badge, .../alert, .../avatar, .../separator; Ark UI: https://ark-ui.com/docs/components/avatar
- Vuetify 3 (source; the docs site is a JS SPA): https://github.com/vuetifyjs/vuetify/tree/master/packages/vuetify/src/components (VBtn, VIconBtn, VChip, VBadge, VAlert, VAvatar, VDivider); labs VAvatarGroup: https://github.com/vuetifyjs/vuetify/tree/master/packages/vuetify/src/labs/VAvatarGroup
- PrimeVue: https://primevue.dev/button/, /avatar/, /message/, /divider/, /tag/, /badge/
- Quasar: https://quasar.dev/vue-components/button, /avatar, /badge, /banner, /separator, /chip; API JSON: https://github.com/quasarframework/quasar/tree/dev/ui/src/components
- Web Awesome: https://webawesome.com/docs/components/button, /badge, /callout, /avatar, /divider
- Spectrum Web Components: https://opensource.adobe.com/spectrum-web-components/components/button/, /action-button/, /badge/, /alert-banner/, /avatar/, /divider/
- WAI-ARIA APG: https://www.w3.org/WAI/ARIA/apg/patterns/button/, https://www.w3.org/WAI/ARIA/apg/patterns/alert/; ARIA separator role: https://www.w3.org/TR/wai-aria-1.2/#separator
