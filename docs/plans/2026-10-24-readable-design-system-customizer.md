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

Means: shared semantic recipes, reusable Looma editing controls, and the existing package-owned HTMLKit documentation generator (KTD1–KTD5).

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

- R5. Offer Bookish and compact Wiki starting themes, preserving old Library recipes and existing supported public imports.
- R6. Enforce readable text, essential outlines, focus and state differentiation in generated values across typing, dragging, recipe import, preview, save and export.
- R7. Edit a coordinated limited palette and surface range, retaining related hues and deriving role colors rather than requiring every color individually.
- R8. Expose shared size, spacing and typography families, including eyebrow, heading, body, label and supporting text; controls with the same size use the same box height.
- R9. Provide reusable accessible sliders, number/unit editing and draggable cubic Bézier editing with exact values and keyboard alternatives.
- R10. Keep appearance and tone independent, demonstrate solid neutral, and provide bounded convenience presets without multiplying combined variant names.
- R11. Expose glassiness and surface separation as semantic controls governing translucency, blur, saturation, edge treatment and the relationship between background and content material.
- R12. Derive separation treatment from popup role and rendered size, so one shared setting produces appropriate tooltips, menus, popovers and dialogs without per-popup tuning.
- R13. Preserve component-owned layout and alignment; customization uses supported semantic properties rather than application selectors targeting component internals.

### Acceptance Examples

- AE1 (R1–R3). Choose Bookish, filter for buttons, open full Button documentation and reload: the theme remains. Reset restores the repository baseline. Downloaded CSS gives a separate consumer the same appearance.
- AE2 (R6–R9). Enter a pale foreground, extreme density or tight typography through any editor or import: reject an invalid recipe or derive readable role output consistently, with an understandable explanation.
- AE3 (R11–R12). Increase surface separation once: a tooltip remains compact, a menu gains a modest boundary, and a large dialog gains a stronger outer material around readable content. Changing dialog size adjusts the treatment smoothly within bounds.
- AE4 (R6, R11). Glass panels over both light and dark imagery retain readable content. Disabling backdrop filters and requesting reduced transparency yield usable opaque surfaces.

## Planning Contract

- KTD1. Keep browser state in a base-scoped recipe session shared by the early head bootstrap and component modules; store semantic inputs, never injected CSS. Give the active root theme enough selector specificity to survive later baseline styles without `!important` (R1, R13).
- KTD2. Keep validation and derivation in the shared theme module. Separate input seeds from generated accessible roles, report corrections, and test all role/surface pairs. Numeric design bounds are adjustable engineering choices, not claims that WCAG prescribes default typography (R6–R8).
- KTD3. Add public semantic seeds for glassiness and surface separation. Derive a bounded material profile with private component-role coefficients and actual popup-size scaling. The role defines purpose; size refines treatment within that role. Prefer CSS size-aware derivation where supported and a shared observer only where required. Content remains on a contrast-safe plane, with opaque fallbacks. Existing translucency and edge-light recipes remain compatible (R11–R13).
- KTD4. Build value editors as package components using established HTMLNext contracts, metadata, examples, adapters and source ownership. Arithmetic, if offered, evaluates on commit through a restricted unit-aware parser; never execute expressions as code. This is an implementation choice, not a user-selected expression-storage policy (R9).
- KTD5. Retain existing independent button variant/tone and text APIs, adding missing bounded presets and role coverage through their owning components. Use public shared seeds for Bookish and Wiki; include no downstream private source or assets (R5, R8, R10).

The observed default Button is outline; its variants card already contains solid examples. `ui-text` already supports eyebrow. Extend and explain these APIs rather than duplicating them. Current theme sessions store correctly but their early style loses to later baseline CSS; moving that style to the end confirms the cascade cause.

## Implementation Units

### U1. Persistent documentation and discovery

Requirements: R1–R4, R13. Files: `packages/looma/tooling/docs/{theme-session.mjs,site.mjs,customizer.js,customizer-render.mjs,card.js}`, documentation browser tests. Complete KTD1 and filtering, verify initial restoration, navigation, reset, unavailable storage, public download and explicit local save.

### U2. Bounded palette, geometry and materials

Requirements: R5–R8, R11–R13. Files: `packages/looma/tooling/docs/theme.mjs`, token sources, floating component sources and theme tests. Implement KTD2–KTD3, compatibility and Bookish/Wiki. Test seed extremes, role contrasts, glass compositing/fallbacks and popup role/size relationships.

### U3. Reusable editing controls

Requirements: R7, R9, R13. Files: owning components, generated API and adapters, examples, release classification, style source allowlist, customizer renderer/controller. Implement KTD4. Test pointer, touch, keyboard, exact entry, range constraints, disabled state, focus, unit conversion and invalid input recovery.

### U4. Semantics and representative cards

Requirements: R4, R8, R10–R12. Files: Button/IconButton/Text owners, docs examples/catalog and customizer card selection. Implement KTD5; show appearance/tone combinations, typography and multiple floating material roles in real documentation cards.

### U5. Integration and delivery

Requirements: R1–R13. Run the Verification Contract, simplify, conduct one bounded native review, resolve actionable findings, create and attach a PR, watch CI, merge and verify the automatic release and live documentation.

## Verification Contract

Use Node 24 and the repository package manager. Run shared-theme and theme-session node tests as units land, then package tests/typecheck/style ownership/API generation and package build. Run `apps/docs-next/tests/design-system.spec.js` with one foreground Playwright runner and `--workers=1`; broaden to affected component browser suites after component changes. Inspect desktop/mobile screenshots and keyboard interactions. Run package release verification before delivery. Keep existing CI budget contracts; record performance evidence before changing workflow limits.

Test navigation/reload in a fresh browser context with stored recipe, reset, blocked storage, cross-tab changes, local save conflict, import rejection and standalone CSS consumer. Exercise light/dark palettes and semantic role pairs, numeric boundaries, transparent backgrounds, disabled backdrop filters and accessibility media preferences. Verify popup sizing at small and large content dimensions without consumer alignment overrides.

## Definition of Done

Every R-ID has passing automated checks or recorded visual/interaction evidence appropriate to its behavior. U1–U4 are implemented with documentation and compatibility; U5 has a merged PR, a successful automatic release, and verified public flows. Generated package assets include new components and controls. Remove abandoned experiments from the diff and leave unrelated work untouched. Do not claim completion from source inspection alone.
