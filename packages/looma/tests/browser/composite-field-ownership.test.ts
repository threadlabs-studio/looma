import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Composite field ownership",()=>{
 for(const adapter of ['html','converted'])it(`labels the requested field and supports a swatch field in ${adapter}`,async()=>{
 const path=await bundle(adapter+'-composite-field',adapter==='html'?`import '@looma-test/runtime';`:`
 import {createScene,sceneNode} from "@looma-test/scene";import { UiFormField as FormField, UiColorPicker as ColorPicker, UiInput as Input } from '@looma-test/components';
 createScene({render:()=>sceneNode('div',{},[
 sceneNode(FormField,{id:'paired'},{label:()=>sceneNode('label',{for:'chosen'},'Hex colour'),default:()=>[sceneNode(ColorPicker,{value:'#7c3aed',label:'Swatch'}),sceneNode(Input,{id:'chosen',value:'#7c3aed'})],help:()=> 'Six hexadecimal digits'}),
 sceneNode('form',{id:'disabled-form'},[sceneNode(FormField,{disabled:true},{label:()=>sceneNode('label',{},'Brand colour'),default:()=>sceneNode(ColorPicker,{id:'disabled-picker',name:'brand',value:'#7c3aed'})})])
 ])}).mount('#app');`);
 const body=adapter==='html'?`<ui-form-field id="paired"><label slot="label" for="chosen">Hex colour</label><ui-color-picker value="#7c3aed" label="Swatch"></ui-color-picker><ui-input id="chosen" value="#7c3aed"></ui-input><span slot="help">Six hexadecimal digits</span></ui-form-field><form id="disabled-form"><ui-form-field disabled><label slot="label">Brand colour</label><ui-color-picker id="disabled-picker" name="brand" value="#7c3aed"></ui-color-picker></ui-form-field></form>`:'<div id="app"></div>';
 const page=await open(path,body,[join(root,'tokens.css')]);
 try{assert.ok(await page.locator('#chosen').getAttribute('aria-describedby'),'help belongs to the explicitly labelled text input');await expect.poll(() => page.locator('#disabled-picker button[data-ui-field-control]').isDisabled()).toBe(true);assert.deepEqual(await page.locator('#disabled-form').evaluate(el=>[...new FormData(el as HTMLFormElement)]),[]);const id=await page.locator('#disabled-picker button[data-ui-field-control]').getAttribute('id');await expect.poll(() => page.locator('#disabled-form .label > label').getAttribute('for')).toBe(id);}finally{await page.close();}
 });
});
