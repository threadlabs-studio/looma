import includeDefaultLanguages from "@theme-original/prism-include-languages";
import type Prism from "prismjs";

/** Register Vue on the renderer's Prism instance before both server and browser rendering. */
export default function includeLanguages(prism: typeof Prism): void {
  includeDefaultLanguages(prism);
  prism.languages.vue = prism.languages.markup;
}
