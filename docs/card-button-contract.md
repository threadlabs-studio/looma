# Card Button contract

CardButton is the card variant of one native Button presented as a full-width card action. It uses Button's existing tone palette and disabled, loading, focus, hover, link and form behavior. Its border has the same width and color on all sides; rounding never accompanies an emphasized single edge.

The icon slot is arbitrary consumer content. It and the main content align at the top. A grid gives the icon and action their intrinsic widths and the content the remaining width, with the standard space-3 gap. The action slot is vertically centered and defaults to the shared chevron-right Icon. The component owns equal logical inline padding. An omitted icon collapses its column and extra gap. A custom action is decorative content within the one control, never a nested button or link.

The shared Button primitive owns the additive card variant and all styling. Callers select it with Button variant="card" and use the same Button props and slots; no second control implementation is introduced. Existing Button defaults and variants remain unchanged. The icon slot does not add product-specific branding or dividers.

Separator gains an additive strong emphasis prop for compositions that need clearer separation; ordinary decorative dividers retain their current default.
