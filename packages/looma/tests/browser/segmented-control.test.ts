import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "vitest";
import { expect } from "../renderers/test-context";
import { root, bundle, open } from "../renderers/browser-driver";

const items = [{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }, { value: "unavailable", label: "Unavailable", disabled: true }];

describe("Segmented Control", () => {
  for (const adapter of ["HTML", "Converted"] as const) {
    it(`selects, submits, resets and updates through native radio behavior in ${adapter}`, async () => {
      const path = await bundle(`segmented-${adapter}`, adapter === "HTML" ? `
        import "@looma-test/runtime";
        import {componentRegistry} from "@nextwebwg/html-next/runtime";
        window.updateSegment = props => componentRegistry.update(document.getElementById("status"), props);
        window.renameOther = name => componentRegistry.update(document.getElementById("other"), {name});
        window.selections=[];
        document.getElementById("status").addEventListener("select", event => window.selections.push(event.detail));
      ` : `
        import {createScene,sceneNode,createState} from "@looma-test/scene";
        import {UiSegmentedControl as SegmentedControl,UiRadioGroup as RadioGroup,UiRadio as Radio} from "@looma-test/components";
        const props=createState({value:"active",disabled:false,items:${JSON.stringify(items)}});
        window.updateSegment=next=>props.value={...props.value,...next};window.selections=[];window.modelValues=[];const otherName=createState("other");window.renameOther=name=>otherName.value=name;
        createScene({render:()=>sceneNode("form",{id:"filters"},[
          sceneNode(SegmentedControl,{id:"status",name:"status",label:"Status",required:true,...props.value,onSelect:event=>window.selections.push(event.detail??event),"bind:value":value=>window.modelValues.push(value)}),
          sceneNode(RadioGroup,{id:"other",name:otherName.value,label:"Other",value:"active"},()=>[sceneNode(Radio,{value:"active"},()=>"Active"),sceneNode(Radio,{value:"archived"},()=>"Archived")]),
        ])}).mount("#app");
      `);
      const page = await open(path, adapter === "HTML" ? `<form id="filters">
        <ui-segmented-control id="status" name="status" label="Status" value="active" required items='${JSON.stringify(items)}'></ui-segmented-control>
        <ui-radio-group id="other" name="other" label="Other" value="active"><ui-radio value="active">Active</ui-radio><ui-radio value="archived">Archived</ui-radio></ui-radio-group>
      </form>` : '<div id="app"></div>', [join(root,"tokens.css")]);
      try {
        const status = page.locator("#status");
        const selected = () => status.locator("input:checked").inputValue();
        const value = () => page.locator("#filters").evaluate(form => new FormData(form as HTMLFormElement).get("status"));
        await expect.poll(selected).toBe("active");
        await status.getByText("Archived",{exact:true}).click();
        await expect.poll(selected).toBe("archived");
        assert.equal(await value(),"archived");
        assert.equal(await page.locator('#other input:checked').inputValue(),"active");
        await status.locator('input[value="active"]').focus();
        await page.keyboard.press("ArrowRight");
        await expect.poll(selected).toBe("archived");
        await page.keyboard.press("ArrowRight");
        await expect.poll(selected).toBe("active");
        assert.equal(await status.locator('input[value="unavailable"]').isDisabled(),true);
        const events=await page.evaluate(()=> (window as unknown as {selections:Array<{value:string;trigger:string}>}).selections);
        assert.deepEqual(events.map(event=>event.value),["archived","active"]);
        assert.equal(events.at(-1)?.trigger,"keyboard");
        if (adapter === "Converted") assert.deepEqual(await page.evaluate(()=> (window as unknown as {modelValues:string[]}).modelValues),["archived","active"],"the framework value binding reports each changed selection once");
        await page.locator("#filters").evaluate(form=>(form as HTMLFormElement).reset());
        await expect.poll(selected).toBe("active");
        await page.evaluate(()=> (window as unknown as {updateSegment(props:unknown):void}).updateSegment({value:"archived"}));
        await expect.poll(selected).toBe("archived");
        await status.getByText("Active",{exact:true}).click();
        await page.locator("#filters").evaluate(form=>(form as HTMLFormElement).reset());
        await expect.poll(selected).toBe("archived");
        await page.evaluate(()=> (window as unknown as {updateSegment(props:unknown):void}).updateSegment({value:""}));
        await expect.poll(()=>status.locator("input:checked").count()).toBe(0);
        assert.equal(await page.locator("#filters").evaluate(form=>(form as HTMLFormElement).checkValidity()),false);
        await page.evaluate(()=> (window as unknown as {updateSegment(props:unknown):void}).updateSegment({value:"active",disabled:true}));
        await expect.poll(()=>status.getByRole("radio",{name:"Active",exact:true}).isDisabled()).toBe(true);
        assert.equal(await value(),null);
        await page.evaluate(()=> (window as unknown as {updateSegment(props:unknown):void}).updateSegment({disabled:false,items:[{value:"active",label:"Active"},{value:"pending",label:"Pending"}]}));
        await status.getByText("Pending",{exact:true}).click();
        await expect.poll(selected).toBe("pending");
        await page.evaluate(()=> (window as unknown as {updateSegment(props:unknown):void}).updateSegment({name:"renamed-status"}));
        await status.getByText("Active",{exact:true}).click();
        await expect.poll(()=>page.locator("#filters").evaluate(form=>new FormData(form as HTMLFormElement).get("renamed-status"))).toBe("active");
        assert.equal(await value(),null);
        await page.evaluate(()=> (window as unknown as {renameOther(name:string):void}).renameOther("renamed-other"));
        await page.locator("#other").getByText("Archived",{exact:true}).click();
        await expect.poll(()=>page.locator("#filters").evaluate(form=>new FormData(form as HTMLFormElement).get("renamed-other"))).toBe("archived");
        await status.getByText("Pending",{exact:true}).click();
        await page.setViewportSize({width:375,height:700});
        await status.evaluate(element=>element.dir="rtl");
        const active=await status.getByText("Active",{exact:true}).boundingBox(),pending=await status.getByText("Pending",{exact:true}).boundingBox();
        assert(active && pending && active.x>pending.x,"RTL mirrors segment order");
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        const selectedColor=await status.getByText("Pending",{exact:true}).evaluate(element=>getComputedStyle(element).backgroundColor);
        const otherColor=await status.getByText("Active",{exact:true}).evaluate(element=>getComputedStyle(element).backgroundColor);
        assert.notEqual(selectedColor,otherColor,"selection has a visible surface");
        await page.evaluate(()=> (window as unknown as {updateSegment(props:unknown):void}).updateSegment({value:"active"}));
        await expect.poll(selected).toBe("pending");
        await page.evaluate(()=> (window as unknown as {updateSegment(props:unknown):void}).updateSegment({value:""}));
        await expect.poll(()=>status.locator("input:checked").count()).toBe(0);
        await page.evaluate(()=> (window as unknown as {updateSegment(props:unknown):void}).updateSegment({items:[{value:"active",label:"An extended active status"},{value:"archived",label:"An extended archived status"}],value:"active"}));
        await expect.poll(selected).toBe("active");
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"long labels remain within a narrow viewport");
        await page.evaluate(()=> (window as unknown as {updateSegment(props:unknown):void}).updateSegment({size:"sm",items:[{value:"active",label:"Ready"},{value:"busy",label:"Busy"},{value:"unconfirmed",label:"Unconfirmed"}]}));
        await status.evaluate(element=>{
          element.style.fontFamily="Arial, sans-serif";
          const widths=[...element.querySelectorAll(".choice")].map(choice=>{
            const probe=choice.cloneNode(true) as HTMLElement;
            Object.assign(probe.style,{position:"absolute",whiteSpace:"nowrap",inlineSize:"max-content",visibility:"hidden"});
            element.append(probe);const width=probe.getBoundingClientRect().width;probe.remove();return width;
          });
          const track=getComputedStyle(element.querySelector(".segments")!);
          const edge=[track.paddingLeft,track.paddingRight,track.borderLeftWidth,track.borderRightWidth].reduce((sum,value)=>sum+parseFloat(value),0);
          element.style.inlineSize=`${Math.ceil(widths.reduce((sum,width)=>sum+width,0)+edge+3)}px`;
        });
        await expect.poll(()=>status.getByText("Unconfirmed",{exact:true}).isVisible()).toBe(true);
        const lines=await status.locator(".choice").evaluateAll(elements=>elements.map(element=>{
          const range=document.createRange();range.selectNodeContents(element);return range.getClientRects().length;
        }));
        assert.deepEqual(lines,[1,1,1],"unequal labels that fit together retain whole words in a compact group");
        await status.evaluate(element=>{ element.style.inlineSize=""; element.style.fontFamily=""; });
        await page.evaluate(()=>document.body.style.fontFamily="var(--ui-font-sans)");
        await page.addStyleTag({path:join(root,"theme-light.css")});
        await page.addStyleTag({path:join(root,"theme-dark.css")});
        await page.evaluate(()=> (window as unknown as {updateSegment(props:unknown):void}).updateSegment({size:"md",items:[{value:"active",label:"Active"},{value:"archived",label:"Archived"}],value:"active",labelVisibility:"sr-only"}));
        for (const theme of ["light","dark"]) {
          await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
          const surface=await status.getByText("Active",{exact:true}).evaluate(element=>getComputedStyle(element).backgroundColor);
          assert.notEqual(surface,"rgba(0, 0, 0, 0)","selected segment stays visible in each theme");
          if (process.env.LOOMA_CAPTURE_ARTIFACTS) {
            await status.evaluate(element=>element.dir="ltr");
            await page.evaluate(()=> (document.activeElement as HTMLElement)?.blur());
            await status.screenshot({path:join(process.env.LOOMA_CAPTURE_ARTIFACTS,`segmented-${adapter.toLowerCase()}-${theme}.png`)});
          }
        }
        await page.emulateMedia({forcedColors:"active"});
        const forced=await status.getByText("Active",{exact:true}).evaluate(element=>getComputedStyle(element).forcedColorAdjust);
        assert.equal(forced,"none","selected segment retains system highlight colors");
      } finally { await page.close(); }
    });
  }
});
