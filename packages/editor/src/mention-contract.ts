export const DEFAULT_MENTION_RESULT_LIMIT = 8;
export const MAX_MENTION_RESULT_LIMIT = 20;

export interface LoomaMentionItem {
  id: string;
  label: string;
  detail?: string;
  initials?: string;
}

export interface LoomaMentionProviderContext {
  limit: number;
}

export type LoomaMentionProvider = (
  query: string,
  context: LoomaMentionProviderContext,
) => readonly LoomaMentionItem[] | Promise<readonly LoomaMentionItem[]>;

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

export interface LoomaMentionOptions {
  items?: readonly LoomaMentionItem[] | LoomaMentionProvider;
  limit?: number;
  menuId?: string;
  onStateChange?: (state: LoomaMentionMenuSnapshot) => void;
}

export function normalizeMentionResultLimit(limit = DEFAULT_MENTION_RESULT_LIMIT): number {
  if (!Number.isFinite(limit)) return DEFAULT_MENTION_RESULT_LIMIT;
  return Math.min(MAX_MENTION_RESULT_LIMIT, Math.max(1, Math.trunc(limit)));
}

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
