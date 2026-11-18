import type { JSONContent } from "@tiptap/core";
import type { Node as EditorNode } from "@tiptap/pm/model";
import type { Document, Node } from "expressmark";

/** An end-exclusive UTF-16 interval in Markdown or a ProseMirror document. */
export interface EditorMarkdownRange {
  readonly start: number;
  readonly end: number;
}

/** Selects one side of a collapsed editor position at a Markdown delimiter. */
export type EditorMarkdownAffinity = "before" | "after";

/** Half-open ranges in UTF-16 source offsets and ProseMirror document positions. */
export interface EditorMarkdownPositionMap {
  toEditorRange(start: number, end: number): EditorMarkdownRange | undefined;
  toSourceRange(start: number, end: number, affinity?: EditorMarkdownAffinity): EditorMarkdownRange | undefined;
}

interface Point { source: number; editor: number }
interface ProseRun { kind: "text" | "italic" | "bold" | "hardBreak"; text: string }
type BlockProjection = { blocks: JSONContent[][]; groups: { node: Node; source: Node[] }[] };

/** Returns only mappings whose raw block and live editor projection both agree. */
export function mapProseSourcePositions(markdown: string, source: Document, editor: EditorNode,
  projection?: BlockProjection): EditorMarkdownPositionMap {
  const runs: Point[][] = [];
  if (editor.type.name === "doc") {
    if (!markdown.trim() && !source.body.length && editor.childCount === 1 &&
        editor.child(0).type.name === "paragraph" && !editor.child(0).childCount) {
      runs.push([{ source: 0, editor: 1 }]);
    } else if (projection) {
      mapBlocks(markdown, source, editor, projection, runs);
    }
  }
  return {
    toEditorRange: (start, end) => translate(runs, start, end, "source", "editor"),
    toSourceRange: (start, end, affinity) => translate(runs, start, end, "editor", "source", affinity),
  };
}

function mapBlocks(markdown: string, source: Document, editor: EditorNode,
  { blocks, groups }: BlockProjection, runs: Point[][]) {
  // Expressmark records raw, top-level source intervals for the same parsed nodes used by the editor projection.
  const ranges = source.source?.blocks;
  if (!Array.isArray(ranges) || ranges.length !== source.body.length ||
      blocks.reduce((count, block) => count + block.length, 0) !== editor.childCount) return;

  let sourceIndex = 0;
  let previousEnd = 0;
  let editorIndex = 0;
  let editorOffset = 0;
  let paragraphRun: Point[] | undefined;
  for (const [index, group] of groups.entries()) {
    const previousParagraph = paragraphRun;
    const previousSourceEnd = previousEnd;
    paragraphRun = undefined;
    const projected = blocks[index]!;
    const startOffset = editorOffset;
    for (const node of projected) {
      const actual = editor.child(editorIndex++);
      if (node.type !== actual.type.name) { runs.length = 0; return; }
      editorOffset += actual.nodeSize;
    }
    const range = ranges[sourceIndex];
    const nextSourceIndex = sourceIndex + group.source.length;
    for (const record of ranges.slice(sourceIndex, nextSourceIndex)) {
      if (!Array.isArray(record) || record[0] !== 1 || typeof record[2] !== "number" ||
          typeof record[3] !== "number" || !Number.isSafeInteger(record[2]) || !Number.isSafeInteger(record[3]) ||
          record[2] < previousEnd || record[3] < record[2] || record[3] > markdown.length) {
        runs.length = 0;
        return;
      }
      previousEnd = record[3];
    }
    sourceIndex = nextSourceIndex;
    if (group.source.length !== 1 || projected.length !== 1 ||
        (group.node.type !== "paragraph" && group.node.type !== "heading") ||
        !Array.isArray(range) || typeof range[2] !== "number" || typeof range[3] !== "number") continue;
    const actual = editor.child(editorIndex - 1);
    const expected = projected[0]!;
    if (group.node.type === "heading" && actual.attrs.level !== expected.attrs?.level) continue;
    const block = markdown.slice(range[2], range[3]);
    const heading = group.node.type === "heading" ? headingBody(block) : undefined;
    if (group.node.type === "heading" && !heading) continue;
    const points = mapBlock(heading?.text ?? block, range[2] + (heading?.offset ?? 0),
      startOffset + 1, group.node, expected, actual.toJSON());
    if (!points) continue;
    if (group.node.type === "paragraph") {
      // Join adjacent, verified paragraphs across raw spacing. Positions inside the gap stay unmapped.
      if (previousParagraph && !/[^\t \r\n]/u.test(markdown.slice(previousSourceEnd, range[2]))) {
        for (const point of points) previousParagraph.push(point);
        paragraphRun = previousParagraph;
        continue;
      }
      paragraphRun = points;
    }
    runs.push(points);
  }
}

function headingBody(block: string): { text: string; offset: number } | undefined {
  const opening = /^ {0,3}#{1,6}[\t ]+/u.exec(block);
  if (opening) {
    const text = block.slice(opening[0].length).replace(/[\t ]+#+[\t ]*$/u, "");
    if (!/[\r\n]/u.test(text)) return { text, offset: opening[0].length };
  }
  const setext = /^([^\r\n]+)(?:\r\n|\r|\n) {0,3}(?:=+|-+)[\t ]*$/u.exec(block);
  if (setext) return { text: setext[1]!, offset: 0 };
}

function proseRuns(node: JSONContent): ProseRun[] | undefined {
  const result: ProseRun[] = [];
  for (const child of node.content ?? []) {
    const marks = child.marks ?? [];
    if (child.type === "hardBreak" && !marks.length) {
      result.push({ kind: "hardBreak", text: "\n" });
      continue;
    }
    if (child.type !== "text" || child.text === undefined) return;
    const mark = marks.length === 1 ? marks[0]!.type : undefined;
    const kind = !marks.length ? "text" : mark === "italic" || mark === "bold" ? mark : undefined;
    if (!kind) return;
    const previous = result.at(-1);
    if (previous?.kind === kind) previous.text += child.text;
    else result.push({ kind, text: child.text });
  }
  return result;
}

function mapBlock(block: string, sourceStart: number, editorStart: number, source: Node,
  expected: JSONContent, actual: JSONContent): Point[] | undefined {
  const inline = source.children ?? [];
  if (inline.some(node => !["text", "softBreak", "break", "emphasis", "strong"].includes(node.type))) return;
  const emphasis = inline.filter(node => node.type === "emphasis" || node.type === "strong");
  if (emphasis.some(node => !node.value || /[\r\n]/u.test(node.value))) return;
  const projected = proseRuns(expected);
  if (!projected || JSON.stringify(projected) !== JSON.stringify(proseRuns(actual))) return;

  let literal = "";
  let emphasisIndex = 0;
  const delimiters: EditorMarkdownRange[] = [];
  const breaks: number[] = [];
  // Reconstruct only the supported literal spelling. Markup that changes the text, or that
  // cannot be located by this restricted projection, fails the full raw-block comparison.
  for (const { kind, text } of projected) {
    if (kind === "italic" || kind === "bold") {
      const span = emphasis[emphasisIndex++];
      if (!span || text !== span.value || (kind === "bold") !== (span.type === "strong")) return;
      const character = span.source?.marker ?? "*";
      if (character !== "*" && character !== "_") return;
      const marker = kind === "bold" ? character.repeat(2) : character;
      const open = literal.length;
      const end = open + marker.length;
      const close = end + text.length;
      delimiters.push({ start: open, end }, { start: close, end: close + marker.length });
      literal += marker + text + marker;
    } else {
      if (kind === "hardBreak") breaks.push(literal.length);
      literal += text;
    }
  }
  if (emphasisIndex !== emphasis.length) return;

  const lines = block.split(/(\r\n|\r|\n)/u);
  const points: Point[] = [];
  let normalized = "";
  let offset = 0;
  let breakIndex = 0;
  let delimiterIndex = 0;
  let skipped = 0;
  const point = (at: number) => {
    while (delimiters[delimiterIndex] && delimiters[delimiterIndex]!.end <= normalized.length) {
      const delimiter = delimiters[delimiterIndex++]!;
      skipped += delimiter.end - delimiter.start;
    }
    const delimiter = delimiters[delimiterIndex];
    if (delimiter && normalized.length > delimiter.start) return;
    points.push({ source: sourceStart + at, editor: editorStart + normalized.length - skipped });
  };
  for (let index = 0; index < lines.length; index += 2) {
    const line = lines[index]!;
    const separator = lines[index + 1];
    const hardSpaces = Boolean(separator && / {2,}$/u.test(line));
    const hardSlash = Boolean(separator && !hardSpaces && /(?:^|[^\\])(?:\\\\)*\\$/u.test(line));
    const start = /^[\t ]*/u.exec(line)![0].length;
    const end = hardSlash ? line.length - 1 : line.replace(/[\t ]+$/u, "").length;
    if (start >= end) return;
    let at = start;
    point(offset + at);
    for (const character of line.slice(start, end)) {
      normalized += character;
      at += character.length;
      point(offset + at);
    }
    offset += line.length;
    if (separator) {
      if ((hardSpaces || hardSlash) !== (breaks[breakIndex] === normalized.length)) return;
      if (hardSpaces || hardSlash) breakIndex++;
      normalized += "\n";
      offset += separator.length;
    }
  }
  return normalized === literal && breakIndex === breaks.length ? points : undefined;
}

function translate(runs: Point[][], start: number, end: number, from: keyof Point, to: keyof Point,
  affinity?: EditorMarkdownAffinity): EditorMarkdownRange | undefined {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) return;
  for (const points of runs) {
    if (points[0]![from] > start) return;
    if (points[points.length - 1]![from] < end) continue;
    const first = boundary(points, start, from, start === end ? affinity : "after");
    const last = start === end ? first : boundary(points, end, from, "before");
    if (first && last && (start === end || first[to] < last[to])) return { start: first[to], end: last[to] };
  }
}

function boundary(points: Point[], position: number, axis: keyof Point, affinity?: EditorMarkdownAffinity): Point | undefined {
  let lower = 0;
  let upper = points.length;
  while (lower < upper) {
    const at = Math.floor((lower + upper) / 2);
    if (points[at]![axis] < position) lower = at + 1;
    else upper = at;
  }
  if (points[lower]?.[axis] !== position) return;
  if (points[lower + 1]?.[axis] === position && !affinity) return;
  if (affinity === "after") while (points[lower + 1]?.[axis] === position) lower++;
  return points[lower];
}
