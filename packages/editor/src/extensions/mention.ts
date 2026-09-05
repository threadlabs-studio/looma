import Mention from "@tiptap/extension-mention";
import type { AnyExtension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import {
  filterLoomaMentionItems,
  normalizeMentionResultLimit,
  type LoomaMentionItem,
  type LoomaMentionMenuSnapshot,
  type LoomaMentionOptions,
} from "../mention-contract";

export * from "../mention-contract";

interface MentionPluginState {
  active?: boolean;
  query?: string | null;
  range?: { from: number; to: number };
}

const EMPTY_STATE: LoomaMentionMenuSnapshot = {
  active: false,
  items: [],
  selectedIndex: 0,
  query: "",
  rect: null,
  loading: false,
  highlight: null,
  select: null,
};

export const LoomaMentionSuggestionPluginKey = new PluginKey<MentionPluginState>(
  "loomaMentionSuggestion",
);

const LoomaMentionNode = Mention.extend({
  addAttributes() {
    const parentAttributes = (this.parent?.() ?? {}) as Record<string, unknown>;
    const { mentionSuggestionChar: _trigger, ...durableAttributes } = parentAttributes;
    return durableAttributes;
  },
});

async function resolveMentionItems(
  source: LoomaMentionOptions["items"],
  query: string,
  limit: number,
): Promise<LoomaMentionItem[]> {
  try {
    const resolved = typeof source === "function"
      ? await source(query, { limit })
      : source ?? [];
    return filterLoomaMentionItems(resolved, query, limit);
  } catch {
    return [];
  }
}

/**
 * Domain-neutral Tiptap mention node and suggestion lifecycle. Applications
 * provide either a small static list or a bounded async directory provider.
 */
export function createLoomaMentionExtension(
  options: LoomaMentionOptions = {},
): AnyExtension {
  const limit = normalizeMentionResultLimit(options.limit);
  const menuId = options.menuId ?? "ui-editor-mention-menu";

  return LoomaMentionNode.configure({
    HTMLAttributes: { class: "looma-mention" },
    renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
    renderHTML: ({ options: mentionOptions, node }) => [
      "span",
      mentionOptions.HTMLAttributes,
      `@${node.attrs.label ?? node.attrs.id}`,
    ],
    suggestion: {
      pluginKey: LoomaMentionSuggestionPluginKey,
      char: "@",
      allowSpaces: false,
      startOfLine: false,
      items: ({ query }) => resolveMentionItems(options.items, query, limit),
      render: () => {
        let selectedIndex = 0;
        let currentProps: SuggestionProps<LoomaMentionItem> | null = null;
        let dismissedFrom: number | null = null;
        let a11yOwner: HTMLElement | null = null;
        const previousA11y = new Map<string, string | null>();

        const restoreEditorA11y = () => {
          if (!a11yOwner) return;
          for (const [name, value] of previousA11y) {
            if (value === null) a11yOwner.removeAttribute(name);
            else a11yOwner.setAttribute(name, value);
          }
          previousA11y.clear();
          a11yOwner = null;
        };

        const syncEditorA11y = (props: SuggestionProps<LoomaMentionItem>) => {
          const owner = props.editor.view.dom;
          if (a11yOwner !== owner) {
            restoreEditorA11y();
            a11yOwner = owner;
            for (const name of [
              "aria-autocomplete",
              "aria-controls",
              "aria-expanded",
              "aria-activedescendant",
            ]) previousA11y.set(name, owner.getAttribute(name));
          }
          owner.setAttribute("aria-autocomplete", "list");
          owner.setAttribute("aria-controls", menuId);
          owner.setAttribute("aria-expanded", "true");
          if (props.items[selectedIndex]) {
            owner.setAttribute("aria-activedescendant", `${menuId}-option-${selectedIndex}`);
          } else {
            owner.removeAttribute("aria-activedescendant");
          }
        };

        const isCurrent = (props: SuggestionProps<LoomaMentionItem>) => {
          const state = LoomaMentionSuggestionPluginKey.getState(
            props.editor.state,
          ) as MentionPluginState | undefined;
          return state?.active === true
            && state.query === props.query
            && state.range?.from === props.range.from
            && state.range?.to === props.range.to;
        };

        const publish = (
          props: SuggestionProps<LoomaMentionItem> | null,
          loading = false,
        ) => {
          if (!props) {
            restoreEditorA11y();
            options.onStateChange?.({ ...EMPTY_STATE });
            return;
          }
          if (!isCurrent(props) || dismissedFrom === props.range.from) return;

          if (!loading && props.items.length === 0) restoreEditorA11y();
          else syncEditorA11y(props);

          options.onStateChange?.({
            active: true,
            items: props.items,
            selectedIndex,
            query: props.query,
            rect: props.clientRect?.() ?? null,
            loading,
            highlight: (index) => {
              if (index >= 0 && index < props.items.length) {
                selectedIndex = index;
                syncEditorA11y(props);
              }
            },
            select: (index) => {
              const item = props.items[index];
              if (item) props.command({ id: item.id, label: item.label });
            },
          });
        };

        return {
          onBeforeStart: (props) => {
            currentProps = props;
            selectedIndex = 0;
            publish(props, true);
          },
          onStart: (props) => {
            if (!isCurrent(props) || dismissedFrom === props.range.from) return;
            currentProps = props;
            selectedIndex = 0;
            publish(props);
          },
          onBeforeUpdate: (props) => {
            if (dismissedFrom === props.range.from) return;
            currentProps = props;
            selectedIndex = 0;
            publish(props, true);
          },
          onUpdate: (props) => {
            if (!isCurrent(props) || dismissedFrom === props.range.from) return;
            currentProps = props;
            if (selectedIndex >= props.items.length) selectedIndex = 0;
            publish(props);
          },
          onKeyDown: ({ event, range }: SuggestionKeyDownProps) => {
            if (event.key === "Escape") {
              dismissedFrom = range.from;
              currentProps = null;
              publish(null);
              return true;
            }
            if (!currentProps) return false;
            if (event.key === "ArrowDown") {
              if (currentProps.items.length === 0) return false;
              selectedIndex = (selectedIndex + 1)
                % Math.max(1, currentProps.items.length);
              publish(currentProps);
              return true;
            }
            if (event.key === "ArrowUp") {
              if (currentProps.items.length === 0) return false;
              selectedIndex = (selectedIndex - 1 + currentProps.items.length)
                % Math.max(1, currentProps.items.length);
              publish(currentProps);
              return true;
            }
            if (event.key === "Enter") {
              const item = currentProps.items[selectedIndex];
              if (!item) return false;
              currentProps.command({ id: item.id, label: item.label });
              return true;
            }
            return false;
          },
          onExit: () => {
            dismissedFrom = null;
            currentProps = null;
            publish(null);
          },
        };
      },
    },
  });
}
