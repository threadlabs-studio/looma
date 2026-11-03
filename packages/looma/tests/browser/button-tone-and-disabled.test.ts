import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Button tone and disabled", () => {
  it("paints available variants in their tone and preserves transparent disabled ghost surfaces", async () => {
    const path = await bundle("converted-tone", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiButton as Button } from "@looma-test/components";
      createScene({
        render: () => sceneNode("div", [
          sceneNode(Button, { id: "accent", tone: "accent" }, () => "Review"),
          sceneNode(Button, { id: "danger", tone: "danger" }, () => "Delete"),
          sceneNode(Button, { id: "neutral", tone: "neutral" }, () => "Cancel"),
          sceneNode(Button, { id: "solid", variant: "solid", tone: "accent" }, () => "Save"),
          sceneNode(Button, { id: "off", disabled: true }, () => "Save"),
          sceneNode(Button, { id: "off-danger", tone: "danger", disabled: true }, () => "Delete"),
          sceneNode(Button, { id: "off-solid", variant: "solid", disabled: true }, () => "Save"),
          sceneNode(Button, { id: "off-ghost", variant: "ghost", disabled: true }, () => "Review"),
          sceneNode(Button, { id: "off-ghost-neutral", variant: "ghost", tone: "neutral", disabled: true }, () => "Cancel"),
          sceneNode(Button, { id: "selected-ghost", variant: "ghost", selected: true }, () => "Selected"),
          sceneNode(Button, { id: "off-selected-ghost", variant: "ghost", selected: true, disabled: true }, () => "Selected unavailable"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const paint = (id: string) => page.locator(`#${id}`).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        image: style.backgroundImage,
        color: style.color,
        border: style.borderTopColor,
        opacity: style.opacity,
        shadow: style.boxShadow,
        filter: style.filter
      };
    });

    // Tone is the colour, and it reaches the whole button rather than only its text.
    const accent = await paint("accent");
    const danger = await paint("danger");
    const neutral = await paint("neutral");
    assert.notEqual(danger.border, accent.border, "tone changes an outline's edge");
    assert.notEqual(danger.image, accent.image, "tone changes an outline's painted wash");
    assert.notEqual(neutral.border, accent.border, "neutral is a tone of its own");

    // A solid action fills the surface that an outline keeps transparent under its wash.
    const solid = await paint("solid");
    assert.notEqual(solid.background, accent.background, "solid paints an opaque tone surface beneath its material layer");

    // Disabled actions share a flat neutral palette so no tone still looks actionable.
    const off = await paint("off");
    const offDanger = await paint("off-danger");
    const offSolid = await paint("off-solid");
    assert.equal(off.opacity, "1", "disabled is a colour decision, not a transparency one");
    assert.equal(off.shadow, "none", "a disabled button does not look raised");
    assert.notEqual(off.border, off.background, "a disabled outline keeps its shape");
    for (const variant of [offDanger, offSolid]) {
      assert.equal(variant.background, off.background, "disabled variants share a neutral surface");
      assert.equal(variant.border, off.border, "disabled variants share a neutral border");
      assert.equal(variant.color, off.color, "disabled variants share muted text");
    }
    assert.equal(off.filter, "none", "disabled colours are chosen directly");
    assert.equal(accent.filter, "none", "an available button is not");

    // A disabled ghost stays transparent; filled paint remains an interaction/selection cue.
    for (const id of ["off-ghost", "off-ghost-neutral"]) {
      const ghost = await paint(id);
      assert.equal(ghost.background, "rgba(0, 0, 0, 0)");
      assert.equal(ghost.color, off.color);
      assert.equal(ghost.border, "rgba(0, 0, 0, 0)");
    }
    assert.notEqual((await paint("selected-ghost")).background, "rgba(0, 0, 0, 0)");
    assert.equal((await paint("off-selected-ghost")).background, off.background, "an unavailable selection retains a muted selection wash");
    await page.close();
  });
});
