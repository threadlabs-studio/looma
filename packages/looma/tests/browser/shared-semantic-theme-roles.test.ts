import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Shared semantic theme roles", () => {
  for(const adapter of ['html','converted']) it(`applies action insets, display typography and press response in ${adapter}`, async()=>{
    const path=await bundle(adapter+'-semantic-roles',adapter==='html'?`import "@looma-test/runtime";`:`
      import {createScene,sceneNode} from "@looma-test/scene";
      import { UiButton as Button, UiCheckbox as Checkbox, UiInput as Input, UiPageHeader as PageHeader, UiSection as Section, UiText as Text } from '@looma-test/components';
      createScene({render:()=>sceneNode('div',{},[
        ...['sm','md','lg'].flatMap(size=>[sceneNode(Button,{id:'action-'+size,size},()=> 'Share update'),sceneNode(Input,{id:'field-'+size,size,value:'Project document'})]),
        sceneNode(Checkbox,{id:'semantic-choice',checked:true},()=> 'Notify the team'),sceneNode(PageHeader,{id:'heading'},()=> 'Team office'),sceneNode(Section,{id:'section',heading:'Weekly update'},()=> 'Project checklist ready.'),sceneNode(Text,{id:'text-heading',as:'h2'},()=> 'Notes')
      ])}).mount('#app');`);
    const body=adapter==='html'?['sm','md','lg'].map(size=>`<ui-button id="action-${size}" size="${size}">Share update</ui-button><ui-input id="field-${size}" size="${size}" value="Project document"></ui-input>`).join('')+'<ui-checkbox id="semantic-choice" checked>Notify the team</ui-checkbox><ui-page-header id="heading">Team office</ui-page-header><ui-section id="section" heading="Weekly update">Project checklist ready.</ui-section><ui-text id="text-heading" as="h2">Notes</ui-text>':'<div id="app"></div>';
    const page=await open(path,body,[join(root,'tokens.css')]);
    try{
      await page.addStyleTag({content:'body {--ui-action-inset-sm:16px;--ui-action-inset-md:20px;--ui-action-inset-lg:24px;--ui-font-display:monospace;--ui-press-scale:.93;--ui-motion-fast:0ms;--ui-motion-base:240ms;--ui-radius-sm:100px;}'});
      const choice=await page.locator('#semantic-choice input').evaluate(el=>({width:el.getBoundingClientRect().width,radius:parseFloat(getComputedStyle(el).borderTopLeftRadius),duration:getComputedStyle(el,'::after').animationDuration}));
      assert.ok(choice.radius<=choice.width/4,'a highly rounded theme must preserve checkbox shape');
      assert.equal(choice.duration,'0.24s','check reveal follows the shared motion role');
      for(const [size,inset] of [['sm',16],['md',20],['lg',24]] as const){
        assert.equal(await page.locator('#action-'+size).evaluate(el=>getComputedStyle(el).paddingInlineStart),inset+'px');
        const action=await page.locator('#action-'+size).boundingBox(),field=await page.locator('#field-'+size).boundingBox();
        assert.ok(Math.abs(action!.height-field!.height)<.6);
      }
      for(const selector of ['#heading h1','#section h2','#text-heading'])assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).fontFamily),'monospace');
      await page.locator('#action-md').hover();await page.mouse.down();
      assert.equal(await page.locator('#action-md').evaluate(el=>getComputedStyle(el).scale),'0.93');await page.mouse.up();
    }finally{await page.close();}
  });
});
