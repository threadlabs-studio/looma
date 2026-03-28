# Milestone Plan

Last updated: 2026-03-28

This file has two jobs:

- Preserve the historical Looma foundation milestones that are already complete.
- Define the current staged execution plan with explicit done gates.

## Historical Milestones (Complete)

- M0 Specs and Skeleton: complete
- M1 Tokens + Layout: complete
- M2 Core Primitives: complete
- M3 Styled Essentials: complete
- M4 Adapters + Docs: complete
- M5 Expansion (`ui-tooltip`, `ui-toast-region`, `ui-checkbox`, `ui-switch`): complete

These milestones established the current shipped core surface. See `PROJECT_STATE.md` for detailed verification history.

## Current Staged Plan

### Stage 1: Finish Knit Primitive Replacement Wave

Goal: finish the migration of the obvious high-use Knit surfaces onto Looma primitives without changing Knit semantics.

Primary scope:

- Complete remaining `Button` / `Input` / `FormField` normalization in high-use Knit flows.
- Keep migrated surfaces visually aligned with Knit.
- Keep `docs/component-roadmap.md` and `knit/docs/looma-migration-inventory.md` synchronized as each surface lands.

Done gate:

- Targeted Knit flows use Looma primitives for the agreed replacement wave.
- No regression in current Looma docs/storybook coverage for the affected primitives.
- `pnpm --filter @looma/docs build`: pass
- `pnpm --filter @looma/storybook build`: pass

### Stage 2: Integrate `@looma/editor` Phase 1 In Knit

Goal: move the editor plan from shipped Looma primitives to real app usage in Knit.

Primary scope:

- Replace Knit-local editor table UI pieces with Looma editor components where Phase 1 already exists.
- Replace Knit-local slash menu presentation with a Looma editor primitive while keeping Knit command/state ownership.
- Register Looma extension helpers from `@looma/editor/extensions` in Knit.
- Wire `handleTableOverlayAction(editor, detail)` in Knit.

Done gate:

- Knit imports and uses `@looma/editor` for shipped Phase 1 slash/table primitives.
- Knit no longer carries duplicate local implementations for the migrated Phase 1 editor surfaces.
- `pnpm --filter @looma/editor build`: pass
- Knit typecheck for the integrated editor flows: pass

### Stage 3: First M6 Promotions From Knit

Goal: promote the first clearly reusable Knit patterns into Looma with domain-neutral APIs.

Priority queue:

1. `FloatingActionButton`
2. Command/search shell
3. Generic search result row
4. Slot-based app top bar shell

Done gate for each promoted component:

- API is domain-neutral and passes the promotion checklist in `docs/component-roadmap.md`.
- Core implementation ships in Looma with contract README and generated API metadata.
- React and Vue adapters exist when the component needs wrappers.
- Docs page and Storybook story ship in the same change.

Stage completion gate:

- At least one M6 candidate is fully promoted and adopted back in Knit.

### Stage 4: Quality And Dogfooding Follow-Through

Goal: keep Looma authoritative and sustainable after the next migration wave.

Primary scope:

- Keep docs/storybook naming, examples, and generated API metadata aligned.
- Continue validating Looma against real Knit usage instead of synthetic-only examples.
- Identify whether the Docusaurus site shell should start consuming Looma components.

Done gate:

- Planning docs stay synchronized across `PROJECT_STATE.md`, `docs/component-roadmap.md`, `docs/editor-roadmap.md`, and Knit migration docs.
- Docs and Storybook builds remain green after the promotion/integration work.

## Practical Rule

Do not start a later stage before the previous stage has a credible pass on its done gate, unless the work is independent and clearly non-blocking.
