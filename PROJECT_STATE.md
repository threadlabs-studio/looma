# PROJECT_STATE

> **Current projection:** `@threadlabs/looma` is the sole public Release 1
> artifact. Older five-package references below are retained as implementation
> history or private workspace/build evidence, not as consumer guidance.

Last Updated: 2026-09-05 10:55 PDT
Status: Candidate `0.1.16` is public; the next Candidate adds top-layer anchored overlays, input-driven touch sizing, denser tree typography, and controlled-editor selection stability

## Current Focus

- Qualify the next Candidate with Popover top-layer menus/popovers/tooltips,
  native CSS Anchor Positioning plus Looma's centralized lightweight fallback,
  and exact Knit sidebar overflow evidence.
- Keep dense tree rows at 32px/15px for pointer use and animate to 44px targets
  only after a real touch interaction establishes touch modality.
- Verify that controlled editor replacements preserve a focused ProseMirror
  selection, while Knit server acknowledgements no longer echo authored JSON
  through the active editor.

- Prepare and publish Candidate `0.1.17`, then consume its exact registry bytes
  from Knit. Candidate `0.1.16` remains the current public `candidate` until
  those replacement bytes pass main CI and protected publication.
- Complete hosted-docs qualification and promote Candidate `0.1.13`, which is
  published and qualified in Knit with the opinionated Lucide icon
  language, compact table cells, cell-local resize chrome, hover-first table
  affordances, and a real interactive Storybook editor playground.
- Qualify those exact public bytes in Knit before promoting them to `latest`.
- Before promotion, refresh the chosen immutable Candidate's production
  hosted-docs evidence and run the owner-approved promotion with public Knit
  evidence for those exact bytes.
- Complete npm trusted publishing and revoke the temporary bypass-2FA bootstrap
  credential before its January 2027 restriction.
- Keep qualified `0.1.11` under `latest` until an exact immutable Candidate
  completes its hosted-docs, promotion, and release-record gates.
- Keep React and Svelte deferred while Release 1 covers tokens, layout, core,
  editor, and Vue.

## Recent Progress

- Floating surfaces, modality, and typography correction:
  - Added one `createAnchoredSurface` controller used by menu, context menu,
    popover, and tooltip. Native Popover provides the top layer; CSS Anchor
    Positioning is preferred and a frame-coalesced visual-viewport flip/shift
    fallback avoids a heavyweight syntax polyfill.
  - Added the same top-layer contract for unanchored viewport surfaces such as
    toast regions, and moved editor insert-table pickers off ad hoc positioning.
  - Added configurable tooltip pointer-intent delays (500ms show, 100ms hide by
    default) while keeping keyboard-focus disclosure immediate.
  - Added real-browser coverage for overflow-contained menus, context-point
    placement, shared anchors, and top-layer popovers/tooltips.
  - Added document-level touch modality detection and made Looma trees animate
    from compact pointer rows to touch-safe rows only after actual touch input.
  - Corrected the default typography contract to the documented native system
    stack and introduced a 15px dense-interface token for tree labels.
  - Kept fallback viewport listeners scoped to open surfaces and excluded
    trigger controls from anchored-overlay light dismissal.
- Controlled editor stability:
  - Replaced document and selection in one ProseMirror transaction so a focused
    selection does not map to the end during a genuine controlled update.
  - Added real-Chromium regression coverage around focused selection retention.
  - Preserved focus ownership when a controlled update arrives after the editor
    has blurred.

- Candidate `0.1.16` release preparation:
  - Preserved Stencil's runtime `hydrated` class across reactive consumer class
    updates in the shared Vue adapter, preventing responsive rerenders from
    hiding otherwise-rendered custom elements.
  - Added real-Chromium coverage that changes a consumer class after mount and
    verifies the tree item remains hydrated and visible.

- Candidate `0.1.15` release preparation:
  - Advanced the singleton public facade, package metadata, docs, release
    artifact names, fixture expectations, and release-policy tests together.
  - Added Candidate notes for semantic trees, full-row drag feedback, truthful
    target affordances, hover intent, and the app/Looma ownership boundary.

- Candidate `0.1.14` release preparation:
  - Advanced the singleton public facade, package metadata, docs, release
    artifact names, fixture expectations, and release-policy tests together.
  - Added Candidate notes for provider-neutral responsive image attributes,
    accessible activation, one-time master fallback, and upload retry behavior.

- Responsive image delivery seam:
  - Added intrinsic image dimensions and a provider-neutral responsive
    capability to the turnkey Vue editor's upload contract.
  - Kept rendition attributes transient, added accessible mode-aware activation
  and one-time fallback events, and made failed uploads retryable with the same
  `File` while keeping failed attempts out of Tiptap JSON.

- Tree and drag/drop component work:
  - Added semantic `ui-tree` and `ui-tree-item` primitives with one-step logical
    indentation, disclosure, selected/disabled states, and slotted leading,
    action, and child content.
  - Added full-row browser drag imagery, muted source state, capped before/after
    insertion lines, inside-container highlighting, compatible-kind filtering,
    and delayed expansion of closed container targets.
  - Added reusable drop classification and keyed hover-intent utilities plus
    typed Vue `Tree`/`TreeItem` adapters and reorder/expand event payloads.
  - Added real-Chromium coverage and a live Storybook hierarchy playground;
    aligned generated API metadata, contracts, docs navigation, and release
    classification for the expanded public surface.

- Candidate `0.1.13` Knit qualification:
  - Installed exact public registry bytes in Knit, passed 143 script-policy and
    436 application tests, and passed all 18 required browser scenarios across
    Chromium, mobile WebKit, and mobile Chromium.
  - Inspected captured 320, 768, 1024, and 1440px application renders for
    full-width route surfaces, overflow, sidebar alignment, and mobile action
    reachability.
  - Integrated Knit commit `5c1183e36cbcca92a53207708a2431a25984f795`
    into private `main` and deployed the exact revision to the shared Preview
    aliases.

- Candidate `0.1.13` release correction:
  - Corrected the public release fixture to use the typed `heading-1` Lucide key
    after `0.1.12` published successfully but failed its clean-consumer
    typecheck.
  - Added the exact release consumer to the packed-facade pre-publication gate,
    so this class of fixture/package contract drift fails before immutable npm
    publication rather than afterward.
  - Completed and aligned the fixture's Tiptap 2.27 peer graph, including
    `@tiptap/pm`, so the same pre-publication gate covers both typecheck and SSR.

- Candidate `0.1.12` release preparation:
  - Advanced the singleton public facade, package metadata, docs, release
    artifact names, fixture expectations, and release-policy tests together.
  - Added Candidate notes covering hover-first table discovery, compact resize
    behavior, the shared Lucide language, mobile slash commands, and the real
    editor playground.

- Editor interaction and icon-system polish:
  - Standardized shipped Looma editor controls on a typed Lucide registry so
    toolbars, slash commands, table actions, and dropdowns no longer use text
    glyph stand-ins and continue to inherit Looma/Knit theme tokens.
  - Replaced the fixed-state table story with the real turnkey Vue editor and
    connected insert-table workflow; the picker now separates committed intent
    from hover preview without rendering unused grid tracks.
  - Separated table hover from selection: hovering an unfocused table exposes
    row and column selectors, while cell actions remain anchored to the active
    editing cell.
  - Reduced the shared anticipatory near radius to 16px and kept overlapping
    near states coordinated by one window-level pointer loop.
  - Made cells the containing block for Tiptap resize chrome, removed the
    interaction-dependent trailing paragraph gap, and retained whole-table
    horizontal scrolling around 112px minimum-width cells.
  - Added real-Chromium coverage for resize geometry, stable compact-cell
    height, hover-before-focus controls, insert-grid intent, and the mobile
    slash-command mapping that previously selected the wrong block type.

- Table resizing consumer correction:
  - Reproduced the missing resize handle in Knit with the pointer targeting the
    correct empty cell and the Tiptap resize handler running, while its sampled
    coordinate resolved to the row instead of the cell.
  - Aligned `LoomaTable`'s structural `cellMinWidth` with the 112px CSS default
    and reduced Tiptap's coupled hover/probe width from 5px to 3px so the probe
    remains inside empty minimum-width cells.
  - Expanded real-browser coverage to an empty body-cell table and verified the
    packed facade in Knit's exact editor flow, including a real column drag.
- Responsive layout hardening:
  - Corrected the light-DOM reset so Looma component-layer display and sizing
    declarations remain active while application CSS stays overridable.
  - Made grid/center primitives intrinsically fluid and bounded dialogs,
    search, menus, popovers, tabs, toasts, top bars, and floating actions for
    narrow viewports and safe areas.
  - Added source-policy tests and real Chromium coverage for computed layout.
  - Added intrinsic Switcher, Sidebar, and Reel primitives across the custom
    element surface and framework adapters, including keyboard-accessible reel
    overflow and Chromium layout coverage.
  - Aligned dialog host visibility with the rendered `data-open` state so
    property-driven framework adapters can open dialogs without reflecting an
    `open` attribute.
- Release 1 namespace and local qualification:
  - `@threadlabs/looma@0.1.4` is published under `candidate` from exact commit
    `8b311ee842e6bb61c7fcb8058ce5568d482a8d35`. Candidate workflow run
    `33818495158` and exact-main CI run `33818256965` passed.
  - The centered-layout cascade correction advances the next immutable
    Candidate to `0.1.5`.
  - `@threadlabs/looma@0.1.3` is published under `candidate` from exact commit
    `48d86c1b2f8fa53111c56aad17becd00f4123cfb`. Candidate workflow run
    `33809933800` and exact-main CI run `33809269643` passed.
  - `@threadlabs/looma@0.1.2` is published under `candidate` from exact commit
    `976dabb49e165b521cc6efe4d8f1dfecd6cebd72`. Candidate workflow run
    `33790406837` and exact-main CI run `33789984966` passed.
  - A credential-free detached Knit checkout at commit
    `2207e9bc470bfe9807e7fba5c2033a4b5d15f725` installed the public `0.1.2`
    bytes with a fresh store and no sibling Looma repository, then passed 460
    tests, typecheck, lint, and the production build. The content-free proof is
    stored under `docs/release-evidence/`.
  - Owner approved `@threadlabs/looma-*` as the permanent public namespace;
    public, deferred, and private workspace identities now use the same graph.
  - Package manifests, internal dependencies, imports, release policy and
    workflows, generated metadata, docs, examples, tarball expectations,
    fixtures, tests, and checked lockfiles were migrated together.
  - `release:verify` produces an eligible five-package `0.1.0` artifact set
    under Node 20 using explicitly labeled local rehearsal approvers.
  - `release:verify-knit` installs those exact tarballs through a disposable
    no-fallback registry into a detached clean Knit checkout with linking
    disabled; production build, typecheck, eight SSR surfaces, 89
    signup-critical tests, and all 266 unit tests pass.
  - Public npm publication, public-registry consumption, hosted docs,
    `candidate`/`latest` promotion, and immutable release records remain open.
- Planning sync:
  - React and Vue wrapper parity for current shipped core tags is complete; old parity follow-up notes are now stale.
  - Verified Knit now consumes Looma `ToastRegion`, `Dialog`, `Button`, `Input`, `FormField`, `Menu`, and `MenuItem` in several high-use flows.
  - Knit page editing now uses `@threadlabs/looma-editor` Phase 1 table primitives and Looma’s shared extension preset; broader editor UI migration is still incomplete.
- @threadlabs/looma-core fully rebuilt with Stencil:
  - All 18 components converted; vanilla impl removed; `packages/core-stencil` deleted.
  - Strong contracts, no MutationObservers, shadow DOM per component.
  - Consumers call `defineCustomElements()` from `@threadlabs/looma-core/loader`; main entry exports overlay manager.
- Button ghost variant added for toolbar use:
  - `ui-button[data-variant="ghost"]` in `packages/core/src/styles.css` — transparent background, hover/active states.
  - Updated `ui-button/README.md` to document `ghost` variant.
- Storybook component polish and fixes:
  - Tooltip: fixed `[hidden]` override so closed tooltips stay hidden; moved trigger id to button for reliable hover; added Open story.
  - Toast: fade-in/slide-from-top animation; fixed top-center positioning; added `max` attribute to limit visible toasts; updated story with multiple toasts and MaxTwo variant.
  - Switch: custom track/thumb styling (appearance:none + ::after) for toggle look.
  - Tabs: added `ui-button > button[role="tab"]` selectors so tab buttons inside ui-button get correct styling.
  - Disclosure: basic container and [hidden] styles.
  - Badge/Avatar: added Variants and WithImage showcase stories.
- Design upgrade (Knit parity) completed:
  - Popover and Tabs styling in `packages/core/src/styles.css` (popover: shadow-lg, radius-3, surface-elevated; tabs: underline indicator, vertical orientation).
  - Checkbox/Switch accent color and focus-visible ring for inputs.
  - Showcase stories: Form (validation), Dialog (actions), Menu (icons) in `apps/storybook/stories/`.
  - Updated `docs/design-upgrade.md` to mark all items done.
- Editor extensions Phase 1 completion:
  - Added `handleTableOverlayAction(editor, detail)` in `@threadlabs/looma-editor/extensions` to map overlay boundary clicks to exact Tiptap `addRowBefore`/`addRowAfter`/`addColumnBefore`/`addColumnAfter` commands.
  - Added CodeBlock to `getDefaultEditorExtensions()` preset (basic code block; apps can replace with CodeBlockLowlight for syntax highlighting).
  - Consolidated extensions export: `@threadlabs/looma-editor/extensions` now exports preset + table-commands from a single entry point.
- Storybook showcase enhancements:
  - Added ui-menu and ui-menu-item styles in `packages/core/src/styles.css` (dropdown container, item padding, hover, disabled).
  - Added Anime.js overlay enter animations in `apps/storybook/.storybook/overlay-animate.ts` for ui-menu and ui-popover (mirrors Knit useAnimeEnter).
  - Storybook preview uses Inter font and unified Knit-style colors via `preview.css`.
- Hybrid layer strategy implemented:
  - Moved critical isolation rules (box-sizing, `all: revert`, typography baseline, `data-ui-inherit-typography`) out of `@layer` in `packages/core/src/styles.css` and `packages/layout/src/layout.css`.
  - Component visual styles and utilities remain in `@layer components` and `@layer utilities` so unlayered page CSS can override them for theming.
  - Documented the hybrid approach in `apps/docs/docs/conventions.md`.
- Font stack presets formalized:
  - Added tokenized sans stack presets (`system`, `neo-grotesque`, `humanist`, `rounded`) in `packages/tokens/src/tokens.css`.
  - Kept `--ui-font-family-sans` as the switch token and defaulted it to `--ui-font-stack-system`.
  - Added utility hooks in `packages/core/src/styles.css`: `.ui-font-system`, `.ui-font-neo-grotesque`, `.ui-font-humanist`, `.ui-font-rounded` and `data-ui-font-stack="..."`.
- Convention/docs formalized for opt-in typography:
  - Documented utility and inheritance patterns in `apps/docs/docs/conventions.md`.
  - Documented rem-based typography token guidance and preset usage in `apps/docs/docs/tokens.md`.
- Formalized CSS convention + utility pattern for light-DOM components:
  - Added docs contract in `apps/docs/docs/conventions.md` covering scoped `all: revert`, token-driven defaults, and opt-in inheritance via `data-ui-inherit-typography`.
  - Added token docs in `apps/docs/docs/tokens.md` for rem-based typography tokens and host `html` scaling guidance.
  - Added `@layer utilities` `.ui-scope` in `packages/core/src/styles.css` for opt-in baseline typography/color + scoped border-box at container level.
- Typography token baseline update:
  - Switched `--ui-font-family-sans` default to `system-ui, sans-serif` for fast/no-download baseline; kept size/line-height tokens rem-based.
- Opt-in inheritance support added:
  - `data-ui-inherit-typography` selectors added in `packages/core/src/styles.css` and `packages/layout/src/layout.css` for inheritable text/i18n rendering properties.
- Light-DOM reset + typography contract update:
  - Added shared typography tokens in `packages/tokens/src/tokens.css` (`--ui-font-family-sans`, `--ui-font-size-*`, `--ui-line-height-*`).
  - Applied scoped host reset with `all: revert` across Looma core/layout hosts, then explicitly re-applied token-driven typography and component primitives.
  - Applied scoped box-model normalization for component subtrees (`*`, `*::before`, `*::after` within Looma hosts) to enforce border-box without global page reset.
- Storybook styling reliability fix:
  - Updated `apps/storybook/.storybook/preview.ts` to import Looma tokens/layout/core/editor CSS and custom-element registrations directly from `packages/*/src`, avoiding package entrypoints that can resolve to stale/missing `dist` assets.
  - This keeps default component styles available in Storybook dev without requiring package prebuilds.
- Docs/Storybook semantic taxonomy reset completed:
  - Reverted docs sidebar component groups to `Layout`, `Forms`, `Overlay`, and `Display` (with `Foundations` unchanged).
  - Updated Storybook story titles to the same semantic groups while keeping human component labels (no `ui-*` in visible names).
  - Updated Storybook sort order to `Layout`, `Forms`, `Overlay`, `Display`, `Editor`.
- Docs/Storybook naming + grouping alignment completed:
  - Updated Storybook `preview.ts` to load editor source directly from `packages/editor/src` (`editor.css` + `index`) instead of `@threadlabs/looma-editor` dist imports, preventing stale-dist dynamic import failures.
  - Renamed all component story titles from `Group/ui-*` to human labels (for example `Layout/Cluster`, `Essentials/Form Field`, `Primitives/Toast Region`).
  - Reorganized docs sidebar component categories to `Layout`, `Primitives`, and `Essentials` to match Storybook taxonomy.
  - Updated all `apps/docs/docs/components/ui-*.mdx` H1 headings from `ui-*` slugs to human names while keeping component ids/tags unchanged.
- Editor Storybook workflow added:
  - Added `Editor/Table Primitives Playground` story in `apps/storybook/stories/editor/table-primitives-playground.stories.ts` for `ui-editor-table-context-menu`, `ui-editor-insert-table-grid`, and `ui-editor-table-overlay`.
  - Added live event log wiring in-story for `looma-editor-table-action`, `looma-editor-insert-table`, and `looma-editor-table-overlay-action`.
  - Updated Storybook preview to load `@threadlabs/looma-editor` and `@threadlabs/looma-editor/editor.css` globally and include an `Editor` story section in sort order.
- Editor Phase 1 table UI + adapter wiring progress:
  - Added `ui-editor-table-overlay` web component with row/column boundary "+" controls and `looma-editor-table-overlay-action` events.
  - Added Vue/React editor wrappers (`EditorTableContextMenu`, `EditorInsertTableGrid`, `EditorTableOverlay`) and typed callbacks for table events (`onTableAction`, `onInsertTable`, `onTableOverlayAction`).
  - Updated editor/component roadmaps and `@threadlabs/looma-editor` README to reflect shipped table overlay + adapter event wiring.
- Editor parity progress in `@threadlabs/looma-editor`:
  - Added inline code support (`@tiptap/extension-code`) to `getDefaultEditorExtensions()`.
  - Added a Looma list behavior extension to keep Enter in list/task items and exit empty list items with Backspace.
  - Updated editor roadmap/README status snapshots to reflect shipped extension-level behavior.
- Looma pivot foundation updates completed:
  - Migrated package scope and imports across workspace from `@ui/*` to `@threadlabs/looma-*`.
  - Rebranded docs/site metadata from Granola to Looma and updated docs-domain placeholder.
  - Added cross-project rules clarifying Looma/Knit boundaries and promotion expectations.
- Vue adapter parity + verification improvements:
  - Added Vue exports for `RadioGroup`, `Radio`, `Badge`, and `Avatar` in `packages/vue/src/index.ts`.
  - Added real Vue adapter tests in `packages/vue/src/index.test.ts` and enabled `vitest` test script in `packages/vue/package.json`.
  - Updated adapter parity docs to reflect current Vue export coverage.
- Docs positioning updates:
  - Added official Knit relationship statement + link (`https://knit.wiki`) in docs.
  - Added subtle Knit-style icon treatment in component examples while keeping API wording generic.
- M5 core expansion completed for `@threadlabs/looma-core`:
  - Added `ui-tooltip`, `ui-toast-region`, `ui-checkbox`, and `ui-switch` custom elements in `packages/core/src/index.ts` with light-DOM, accessibility-first behavior.
  - Added component tests in `packages/core/src/index.test.ts` and contract READMEs under `packages/core/src/ui-*/README.md`.
- API metadata enrichment completed:
  - Extended generated schema with discoverable `default` and `options` for attributes/properties.
  - Added event detail schema/docs strings (`detailSchema`, `detailDocs`) for `open`/`close`/`select` plus new `change`/`dismiss` events.
- Docs + Storybook sync completed for M5:
  - Added Docusaurus component pages and sidebar entries for `ui-tooltip`, `ui-toast-region`, `ui-checkbox`, and `ui-switch`.
  - Added Storybook stories for all four components using generated metadata helper utilities.
- CI docs-sync enforcement added:
- Adapter M5 parity completed:
  - Added React/Vue exports for `Tooltip`, `ToastRegion`, `Checkbox`, and `Switch`.
  - Extended Svelte adapter tag/event support for M5 (`change` and `dismiss` callbacks included).
- Edge-case verification expanded:
  - Added tooltip focus/escape test coverage and toast multi-item lifecycle tests in `packages/core/src/index.test.ts`.
  - Added `.github/workflows/ci.yml` running install, `generate:api`, `check:docs-sync`, `typecheck`, `build`, and `test`.
- Docs/API sync pipeline implemented:
  - Added deterministic generator/check scripts in `tools/scripts` with root commands (`generate:api`, `check:docs-sync`, `generate:docs`).
  - Added generated metadata output at `generated/component-api.json`, consumed by Docusaurus and Storybook.
  - Added docs workflow page (`docs-api-sync`) and updated all component MDX pages with shared Examples/API tabs.
- Storybook sync migration completed:
  - Added shared metadata helper (`stories/shared/componentApi.ts`) and moved component stories to generated argTypes/docs parameters.
- Generator quality follow-up completed:
  - Added inheritance-aware metadata extraction so overlay-derived components include inherited `open/defaultOpen` APIs.
  - Added detection for dynamic `open/close` event dispatch patterns and improved attribute->property mapping (e.g. `readonly` -> `readOnly`).
- M0-M4 foundation completed:
  - Monorepo scaffold (`pnpm` workspaces, package boundaries, docs contracts).
  - Tokens/themes, layout primitives, behavior primitives, styled essentials implemented.
  - Thin adapters implemented for React/Vue/Svelte.
- Documentation infrastructure added:
  - Docusaurus app with component pages, API sections, SSR examples, framework tabs.
  - Storybook app with stories for all shipped components and autodocs.
- Verification completed successfully across workspace (`typecheck`, `build`, `test`) plus docs/storybook builds.

## Milestone Snapshot

- M0 Specs and Skeleton: complete
- M1 Tokens + Layout: complete
- M2 Core Primitives: complete
- M3 Styled Essentials: complete
- M4 Adapters + Docs: complete
- M5 Expansion (tooltip/toast-region/checkbox/switch): complete

## Verification Snapshot

- Responsive image delivery seam (2026-09-04):
  - focused real-Chromium tests: pass (6 tests), including transient JSON,
    activation, fallback-once, and same-`File` retry behavior
  - `pnpm --filter @threadlabs/looma-vue test`: pass (13 tests)
  - `pnpm --filter @threadlabs/looma-editor test`: pass (9 tests)
  - `pnpm --filter @threadlabs/looma-vue typecheck`: pass
  - workspace `pnpm typecheck`: pass
  - workspace `pnpm lint`: pass
  - workspace `pnpm test`: pass
  - facade build and packed-consumer matrix: pass
  - `pnpm release:inspect`: pass; the local dirty-tree artifact is correctly
    marked ineligible for release
- Table resizing correction (2026-09-04):
  - strengthened `@threadlabs/looma-vue` browser test: failed before the fix
    with a 50px structural table minimum instead of the required 224px
  - `pnpm lint`: pass
  - `pnpm typecheck`: pass
  - `pnpm test`: pass
  - `pnpm test:browser`: pass (38 tests)
  - packed facade consumed by Knit editor browser test: pass (1 test)
- Responsive layout verification (2026-09-03):
  - `pnpm --filter @threadlabs/looma-layout test`: pass (6 tests)
  - `pnpm --filter @threadlabs/looma-layout typecheck`: pass
  - `pnpm --filter @threadlabs/looma-layout build`: pass
  - `pnpm --filter @threadlabs/looma-core test`: pass (31 tests)
  - `pnpm --filter @threadlabs/looma-core typecheck`: pass
  - `pnpm --filter @threadlabs/looma-core test:browser`: pass (9 Chromium tests)
- Re-verified after Looma pivot foundation updates:
  - `pnpm install --no-frozen-lockfile`: pass
  - `pnpm typecheck`: pass
  - `pnpm --filter @threadlabs/looma-vue test`: pass
  - `pnpm build:docs`: pass
  - `pnpm build:storybook`: pass
  - Stale token scan (`Granola`, `granola`, `@ui/` across tracked files): no matches
- `pnpm generate:api`: pass
- `pnpm check:docs-sync`: pass
- Workspace `pnpm typecheck`: pass
- Workspace `pnpm build`: pass
- Workspace `pnpm test`: pass
- `@threadlabs/looma-docs` build: pass
- `@threadlabs/looma-storybook` build: pass
- Re-verified after final sync wiring:
  - `pnpm generate:api`: pass
  - `pnpm check:docs-sync`: pass
  - `pnpm typecheck`: pass
  - `pnpm build`: pass
  - `pnpm test`: pass
- Re-verified after M5 + CI updates:
  - `pnpm generate:api`: pass
  - `pnpm check:docs-sync`: pass
  - `pnpm typecheck`: pass
  - `pnpm build`: pass
  - `pnpm test`: pass
- Re-verified after adapter parity + edge-case test additions:
  - `pnpm generate:api`: pass
  - `pnpm check:docs-sync`: pass
  - `pnpm typecheck`: pass
  - `pnpm build`: pass
  - `pnpm test`: pass
- Re-verified after editor extension parity updates:
  - `pnpm install --no-frozen-lockfile`: pass
  - `pnpm --filter @threadlabs/looma-editor typecheck`: pass
  - `pnpm --filter @threadlabs/looma-editor build`: pass
- Re-verified after editor table overlay + adapter wiring updates:
  - `pnpm install --no-frozen-lockfile`: pass
  - `pnpm --filter @threadlabs/looma-editor typecheck`: pass
  - `pnpm --filter @threadlabs/looma-editor build`: pass
  - `pnpm --filter @threadlabs/looma-vue typecheck`: pass
  - `pnpm --filter @threadlabs/looma-vue build`: pass
  - `pnpm --filter @threadlabs/looma-vue test`: pass
  - `pnpm --filter @threadlabs/looma-react typecheck`: pass
  - `pnpm --filter @threadlabs/looma-react build`: pass
- Re-verified after Storybook editor playground setup:
  - `pnpm install --no-frozen-lockfile`: pass
  - `pnpm --filter @threadlabs/looma-storybook build`: pass
- Re-verified after docs/storybook naming and grouping alignment:
  - `pnpm --filter @threadlabs/looma-storybook build`: pass
  - `pnpm --filter @threadlabs/looma-docs build`: pass
- Re-verified after semantic taxonomy reset (`Forms/Overlay/Display`):
  - `pnpm --filter @threadlabs/looma-storybook build`: pass
  - `pnpm --filter @threadlabs/looma-docs build`: pass
- Re-verified after Storybook styling reliability fix:
  - `pnpm --filter @threadlabs/looma-storybook build`: pass
- Re-verified after light-DOM reset + typography contract update:
  - `pnpm --filter @threadlabs/looma-storybook build`: pass
  - `pnpm --filter @threadlabs/looma-docs build`: pass
- Re-verified after formal convention + utility pattern docs:
  - `pnpm --filter @threadlabs/looma-storybook build`: pass
  - `pnpm --filter @threadlabs/looma-docs build`: pass
- Re-verified after font stack preset utilities/docs:
  - `pnpm --filter @threadlabs/looma-storybook build`: pass
  - `pnpm --filter @threadlabs/looma-docs build`: pass
- Re-verified after hybrid layer strategy:
  - `pnpm --filter @threadlabs/looma-storybook build`: pass
  - `pnpm --filter @threadlabs/looma-docs build`: pass
- Notes:
  - Storybook emits non-blocking upstream warnings (`eval` and large chunk warnings) during build.

## Risks / Blockers

- Protected npm release identity, 2FA/bootstrap controls, accountable approvers,
  and repository environments are proven for the singleton facade package.
- Candidate `0.1.10` is published and hosted-docs-qualified; exact Knit
  public-registry qualification and `latest` promotion remain open.
- Shared editor UX still has open defects found through Knit dogfooding. See `docs/editor-bugs.md`.
- Generated docs/storybook build artifacts are tracked in this repo and change alongside source edits.
- The responsive-image facade still requires a committed source revision and
  accountable npm, documentation, and Knit approval owners before the protected
  `release:verify` gate can mark it eligible.

## Next Up

Complete package/facade qualification for the responsive-image seam, release its
exact verified facade, then consume that version in Knit and run Knit's image
upload, delivery, viewer, and fallback gates.

Release order and evidence gates live in `docs/release-checklist.md`; product
milestones remain in `docs/milestones.md`.

1. Configure and verify the protected npm release environment, accountable
   approvers, 2FA/bootstrap controls, and publish rights for all five names.
2. With explicit owner authorization, run the exact Candidate workflow from a
   successful `main` CI commit and publish only under `candidate`.
3. Run credential-free public consumers, hosted-docs proof, and Knit
   public-registry qualification against those immutable versions.
4. Promote the same bytes to `latest` only after approval, then write the
   immutable tag, GitHub Release, manifest, and promotion ledger.
5. Resume the Knit primitive replacement and editor-defect queues without
   expanding the Release 1 package boundary.
