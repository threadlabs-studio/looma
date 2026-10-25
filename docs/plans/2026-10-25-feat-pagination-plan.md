---
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---
# Pagination

## Goal Capsule
Applications can provide accessible, compact navigation through result pages using Looma.
Deliver each component in its own PR, with review, visual evidence or a testable preview, and merge before the next component.

## Product Contract
### Requirements
- R1. Render a named native navigation landmark and native page controls before JavaScript. Optional hrefs produce real links, usable without an upgrade.
- R2. The consumer owns the positive one-based `page`, the visible page records, and whether previous/next are available. No fabricated total or automatic data fetching. Numbered records contain `value` and optional `href`; gaps between supplied numbers render a noninteractive ellipsis.
- R3. Emit `navigate` with requested `page`, `previousPage`, and interaction `trigger`. Emit no request for current, disabled or invalid targets. Preserve native link behavior and modified clicks.
- R4. Reuse Button, Icon and Cluster options. Current page uses a solid accent action; other pages use quiet neutral actions. Use Button’s opt-in square minimum footprint for both numbers and navigation; longer numbers may grow. Match shared sm/md/lg sizes, preserve native tab order, and wrap at narrow widths. No new stylesheet or allowlist expansion.
- R5. Localize the landmark, previous/next accessible labels and page label prefix through string props. Expose the current page with aria-current. Provide unknown-total and routed-link examples.
- R6. Every PR carries an app-agnostic SVG design mockup and local interactive-preview instructions. Screenshots remain under .context. Complete focused SSR/interaction/browser checks and review before merge.

## Planning Contract
KTD1 (implementation choice). Author ui-pagination in HTML Next, using existing primitives. Visible pages are a consumer-supplied list of {value, href?}; this supports route ownership and bounded page windows without an unbounded client-generated list.
KTD2 (implementation choice). Previous/next availability is explicit. Their page requests use current page minus/plus one; the application supplies optional native destinations. Cursor retrieval remains outside the component.
KTD3 (implementation choice). The controller only reports activation; the template owns all presentation and ARIA. Track keyboard/pointer/programmatic causes with the existing shared helper. Native modified link clicks navigate without reporting an in-place page request.

## Implementation Units
### U1. Source and examples
Add packages/looma/src/components/ui-pagination/{ui-pagination.html,ui-pagination.js,docs.json,examples/*}. Add the navigate schema to docs/event-schema.md and an entry under CHANGELOG.md Next release. Regenerate component API metadata. Do not change unrelated historical roadmap decisions.
### U2. Qualification and presentation
Add focused SSR and controller/browser tests and a docs/previews/pagination.svg mockup showing desktop and narrow layouts. Review neighboring Button/Table/Cluster treatment. Record the exact checks in the PR and provide a docs preview command and route.

## Verification Contract
Run pnpm generate:api; pnpm --filter @threadlabs/looma build; focused Vitest SSR and browser/controller regressions with one worker; pnpm typecheck; pnpm lint; pnpm check:code-documentation; formatting checks on edited files; git diff --check. Use package-generated documentation for the interactive preview. CI decides remaining affected qualification. Never merge failing required checks.

## Definition of Done
Each requirement has implementation and evidence. The PR includes a mockup or usable preview, review is complete, required CI passes, and the authorized merge is verified. No private consumer names, code or screenshots enter tracked files. The next component starts from the newly merged main.
