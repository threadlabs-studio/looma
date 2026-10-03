# Shared line weights and selection geometry

A theme must control line weights and selected rows through a small semantic contract. Components currently hard-code 1px borders, 2px focus rings, and 2–4px accent edges. Navigation also combines a rounded surface with an inset edge marker; choice options repeat that mismatch. Correct the shared library rather than requiring consumer repairs.

## Contract

- Global dimensions: `--ui-border-width` (1px), `--ui-accent-line-width` (derived from border width), and `--ui-focus-width` (2px). Ordinary edges and dividers use border width; state and tone accent edges use accent-line width; keyboard focus uses focus width. Existing instance hooks take precedence where supported.
- Selected surface rows share `--ui-selection-surface` (a quiet accent tint), `--ui-selection-text` (readable accent text), and `--ui-selection-radius` (derived from the existing medium radius). Selection does not change font weight. Explicit icon colors survive inherited text.
- Nav Item has two deliberate treatments through a `variant` prop: surface (default, rounded and without a stripe) and line (square with a continuous logical start edge). The current state remains aria-current and link/button behavior is unchanged. The marker's existing hooks configure line treatment; no API is removed.
- Tree, current List Item, selected Search Result Row and choice options reuse the surface recipe. Hover, focus, checked menu/form controls, and drag targets retain their distinct semantics. Menus reuse row corner semantics but a checkmark remains how they identify a chosen option.
- Apply line dimensions throughout authored component CSS, shared choice CSS and the Vue editor surface. A glyph's constructed strokes, zero borders, circular shapes, shadow lighting, and 1px clipping offsets are geometry, not surface borders. Document such exceptions; do not replace numbers by superficial text substitution.
- Consumer themes choose brand seeds. Routed wrappers contain no presentation CSS. Layout variants such as Disclosure fill remain in the shared library.

## Props and tokens

Use props for discrete, reusable component treatments and behavior; use inherited semantic tokens for cross-component dimensions and colors. Component hooks are the narrow final override, not the normal way to theme a product. Keep the existing CSS source authoritative; introducing a duplicate JSON token source or generator is unnecessary for this fix. The Design Tokens Community Group format's typed values and aliases inform the contract, but its interchange format does not prescribe a particular selection design.

## Verification

Update the HTML/Vue Nav Item tests before implementation to reject mixed geometry and prove both treatments, RTL, forced colors, and existing keyboard/link behavior. Add cross-component tests with intentionally different global widths and radius/color values, including representative fields, actions, dividers, overlays, accent edges and editor content. Check all authored surface border/focus declarations use semantic dimensions. Run full tooling/package tests, typecheck, lint and docs build. Qualify the published package in the real consumer at desktop and 375px.

## Default change justification

Every current Nav Item previously displayed an inset 3px stripe against a fully rounded surface. That combines two incompatible edge treatments and cannot be corrected through a color token. Surface selection is the appropriate default alongside other selected row components. Users who intentionally need line navigation choose `variant="line"`; its straight full-height edge is 1px by default and uses the global accent-line token. Selected labels now keep their resting weight. These are deliberate visual default changes, without removing current states, events, or hooks.

## References

- [Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/): typed values and aliases.
- [Carbon token roles](https://carbondesignsystem.com/elements/color/tokens/): semantic naming by usage rather than component-specific palette values.
- Existing `docs/visual-system.md`, token guide and component-system contract.

## Integration with the style-source boundary

The concurrently added style-source guard freezes editor CSS. This explicitly scoped semantic-dimension migration replaces existing border/focus values in that frozen source; it adds no selector, property, styled source, or inline exception. Update only those existing rule fingerprints after verifying identical selectors and declaration names. The guard remains exact and rejects subsequent edits. Removed link-control CSS stays removed, using the newly composed primitives. Remove the new inline-layout example rather than approving another styling exception; fill behavior retains HTML/Vue integration tests and real consumer qualification.
