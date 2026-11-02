import { expect } from "./renderers/test-context";
import { componentRoot } from "./renderers/selectors";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneToString } from "@looma-test/scene";
import { JSDOM } from "jsdom";
import { describe, it } from "vitest";
import { UiCard as Card, UiCardGroup as CardGroup } from "@looma-test/components";

describe("CardGroup before upgrade", () => {
  it("renders native Grid and Card regions in reading order without application context", async () => {
    const html = await renderSceneToString(createHydratedScene({
      render: () => sceneNode(CardGroup, { min: "md", columns: 2 }, () => sceneNode(Card, { id: "record" }, {
        header: () => sceneNode("h2", "Archive"),
        default: () => sceneNode("p", "Notes and records"),
        actions: () => sceneNode("a", { href: "#read" }, "Read records"),
      })),
    }));
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelector(":is([component~=\"ui-card-group\"], [data-component~=\"ui-card-group\"], .ui-card-group, [ui-card-group])")).not.toBeNull();
    expect(doc.querySelector(":is([component~=\"ui-grid\"], [data-component~=\"ui-grid\"], .ui-grid, [ui-grid])")).not.toBeNull();
    const card = doc.querySelector("#record")!;
    expect(card.querySelector(".header")?.textContent).toBe("Archive");
    expect(card.querySelector(".content")?.textContent).toBe("Notes and records");
    expect(card.querySelector(".actions a")?.getAttribute("href")).toBe("#read");
    expect(card.textContent).toBe("ArchiveNotes and recordsRead records");
  });

  it("accepts every optional slot combination and preserves supplied reading order", async () => {
    for (let slots = 0; slots < 8; slots++) {
      const html = await renderSceneToString(createHydratedScene({
        render: () => sceneNode(CardGroup, {}, () => sceneNode(Card, {}, {
          ...(slots & 1 ? { header: () => sceneNode("h2", "Title") } : {}),
          ...(slots & 2 ? { default: () => sceneNode("p", "Body") } : {}),
          ...(slots & 4 ? { actions: () => sceneNode("a", { href: "#read" }, "Read") } : {}),
        })),
      }));
      const doc = new JSDOM(html).window.document;
      expect(doc.querySelector(componentRoot("ui-card-group"))?.textContent).toBe(`${slots & 1 ? "Title" : ""}${slots & 2 ? "Body" : ""}${slots & 4 ? "Read" : ""}`);
      if (slots & 4) expect(doc.querySelector("a")?.getAttribute("href")).toBe("#read");
    }
  });

  it("retains standalone natural content and semantic root choices", async () => {
    const html = await renderSceneToString(createHydratedScene({
      render: () => sceneNode(Card, { as: "article" }, () => [
        sceneNode("h2", "Title"), sceneNode("p", "Body"), sceneNode("a", { href: "#next" }, "Next"),
      ]),
    }));
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelector("article:is([component~=\"ui-card\"], [data-component~=\"ui-card\"], .ui-card, [ui-card])")?.textContent).toBe("TitleBodyNext");
    expect(doc.querySelector(".content a")?.getAttribute("href")).toBe("#next");
  });
});
