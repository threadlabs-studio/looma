/**
 * Register Vue and Svelte syntax highlighting for code blocks.
 * Must run before first code block render.
 */
import Prism from "prismjs";
import "prism-svelte";

// Vue SFCs: use markup (HTML) highlighting — <template>, <script>, <style> are HTML-like
if (!Prism.languages.vue) {
  Prism.languages.vue = Prism.languages.markup;
}
