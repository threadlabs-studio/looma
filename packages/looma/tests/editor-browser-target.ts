import { UiEditor } from "@looma-test/components";
import { nativeEditorFixture } from "./editor-native-fixture";

declare const __LOOMA_EDITOR_TARGET__: string;

/** The editor browser fixtures share their behavior cases across both public projections. */
export async function editorBrowserTarget() {
  if (__LOOMA_EDITOR_TARGET__ !== "native") return UiEditor;
  await import("../dist/index.js");
  return nativeEditorFixture();
}
