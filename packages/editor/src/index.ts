/**
 * The complete Looma editor surface.
 *
 * This entry point combines two independently usable layers: importing `./ui`
 * registers Tiptap-independent declarative chrome, while `./extensions` exports
 * Tiptap schema/behavior and command helpers. The combined entry therefore has
 * UI registration side effects. Consumers building custom editor behavior can
 * choose either subpath to keep the other layer out of their dependency graph.
 */

export * from "./ui";
export * from "./extensions/index";
