# Date and time controls

Looma's date/time family shares canonical string values, Temporal arithmetic,
declarative availability and independently editable range endpoints. Date Field
owns typed entry; Calendar owns grid navigation; pickers compose those behaviors
with the existing overlay primitives.

The family scope, easy typing, month/year navigation, restrictions, theming and
light/dark verification are requested requirements. The endpoint crossing rules
below are explicitly selected requirements. The component names, numeric editing
grammar and defaults are implementation decisions; this document does not claim
independent approval of those choices or completed release qualification.

## Values and entry

Calendar always selects and emits a civil date as `YYYY-MM-DD`. Date Field and
Date Picker also default to `type="date"`; their form values and events contain
only that date. Date Range Picker endpoints use the same date-only contract.
There is no implicit midnight, UTC conversion, or device timezone. Locale and
display formatting never change this value shape. This follows Temporal's
[PlainDate model](https://tc39.es/proposal-temporal/docs/plaindate.html).

Choose a different `type` explicitly when the application needs more information:

| Kind | Binding | Meaning |
| --- | --- | --- |
| `date` | `2026-10-30` | ISO calendar date, without a zone |
| `time` | `14:30[:45.123]` | Wall-clock time, without a date or zone |
| `datetime-local` | `2026-10-30T14:30` | Local date/time, without a zone |
| `instant` | `2026-10-30T18:30:00Z` | Exact time, edited in an explicit `time-zone` |
| `zoned` | `2026-10-30T14:30-04:00[America/New_York]` | Date/time retaining zone rules |

Use `date` for birthdays, due dates and all-day ranges. Use `datetime-local` for
a wall-clock value whose zone is deliberately unspecified. Use `zoned` when the
region is part of the saved data, such as a scheduled appointment in a particular
city: its one canonical string retains the date, time, offset and zone identifier.
Use `instant` when the saved value is a point on the UTC timeline; its string
does not retain a region. An offset such as `-07:00` alone does not carry a
region's daylight-saving rules. These distinctions follow
[Instant](https://tc39.es/proposal-temporal/docs/instant.html) and
[ZonedDateTime](https://tc39.es/proposal-temporal/docs/zoneddatetime.html).

`type` determines the binding's meaning and shape. Setting `time-zone` or Intl
display options alone never promotes a date into a timestamp. A timestamp supplied
to a date-only binding is rejected rather than silently truncated or converted.
Do not infer the type from a value: an empty field must retain the same contract
as a filled one, and a replacement value must not silently change the form API.

For `instant`, `time-zone` is the explicit zone used to display and edit the UTC
value. For `zoned`, the value's bracketed zone is authoritative saved data;
omitting `time-zone` edits in that zone. An explicit `time-zone` may project it
into a different editing zone while preserving the saved zone. Creating an empty
zoned value requires `time-zone` because there is no bound zone yet. Changing
only the editing zone preserves the accepted value and does not emit an edit.
Applications that change the saved zone replace the canonical zoned value.
Pasting a complete zoned value is likewise an explicit replacement; numeric
localized typing edits the existing value in its configured editing zone.

A date plus a zone still does not specify a clock time. For an all-day date
associated with a region, applications can retain the date and region separately;
Calendar does not invent midnight to turn that pair into an instant.

Calendar remains date-only inside these compositions. Date Picker combines its
chosen date with the editable clock and the explicitly chosen value semantics,
retaining clock precision and resolving zone rules. It does not export a
timestamp merely because its containing application knows a timezone.

`value-format="space"` serializes local date-times with a space instead of T.
Nonzero seconds and fractions are preserved. A plain date never becomes midnight
UTC. The internal Temporal fallback is scoped to modules that use date/time
behavior and does not install or replace global objects.

Civil date entry uses four-digit years 0001–9999. Zero years and leap-second
wall-clock input are rejected, consistent with the native date/time fallback's
[HTML value rules](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#dates-and-times).
Exact ISO timestamps retain Temporal's own timestamp parsing semantics.

`value` seeds the native-like live state and replaces it when changed externally.
A form reset restores the last external `value`, matching Input and Number Input. Valid typing reports `input`; a successful Enter or blur commit reports
`change`. Both carry `{ value, trigger }`. Partial/invalid text stays visible and
reports `query-change` without replacing the accepted canonical value. Native
validation blocks submission of an invalid draft. `validation-change` reports
`{ invalid, message }` after commit or explicit validation.

Disconnecting and reconnecting an existing instance preserves its accepted live
value. A changed external value still replaces it, including when that replacement
arrives while disconnected. Reconnection does not report a new user edit.

`locale` defaults to `en-US` for deterministic rendering and can be set explicitly
by consumers. ISO paste always works. Numeric localized input follows that locale's
Gregorian date order, requires a four-digit year, and accepts localized digits.
Intl `display-options` can change unfocused presentation; focus restores the
numeric editing grammar. No parser guesses which of several competing locales
the author intended. Non-Gregorian calendar selection is not yet defined by this
contract.

Exact-time editing rejects daylight-saving gaps and repeated times by default.
`disambiguation` exposes Temporal's `earlier`, `later`, and `compatible` choices
for applications that intentionally choose a resolution. An ISO timestamp with
an explicit offset already identifies its instant.

## Availability

`min` and `max` are inclusive bounds in the bound value's format. Time bounds
compare times and may wrap midnight when the maximum precedes the minimum,
matching [native time inputs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/time). Exact-time bounds compare instants. Date restrictions apply to
the calendar date in the editing zone for exact values.

`allowed-dates` and `allowed-ranges` form a union. Omission means no allow-list
restriction; an explicitly empty allow set permits nothing. `disabled-dates`,
`disabled-ranges` and `disabled-weekdays` subtract from that union. Weekdays use
ISO numbering: Monday is 1 and Sunday is 7. Intervals have inclusive `start`
and `end` strings. Bounds and disabled rules always win conflicts.

The same validator serves typing, pasting, grid selection and range updates.
Changing availability does not silently replace an existing value. A now-invalid
value remains visible for correction. Applications own availability fetching and
can replace the declarative rules when new data arrives.

## Ranges

Each endpoint can be typed independently. Editing one endpoint leaves the other
fixed while the range remains ordered. A start edit past the end sets the end to
the new start. An end edit before the start sets the start to the new end. These
are explicitly selected behaviors; edits never shift both endpoints to preserve
duration. Date endpoints are inclusive.

| Existing range | Edit | Result |
| --- | --- | --- |
| October 10–15 | Start → October 12 | October 12–15 |
| October 10–15 | Start → October 5 | October 5–15 |
| October 10–15 | Start → October 20 | October 20–20 |
| October 10–15 | End → October 12 | October 10–12 |
| October 10–15 | End → October 5 | October 5–5 |

A complete range reports both endpoints together. An automatic adjustment must
still satisfy bounds and availability; impossible adjustments leave the draft
invalid. Unavailable interior dates block ranges by default; an explicit
`allow-unavailable-within-range` option permits crossing them while retaining
endpoint validation. Partial grid selection is draft state and does not erase
the previous accepted range. For a new two-click range, an earlier second click
becomes the start and the first click becomes the end. This explicitly selected
behavior is distinct from editing an existing endpoint. A completed choice updates
the fields immediately and closes the popup. Escape and light dismissal close an
unfinished selection while retaining accepted values.

Date Range Picker binds one `{ start, end }` object and submits its date-only
endpoints under `start-name` and `end-name`. Its independently labelled fields
use `start-input-id` and `end-input-id` for native label association before
JavaScript; each input also has an accessible name. On enhancement, two hidden
native inputs retain the accepted pair while the visible fields retain incomplete
or invalid drafts. A partial optional range requires its missing endpoint; an
entirely empty optional range is valid.

Each field's calendar action commits a chosen endpoint immediately.
An incomplete range starts a new two-click selection. Pointer hover and keyboard
focus preview the interval after its first click. Projected endpoint allow ranges
apply the whole-range rules through Date Field's existing validator, so typing
and grid selection agree about unavailable interiors. Popover's `trigger="manual"`
lets this composition switch its anchor between the two actions while owning
activation. The field spacing, calendar and surface remain owned by
the existing shared primitives; this composition adds no stylesheet.

## Rendering and visual ownership

Framework consumers compile the shipped definitions through the HTML Next Vite plugin. Vue Calendar and picker server preparation requires adapter alpha.79 or later; earlier adapters omit its existing module preparation integration.

Date Field composes Input and owns no stylesheet. Its authored native fallback
participates in forms before JavaScript. An already-authored text input becomes
the editor on upgrade, while a hidden native input submits the canonical value;
upgrade changes visibility rather than replacing the DOM tree.
Completed edits made in that native fallback become the initial live value on
enhancement; reset still restores the last external value. A partly entered native
date/time can contain browser-owned segments that `input.value` does not expose.
The same native input remains active and invalid until those segments become
usable, then the enhanced editor takes over. An external replacement, reset or
explicit picker choice cancels an older pending handoff. Range initialization
retains a completed endpoint while its opposite remains an incomplete draft.
The fallback uses a native date/time type when that type can retain the binding.
Sub-millisecond civil times and space-separated local date-times use a text
fallback: native time types discard that precision or normalize the separator.
This retains the authored machine value before enhancement. Availability rules
and enhanced parsing attach when JavaScript connects; servers validate submitted
values regardless of client validation.

Input's optional `segments` list gives a single native text input editable blocks.
Each editable block declares `placeholder` and a per-character Unicode `pattern`;
the placeholder length is the block's maximum length. Hint text stays in the native
placeholder attribute and is never inserted into the editable or submitted value.
Partial entry contains only entered characters and fixed separators. A fixed separator declares
`literal` instead. Focus selects the first block. Filling a block advances;
typing its separator also advances. Arrow keys select neighbouring blocks, and
Backspace clears or moves back. Adjacent blocks support authentication-code
continuation and paste. Clipboard, native replacement, composition and autofill
retain the native input. Owners validate the resulting text and canonical value.

Date Field and Time Field derive their blocks from the same Intl editing
representation used for display, including locale date order, hour cycle,
localized digits and retained fractional precision. The unfocused display can
still use a different Intl format. Complete ISO paste replaces the editing text
and is parsed without changing the binding's meaning.

Time Picker composes Time Field, Input Group, Icon Button, Popover and Select.
Typing/paste edits the field directly. The clock action opens localized hour,
minute and optional second choices. Valid choices commit immediately; Escape
and light dismissal close the picker while retaining accepted edits. Unavailable
choices are disabled, including overnight bounds. Seconds appear when the value
or bounds need them, or when `granularity="second"` is set. Existing fractions are
retained. Escape restores trigger focus; light dismissal preserves the outside
target's focus. Closed picker controls are disabled, unnamed and excluded from
form validation. The native time field remains usable before JavaScript.
Date Picker uses the same Time Picker alongside its calendar. These compositions
need no new stylesheet.

Calendar composes Stack, Cluster, Grid, Button, Icon Button, Input and Text.
Grid's explicit `fixed` option retains seven aligned weekday columns at narrow
widths, while its default remains responsive. Day and month/year choices use
Button's shared sizing and focus ring. Previous/next arrows flank the full month/year controls on one row.
Padded date cells leave room around their circular buttons. Weekday headings use
semibold secondary caption text on a padded accent band. Weekend columns use
a separate neutral wash from the theme's ink; Grid's shade-tone option owns
these two paint roles. English weekday
headings use M/T/W/Th/F/S/Su; other locales use Intl narrow labels, and every
heading retains its full accessible name. Day choices are centered circles, with ghost
hover and selection paint. Month/year labels use ghost pills. The month grid uses
localized abbreviated names, with full names in accessible labels and titles.
A selected ghost
choice is a visual state; the composite retains its own ARIA selection semantics. Directional Icon
glyphs mirror logical previous/next navigation in RTL. This composition adds no
Calendar stylesheet or styling exception.

Calendar's pure Temporal model can use HTML Next's existing selected-input module
providers. Server preparation calculates the model before rendering; browser
connection adopts its prepared input records and observes later input changes.
An executable native-renderer proof has verified this path without a language or
tooling extension. Compatible package assembly recognizes the module's existing
`prepare` and `adopt` exports for Vue, prepares during server-prefetch, and restores
typed producer inputs before hydration. It transfers read identities with a
revision covering the definition and relative module graph, preserves caller
fixtures, and removes transfer records after hydration. Ordinary controller
delivery stays separate from this preparation helper.

Owning-toolchain regressions and actual Calendar/picker tests verify ordinary Vue
SSR and retention of rendered day nodes through hydration. Native application
hosts must also prepare before rendering, adopt matching inputs before connecting,
and preserve input typed before enhancement. Release qualification must use a
compatible delivered assembler and host. Do not infer a normative specification
gap from that host integration work, populate a missing grid only after connection,
or fork generated adapters.

The server-safe Calendar model is implemented separately from rendering. It
provides stable day rows, localized weekday/month/year labels, bounds-aware
navigation choices, range/selected/today flags and one available grid tab stop.
An empty month exposes no day tab stop; the renderer must keep the grid itself
focusable. Previous/next actions and direct year entry remain available in an empty month;
month/year choice buttons with no selectable dates are disabled. This allows
traversal to later availability without presenting unavailable selection choices. The pure model receives the visible month and today's civil date. The component
producer uses `month`, then the selected value's month, then explicit `today`;
if all are empty, it samples the current UTC month. An omitted `today` produces
no today marker. Hosts transfer prepared data for consistent initial rendering.

## Qualification

Shared engine checks cover type separation, ISO and locale entry, localized
digits, precision, leap dates, whole-value bounds, allow/disable precedence,
range interiors, both crossing rules and daylight-saving gaps/overlaps.

Component checks cover native fallback and SSR imports, live edits and
external value updates, form submission/reset, invalid drafts, readonly/disabled,
keyboard editing, locale changes and dynamic availability. Picker checks must
add month/year navigation, one grid tab stop, Escape and focus restoration,
range previews and dismissal, RTL, and 375px touch layout. Inspect light and
dark rendering alongside comparable Looma controls. Passing engine checks alone
does not qualify the component family.

## Related additions

File Input composes Card, Input, List and Icon Button. Browsing and dropping
replace the selection; individual removal retains the remaining File objects.
`accept`, `multiple` and optional `max-file-size` apply to both selection paths.
Rejected selections leave accepted files intact. Native forms submit the actual
files. Applications own transport, progress, cancellation and server validation.

The Form Field validation-summary example composes Callout and linked List
items. Applications supply the errors and validation timing. After an unsuccessful
submission, render the summary, then focus its section with `tabindex="-1"`.
Each error links to the native control's ID and repeats the field's inline error;
Form Field supplies its invalid state and error description. Update both from the
same validation result. Remove the summary when no errors remain. Keep native
validation available before enhancement; if replacing it with a summary workflow,
enable `novalidate` only after that workflow is connected. A server response can
render the same composition without JavaScript. No additional visual primitive
or automatic form-wide validation policy is needed.

Stepper remains conditional on a concrete consumer workflow. None has been
identified in this work, so no stepper implementation is planned. These additions
retain their own implementation and qualification boundaries.

## Week order and weekend surface

Calendar and Date Picker use the locale's week information by default. When that
information is unavailable, they fall back to Sunday first and Saturday last.
`week-starts-on` overrides it using ISO weekdays, including `7` for Sunday, `6`
for Saturday, and `1` for Monday. Changing it changes column order and week
navigation without changing selection or canonical values. This follows the
user's clarification that a locale default takes precedence over Sunday.

Sunday and Saturday columns have a very light surface derived from the theme's
muted surface. They remain those same weekdays when the week order changes;
this visual requirement is independent of a locale's nonworking-day convention.
Grid owns reusable fixed-column shading through `shaded-columns`; Calendar
provides the indices. Buttons retain their circular ghost hover/selection paint.
The month/year controls provide the visible heading. Only the year-page range
needs an additional caption in year navigation.

Calendar popup interaction: choosing a date updates its field immediately; date-only choices close the popup. Complete valid clock edits also update their field. A range completes on the second click. Month/year navigation does not edit the value. The day, month and year panels share one measured viewport through Stack’s height API, retaining the six-week grid extent and fixed header placement. Range highlights join adjacent cells into a rounded band on each week row. Dates outside the visible month use Text’s existing muted tone and normal weight.
