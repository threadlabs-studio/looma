---
title: Looma Brand Mark - Plan
type: feat
date: 2026-09-20
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Looma Brand Mark - Plan

## Goal Capsule

- **Objective:** Looma's published documentation uses the approved mark as a crisp, recognizable symbol for both weaving and layout.
- **Means:** Add the approved five-color SVG and use it for the documentation navbar and favicon (KTD1, KTD2).
- **Authority:** The settled geometry and palette in this plan override earlier basket-shaped and two-color explorations.
- **Execution profile:** Small documentation asset and configuration change with build and browser verification.
- **Stop condition:** Stop if the approved geometry cannot remain genuinely transparent or if adopting it requires unrelated documentation redesign work.
- **Finish and ship:** Implement, verify, review, commit, push, and open a pull request against `main`.

## Product Contract

### Summary

Add the approved tighter Looma grid mark to the documentation site without changing the surrounding product copy or page design.

### Problem Frame

The current `main` branch has no repo-owned Looma mark in its documentation navbar, while the earlier mark is too thin and loose at the site's 34-pixel display size.

### Key Decisions

- **Keep the original five-color grid identity** (session-settled: user-directed — chosen over basket-shaped and reduced-color marks: the grid communicates Looma's layout semantics while the crossings retain the weaving idea). Governs R1, R2.
- **Use true transparent geometry** (session-settled: user-directed — chosen over white strokes and masks: the mark must work on light, dark, and colored backgrounds). Governs R3.

### Requirements

- R1. The mark uses the original violet, teal, rose, ochre, and blue Looma palette.
- R2. The mark uses 32-unit strands on an 88-unit grid, with 4-unit crossing clearances and the approved lower-left woven turn.
- R3. The lower-left turn is formed from explicit vector contours derived from the strand radius, half-stroke, and gap; the SVG contains no background-colored paint or mask.
- R4. The documentation navbar and favicon load the same repo-owned SVG asset.
- R5. Existing documentation content, navigation labels, and page styling remain unchanged.

### Acceptance Examples

- AE1. Covers R3. Given the SVG is displayed on a non-white background, when the lower-left turn is rendered, then the background shows through the 4-unit clearance continuously.
- AE2. Covers R4. Given the documentation site is built, when a page loads, then the navbar logo and favicon both resolve to `img/looma-mark.svg`.

### Scope Boundaries

- In scope: the SVG asset, Docusaurus logo/favicon configuration, and focused browser coverage.
- Outside scope: the broader documentation redesign currently living on another feature branch, wordmark changes, package branding, and generated raster exports.

## Planning Contract

### Key Technical Decisions

- KTD1. **Encode the approved mark as a transparent 512-unit SVG.** (session-settled: user-directed — chosen over white-stroke or mask-based cutouts: background independence is required.) The canonical source for this run is `.context/looma-weave-v21-tight-grid.svg`; U1 makes the shipped asset canonical. The palette is violet `#7658D6`, teal `#2CA79D`, rose `#E46F78`, ochre `#E4A13A`, and blue `#507DDF`. The turn uses `W = 32`, `H = 16`, `G = 4`, and `R = 20`; its visible outer radius is `R + H = 36`, and its clearance radius is `R + H + G = 40`. Governs R1-R3.
- KTD2. **Integrate through Docusaurus theme configuration.** Add one static asset and reference it from both `favicon` and `themeConfig.navbar.logo`, preserving the existing navbar title and links. Governs R4, R5.
- KTD3. **Verify the public contract in the existing docs browser suite.** Assert the rendered navbar image and favicon paths, then retain the existing accessibility and narrow-viewport checks. Governs R4, R5.

### Assumptions

- The documentation site remains rooted at `/looma/`; Docusaurus resolves the configured relative asset path under that base URL.
- The current branch is based on `origin/main`; the unrelated `feature/docs-component-showcase` work is evidence for integration shape only and is not copied wholesale.

## Implementation Units

### U1. Add the approved vector asset

- **Goal:** Store the final mark as a portable, transparent SVG.
- **Requirements:** R1-R3; AE1; KTD1.
- **Dependencies:** None.
- **Files:** Create `apps/docs/static/img/looma-mark.svg`.
- **Approach:** Copy the complete geometry, strand-to-color mapping, endpoints, and crossing order from `.context/looma-weave-v21-tight-grid.svg` into the shipped asset. Represent the lower-left under-strand as a closed fill path whose circular boundary is the 40-unit clearance offset from the 36-unit visible outer contour. Keep every negative-space region transparent.
- **Patterns to follow:** Docusaurus static assets under `apps/docs/static/`; the SVG integration already proven on `feature/docs-component-showcase` without importing that branch's unrelated changes.
- **Test scenarios:**
  - Covers AE1. Render the asset on light, dark, and colored backgrounds; the curved clearance shows each background rather than a painted substitute.
  - Render at 34 and 16 CSS pixels; the grid remains legible and the lower-left turn does not collapse into a filled notch.
- **Verification:** XML parsing succeeds, the SVG contains no mask or background-colored element, and raster previews match the approved mark.

### U2. Publish the mark in the documentation shell

- **Goal:** Use the same mark in the navbar and browser favicon.
- **Requirements:** R4, R5; AE2; KTD2, KTD3.
- **Dependencies:** U1.
- **Files:** Modify `apps/docs/docusaurus.config.ts` and `apps/docs/tests/release-docs.spec.ts`.
- **Approach:** Point the favicon at the SVG and add Docusaurus navbar logo configuration at 34 by 34 pixels. Extend the existing Playwright suite with a focused shell-level assertion without changing content or navigation behavior.
- **Patterns to follow:** Existing Docusaurus configuration and `apps/docs/tests/release-docs.spec.ts` browser assertions.
- **Test scenarios:**
  - Covers AE2. Load the docs home page and assert the visible navbar logo resolves to `/looma/img/looma-mark.svg`.
  - Covers AE2. Inspect the favicon link and assert it resolves to the same asset.
  - Re-run the existing 320-pixel accessibility/reflow coverage with the logo present.
- **Verification:** The docs build succeeds and the targeted Playwright suite passes in preview mode.

## Verification Contract

- `xmllint --noout apps/docs/static/img/looma-mark.svg` validates the asset structure.
- `pnpm --filter @threadlabs/looma-docs build` proves Docusaurus resolves the asset and configuration.
- `pnpm --filter @threadlabs/looma-docs test:browser` proves the navbar, favicon, accessibility, and narrow-layout contracts.
- Rendered 512-, 34-, and 16-pixel previews on light, dark, and colored backgrounds provide visual confirmation of the transparent turn.

## Definition of Done

- U1 and U2 satisfy their requirements and test scenarios.
- The final SVG uses the approved palette and radius-derived transparent geometry without masks or background paint.
- The documentation navbar and favicon use the same asset.
- The docs build and browser suite pass.
- The branch contains no unrelated feature-branch changes or abandoned design experiments.
- The reviewed commit is pushed and represented by a pull request targeting `main`.
