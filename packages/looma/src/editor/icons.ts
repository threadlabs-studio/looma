import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  BookUser,
  Braces,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CodeXml,
  CreditCard,
  CircleCheck,
  CircleX,
  Columns3,
  Ellipsis,
  Eraser,
  FileText,
  Folder,
  GripHorizontal,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image,
  Info,
  Italic,
  LayoutDashboard,
  List,
  ListOrdered,
  ListTodo,
  LoaderCircle,
  Merge,
  NotebookPen,
  Minus,
  PaintBucket,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  Pilcrow,
  Plus,
  Quote,
  Receipt,
  Redo2,
  Rows3,
  Settings,
  Split,
  Strikethrough,
  Table2,
  Trash2,
  TriangleAlert,
  Truck,
  Underline,
  Undo2,
  Users,
  type IconNode,
} from 'lucide';

/** The opinionated Lucide set used by Looma's shipped interaction surfaces. */
export const LOOMA_ICONS = {
  'align-center': AlignCenter,
  'align-left': AlignLeft,
  'align-right': AlignRight,
  'arrow-left': ArrowLeft,
  bold: Bold,
  'book-user': BookUser,
  braces: Braces,
  calculator: Calculator,
  'circle-check': CircleCheck,
  'circle-x': CircleX,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'code-xml': CodeXml,
  columns: Columns3,
  'credit-card': CreditCard,
  ellipsis: Ellipsis,
  eraser: Eraser,
  'file-text': FileText,
  folder: Folder,
  'grip-horizontal': GripHorizontal,
  'grip-vertical': GripVertical,
  'heading-1': Heading1,
  'heading-2': Heading2,
  'heading-3': Heading3,
  highlighter: Highlighter,
  image: Image,
  info: Info,
  italic: Italic,
  'layout-dashboard': LayoutDashboard,
  list: List,
  'list-ordered': ListOrdered,
  'list-todo': ListTodo,
  loader: LoaderCircle,
  merge: Merge,
  'notebook-pen': NotebookPen,
  minus: Minus,
  'paint-bucket': PaintBucket,
  'panel-bottom': PanelBottom,
  'panel-left': PanelLeft,
  'panel-right': PanelRight,
  'panel-top': PanelTop,
  pilcrow: Pilcrow,
  plus: Plus,
  quote: Quote,
  receipt: Receipt,
  redo: Redo2,
  rows: Rows3,
  settings: Settings,
  split: Split,
  strikethrough: Strikethrough,
  table: Table2,
  trash: Trash2,
  'triangle-alert': TriangleAlert,
  truck: Truck,
  underline: Underline,
  users: Users,
  undo: Undo2,
} satisfies Record<string, IconNode>;

/** Stable key selecting an icon from Looma's shipped interaction vocabulary. */
export type LoomaIconName = keyof typeof LOOMA_ICONS;

/** Framework-neutral Lucide element tree used to produce Looma icon markup. */
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
