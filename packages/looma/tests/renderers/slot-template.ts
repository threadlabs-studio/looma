import type { SceneValue } from "./scene";

const sources = new WeakMap<(props: any) => SceneValue, string>();

/** Pair a JavaScript fixture callback with the authored slot source used by server compilers. */
export function scopedSlot<T extends (props: any) => SceneValue>(render: T, source: string): T {
  sources.set(render, source);
  return render;
}

export function slotSource(render: (props: any) => SceneValue): string | undefined {
  return sources.get(render);
}
