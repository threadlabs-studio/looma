# Looma form controls audit (2026-09-21)

> **Evidence, not decisions.** These are the research notes behind the 0.3 option audit. They describe the API *before* 0.3, and some verdicts were overruled or already resolved. The binding decisions are in the [Component option audit](../../apps/docs/docs/component-library-audit.md).

This audit covers `ui-input`, `ui-textarea`, `ui-select`, `ui-checkbox`, `ui-radio`, `ui-radio-group`, `ui-switch`, `ui-form-field`, and `ui-editable`.

**Looma sources:**
- The declared Looma API before 0.3
- Declarative sources in `packages/core/src/declarative/components/` (`*.html` and `controllers/*.js`, as of 2026-09-20)

**Library abbreviations:**
- RAC: React Aria Components
- Radix: Radix Primitives and Radix Themes
- HUI: Headless UI
- MUI: Material UI
- Chakra: Chakra UI v3, including Ark
- Vuetify
- PrimeVue
- Quasar
- WA: Web Awesome, the successor to Shoelace
- SWC: Spectrum Web Components

**"Common"** means the capability is present in a majority of the libraries that have the component.

**Markers:**
- `(u)` means uncertain: taken from memory or from a partial doc page, and not re-verified.
- "Built-in" means the component exposes the capability as a prop. "Composition" means you get it by combining sibling parts or examples.

## Cross-cutting findings (read first)

1. **`ui-checkbox` and `ui-switch` have no `name`.**
   - The root is a `<span>` and the inner `<input>` never gets a name. The controller sets only checked, indeterminate, disabled, required, and value.
   - As a result, they cannot submit in a native form. All 10 libraries expose `name`.
   - Fix: add `name: string = ""`. This is the highest-priority gap in this audit.
2. **`ui-radio-group` keyboard handling does not follow the APG or native radios.**
   - The controller maps only Left/Right (horizontal) or Up/Down (vertical).
   - The APG radio group pattern, and native radios, move with all four arrow keys whatever the layout.
   - Fix: treat `orientation` as layout only and let native radio arrow handling work, or handle all four arrows.
3. **Native attribute passthrough is assumed, not verified.**
   - `ui-input`, `ui-textarea`, and `ui-select` lower directly to native `input`, `textarea`, and `select` roots.
   - I assume undeclared native attributes such as `type`, `name`, `placeholder`, `minlength`/`maxlength`, `pattern`, `autocomplete`, `inputmode`, and `size` reach the root. That means Looma already gets placeholder, type, and native constraint validation for free.
   - If HTML Next does not forward undeclared attributes, `type`, `name`, `placeholder`, `maxlength`, and `pattern` become the largest gap. **Verify this.**
4. **Function-valued validation has one declarative answer.**
   - Other libraries take validate functions: RAC `validate`, Vuetify `rules`, Quasar `rules`/`validate`, WA `validators`, PrimeVue Forms `resolver`.
   - Looma's equivalent:
     - Native constraint attributes (`required`, `pattern`, `min`/`max`, `minlength`/`maxlength`, `type`, `step`).
     - The app calling `setCustomValidity()`.
     - The app setting `invalid`.
     - Error text in the `ui-form-field` `error` slot.
   - The one feature worth adding is that `ui-form-field` falls back to the control's native `validationMessage`. See the `ui-form-field` section.
5. **Label naming is inconsistent.**
   - `ui-combobox` has `label`, `size`, and `label-visibility`. Text controls rely on `ui-form-field` slots.
   - Keep the composition model. Label and hint attributes on every control would duplicate `ui-form-field`.

---

## 1. ui-input (text field)

**Equivalents:**
- RAC: `TextField` + `Input`
- Radix: Themes `TextField` (Primitives: none)
- HUI: `Input` (+ `Field`)
- MUI: `TextField`, `InputBase`
- Chakra: `Input` + `InputGroup` + `Field`
- Vuetify: `v-text-field`
- PrimeVue: `InputText` (+ `IconField`/`InputGroup`/`FloatLabel`)
- Quasar: `QInput`
- WA: `wa-input`
- SWC: `sp-textfield`

10 libraries have this component; 6 or more makes a capability common.

| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| disabled / readonly / required | all (native) | 10 | yes | yes |
| invalid state | RAC, HUI, MUI `error`, Chakra (Field), Vuetify `error`, PrimeVue, Quasar `error`, SWC; WA via native validity only (u) | 8 | yes | yes |
| type / placeholder / min-max length / pattern | all | 10 | yes | native passthrough (assumed) |
| size / density | Radix, MUI, Chakra, Vuetify `density`, PrimeVue, Quasar `dense`, WA, SWC | 8 | yes | **no** |
| variant / appearance | Radix, MUI, Chakra, Vuetify, PrimeVue `filled`, Quasar, WA, SWC `quiet` | 8 | yes | no |
| label (built-in) | RAC, MUI, Vuetify, Quasar, WA, SWC; composition in HUI, Chakra, PrimeVue | 6 built-in, 9 total | yes | via `ui-form-field` |
| help / description text | RAC, HUI, MUI, Chakra, Vuetify, PrimeVue (`Message`), Quasar, WA, SWC | 9 | yes | via `ui-form-field` |
| error text | RAC, MUI, Chakra, Vuetify, PrimeVue, Quasar, SWC | 7 | yes | via `ui-form-field` |
| start/end adornments (icon, prefix/suffix text, addon) | Radix `TextField.Slot`, MUI adornments, Chakra `InputGroup`, Vuetify prefix/suffix/prepend-inner, PrimeVue IconField/InputGroup, Quasar prepend/append/prefix/suffix, WA `start`/`end` | 7 | yes | **no** |
| clearable | Vuetify, Quasar, WA built-in; PrimeVue and Chakra as examples only | 3 | no | no |
| character counter | Vuetify, Quasar; Chakra example only | 2 | no | no |
| password reveal | WA `password-toggle`; PrimeVue `Password` (separate component); Chakra `PasswordInput` snippet | 1 to 3 | no | no |
| loading | Vuetify, Quasar | 2 | no | no |
| input mask | Quasar | 1 | no | no |
| debounce | Quasar | 1 | no | no |

**Gaps and verdicts:**

| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| size | **add** | Dense filter bars and toolbars need the input to match `ui-button size="sm"` and `ui-combobox size="sm"`. | `size: "sm" \| "md" = "md"`, matching `ui-combobox` |
| start/end adornments | **add, as a wrapper** | Search icons, units, and currency are real, frequent needs. But the root is `<input>` and cannot have children, so changing that root would break the direct-lowering contract. | New `ui-input-group` wrapping a `ui-input`/`ui-select`, with slots `start` and `end`. Plain text, icons, or `ui-icon-button` go in the slots, and focus styling goes on the group. |
| variant | skip | Purely cosmetic. Looma has one field style, and the inline-edit case is covered by `ui-editable`. | — |
| built-in label / hint / error attributes | skip | `ui-form-field` composition already covers them, and duplicating them causes drift. | — |
| clearable | skip | Not common. `type="search"` gives a native clear control in Chromium/WebKit, and an end-slot button covers the rest. | — |
| counter, password reveal, loading, mask, debounce | skip | None is common. Mask and debounce are application logic. Password reveal can be revisited as an `end`-slot pattern. | — |

**Looma extras:** none. Every attribute is common, so keep all of them.

**Function-valued options elsewhere:**
- RAC `validate(value)`, Vuetify `rules[]`, and Quasar `rules[]`: use native constraint attributes, `setCustomValidity`, and `invalid`.
- Vuetify `counter-value(fn)`: none needed, since the counter was skipped.
- Quasar `mask-tokens`: skip.

## 2. ui-textarea

**Equivalents:**
- RAC: `TextField` + `TextArea`
- Radix: Themes `TextArea`
- HUI: `Textarea`
- MUI: `TextField multiline`, `TextareaAutosize`
- Chakra: `Textarea`
- Vuetify: `v-textarea`
- PrimeVue: `Textarea`
- Quasar: `QInput type="textarea"`
- WA: `wa-textarea`
- SWC: `sp-textfield multiline`

10 libraries have this component.

| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| rows | all (native) | 10 | yes | yes (`rows=4`) |
| disabled / readonly / required / invalid | as in `ui-input` | 8 to 10 | yes | yes |
| autosize / auto-grow | MUI `minRows`/`maxRows`, Chakra `autoresize` (u), Vuetify `auto-grow`, PrimeVue `autoResize`, Quasar `autogrow`, WA `resize="auto"`, SWC `grows` | 7 | yes | **no** |
| max rows (with autosize) | MUI, Vuetify `max-rows` | 2 | no | no |
| resize control | Radix Themes `resize`, Vuetify `no-resize`, WA `resize` | 3 | no | CSS `resize: vertical` |
| character counter | WA `with-count`, Vuetify, Quasar | 3 | no | no |
| size / variant | same set as `ui-input` | 8 | yes | no |

**Gaps and verdicts:**

| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| autosize | **add** | It removes inner scrollbars for comments and descriptions, and it is one CSS line (`field-sizing: content`), with `rows` kept as the minimum. Browser support for `field-sizing` beyond Chromium is uncertain (u). Without it the field falls back to a fixed height. | `autosize: boolean = false`. Authors cap the height with CSS `max-block-size`. |
| size | skip | `rows` owns the height, and dense-row alignment matters less for multiline fields. Revisit if someone asks. | — |
| variant, counter, resize | skip | Not common or cosmetic. `resize` is plain CSS. | — |

**Looma extras:** none.

**Function-valued options elsewhere:**
- Vuetify `counter-value` and `rules`: see `ui-input`.

## 3. ui-select (native)

**Equivalents:**

| Library | Native | Custom listbox |
|---|---|---|
| RAC | none | `Select` |
| Radix | none | `Select` (Primitives and Themes) |
| HUI | `Select` | `Listbox` |
| MUI | `NativeSelect` | `Select` |
| Chakra | `NativeSelect` | `Select` |
| Vuetify | none | `v-select` |
| PrimeVue | none | `Select` |
| Quasar | none | `QSelect` |
| WA | none | `wa-select` |
| SWC | none | `sp-picker` |

10 libraries have a select. Only HUI, MUI, and Chakra offer a native one.

| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| disabled / required / invalid | all | 10 | yes | yes |
| multiple | RAC (u), MUI, Chakra, Vuetify, PrimeVue (`MultiSelect`), Quasar, WA, HUI (native attribute) | 8 | yes | yes |
| size | Radix Themes, MUI, Chakra, Vuetify, PrimeVue, Quasar, WA, SWC | 8 | yes | **no** |
| variant | Radix Themes, MUI, Chakra, Vuetify, PrimeVue, Quasar, WA, SWC `quiet` | 8 | yes | no |
| placeholder | RAC, Radix, Vuetify, PrimeVue, WA, SWC, Chakra NativeSelect (u) | 7 | yes | no attribute. Native equivalent is child markup. |
| clearable | Vuetify, PrimeVue `showClear`, Quasar, WA `with-clear` | 4 | no | no |
| option groups | RAC `Section`, Radix `Group`, PrimeVue, Vuetify (u), native `optgroup` | most | yes | native `<optgroup>` |
| start/end adornments | WA, Vuetify, Quasar | 3 | no | no |

**Gaps and verdicts:**

| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| size | **add** | It must line up with `ui-input` and `ui-combobox` in the same row. | `size: "sm" \| "md" = "md"` |
| placeholder | skip | Native child markup already expresses it: `<option value="" disabled selected hidden>Choose…</option>` together with `required`. Document it. | child markup |
| clearable | skip | Not common for native selects. An empty `<option value="">` is the native "none" choice. | — |
| variant | skip | Cosmetic. | — |

**Looma extras:**
- `multiple`: keep. It is common and native.
- **Type issue:** with `multiple`, `value: string` cannot express several selections. Either type it as a list (JSON text) when `multiple` is set, or document that multi-select state comes from `<option selected>`. Pick one explicitly.

**Function-valued options elsewhere:**
- Vuetify `item-title`/`item-value` (string or function), PrimeVue `optionLabel`/`optionValue`, WA `getTag(option)`, HUI `by(a, b)`: all are replaced by `<option value>` / `<optgroup label>` child markup.

## 4. ui-checkbox

**Equivalents:**
- RAC: `Checkbox`
- Radix: `Checkbox` (Primitives and Themes)
- HUI: `Checkbox`
- MUI: `Checkbox` + `FormControlLabel`
- Chakra: `Checkbox` (Ark)
- Vuetify: `v-checkbox`
- PrimeVue: `Checkbox`
- Quasar: `QCheckbox`
- WA: `wa-checkbox`
- SWC: `sp-checkbox`

10 libraries have this component.

| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| name (form submission) | all | 10 | yes | **no (bug)** |
| value | all | 10 | yes | yes |
| disabled / required | all (required: RAC, Radix, Ark, MUI, WA, Quasar (u), …) | 9 to 10 | yes | yes |
| indeterminate / mixed | RAC, Radix (`"indeterminate"`), HUI, MUI, Ark, Vuetify, PrimeVue (u), Quasar `indeterminate-value`, WA, SWC | 10 | yes | yes |
| invalid | RAC, Ark, MUI (via FormControl), Vuetify `error`, PrimeVue, SWC; WA via validity | 6 or 7 | yes | **no** |
| readonly | RAC, Ark, Vuetify, PrimeVue, SWC (u) | 5 | no | no |
| size | Radix Themes, MUI, Chakra, Vuetify density, PrimeVue (u), Quasar, WA, SWC | 8 | yes | no (CSS var `--ui-checkbox-size`) |
| label placement | MUI `labelPlacement`, Quasar `left-label` | 2 | no | no |
| per-item hint / description | WA `hint` | 1 | no | no |
| checkbox group component | RAC `CheckboxGroup`, Ark `Checkbox.Group`, MUI `FormGroup`, Quasar `QOptionGroup`, SWC `sp-field-group`; Vuetify/PrimeVue through array models | 5 to 7 | borderline | no |

**Gaps and verdicts:**

| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| name | **add (bug)** | Without it the checkbox never submits in a form. | `name: string = ""`, forwarded to the inner input |
| invalid | **add** | It is needed to mark a required consent box ("accept terms") as failing, both visually and through `aria-invalid`. | `invalid: boolean = false` |
| size | skip | The glyph tracks text size and `--ui-checkbox-size` already exists. An attribute adds nothing. | — |
| checkbox group | skip | `<fieldset><legend>` with `ui-checkbox` children is the native grouping. "At least one" rules are app validation. | child markup |
| readonly, label placement, hint | skip | Not common. Readonly checkboxes are better rendered as text, and placement is CSS. | — |

**Looma extras:** none. Minor note: the controller sets `aria-checked` on a native checkbox. Native `indeterminate` already exposes the mixed state, so remove that line.

**Function-valued options elsewhere:**
- RAC `validate(boolean)` and WA `validators`: use `required` + `invalid`.
- HUI `by` does not apply to checkboxes.

## 5. ui-radio and ui-radio-group

**Equivalents:**
- RAC: `RadioGroup` / `Radio`
- Radix: `RadioGroup.Root` / `Item`
- HUI: `RadioGroup` / `Radio`
- MUI: `RadioGroup` / `Radio` + `FormControlLabel`
- Chakra: `RadioGroup` (Ark)
- Vuetify: `v-radio-group` / `v-radio`
- PrimeVue: `RadioButton`; a group component exists only in newer versions (u)
- Quasar: `QOptionGroup` / `QRadio`
- WA: `wa-radio-group` / `wa-radio`
- SWC: `sp-radio-group` / `sp-radio`

10 libraries have this component.

| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| value / name / disabled / required | all | 10 | yes | yes |
| orientation / inline | RAC, Radix, MUI `row`, Chakra, Vuetify `inline`, Quasar `inline`, WA, SWC `horizontal` | 8 | yes | yes. Default `horizontal`, where most libraries default to vertical. |
| group label | RAC, Vuetify, WA, Ark `Label`, MUI (`FormLabel`), SWC (u) | 6 | yes | yes (`label`) |
| invalid / error | RAC, Ark, MUI (FormControl), Vuetify, SWC, WA (validity) | 6 | yes | **no** |
| description / hint | RAC, WA, Vuetify `hint` | 3 | no | no |
| readonly | RAC, Ark, Vuetify | 3 | no | no |
| size | Radix Themes, MUI, Chakra, Vuetify density, Quasar, WA, SWC | 7 | yes | no |
| loop focus | Radix `loop`; native radios loop | — | — | native |
| options as data | Quasar `options[]` | 1 | no | child markup |

**Gaps and verdicts:**

| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| invalid | **add** | Required radio groups need a failing state wired to `aria-invalid` on the group. | `invalid: boolean = false` on `ui-radio-group` |
| size | skip | Same reason as the checkbox: `--ui-radio-size` exists. | — |
| hint, readonly | skip | Not common. A hint can be a `<p>` inside the fieldset, referenced with `aria-describedby`. | — |

**Looma extras:**

| Item | Verdict | Reasoning |
|---|---|---|
| `select` event and `change` event on the group | **drop `select`**, keep `change` | Two events per selection is redundant, and no library emits both. Give `change` the `{ value, previousValue, trigger }` payload. The current `{ checked, value }` payload is checkbox-shaped. |
| `label` default `"Options"` | **change the default to `""`** | A generic accessible name is worse than a dev-time warning. Other labelled Looma components also use `""`. |
| `orientation` default `horizontal` | **change the default to `vertical`** | RAC, WA, MUI, Vuetify, and Quasar default to a vertical stack, which survives long labels and narrow viewports. Keep the attribute itself. |
| `orientation` restricting arrow keys | **fix** | The APG radio group pattern moves with all four arrow keys. Orientation should only affect layout. |
| `ui-radio` `name` and `required` | keep | Needed for a standalone radio outside a group, and they are native. |

**Function-valued options elsewhere:**
- RAC `validate(value)`, WA `validators`, Vuetify `rules`: use `required` + `invalid`.
- HUI `by` (object comparison): values are strings, so it is not needed.

## 6. ui-switch

**Equivalents:**
- RAC: `Switch`
- Radix: `Switch`
- HUI: `Switch`
- MUI: `Switch`
- Chakra: `Switch` (Ark)
- Vuetify: `v-switch`
- PrimeVue: `ToggleSwitch`
- Quasar: `QToggle`
- WA: `wa-switch`
- SWC: `sp-switch`

10 libraries have this component. See the APG switch pattern.

| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| name | all | 10 | yes | **no (bug)** |
| checked / disabled / value | all | 10 | yes | yes |
| required | WA, MUI, Ark, Radix, HUI (u) | 5 | borderline | yes |
| size | Radix Themes, MUI, Chakra, Vuetify, Quasar, WA, SWC | 7 | yes | no |
| readonly | RAC, Ark, SWC, PrimeVue, Vuetify | 5 | no | no |
| invalid | Ark, Vuetify, PrimeVue, WA (validity) | 4 | no | no |
| label placement | MUI, Quasar `left-label` | 2 | no | no |
| thumb / track icons or labels | Chakra, Quasar, PrimeVue (handle slot) | 3 | no | no |
| emphasized / color | SWC `emphasized`, MUI/Chakra/Quasar color | 4 | no | no |

**Gaps and verdicts:**

| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| name | **add (bug)** | Without it the switch cannot submit in a form. | `name: string = ""` |
| size | skip | CSS vars (`--ui-switch-track-width`/`-height`) already cover it. | — |
| on/off track labels | skip | The APG says the label must not change with state. Icons are cosmetic. | — |
| readonly, invalid, placement | skip | Not common. Switches apply immediately, so validation states are rare. | — |

**Looma extras:** `required`: keep. It is native and costs nothing, although the use case is rare.

**Function-valued options elsewhere:** none of note. Quasar `true-value`/`false-value` are not functions. The native equivalent is `value` plus absence when unchecked.

## 7. ui-form-field

**Equivalents:**
- RAC: `TextField`/`Label`/`Text slot="description"`/`FieldError`
- Radix: Primitives `Form.Field`/`Label`/`Control`/`Message`
- HUI: `Field`/`Label`/`Description` (+ `Fieldset`/`Legend`)
- MUI: `FormControl`/`FormLabel`/`FormHelperText`
- Chakra: `Field.Root`/`Label`/`HelperText`/`ErrorText`/`RequiredIndicator`
- Vuetify: `v-input` (messages); mostly built into controls
- PrimeVue: `FloatLabel`/`IftaLabel`/`Message`, Forms `FormField`
- Quasar: `QField`
- WA: none; built into each control (`label`/`hint` slots)
- SWC: `sp-field-label` + `help-text` slots

10 libraries have this capability.

| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| label association | all | 10 | yes | yes |
| help / description | all but Radix Form (u) | 9 | yes | yes (`help` slot) |
| error message | RAC, Radix, MUI, Chakra, Vuetify, PrimeVue, Quasar, SWC | 8 | yes | yes (`error` slot) |
| error shown only when invalid | RAC `FieldError`, Radix `Form.Message`, Chakra `ErrorText`, SWC `negative-help-text`, MUI (single `helperText`) | 5 or more of 8 | yes | **no. The error slot is always visible and always described.** |
| native validation message shown automatically | RAC (default with native validation), Radix `Form.Message match`; WA via browser bubble (u) | 2 to 3 | no | no |
| invalid / disabled / required propagation | RAC, MUI, Chakra, HUI (disabled), Quasar, Vuetify | 6 | yes | yes |
| required indicator (asterisk) | MUI, Chakra `RequiredIndicator`, SWC `sp-field-label required`, WA | 4 | no | no |
| readonly propagation | Chakra | 1 | no | no |
| orientation / side label | Chakra `orientation`, SWC `side-aligned` | 2 | no | no |

**Gaps and verdicts:**

| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| hide error unless invalid | **add (behavior)** | Today an always-present error node is read as a description even while the field is valid. | No new attribute. Show the `error` slot and add it to `aria-describedby` only while `invalid` is true or the control matches `:user-invalid`. |
| native validation message fallback | **add (behavior)** | This is the declarative replacement for RAC `validate` and Vuetify/Quasar `rules`, and the browser supplies localized messages for free. | When the control fires `invalid` or matches `:user-invalid` and the `error` slot is empty, render `control.validationMessage` and set invalid state. Apps override it by slotting their own error text. |
| required indicator | **add (CSS only)** | It is cheap, it is a WCAG 3.3.2 aid, and `required` already exists. | When `required` is set, the label gets a visual `*` through `::after` (aria-hidden by nature). No new attribute. |
| per-validity messages (Radix `match`) | skip for now | The native `validationMessage` covers most needs. Keyed messages would add a child-element attribute protocol. | Candidate later: `<p slot="error" match="value-missing">` |
| orientation, readonly | skip | Not common. Layout belongs in CSS, and readonly is a per-control attribute. | — |

**Looma extras:** none. Keep all three booleans. Note that an older version of `ui-form-field` rendered a `fieldset`/`legend` with a `label` prop. The current div plus slots is the better, common model.

**Function-valued options elsewhere:**
- Radix `Form.Message match={(value, formData) => boolean}`: use keyword `match` values (later) or the native message.
- Vuetify/Quasar `rules[]`, PrimeVue `resolver`: native constraints + `setCustomValidity`.

## 8. ui-editable (inline edit-in-place)

**Equivalents:**
- Chakra/Ark: `Editable`
- PrimeVue: `Inplace`
- Quasar: `QPopupEdit` (edit in a popup)
- Vuetify: `v-confirm-edit`, a save/cancel wrapper only (u)
- MUI: none (DataGrid cell editing only)
- RAC: none (u)
- Radix, HUI, WA/Shoelace, SWC: none

3 or 4 libraries have this component, so 2 or more makes a capability common.

| Capability | Libraries | Count | Common | Looma |
|---|---|---|---|---|
| controlled edit state | Ark `edit`/`defaultEdit`, PrimeVue `active`, Quasar (show/hide methods, u) | 3 | yes | yes (`edit`) |
| value / change / commit / revert events | Ark `onValueChange`/`onValueCommit`/`onValueRevert`/`onEditChange`, Quasar `save`/`cancel`, PrimeVue `open` | 3 | yes | yes (`input`, `change`, `edit-change` with reason) |
| explicit save/cancel buttons | Ark triggers, Quasar `buttons`, Vuetify confirm-edit, PrimeVue close button | 4 | yes | yes (`actions`) |
| localizable button labels | Ark `translations`, Quasar `label-set`/`label-cancel` | 2 | yes | **no (hard-coded "Save"/"Cancel")** |
| placeholder for an empty value | Ark `placeholder` (preview and edit) | 1 | no | **no** |
| activation mode (focus/click/dblclick/none) | Ark | 1 | no | click / Enter only |
| submit mode (enter/blur/both/none) | Ark; Quasar auto-save | 2 | yes | fixed: Enter or blur commits, unless `actions` is set |
| select text on open | Ark `selectOnFocus` (default true) | 1 | no | yes (always) |
| auto-resize | Ark `autoResize` | 1 | no | yes (by layout) |
| max length / required / invalid | Ark | 1 | no | no |
| multiline (textarea) | Ark (Textarea), PrimeVue/Quasar (arbitrary content) | 3 | yes | no |
| arbitrary edit content | PrimeVue `display`/`content` slots, Quasar default slot | 2 | yes | no (text only) |
| name / form participation | Ark | 1 | no | no |

**Gaps and verdicts:**

| Gap | Verdict | Reasoning | Proposed API |
|---|---|---|---|
| localizable action labels | **add** | Hard-coded English "Save"/"Cancel" cannot ship in localized apps. | `save-label: string = "Save"`, `cancel-label: string = "Cancel"` |
| empty-value placeholder | **add** | An empty value today renders a zero-width preview button, an invisible click target with no accessible text. | `placeholder: string = ""`, shown in the preview when the value is empty and used as the input placeholder |
| required, and commit blocked while invalid | **add** | Renaming items is the main use case, and blank titles are the most common bad commit. Native constraints replace a `validate` function. | `required: boolean = false` and `maxlength: number`, forwarded to the inner input. Commit runs only if `checkValidity()` passes; otherwise the editor stays open and sets `aria-invalid`. |
| multiline | skip for now | It is real but secondary (descriptions), and it needs Cmd/Ctrl+Enter semantics. Add it when a consumer needs it. | Later: `multiline: boolean = false` |
| arbitrary edit content | skip | The earlier slot-based version needed a magic `data-ui-editable-trigger` attribute. Text-only is the 90% case, and `ui-popover`/`ui-dialog` cover rich edits. | — |
| activation mode, submit mode | skip | Ark-only. `actions` already selects between the two meaningful commit models. | — |

**Looma extras:**

| Attribute | Verdict | Reasoning |
|---|---|---|
| `hint` | keep | It is the declarative stand-in for Ark's `EditTrigger`: a visible cue that the text is editable. |
| `actions` | keep | Common across Ark, Quasar, and Vuetify, and the name reads well with a false default. |
| `label` default `"Edit value"` | keep the attribute, **make the default `""`** and warn | A generic name tells screen reader users nothing about what they are editing. |

**Function-valued options elsewhere:**
- Ark `finalFocusEl()`: Looma returns focus to the preview, which is a fixed behavior.
- Quasar `validate(value)`: `required`/`maxlength` + `checkValidity()`.
- Ark `translations` object: `save-label` and `cancel-label` attributes.

---

## Sources (official docs and repos)

**React Aria:**
- https://react-aria.adobe.com/TextField
- https://react-aria.adobe.com/Checkbox
- https://react-aria.adobe.com/RadioGroup

**Radix:**
- https://www.radix-ui.com/themes/docs/components/text-field
- https://www.radix-ui.com/themes/docs/components/checkbox
- https://www.radix-ui.com/primitives/docs/components/radio-group
- https://www.radix-ui.com/primitives/docs/components/form (not fetched; `match` from memory, u)

**Headless UI:**
- https://headlessui.com/react/input
- https://headlessui.com/react/radio-group

**Material UI:**
- https://mui.com/material-ui/api/text-field/
- https://mui.com/material-ui/api/form-control-label/

**Chakra and Ark:**
- https://www.chakra-ui.com/docs/components/input
- https://www.chakra-ui.com/docs/components/field
- https://www.chakra-ui.com/docs/components/native-select
- https://www.chakra-ui.com/docs/components/editable
- https://ark-ui.com/docs/components/editable
- https://ark-ui.com/docs/components/checkbox
- https://ark-ui.com/docs/components/radio-group

**Vuetify (source):**
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/components/VTextField/VTextField.tsx
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/components/VField/VField.tsx
- https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/components/VTextarea/VTextarea.tsx

**PrimeVue:**
- https://primevue.dev/inputtext/
- https://primevue.dev/textarea/
- https://primevue.dev/inplace/

**Quasar:**
- https://quasar.dev/vue-components/input
- https://quasar.dev/vue-components/toggle
- https://quasar.dev/vue-components/popup-edit (not fetched, u)

**Web Awesome:**
- https://webawesome.com/docs/components/input
- https://webawesome.com/docs/components/textarea
- https://webawesome.com/docs/components/select
- https://webawesome.com/docs/components/checkbox
- https://webawesome.com/docs/components/radio-group
- https://webawesome.com/docs/components/switch

**Spectrum Web Components:**
- https://opensource.adobe.com/spectrum-web-components/components/textfield/
- https://opensource.adobe.com/spectrum-web-components/components/switch/

**WAI-ARIA APG:**
- https://www.w3.org/WAI/ARIA/apg/patterns/switch/
- https://www.w3.org/WAI/ARIA/apg/patterns/radio/ (not fetched; all-four-arrows behavior from memory, but well established)
