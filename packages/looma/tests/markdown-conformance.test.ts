// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  assignLoomaHeadingIds,
  formatLoomaAttributes,
  loomaCodeFence,
  loomaContainerMarker,
  loomaHeadingSlug,
  parseLoomaAttributes,
  parseLoomaFenceInfo,
  splitLoomaFrontmatter,
} from "../src/markdown";
import { createLoomaMarkdownIt } from "../src/markdown/markdown-it";
import { LOOMA_MARKDOWN_FIXTURES, normalizeLoomaHtml } from "../src/markdown/fixtures";

describe("Looma Markdown conformance", () => {
  const md = createLoomaMarkdownIt();
  it.each(LOOMA_MARKDOWN_FIXTURES.map(fixture => [`${fixture.feature}/${fixture.name}`, fixture] as const))("%s renders the canonical HTML", (_name, fixture) => {
    expect(normalizeLoomaHtml(md.render(fixture.markdown))).toBe(normalizeLoomaHtml(fixture.html));
  });

  it("covers every row of the spec's Support table", () => {
    expect(new Set(LOOMA_MARKDOWN_FIXTURES.map(fixture => fixture.feature)).size).toBe(20);
  });

  it("keeps front matter as metadata", () => {
    const env: { frontmatter?: string } = {};
    md.render("---\ntitle: Notes\n---\n# Notes\n", env);
    expect(env.frontmatter).toBe("title: Notes");
  });

  it("leaves text literal when a brace list or directive is malformed", () => {
    expect(md.render(":chip[Ready]{tone=green\n")).toBe("<p>:chip[Ready]{tone=green</p>\n");
    expect(md.render(":mention[Ada]\n")).toBe("<p>:mention[Ada]</p>\n");
    expect(md.render("## Title {not an id}\n")).toContain(">Title {not an id}</h2>");
    expect(md.render("::toc{depth=\n")).toBe("<p>::toc{depth=</p>\n");
  });
});

describe("Looma Markdown rules", () => {
  it("reads and writes brace attributes", () => {
    expect(parseLoomaAttributes('{#install width=640 title="Two words" alt=\'say "hi"\' open}')).toEqual({
      id: "install", width: "640", title: "Two words", alt: 'say "hi"', open: true,
    });
    expect(parseLoomaAttributes("{a=1b=2}")).toBeNull();
    expect(parseLoomaAttributes("{#a#b}")).toBeNull();
    expect(parseLoomaAttributes("{}")).toEqual({});
    expect(formatLoomaAttributes({ width: 640, id: "x", open: true, closed: false, title: "Two words", alt: 'say "hi"' }))
      .toBe(`{#x width=640 open title="Two words" alt='say "hi"'}`);
    expect(formatLoomaAttributes({})).toBe("");
  });

  it("derives heading anchors with suffixes, reserving custom IDs", () => {
    expect(loomaHeadingSlug("Über `code` & more")).toBe("über-code-more");
    expect(loomaHeadingSlug("U\u0308ber")).toBe("über");
    expect(loomaHeadingSlug("設定 と 使い方")).toBe("設定-と-使い方");
    expect(loomaHeadingSlug("!!!")).toBe("heading");
    expect(loomaHeadingSlug("🚀 🎉")).toBe("heading");
    expect(assignLoomaHeadingIds([{ text: "Setup" }, { text: "Install", id: "setup" }, { text: "Setup" }, { text: "Other", id: "setup" }]))
      .toEqual(["setup-1", "setup", "setup-2", "setup-3"]);
  });

  it("reads a fence's info string", () => {
    expect(parseLoomaFenceInfo('ts title="a.ts" {1,3-4} :line-numbers')).toEqual({
      language: "ts", meta: 'title="a.ts" {1,3-4} :line-numbers', title: "a.ts", lines: [1, 3, 4], lineNumbers: true,
    });
    expect(parseLoomaFenceInfo("ts{2}:no-line-numbers")).toEqual({ language: "ts", meta: "{2}:no-line-numbers", lines: [2], lineNumbers: false });
    expect(parseLoomaFenceInfo('title="notes.txt"')).toEqual({ meta: 'title="notes.txt"', title: "notes.txt", lines: [] });
  });

  it("splits front matter and sizes markers", () => {
    expect(splitLoomaFrontmatter("---\ntitle: A\n...\nBody")).toEqual({ source: "---\ntitle: A\n...", yaml: "title: A", body: "Body" });
    expect(splitLoomaFrontmatter("---\n---\nBody")).toBeNull();
    expect(loomaContainerMarker(0)).toBe(":::");
    expect(loomaContainerMarker(2)).toBe(":::::");
    expect(loomaCodeFence("a ```` b")).toBe("`````");
    expect(loomaCodeFence("plain")).toBe("```");
  });
});

describe("Looma Markdown autolinks", () => {
  it("links a scheme or www. address and leaves a bare domain as text", () => {
    expect(createLoomaMarkdownIt().render("example.com and www.example.com\n"))
      .toBe('<p>example.com and <a href="http://www.example.com">www.example.com</a></p>\n');
  });
});
