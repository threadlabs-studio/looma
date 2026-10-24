---
title: Woven design system documentation and customizer
date: 2026-10-23
type: feature
status: implementation-ready
product_contract_source: ce-plan-bootstrap
---

# Woven design system documentation and customizer

## Goal Capsule

**Objective:** A project can start with Looma, customize its shared theme, add HTML Next components, and browse one documented design system. Threadlabs publishes its own documentation with exactly this shipped product.

**Means:** Package-owned documentation/catalog tooling, Markupress on HTMLKit, reusable isolated example cards, and a shared theme-editor contract with public-download and local-save adapters.

**Completion signal:** The public site and an isolated installed-package consumer generate the same reference/customizer product; saving a local theme and adding a differently prefixed component update that consumer's documentation and application without changing installed dependencies.

---

## Product Contract

### Problem Frame

Production documentation currently uses Docusaurus. The Markupress migration generates only Stack and rejects behavior/resizable examples. Its generator depends on repository-only scripts, classifications and source paths, so consumers cannot use it. A standalone theme lab is not the consumer's documented design system.

### Requirements

- R1. Ship the generator, versioned component catalog, authored examples, theme-editor schema and documentation/customizer UI with `@threadlabs/looma`. A tarball installation must work without repository tools or apps.
- R2. Threadlabs public documentation dogfoods that product on Markupress/HTMLKit, including all published component pages, API contracts, compound parts, authored guidance, interactive/resizable examples and existing useful routes or redirects.
- R3. The customizer shows selectable actual documentation example cards. A single example identity and renderer serve both reference pages and customizer. Theme changes visibly affect the selected cards together; costly examples load on demand.
- R4. Use Looma controls and semantic theme inputs. Preserve the twenty-decision authoring model, intuitive families, independent size/spacing growth, native CSS units, first-line choice alignment and shared boxed-control heights. No private-component styling or bespoke copies of controls.
- R5. The public customizer previews themes and downloads portable CSS plus an editable recipe. It exposes no local writer.
- R6. Local docs load the project's saved recipe/CSS. Save writes only configured project-owned theme files, then the documentation and application loading that theme show the changes. Cancellation, validation errors and stale-file conflicts retain the current valid theme and unsaved edits.
- R7. Discover HTML Next resources under explicit roots and explicitly declared installed catalogs. New components in a root appear automatically in dev. Stable package-qualified identities, shared category IDs, optional compound parents, readable attribution and actionable collision/missing-parent diagnostics are required. No tag-prefix or Vue assumption for external components.
- R8. Project branding and additive authored Markdown guidance extend the same product; generated content is disposable. API types/defaults always come from component definitions.
- R9. Reference content and component examples render before JavaScript; interactions progressively attach. Keyboard operation, readable validation, mobile layout, reduced motion and correct overlay theme inheritance remain supported.
- R10. Publish coherent setup/reference documentation, a CLI initializer and build/dev/preview commands. Verify packed-package usage, discovery, exports, local persistence boundaries and actual browser behavior; update deployment to the shipped generator.

### Scope Boundaries

The work includes the whole current proposal and production migration. It does not introduce a replacement documentation framework, arbitrary CSS reverse engineering, automatic git commits, dependency-wide scanning, or automatic theming of unrelated third-party components. External components declare their supported token hooks. Existing component/runtime imports must not load documentation server dependencies.

### Acceptance Examples

- AE1. Install the tarball in a separate project, initialize docs, build, and open a generated Input page with API, examples and a live color customizer card.
- AE2. Change density, spacing curve, inner depth and accent: selected documented examples update; exported CSS alone produces the same result in a separate consumer.
- AE3. Save a local recipe, reload, and observe it on documentation examples and a small application importing the generated theme CSS. A competing disk edit returns a conflict rather than overwriting it.
- AE4. Add `acme-status` under a configured root with group `display`; it appears beside Looma Display components without a Vue export. A duplicate tag or missing compound parent fails with both identities/sources.
- AE5. A behavior-bearing example works in its documentation card and the customizer; a resizable example has a usable Looma size control. Third-party example code cannot invoke the repository writer.

---

## Planning Contract

### Key Technical Decisions

- KTD1. Keep Markupress as documentation engine and HTMLKit as renderer/server. Ship the Looma plugin and CLI as optional tooling entrypoints in the existing package; lazily import tooling peers. The public app is configuration and authored content. This follows the explicit dogfooding directive; a second public-only generator would fail R1/R2.
- KTD2. Component summaries/groups/parents move beside definitions as documented inert namespaced resource metadata or colocated documentation manifests; prop descriptions remain authored in definitions. Confirm the installed HTML Next parser's metadata support before choosing syntax. Release classification retains release status only; it no longer owns duplicated documentation prose.
- KTD3. Build a versioned published catalog from the existing API extractor and examples; no installed invocation imports repository tools. Use HTML Next's public parser for opted-in external source resources. Catalog schema version, package identity and example identity are explicit. Retain authored framework snippets; derive Vue snippets only when the catalog declares that target.
- KTD4. Generate a disposable documentation tree under `.looma/`, combining package reference and project Markdown. Shared category IDs are labels-independent. Preserve canonical existing component routes and alias previous migration routes. Markupress versions use the project's installed dependency lockfile and saved theme; no invented snapshot dependency freezer.
- KTD5. Render documentation cards from a single catalog-based stage. Isolate previews in compiled HTMLKit pages/iframes with scripts allowed but no same-origin privilege. Theme CSS crosses a narrow typed message channel; local writer capabilities never enter previews. Mount overlay/editor examples on demand and keep accessible fallback/example source visible without JS.
- KTD6. The recipe is versioned structured values with one schema/validation/serialization implementation. CSS is the portable output. The customizer initially themes examples; saved theme themes the whole documentation site. The documentation shell remains readable during unsaved experiments. Custom overrides remain a separate explicit file, loaded after generated CSS.
- KTD7. A local CLI-owned loopback service supplies a session capability, validates host/origin and JSON input, restricts output to configured in-project non-symlink paths, checks a loaded revision, and atomically saves owned recipe/CSS files. Static/public builds omit this capability and endpoint. Initialization creates a theme entry rather than silently editing an existing application; it shows the exact import the app needs.
- KTD8. Use one bounded review with feasibility, security, design and scope lenses and the current session model; no cross-model escalation. Qualify browser tests with one worker and no overlapping local runners.

### Existing Evidence

`apps/docs-next/htmlkit.config.js` documents only Stack; `apps/docs-next/scripts/component-reference.mjs` rejects behavior/resizing and assumes `ui-` and Vue. `tools/scripts/component-api-generator.mjs` and `declarative-contracts.mjs` extract current contracts; `tools/data/component-release-classification.json` currently owns summary/category data. `packages/looma/build.mjs` assembles the package but exports no docs tooling. `.github/workflows/docs.yml` deploys Docusaurus. Installed Markupress 0.5.0 exposes `markupress`, `siteOptions`, `buildSite` and `devSite`; HTMLKit plugins support configuration, generated page directories and build hooks. These public hooks avoid a second docs engine.

### Assumptions

The request to finish all proposed work authorizes normal implementation, testing, PR publication and delivery through the existing shipping process. The existing earlier instruction to test and merge remains the desired delivery endpoint for this continuation. Naming, configuration fields and the unsaved-preview scope are implementation choices, not additional user constraints. No unrelated library upgrades or new repositories are required. Installed Markupress 0.5.0 pins Looma 0.30.0 and HTML Next/HTMLKit alpha.58; qualify a compatible published peer contract in the owning Markupress project before strict installed-consumer proof, using the smallest compatible change. If a concrete missing platform hook proves necessary, make the smallest owning-project change and verify that integration.

---

## Implementation Units

### U1. Published source catalog and documentation metadata

**Requirements:** R1, R7, R8. **Dependencies:** none.

**Files:** `packages/looma/tooling/docs/catalog.mjs`, `packages/looma/tooling/docs/catalog.test.mjs`, component documentation metadata, `tools/scripts/component-api-generator.mjs`, `tools/data/component-release-classification.json`, `packages/looma/build.mjs`, `packages/looma/package.json`.

**Approach:** Move summary/category ownership beside definitions while preserving release eligibility. Publish versioned contracts, token references, examples, framework snippets and compiled demo behavior/assets. Add generic opted-in source/catalog discovery with deterministic identity/category merging and explicit diagnostics. Reuse public HTML Next parsing; never evaluate controllers while discovering.

**Test scenarios:**

- Published catalog covers every published component and compound part with unique identities and examples.
- A differently prefixed local component is parsed, joins an existing group, retains authored descriptions and has no invented framework adapter.
- Duplicate tags/identities, category conflicts and missing parents produce source-rich diagnostics.
- Installed catalog loading works independently of repository paths.

**Verification:** Catalog and discovery tests pass; the built package contains every referenced asset and imports docs tooling without browser globals or optional server peers.

### U2. Shared reference/card generator on Markupress and HTMLKit

**Requirements:** R1, R2, R3, R8, R9. **Dependencies:** U1.

**Files:** `packages/looma/tooling/docs/site.mjs`, `packages/looma/tooling/docs/render.mjs`, `packages/looma/tooling/docs/preview.mjs`, `packages/looma/tooling/docs/site.test.mjs`, `packages/looma/tooling/docs/index.mjs`, `packages/looma/tooling/docs/index.d.ts`.

**Approach:** Generate category indexes, full API reference, compound parts, code views and isolated reusable example cards into an owned disposable tree. Copy additive authored guidance and branding. Compile behavior companions for browser loading, preserve dependency imports and cleanup. Resize using Looma controls. Preserve routes/aliases and no-JS visible reference/example content. Watch selected roots and source/example dependencies in local dev, regenerate on additions/removals, and close owned watchers with the server.

**Test scenarios:**

- Every catalog component produces reference content and stable links; all authored example variants are represented.
- Behavior/resizable examples generate valid resources and run through the shared stage.
- Project Markdown is additive and cannot silently replace generated API pages.
- A new or removed source component updates dev navigation; server shutdown closes watchers.

**Verification:** Public and external consumer builds render complete catalogs with no unresolved links or repository imports.

### U3. Theme authoring contract and Looma customizer

**Requirements:** R3, R4, R5, R9. **Dependencies:** U1, U2.

**Files:** `packages/looma/tooling/docs/theme.mjs`, `packages/looma/tooling/docs/theme.test.mjs`, `packages/looma/tooling/docs/customizer.html`, `packages/looma/tooling/docs/customizer.js`, shared example stage resources.

**Approach:** Promote the semantic model from the existing lab into a public editor schema with discoverable families, units, defaults and validation. Compose real Looma controls, render selectable catalog cards, distribute validated theme CSS to mounted isolated stages, retain unsaved edits, reset and export CSS/recipe. Do not copy bespoke demonstration specimens or theme nested private nodes.

**Test scenarios:**

- All twenty authoring decisions round-trip through validation and CSS serialization with native units preserved.
- Size ratio and spacing curve vary independently; depth does not change press amplitude.
- Selecting cards mounts the same example identity as its docs page; changes update all mounted previews and source CSS download.
- Invalid values retain the last valid preview and give accessible errors; keyboard, mobile and reduced-motion operation work.

**Verification:** Browser flows demonstrate live theme changes and exported-CSS parity against an independent consumer.

### U4. Local persistence and project initialization

**Requirements:** R5, R6, R7, R10. **Dependencies:** U2, U3.

**Files:** `packages/looma/tooling/docs/persistence.mjs`, `packages/looma/tooling/docs/persistence.test.mjs`, `packages/looma/tooling/docs/cli.mjs`, `packages/looma/tooling/docs/cli.test.mjs`, `packages/looma/package.json`.

**Approach:** Provide init/build/dev/preview and a config contract for content, branding, roots/catalogs, output, shared theme and overrides. Local dev supplies a bounded save adapter; public/static builds supply download only. Own the local writer lifecycle, detect competing disk edits, and make successful saved CSS the same resource loaded by docs and the application. Initialization never overwrites existing config or arbitrary CSS.

**Test scenarios:**

- Init is repeatable without overwriting user files; a packed consumer can build/dev through the CLI.
- Valid local save survives reload and changes an application loading the generated theme.
- Invalid schema, stale revision, foreign host/origin, missing capability, traversal, absolute external paths and symlink escapes cannot write.
- Save failures retain recipe/CSS coherence and unsaved UI values; static output contains no session capability or writable endpoint.

**Verification:** Real browser-to-server-to-files-to-reloaded-preview flow passes, including conflict and isolation tests.

### U5. Public documentation migration and dogfooding

**Requirements:** R2, R8, R10. **Dependencies:** U1 through U4.

**Files:** `apps/docs-next/` configuration/content/tests, `.github/workflows/docs.yml`, `.github/workflows/docs-parity.yml`, root scripts, documentation references.

**Approach:** Make the public app a configuration-only consumer of the package entrypoint. Migrate remaining authored guidance/editor pages and landing content, generate all component pages and preserve legacy routes. Replace the production docs build/artifact with this HTMLKit site. Retain Docusaurus as a migration comparison fixture until complete checks establish parity; do not ship a second active generator.

**Test scenarios:**

- Existing useful public routes resolve or redirect to equivalent complete content.
- Public customizer downloads CSS and recipe and offers no repository save.
- All published component APIs/examples and authored guidance are present with JavaScript disabled.
- Navigation, representative overlays/behavior, code tabs and mobile controls work in the built public site.

**Verification:** Production-equivalent build, route coverage, browser tests and Pages workflow validation pass.

### U6. Installed consumer qualification and delivery

**Requirements:** R1 through R10. **Dependencies:** U1 through U5.

**Files:** packed consumer verification fixtures/scripts, CI ownership/selection mappings, `.github/workflows/release.yml` and its policy tests, `packages/looma/README.md`, `docs/design-system-documentation.md`, `AGENTS.md`, `CHANGELOG.md`.

**Approach:** Document configuration/metadata/theme contracts and setup, add tooling input ownership to change-dependent qualification and release-change detection, and exercise an isolated tarball consumer with external components, theme save and app import. Simplify once, review once, address real findings, ship a PR and monitor CI through merge and public deployment verification.

**Test scenarios:**

- Tarball contains all CLI/catalog/runtime/template assets and no private/repository-only dependencies.
- Component imports remain SSR-safe and do not import optional docs peers; tooling installs pass strict peer checks without overrides.
- Existing package support checks remain green; new qualification gates select docs/tooling changes.
- Deployed public site serves the same package-owned customizer and complete reference.

**Verification:** Required tests and packed consumer checks pass on the shipped commit; PR merges and the deployment is verified.

---

## Verification Contract

Start with schema/discovery/persistence tests, then a small installed consumer build before expanding the public migration. Add browser coverage to the existing docs-next Playwright project with one worker. Validate no-JS reference, interactive behavior, resizing, card selection/theme propagation/export, local save/reload/conflict, a new custom component, preview isolation and mobile keyboard interactions. Reuse existing package integrity/consumer checks; do not weaken existing style or screenshot gates. Run the full required hosted CI before merging. Observe the actual Pages deployment rather than inferring deployment success from code.

## Definition of Done

All R1–R10 acceptance flows work in both Threadlabs configuration and an independent packed consumer. One shipped renderer/catalog/customizer serves both. Documentation accurately distinguishes generated/reference content, authored guidance and external token adoption. Required CI passes, delivery is merged, and the deployed public HTMLKit site is checked. Any optional future enhancements are explicitly distinguished from requested unfinished work; none of the requested proposal is silently deferred.
