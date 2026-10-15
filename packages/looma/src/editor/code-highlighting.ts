import type { Editor } from "@tiptap/core";
import { createLowlight } from "lowlight";
import { autoCodeLanguageNames, codeLanguageCatalog } from "./code-language-catalog";
import type { LoomaCodeLanguages } from "./extensions/preset";

type CatalogLanguage = keyof typeof codeLanguageCatalog;

/** Code-block highlighting for one editor: its lowlight registry, picker languages, and grammar loading. */
export interface LoomaCodeHighlighting {
  /** The registry the code-block extension highlights with. */
  readonly lowlight: ReturnType<typeof createLowlight>;
  /** Languages the picker offers, in display order. */
  readonly languageNames: readonly string[];
  /**
   * Loads the grammar a code block needs, then re-highlights the document.
   *
   * @contract Does nothing when the host supplied its own languages; each grammar loads once.
   * @failure A failed import is forgotten so a later call retries it.
   */
  loadForCodeBlock(editor: Editor, language: unknown, value: string): void;
}

/**
 * Highlighting from the host's `codeLanguages`, or, when that is null, from the built-in catalog,
 * whose grammars load on demand and whose automatic detection uses a common subset.
 *
 * @lifecycle `onGrammarsLoaded` runs after each lazy load, before the document is re-highlighted,
 * because the lowlight registry is mutable rather than reactive.
 */
export function createCodeHighlighting(codeLanguages: LoomaCodeLanguages | null, onGrammarsLoaded: () => void): LoomaCodeHighlighting {
  const registry = createLowlight(codeLanguages ?? undefined);
  const lowlight = codeLanguages === null
    ? { ...registry, highlightAuto: (value: string) => registry.highlightAuto(value, { subset: [...autoCodeLanguageNames] }) }
    : registry;
  const languageNames = codeLanguages === null
    ? [
        ...autoCodeLanguageNames,
        ...Object.keys(codeLanguageCatalog).filter((name) =>
          !autoCodeLanguageNames.includes(name as typeof autoCodeLanguageNames[number])
        ).sort(),
      ]
    : Object.keys(codeLanguages).sort();
  const grammarLoads = new Map<string, Promise<void>>();
  let catalogLoad: Promise<void> | undefined;

  const refresh = (editor: Editor) => {
    if (editor.isDestroyed) return;
    onGrammarsLoaded();
    // Tiptap refreshes lowlight decorations only after a document change.
    const tr = editor.state.tr;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "codeBlock") tr.setNodeMarkup(pos, undefined, node.attrs);
    });
    if (tr.docChanged) editor.view.dispatch(tr.setMeta("addToHistory", false));
  };
  const loadGrammar = (name: CatalogLanguage) => {
    const existing = grammarLoads.get(name);
    if (existing) return existing;
    const pending = codeLanguageCatalog[name]().then((grammar) => {
      registry.register({ [name]: grammar });
    }).catch((error: unknown) => {
      grammarLoads.delete(name);
      throw error;
    });
    grammarLoads.set(name, pending);
    return pending;
  };

  return {
    lowlight,
    languageNames,
    loadForCodeBlock(editor, language, value) {
      if (codeLanguages !== null || editor.isDestroyed) return;
      if (typeof language === "string" && Object.hasOwn(codeLanguageCatalog, language)) {
        if (registry.registered(language) || grammarLoads.has(language)) return;
        void loadGrammar(language as CatalogLanguage).then(() => refresh(editor)).catch(() => {});
      } else if (!language && value.trim()) {
        catalogLoad ??= Promise.all(autoCodeLanguageNames.map((name) => loadGrammar(name)))
          .then(() => refresh(editor)).catch(() => { catalogLoad = undefined; });
      }
    },
  };
}
