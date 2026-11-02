import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Icon Button", () => {
  for (const adapter of ["html", "converted"]) it(`keeps matched ${adapter} icon touch targets within their adjacent action boundary`, async () => {
    const path = await bundle(`${adapter}-paired-touch-boundaries`, adapter === "html" ? `import "@looma-test/runtime";` : `
      import {createScene,sceneNode} from "@looma-test/scene";
      import { UiButton as Button, UiIconButton as IconButton, UiIcon as Icon } from "@looma-test/components";
      createScene({render:()=>["sm","md","lg"].map(size=>sceneNode("div",{id:size,style:"display:flex;align-items:stretch;padding-block:16px"},[
        sceneNode(Button,{id:size+"-primary",size},()=>"Save changes"),
        sceneNode(IconButton,{id:size+"-more",size,matchButton:true,label:"More options"},()=>sceneNode(Icon,{name:"chevron-down"})),
      ]))}).mount("#app");
    `);
    const body = adapter === "html" ? ["sm", "md", "lg"].map(size => `
      <div id="${size}" style="display:flex;align-items:stretch;padding-block:16px">
        <ui-button id="${size}-primary" size="${size}">Save changes</ui-button>
        <ui-icon-button id="${size}-more" size="${size}" match-button label="More options"><ui-icon name="chevron-down"></ui-icon></ui-icon-button>
      </div>`).join("") : '<div id="app"></div>';
    const page = await open(path, body, [join(root,"tokens.css")],
      {viewport:{width:375,height:812},isMobile:true,hasTouch:true});
    try {
      // A raised target preference still expands vertically, with clear space between rows.
      await page.addStyleTag({content:":root { --ui-control-min-block-size:56px; } body { margin:48px; }"});
      await page.evaluate(() => {
        const meta=document.createElement("meta");meta.name="viewport";meta.content="width=device-width,initial-scale=1";document.head.append(meta);
        (window as unknown as {hits:string[]}).hits=[];
        for (const button of document.querySelectorAll("button")) button.addEventListener("click",()=> (window as unknown as {hits:string[]}).hits.push(button.id));
      });
      await page.waitForFunction(()=>document.documentElement.clientWidth===375);
      for (const direction of ["ltr","rtl"]) {
        await page.evaluate(value=>{
          document.documentElement.dir=value;
          if (value==="rtl") document.documentElement.dataset.uiInputModality="touch";
          else delete document.documentElement.dataset.uiInputModality;
        },direction);
        for (const size of ["sm","md","lg"]) {
          const points=await page.evaluate(({size,direction})=>{
            const primary=document.getElementById(size+"-primary")!.getBoundingClientRect();
            const more=document.getElementById(size+"-more")!,rect=more.getBoundingClientRect();
            const minimum=Number.parseFloat(getComputedStyle(more,"::after").height);
            const edge={x:direction==="ltr"?primary.right-2:primary.left+2,y:primary.y+primary.height/2};
            const outside={x:rect.x+rect.width/2,y:rect.y+rect.height/2+Math.max(rect.height,minimum)/2-1};
            const hit=(point:{x:number,y:number})=>document.elementFromPoint(point.x,point.y)?.closest("button")?.id;
            return {edge,outside,primaryHit:hit(edge),moreHit:hit(outside)};
          },{size,direction});
          assert.equal(points.primaryHit,size+"-primary",`${adapter}/${direction}/${size}: the menu must not steal the primary action edge`);
          assert.equal(points.moreHit,size+"-more","the matched icon retains its configured vertical touch target");
          await page.evaluate(()=>{(window as unknown as {hits:string[]}).hits=[];});
          await page.touchscreen.tap(points.edge.x,points.edge.y);
          await page.touchscreen.tap(points.outside.x,points.outside.y);
          assert.deepEqual(await page.evaluate(()=>(window as unknown as {hits:string[]}).hits),[size+"-primary",size+"-more"]);
        }
      }
    } finally {await page.close();}
  });

  it("matches adjacent Buttons when requested without resizing compact icon controls", async () => {
    for (const adapter of ["converted", "html"]) {
      const path = await bundle(`${adapter}-matched-icon-button`, adapter === "converted" ? `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiButton as Button, UiIconButton as IconButton, UiIcon as Icon } from "@looma-test/components";
        createScene({ render: () => sceneNode("div", {}, [
          ...["sm", "md", "lg"].map(size => sceneNode("div", { style: "display: flex; align-items: stretch", id: size }, [
            sceneNode(Button, { id: size + "-primary", size }, () => "Save changes"),
            sceneNode(IconButton, { id: size + "-more", size, matchButton: true, variant: "outline", label: "More options" }, () => sceneNode(Icon, { name: "chevron-down" })),
          ])),
          sceneNode(IconButton, { id: "compact", size: "sm", label: "Toolbar options" }, () => sceneNode(Icon, { name: "chevron-down" })),
        ]) }).mount("#app");
      ` : `import "@looma-test/runtime";`);
      const body = adapter === "converted" ? '<div id="app"></div>' : `
        ${["sm", "md", "lg"].map(size => `<div style="display: flex; align-items: stretch" id="${size}">
          <ui-button id="${size}-primary" size="${size}">Save changes</ui-button>
          <ui-icon-button id="${size}-more" size="${size}" match-button variant="outline" label="More options"><ui-icon name="chevron-down"></ui-icon></ui-icon-button>
        </div>`).join("")}
        <ui-icon-button id="compact" size="sm" label="Toolbar options"><ui-icon name="chevron-down"></ui-icon></ui-icon-button>`;
      for (const touch of [false, true]) {
        const page = await open(path, body, [join(root, "tokens.css")],
          { viewport: { width: touch ? 375 : 1280, height: 900 }, hasTouch: touch, isMobile: touch });
        // Custom control tokens must work, too; no hard-coded matching dimensions.
        await page.addStyleTag({ content: ":root { --ui-control-size-sm: 36px; --ui-control-size-md: 44px; --ui-control-size-lg: 52px; }" });
        for (const size of ["sm", "md", "lg"]) {
          const bounds = await page.evaluate(size => {
            const primary = document.getElementById(size + "-primary")!.getBoundingClientRect();
            const more = document.getElementById(size + "-more")!.getBoundingClientRect();
            return { primary: { top: primary.top, bottom: primary.bottom }, more: { top: more.top, bottom: more.bottom } };
          }, size);
          assert.deepEqual(bounds.more, bounds.primary, `${adapter} ${size}, touch=${touch}: both edges align`);
        }
        assert.equal(await page.locator("#compact").evaluate(element => element.getBoundingClientRect().height), 28);
        await page.close();
      }
    }
  });

  it("grows its hit area, not its size, once touch is used", async () => {
    const path = await bundle("converted-icon-button-touch", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiIconButton as IconButton } from "@looma-test/components";
      import { trackInputModality } from "@threadlabs/looma/components/shared/input-modality.js";
      trackInputModality(document);
      createScene({
        render: () => sceneNode("div", { style: "padding: 40px" }, [sceneNode(IconButton, { id: "menu", size: "sm", label: "Options" }, () => "…")]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const probe = () => page.evaluate(() => {
      const button = document.querySelector("#menu") as HTMLElement;
      const bounds = button.getBoundingClientRect();
      const outside = document.elementFromPoint(bounds.right + 6, bounds.top + bounds.height / 2);
      return { width: button.offsetWidth, height: button.offsetHeight, hitOutside: outside === button };
    });
    const before = await probe();
    assert.equal(before.hitOutside, false);
    await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch" })));
    assert.deepEqual(await probe(), { width: before.width, height: before.height, hitOutside: true });
    await page.close();
  });
});
