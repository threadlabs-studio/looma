import { afterAll } from "vitest";
import type { Component } from "vue";
import { nativeEditorFixture } from "./editor-native-fixture";

declare const __LOOMA_EDITOR_TARGET__: string;
export const nativeEditorTarget = __LOOMA_EDITOR_TARGET__ === "native";
if (nativeEditorTarget) {
  const { stop } = await import("../dist/index.js");
  afterAll(() => stop?.());
}

/** Run the same consumer fixture against native definitions or the Vite-converted component. */
export async function editorUnderTest(converted: Component, compact = false): Promise<Component> {
  return nativeEditorTarget ? nativeEditorFixture(compact) : converted;
}
