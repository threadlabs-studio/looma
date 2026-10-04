# Changelog

## Unreleased

- Contextual formatting gives slash-command and mention suggestions priority, so their results remain clickable.
- Trees retain a keyboard entry point when row controllers load later or a hidden tree becomes visible, preserving the last focused row.
- Contextual editor controls stay inside the document area rather than covering actions above it; link actions share that surface without covering formatting commands.

- Component text uses `{$variable}` for inline values and slot fallbacks. IDs and accessible labels use `concat()`; Intl `format()` is reserved for localized presentation.
- Meters without `valueText` announce a whole percentage in the current browser or server locale, so assistive technology reads the appropriate digits and spacing. Explicit `valueText` stays verbatim, and fill widths remain locale-independent CSS percentages.
- IconButton can match an adjacent Button’s height with `matchButton` (`match-button` in HTML), including themed sizes and touch controls. Compact icon buttons keep their existing sizes.

- Touch tree rows keep labels separate from actions after tapping, including RTL and multiple selection.
- Touch input text stays readable inside small captions without disabling browser zoom.
- Editors can opt into a contextual toolbar with full commands at a focused caret or text selection; the existing mobile dock remains unchanged.
- Resizing a table column no longer adds a one-pixel scrollbar when the drag ends. Repeated reconciliation keeps fitting tables within the editor and preserves scrolling for wide tables.

- Badge and combobox chip labels retain room for their full text, including descenders, while long labels still ellipsize.
- Long badge and combobox chip labels truncate with an ellipsis inside their surface, preserving their full accessible text.
- Radio Group's value consistently owns initial selection and form-reset selection in HTML and Vue, even when a child Radio is authored checked. The disabled example declares its selection on the group.

- Combobox can highlight a sole authored suggestion and commit it with Tab while preserving normal focus movement. Both behaviors are opt-in.

