import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open, look } from "../renderers/browser-driver";

describe("Shared visual geometry", () => {
  it("keeps row highlights in their surface hue and restores brand selection on nested neutral panels in HTML and converted", async () => {
    const tones = ["neutral", "accent", "info", "success", "warning", "danger"];
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-tonal-highlights`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import {createScene, sceneNode} from "@looma-test/scene";
        import { UiCard as Card, UiStack as Stack, UiSection as Section, UiCallout as Callout, UiNavItem as NavItem, UiTree as Tree, UiTreeItem as TreeItem, UiList as List, UiListItem as ListItem, UiSearchResultRow as SearchResultRow, UiButton as Button } from "@looma-test/components";
        const rows = id => [
          sceneNode(NavItem,{id:id+"-nav",current:"page"},()=>"Overview"),
          sceneNode(NavItem,{id:id+"-hover"},()=>"Activity"),
          sceneNode(Tree,{label:"Documents"},()=>sceneNode(TreeItem,{id:id+"-tree",selected:true,label:"Selected guide"})),
          sceneNode(List,{},()=>sceneNode(ListItem,{id:id+"-list",current:true},()=>sceneNode("a",{href:"#guide"},"Selected guide"))),
          sceneNode(SearchResultRow,{id:id+"-search",selected:true},{title:()=>"Search result"}),
          sceneNode(Button,{id:id+"-action",tone:"accent"},()=>"Continue")];
        createScene({render:()=>sceneNode(Stack,{},()=>[
          ...${JSON.stringify(tones)}.map(tone=>sceneNode(Card,{id:tone,tone,variant:"subtle",padding:"sm"},()=>rows(tone))),
          sceneNode(Card,{id:"outer",tone:"success"},()=>[
            sceneNode(Card,{id:"nested",padding:"sm"},()=>rows("nested")),
            sceneNode(Section,{id:"plain"},()=>rows("plain")),
            sceneNode(Section,{id:"section",variant:"card",tone:"danger"},()=>rows("section")),
            sceneNode(Callout,{id:"callout",tone:"info"},()=>rows("callout")),
            sceneNode(Callout,{id:"note",tone:"neutral"},()=>rows("note"))])
        ])}).mount("#app");`);
      const rows = (id: string) => `<ui-nav-item id="${id}-nav" current="page">Overview</ui-nav-item>
        <ui-nav-item id="${id}-hover">Activity</ui-nav-item>
        <ui-tree label="Documents"><ui-tree-item id="${id}-tree" selected label="Selected guide"></ui-tree-item></ui-tree>
        <ui-list><ui-list-item id="${id}-list" current><a href="#guide">Selected guide</a></ui-list-item></ui-list>
        <ui-search-result-row id="${id}-search" selected><span slot="title">Search result</span></ui-search-result-row>
        <ui-button id="${id}-action" tone="accent">Continue</ui-button>`;
      const markup = adapter === "converted" ? '<div id="app"></div>' : `<ui-stack>
        ${tones.map(tone=>`<ui-card id="${tone}" tone="${tone}" variant="subtle" padding="sm">${rows(tone)}</ui-card>`).join("")}
        <ui-card id="outer" tone="success">
          <ui-card id="nested" padding="sm">${rows("nested")}</ui-card>
          <ui-section id="plain">${rows("plain")}</ui-section>
          <ui-section id="section" variant="card" tone="danger">${rows("section")}</ui-section>
          <ui-callout id="callout" tone="info">${rows("callout")}</ui-callout>
          <ui-callout id="note" tone="neutral">${rows("note")}</ui-callout>
        </ui-card></ui-stack>`;
      for (const theme of ["light", "dark"]) {
        const page = await open(path, markup, [join(root,"tokens.css"),join(root,"theme-light.css"),join(root,"theme-dark.css")], {reducedMotion:"reduce"});
        await page.locator("html").evaluate((el, theme)=>el.setAttribute("data-theme",theme),theme);
        const color = (selector: string) => page.locator(selector).evaluate(el=> {
          const probe=document.body.appendChild(document.createElement("i"));
          probe.style.color=`oklch(from ${getComputedStyle(el).backgroundColor} l c h)`;
          const resolved=getComputedStyle(probe).color;
          probe.remove();
          return resolved.match(/[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?/g)!.map(Number);
        });
        const surface = (selector: string) => page.locator(selector).evaluate(el=>getComputedStyle(el).backgroundColor);
        const neutral = await surface("#neutral-nav");
        const action = await surface("#neutral-action");
        for (const id of [...tones,"nested","plain","section","callout","note"]) {
          assert.equal(await surface(`#${id}-action`),action,"surface context preserves independent action intent");
          if (["neutral","nested","note"].includes(id)) {
            assert.equal(await surface(`#${id}-nav`),neutral,"opaque neutral surfaces restore brand selection");
            continue;
          }
          const panel = await color(id==="plain" ? "#outer" : `#${id}`);
          for (const selector of [`#${id}-nav`, `#${id}-tree > .row`, `#${id}-list`, `#${id}-search`]) {
            const row=await color(selector);
            const hueGap=Math.abs(((row[2]-panel[2]+540)%360)-180);
            assert.ok(row[1]>panel[1]*1.5 || panel[1]>=0.03,"highlight retains a visible tonal tint rather than reading grey");
            assert.ok(hueGap<1,`${adapter}/${theme}/${id}: highlight shares surface hue (${hueGap.toFixed(1)} degrees)`);
            assert.ok(theme==="light" ? row[0]<panel[0]-0.025 : row[0]>panel[0]+0.025,"highlight has a visible lightness step");
          }
          await page.locator(`#${id}-hover`).hover();
          assert.equal(await surface(`#${id}-hover`),await surface(`#${id}-nav`),"hover and selection share the tonal treatment");
        }
        if (process.env.LOOMA_SCREENSHOT_DIR && adapter === "converted") {
          await page.setViewportSize({width:375,height:720});
          await page.addStyleTag({content:"body {margin:0;padding:16px;font-family:var(--ui-font-family-sans);background:var(--ui-surface);color:var(--ui-text-primary)}"});
          await page.evaluate(()=>{
            for (const id of ["outer","warning","danger"]) document.getElementById(id)!.hidden=true;
            for (const id of ["neutral","accent","success","info"]) {
              const card=document.getElementById(id)!;
              for (const child of Array.from(card.children)) if (!child.id.endsWith("-nav") && !child.id.endsWith("-hover")) (child as HTMLElement).hidden=true;
              const label=document.createElement("span");
              label.textContent={neutral:"Neutral surface · brand highlight",accent:"Purple surface · purple highlight",success:"Green surface · green highlight",info:"Blue surface · blue highlight"}[id]!;
              label.style.fontSize="var(--ui-font-size-sm)";
              card.prepend(label);
            }
          });
          await page.locator("#info-hover").hover();
          await page.screenshot({path:join(process.env.LOOMA_SCREENSHOT_DIR,`tonal-highlights-${theme}-375.png`)});
        }
        // Neutral resets retain a consumer's explicitly themed brand selection, too.
        await page.locator("html").evaluate(el=>(el as HTMLElement).style.setProperty("--ui-selection-surface","rgb(235,220,255)"));
        assert.equal(await surface("#nested-nav"),"rgb(235, 220, 255)");
        await page.close();
      }
    }
  });

  it("defines pale row highlights on toned panels without moving content or weakening focus in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-highlight-edges`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import {createScene, sceneNode} from "@looma-test/scene";
        import { UiCard as Card, UiStack as Stack, UiNavItem as NavItem, UiTree as Tree, UiTreeItem as TreeItem, UiList as List, UiListItem as ListItem } from "@looma-test/components";
        createScene({render:()=>sceneNode(Card,{id:"panel",tone:"success",variant:"subtle",padding:"lg"},()=>sceneNode(Stack,{gap:"m"},()=>[
          sceneNode(NavItem,{id:"nav",as:"a",href:"#overview",current:"page"},()=>"Overview"),
          sceneNode(NavItem,{id:"nav-hover",as:"a",href:"#activity"},()=>"Activity"),
          sceneNode(NavItem,{id:"line",variant:"line",current:"page"},()=>"Line destination"),
          sceneNode(Tree,{label:"Files"},()=>[
            sceneNode(TreeItem,{id:"tree",label:"Selected guide",selected:true}),
            sceneNode(TreeItem,{id:"tree-disabled",label:"Unavailable guide",selected:true,disabled:true})]),
          sceneNode(List,{},()=>[
            sceneNode(ListItem,{id:"list",current:true},()=>sceneNode("a",{href:"#guide"},"Selected guide")),
            sceneNode(ListItem,{id:"highlight",highlighted:true},()=>sceneNode("a",{href:"#updates"},"New updates")),
            sceneNode(ListItem,{id:"list-hover"},()=>sceneNode("a",{href:"#other"},"Another guide")),
            sceneNode(ListItem,{id:"card",variant:"card"},()=>sceneNode("a",{href:"#card"},"Framed guide"))])
        ]))}).mount("#app");`);
      const markup = adapter === "converted" ? '<div id="app"></div>' : `
        <ui-card id="panel" tone="success" variant="subtle" padding="lg"><ui-stack gap="m">
          <ui-nav-item id="nav" as="a" href="#overview" current="page">Overview</ui-nav-item>
          <ui-nav-item id="nav-hover" as="a" href="#activity">Activity</ui-nav-item>
          <ui-nav-item id="line" variant="line" current="page">Line destination</ui-nav-item>
          <ui-tree label="Files"><ui-tree-item id="tree" label="Selected guide" selected></ui-tree-item>
            <ui-tree-item id="tree-disabled" label="Unavailable guide" selected disabled></ui-tree-item></ui-tree>
          <ui-list><ui-list-item id="list" current><a href="#guide">Selected guide</a></ui-list-item>
            <ui-list-item id="highlight" highlighted><a href="#updates">New updates</a></ui-list-item>
            <ui-list-item id="list-hover"><a href="#other">Another guide</a></ui-list-item>
            <ui-list-item id="card" variant="card"><a href="#card">Framed guide</a></ui-list-item></ui-list>
        </ui-stack></ui-card>`;
      for (const theme of ["light", "dark"]) {
        const page = await open(path, markup, [join(root,"tokens.css"),join(root,"theme-light.css"),join(root,"theme-dark.css")]);
        await page.addStyleTag({content:"body { margin:0; padding:16px; font-family:var(--ui-font-family-sans); background:var(--ui-surface); }"});
        await page.locator("html").evaluate((el, theme) => el.setAttribute("data-theme",theme),theme);
        const look = (selector: string) => page.locator(selector).evaluate(el=>{
          const css=getComputedStyle(el),box=el.getBoundingClientRect();
          return {shadow:css.boxShadow,width:box.width,height:box.height,padding:css.padding,border:css.borderWidth,weight:css.fontWeight};
        });
        for (const width of [1280,375]) {
          await page.setViewportSize({width,height:900});
          await page.mouse.move(0,0);
          for (const selector of ["#nav","#tree > .row","#list","#highlight"]) {
            assert.match((await look(selector)).shadow,/inset/,`${adapter}/${theme}: ${selector} has a faint complete edge`);
          }
          if (theme === "light") {
            const contrast = await page.locator("#list").evaluate(el => {
              const canvas = document.createElement("canvas");
              canvas.width = canvas.height = 1;
              const context = canvas.getContext("2d")!;
              const luminance = (color: string) => {
                context.fillStyle = color;
                context.fillRect(0, 0, 1, 1);
                const channels = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3)
                  .map(channel => channel / 255)
                  .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
                return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
              };
              const row = luminance(getComputedStyle(el).backgroundColor);
              const panel = luminance(getComputedStyle(document.getElementById("panel")!).backgroundColor);
              return (Math.max(row, panel) + 0.05) / (Math.min(row, panel) + 0.05);
            });
            assert.ok(contrast > 1.05, `${adapter}: highlighted fill stays distinct from the pale panel (${contrast.toFixed(3)}:1)`);
          }
          assert.equal((await look("#line")).shadow,"none","line navigation retains its separate straight indicator");
          assert.equal((await look("#tree-disabled > .row")).shadow,"none","disabled rows do not look active");
          for (const selector of ["#nav-hover","#list-hover","#tree > .row"]) {
            const before=await look(selector);
            await page.locator(selector).hover();
            const after=await look(selector);
            assert.match(after.shadow,/inset/,`${selector} hover remains defined on the soft panel`);
            assert.deepEqual({...after,shadow:before.shadow},before,"the inset edge changes no row geometry or text weight");
            await page.mouse.move(0,0);
          }
          await page.locator("#card").hover();
          assert.equal((await look("#card")).shadow,"none","a framed card does not gain a second border");
          await page.mouse.move(0,0);
          for (const [target,surface] of [["#list a","#list"],["#tree","#tree > .row"]]) {
            await page.keyboard.press("Tab");
            await page.locator(target).focus();
            assert.notEqual((await look(surface)).shadow,"none","keyboard focus always retains its visible ring");
            assert.doesNotMatch((await look(surface)).shadow,/inset/,"the stronger keyboard ring replaces the decorative edge");
          }
          await page.locator("#nav").focus();
          assert.equal(await page.locator("#nav").evaluate(el=>getComputedStyle(el).outlineStyle),"solid");
          if (process.env.LOOMA_SCREENSHOT_DIR && width===375 && adapter==="converted") {
            await page.locator("#nav").blur();
            await page.locator("#list-hover").hover();
            await page.screenshot({path:join(process.env.LOOMA_SCREENSHOT_DIR,`highlight-edges-${theme}-${width}.png`)});
          }
        }
        await page.emulateMedia({forcedColors:"active"});
        for (const selector of ["#nav","#list","#tree > .row"]) {
          assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).outlineStyle),"solid","selected boundaries survive forced colors");
        }
        await page.close();
      }
    }
  });

  it("themes border, accent, focus, and row corners through global semantic dimensions", async () => {
    const path = await bundle("html-global-visual-geometry", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <div id="theme" style="--ui-border-width:3px;--ui-accent-line-width:5px;--ui-focus-width:4px;--ui-selection-radius:13px;--ui-selection-surface:rgb(245,240,255);--ui-selection-text:rgb(81,50,140)">
        <ui-button id="action" variant="outline">Save</ui-button>
        <ui-input id="field" aria-label="Name"></ui-input>
        <ui-separator id="divider"></ui-separator>
        <ui-disclosure id="disclosure" summary="Details">Body</ui-disclosure>
        <ui-card id="card" tone="danger">Notice</ui-card>
        <ui-callout id="callout">Note</ui-callout>
        <ui-nav-item id="nav" current="page">Overview</ui-nav-item>
        <ui-nav-item id="line-nav" variant="line" current="page">Reports</ui-nav-item>
        <ui-tree label="Documents"><ui-tree-item id="tree-row" selected label="Guide"></ui-tree-item></ui-tree>
        <ui-list><ui-list-item id="list-row" current><a href="#guide">Guide</a></ui-list-item></ui-list>
        <ui-search-result-row id="search-row" selected><span slot="title">Guide</span></ui-search-result-row>
        <ui-listbox id="choices"><option selected>Guide</option><option>Notes</option></ui-listbox>
        <div class="looma-editor"><div class="ProseMirror"><blockquote id="quote">Quote</blockquote></div></div>
      </div>`, [join(root, "tokens.css")]);
    const css = (selector: string, property: string) => page.locator(selector).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
    for (const selector of ["#action", "#field", "#card", "#callout"]) {
      assert.equal(await css(selector, "border-top-width"), "3px", `${selector} follows ordinary border width`);
    }
    assert.equal(await css("#divider", "border-top-width"), "3px");
    assert.equal(await css("#disclosure", "border-bottom-width"), "3px");
    assert.equal(await css("#callout", "border-inline-start-width"), "3px", "rounded Callout uses ordinary border width on every edge");
    assert.equal(await css("#card", "border-inline-start-width"), "3px", "danger cards keep an ordinary border on every edge");
    for (const selector of ["#quote"]) {
      assert.equal(await css(selector, "border-inline-start-width"), "5px", `${selector} follows accent-line width`);
    }
    assert.equal(await css("#line-nav .indicator", "border-inline-start-width"), "5px");
    for (const selector of ["#nav", "#tree-row > .row", "#list-row", "#search-row", '#choices [role="option"][aria-selected="true"]']) {
      assert.equal(await css(selector, "border-top-left-radius"), "13px", `${selector} follows row corners`);
      assert.equal(await css(selector, "background-color"), "rgb(245, 240, 255)", `${selector} follows selected surface`);
      assert.equal(await css(selector, "color"), "rgb(81, 50, 140)", `${selector} follows selected text`);
    }
    await page.keyboard.press("Tab");
    await page.locator("#nav").focus();
    assert.equal(await css("#nav", "outline-width"), "4px", "keyboard focus has its own semantic weight");
    assert.equal(await css("#nav", "outline-offset"), "-4px", "the ring remains inside the row at any configured width");
    // Theme values remain live, rather than being copied into component declarations.
    await page.locator("#theme").evaluate(el => (el as HTMLElement).style.setProperty("--ui-selection-radius", "7px"));
    assert.equal(await css("#nav", "border-top-left-radius"), "7px");
    assert.equal(await css("#tree-row > .row", "border-top-left-radius"), "7px");
    await page.emulateMedia({ forcedColors: "active" });
    for (const [target, surface] of [["#tree-row", "#tree-row > .row"], ["#list-row a", "#list-row"]]) {
      await page.locator(target).focus();
      assert.equal(await css(surface, "outline-width"), "4px", "forced colors keep the independent keyboard-focus weight");
      assert.equal(await css(surface, "outline-style"), "solid");
    }
    await page.close();
  });
});
