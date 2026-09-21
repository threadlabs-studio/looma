/** Binds props, behavior, and teardown to a root whose DOM is owned by a framework adapter. */
export declare function attachComponent(element: Element, definition: unknown, options?: { props?: Record<string, unknown>; controller?: unknown }): () => void;
/** Uses the package registry so adapters do not bundle or import private definition objects. */
export declare function attachRegisteredComponent(element: Element, tag: string, options?: { props?: Record<string, unknown>; controller?: unknown }): () => void;
/** Returns the framework-neutral host facade; controllers must not depend on invocation elements. */
export declare function getComponentHost(element: Element): unknown;
export declare function installComponentGraph(...args: unknown[]): unknown;
/** Performs the initial lowering pass before mutation observation begins. */
export declare function lowerDocument(root?: Document): unknown;
/** Connects behavior only while the root participates in the document. */
export declare function manageComponentLifecycle(element: Element, definition: unknown, options?: { props?: Record<string, unknown>; controller?: unknown }): () => void;
/** Owns incremental lowering until its returned disposer is called. */
export declare function observeDocument(root?: Document, options?: { shouldLower?: (element: Element, definition: { contract: { tag: string } }, hydration: boolean) => boolean; onConnect?: (element: Element, definition: { contract: { tag: string } }) => void | (() => void); onError?: (error: unknown) => void }): () => void;
export declare function registerComponentDefinitions(definitions: readonly unknown[], root?: Document): void;
/** Serializes lowered components as their rendered form: slot range markers plus a carrier for projected content no slot renders. */
export declare function serializeRenderedForm(container: Element): string;
/** Associates behavior with one settled root without publishing modules on a browser global. */
export declare function setControllerModule(element: Element, module: Promise<unknown>): void;
/** Framework-adapter prop channel: applies props as authored attributes would be. */
export declare function updateComponentProps(element: Element, props: Readonly<Record<string, unknown>>): void;
