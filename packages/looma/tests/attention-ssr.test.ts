import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import ListItem from "../vue/UiListItem.js";
import Badge from "../vue/UiBadge.js";

describe("Attention presentation before upgrade", () => {
  it("highlights several rows without claiming a current or selected destination", async () => {
    const html = await renderToString(createSSRApp({ render: () => [
      h(ListItem, { highlighted: true }, () => "New message"),
      h(ListItem, { highlighted: true }, () => "Another new message"),
    ] }));
    expect(html.match(/data-ui-list-item-state="[^"]*highlighted/g)).toHaveLength(2);
    expect(html).not.toContain('aria-current="true"');
    expect(html).not.toContain("aria-selected");
  });

  it("can wrap explanatory rows without changing the default one-line contract", async () => {
    const wrapped = await renderToString(createSSRApp({ render: () =>
      h(ListItem, { wrap: true }, () => "A person asked you to review a long document title") }));
    expect(wrapped).toMatch(/data-ui-list-item-state="[^"]*\bwrap\b/);
    const ordinary = await renderToString(createSSRApp({ render: () => h(ListItem, {}, () => "Document") }));
    expect(ordinary).not.toMatch(/data-ui-list-item-state="[^"]*\bwrap\b/);
  });

  it("preserves a dot's state label in server-rendered markup", async () => {
    const html = await renderToString(createSSRApp({ render: () =>
      h(Badge, { shape: "dot", tone: "warning" }, () => "Waiting for your reply") }));
    expect(html).toContain("Waiting for your reply");
    expect(html).toContain('class="label"');
    expect(html).toContain("shape=dot");
    expect(html).not.toContain("role=\"status\"");
  });
});
