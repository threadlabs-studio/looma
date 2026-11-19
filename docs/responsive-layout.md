# Responsive Layout Contract

Looma layout primitives are intrinsic: they respond to the space supplied by
their parent instead of assuming a page-level viewport or requiring JavaScript
breakpoint state.

## Required behavior

- Layout hosts keep their declared flex, grid, or block display after the
  light-DOM reset is applied.
- Block-like primitives use the available inline size and may shrink to fit a
  flex or grid parent.
- `ui-grid` collapses to one column when its container is narrower than the
  selected column minimum. The column minimum must never create page-level
  horizontal overflow.
- `ui-container` fills the available inline size up to its measure, with gutters
  included in that measured box.
- `ui-switcher` changes from a row to a single column based on its own
  available inline size. Use the `start` and `end` slots with
  `balance="narrow-start"` or `balance="narrow-end"` to give one pane about
  a third of the row.
- `ui-sidebar` reserves a docked width and switches to a drawer below its
  viewport breakpoint. The parent places it beside the main content.
- `ui-reel` contains intentional horizontal overflow, remains keyboard
  focusable, and optionally exposes inline scroll snapping.
- `ui-scroll-area` scrolls content that outgrows it, vertically or sideways, and
  fades only the edges that hide content. Every Looma scroller shares its fade.
- Named spacing and measure attributes remain token-driven. Applications can
  tune the corresponding custom properties without coupling layout to a fixed
  viewport breakpoint.
- Looma's component layer supplies defaults. Later unlayered application CSS
  may theme or compose a primitive without disabling the primitive itself.

## Verification widths

Responsive examples and consuming applications should be checked at 320px,
375px, 768px, and 1280px. At each width, the page must have no unintended
horizontal overflow, clipped controls, overlapping text, or duplicate
navigation chrome.
