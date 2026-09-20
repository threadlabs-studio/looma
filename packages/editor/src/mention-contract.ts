export const DEFAULT_MENTION_RESULT_LIMIT = 8;
export const MAX_MENTION_RESULT_LIMIT = 20;

/**
 * Application-owned identity and display data for one mention candidate.
 * Looma persists `id` and `label` in the editor document; `detail` and
 * `initials` are presentation hints and are not part of mention identity.
 */
export interface LoomaMentionItem {
  id: string;
  label: string;
  detail?: string;
  initials?: string;
}

export interface LoomaMentionProviderContext {
  limit: number;
}

/**
 * Resolves candidates for the current query.
 *
 * Providers may perform asynchronous directory lookup, but should return no
 * more than `context.limit`. The extension also clamps and filters results so a
 * provider cannot accidentally create an unbounded suggestion surface.
 */
export type LoomaMentionProvider = (
  query: string,
  context: LoomaMentionProviderContext,
) => readonly LoomaMentionItem[] | Promise<readonly LoomaMentionItem[]>;

/**
 * Complete render state handed from the headless Tiptap extension to UI chrome.
 *
 * The snapshot owns selection commands only while `active` is true. Consumers
 * should replace, not merge, snapshots: callbacks and rectangles are tied to a
 * particular suggestion range and become stale as soon as the query changes.
 */
export interface LoomaMentionMenuSnapshot {
  active: boolean;
  items: LoomaMentionItem[];
  selectedIndex: number;
  query: string;
  rect: DOMRect | null;
  loading: boolean;
  highlight: ((index: number) => void) | null;
  select: ((index: number) => void) | null;
}

/**
 * Mention policy supplied by the application.
 *
 * Looma owns suggestion mechanics and accessibility state; the application
 * owns the directory and may render the snapshot with Looma's menu or custom
 * UI. `menuId` must match that UI's listbox id so `aria-controls` and
 * `aria-activedescendant` reference real elements.
 */
export interface LoomaMentionOptions {
  items?: readonly LoomaMentionItem[] | LoomaMentionProvider;
  limit?: number;
  menuId?: string;
  onStateChange?: (state: LoomaMentionMenuSnapshot) => void;
}

/** Clamps public/provider limits so keyboard navigation remains predictably bounded. */
export function normalizeMentionResultLimit(limit = DEFAULT_MENTION_RESULT_LIMIT): number {
  if (!Number.isFinite(limit)) return DEFAULT_MENTION_RESULT_LIMIT;
  return Math.min(MAX_MENTION_RESULT_LIMIT, Math.max(1, Math.trunc(limit)));
}

/**
 * Applies Looma's local fallback matching to static or provider results.
 * Matching is intentionally limited to display text; stable ids and arbitrary
 * metadata must not become discoverable search fields by accident.
 */
export function filterLoomaMentionItems(
  items: readonly LoomaMentionItem[],
  query: string,
  limit = DEFAULT_MENTION_RESULT_LIMIT,
): LoomaMentionItem[] {
  const normalized = query.trim().toLocaleLowerCase();
  const boundedLimit = normalizeMentionResultLimit(limit);
  return items
    .filter((item) => {
      if (!normalized) return true;
      return item.label.toLocaleLowerCase().includes(normalized)
        || item.detail?.toLocaleLowerCase().includes(normalized);
    })
    .slice(0, boundedLimit);
}
