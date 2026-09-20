import {
  attachRegisteredComponent,
  getComponentHost,
  lowerDocument,
  manageComponentLifecycle as manageRuntimeLifecycle,
  observeDocument,
  setControllerModule,
} from "../../../tools/migrate-html-next/generated/adoption/runtime.js";

export type ComponentDefinition = {
  readonly contract: { readonly tag: string; readonly props?: Readonly<Record<string, unknown>> };
  readonly root: { readonly element: string };
};

export type LoomaControllerModule = {
  readonly default?: (host: unknown) => void | (() => void);
};

export type LoomaAdoptionRecord = {
  readonly tag: string;
  readonly source: string;
  readonly controller?: LoomaControllerModule;
};

interface LoomaDeclarativeState {
  readonly runtime: {
    readonly attachRegisteredComponent: typeof attachRegisteredComponent;
    readonly getComponentHost: typeof getComponentHost;
    readonly lowerDocument: typeof lowerDocument;
    readonly manageComponentLifecycle: typeof manageRuntimeLifecycle;
    readonly observeDocument: typeof observeDocument;
    readonly setControllerModule: typeof setControllerModule;
  };
  readonly records: Map<string, LoomaAdoptionRecord>;
  readonly installedPackages: Set<string>;
  stopObservation: undefined | (() => void);
  observationScheduled: boolean;
}

const stateKey = Symbol.for("@threadlabs/looma.declarative.v1");
const stateTarget = globalThis as typeof globalThis & { [key: symbol]: unknown };
const state = (stateTarget[stateKey] as LoomaDeclarativeState | undefined) ??= {
  runtime: {
    attachRegisteredComponent,
    getComponentHost,
    lowerDocument,
    manageComponentLifecycle: manageRuntimeLifecycle,
    observeDocument,
    setControllerModule,
  },
  records: new Map(),
  installedPackages: new Set(),
  stopObservation: undefined,
  observationScheduled: false,
};

function connectController(element: Element, tag: string): void | (() => void) {
  if (element.getAttribute("data-looma-managed") === "framework") return;
  const controller = state.records.get(tag)?.controller;
  if (!controller?.default) return;
  state.runtime.setControllerModule(element, Promise.resolve(controller));
  return controller.default(state.runtime.getComponentHost(element));
}

function scheduleObservation(): void {
  if (state.observationScheduled || typeof document === "undefined") return;
  state.observationScheduled = true;
  queueMicrotask(() => {
    state.observationScheduled = false;
    state.stopObservation?.();
    state.stopObservation = state.runtime.observeDocument(document, {
      shouldLower(element) {
        return element.getAttribute("data-looma-managed") !== "framework";
      },
      onConnect(element, definition) {
        return connectController(element, definition.contract.tag);
      },
    });
  });
}

/** Registers a materialized declarative package and enables live HTML lowering. */
export function registerLoomaPackage(
  name: string,
  packageRecords: readonly LoomaAdoptionRecord[],
  styles: string,
): void {
  if (typeof document === "undefined" || state.installedPackages.has(name)) return;
  state.stopObservation?.();
  state.stopObservation = undefined;
  state.installedPackages.add(name);
  const definitions = document.createElement("div");
  definitions.hidden = true;
  definitions.dataset.loomaDefinitions = name;
  definitions.innerHTML = packageRecords.map(({ source }) => source).join("\n");
  document.head.append(...Array.from(definitions.children));
  for (const record of packageRecords) state.records.set(record.tag, record);
  if (styles !== "") {
    const style = document.createElement("style");
    style.dataset.loomaStyles = name;
    style.textContent = styles;
    document.head.append(style);
  }
  state.runtime.lowerDocument(document);
  scheduleObservation();
}

/** Adopts a framework-owned native root without exposing the legacy invocation element. */
export function attachLoomaComponent(
  element: Element,
  definition: ComponentDefinition,
  tag: string,
  props: Record<string, unknown>,
): () => void {
  if (definition.contract.tag !== tag) {
    throw new TypeError(`Looma definition ${definition.contract.tag} cannot attach as ${tag}.`);
  }
  const controller = state.records.get(tag)?.controller;
  element.setAttribute("data-looma-managed", "framework");
  return state.runtime.attachRegisteredComponent(element, tag, { props, controller });
}

export function controllerFor(tag: string): LoomaControllerModule | undefined {
  return state.records.get(tag)?.controller;
}

export function manageComponentLifecycle(
  ...args: Parameters<typeof manageRuntimeLifecycle>
): ReturnType<typeof manageRuntimeLifecycle> {
  return state.runtime.manageComponentLifecycle(...args);
}
