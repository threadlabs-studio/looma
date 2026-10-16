import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { createLoomaMarkdownIt } from "../src/markdown/markdown-it";
import { LOOMA_MARKDOWN_FIXTURES } from "../src/markdown/fixtures";

afterEach(() => { document.body.innerHTML = ""; });

// Canonical HTML is what readers get, so every fixture must pass WCAG A and AA as rendered.
async function violations(html: string) {
  const main = document.createElement("main");
  main.innerHTML = html;
  document.body.append(main);
  const results = await axe.run(main, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });
  main.remove();
  return results.violations.map(({ id, nodes }) => `${id}: ${nodes.map(node => node.html).join(" ")}`);
}

describe("Looma Markdown's canonical HTML is accessible (real browser)", () => {
  const md = createLoomaMarkdownIt();
  it.each(LOOMA_MARKDOWN_FIXTURES.map(fixture => [`${fixture.feature}/${fixture.name}`, fixture] as const))("%s", async (_name, fixture) => {
    expect(await violations(fixture.html)).toEqual([]);
    expect(await violations(md.render(fixture.markdown))).toEqual([]);
  });

  it("names each task list checkbox by its item's text", async () => {
    const main = document.createElement("main");
    main.innerHTML = md.render("- [x] Read the changelog\n- [ ] Run the migration\n");
    document.body.append(main);
    const boxes = [...main.querySelectorAll<HTMLInputElement>("input[type=checkbox]")];
    expect(boxes.map(box => [box.labels?.[0]?.textContent?.trim(), box.checked, box.disabled]))
      .toEqual([["Read the changelog", true, true], ["Run the migration", false, true]]);
  });
});
