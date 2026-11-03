import { APP_ID, provideZonelessChangeDetection, signal, type InjectionToken, type Type, type WritableSignal } from "@angular/core";
import { bootstrapApplication, provideClientHydration } from "@angular/platform-browser";
import { renderApplication, provideServerRendering } from "@angular/platform-server";
import { parse, serialize, serializeOuter } from "parse5";
import type { Scene, SceneValue } from "./scene";

// These scenes share dynamic TemplateRef classes and their server hydration metadata.
// Serialize server construction; browser scenarios still run on independent input lanes.
let pending = Promise.resolve();
export function renderAngularHTML(root: Type<unknown>, scene: Scene, token: InjectionToken<WritableSignal<SceneValue>>): Promise<string> {
  const result = pending.then(() => renderNow(root, scene, token));
  pending = result.then(() => {}, () => {});
  return result;
}
async function renderNow(root: Type<unknown>, scene: Scene, token: InjectionToken<WritableSignal<SceneValue>>): Promise<string> {
  const html = await renderApplication(context => bootstrapApplication(root, { providers: [
    provideServerRendering(), provideZonelessChangeDetection(), provideClientHydration(), { provide: token, useValue: signal(scene.render()) }, { provide: APP_ID, useValue: "looma-test" },
  ] }, context), { document: '<!doctype html><html><head></head><body><div looma-scene-root></div></body></html>' });
  const document = parse(html);
  const find = (node: any, predicate: (node: any) => boolean): any => predicate(node) ? node : node.childNodes?.map((child: any) => find(child, predicate)).find(Boolean);
  const element = find(document, node => node.attrs?.some((attribute: any) => attribute.name === "looma-scene-root"));
  const body = find(document, node => node.tagName === "body");
  const head = find(document, node => node.tagName === "head");
  const styles = head.childNodes.filter((node: any) => node.tagName === "style").map((node: any) => serializeOuter(node)).join("");
  const attributes = Object.fromEntries(element.attrs.map((attribute: any) => [attribute.name, attribute.value]));
  // Angular puts its integrity marker beside the application root. Preserve all
  // surrounding SSR nodes when embedding the application in a fixture container.
  const surrounding = body.childNodes.filter((node: any) => node !== element).map((node: any) => serializeOuter(node)).join("");
  return styles + serialize(element) + `<script type="application/json" data-looma-angular-root>${JSON.stringify(attributes).replaceAll("<", "\\u003c")}</script><template data-looma-angular-document>${surrounding}</template>`;
}
