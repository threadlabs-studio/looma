import { component, componentProps } from "./component";
import type { Scene, SceneNode, SceneSlots, SceneValue } from "./scene";
import { slotSource } from "./slot-template";

const escape = (value: unknown) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const voids = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
const booleans = new Set("disabled required hidden inert multiple autofocus readonly open controls loop muted autoplay allowfullscreen formnovalidate novalidate reversed ismap nomodule checked selected".split(" "));
const roots = (value: SceneValue): SceneValue[] => Array.isArray(value) ? value.flatMap(roots) : value === null || value === undefined || typeof value === "boolean" ? [] : [value];
let sequence = 0;

export function sceneApplications(scene: Pick<Scene, "render">): ({ html: string } | { tag: string; source: string; inputs: { data: Record<string, unknown> } })[] {
  const applications: ReturnType<typeof sceneApplications> = [];
  for (const value of roots(scene.render())) {
    if (!value || typeof value !== "object") { applications.push({ html: escape(value) }); continue; }
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
      const content = Object.entries(slots).filter(([name]) => !type || type.slots.some(slot => slot.name === name)).map(([name, render]) => {
        const source = slotSource(render);
        if (source !== undefined) return `<template slot="${escape(name)}">${source}</template>`;
        if (type?.slots.some(slot => slot.name === name && slot.props.length > 0))
          throw new Error(`Scoped slot '${name}' needs authored server source in this fixture.`);
        const projected = roots(render());
        if (name && type?.slots.some(slot => slot.name === name && slot.props.length === 0) && projected.every(child => child !== null && typeof child === "object")) {
          return serialize(projected.map(child => {
            const node = child as SceneNode;
            return { ...node, props: { ...node.props, slot: name } };
          }));
        }
        return type ? `<template ${name ? `slot="${escape(name)}" ` : ""}$if="true">${serialize(projected)}</template>` : serialize(projected);
      }).join("");
      return `<${tag}${attributes ? " " + attributes : ""}>${voids.has(tag) ? "" : content + `</${tag}>`}`;
    }).join("");
    const tag = "looma-test-scene-" + sequence++;
    const markup = serialize(value);
    const source = `<template component="${tag}"><defs><prop name="data" type="object({ ... })">Scenario values.</prop></defs>${markup}</template>`;
    applications.push({ tag, source, inputs: { data } });
  }
  return applications;
}
