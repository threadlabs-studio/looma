import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Readable explanatory lists", () => {
  it("wraps full titles and descriptions at 375px in HTML and converted", async () => {
    const title = "A person asked you to review the updated account recovery guide";
    const description = "Check the recovery steps, device checks, and the contact details before continuing.";
    for (const framework of ["html", "converted"] as const) {
      const path = await bundle(`${framework}-wrapped-list`, framework === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiList as List, UiListItem as ListItem, UiButton as Button, UiIcon as Icon, UiIconButton as IconButton } from "@looma-test/components";
        createScene({ render: () => [
          sceneNode(IconButton, { id: "bell", label: "Notifications" }, () => sceneNode(Icon, { name: "bell" })),
          sceneNode(List, {}, () => [
            sceneNode(ListItem, { id: "wrapped", wrap: true }, { default: () => ${JSON.stringify(title)}, description: () => ${JSON.stringify(description)}, trailing: () => sceneNode(Button, { size: "sm" }, () => "Review") }),
            sceneNode(ListItem, { id: "ordinary" }, () => ${JSON.stringify(title)}),
          ]),
        ] }).mount("#app");
      `);
      const page = await open(path, framework === "converted" ? '<div id="app"></div>' : `
        <ui-icon-button id="bell" label="Notifications"><ui-icon name="bell"></ui-icon></ui-icon-button>
        <ui-list>
          <ui-list-item id="wrapped" wrap>${title}<span slot="description">${description}</span><ui-button slot="trailing" size="sm">Review</ui-button></ui-list-item>
          <ui-list-item id="ordinary">${title}</ui-list-item>
        </ui-list>
      `, [join(root, "tokens.css")], { viewport: { width: 375, height: 812 } });
      const geometry = await page.evaluate(() => {
        const title = document.querySelector("#wrapped .title")! as HTMLElement;
        const description = document.querySelector("#wrapped .description")! as HTMLElement;
        const ordinary = document.querySelector("#ordinary .title")!;
        return { title: { wrap: getComputedStyle(title).whiteSpace, height: title.clientHeight, scroll: title.scrollWidth, width: title.clientWidth },
          description: { wrap: getComputedStyle(description).whiteSpace, height: description.clientHeight, scroll: description.scrollWidth, width: description.clientWidth },
          ordinary: getComputedStyle(ordinary).whiteSpace, width: document.documentElement.scrollWidth,
          icon: document.querySelectorAll("#bell svg path").length };
      });
      assert.equal(geometry.ordinary, "nowrap");
      for (const text of [geometry.title, geometry.description]) {
        assert.equal(text.wrap, "normal");
        assert.ok(text.height > 24, `${framework}: explanatory text has multiple visible lines`);
        assert.ok(text.scroll <= text.width, `${framework}: full text fits without horizontal clipping`);
      }
      assert.ok(geometry.width <= 375);
      assert.ok(geometry.icon > 0);
      await page.close();
    }
  });
});
