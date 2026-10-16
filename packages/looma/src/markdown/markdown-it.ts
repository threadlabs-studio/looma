import MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import type Token from "markdown-it/lib/token.mjs";
import {
  assignLoomaHeadingIds,
  LOOMA_CONTAINER_NAMES,
  normalizeLoomaCalloutTone,
  normalizeLoomaChipTone,
  parseLoomaAttributes,
  parseLoomaFenceInfo,
  readLoomaAttributes,
  splitLoomaFrontmatter,
  type LoomaAttributes,
} from "./index";

const CONTAINER_OPEN = /^(:{3,})[ \t]*([A-Za-z][\w-]*)(?:[ \t]+(.*?))?[ \t]*$/;
const CONTAINER_CLOSE = /^:{3,}[ \t]*$/;
const FENCE_OPEN = /^(`{3,}|~{3,})/;
const TAB_LABEL = /^==[ \t]+(\S.*?)[ \t]*$/;
const OPEN_FLAG = /[ \t]*\{open\}$/;
const ALERT = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n|$)/i;
const LEAF = /^::([A-Za-z][\w-]*)(\{.*\})?[ \t]*$/;
const TASK = /^\[([ xX])\](?:[ \t]+|$)/;
const TOC_FORMATS = new Set(["plain", "bulleted", "numbered"]);
const PLACEMENTS = new Set(["block", "center", "wrap-left", "wrap-right"]);

const opensContainer = (text: string) => {
  const match = CONTAINER_OPEN.exec(text);
  return match && LOOMA_CONTAINER_NAMES.has(match[2].toLowerCase()) ? match : null;
};

function lineText(state: StateBlock, line: number): string {
  return state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
}

// Front matter is page metadata: it renders nothing, and its YAML is `env.frontmatter`.
function frontmatter(state: StateBlock, startLine: number, _endLine: number, silent: boolean): boolean {
  if (startLine !== 0 || state.blkIndent !== 0) return false;
  const split = splitLoomaFrontmatter(state.src);
  if (!split) return false;
  if (silent) return true;
  const lines = split.source.split("\n").length;
  const token = state.push("looma_frontmatter", "", 0);
  Object.assign(token, { content: split.yaml, block: true, hidden: true, map: [0, lines] });
  (state.env as { frontmatter?: string }).frontmatter = split.yaml;
  state.line = lines;
  return true;
}

// `::: name Title` … `:::`. A closing line closes the innermost open container, and a marker line
// inside fenced code is code. Directly inside tabs and code groups, `== Label` lines start panels.
function container(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;
  const match = opensContainer(lineText(state, startLine));
  if (!match) return false;
  if (silent) return true;
  const name = match[2].toLowerCase();
  const grouped = name === "tabs" || name === "code-group";
  const labels: { line: number; label: string }[] = [];
  let depth = 1;
  let fence: { char: string; length: number } | null = null;
  let next = startLine + 1;
  for (; next < endLine; next++) {
    const text = lineText(state, next);
    if (text && state.sCount[next] < state.blkIndent) break;
    if (fence) {
      const close = FENCE_OPEN.exec(text);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length && !text.slice(close[1].length).trim()) fence = null;
      continue;
    }
    const opener = FENCE_OPEN.exec(text);
    if (opener) { fence = { char: opener[1][0], length: opener[1].length }; continue; }
    if (CONTAINER_CLOSE.test(text)) { if (--depth === 0) break; }
    else if (opensContainer(text)) depth++;
    else if (grouped && depth === 1) {
      const label = TAB_LABEL.exec(text);
      if (label) labels.push({ line: next, label: label[1] });
    }
  }
  let title = (match[3] ?? "").trim();
  const open = name === "details" && OPEN_FLAG.test(title);
  if (name === "details") title = title.replace(OPEN_FLAG, "");

  const parentType = state.parentType;
  const lineMax = state.lineMax;
  state.parentType = "container" as typeof state.parentType;
  state.lineMax = next;
  const opening = state.push("looma_container_open", "div", 1);
  Object.assign(opening, { info: name, meta: { title, open }, block: true, map: [startLine, next], markup: match[1] });
  const panel = (label: string, from: number, to: number) => {
    state.push("looma_tab_open", "section", 1).meta = { label };
    state.md.block.tokenize(state, from, to);
    state.push("looma_tab_close", "section", -1);
  };
  if (labels.length) {
    state.md.block.tokenize(state, startLine + 1, labels[0].line);
    labels.forEach(({ line, label }, index) => panel(label, line + 1, labels[index + 1]?.line ?? next));
  } else {
    const first = state.tokens.length;
    state.md.block.tokenize(state, startLine + 1, next);
    // A code group without labels makes each of its fences a panel, labelled by its title or language.
    if (name === "code-group") {
      for (let index = state.tokens.length - 1; index >= first; index--) {
        const token = state.tokens[index];
        if (token.type !== "fence" || token.level !== opening.level + 1) continue;
        const { title: fenceTitle, language } = parseLoomaFenceInfo(token.info);
        const tabOpen = new state.Token("looma_tab_open", "section", 1);
        tabOpen.meta = { label: fenceTitle ?? language ?? "Code" };
        state.tokens.splice(index, 1, tabOpen, token, new state.Token("looma_tab_close", "section", -1));
      }
    }
  }
  const closing = state.push("looma_container_close", "div", -1);
  Object.assign(closing, { info: name, meta: { title }, block: true, markup: match[1] });
  state.parentType = parentType;
  state.lineMax = lineMax;
  state.line = Math.min(next + 1, endLine);
  return true;
}

// `::name{attributes}`, a block without content. `toc` is the one leaf block.
function leaf(state: StateBlock, startLine: number, _endLine: number, silent: boolean): boolean {
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;
  const match = LEAF.exec(lineText(state, startLine));
  if (!match || match[1].toLowerCase() !== "toc") return false;
  const attributes = match[2] ? parseLoomaAttributes(match[2]) : {};
  if (!attributes) return false;
  if (silent) return true;
  const format = typeof attributes.format === "string" && TOC_FORMATS.has(attributes.format) ? attributes.format : "plain";
  const depth = attributes.depth === "1" || attributes.depth === "2" ? Number(attributes.depth) : 3;
  const token = state.push("looma_toc", "nav", 0);
  Object.assign(token, { block: true, map: [startLine, startLine + 1], meta: { format, depth } });
  state.line = startLine + 1;
  return true;
}

// `> [!TIP]` as the first line of a quote makes it a callout without a title.
function alerts(state: StateCore): void {
  const tokens = state.tokens;
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index].type !== "blockquote_open" || tokens[index + 1]?.type !== "paragraph_open") continue;
    const inline = tokens[index + 2];
    const match = inline?.type === "inline" ? ALERT.exec(inline.content) : null;
    if (!match) continue;
    inline.content = inline.content.slice(match[0].length);
    if (!inline.content.trim()) tokens.splice(index + 1, 3);
    tokens[index].tag = "ui-callout";
    tokens[index].attrSet("tone", normalizeLoomaCalloutTone(match[1]));
    for (let depth = 0, end = index; end < tokens.length; end++) {
      if (tokens[end].type === "blockquote_open") depth++;
      else if (tokens[end].type === "blockquote_close" && --depth === 0) { tokens[end].tag = "ui-callout"; break; }
    }
  }
}

// A bullet list whose every item starts with `[ ]` or `[x]` is a task list.
function taskLists(state: StateCore): void {
  const tokens = state.tokens;
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index].type !== "bullet_list_open") continue;
    const level = tokens[index].level;
    const items: { item: Token; inline: Token; checked: boolean }[] = [];
    let isTaskList = true;
    for (let cursor = index + 1; cursor < tokens.length; cursor++) {
      const token = tokens[cursor];
      if (token.type === "bullet_list_close" && token.level === level) break;
      if (token.type !== "list_item_open" || token.level !== level + 1) continue;
      const inline = tokens[cursor + 2];
      const match = tokens[cursor + 1]?.type === "paragraph_open" && inline?.type === "inline" ? TASK.exec(inline.content) : null;
      if (!match) { isTaskList = false; break; }
      items.push({ item: token, inline, checked: match[1] !== " " });
    }
    if (!isTaskList || !items.length) continue;
    tokens[index].attrSet("data-type", "taskList");
    for (const { item, inline, checked } of items) {
      inline.content = inline.content.replace(TASK, "");
      item.attrSet("data-type", "taskItem");
      item.attrSet("data-checked", String(checked));
      item.meta = { checked };
    }
  }
}

// `:chip[Label]{tone=green}` and `:mention[Label]{id=u1}`.
function directive(state: StateInline, silent: boolean): boolean {
  const { src, pos } = state;
  if (src.charCodeAt(pos) !== 0x3a) return false;
  const name = /^:(chip|mention)\[/.exec(src.slice(pos, pos + 10))?.[1];
  if (!name) return false;
  let label = "";
  let index = pos + name.length + 2;
  for (; index < state.posMax && src[index] !== "]"; index++) {
    if (src[index] === "\\" && index + 1 < state.posMax) index++;
    label += src[index];
  }
  if (src[index] !== "]") return false;
  const read = src[index + 1] === "{" ? readLoomaAttributes(src, index + 1) : { attributes: {} as LoomaAttributes, end: index + 1 };
  if (!read || read.end > state.posMax) return false;
  if (name === "mention" && typeof read.attributes.id !== "string") return false;
  if (!silent) {
    const token = state.push(`looma_${name}`, "span", 0);
    token.meta = { label, attributes: read.attributes };
  }
  state.pos = read.end;
  return true;
}

function inlineText(token: Token | undefined): string {
  return (token?.children ?? []).map(child => child.type === "image" ? inlineText(child) : child.content).join("");
}

// Brace attributes after a heading and an image, block images, and heading anchors.
function attributes(state: StateCore): void {
  const headings: { open: Token; text: string; id?: string }[] = [];
  const tokens = state.tokens;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type !== "inline" || !token.children) continue;
    const children = token.children;
    // GFM autolinks need a scheme or `www.`; a bare domain stays text.
    for (let child = children.length - 3; child >= 0; child--) {
      const text = children[child + 1];
      if (children[child].type !== "link_open" || children[child].markup !== "linkify" || /^(?:[a-z][\w+.-]*:|www\.)/i.test(text.content)) continue;
      children.splice(child, 3, Object.assign(new state.Token("text", "", 0), { content: text.content }));
    }
    if (tokens[index - 1]?.type === "heading_open") {
      const last = children.at(-1);
      const marker = last?.type === "text" ? /[ \t]+(\{[^{}]*\})$/.exec(last.content) : null;
      const parsed = marker && parseLoomaAttributes(marker[1]);
      let id: string | undefined;
      if (last && marker && parsed && typeof parsed.id === "string") {
        id = parsed.id;
        last.content = last.content.slice(0, marker.index);
      }
      headings.push({ open: tokens[index - 1], text: inlineText(token).trim(), id });
    }
    for (let child = 0; child < children.length; child++) {
      const next = children[child + 1];
      if (children[child].type !== "image" || next?.type !== "text" || !next.content.startsWith("{")) continue;
      const read = readLoomaAttributes(next.content);
      if (!read) continue;
      applyImageAttributes(children[child], read.attributes);
      next.content = next.content.slice(read.end);
      if (!next.content) children.splice(child + 1, 1);
    }
    // An image alone in its paragraph is a block image.
    if (tokens[index - 1]?.type === "paragraph_open" && children.length === 1 && children[0].type === "image") {
      tokens[index - 1].hidden = true;
      tokens[index + 1].hidden = true;
    }
  }
  const ids = assignLoomaHeadingIds(headings);
  headings.forEach(({ open }, index) => open.attrSet("id", ids[index]));
}

function applyImageAttributes(image: Token, attributes: LoomaAttributes): void {
  for (const key of ["width", "height"] as const) {
    const value = Number(attributes[key]);
    if (Number.isSafeInteger(value) && value > 0) image.attrSet(key, String(value));
  }
  const placement = attributes.placement;
  if (typeof placement === "string" && PLACEMENTS.has(placement) && placement !== "block") image.attrSet("data-placement", placement);
  if (attributes.responsive === true) image.attrSet("data-looma-responsive", "");
}

interface TocEntry { id: string; text: string; children: TocEntry[] }

function tableOfContents(tokens: Token[], format: string, depth: number, escape: (value: string) => string): string {
  const roots: TocEntry[] = [];
  const ancestors: { level: number; entry: TocEntry }[] = [];
  tokens.forEach((token, index) => {
    if (token.type !== "heading_open") return;
    const level = Number(token.tag.slice(1));
    const text = inlineText(tokens[index + 1]).trim();
    if (level > depth || !text) return;
    while (ancestors.length && ancestors[ancestors.length - 1].level >= level) ancestors.pop();
    const entry: TocEntry = { id: token.attrGet("id") ?? "", text, children: [] };
    (ancestors.at(-1)?.entry.children ?? roots).push(entry);
    ancestors.push({ level, entry });
  });
  const [list, item] = format === "plain" ? ["div", "div"] : [format === "numbered" ? "ol" : "ul", "li"];
  const render = (entries: TocEntry[]): string => `<${list} role="list">${entries.map(({ id, text, children }) =>
    `<${item} role="listitem"><a href="#${escape(id)}">${escape(text)}</a>${children.length ? render(children) : ""}</${item}>`).join("")}</${list}>`;
  return `<nav data-looma-toc="" data-format="${format}" data-depth="${depth}" aria-label="Table of contents">` +
    `<strong>Table of contents</strong>${roots.length ? render(roots) : ""}</nav>\n`;
}

/**
 * Adds Looma Markdown to a markdown-it instance: containers, alerts, task lists, the table of
 * contents, chips, mentions, brace attributes, heading anchors, code meta and front matter.
 * @contract Renders the canonical HTML, which is the HTML LoomaEditor saves. It is not sanitized.
 * Linkify and raw HTML are instance options; `createLoomaMarkdownIt` turns both on.
 */
export function loomaMarkdown(md: MarkdownIt): void {
  const escape = md.utils.escapeHtml;
  md.block.ruler.before("table", "looma_frontmatter", frontmatter);
  md.block.ruler.before("fence", "looma_container", container, { alt: ["paragraph", "reference", "blockquote", "list"] });
  md.block.ruler.before("paragraph", "looma_leaf", leaf, { alt: ["paragraph", "reference", "blockquote", "list"] });
  md.inline.ruler.before("link", "looma_directive", directive);
  md.core.ruler.after("block", "looma_task_lists", taskLists);
  md.core.ruler.before("inline", "looma_alerts", alerts);
  md.core.ruler.before("text_join", "looma_attributes", attributes);

  const rules = md.renderer.rules;
  rules.looma_frontmatter = () => "";
  rules.looma_container_open = (tokens, index) => {
    const { info, meta } = tokens[index];
    if (info === "details") return `<details${meta.open ? " open" : ""}><summary>${escape(meta.title || "Details")}</summary>\n`;
    if (info === "figure") return "<figure>\n";
    if (info === "tabs" || info === "code-group") {
      return `<ui-tabs${info === "code-group" ? ' class="code-group"' : ""} group="${escape(meta.title || info)}">\n`;
    }
    return `<ui-callout tone="${normalizeLoomaCalloutTone(info)}"${meta.title ? ` heading="${escape(meta.title)}"` : ""}>\n`;
  };
  rules.looma_container_close = (tokens, index, _options, env) => {
    const { info } = tokens[index];
    if (info === "details") return "</details>\n";
    if (info === "figure") {
      const title = tokens[index].meta.title as string;
      return `${title ? `<figcaption>${md.renderInline(title, env)}</figcaption>\n` : ""}</figure>\n`;
    }
    if (info === "tabs" || info === "code-group") return "</ui-tabs>\n";
    return "</ui-callout>\n";
  };
  rules.looma_tab_open = (tokens, index) => `<section aria-label="${escape(tokens[index].meta.label)}">\n`;
  rules.looma_tab_close = () => "</section>\n";
  rules.looma_toc = (tokens, index) => tableOfContents(tokens, tokens[index].meta.format, tokens[index].meta.depth, escape);
  rules.looma_chip = (tokens, index) => {
    const { label, attributes } = tokens[index].meta as { label: string; attributes: LoomaAttributes };
    const tone = normalizeLoomaChipTone(attributes.tone);
    return `<span data-looma-chip="" data-label="${escape(label)}" data-color="${tone}"${label ? "" : ' data-placeholder=""'}>${escape(label)}</span>`;
  };
  rules.looma_mention = (tokens, index) => {
    const { label, attributes } = tokens[index].meta as { label: string; attributes: LoomaAttributes };
    const id = String(attributes.id);
    return `<span data-type="mention" class="looma-mention" data-id="${escape(id)}" data-label="${escape(label || id)}">@${escape(label || id)}</span>`;
  };
  const listItem = rules.list_item_open ?? ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));
  rules.list_item_open = (tokens, index, options, env, self) => {
    const html = listItem(tokens, index, options, env, self);
    const task = tokens[index].meta as { checked?: boolean } | null;
    return task && typeof task.checked === "boolean" ? `${html}<input type="checkbox" disabled=""${task.checked ? ' checked=""' : ""}>` : html;
  };
  // Code holds its lines without the newline that closes the last one.
  const code = (content: string, info: string) => {
    const { language, meta } = parseLoomaFenceInfo(info);
    return `<pre><code${language ? ` class="language-${escape(language)}"` : ""}${meta ? ` data-meta="${escape(meta)}"` : ""}>` +
      `${escape(content.replace(/\n$/, ""))}</code></pre>\n`;
  };
  rules.fence = (tokens, index) => code(tokens[index].content, tokens[index].info);
  rules.code_block = (tokens, index) => code(tokens[index].content, "");
}

/**
 * A markdown-it instance for Looma Markdown: raw HTML and GFM autolinks on, with `loomaMarkdown`.
 * @contract Each call returns a new instance that callers may extend.
 */
export function createLoomaMarkdownIt(): MarkdownIt {
  return new MarkdownIt({ html: true, linkify: true, typographer: false }).use(loomaMarkdown);
}
