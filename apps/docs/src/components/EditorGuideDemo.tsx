import React, { useEffect, useRef, useState } from "react";

const startingDocument = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "A small writing space" }] },
    { type: "paragraph", content: [{ type: "text", text: "Select this sentence to see formatting beside your selection. Type / for blocks or @ to mention someone." }] },
    { type: "paragraph", content: [{ type: "text", text: "A good editor lets the writing stay in focus. The controls should be close when you need them and quiet when you do not." }] },
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Try the tools" }] },
    { type: "paragraph", content: [{ type: "text", text: "Scroll this document in sticky mode: its toolbar stays within reach at the top. In selection mode, highlight a few words instead." }] },
    { type: "paragraph", content: [{ type: "text", text: "Use the slash menu to add a list, callout, code block, or table. You can edit everything here, including this sample text." }] },
    { type: "paragraph", content: [{ type: "text", text: "Mention Ada Lovelace or Grace Hopper by typing @. Move between blocks with the keyboard, then undo any change you make." }] },
    { type: "paragraph", content: [{ type: "text", text: "The sample is long enough to scroll so you can see where the sticky toolbar goes while you write." }] }
  ]
};

/** Mount the native HTML Next editor after the browser loads. */
export function EditorGuideDemo(): JSX.Element {
  const mount = useRef<HTMLDivElement>(null);
  const documentValue = useRef(startingDocument);
  const update = useRef<(props: Record<string, unknown>) => void>();
  const [toolbarMode, setToolbarMode] = useState<"bubble" | "sticky">("sticky");
  const mode = useRef(toolbarMode);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;
    void Promise.all([
      import("@threadlabs/looma"),
      import("@nextwebwg/html-next/runtime"),
      import("@threadlabs/looma/tokens.css"),
      import("@threadlabs/looma/theme-light.css"),
      import("@threadlabs/looma/theme-dark.css")
    ]).then(([_runtime, { componentRegistry, lowerDocument }]) => {
      if (!active || !mount.current) return;
      const invocation = document.createElement("ui-editor");
      const props = {
        content: documentValue.current,
        label: "Editor guide playground",
        toolbarMode: mode.current,
        mentionItems: [
          { id: "ada", label: "Ada Lovelace", detail: "Design", initials: "AL" },
          { id: "grace", label: "Grace Hopper", detail: "Engineering", initials: "GH" }
        ]
      };
      mount.current.append(invocation);
      lowerDocument(document, { props: new Map([[invocation, props]]) });
      const root = mount.current.firstElementChild as HTMLElement;
      const changed = (event: Event) => {
        if (event.target === root) documentValue.current = (event as CustomEvent<{ content: typeof startingDocument }>).detail.content;
      };
      root.addEventListener("change", changed);
      update.current = props => componentRegistry.update(root, props);
      cleanup = () => { root.removeEventListener("change", changed); root.remove(); update.current = undefined; };
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; cleanup?.(); };
  }, []);

  useEffect(() => { mode.current = toolbarMode; update.current?.({ content: documentValue.current, toolbarMode }); }, [toolbarMode]);

  return (
    <div className="looma-editor-guide-demo">
      <div className="looma-editor-guide-demo__settings">
        <span id="editor-guide-toolbar-label">Toolbar</span>
        <div className="looma-editor-guide-demo__modes" role="group" aria-labelledby="editor-guide-toolbar-label">
          <button type="button" aria-pressed={toolbarMode === "sticky"} onClick={() => setToolbarMode("sticky")}>Always visible</button>
          <button type="button" aria-pressed={toolbarMode === "bubble"} onClick={() => setToolbarMode("bubble")}>Beside selection</button>
        </div>
        <span className="looma-editor-guide-demo__hint">
          {toolbarMode === "sticky" ? "Scroll inside the editor; the toolbar stays in view." : "Select some text to reveal the toolbar."}
        </span>
      </div>
      {error ? <p role="alert">The editor demo could not load.</p> : null}
      <div ref={mount} className="looma-editor-guide-demo__editor" />
    </div>
  );
}
