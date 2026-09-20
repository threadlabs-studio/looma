export declare function attachComponent(element: Element, definition: unknown, options?: { props?: Record<string, unknown>; controller?: unknown }): () => void;
export declare function attachRegisteredComponent(element: Element, tag: string, options?: { props?: Record<string, unknown>; controller?: unknown }): () => void;
export declare function getComponentHost(element: Element): unknown;
export declare function installComponentGraph(...args: unknown[]): unknown;
export declare function lowerDocument(root?: Document): unknown;
export declare function manageComponentLifecycle(element: Element, definition: unknown, options?: { props?: Record<string, unknown>; controller?: unknown }): () => void;
export declare function observeDocument(root?: Document, options?: { shouldLower?: (element: Element, definition: { contract: { tag: string } }, hydration: boolean) => boolean; onConnect?: (element: Element, definition: { contract: { tag: string } }) => void | (() => void); onError?: (error: unknown) => void }): () => void;
export declare function registerComponentDefinitions(definitions: readonly unknown[], root?: Document): void;
export declare function setControllerModule(element: Element, module: Promise<unknown>): void;
