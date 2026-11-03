import { expect } from "../renderers/test-context";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Boolean props", () => {
  it("renders decorative avatars with the same accessible boolean state", async () => {
    const path = await bundle("converted-bare-boolean", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiAvatar as Avatar } from "@looma-test/components";
      createScene({ render: () => [sceneNode(Avatar, { id: "bare", name: "Ada Lovelace", decorative: true }), sceneNode(Avatar, { id: "named", name: "Ada Lovelace" })] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await page.waitForSelector("#named");
    await expect.poll(() => page.locator("#bare").getAttribute("aria-hidden")).toBe("true");
    await expect.poll(() => page.locator("#named").getAttribute("aria-hidden")).not.toBe("true");
    await page.close();
  });
});
