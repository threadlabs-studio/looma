import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import type { LoomaIconName } from "@threadlabs/looma-core";
import { insertTableAtRange } from "./table-commands";

export interface LoomaSlashCommandContext {
  editor: Editor;
  range: Range;
}

export interface LoomaSlashCommand {
  title: string;
  description: string;
  icon: LoomaIconName;
  keywords: string[];
  command: (context: LoomaSlashCommandContext) => void;
}

export interface LoomaSlashMenuSnapshot {
  active: boolean;
  items: LoomaSlashCommand[];
  selectedIndex: number;
  query: string;
  rect: DOMRect | null;
  select: ((index: number) => void) | null;
}

export interface LoomaSlashCommandOptions {
  commands: LoomaSlashCommand[];
  onStateChange?: (state: LoomaSlashMenuSnapshot) => void;
  onOpenImagePicker?: () => void;
}

export function getDefaultSlashCommands(
  onOpenImagePicker?: () => void,
): LoomaSlashCommand[] {
  return [
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
      icon: `heading-${level}` as LoomaIconName,
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
      title: "Divider",
      description: "Horizontal rule",
      icon: "minus",
      keywords: ["divider", "hr", "rule", "line"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      title: "Image",
      description: "Upload an image",
      icon: "image",
      keywords: ["image", "photo", "picture", "upload"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        onOpenImagePicker?.();
      },
    },
  ];
}

const EMPTY_STATE: LoomaSlashMenuSnapshot = {
  active: false,
  items: [],
  selectedIndex: 0,
  query: "",
  rect: null,
  select: null,
};

/**
 * Framework-neutral slash-command extension used by the turnkey editor.
 * Consumers embedding Looma into their own Tiptap instance can configure the
 * same behavior and render any menu they choose from `onStateChange`.
 */
export const LoomaSlashCommand = Extension.create<LoomaSlashCommandOptions>({
  name: "loomaSlashCommand",

  addOptions() {
    return {
      commands: getDefaultSlashCommands(),
    };
  },

  addProseMirrorPlugins() {
    let selectedIndex = 0;
    let currentProps: SuggestionProps<LoomaSlashCommand> | null = null;

    const publish = (props: SuggestionProps<LoomaSlashCommand> | null) => {
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
        select: (index) => {
          const item = props.items[index];
          if (item) props.command(item);
        },
      });
    };

    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        items: ({ query }) => {
          const normalized = query.toLowerCase().trim();
          const commands = this.options.commands.length > 0
            ? this.options.commands
            : getDefaultSlashCommands(this.options.onOpenImagePicker);
          if (!normalized) return commands;
          return commands.filter((command) =>
            command.title.toLowerCase().includes(normalized)
            || command.keywords.some((keyword) => keyword.includes(normalized))
          );
        },
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => ({
          onStart: (props) => {
            currentProps = props;
            selectedIndex = 0;
            publish(props);
          },
          onUpdate: (props) => {
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
              currentProps = null;
              publish(null);
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

export function createLoomaSlashCommandExtension(
  options: Partial<LoomaSlashCommandOptions> = {},
) {
  const onOpenImagePicker = options.onOpenImagePicker;
  return LoomaSlashCommand.configure({
    ...options,
    commands: options.commands ?? getDefaultSlashCommands(onOpenImagePicker),
  });
}
