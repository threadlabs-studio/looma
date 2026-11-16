/** Keys used by vertical collection navigation. Horizontal widgets translate their arrow keys.
 * @type {readonly string[]}
 */
export const collectionNavigationKeys = Object.freeze(["ArrowDown", "ArrowUp", "Home", "End"]);

/** Return the original indices of enabled options, in their authored order.
 * @param {ReadonlyArray<{ disabled?: boolean }>} options
 * @contract Recompute when the option order or disabled state changes.
 */
export function enabledOptionIndices(options) {
  return options.flatMap((option, index) => option.disabled ? [] : [index]);
}

/** Resolve a navigation key to a source index, or -1 when the collection or key has no destination.
 * @param {readonly number[]} indices Eligible source indices in navigation order.
 * @param {number} active Active source index, or -1 if no option is active.
 * @param {string} key A collection navigation key.
 * @param {{ wrap?: boolean }} [options] Wrap across edges when selected; otherwise clamp.
 * @ownership The caller applies focus, updates active state, and decides whether to commit.
 */
export function nextActiveIndex(indices, active, key, { wrap = false } = {}) {
  const next = nextCollectionPosition(indices.length, indices.indexOf(active), key, wrap);
  return indices[next] ?? -1;
}

/** Move through an already filtered collection without allocating an index array.
 * @param {number} length Number of eligible items.
 * @param {number} current Position in the eligible collection, or -1.
 * @param {string} key A collection navigation key.
 * @param {boolean} wrap Whether to wrap at either edge.
 */
export function nextCollectionPosition(length, current, key, wrap) {
  const last = length - 1;
  if (last < 0) return -1;
  if (key === "Home") return 0;
  if (key === "End") return last;
  if (key === "ArrowDown") return current === last && wrap ? 0 : Math.min(current + 1, last);
  if (key === "ArrowUp") return current < 0 || (current === 0 && wrap) ? last : Math.max(current - 1, 0);
  return -1;
}
