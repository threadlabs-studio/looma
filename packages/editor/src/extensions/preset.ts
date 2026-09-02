/**
 * Default Tiptap extension preset for Looma editor.
 * Uses the Vanilla JS Tiptap API; apps provide @tiptap/core and Looma ships the preset extensions.
 */

import type { AnyExtension } from "@tiptap/core";
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
import CodeBlock from "@tiptap/extension-code-block";
import TableRow from "@tiptap/extension-table-row";
import { LoomaListBehavior } from "./list-behavior";
import { LoomaTable, LoomaTableCell, LoomaTableHeader } from "./table-formatting";

export interface DefaultEditorExtensionsOptions {
  placeholder?: string;
  linkOpenOnClick?: boolean;
  imageInline?: boolean;
}

/**
 * Returns the default Looma editor extensions (Vanilla Tiptap).
 * Use with new Editor({ extensions: getDefaultEditorExtensions(), ... }) or framework useEditor().
 */
export function getDefaultEditorExtensions(
  options: DefaultEditorExtensionsOptions = {}
): AnyExtension[] {
  const {
    placeholder = "Type “/” for commands, or start writing…",
    linkOpenOnClick = false,
    imageInline = false,
  } = options;

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
    HorizontalRule,
    HardBreak,
    History,
    Dropcursor,
    Gapcursor,
    Link.configure({
      openOnClick: linkOpenOnClick,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    }),
    Image.configure({ inline: imageInline }),
    Highlight.configure({ multicolor: false }),
    Code,
    CodeBlock,
    Typography,
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === "paragraph" ? placeholder : "",
      emptyNodeClass: "is-editor-empty",
    }),
    LoomaTable,
    TableRow,
    LoomaTableHeader,
    LoomaTableCell,
    LoomaListBehavior,
  ];
}
