# Image selection and editing

Clicking or tapping an image selects its whole document node and reveals one compact editing
bar, comparable to the existing table controls. The bar offers block placement, centering,
left/right text wrapping, a secondary description action, and deletion. Active placement is
visible and announced. Sizing is direct manipulation: drag any corner, with the intrinsic aspect
ratio locked. No size form is part of this flow.

The approved shared `ui-image` primitive owns its semantic figure, media, selected outline, and
four corner handles. Its `src`, `alt`, `width`, `height`, `placement`, `selected`, and `resizable`
props compose with optional `media` and `controls` slots. A media slot may supply browser delivery
attributes without changing durable image data. Without JavaScript the default image remains
meaningful. Selection and resizing are opt-in.

Resize events carry `{ width, height, phase, trigger }`. Preview never changes editor JSON.
Release commits once; Escape, pointer cancellation, loss of capture, or a conflicting update
restore the original geometry. Resizing fits the containing document. Keyboard users can focus a
handle and use arrows, with Shift for larger increments. Destruction releases capture and
listeners. The editor owns persistence and undo boundaries.

The editor composes the bar from EditorToolbar and IconButton, and its description field from
Popover, FormField, Input, Button, Stack, and Cluster. Text establishes the shared UI font even
when the toolbar is rendered outside the editor. This follows the table's one-bar hierarchy and
shared roving focus rather than adding a separate image settings surface. Description editing
accepts plain text, begins with the saved value, saves to the selected image, and discards changes
on Cancel, Escape, or selecting another node.

The neighbouring table overlay already owns spatial handles and emits intent; this primitive
uses the same border/focus/spacing tokens and touch targets. Following paragraphs flow beside a
wrapped image and resume full width below it. A shared layout wrapper contains floats at the
editor boundary. Reading mode retains placement and viewer activation and hides author controls.
Phone review covers 375px, touch selection, bar placement, description popup, and image bounds.

Image attributes round-trip in JSON and HTML; transient rendition URLs, roles, tab stops, and
handles never enter saved content. Headless hosts retain the existing image name/insertion
command and may provide their own node view. The new primitive's two source files are the only
new style owners; frozen editor CSS and inline-style exceptions remain unchanged.
