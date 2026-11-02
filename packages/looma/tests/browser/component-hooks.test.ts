import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Component hooks", () => {
  // A tree of components, one spec for both adapters: [component or element, attributes, children].
  type Node = [string, Record<string, string | boolean | number>, (Node | string)[]?];
  const hook = (name: string, value: string) => ({ style: `${name}: ${value}` });
  const mark = "rgb(1, 2, 3)";
  const tree: Node[] = [
    // Hooks theme matching components in the subtree; a nearer declaration overrides them.
    ["Stack", { id: "stack-outer", ...hook("--ui-stack-gap", "0") }, [
      ["Stack", { id: "stack-prop", gap: "l" }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
      ["Stack", { id: "stack-default" }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
      ["Stack", { id: "stack-reset", gap: "l", ...hook("--ui-stack-gap", "initial") }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
      ["Stack", { id: "stack-own", ...hook("--ui-stack-gap", "7px") }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
    ]],
    ["Stack", { id: "measured-stack", height: 30 }, [["span", {}, ["Measured"]]]],
    ["Skeleton", { id: "inherited-skeleton" }],
    ["Skeleton", { id: "local-skeleton", width: "60px", height: "12px" }],
    ["SiteHeader", { id: "themed-header" }, [["a", { slot: "brand", href: "#home" }, ["Folio"]]]],
    ["SiteHeader", { id: "local-header", ...hook("--ui-site-header-height", "80px") }, [["a", { slot: "brand", href: "#local" }, ["Local"]]]],
    ["Cluster", { id: "cluster-outer", ...hook("--ui-cluster-gap", "0") }, [
      ["Cluster", { id: "cluster-nested" }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
      ["Cluster", { id: "cluster-own", ...hook("--ui-cluster-gap", "7px") }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
    ]],
    ["Grid", { id: "grid-outer", ...hook("--ui-grid-gap", "0") }, [
      ["Grid", { id: "grid-nested" }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
      ["Grid", { id: "grid-own", ...hook("--ui-grid-gap", "7px") }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
    ]],
    ["div", hook("--ui-badge-border", mark), [["Badge", { id: "badge-nested" }, ["New"]]]],
    ["Badge", { id: "badge-plain" }, ["New"]],
    ["Badge", { id: "badge-own", ...hook("--ui-badge-border", mark) }, ["New"]],
    ["div", hook("--ui-button-surface", mark), [["Button", { id: "button-nested" }, ["Save"]]]],
    ["Button", { id: "button-plain" }, ["Save"]],
    ["Button", { id: "button-own", ...hook("--ui-button-surface", mark) }, ["Save"]],
    ["div", hook("--ui-input-radius", "7px"), [["Input", { id: "input-nested", "aria-label": "Nested" }]]],
    ["Input", { id: "input-plain", "aria-label": "Plain" }],
    ["Input", { id: "input-own", "aria-label": "Own", ...hook("--ui-input-radius", "7px") }],
    ["div", hook("--ui-tabs-panel-padding", "7px"), [["Tabs", { id: "tabs-nested", label: "Nested tabs" }, [["section", { "aria-label": "Overview" }, ["Overview"]]]]]],
    ["Tabs", { id: "tabs-plain", label: "Plain tabs" }, [["section", { "aria-label": "Overview" }, ["Overview"]]]],
    ["Tabs", { id: "tabs-own", label: "Own tabs", ...hook("--ui-tabs-panel-padding", "7px") }, [["section", { "aria-label": "Overview" }, ["Overview"]]]],
    ["nav", { "aria-label": "Hooked", ...hook("--ui-nav-item-indicator-color", mark) }, [["NavItem", { id: "nav-nested", variant: "line", current: "true" }, ["Home"]]]],
    ["NavItem", { id: "nav-plain", variant: "line", current: "true" }, ["Home"]],
    ["NavItem", { id: "nav-own", variant: "line", current: "true", ...hook("--ui-nav-item-indicator-color", mark) }, ["Home"]],
    // Inherited hooks also reach inner parts of nested instances.
    ["Callout", { id: "callout-outer", ...hook("--ui-callout-icon", mark) }, [["Callout", { id: "callout-nested" }, ["Inner"]]]],
    ["Callout", { id: "callout-plain" }, ["Plain"]],
    ["Stack", { id: "unmeasured-stack" }, [["span", {}, ["Intrinsic"]]]],
    // Theme tokens still theme a subtree.
    ["div", { style: `--ui-space-5: 40px; --ui-accent: ${mark}` }, [
      ["Stack", { id: "stack-themed", gap: "l" }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
      ["NavItem", { id: "nav-themed", variant: "line", current: "true" }, ["Home"]],
    ]],
  ];

  const kebab = (name: string) => name.replace(/[A-Z]/g, (letter, index) => `${index ? "-" : ""}${letter.toLowerCase()}`);
  const html = (nodes: (Node | string)[]): string => nodes.map((node) => {
    if (typeof node === "string") return node;
    const [name, attributes, children = []] = node;
    const tag = /^[A-Z]/.test(name) ? `ui-${kebab(name)}` : name;
    const attrs = Object.entries(attributes).map(([key, value]) => value === true ? key : `${key}="${value}"`).join(" ");
    return `<${tag} ${attrs}>${html(children)}</${tag}>`;
  }).join("");

  async function checkHooks(page: Page) {
    await page.locator("#nav-themed").waitFor();
    const style = (id: string, property: string, part?: string) => page.locator(`#${id}`).evaluate((element, [property, part]) =>
      getComputedStyle(part ? element.querySelector(part)! : element).getPropertyValue(property!), [property, part]);

    await page.addStyleTag({ content: ':root { --ui-site-header-height:96px; --ui-button-radius:9px; --ui-skeleton-width:42px; --ui-skeleton-height:10px; }' });
    assert.equal(await style("themed-header", "min-block-size"), "96px", "a public hook works from :root");
    assert.equal(await style("local-header", "min-block-size"), "80px", "a local hook wins over a root setting");
    assert.equal(await style("button-plain", "border-top-left-radius"), "9px", "root settings reach unrelated component families");
    assert.equal(await style("inherited-skeleton", "width"), "42px", "empty dimension props preserve inherited styling");
    assert.equal(await style("inherited-skeleton", "height"), "10px");
    assert.equal(await style("local-skeleton", "width"), "60px", "an explicit dimension prop sets the local value");
    assert.equal(await style("local-skeleton", "height"), "12px");
    assert.equal(await style("measured-stack", "height"), "30px");
    assert.notEqual(await style("unmeasured-stack", "height"), "30px", "an internal measurement is instance-specific");

    // Inherited hooks have the same documented precedence over props as local hooks.
    assert.equal(await style("stack-outer", "row-gap"), "0px", "the hook styles the stack it is set on");
    assert.equal(await style("stack-prop", "row-gap"), "0px", "an inherited hook overrides the gap prop");
    assert.equal(await style("stack-reset", "row-gap"), "24px", "initial restores the prop-driven fallback");
    assert.equal(await style("stack-default", "row-gap"), "0px", "a nested stack inherits the hook");
    assert.equal(await style("stack-own", "row-gap"), "7px", "the hook set on the stack itself wins over its default");
    assert.equal(await style("cluster-nested", "column-gap"), "0px", "a nested cluster inherits the hook");
    assert.equal(await style("cluster-own", "column-gap"), "7px", "the hook set on the cluster itself wins");
    assert.equal(await style("grid-nested", "row-gap"), "0px", "a nested grid inherits the hook");
    assert.equal(await style("grid-own", "row-gap"), "7px", "the hook set on the grid itself wins");

    for (const [component, property, value, part] of [
      ["badge", "border-top-color", mark],
      ["button", "background-color", mark],
      ["input", "border-top-left-radius", "7px"],
      ["tabs", "padding-top", "7px", "[role=tabpanel]"],
      ["nav", "border-inline-start-color", mark, ".indicator"],
    ] as const) {
      const plain = await style(`${component}-plain`, property, part);
      assert.notEqual(plain, value, `${component}: the default differs from the hook's value`);
      assert.equal(await style(`${component}-nested`, property, part), value, `${component}: an ancestor hook styles the instance inside`);
      assert.equal(await style(`${component}-own`, property, part), value, `${component}: a hook on the instance styles it`);
    }

    assert.equal(await style("callout-outer", "color", ".icon"), mark, "a callout's hook reaches its own icon");
    assert.equal(await style("callout-nested", "color", ".icon"), mark, "an inherited hook reaches a nested callout's icon");

    assert.equal(await style("stack-themed", "row-gap"), "40px", "a spacing token themes the stacks in its subtree");
    assert.equal(await style("nav-themed", "border-inline-start-color", ".indicator"), mark, "the accent themes the nav items in its subtree");
  }

  it("inherit from ancestors and allow instance overrides, in HTML", async () => {
    const path = await bundle("html-hooks", `import "@looma-test/runtime";`);
    const page = await open(path, html(tree), [join(root, "tokens.css")]);
    await page.waitForSelector('#nav-themed:is([component~="ui-nav-item"], [data-component~="ui-nav-item"], .ui-nav-item, [ui-nav-item])');
    await checkHooks(page);
    await page.close();
  });

  it("inherit from ancestors and allow instance overrides, in converted output", async () => {
    const path = await bundle("converted-hooks", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import * as looma from "@looma-test/components";
      const render = (node) => {
        if (typeof node === "string") return node;
        const [name, attributes, children = []] = node;
        return sceneNode(/^[A-Z]/.test(name) ? looma["Ui" + name] : name, attributes, /^[A-Z]/.test(name) ? () => children.map(render) : children.map(render));
      };
      createScene({ render: () => ${JSON.stringify(tree)}.map(render) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkHooks(page);
    await page.close();
  });
});
