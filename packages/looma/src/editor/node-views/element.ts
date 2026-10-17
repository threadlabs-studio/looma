/**
 * A generated component's root as the DOM sees it. HTML Next's generated Vanilla element types
 * accept only the component's own events, which makes them unassignable to `Node`; widening keeps
 * the roots usable as children and with native events until the generated types include the
 * native event map.
 */
export const element = (root: HTMLElement): HTMLElement => root;
