// Renders ui-icon on the server through the built Vue components (run `pnpm build` first). An icon is
// static data: the server's HTML carries its whole drawing, with no JavaScript needed to show it.
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import Icon from "../vue/UiIcon.js";
import Spinner from "../vue/UiSpinner.js";

const render = (...nodes: ReturnType<typeof h>[]) => renderToString(createSSRApp({ render: () => nodes }));
const shapes = (html: string) => [...html.matchAll(/<(path|circle|rect|line)\b[^>]*>/g)].map(([shape]) => shape.replace(/ data-v-\w+/g, ""));

describe("Icon server render", () => {
  it("draws the named icon's shapes", async () => {
    expect(shapes(await render(h(Icon, { name: "circle-check" })))).toEqual([
      '<circle cx="12" cy="12" r="10">',
      '<path d="m9 12 2 2 4-4">',
    ]);
    expect(shapes(await render(h(Icon, { name: "columns" })))).toEqual([
      '<rect x="3" y="3" width="18" height="18" rx="2">',
      '<path d="M9 3v18">',
      '<path d="M15 3v18">',
    ]);
    expect(shapes(await render(h(Icon, { name: "underline" })))).toEqual([
      '<path d="M6 4v6a6 6 0 0 0 12 0V4">',
      '<line x1="4" y1="20" x2="20" y2="20">',
    ]);
  });

  it("draws an icon another component renders", async () => {
    expect(shapes(await render(h(Spinner)))).toEqual(['<path d="M21 12a9 9 0 1 1-6.219-8.56">']);
  });

  it("draws nothing for an unknown or empty name, and stays hidden from assistive technology", async () => {
    for (const name of ["not-an-icon", ""]) {
      const html = await render(h(Icon, { name }));
      expect(shapes(html)).toEqual([]);
      expect(html).toContain('aria-hidden="true"');
    }
  });
});
