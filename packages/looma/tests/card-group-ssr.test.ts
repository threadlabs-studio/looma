import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { Card, CardGroup } from "../vue/index.js";

describe("CardGroup before upgrade", () => {
  it("renders native Grid and Card regions in reading order without application context", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(CardGroup, { min: "md", columns: 2 }, () => h(Card, { id: "record" }, {
        header: () => h("h2", "Archive"),
        default: () => h("p", "Notes and records"),
        actions: () => h("a", { href: "#read" }, "Read records"),
      })),
    }));
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelector("[data-hn-ui-card-group]")).not.toBeNull();
    expect(doc.querySelector("[data-hn-ui-grid]")).not.toBeNull();
    const card = doc.querySelector("#record")!;
    expect(card.querySelector(".header")?.textContent).toBe("Archive");
    expect(card.querySelector(".content")?.textContent).toBe("Notes and records");
    expect(card.querySelector(".actions a")?.getAttribute("href")).toBe("#read");
    expect(card.textContent).toBe("ArchiveNotes and recordsRead records");
  });

  it("retains standalone natural content and semantic root choices", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(Card, { as: "article" }, () => [
        h("h2", "Title"), h("p", "Body"), h("a", { href: "#next" }, "Next"),
      ]),
    }));
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelector("article[data-hn-ui-card]")?.textContent).toBe("TitleBodyNext");
    expect(doc.querySelector(".content a")?.getAttribute("href")).toBe("#next");
  });
});
