import { JSDOM } from "jsdom";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import Pagination from "../vue/UiPagination.js";

const render = (props = {}) => renderToString(createSSRApp({ render: () => h(Pagination, props) }));
describe("Pagination before upgrade", () => {
  it("renders native routes, a named landmark, current page and noninteractive gaps", async () => {
    const html = await render({ page: 2, hasPrevious: true, hasNext: true, previousHref: "?page=1", nextHref: "?page=3", pages: [{ value: 1, href: "?page=1" }, { value: 2, href: "?page=2" }, { value: 8, href: "?page=8" }] });
    expect(html).toMatch(/<nav\b[^>]*aria-label="Results pages"/);
    expect(new JSDOM(html).window.document.querySelector('a[aria-current="page"]')?.getAttribute("href")).toBe("?page=2");
    expect(html).toContain('aria-label="Page 8"');
    expect(html).toMatch(/aria-hidden="true"[^>]*>…<\/span>/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
  it("keeps unknown-total navigation explicit and the first-page boundary unavailable", async () => {
    const html = await render({ page: 1, hasPrevious: true, hasNext: true });
    expect(new JSDOM(html).window.document.querySelector<HTMLButtonElement>('button[data-pagination-page="0"]')?.disabled).toBe(true);
    expect(new JSDOM(html).window.document.querySelector<HTMLButtonElement>('button[data-pagination-page="2"]')?.disabled).toBe(false);
    expect(html).not.toContain('aria-current="page"');
  });
  it("removes destinations when disabled and localizes control labels", async () => {
    const html = await render({ disabled: true, page: 2, hasPrevious: true, hasNext: true, label: "Pages du catalogue", previousLabel: "Précédente", nextLabel: "Suivante", pageLabel: "Page du catalogue", previousHref: "?page=1", nextHref: "?page=3", pages: [{ value: 2, href: "?page=2" }] });
    expect(html).toContain('aria-label="Pages du catalogue"');
    expect(html).toContain("Précédente");
    expect(html).toContain("Suivante");
    expect(html).toContain('aria-label="Page du catalogue 2"');
    expect(new JSDOM(html).window.document.querySelector("a[href]")).toBeNull();
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(3);
  });
});
