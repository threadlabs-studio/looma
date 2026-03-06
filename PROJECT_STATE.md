# PROJECT_STATE

Last Updated: 2026-03-06 10:13 PST
Status: Active

## Current Focus

- Complete Looma rebrand/scope migration (`@ui/*` -> `@looma/*`) and verify all workspace scripts after rename.
- Harden Vue adapter parity for Knit migration readiness while keeping public APIs app-agnostic.

## Recent Progress

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
- Notes:
  - Storybook emits non-blocking upstream warnings (`eval` and large chunk warnings) during build.

## Risks / Blockers

- No blocking issues right now.
- Generated docs/storybook build artifacts are tracked in this repo and change alongside source edits.

## Next Up

1. Start Knit primitive replacement wave (toast/dialog/menu/button/input) on top of Looma.
2. Close remaining React wrapper parity for `ui-radio-group`, `ui-radio`, `ui-badge`, and `ui-avatar`.
3. Define M6 promotion candidates from Knit (`AvatarGroup`, FAB, search/command shell).
