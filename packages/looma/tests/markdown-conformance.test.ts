// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  applyLoomaCodeNotation,
  assignLoomaHeadingIds,
  formatLoomaAttributes,
  loomaCodeFence,
  loomaContainerMarker,
  loomaHeadingSlug,
  parseLoomaAttributes,
  parseLoomaFenceInfo,
  splitLoomaFrontmatter,
} from "../src/markdown";
import { LOOMA_MARKDOWN_FIXTURES } from "../src/markdown/fixtures";

describe("Looma Markdown conformance", () => {
  it("covers every row of the spec's Support table", () => {
    expect(new Set(LOOMA_MARKDOWN_FIXTURES.map(fixture => fixture.feature)).size).toBe(21);
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

  it("applies code notation", () => {
    expect(applyLoomaCodeNotation("a\nb // [!code highlight]\n# [!code highlight:2]\nc\nd <!-- [!code highlight] -->"))
      .toEqual({ code: "a\nb\nc\nd", lines: [2, 3, 4] });
    expect(applyLoomaCodeNotation("plain")).toEqual({ code: "plain", lines: [] });
    expect(applyLoomaCodeNotation("a // [\\!code highlight]\nb // [\\\\!code highlight:2]\n[\\!other]"))
      .toEqual({ code: "a // [!code highlight]\nb // [\\!code highlight:2]\n[\\!other]", lines: [] });
  });

  it("recognizes front matter whose values are scalars, lists or mappings", () => {
    for (const yaml of ["title: A", "aliases:\n  - /old/", "head:\n  meta:\n    robots: noindex", "# comment\n\"quoted key\": 1", "key:"]) {
      expect(splitLoomaFrontmatter(`---\n${yaml}\n---\nBody`)?.yaml, yaml).toBe(yaml);
    }
    for (const text of ["A short note.", "- item", "https://example.com", "  indented: value"]) {
      expect(splitLoomaFrontmatter(`---\n${text}\n---\nBody`), text).toBeNull();
    }
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
