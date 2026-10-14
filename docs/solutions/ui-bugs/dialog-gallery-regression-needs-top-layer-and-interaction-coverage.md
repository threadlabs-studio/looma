---
title: Dialog gallery regressions need top-layer and interaction coverage
date: 2026-10-03
category: ui-bugs
module: overlays
problem_type: ui_bug
component: frontend
severity: high
symptoms:
  - "An open gallery dialog jumped between viewport and card coordinates when hovered."
  - "A neighboring card painted above the dialog."
  - "Dialog content lost its padding despite passing browser tests."
root_cause: missing_validation
resolution_type: code_fix
tags: [dialog, top-layer, scoped-css, visual-regression, hover, docs]
---

# Dialog gallery regressions need top-layer and interaction coverage

## Problem

The production component gallery shipped a flashing, obscured dialog with unpadded content. Two independent implementation regressions passed checks that did not exercise the affected presentation context. The correction described here is locally verified and pending merge as of this writing.

## Symptoms

- Hovering an open dialog changed its position between the viewport and its card.
- The adjacent card could cover dialog content.
- The body computed padding was zero.

## What Didn't Work

Passing detail-page open, close, focus, and long-content scrolling checks did not establish gallery correctness. The earlier suite had no Dialog screenshot baseline, gallery hover-position assertion, or paint-order assertion. Its reduced-motion setting also omitted normal transitions. Existing editor screenshots were evidence for those editor cases, not for Dialog.

Docs had additionally forced several floating examples into card coordinates through CSS. Those exceptions concealed whether previews exercised the actual presentation contract. Increasing z-index would not escape a transformed ancestor's containing block or stacking context.

## Solution

Separate modality from presentation. The pending shared helper in `packages/looma/src/components/shared/overlay.js` uses native modal presentation for modal dialogs and manual popover presentation for nonmodal dialogs:

```js
dialog.showModal(); // Modal top layer.
// Nonmodal top layer:
dialog.setAttribute("popover", "manual");
dialog.show();
dialog.showPopover();
```

The helper also coordinates close, invoker focus return, and mode changes. Anchored floating surfaces share a document-scoped capture scroll/resize pass and viewport containment; DOM ownership remains intact while browser presentation escapes ancestors.

Dialog now owns an ordinary padded wrapper around the nested ScrollArea (`packages/looma/src/components/ui-dialog/ui-dialog.html:43`):

```html
<div class="body" $ref="body"><ui-scroll-area from:trim="true"><slot></slot></ui-scroll-area></div>
```

Always-open floating docs examples use isolated preview documents with real top layers. Triggered Dialog examples use the gallery document's top layer.

Isolation checks the authored example tree too: a Menu Item or command group can be wrapped in an open popup even when the documented component is not itself floating. Restricting isolation to the outer component's tag left these compound-part examples at page coordinates; full-catalog visual review exposed the empty stages and displaced menus before merge.

The first correction still left the action bottom gutter at 12px against 24px sides, and accumulated body padding plus a trailing paragraph margin made short dialogs too tall. The initial visual review missed these differences. Footer padding now matches the side gutter; ScrollArea owns an additive `trim` option because Dialog's CSS cannot cross the nested component boundary to reset projected margins. Gallery tests assert the bottom gutter and trailing margin as well as comparing images.

Content height remains intrinsic, with only the body scrolling at the viewport cap. A ResizeObserver watches the intrinsic content wrapper and pinned regions, rather than the constrained viewport, to avoid animation feedback. Height transitions retarget from the current rendered height, release their override on completion, and cancel for reduced motion. HTML and Vue checks sample intermediate heights during growth, shrinkage, interrupted resizing, and transitions to and from the viewport cap.

## Why This Works

[PR #223](https://github.com/threadlabs-studio/looma/pull/223) restored the intentional nonmodal default, switching to native `show()`. That path left presentation in the ordinary page layer. The gallery already transformed cards on hover. The transform changed the dialog's containing block, moving it away from the pointer; losing hover reversed the change, creating a feedback loop. The same ordinary stacking allowed neighboring cards to cover it. Native top-layer presentation escapes both effects without making the dialog modal.

[PR #227](https://github.com/threadlabs-studio/looma/pull/227) replaced an ordinary body wrapper with a nested component root. HTML Next's generated CSS scope excludes nested component roots, so the parent Dialog's `.body` padding rule stopped matching. Restoring an ordinary wrapper respects that boundary.

Green main CI allowed docs deployment because its assertions missed these failures. A passing suite was incorrectly treated as evidence that the gallery had been visually verified.

## Prevention

The gallery tests in `apps/docs/tests/release-docs.spec.ts` enable normal motion, move the pointer across the affected card/dialog, sample position and hit testing over 60 frames, and verify padding and focus return. The canonical visual suite in `apps/docs/tests/visual.spec.ts` compares desktop/mobile, light/dark Dialog baselines in the pinned Linux rendering environment. Package tests also exercise transformed/clipped parents and covering siblings. CI retains failed browser images and traces.

When changing an overlay's presentation path or replacing a styled wrapper with a nested component, inspect the composed gallery context and assert actual computed geometry and paint order. An isolated example and a green interaction suite are insufficient evidence.
