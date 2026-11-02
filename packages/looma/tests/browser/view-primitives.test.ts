import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("View primitives", () => {
  for (const adapter of ["HTML", "Converted"] as const) it(`joins a fieldset heading to its frame without crowding content in ${adapter}`, async () => {
    const path = await bundle(`fieldset-section-${adapter}`, adapter === "HTML" ? `import "@looma-test/runtime";` : `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiSection as Section, UiText as Text, UiButton as Button, UiInput as Input } from "@looma-test/components";
      createScene({render:()=>[sceneNode(Section,{id:"framed",variant:"fieldset",heading:"Profile and preferences"},{
        description:()=>"Choose the details people see when you work together.",
        actions:()=>sceneNode(Button,{id:"reset",variant:"outline",tone:"accent"},()=>"Reset"),
        default:()=>[sceneNode("label",{for:"name"},"Display name"),sceneNode(Input,{id:"name",value:"Ada Lovelace"}),sceneNode(Text,null,()=>"Your existing work stays available.")],
      }),sceneNode(Section,{id:"danger-frame",variant:"fieldset",tone:"danger",heading:"Delete account"},{description:()=>sceneNode(Text,null,()=>"Permanently remove this account."),actions:()=>sceneNode(Button,{variant:"solid",tone:"danger"},()=>"Delete account")})]}).mount("#app");
    `);
    const page = await open(path, adapter === "HTML" ? `<ui-section id="framed" variant="fieldset" heading="Profile and preferences"><span slot="description">Choose the details people see when you work together.</span><ui-button id="reset" slot="actions" variant="outline" tone="accent">Reset</ui-button><label for="name">Display name</label><ui-input id="name" value="Ada Lovelace"></ui-input><ui-text>Your existing work stays available.</ui-text></ui-section><ui-section id="danger-frame" variant="fieldset" tone="danger" heading="Delete account">
<span slot="description">Permanently remove this account.</span>
<ui-button slot="actions" variant="solid" tone="danger">Delete account</ui-button>
</ui-section>` : '<div id="app"></div>', [join(root,"tokens.css"),join(root,"theme-light.css"),join(root,"theme-dark.css")]);
    try {
      await page.locator("#framed").waitFor();
      assert.equal(await page.locator("#framed").evaluate(element=>element.tagName),"FIELDSET");
      await expect.poll(() => page.getByRole("group",{name:"Profile and preferences",exact:true}).count()).toBe(1);
      await expect.poll(() => page.locator("#framed > legend h2").textContent()).toBe("Profile and preferences");
      await page.getByRole("button",{name:"Reset",exact:true}).focus();
      await page.keyboard.press("Tab");
      assert.equal(await page.getByRole("textbox").evaluate(element=>element===document.activeElement),true);
      await page.getByRole("textbox").fill("Grace Hopper");
      await expect.poll(() => page.getByRole("textbox").inputValue()).toBe("Grace Hopper");
      await page.locator("#framed h2").evaluate(element=>element.textContent="Profile, notification preferences and shared workspace visibility");
      for (const width of [960,375]) for (const scheme of ["light","dark"] as const) for (const dir of ["ltr","rtl"]) {
        await page.setViewportSize({width,height:800});
        await page.emulateMedia({colorScheme:scheme});
        await page.locator("html").evaluate((element,dir)=>element.setAttribute("dir",dir),dir);
        const layout=await page.locator("#framed").evaluate(frame=>{
          const bounds=frame.getBoundingClientRect(), legend=frame.querySelector("legend")!.getBoundingClientRect();
          const body=frame.querySelector(".body > label")!.getBoundingClientRect();
          return {border:parseFloat(getComputedStyle(frame).borderInlineStartWidth),overflow:frame.scrollWidth>frame.clientWidth+1,
            headingFont:parseFloat(getComputedStyle(frame.querySelector(".heading")!).fontSize),bodyFont:parseFloat(getComputedStyle(frame.querySelector(".body p")!).fontSize),
            headingOffset:frame.querySelector(".heading")!.getBoundingClientRect().top-legend.top,
            bodyGap:body.top-frame.querySelector(".head")!.getBoundingClientRect().bottom,
            headingInside:legend.left>=bounds.left&&legend.right<=bounds.right+1,bodyBelow:body.top>=legend.bottom,
            fieldInside:body.left>=bounds.left&&body.right<=bounds.right+1};
        });
        assert.ok(layout.border>0,`${adapter}/${width}/${scheme}/${dir}: visible frame`);
        assert.ok(Math.abs(layout.bodyGap-16)<1,`${adapter}/${width}/${scheme}/${dir}: only the internal layout supplies the header/body gap`);
        assert.ok(layout.headingFont>layout.bodyFont,`${adapter}/${width}/${scheme}/${dir}: heading is larger than body text`);
        assert.ok(Math.abs(layout.headingOffset+1)<0.1,`${adapter}/${width}/${scheme}/${dir}: heading sits one pixel higher`);
        assert.equal(layout.overflow,false,`${adapter}/${width}/${scheme}/${dir}: no overflow`);
        assert.equal(layout.headingInside&&layout.bodyBelow&&layout.fieldInside,true,`${adapter}/${width}/${scheme}/${dir}: wrapped heading and content fit`);
        const danger=await page.locator("#danger-frame").evaluate(frame=>{
          const css=getComputedStyle(frame),neutral=getComputedStyle(document.querySelector("#framed")!);
          return {radii:[css.borderTopLeftRadius,css.borderTopRightRadius,css.borderBottomRightRadius,css.borderBottomLeftRadius],
            borders:[css.borderTopWidth,css.borderRightWidth,css.borderBottomWidth,css.borderLeftWidth],bg:css.backgroundColor,neutralBg:neutral.backgroundColor,
            bottomSpace:frame.getBoundingClientRect().bottom-frame.querySelector(".head")!.getBoundingClientRect().bottom-parseFloat(css.borderBottomWidth),padding:parseFloat(css.paddingBottom),
            margins:[...frame.querySelectorAll("*")].flatMap(element=>{const style=getComputedStyle(element);return [style.marginTop,style.marginRight,style.marginBottom,style.marginLeft]})};
        });
        assert.ok(danger.radii.every(radius=>radius===danger.radii[0]&&parseFloat(radius)>0),`${adapter}/${scheme}/${dir}: danger keeps all four rounded corners`);
        assert.ok(danger.borders.every(border=>border===danger.borders[0]),`${adapter}/${scheme}/${dir}: no leading stripe`);
        assert.equal(danger.bg,danger.neutralBg,`${adapter}/${scheme}/${dir}: danger keeps the neutral surface`);
        assert.ok(Math.abs(danger.bottomSpace-danger.padding)<1,`${adapter}/${width}/${scheme}/${dir}: header-only frame ends at its padding, got ${danger.bottomSpace} vs ${danger.padding}`);
        assert.ok(danger.margins.every(margin=>parseFloat(margin)===0),`${adapter}/${width}/${scheme}/${dir}: no external margins`);
      }
    } finally { await page.close(); }
  });

  const markup = `
    <ui-page-header id="header">Planning<span slot="description">Roadmaps and decisions.</span></ui-page-header>
    <ui-section id="section" heading="Pinned"><ui-text id="text" tone="muted" size="sm">Edited 2h ago</ui-text></ui-section>
    <ui-section id="bare"><ui-text>No heading</ui-text></ui-section>
    <ui-status-message id="loading" kind="loading">Loading pages…</ui-status-message>
    <ui-status-message id="failed" kind="error">Could not load.</ui-status-message>
    <ui-breadcrumbs id="trail">
      <ui-breadcrumb-item><a href="#home">Home</a></ui-breadcrumb-item>
      <ui-breadcrumb-item current>Roadmap</ui-breadcrumb-item>
    </ui-breadcrumbs>
    <ui-description-list id="facts"><ui-description-item term="Role">Editor</ui-description-item></ui-description-list>
    <ui-spinner id="spinner" label="Loading pages"></ui-spinner>`;

  async function checkPrimitives(page: Page) {
    await page.locator("#trail").waitFor();
    // One h1 per header, an h2 per headed section, and none for a section without a heading.
    await expect.poll(() => page.locator("#header h1").textContent()).toBe("Planning");
    await expect.poll(() => page.locator("#section h2").textContent()).toBe("Pinned");
    await expect.poll(() => page.locator("#bare h2:visible").count()).toBe(0);
    // Text is a paragraph in its tone, smaller than the text around it.
    assert.equal(await page.locator("#text").evaluate((element) => element.tagName), "P");
    // Loading is a polite status with a spinner; an error is an alert.
    await expect.poll(() => page.locator("#loading").getAttribute("role")).toBe("status");
    await expect.poll(() => page.locator("#failed").getAttribute("role")).toBe("alert");
    await expect.poll(() => page.locator("#loading :is([component~='ui-spinner'], [data-component~='ui-spinner'], .ui-spinner, [ui-spinner]) svg .track").count()).toBe(1);
    await expect.poll(() => page.locator("#loading :is([component~='ui-spinner'], [data-component~='ui-spinner'], .ui-spinner, [ui-spinner]) svg .arc").count()).toBe(1);
    // A trail is a navigation landmark of an ordered list; the current step is marked; the first
    // step has no separator before it.
    await expect.poll(() => page.getByRole("navigation", { name: "Breadcrumb" }).count()).toBe(1);
    await expect.poll(() => page.locator("#trail ol li").count()).toBe(2);
    assert.equal(await page.locator('#trail li[aria-current="page"]').textContent().then((text) => text?.trim()), "Roadmap");
    const separators = await page.locator("#trail li").evaluateAll((items) => items.map((item) => getComputedStyle(item.querySelector(".separator")!).display));
    assert.deepEqual(separators.map((display) => display !== "none"), [false, true]);
    // Named values are a description list of terms and definitions.
    assert.equal(await page.locator("#facts").evaluate((element) => element.tagName), "DL");
    await expect.poll(() => page.locator("#facts dt").textContent()).toBe("Role");
    assert.equal(await page.locator("#facts dd").textContent().then((text) => text?.trim()), "Editor");
    // A labelled spinner is an announced status.
    await expect.poll(() => page.getByRole("status", { name: "Loading pages" }).count()).toBe(1);
  }

  it("give a view its structure and semantics, in HTML", async () => {
    const path = await bundle("html-view-primitives", `import "@looma-test/runtime";`);
    const page = await open(path, markup, [join(root, "tokens.css")]);
    await checkPrimitives(page);
    await page.close();
  });

  it("give a view its structure and semantics, in converted output", async () => {
    const path = await bundle("converted-view-primitives", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiBreadcrumbs as Breadcrumbs, UiBreadcrumbItem as BreadcrumbItem, UiDescriptionItem as DescriptionItem, UiDescriptionList as DescriptionList, UiPageHeader as PageHeader, UiSection as Section, UiSpinner as Spinner, UiStatusMessage as StatusMessage, UiText as Text } from "@looma-test/components";
      createScene({ render: () => [
        sceneNode(PageHeader, { id: "header" }, { default: () => "Planning", description: () => "Roadmaps and decisions." }),
        sceneNode(Section, { id: "section", heading: "Pinned" }, () => sceneNode(Text, { id: "text", tone: "muted", size: "sm" }, () => "Edited 2h ago")),
        sceneNode(Section, { id: "bare" }, () => sceneNode(Text, null, () => "No heading")),
        sceneNode(StatusMessage, { id: "loading", kind: "loading" }, () => "Loading pages…"),
        sceneNode(StatusMessage, { id: "failed", kind: "error" }, () => "Could not load."),
        sceneNode(Breadcrumbs, { id: "trail" }, () => [
          sceneNode(BreadcrumbItem, null, () => sceneNode("a", { href: "#home" }, "Home")),
          sceneNode(BreadcrumbItem, { current: true }, () => "Roadmap"),
        ]),
        sceneNode(DescriptionList, { id: "facts" }, () => sceneNode(DescriptionItem, { term: "Role" }, () => "Editor")),
        sceneNode(Spinner, { id: "spinner", label: "Loading pages" }),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkPrimitives(page);
    await page.close();
  });
});
