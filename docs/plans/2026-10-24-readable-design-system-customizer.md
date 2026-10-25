---
title: Readable design system customizer - Plan
type: feat
date: 2026-10-24
artifact_contract: ce-unified-plan/v1
product_contract_source: user-directed-customizer-followup
execution: code
---

# Readable design system customizer - Plan

## Goal Capsule

People can weave a coherent, readable design system in the documentation, keep it while browsing, and use the same theme in their own repository.

Means: shared semantic recipes, reusable Looma editing controls, and the existing package-owned MarkupKit documentation generator (KTD1–KTD5).

The executor owns implementation, local verification, review, PR, merge, automatic release, and public verification. User requirements govern product behavior; repository contracts govern component ownership and delivery. Completion requires the Definition of Done below.

## Product Contract

### Summary

Make customization persistent and useful throughout the documentation. Add coordinated palette and material editing, bounded value controls, representative component cards, and coherent starting themes. The public documentation and package documentation use the same generator and controls.

### Problem Frame

Preview themes currently disappear on navigation. The customizer omits search and rich value editing, and syntax validation permits unreadable combinations. Individual material values also leave too much work to the person creating a theme.

### Requirements

#### Documentation and persistence

- R1. Apply the current theme to documentation and example cards, restoring it before the initial render and retaining it across navigation and reload until explicit reset.
- R2. Provide component/example filtering and working links from cards to full component documentation.
- R3. Keep repository writes explicit; offer downloadable portable CSS publicly and repository saving when run locally, using the same recipe generator.
- R4. Reuse the existing documentation component cards and discovery categories, including consumer-supplied components, with Fellowship office example content.

#### Coherent customization

- R5. Offer Bookish and compact Wiki starting themes; remove the superseded Library name without a compatibility alias.
- R6. Enforce readable text, essential outlines, focus and state differentiation in generated values across typing, dragging, recipe import, preview, save and export.
- R7. Edit a coordinated limited palette and surface range, retaining related hues and deriving role colors rather than requiring every color individually.
- R8. Expose shared size, spacing and typography families, including eyebrow, heading, body, label and supporting text; controls with the same size use the same box height.
- R9. Provide reusable accessible sliders, number/unit editing and draggable cubic Bézier editing with exact values and keyboard alternatives.
- R10. Keep appearance and tone independent, demonstrate solid neutral, and provide bounded convenience presets without multiplying combined variant names.
- R11. Expose glassiness and surface separation as semantic controls governing translucency, blur, saturation, edge treatment and the relationship between background and content material.
- R12. Derive separation treatment from popup role and rendered size, so one shared setting produces appropriate tooltips, menus, popovers and dialogs without per-popup tuning.
- R13. Preserve component-owned layout and alignment; customization uses supported semantic properties rather than application selectors targeting component internals.

#### Rendered migration parity and site theming

- R14. Checkpoint the in-progress work, check out the last pre-MarkupKit documentation revision separately, and capture its actual rendered appearance before changing the replacement shell.
- R15. Capture screenshots and computed styles across the prior site's UI, navigation and component examples, including applicable hover, keyboard focus, pressed, selected, expanded and disabled states, desktop, intermediate and mobile layouts, and light/dark themes.
- R16. Restore the Markupress implementation and match the captured baseline's visual hierarchy, typography, colors, spacing, sidebar structure, navigation affordances and interaction states; record intentional content differences separately from styling regressions.
- R17. Give Markupress a natural, pleasing default theme distinct from Looma's default, and apply the Looma documentation theme consistently across the complete Looma site.
- R18. Build side navigation from Looma components or use Looma's public custom properties and design-system contracts for its layout and all interaction states; customization must reach the shell as well as the example cards.
- R19. Always generate a coordinated light/dark pair for every theme: the Markupress default, Looma default, Bookish, Wiki and every customization. Preview and verify both modes, even when a consumer deploys only one, and explain how to use light only, dark only, automatic system selection or an explicit switch.
- R20. Support DOM-scoped light/dark boundaries, including the opposite mode inside a page and boundaries nested within boundaries; all descendant semantic roles and component states follow the closest boundary without changing ancestors or siblings.

R14–R20 are explicit user-directed requirements. The stated capture-before-restoration sequence governs implementation ordering. A functional migration check alone cannot establish rendered parity.

### Acceptance Examples

- AE1 (R1–R3). Choose Bookish, filter for buttons, open full Button documentation and reload: the theme remains. Reset restores the repository baseline. Downloaded CSS gives a separate consumer the same appearance.
- AE2 (R6–R9). Enter a pale foreground, extreme density or tight typography through any editor or import: reject an invalid recipe or derive readable role output consistently, with an understandable explanation.
- AE3 (R11–R12). Increase surface separation once: a tooltip remains compact, a menu gains a modest boundary, and a large dialog gains a stronger outer material around readable content. Changing dialog size adjusts the treatment smoothly within bounds.
- AE4 (R6, R11). Glass panels over both light and dark imagery retain readable content. Disabling backdrop filters and requesting reduced transparency yield usable opaque surfaces.
- AE5 (R14–R18). Compare the previous and replacement component-reference pages at the same viewport and theme: navigation groups, active entry, hover, keyboard focus, pressed entry, typography and component cards have captured screenshots and computed-style records. A changed theme updates both navigation and component content coherently.
- AE6 (R19). Export any customized theme: both light and dark role sets are present and readable. Switching mode preserves its identity and geometry across the shell and cards; choosing a fixed mode disables automatic switching without deleting the other mode from the export.
- AE7 (R20). Place a dark panel in a light page with a light subsection: text, fields, buttons, focus, selection and floating surfaces follow the nearest declared mode. Changing the page mode leaves explicitly scoped sections unchanged. Siblings retain their own inherited mode.

## Planning Contract

- KTD1. Keep browser state in a base-scoped recipe session shared by the early head bootstrap and component modules; store semantic inputs, never injected CSS. Give the active root theme enough selector specificity to survive later baseline styles without `!important` (R1, R13).
- KTD2. Keep validation and derivation in the shared theme module. Separate input seeds from generated accessible roles, report corrections, and test all role/surface pairs. Numeric design bounds are adjustable engineering choices, not claims that WCAG prescribes default typography (R6–R8).
- KTD3. Add public semantic seeds for glassiness and surface separation. Derive a bounded material profile with private component-role coefficients and actual popup-size scaling. The role defines purpose; size refines treatment within that role. Prefer CSS size-aware derivation where supported and a shared observer only where required. Content remains on a contrast-safe plane, with opaque fallbacks. Translucency and edge-light remain shared semantic inputs (R11–R13).
- KTD4. Build value editors as package components using established HTMLNext contracts, metadata, examples, adapters and source ownership. Arithmetic evaluates on entry and displays the resulting value, as the user selected. Use a restricted unit-aware parser; never execute expressions as code. Parser design and unit compatibility rules are engineering choices (R9).
- KTD5. Retain existing independent button variant/tone and text APIs, adding missing bounded presets and role coverage through their owning components. Use public shared seeds for Bookish and Wiki; include no downstream private source or assets (R5, R8, R10).
- KTD6. Use the parent of the documentation migration commit as the rendered reference, with dependencies reused in a detached scratch checkout. Record source revision, route, viewport, theme, state, selector, screenshot path and computed-style values in a machine-readable capture inventory. Restore the current checkout only after this inventory is complete; do not infer parity from source CSS or successful navigation (R14–R16).
- KTD7. Keep the shared Markupress shell's component behavior and theme inputs reusable. Put Looma's site identity in a site-wide semantic theme rather than hardcoded sidebar-only paint. Prefer existing Looma navigation primitives; any MarkupKit navigation renderer must consume public Looma semantics and own its own internal styles (R17–R18).
- KTD8. A theme recipe describes one identity with two resolved color-mode palettes. Share geometry, typography and motion across modes, derive both readable palettes in the canonical generator, and emit explicit mode selectors plus a system-preference default. Keep mode selection separate from theme selection; remove superseded pre-1.0 API names without aliases (R19).
- KTD9. Use the existing public `data-theme="light"` / `data-theme="dark"` DOM boundary convention, with inherited `color-scheme` and semantic roles recomputed at each boundary. Avoid root-only mode rules and ancestor selector specificity that overrides a nearer boundary. Preserve the originating boundary when rendering any floating surface that changes DOM placement (R20).

The observed default Button is outline; its variants card already contains solid examples. `ui-text` already supports eyebrow. Extend and explain these APIs rather than duplicating them. Current theme sessions store correctly but their early style loses to later baseline CSS; moving that style to the end confirms the cascade cause.

## Implementation Units

### U0. Capture and restore rendered documentation parity

Requirements: R14–R20. Files: Markupress shell/theme owners, Looma package documentation integration, public site theme configuration, and rendered comparison tests. First preserve the current work as a local checkpoint. Build and serve the pre-migration revision in a detached scratch checkout, capture the complete route/component/state inventory required by R15, and retain a browsable screenshot/style evidence index. Then restore the Markupress implementation, correct shared shell and semantic theme integration under KTD7, and compare at identical viewports and states. This unit precedes further feature implementation.

### U1. Persistent documentation and discovery

Requirements: R1–R4, R13. Files: `packages/looma/tooling/docs/{theme-session.mjs,site.mjs,customizer.js,customizer-render.mjs,card.js}`, documentation browser tests. Complete KTD1 and filtering, verify initial restoration, navigation, reset, unavailable storage, public download and explicit local save.

### U2. Bounded palette, geometry and materials

Requirements: R5–R8, R11–R13, R19–R20. Files: `packages/looma/tooling/docs/theme.mjs`, token sources, floating component sources and theme tests. Implement KTD2–KTD3 and KTD8–KTD9, paired modes and Bookish/Wiki. Test seed extremes, both resolved mode palettes, nested mode boundaries, role contrasts, glass compositing/fallbacks and popup role/size relationships.

### U3. Reusable editing controls

Requirements: R7, R9, R13. Files: owning components, generated API and adapters, examples, release classification, style source allowlist, customizer renderer/controller. Implement KTD4. Test pointer, touch, keyboard, exact entry, range constraints, disabled state, focus, unit conversion and invalid input recovery.

### U4. Semantics and representative cards

Requirements: R4, R8, R10–R12. Files: Button/IconButton/Text owners, docs examples/catalog and customizer card selection. Implement KTD5; show appearance/tone combinations, typography and multiple floating material roles in real documentation cards.

### U5. Integration and delivery

Requirements: R1–R20. Run the Verification Contract, simplify, conduct one bounded native review, resolve actionable findings, create and attach a PR, watch CI, merge and verify the automatic release and live documentation.

## Verification Contract

Use Node 24 and the repository package manager. Run shared-theme and theme-session node tests as units land, then package tests/typecheck/style ownership/API generation and package build. Run `apps/docs-next/tests/design-system.spec.js` with one foreground Playwright runner and `--workers=1`; broaden to affected component browser suites after component changes. Inspect desktop/mobile screenshots and keyboard interactions. Run package release verification before delivery. Keep existing CI budget contracts; record performance evidence before changing workflow limits.

Test navigation/reload in a fresh browser context with stored recipe, reset, blocked storage, cross-tab changes, local save conflict, import rejection and standalone CSS consumer. Exercise light/dark palettes and semantic role pairs, numeric boundaries, transparent backgrounds, disabled backdrop filters and accessibility media preferences. Verify popup sizing at small and large content dimensions without consumer alignment overrides.

For migration parity, inventory every prior documentation component/example and shell region. Record successful captures and explicit missing or inapplicable states; never count unvisited examples as covered. Capture actual browser computed styles, box geometry, font loading, pseudo-elements, transitions and state changes alongside screenshots. Compare baseline and replacement at matching viewport, color mode and interaction state, with a per-region difference report. Include the sidebar's group toggles, active item, expanded/collapsed groups, keyboard focus and mobile drawer. Capture the production page after deployment and compare it with the qualified local result.

Include a 900px intermediate viewport: the prior documentation collapses navigation around 996px, whereas the migrated shell currently waits until 768px. Compare header wrapping, drawer behavior and the usable content width in that interval rather than qualifying desktop and narrow mobile alone.

Run contrast, state and rendered checks against both resolved color modes of every shipped starting theme, plus customized and imported recipes. Verify fixed-light, fixed-dark, system preference and explicit user switching, including persistence and exported CSS in an independent consumer. Verify Markupress's own default pair independently from the Looma site's pair.

Test dark inside light, light inside dark, and recursively nested boundaries. Inspect actual computed roles and states for descendant controls, menus, dialogs and tooltips; verify ancestors and siblings do not change. Repeat after switching the page's mode and after exporting to an independent consumer.

## Required migration and theme evidence

These are required deliverables for R14–R20, not optional follow-up polish. Earlier customization requirements R1–R13 remain in scope.

- **Capture first.** Preserve current work, serve the previous documentation revision, and inventory every shell region and component example before restoring Markupress. Retain screenshots, actual computed styles and geometry, fonts, pseudo-elements, hover, focus, pressed, selected, expanded and disabled states.
- **Match the rendered result.** Compare the restored Markupress site against that inventory at desktop, intermediate and mobile widths in both modes. Explain every remaining difference; a successful build or navigation check does not establish visual parity.
- **Theme the whole site.** Keep the Markupress baseline visually distinct and pleasing. Apply the Looma site theme to header, sidebar, navigation groups, menus, search, content, component cards and their interaction states. Navigation must use Looma components or public Looma design-system properties.
- **Always deliver both modes.** Generate and verify a coordinated light/dark pair for Markupress, Looma, Bookish, Wiki and every customized or imported recipe. Explain fixed light, fixed dark, system preference and explicit switching; exporting a single preferred mode must still retain the pair.
- **Respect local boundaries.** Verify dark within light, light within dark, and further nested boundaries. Descendant components, example frames and floating surfaces follow their originating nearest boundary; ancestors and siblings remain independent.
- **Qualify the public result.** After release, capture the deployed documentation and compare its shell, controls, cards and mode behavior with the qualified local result. Keep the screenshots and per-region style comparison as delivery evidence.

## Definition of Done

Every R-ID has passing automated checks or recorded visual/interaction evidence appropriate to its behavior. U0 has a complete capture inventory and inspected before/after evidence with no unexplained shell or state styling regressions. U1–U4 are implemented with documentation and updated callers; superseded pre-1.0 API names are removed without compatibility aliases; U5 has a merged PR, a successful automatic release, and verified public flows. Generated package assets include new components and controls. Remove abandoned experiments from the diff and leave unrelated work untouched. Do not claim completion from source inspection alone.

## Next packaging phase: HTML Next authoring and distribution

Approved direction (2026-10-24): Looma will distribute HTML Next components only. Teach consumers to build their own design systems, component definitions, descriptions and documentation examples in HTML Next. Vue applications will use the HTML Next Vite plugin or converter rather than a Vue distribution maintained by Looma.

This is a subsequent packaging migration, not a claim about the currently published exports. Inventory existing Vue entrypoints and editor dependencies, document the consumer conversion setup, remove distributed Vue outputs and update package/export tests together. Do not add parallel authored Vue implementations during the transition.
