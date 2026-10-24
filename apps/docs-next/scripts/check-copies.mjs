import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Until Markupress serves /looma/, these pages are copies of apps/docs/docs. Edit both; this check
// fails when they drift. Markupress front matter, a Docusaurus-only fence flag and the relative
// paths of .md links (files moved into a route group) are not content. getting-started.md is
// compared from its first copied heading; its opening section is converted from a React component.
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const copies = [
  ["getting-started.md", "getting-started.md", "## Install Looma"],
  ["release-1-support.md", "release-1-support.md"],
  ["editor.mdx", "editor.md"],
  ["editor/looma-editor.mdx", "editor/looma-editor.md"],
  ...["architecture", "conventions", "tokens", "overlay-contract", "adapter-parity", "docs-api-sync", "looma-markdown", "component-library-audit"]
    .map((page) => [`${page}.md`, `03.(Foundations)/${page}.md`]),
];

const content = (source, from) => {
  const body = source.replace('import { EditorGuideDemo } from "@site/src/components/EditorGuideDemo";', '<link rel="component" href="@/app/components/looma-editor-guide.html">').replace("<EditorGuideDemo />", "<looma-editor-guide></looma-editor-guide>").replaceAll("className=", "class=").replace(/^---\n[\s\S]*?\n---\n+/, "").replaceAll("```bash npm2yarn", "```bash").replace(/\]\((?:\.\.?\/)+([\w-]+\.md)/g, "](./$1");
  return from === undefined ? body : body.slice(body.indexOf(from));
};

const drifted = [];
for (const [source, copy, from] of copies) {
  const [original, copied] = await Promise.all([
    readFile(path.join(app, "../docs/docs", source), "utf8"),
    readFile(path.join(app, "docs", copy), "utf8"),
  ]);
  if (content(original, from) !== content(copied, from)) drifted.push(`apps/docs-next/docs/${copy} differs from apps/docs/docs/${source}`);
}
if (drifted.length > 0) {
  console.error(drifted.join("\n"));
  process.exitCode = 1;
} else console.log(`${copies.length} copied pages match apps/docs/docs.`);
