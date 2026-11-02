import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

// Dense inline actions share the badge row's visible geometry and their own tap boundaries.
describe("Compact inline icon actions", () => {
  for (const adapter of ["html", "converted"] as const) it(`keeps ${adapter} badge rows level with compact actions and independent touch targets`, async () => {
    const labels = ["Research", "Planning", "Reference", "Discovery", "Decisions", "Writing", "Learning", "Team notes", "Interview notes", "Implementation", "Accessibility", "Release planning"];
    const path = await bundle(`inline-icon-actions-${adapter}`, adapter === "html" ? 'import "@looma-test/runtime";' : `
      import {createScene,sceneNode} from "@looma-test/scene";
      import {UiCluster as Cluster,UiBadge as Badge,UiButton as Button,UiIconButton as IconButton,UiIcon as Icon} from "@looma-test/components";
      const labels=${JSON.stringify(labels)};
      createScene({render:()=>[
        sceneNode(Button,{id:"text-action",size:"xs"},()=>"Add"),
        sceneNode(Cluster,{id:"row",gap:"xs",maxRows:3},{
          default:()=>labels.map((label,index)=>sceneNode("a",{href:"#item-"+index,class:"item"},[sceneNode(Badge,{shape:"tag",size:"sm"},()=>label)])),
          overflow:()=>sceneNode(IconButton,{id:"more",size:"xs",label:"More",matchButton:true},()=>sceneNode(Icon,{name:"ellipsis"})),
          trailing:()=>sceneNode(IconButton,{id:"add",size:"xs",label:"Add"},()=>sceneNode(Icon,{name:"plus"})),
        })
      ]}).mount("#app");
    `);
    const body = adapter === "html" ? `<ui-button id="text-action" size="xs">Add</ui-button><ui-cluster id="row" gap="xs" max-rows="3">${labels.map((label,index)=>`<a class="item" href="#item-${index}"><ui-badge shape="tag" size="sm">${label}</ui-badge></a>`).join("")}<ui-icon-button slot="overflow" id="more" size="xs" label="More" match-button><ui-icon name="ellipsis"></ui-icon></ui-icon-button><ui-icon-button slot="trailing" id="add" size="xs" label="Add"><ui-icon name="plus"></ui-icon></ui-icon-button></ui-cluster>` : '<div id="app"></div>';
    const page = await open(path, '<meta name="viewport" content="width=device-width, initial-scale=1">'+body, [join(root,"tokens.css")], {viewport:{width:375,height:700},hasTouch:true,isMobile:true});
    try {
      await page.addStyleTag({content:'body {margin:12px} #row {inline-size:351px;margin-top:16px} .item {display:inline-flex;inline-size:109px;text-decoration:none}'});
      await page.waitForFunction(()=>document.getElementById("more")!.getBoundingClientRect().height>0);
      const measure = () => page.locator("#row").evaluate(row=>{
        const badges=Array.from(row.querySelectorAll('.item')).filter(item=>item.getBoundingClientRect().height>0).map(item=>item.firstElementChild!.getBoundingClientRect());
        const tops=[...new Set(badges.map(box=>Math.round(box.top)))].sort((a,b)=>a-b);
        const more=document.getElementById("more")!.getBoundingClientRect(), add=document.getElementById("add")!.getBoundingClientRect();
        const last=badges.at(-1)!;
        return {heights:[badges[0]!.height,more.height,add.height,document.getElementById("text-action")!.getBoundingClientRect().height],steps:tops.slice(1).map((top,index)=>top-tops[index]!),rows:tops.length,centerDelta:Math.abs(last.y+last.height/2-more.y-more.height/2)};
      });
      await expect.poll(measure).toMatchObject({ rows: 3 });
      const geometry = await measure();
      assert.ok(geometry.heights.every(height=>Math.abs(height-24)<.6),JSON.stringify({adapter,...geometry}));
      assert.equal(geometry.rows,3);
      assert.ok(Math.max(...geometry.steps)-Math.min(...geometry.steps)<1,JSON.stringify(geometry));
      assert.ok(geometry.centerDelta<.6,JSON.stringify(geometry));
      await page.evaluate(()=>{
        (window as unknown as {actions:string[]}).actions=[];
        for(const id of ["more","add"]) document.getElementById(id)!.addEventListener("click",()=>{(window as unknown as {actions:string[]}).actions.push(id)});
      });
      for(const [id,edge] of [["more","right"],["add","left"],["more","top"],["add","bottom"]] as const){
        const box=(await page.locator('#'+id).boundingBox())!;
        await page.touchscreen.tap(box.x+(edge==="right"?box.width-1:edge==="left"?1:box.width/2),box.y+(edge==="bottom"?box.height-1:edge==="top"?1:box.height/2));
        assert.equal(await page.evaluate(()=>(window as unknown as {actions:string[]}).actions.at(-1)),id,`${adapter}: ${edge} edge activates ${id}`);
      }
      const above=await page.locator('#row .item:visible').nth(5).boundingBox();
      const more=(await page.locator('#more').boundingBox())!;
      assert.ok(above && more.x+more.width/2>=above.x && more.x+more.width/2<=above.x+above.width,'fixture puts an action below a link');
      const before=await page.evaluate(()=>(window as unknown as {actions:string[]}).actions.length);
      await page.touchscreen.tap(more.x+more.width/2,above!.y+above!.height-1);
      assert.equal(await page.evaluate(()=>location.hash),'#item-5',JSON.stringify({adapter,reason:'the preceding row keeps its lower edge',actions:await page.evaluate(()=>(window as unknown as {actions:string[]}).actions)}));
      assert.equal(await page.evaluate(()=>(window as unknown as {actions:string[]}).actions.length),before,'the neighboring action does not intercept the link');
      await page.evaluate(()=>document.documentElement.style.setProperty('--ui-inline-control-min-block-size','32px'));
      assert.equal(await page.locator('#add').evaluate(element=>parseFloat(getComputedStyle(element,'::after').height)),32,'inline comfort remains adjustable');
      assert.equal((await page.locator('#add').boundingBox())!.height,24,'a larger touch target does not grow the visible action');
      await page.evaluate(()=>document.documentElement.style.removeProperty('--ui-inline-control-min-block-size'));
      if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.locator('#row').screenshot({animations:"disabled",path:join(root,"../../.context/inline-actions-"+adapter+".png")});
    } finally {await page.close();}
  });
});
