import { parseComponent } from "@nextwebwg/html-next";
import { renderComponents } from "@nextwebwg/html-next/server";
import { definitions, preparation } from "@looma-test/native-data";
import { component, componentProps } from "./component";
import type { Scene, SceneNode, SceneSlots, SceneValue } from "./scene";

const escape = (value: unknown) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const voids = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
const booleans = new Set("disabled required hidden inert multiple autofocus readonly open controls loop muted autoplay allowfullscreen formnovalidate novalidate reversed ismap nomodule checked selected".split(" "));
const roots = (value: SceneValue): SceneValue[] => Array.isArray(value) ? value.flatMap(roots) : value === null || value === undefined || typeof value === "boolean" ? [] : [value];
let sequence = 0;

export async function renderNativeScene(scene: Scene): Promise<string> {
  const html: string[] = [];
  for (const value of roots(scene.render())) {
    if (!value || typeof value !== "object") { html.push(escape(value)); continue; }
    const data: Record<string, unknown> = {};
    let next = 0;
    const serialize = (value: SceneValue): string => roots(value).map(value => {
      if (!value || typeof value !== "object") { const key = "v" + next++; data[key] = value; return `{$data.${key}}`; }
      const node = value as SceneNode, type = component(node.type), tag = type?.tag ?? node.type as string;
      const attributes = Object.entries(componentProps(node)).flatMap(([name, value]) => {
        if (type?.inputs.includes(name)) { const key = "v" + next++; data[key] = value; return `from:${name.replace(/[A-Z]/g, letter => "-" + letter.toLowerCase())}="$data.${key}"`; }
        if (type?.props.includes(name) || name === "key" || value === null || value === undefined || value === false && booleans.has(name)) return [];
        if (name === "style" && typeof value === "object") value = Object.entries(value).map(([name, value]) => `${name.replace(/[A-Z]/g, letter => "-" + letter.toLowerCase())}:${value}`).join(";");
        return `${name}="${value === true && booleans.has(name) ? "" : escape(value)}"`;
      }).join(" ");
      const source = node.children;
      const slots = typeof source === "function" ? { "": source } : source && typeof source === "object" && !Array.isArray(source) && !("type" in source)
        ? Object.fromEntries(Object.entries(source as SceneSlots).map(([name, render]) => [name === "default" ? "" : name, render]))
        : source === undefined ? {} : { "": () => source as SceneValue };
      const content = Object.entries(slots).map(([name, render]) => type
        ? `<template ${name ? `slot="${escape(name)}" ` : ""}$if="true">${serialize(render())}</template>`
        : serialize(render())).join("");
      return `<${tag}${attributes ? " " + attributes : ""}>${voids.has(tag) ? "" : content + `</${tag}>`}`;
    }).join("");
    const tag = "looma-test-scene-" + sequence++;
    const markup = serialize(value);
    const fixture = parseComponent(`<template component="${tag}"><defs><prop name="data" type="object({ ... })">Scenario values.</prop></defs>${markup}</template>`, "looma-browser-scene.html");
    const rendered = await renderComponents(`<${tag}></${tag}>`, { definitions: [...definitions, fixture], props: { [tag]: { data } }, prepare: { module: preparation } });
    html.push(rendered.html);
  }
  return html.join("");
}
