import { expect, test } from "@playwright/test";

// Stage 1 exit check: each page's main text matches the Docusaurus page, and every page renders
// its whole content with JavaScript off. A copied page that drifts from apps/docs/docs fails here.

// Platform defects that change a page's text. Each is normalized away so the rest of the page is
// still compared, and the exact comparison must still differ: remove the entry once it is fixed.
const whitespace = {
  reason: "HTML Next drops whitespace-only text between elements, so `<strong>a</strong> <code>b</code>` reads \"ab\"",
  normalize: (text) => text.replace(/\s/g, ""),
};
const notation = {
  reason: "Looma Markdown has no literal form of a code notation marker: every fence strips `// [!code highlight]`",
  normalize: (text) => text.replace(" // [!code highlight]", ""),
};
const pages = [
  { docusaurus: "getting-started/", markupress: "getting-started/", views: [[], ["Vue"]] },
  ...["release-1-support", "architecture", "conventions", "tokens", "overlay-contract", "adapter-parity", "docs-api-sync"]
    .map((page) => ({ docusaurus: `${page}/`, markupress: `${page}/`, views: [[]] })),
  { docusaurus: "looma-markdown/", markupress: "looma-markdown/", views: [[]], defects: { "": [notation, whitespace] } },
  { docusaurus: "component-library-audit/", markupress: "component-library-audit/", views: [[]], defects: { "": [whitespace] } },
  { docusaurus: "components/ui-stack/", markupress: "components/layout/ui-stack/", views: [[], ["API"], ["Vue"]], defects: { API: [whitespace] } },
];

// Each site's widget controls are not page text: tab lists, buttons, Docusaurus's heading-link
// marks, its framework mode switch, and the step numbers it draws inside a list.
const sites = {
  docusaurus: {
    root: "article .theme-doc-markdown",
    chrome: "[role=tablist], button, .hash-link, .looma-mode-switch, .looma-model__steps li > span",
    // Docusaurus escapes a `{#id}` heading ID even inside a code fence, and shows the backslash.
    // DeclarativeModel.tsx's JSX drops the space before its <code>; the Markdown page keeps it.
    fix: (text) => text.replaceAll("\\{#", "{#").replace("through@threadlabs/looma/vue", "through @threadlabs/looma/vue"),
  },
  markupress: { root: "article.markupress-prose", chrome: "[role=tablist], button" },
};

async function mainText(page, site, { allPanels = false } = {}) {
  const { root, chrome, fix = (text) => text } = sites[site];
  return fix(await page.evaluate(({ root, chrome, allPanels }) => {
    const style = document.head.appendChild(document.createElement("style"));
    style.textContent = "* { text-transform: none !important; }";
    const article = document.querySelector(root);
    if (!article) throw new Error(`No ${root}`);
    const removed = [...article.querySelectorAll(chrome)].map((element) => [element, element.style.display]);
    for (const [element] of removed) element.style.display = "none";
    const panels = allPanels ? [...article.querySelectorAll("[role=tabpanel][hidden]")] : [];
    for (const panel of panels) panel.hidden = false;
    const text = article.innerText.replace(/\s+/g, " ").trim();
    for (const panel of panels) panel.hidden = true;
    for (const [element, display] of removed) element.style.display = display;
    style.remove();
    return text;
  }, { root, chrome, allPanels }));
}

async function open(page, url, site) {
  await page.goto(url, { waitUntil: "networkidle" });
  if (site === "docusaurus") await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);
  else if (await page.locator("ui-tabs").count()) await expect(page.getByRole("tab").first()).toBeVisible();
}

async function choose(page, labels) {
  for (const name of labels) {
    await page.getByRole("tab", { name, exact: true }).or(page.getByRole("button", { name, exact: true })).first().click();
  }
}

for (const entry of pages) {
  test.describe(entry.markupress, () => {
    for (const view of entry.views) {
      test(`text matches Docusaurus${view.length ? ` with ${view.join(", ")} selected` : ""}`, async ({ browser }, info) => {
        const texts = {};
        for (const site of ["docusaurus", "markupress"]) {
          const page = await browser.newPage();
          await open(page, info.config.metadata[site] + entry[site], site);
          await choose(page, view);
          texts[site] = await mainText(page, site);
          await page.close();
        }
        expect(texts.markupress.length).toBeGreaterThan(0);
        const defects = entry.defects?.[view.join(", ")] ?? [];
        const normalize = (text) => defects.reduce((result, defect) => defect.normalize(result), text);
        expect(normalize(texts.markupress)).toBe(normalize(texts.docusaurus));
        if (defects.length) {
          expect(texts.markupress, `Fixed? ${defects.map((defect) => defect.reason).join("; ")}`).not.toBe(texts.docusaurus);
        }
      });
    }

    test("renders every panel with JavaScript off", async ({ browser }, info) => {
      const url = info.config.metadata.markupress + entry.markupress;
      const live = await browser.newPage();
      await open(live, url, "markupress");
      const expected = await mainText(live, "markupress", { allPanels: true });
      await live.close();

      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(url);
      await expect(page.locator("h1")).toBeVisible();
      for (const stage of await page.locator("[data-component-preview] > *").all()) await expect(stage).toBeVisible();
      expect(await mainText(page, "markupress")).toBe(expected);
      await context.close();
    });
  });
}
