/**
 * Looma Markdown's vocabulary and pure rules, shared by every reader and writer.
 *
 * Nothing here touches the DOM or a Markdown parser, so it is safe to import during SSR. The
 * markdown-it plugin is `@threadlabs/looma/markdown/markdown-it`; conformance fixtures are
 * `@threadlabs/looma/markdown/fixtures`.
 */

// `tone` names one of two kinds of value. Callouts and badges take meanings, which share the core
// below; chips and swatches take hues.

/** The meanings Callout and Badge share. Callout adds `note`, `tip` and `important`; Badge adds `accent`. */
export const LOOMA_MEANING_TONES = ["neutral", "info", "success", "warning", "danger"] as const;

/** Badge's tones: the shared meanings and `accent`. */
export const LOOMA_BADGE_TONES = ["neutral", "accent", "info", "success", "warning", "danger"] as const;

/**
 * Callout tones a document stores, in the order the editor offers them. The Callout component also
 * takes `neutral` and `success`, which Markdown and the editor store as `note`.
 */
export const LOOMA_CALLOUT_TONES = ["note", "tip", "info", "important", "warning", "danger"] as const;

/** A stored callout tone. */
export type LoomaCalloutTone = (typeof LOOMA_CALLOUT_TONES)[number];

/** Names that read as a stored tone: `caution` is `danger`, and `neutral` is the same muted aside as `note`. */
export const LOOMA_CALLOUT_TONE_ALIASES: Readonly<Record<string, LoomaCalloutTone>> = { caution: "danger", neutral: "note" };

/**
 * Maps a tone name or alias, in any case, onto a stored tone.
 * @failure Unknown and non-string values become `note`.
 */
export function normalizeLoomaCalloutTone(value: unknown): LoomaCalloutTone {
  if (typeof value !== "string") return "note";
  const tone = value.toLowerCase();
  return LOOMA_CALLOUT_TONES.includes(tone as LoomaCalloutTone) ? tone as LoomaCalloutTone : LOOMA_CALLOUT_TONE_ALIASES[tone] ?? "note";
}

/** The hues chips and swatches take as their tone, written `:chip[Label]{tone=green}`. */
export const LOOMA_CHIP_TONES = ["neutral", "blue", "green", "yellow", "red", "purple"] as const;

/** A stored chip tone. */
export type LoomaChipTone = (typeof LOOMA_CHIP_TONES)[number];

/**
 * Keeps a chip tone within the palette.
 * @failure Unknown values become `neutral`.
 */
export function normalizeLoomaChipTone(value: unknown): LoomaChipTone {
  return LOOMA_CHIP_TONES.includes(value as LoomaChipTone) ? value as LoomaChipTone : "neutral";
}

/**
 * Names that open a `:::` container, matched without regard to case. A container with any other
 * name is ordinary text.
 */
export const LOOMA_CONTAINER_NAMES: ReadonlySet<string> = new Set([
  ...LOOMA_CALLOUT_TONES, "caution", "details", "figure", "tabs", "code-group",
]);

/** Brace attributes: `{#id}` sets `id`, `key=value` and `key="quoted value"` set values, and a bare key is `true`. */
export type LoomaAttributes = Record<string, string | true>;

const ATTRIBUTE_KEY = /[A-Za-z][\w-]*/y;
const ATTRIBUTE_ID = /#([\w-]+)/y;
const ATTRIBUTE_VALUE = /[^\s"'=<>`{}]+/y;

function sticky(pattern: RegExp, source: string, index: number): RegExpExecArray | null {
  pattern.lastIndex = index;
  return pattern.exec(source);
}

/**
 * Reads a brace attribute list starting at `source[start]`, which must be `{`.
 * @contract Returns the attributes and the index just past the closing brace.
 * @failure Returns null for anything that is not a complete, well-formed list, so the text stays literal.
 */
export function readLoomaAttributes(source: string, start = 0): { attributes: LoomaAttributes; end: number } | null {
  if (source[start] !== "{") return null;
  const attributes: LoomaAttributes = {};
  let index = start + 1;
  for (;;) {
    while (source[index] === " " || source[index] === "\t") index++;
    if (source[index] === "}") return { attributes, end: index + 1 };
    if (index > start + 1 && !/\s/.test(source[index - 1])) return null;
    const id = sticky(ATTRIBUTE_ID, source, index);
    if (id) { attributes.id = id[1]; index += id[0].length; continue; }
    const key = sticky(ATTRIBUTE_KEY, source, index);
    if (!key) return null;
    index += key[0].length;
    if (source[index] !== "=") { attributes[key[0]] = true; continue; }
    index++;
    const quote = source[index];
    if (quote === '"' || quote === "'") {
      const close = source.indexOf(quote, index + 1);
      if (close < 0) return null;
      attributes[key[0]] = source.slice(index + 1, close);
      index = close + 1;
      continue;
    }
    const value = sticky(ATTRIBUTE_VALUE, source, index);
    if (!value) return null;
    attributes[key[0]] = value[0];
    index += value[0].length;
  }
}

/**
 * Reads a whole string as one brace attribute list.
 * @failure Returns null unless the string is exactly one well-formed list.
 */
export function parseLoomaAttributes(source: string): LoomaAttributes | null {
  const read = readLoomaAttributes(source);
  return read && read.end === source.length ? read.attributes : null;
}

/**
 * Writes attributes as a brace list, `id` first as `#id`, then the rest in order.
 * @contract `true` writes a bare key; values are quoted only when they need it. `false`, null and
 * undefined values are left out, and an empty set writes an empty string. An ID that `#` cannot
 * carry, or any ID when `hashId` is false, is written `id=…`.
 */
export function formatLoomaAttributes(attributes: Readonly<Record<string, string | number | boolean | null | undefined>>, { hashId = true } = {}): string {
  const items: string[] = [];
  const { id, ...rest } = attributes;
  const hashed = hashId && typeof id === "string" && /^[\w-]+$/.test(id);
  if (hashed) items.push(`#${id}`);
  for (const [key, value] of Object.entries(hashed ? rest : attributes)) {
    if (value === true) items.push(key);
    else if (value === false || value === null || value === undefined) continue;
    else {
      const text = String(value);
      items.push(/^[^\s"'=<>`{}]+$/.test(text) ? `${key}=${text}` : text.includes('"') ? `${key}='${text}'` : `${key}="${text}"`);
    }
  }
  return items.length ? `{${items.join(" ")}}` : "";
}

/**
 * The anchor a heading's text derives: NFC, lowercase, keeping letters, numbers and combining
 * marks, with every other run of characters one hyphen.
 * @failure Text with no letters or numbers, such as only emoji, derives `heading`.
 */
export function loomaHeadingSlug(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, "-").replace(/^-+|-+$/g, "") || "heading";
}

/**
 * Gives every heading of a document its anchor, in document order.
 * @contract A custom ID is kept unless an earlier heading already has it. Any other heading takes
 * its slug, or the slug's first free suffix (`-1`, `-2`…), never one a later custom ID reserves.
 */
export function assignLoomaHeadingIds(headings: ReadonlyArray<{ readonly text: string; readonly id?: string | null }>): string[] {
  const reserved = new Set(headings.map(({ id }) => id).filter((id): id is string => Boolean(id)));
  const used = new Set<string>();
  return headings.map(({ text, id: custom }) => {
    let id = custom || loomaHeadingSlug(text);
    if (custom ? used.has(id) : used.has(id) || reserved.has(id)) {
      const stem = id;
      let suffix = 1;
      while (used.has(`${stem}-${suffix}`) || reserved.has(`${stem}-${suffix}`)) suffix++;
      id = `${stem}-${suffix}`;
    }
    used.add(id);
    return id;
  });
}

/** A code fence's info string, read into its parts. */
export interface LoomaFenceInfo {
  /** The first word, up to a space, `{` or `:`. */
  language?: string;
  /** Everything after the language, as written. */
  meta: string;
  /** `title="…"`. */
  title?: string;
  /** Lines `{1,3-5}` highlights, ascending. */
  lines: number[];
  /** `:line-numbers` is true and `:no-line-numbers` false; absent means the site default. */
  lineNumbers?: boolean;
}

/** Reads a fence's info string: ```` ```ts title="a.ts" {1,3-5} :line-numbers ````. */
export function parseLoomaFenceInfo(info: string): LoomaFenceInfo {
  const source = info.trim();
  const language = /^[^\s={:]+(?=[\s{:]|$)/.exec(source)?.[0];
  const meta = (language ? source.slice(language.length) : source).trim();
  const title = /(?:^|\s)title="([^"]*)"/.exec(meta)?.[1];
  const rest = meta.replace(/(?:^|\s)title="[^"]*"/, "");
  const lines = new Set<number>();
  for (const range of /\{([\d\s,-]+)\}/.exec(rest)?.[1].split(",") ?? []) {
    const [from = NaN, to = from] = range.split("-").map(part => Number.parseInt(part, 10));
    for (let line = from; line <= to; line++) lines.add(line);
  }
  const numbers = /:(no-)?line-numbers(?![\w-])/.exec(rest);
  return {
    ...(language ? { language } : {}), meta,
    ...(title !== undefined ? { title } : {}),
    lines: [...lines].sort((a, b) => a - b),
    ...(numbers ? { lineNumbers: numbers[1] === undefined } : {}),
  };
}

/**
 * Splits YAML front matter from the start of a document.
 * @contract Front matter opens with a `---` line at the very start, holds at least one `key: value`
 * line, and closes at a `---` or `...` line. `source` is the block as written, delimiters included.
 * @failure Returns null when the document has none.
 */
export function splitLoomaFrontmatter(document: string): { source: string; yaml: string; body: string } | null {
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(document.slice(0, 8_192));
  if (!match || !/^[A-Za-z][\w-]*:[ \t]*\S/m.test(match[1])) return null;
  return { source: match[0].trimEnd(), yaml: match[1], body: document.slice(match[0].length) };
}

/** The colons a container opens and closes with, given how deeply containers nest inside it. */
export function loomaContainerMarker(nestedDepth: number): string {
  return ":".repeat(3 + Math.max(0, nestedDepth));
}

/** A backtick fence longer than any run of backticks in the code, and at least three long. */
export function loomaCodeFence(code: string): string {
  const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map(run => run.length));
  return "`".repeat(Math.max(3, longest + 1));
}
