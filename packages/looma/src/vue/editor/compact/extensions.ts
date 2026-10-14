import type { AnyExtension } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Code from "@tiptap/extension-code";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import { LoomaInputRuleHistory } from "../../../editor/extensions/input-rule-history";

/** Minimal short-form schema; additional consumer extensions are opt-in. */
export function getCompactEditorExtensions(): AnyExtension[] {
  return [Document, Paragraph, Text, Bold, Italic, Code, HardBreak, History, LoomaInputRuleHistory];
}
