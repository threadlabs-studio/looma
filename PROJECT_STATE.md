# PROJECT_STATE

Last Updated: 2026-03-28 (planning sync)
Status: Active

## Current Focus

- Keep planning docs aligned with actual shipped Looma surface and current Knit migration status.
- Continue the Knit primitive replacement wave where Looma primitives are already viable.
- Start M6 promotions from Knit only after generic API extraction is clear (`FloatingActionButton`, command/search shell, generic search result row, top bar shell).
- Move `@looma/editor` from shipped Phase 1 primitives into real app integration, starting with Knit table UI wiring.
- Keep Storybook and Docusaurus taxonomy/naming aligned (human labels, stable `ui-*` ids).

## Recent Progress

- Planning sync:
  - React and Vue wrapper parity for current shipped core tags is complete; old parity follow-up notes are now stale.
  - Verified Knit now consumes Looma `ToastRegion`, `Dialog`, `Button`, `Input`, `FormField`, `Menu`, and `MenuItem` in several high-use flows.
  - Knit page editing now uses `@looma/editor` Phase 1 table primitives and Looma’s shared extension preset; broader editor UI migration is still incomplete.
- @looma/core fully rebuilt with Stencil:
  - All 18 components converted; vanilla impl removed; `packages/core-stencil` deleted.
  - Strong contracts, no MutationObservers, shadow DOM per component.
  - Consumers call `defineCustomElements()` from `@looma/core/loader`; main entry exports overlay manager.
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
  - Added `handleTableOverlayAction(editor, detail)` in `@looma/editor/extensions` to map overlay boundary clicks to exact Tiptap `addRowBefore`/`addRowAfter`/`addColumnBefore`/`addColumnAfter` commands.
  - Added CodeBlock to `getDefaultEditorExtensions()` preset (basic code block; apps can replace with CodeBlockLowlight for syntax highlighting).
  - Consolidated extensions export: `@looma/editor/extensions` now exports preset + table-commands from a single entry point.
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
  - Updated Storybook `preview.ts` to load editor source directly from `packages/editor/src` (`editor.css` + `index`) instead of `@looma/editor` dist imports, preventing stale-dist dynamic import failures.
  - Renamed all component story titles from `Group/ui-*` to human labels (for example `Layout/Cluster`, `Essentials/Form Field`, `Primitives/Toast Region`).
  - Reorganized docs sidebar component categories to `Layout`, `Primitives`, and `Essentials` to match Storybook taxonomy.
  - Updated all `apps/docs/docs/components/ui-*.mdx` H1 headings from `ui-*` slugs to human names while keeping component ids/tags unchanged.
- Editor Storybook workflow added:
  - Added `Editor/Table Primitives Playground` story in `apps/storybook/stories/editor/table-primitives-playground.stories.ts` for `ui-editor-table-context-menu`, `ui-editor-insert-table-grid`, and `ui-editor-table-overlay`.
  - Added live event log wiring in-story for `looma-editor-table-action`, `looma-editor-insert-table`, and `looma-editor-table-overlay-action`.
  - Updated Storybook preview to load `@looma/editor` and `@looma/editor/editor.css` globally and include an `Editor` story section in sort order.
- Editor Phase 1 table UI + adapter wiring progress:
  - Added `ui-editor-table-overlay` web component with row/column boundary "+" controls and `looma-editor-table-overlay-action` events.
  - Added Vue/React editor wrappers (`EditorTableContextMenu`, `EditorInsertTableGrid`, `EditorTableOverlay`) and typed callbacks for table events (`onTableAction`, `onInsertTable`, `onTableOverlayAction`).
  - Updated editor/component roadmaps and `@looma/editor` README to reflect shipped table overlay + adapter event wiring.
- Editor parity progress in `@looma/editor`:
  - Added inline code support (`@tiptap/extension-code`) to `getDefaultEditorExtensions()`.
  - Added a Looma list behavior extension to keep Enter in list/task items and exit empty list items with Backspace.
  - Updated editor roadmap/README status snapshots to reflect shipped extension-level behavior.
- Looma pivot foundation updates completed:
  - Migrated package scope and imports across workspace from `@ui/*` to `@looma/*`.
  - Rebranded docs/site metadata from Granola to Looma and updated docs-domain placeholder.
  - Added cross-project rules clarifying Looma/Knit boundaries and promotion expectations.
- Vue adapter parity + verification improvements:
  - Added Vue exports for `RadioGroup`, `Radio`, `Badge`, and `Avatar` in `packages/vue/src/index.ts`.
  - Added real Vue adapter tests in `packages/vue/src/index.test.ts` and enabled `vitest` test script in `packages/vue/package.json`.
  - Updated adapter parity docs to reflect current Vue export coverage.
- Docs positioning updates:
  - Added official Knit relationship statement + link (`https://knit.wiki`) in docs.
  - Added subtle Knit-style icon treatment in component examples while keeping API wording generic.
- M5 core expansion completed for `@looma/core`:
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

- Re-verified after Looma pivot foundation updates:
  - `pnpm install --no-frozen-lockfile`: pass
  - `pnpm typecheck`: pass
  - `pnpm --filter @looma/vue test`: pass
  - `pnpm build:docs`: pass
  - `pnpm build:storybook`: pass
  - Stale token scan (`Granola`, `granola`, `@ui/` across tracked files): no matches
- `pnpm generate:api`: pass
- `pnpm check:docs-sync`: pass
- Workspace `pnpm typecheck`: pass
- Workspace `pnpm build`: pass
- Workspace `pnpm test`: pass
- `@looma/docs` build: pass
- `@looma/storybook` build: pass
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
  - `pnpm --filter @looma/editor typecheck`: pass
  - `pnpm --filter @looma/editor build`: pass
- Re-verified after editor table overlay + adapter wiring updates:
  - `pnpm install --no-frozen-lockfile`: pass
  - `pnpm --filter @looma/editor typecheck`: pass
  - `pnpm --filter @looma/editor build`: pass
  - `pnpm --filter @looma/vue typecheck`: pass
  - `pnpm --filter @looma/vue build`: pass
  - `pnpm --filter @looma/vue test`: pass
  - `pnpm --filter @looma/react typecheck`: pass
  - `pnpm --filter @looma/react build`: pass
- Re-verified after Storybook editor playground setup:
  - `pnpm install --no-frozen-lockfile`: pass
  - `pnpm --filter @looma/storybook build`: pass
- Re-verified after docs/storybook naming and grouping alignment:
  - `pnpm --filter @looma/storybook build`: pass
  - `pnpm --filter @looma/docs build`: pass
- Re-verified after semantic taxonomy reset (`Forms/Overlay/Display`):
  - `pnpm --filter @looma/storybook build`: pass
  - `pnpm --filter @looma/docs build`: pass
- Re-verified after Storybook styling reliability fix:
  - `pnpm --filter @looma/storybook build`: pass
- Re-verified after light-DOM reset + typography contract update:
  - `pnpm --filter @looma/storybook build`: pass
  - `pnpm --filter @looma/docs build`: pass
- Re-verified after formal convention + utility pattern docs:
  - `pnpm --filter @looma/storybook build`: pass
  - `pnpm --filter @looma/docs build`: pass
- Re-verified after font stack preset utilities/docs:
  - `pnpm --filter @looma/storybook build`: pass
  - `pnpm --filter @looma/docs build`: pass
- Re-verified after hybrid layer strategy:
  - `pnpm --filter @looma/storybook build`: pass
  - `pnpm --filter @looma/docs build`: pass
- Notes:
  - Storybook emits non-blocking upstream warnings (`eval` and large chunk warnings) during build.

## Risks / Blockers

- No blocking issues right now.
- Generated docs/storybook build artifacts are tracked in this repo and change alongside source edits.

## Next Up

Execution order + done gates live in `docs/milestones.md`.

1. Finish the Knit primitive replacement wave beyond the already-migrated toast, dialog base, toolbar button, and tree menus.
2. Harden the Knit `@looma/editor` integration and continue migrating the remaining editor UI that should move out of app-local ownership.
3. Continue the M6 promotion queue from Knit, with `FloatingActionButton`, the top bar shell, and the search shell already shipped, and the generic search result row next.
4. Keep `docs/component-roadmap.md`, `docs/editor-roadmap.md`, and `knit/docs/looma-migration-inventory.md` synchronized as migration status changes.
5. Add a docs/storybook convention note to keep future component labels human-readable while preserving stable `ui-*` doc ids and tags.
