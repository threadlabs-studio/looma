import { parseComponent } from "@nextwebwg/html-next";
import { renderComponents } from "@nextwebwg/html-next/server";
import { definitions, preparation } from "@looma-test/native-data";
import type { Scene } from "./scene";
import { sceneApplications } from "./native-scene";
import { pathToFileURL } from "node:url";

export async function renderNativeScene(scene: Scene): Promise<string> {
  const module = process.env.LOOMA_NATIVE_SERVER_MODULE;
  const external = module ? await import(/* @vite-ignore */ pathToFileURL(module).href) : undefined;
  const html: string[] = [];
  for (const request of sceneApplications(scene)) {
    if ("html" in request) { html.push(request.html); continue; }
    if (external) { html.push(await external.renderApplication(request)); continue; }
    const fixture = parseComponent(request.source, "looma-browser-scene.html");
    const rendered = await renderComponents(`<${request.tag}></${request.tag}>`, { definitions: [...definitions, fixture], props: { [request.tag]: request.inputs }, prepare: { module: preparation } });
    html.push(rendered.html);
  }
  return html.join("");
}
