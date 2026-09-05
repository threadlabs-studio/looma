import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  ChevronDown,
  ChevronLeft,
  CodeXml,
  Columns3,
  Ellipsis,
  Eraser,
  GripHorizontal,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Merge,
  Minus,
  PaintBucket,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  Pilcrow,
  Plus,
  Quote,
  Redo2,
  Rows3,
  Split,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
  Undo2,
  type IconNode,
} from 'lucide';

/** The opinionated Lucide set used by Looma's shipped interaction surfaces. */
export const LOOMA_ICONS = {
  'align-center': AlignCenter,
  'align-left': AlignLeft,
  'align-right': AlignRight,
  bold: Bold,
  braces: Braces,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'code-xml': CodeXml,
  columns: Columns3,
  ellipsis: Ellipsis,
  eraser: Eraser,
  'grip-horizontal': GripHorizontal,
  'grip-vertical': GripVertical,
  'heading-1': Heading1,
  'heading-2': Heading2,
  'heading-3': Heading3,
  highlighter: Highlighter,
  image: Image,
  italic: Italic,
  list: List,
  'list-ordered': ListOrdered,
  'list-todo': ListTodo,
  merge: Merge,
  minus: Minus,
  'paint-bucket': PaintBucket,
  'panel-bottom': PanelBottom,
  'panel-left': PanelLeft,
  'panel-right': PanelRight,
  'panel-top': PanelTop,
  pilcrow: Pilcrow,
  plus: Plus,
  quote: Quote,
  redo: Redo2,
  rows: Rows3,
  split: Split,
  strikethrough: Strikethrough,
  table: Table2,
  trash: Trash2,
  underline: Underline,
  undo: Undo2,
} satisfies Record<string, IconNode>;

export type LoomaIconName = keyof typeof LOOMA_ICONS;
export type LoomaIconNode = IconNode;

function serializeAttributes(attributes: Record<string, string | number>): string {
  return Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join('');
}

function escapeAttribute(value: string | number): string {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function serializeIconNode(node: IconNode[number]): string {
  const [tag, attributes] = node;
  return `<${tag}${serializeAttributes(attributes)}></${tag}>`;
}

/** Creates consistent, currentColor-driven SVG markup for framework-neutral components. */
export function loomaIconMarkup(name: LoomaIconName, className = 'looma-icon'): string {
  return [
    `<svg class="${escapeAttribute(className)}" data-looma-icon="${name}" aria-hidden="true" focusable="false"`,
    ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"',
    ' stroke-linecap="round" stroke-linejoin="round">',
    LOOMA_ICONS[name].map(serializeIconNode).join(''),
    '</svg>',
  ].join('');
}
