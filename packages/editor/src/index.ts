/**
 * The complete Looma editor surface.
 *
 * Looma's editor is based on Tiptap. This entry point registers the editor UI
 * elements and exports the Tiptap extension preset and command helpers needed
 * to use them. Consumers that only want the raw UI elements can use `./ui`.
 */

export * from "./ui";
export * from "./extensions/index";
