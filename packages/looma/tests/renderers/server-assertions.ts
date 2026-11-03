import { JSDOM } from "jsdom";
import { renderSceneToString, type Scene } from "@looma-test/scene";

/** Assert body markup separately from renderer-owned document styles. */
export async function renderSceneBody(scene: Scene): Promise<string> {
  return new JSDOM(await renderSceneToString(scene)).window.document.body.innerHTML;
}
