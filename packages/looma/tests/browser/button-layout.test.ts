import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Button layout", () => {
  for (const adapter of ["html", "converted"]) {
    it(`keeps a compact circular count and ordinary ${adapter} actions at the same standard height`, async () => {
      const path = await bundle(`${adapter}-compact-count-button`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiBadge as Badge, UiButton as Button, UiCluster as Cluster, UiIcon as Icon, UiIconButton as IconButton } from "@looma-test/components";
        createScene({ render: () => ["sm", "md"].map(size => sceneNode(Cluster, { align: "center", wrap: "nowrap" }, () => [
          sceneNode(Button, { id: size + "-ordinary", size }, () => "View changes"),
          sceneNode(Button, { id: size + "-counted", size, variant: "solid" }, { default: () => "Submit", badge: () => sceneNode(Badge, { id: size + "-count", shape: "circle", size: "sm", variant: "inverse", tone: "accent" }, () => "99+") }),
          sceneNode(IconButton, { id: size + "-more", size, matchButton: true, label: "More actions" }, () => sceneNode(Icon, { name: "chevron-down" })),
        ])) }).mount("#app");
      `);
      const body = adapter === "converted" ? '<div id="app"></div>' : ["sm", "md"].map(size => `
        <ui-cluster align="center" wrap="nowrap">
          <ui-button id="${size}-ordinary" size="${size}">View changes</ui-button>
          <ui-button id="${size}-counted" size="${size}" variant="solid">Submit <ui-badge id="${size}-count" slot="badge" shape="circle" size="sm" variant="inverse" tone="accent">99+</ui-badge></ui-button>
          <ui-icon-button id="${size}-more" size="${size}" match-button label="More actions"><ui-icon name="chevron-down"></ui-icon></ui-icon-button>
        </ui-cluster>`).join("");
      const page = await open(path, body, [join(root, "tokens.css")]);
      try {
        await page.addStyleTag({ content: "body { font-family: var(--ui-font-family-sans); }" });
        for (const width of [1280, 375]) for (const font of ["system-ui", "Arial"]) {
          await page.setViewportSize({ width, height: 720 });
          await page.addStyleTag({ content: `:root { --ui-font-family-sans: ${font}; }` });
          for (const size of ["sm", "md"]) {
            const geometry = await page.evaluate(size => {
              const ordinary = document.getElementById(size + "-ordinary")!.getBoundingClientRect();
              const counted = document.getElementById(size + "-counted")!.getBoundingClientRect();
              const more = document.getElementById(size + "-more")!.getBoundingClientRect();
              const badge = document.getElementById(size + "-count")!, mark = badge.getBoundingClientRect();
              const label = badge.querySelector(".label")!, range = document.createRange();
              range.selectNodeContents(label);
              return { ordinary: ordinary.height, counted: counted.height, more: more.height, mark: [mark.width, mark.height], text: range.getBoundingClientRect().width,
                available: mark.width - 2 * parseFloat(getComputedStyle(badge).borderLeftWidth) };
            }, size);
            assert.equal(geometry.counted, geometry.ordinary, `${adapter}/${width}/${font}/${size}: counted action uses the ordinary control height ${JSON.stringify(geometry)}`);
            assert.equal(geometry.more, geometry.ordinary, "match-button keeps the same height");
            assert.deepEqual(geometry.mark, [24, 24], "the compact count remains a true 24px circle");
            assert.ok(geometry.text <= geometry.available, `the complete 99+ count fits ${JSON.stringify(geometry)}`);
          }
        }
        if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ path: join(root, ".test-build", `${adapter}-compact-count-buttons-375.png`) });
        const touch = await open(path, body, [join(root, "tokens.css")], { viewport: { width: 375, height: 720 }, hasTouch: true, isMobile: true });
        try {
          await touch.addStyleTag({ content: "body { font-family: var(--ui-font-family-sans); }" });
          for (const size of ["sm", "md"]) {
            const heights = await touch.evaluate(size => ["ordinary", "counted", "more"].map(id => document.getElementById(size + "-" + id)!.getBoundingClientRect().height), size);
            assert.ok(heights.every(height => Math.abs(height - (size === "sm" ? 32 : 40)) < .05), "matching sizes retain the declared family on touch");
          }
        } finally { await touch.close(); }
      } finally { await page.close(); }
    });
  }

  it("lays content out from the start and stretches to its container when asked", async () => {
    const path = await bundle("converted-button-layout", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiButton as Button } from "@looma-test/components";
      createScene({
        render: () => sceneNode("div", { style: "inline-size: 300px" }, [
          sceneNode(Button, { id: "option", variant: "ghost", align: "start", stretch: true }, () => "New page"),
          sceneNode(Button, { id: "plain" }, () => "Save"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const layout = (id: string) => page.locator(id).evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: (element as HTMLElement).offsetWidth, justify: style.justifyContent, text: style.textAlign };
    });
    assert.deepEqual(await layout("#option"), { width: 300, justify: "flex-start", text: "start" });
    const plain = await layout("#plain");
    assert.ok(plain.width < 300, "a default button keeps its content width");
    assert.equal(plain.justify, "center");
    await page.close();
  });
});
