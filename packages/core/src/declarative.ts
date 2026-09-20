import {
  attachRegisteredComponent,
  getComponentHost,
  manageComponentLifecycle as manageRuntimeLifecycle,
  observeDocument,
  setControllerModule,
} from "../../../tools/migrate-html-next/generated/adoption/runtime.js";

/**
 * The small portion of an HTML Next definition that framework adapters need.
 *
 * The full definition remains runtime-owned. Keeping this type structural and
 * deliberately narrow prevents React/Vue/Svelte adapters from learning the
 * authoring format or treating Looma's former Stencil metadata as public API.
 */
export type ComponentDefinition = {
  readonly contract: { readonly tag: string; readonly props?: Readonly<Record<string, unknown>> };
  readonly root: { readonly element: string };
};

/**
 * Behavior paired with a declarative definition after its native root exists.
 *
 * Controllers receive the HTML Next host abstraction, never a Stencil
 * instance or the legacy invocation element. Returning a disposer makes event
 * and observer ownership explicit when a root disconnects or is reattached.
 */
export type LoomaControllerModule = {
  readonly default?: (host: unknown) => void | (() => void);
};

/**
 * Definition text and optional behavior that must be registered atomically.
 * Keeping them paired prevents a controller from resolving against a different
 * revision of the component contract during incremental package loading.
 */
export type LoomaAdoptionRecord = {
  readonly tag: string;
  readonly source: string;
  readonly controller?: LoomaControllerModule;
};

interface LoomaDeclarativeState {
  readonly runtime: {
    readonly attachRegisteredComponent: typeof attachRegisteredComponent;
    readonly getComponentHost: typeof getComponentHost;
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

// More than one Looma entry point can be evaluated on the same page (the
// facade, a framework adapter, and a direct package import are all legitimate).
// A global symbol gives those copies one registry and one document observer
// without publishing mutable state as a named global or coupling bundlers.
const state = (stateTarget[stateKey] as LoomaDeclarativeState | undefined) ??= {
  runtime: {
    attachRegisteredComponent,
    getComponentHost,
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
  // Framework adapters attach their controller while mounting the native root.
  // The document observer must not create a second controller for that root.
  if (element.getAttribute("data-looma-managed") === "framework") return;
  const controller = state.records.get(tag)?.controller;
  if (!controller?.default) return;
  state.runtime.setControllerModule(element, Promise.resolve(controller));
  return controller.default(state.runtime.getComponentHost(element));
}

function scheduleObservation(): void {
  if (state.observationScheduled || typeof document === "undefined") return;
  state.observationScheduled = true;

  // Package entry points can register synchronously in any order. Deferring one
  // microtask lets them contribute a complete graph before observation starts,
  // then replaces the old observer exactly once when a later package arrives.
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

/**
 * Installs one materialized package and enables live declarative HTML.
 *
 * Registration has three ordered phases: publish definitions and styles,
 * lower markup already in the document, then observe future markup. The
 * package name is the idempotency key because facade and direct entry points
 * may both call this function. On the server the operation is intentionally a
 * no-op: authored HTML remains useful fallback content and hydration is a
 * browser concern.
 */
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
  scheduleObservation();
}

/**
 * Attaches declarative behavior to a framework-owned native root.
 *
 * Framework adapters render the definition's native root themselves so their
 * reconciliation model stays authoritative. Marking it as framework-managed
 * excludes it from document lowering; `attachRegisteredComponent` then owns
 * prop synchronization and controller disposal for that exact root.
 *
 * The explicit `tag` check is a corruption guard. A generated adapter paired
 * with the wrong definition can otherwise appear to work while applying a
 * different component's prop and event contract.
 */
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

/**
 * Resolves behavior from the shared package registry.
 * Generated adapters use this lookup instead of importing controllers directly,
 * ensuring live HTML and framework roots execute the same module instance.
 */
export function controllerFor(tag: string): LoomaControllerModule | undefined {
  return state.records.get(tag)?.controller;
}

/**
 * Exposes HTML Next's connection-aware lifecycle to handwritten integrations.
 * The callback can run again after reconnection; each connection's disposer is
 * invoked before a later connection begins.
 */
export function manageComponentLifecycle(
  ...args: Parameters<typeof manageRuntimeLifecycle>
): ReturnType<typeof manageRuntimeLifecycle> {
  return state.runtime.manageComponentLifecycle(...args);
}
