/**
 * Default Tiptap extension preset for Looma editor.
 * Uses the Vanilla JS Tiptap API; apps provide @tiptap/core and Looma ships the preset extensions.
 */

import { Extension, mergeAttributes, textblockTypeInputRule, type AnyExtension, type NodeViewRenderer } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Underline from "@tiptap/extension-underline";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Blockquote from "@tiptap/extension-blockquote";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import Dropcursor from "@tiptap/extension-dropcursor";
import Gapcursor from "@tiptap/extension-gapcursor";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";
import Code from "@tiptap/extension-code";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import TableRow from "@tiptap/extension-table-row";
import { LoomaActiveBlock } from "./active-block";
import { LoomaCallout } from "./callout";
import { LoomaChip } from "./chip";
import { LoomaListBehavior } from "./list-behavior";
import { createLoomaMentionExtension } from "./mention";
import { createSiteRelativeLinks } from "./relative-links";
import { LoomaSmartPaste } from "./smart-paste";
import { LoomaTable, LoomaTableCell, LoomaTableHeader } from "./table-formatting";

/** Grammars supplied by the host; importing a language remains the host's choice. */
export type LoomaCodeLanguages = NonNullable<Parameters<typeof createLowlight>[0]>;

/**
 * Deliberate policy knobs in Looma's default extension set.
 * Consumers needing different schemas should compose an explicit Tiptap list
 * rather than relying on undocumented mutation of the returned extensions.
 */
export interface DefaultEditorExtensionsOptions {
  /** Placeholder shown only for empty paragraphs, not every empty node type. */
  placeholder?: string;
  /** Passed to Tiptap Link; defaults false to keep editing clicks in the editor. */
  linkOpenOnClick?: boolean;
  /** Site origin whose newly inserted links become relative, across paste and editor commands. */
  linkBaseUrl?: string;
  /** Passed to Tiptap Image; block images are the default document policy. */
  imageInline?: boolean;
  /** Custom mention extension, the Looma default, or false to omit mentions. */
  mention?: AnyExtension | false;
  /**
   * Removes every way for authors to apply the highlight mark: the Mod-Shift-H
   * shortcut, `==text==` typing and paste rules, and `<mark>` parsing from
   * pasted or HTML content. Highlights already stored in a document still load
   * and render. Use it when the application reserves highlighting for itself.
   */
  disableHighlight?: boolean;
  /** Code block grammars to register. None are loaded by default. */
  codeLanguages?: LoomaCodeLanguages;
  /** Shared highlighter that can receive grammars after editor creation. */
  codeLowlight?: ReturnType<typeof createLowlight>;
  /** Optional presentation for a code block; the Vue editor supplies its language control. */
  codeBlockNodeView?: NodeViewRenderer;
}

const LoomaCodeBlock = CodeBlockLowlight.extend({
  renderHTML({ node, HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { spellcheck: "false" }),
      ["code", {
        class: node.attrs.language ? `${this.options.languageClassPrefix}${node.attrs.language}` : null,
        spellcheck: "false",
      }, 0],
    ];
  },
  addInputRules() {
    return [
      ...(this.parent?.() ?? []),
      textblockTypeInputRule({ find: /^```$/, type: this.type }),
    ];
  },
});

// Removing the mark from the schema would make Tiptap discard any stored
// document that uses it, so disabling it strips only the ways to create it.
const StoredOnlyHighlight = Highlight.extend({
  parseHTML: () => [],
  addKeyboardShortcuts: () => ({}),
  addInputRules: () => [],
  addPasteRules: () => [],
});

/**
 * Complete Looma table schema as one Tiptap extension.
 * Use this in presets that want table, row, header, and cell nodes to remain an
 * atomic policy choice; use `getLoomaTableExtensions` only when ordering or
 * per-extension composition must be explicit.
 *
 * @invariant Installs exactly one compatible table, row, header, and cell node
 * set so a preset cannot accidentally split Looma's persisted table schema.
 */
export const LoomaTableKit: AnyExtension = Extension.create({
  name: "loomaTableKit",
  addExtensions() {
    return [LoomaTable, TableRow, LoomaTableHeader, LoomaTableCell];
  },
});

/** Returns a fresh ordered list of the same schema extensions as `LoomaTableKit`. */
export function getLoomaTableExtensions(): AnyExtension[] {
  return [LoomaTable, TableRow, LoomaTableHeader, LoomaTableCell];
}

/**
 * Builds Looma's complete, ordered Tiptap extension policy.
 *
 * A fresh array is returned for each editor. Document nodes precede marks and
 * behavior extensions; Looma's table/list policies are installed once; mention
 * can be replaced without coupling UI chrome to an application directory.
 * Use with `new Editor({ extensions: getDefaultEditorExtensions(), ... })` or a
 * framework's Tiptap editor hook.
 * @contract Code blocks accept three backticks in an empty paragraph as an
 * immediate typing shortcut. An optional node view changes presentation only;
 * the code and explicit language stay in the document schema.
 */
export function getDefaultEditorExtensions(
  options: DefaultEditorExtensionsOptions = {}
): AnyExtension[] {
  const {
    placeholder = "Type “/” for commands, or start writing…",
    linkOpenOnClick = false,
    linkBaseUrl,
    imageInline = false,
    mention = createLoomaMentionExtension(),
    disableHighlight = false,
    codeLanguages,
    codeLowlight,
    codeBlockNodeView,
  } = options;

  const codeBlock = LoomaCodeBlock.configure({ lowlight: codeLowlight ?? createLowlight(codeLanguages) });

  return [
    Document,
    Paragraph,
    Text,
    Bold,
    Italic,
    Strike,
    Underline,
    Heading.configure({ levels: [1, 2, 3] }),
    BulletList,
    OrderedList,
    ListItem,
    TaskList,
    TaskItem.configure({ nested: false }),
    Blockquote,
    LoomaCallout,
    LoomaChip,
    HorizontalRule,
    HardBreak,
    History,
    Dropcursor,
    Gapcursor,
    Link.configure({
      openOnClick: linkOpenOnClick,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    }),
    ...(linkBaseUrl ? [createSiteRelativeLinks(linkBaseUrl)] : []),
    Image.configure({ inline: imageInline }),
    (disableHighlight ? StoredOnlyHighlight : Highlight).configure({ multicolor: false }),
    Code,
    LoomaSmartPaste,
    codeBlockNodeView ? codeBlock.extend({ addNodeView: () => codeBlockNodeView }) : codeBlock,
    Typography,
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === "paragraph" ? placeholder : "",
      emptyNodeClass: "is-editor-empty",
    }),
    ...(mention ? [mention] : []),
    LoomaTableKit,
    LoomaListBehavior,
    LoomaActiveBlock,
  ];
}
