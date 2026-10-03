# Square icon badges

Add shape="square" to Badge for a non-interactive icon or single-glyph mark
beside a heading. Existing pill, tag and dot shapes and defaults stay unchanged.
Reuse all current tone/variant recipes; a new visual primitive is unnecessary.
Badge already owns compact non-interactive marks and their contrast. Avatar
owns person/image identities, and IconButton owns actions; neither is a heading
mark. Square uses a fixed equal inline/block size, the global medium radius and
spacing scale. md is32px and xs24px at default spacing; an optional local
--ui-badge-square-size hook customizes both dimensions together. The hook must
not inherit into nested badges. The label remains visible; hide decorative
badges from assistive technology when adjacent text names them. Longer labels
continue to use pill or tag. No selection, button, tab stop, external margin or
live status is introduced. HTML/Vue, SSR,375px, theme radius/spacing changes,
forced colors, default badge regression and nested hook isolation are proof.
