import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, {
  SuggestionPluginKey,
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import type { LoomaIconName } from "../icons";
import type { LoomaCalloutTone } from "./callout";
import { insertTableAtRange } from "./table-commands";

/** Editor state a slash command may replace and then act upon. */
export interface LoomaSlashCommandContext {
  editor: Editor;
  range: Range;
}

/**
 * One application-extensible command.
 *
 * Commands own their editor mutation, including removal of `context.range`.
 * Keeping that policy in the command lets custom items behave exactly like
 * built-ins without coupling the headless suggestion lifecycle to Tiptap nodes.
 */
export interface LoomaSlashCommand {
  /** Stable identity, especially when two commands share a visible title. */
  id?: string;
  /** Optional visible category; absent categories render as ordinary rows. */
  group?: string;
  title: string;
  description: string;
  icon: LoomaIconName;
  keywords: string[];
  command: (context: LoomaSlashCommandContext) => void;
  /** Pure capability/context check. An unavailable command is omitted. */
  isAvailable?: (context: LoomaSlashCommandContext) => boolean;
}

/**
 * Ephemeral render model published to any slash-menu UI.
 * Replace snapshots rather than merging them: the `select` callback closes over
 * a particular Tiptap range and becomes invalid when the suggestion updates.
 *
 * @lifecycle `select` is valid only until the next snapshot or suggestion exit;
 * retaining it can apply a command to a stale source range.
 */
export interface LoomaSlashMenuSnapshot {
  active: boolean;
  items: LoomaSlashCommand[];
  selectedIndex: number;
  query: string;
  rect: DOMRect | null;
  /** Re-measures the current virtual anchor after scrolling; valid for this snapshot only. */
  getRect?: () => DOMRect | null;
  select: ((index: number) => void) | null;
  /** Keeps editor keyboard selection synchronized with a UI's hovered row. */
  highlight?: ((index: number) => void) | null;
}

/**
 * Application-owned command inventory and integration callbacks.
 * Replacing `commands` changes search and execution together; the extension
 * never merges domain commands into defaults implicitly. Asset selection stays
 * callback-driven because uploads and persistence are outside editor ownership.
 *
 * @ownership The application owns command objects and callback side effects;
 * the extension only searches the inventory and publishes replacement snapshots.
 */
export interface LoomaSlashCommandOptions {
  commands: LoomaSlashCommand[];
  onStateChange?: (state: LoomaSlashMenuSnapshot) => void;
  onOpenImagePicker?: () => void;
  onOpenChipEditor?: (editor: Editor, position: number) => void;
  onOpenLinkEditor?: () => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    loomaSlashCommand: {
      /** Dismiss current suggestions without removing the writer's query. */
      dismissLoomaSlashMenu: () => ReturnType;
    };
  }
}

const CALLOUT_COMMANDS: ReadonlyArray<{
  title: string;
  description: string;
  tone: LoomaCalloutTone;
  icon: LoomaIconName;
  keywords: string[];
}> = [
  {
    title: "Info",
    description: "Informational callout",
    tone: "info",
    icon: "info",
    keywords: ["info", "information", "callout", "panel"],
  },
  {
    title: "Note",
    description: "Highlighted note",
    tone: "note",
    icon: "notebook-pen",
    keywords: ["note", "callout", "panel"],
  },
  {
    title: "Warning",
    description: "Important warning",
    tone: "warning",
    icon: "triangle-alert",
    keywords: ["warning", "caution", "alert", "callout", "panel"],
  },
];

/**
 * Builds Looma's default command policy as fresh objects for one editor.
 * Image and link commands delegate their picker because Looma does not own
 * upload, persistence, or destination search. Link appears only when a picker
 * callback is supplied. Image follows the same rule, so a headless inventory
 * has no dead picker actions.
 *
 * @ownership Returned command objects belong to the caller and are recreated
 * per call so one editor cannot mutate another editor's command inventory.
 */
export function getDefaultSlashCommands(
  onOpenImagePicker?: () => void,
  onOpenChipEditor?: (editor: Editor, position: number) => void,
  onOpenLinkEditor?: () => void,
): LoomaSlashCommand[] {
  const commands: LoomaSlashCommand[] = [
    {
      title: "Text",
      description: "Plain paragraph",
      icon: "pilcrow",
      keywords: ["text", "paragraph", "plain", "p"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setParagraph().run();
      },
    },
    ...([1, 2, 3] as const).map((level) => ({
      title: `Heading ${level}`,
      description: level === 1 ? "Big section title" : level === 2 ? "Medium section title" : "Small section title",
      icon: `heading-${level}` as const,
      keywords: [`h${level}`, "heading", "title"],
      command: ({ editor, range }: LoomaSlashCommandContext) => {
        editor.chain().focus().deleteRange(range).setHeading({ level }).run();
      },
    })),
    {
      title: "Bullet list",
      description: "Unordered list",
      icon: "list",
      keywords: ["bullet", "list", "ul", "unordered"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered list",
      description: "Ordered list",
      icon: "list-ordered",
      keywords: ["numbered", "ordered", "list", "ol"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Checklist",
      description: "Interactive to-do items",
      icon: "list-todo",
      keywords: ["check", "task", "todo", "checklist"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: "Blockquote",
      description: "Highlighted quote",
      icon: "quote",
      keywords: ["quote", "blockquote", "callout"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    ...CALLOUT_COMMANDS.map(({ title, description, tone, icon, keywords }) => ({
      title,
      description,
      icon,
      keywords,
      command: ({ editor, range }: LoomaSlashCommandContext) => {
        editor.chain().focus().deleteRange(range).setLoomaCallout(tone).run();
      },
    })),
    {
      title: "Chip",
      description: "Inline label with text and color",
      icon: "tag",
      keywords: ["chip", "label", "badge", "tag", "status"],
      command: ({ editor, range }) => {
        if (editor.chain().focus().deleteRange(range).setTextSelection(range.from).insertLoomaChip({ label: "" }).run()) {
          onOpenChipEditor?.(editor, range.from);
        }
      },
    },
    {
      title: "Inline code",
      description: "Monospace code span",
      icon: "code-xml",
      keywords: ["code", "inline", "monospace"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCode().run();
      },
    },
    {
      title: "Code block",
      description: "Formatted code block",
      icon: "braces",
      keywords: ["codeblock", "pre", "syntax", "snippet"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: "Table",
      description: "Insert a table",
      icon: "table",
      keywords: ["table", "grid", "rows", "columns"],
      command: ({ editor, range }) => {
        insertTableAtRange(editor, range);
      },
    },
    {
      title: "Table of contents",
      description: "Automatic links to document headings",
      icon: "list",
      keywords: ["toc", "contents", "tableofcontents", "outline"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertLoomaTableOfContents().run();
      },
    },
    {
      title: "Expand",
      description: "Collapsible section with a summary",
      icon: "chevron-down",
      keywords: ["expand", "toggle", "details", "collapse"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertLoomaExpand().run();
      },
    },
    {
      title: "Divider",
      description: "Horizontal rule",
      icon: "minus",
      keywords: ["divider", "hr", "rule", "line"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    ...(onOpenLinkEditor ? [{
      title: "Link",
      description: "Link to a destination or URL",
      icon: "link" as const,
      keywords: ["link", "url", "website"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        onOpenLinkEditor();
      },
    } satisfies LoomaSlashCommand] : []),
    ...(onOpenImagePicker ? [{
      title: "Image",
      description: "Upload an image",
      icon: "image" as const,
      keywords: ["image", "photo", "picture", "upload"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        onOpenImagePicker?.();
      },
    } satisfies LoomaSlashCommand] : []),
  ];
  return commands.map(command => ({
    ...command,
    id: command.title.toLowerCase().replaceAll(" ", "-"),
    group: CALLOUT_COMMANDS.some(callout => callout.title === command.title) ? "Callouts"
      : ["Chip", "Inline code", "Link", "Image", "Table", "Table of contents", "Expand"].includes(command.title) ? "Insertions" : "Basic blocks",
    isAvailable: (context: LoomaSlashCommandContext) => canRunDefaultCommand(command.title, context),
  })).sort((a, b) => ["Basic blocks", "Callouts", "Insertions"].indexOf(a.group) - ["Basic blocks", "Callouts", "Insertions"].indexOf(b.group));
}

function canRunDefaultCommand(title: string, { editor, range }: LoomaSlashCommandContext): boolean {
  const chain = editor.can().chain().deleteRange(range);
  switch (title) {
    case "Text": return editor.isActive("paragraph") || chain.setParagraph().run();
    case "Heading 1": return editor.isActive("heading", { level: 1 }) || chain.setHeading({ level: 1 }).run();
    case "Heading 2": return editor.isActive("heading", { level: 2 }) || chain.setHeading({ level: 2 }).run();
    case "Heading 3": return editor.isActive("heading", { level: 3 }) || chain.setHeading({ level: 3 }).run();
    case "Bullet list": return chain.toggleBulletList().run();
    case "Numbered list": return chain.toggleOrderedList().run();
    case "Checklist": return chain.toggleTaskList().run();
    case "Blockquote": return chain.toggleBlockquote().run();
    case "Info": return chain.setLoomaCallout("info").run();
    case "Note": return chain.setLoomaCallout("note").run();
    case "Warning": return chain.setLoomaCallout("warning").run();
    case "Chip": return chain.insertLoomaChip({ label: "" }).run();
    case "Inline code": return chain.toggleCode().run();
    case "Code block": return chain.toggleCodeBlock().run();
    case "Table": return chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    case "Table of contents": return chain.insertLoomaTableOfContents().run();
    case "Expand": return chain.insertLoomaExpand().run();
    case "Divider": return chain.setHorizontalRule().run();
    default: return chain.run();
  }
}

/**
 * Ranks exact names/aliases before partial matches, then matching categories.
 * Other ties retain inventory order.
 * @contract Capability checks run against the current range; a failing host
 * predicate omits that command rather than exposing an action that may destroy text.
 */
export function filterLoomaSlashCommands(commands: LoomaSlashCommand[], query: string, context?: LoomaSlashCommandContext): LoomaSlashCommand[] {
  const term = query.toLowerCase().trim();
  return commands.map((command, index) => {
    const names = [command.title, ...command.keywords, command.id ?? ""].map(name => name.toLowerCase());
    const rank = !term || names.includes(term) ? 0 : names.some(name => name.startsWith(term)) ? 1 : names.some(name => name.includes(term)) ? 2 : 3;
    let available = true;
    if (context && command.isAvailable) {
      try { available = command.isAvailable(context); } catch { available = false; }
    }
    return { command, index, rank, groupMatch: Boolean(term && command.group?.toLowerCase().startsWith(term)), available };
  }).filter(item => item.rank < 3 && item.available)
    .sort((a, b) => a.rank - b.rank || Number(b.groupMatch) - Number(a.groupMatch) || a.index - b.index)
    .map(item => item.command);
}

const EMPTY_STATE: LoomaSlashMenuSnapshot = {
  active: false,
  items: [],
  selectedIndex: 0,
  query: "",
  rect: null,
  select: null,
  highlight: null,
};

/**
 * Framework-neutral slash-command extension used by the turnkey editor.
 * Consumers embedding Looma into their own Tiptap instance can configure the
 * same behavior and render any menu they choose from `onStateChange`.
 *
 * @ownership The extension owns query and keyboard-selection state; the caller
 * owns the command inventory and every menu snapshot after publication.
 * @lifecycle Snapshot callbacks are valid only for the suggestion range that
 * produced them and are replaced on every update or exit.
 */
export const LoomaSlashCommand = Extension.create<LoomaSlashCommandOptions, { dismiss: () => void }>({
  name: "loomaSlashCommand",

  addOptions() {
    return {
      commands: getDefaultSlashCommands(),
    };
  },

  addStorage: () => ({ dismiss: () => {} }),
  addCommands() {
    return { dismissLoomaSlashMenu: () => ({ dispatch }) => {
      if (dispatch) this.storage.dismiss();
      return true;
    } };
  },

  addProseMirrorPlugins() {
    let selectedIndex = 0;
    let currentProps: SuggestionProps<LoomaSlashCommand> | null = null;
    let generation = 0;
    let dismissed: { from: number; to: number; document: Editor["state"]["doc"] } | null = null;
    const isCurrent = (props: SuggestionProps<LoomaSlashCommand>) => {
      const state = SuggestionPluginKey.getState(this.editor.state);
      return state?.active && state.query === props.query && state.range.from === props.range.from && state.range.to === props.range.to;
    };

    const publish = (props: SuggestionProps<LoomaSlashCommand> | null) => {
      const revision = ++generation;
      const document = this.editor.state.doc;
      if (!props) {
        this.options.onStateChange?.({ ...EMPTY_STATE });
        return;
      }

      this.options.onStateChange?.({
        active: true,
        items: props.items,
        selectedIndex,
        query: props.query,
        rect: props.clientRect?.() ?? null,
        getRect: () => props.clientRect?.() ?? null,
        select: (index) => {
          if (revision !== generation || props !== currentProps || document !== this.editor.state.doc || !this.editor.isEditable || !isCurrent(props)) return;
          const item = props.items[index];
          if (item && filterLoomaSlashCommands([item], "", { editor: this.editor, range: props.range }).length) props.command(item);
        },
        highlight: (index) => {
          if (revision !== generation || props !== currentProps || index < 0 || index >= props.items.length) return;
          selectedIndex = index; publish(props);
        },
      });
    };

    this.storage.dismiss = () => {
      const range = SuggestionPluginKey.getState(this.editor.state)?.range;
      if (range) dismissed = { ...range, document: this.editor.state.doc };
      currentProps = null;
      publish(null);
    };

    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        allow: ({ state, range }) => {
          if (dismissed?.document === state.doc && dismissed.from === range.from && dismissed.to === range.to) return false;
          const { $from } = state.selection;
          for (let depth = $from.depth; depth >= 0; depth--) if ($from.node(depth).type.spec.code) return false;
          return !state.schema.marks.code?.isInSet(state.storedMarks ?? $from.marks());
        },
        items: ({ query, editor }) => {
          const range = SuggestionPluginKey.getState(editor.state)?.range ?? { from: editor.state.selection.from, to: editor.state.selection.to };
          return filterLoomaSlashCommands(this.options.commands, query, { editor, range });
        },
        command: ({ editor, range, props }) => {
          if (!editor.isEditable || !currentProps || !isCurrent(currentProps) || !this.options.commands.includes(props) || !filterLoomaSlashCommands([props], "", { editor, range }).length) return;
          props.command({ editor, range });
        },
        render: () => ({
          onStart: (props) => {
            if (!isCurrent(props)) return;
            currentProps = props;
            selectedIndex = 0;
            publish(props);
          },
          onUpdate: (props) => {
            if (!isCurrent(props)) return;
            currentProps = props;
            if (selectedIndex >= props.items.length) selectedIndex = 0;
            publish(props);
          },
          onKeyDown: ({ event }: SuggestionKeyDownProps) => {
            if (!currentProps) return false;
            if (event.key === "ArrowDown") {
              selectedIndex = (selectedIndex + 1) % Math.max(1, currentProps.items.length);
              publish(currentProps);
              return true;
            }
            if (event.key === "ArrowUp") {
              selectedIndex = (selectedIndex - 1 + currentProps.items.length)
                % Math.max(1, currentProps.items.length);
              publish(currentProps);
              return true;
            }
            if (event.key === "Enter") {
              const item = currentProps.items[selectedIndex];
              if (item) currentProps.command(item);
              return true;
            }
            if (event.key === "Escape") {
              this.editor.commands.dismissLoomaSlashMenu();
              return true;
            }
            return false;
          },
          onExit: () => {
            currentProps = null;
            publish(null);
          },
        }),
      }),
    ];
  },
});

/**
 * Creates an independently configured extension instance.
 * Prefer this factory when callbacks or commands are editor-specific; the
 * exported base extension remains a convenient zero-configuration preset.
 *
 * @ownership The caller owns supplied commands and callbacks. The returned
 * extension captures them for one configuration without mutating the inventory.
 */
export function createLoomaSlashCommandExtension(
  options: Partial<LoomaSlashCommandOptions> = {},
) {
  const onOpenImagePicker = options.onOpenImagePicker;
  const onOpenChipEditor = options.onOpenChipEditor;
  const onOpenLinkEditor = options.onOpenLinkEditor;
  return LoomaSlashCommand.configure({
    ...options,
    commands: options.commands ?? getDefaultSlashCommands(onOpenImagePicker, onOpenChipEditor, onOpenLinkEditor),
  });
}
