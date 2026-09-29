import React, { useEffect, useRef, useState } from "react";

const startingDocument = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Select this text to try the toolbar. Type / for blocks or @ for a mention." }] },
    { type: "paragraph", content: [{ type: "text", text: "Try inserting a table, then use its row and column controls." }] }
  ]
};

/** Mount the published Vue editor in the React docs only after the browser loads. */
export function EditorGuideDemo(): JSX.Element {
  const mount = useRef<HTMLDivElement>(null);
  const documentValue = useRef(startingDocument);
  const [toolbarMode, setToolbarMode] = useState<"bubble" | "sticky">("sticky");
  const [disableHighlight, setDisableHighlight] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let unmount: (() => void) | undefined;
    void Promise.all([
      import("vue"),
      import("@threadlabs/looma/vue/editor"),
      import("@threadlabs/looma/tokens.css"),
      import("@threadlabs/looma/theme-light.css"),
      import("@threadlabs/looma/theme-dark.css"),
      import("@threadlabs/looma/vue.css")
    ]).then(([vue, { LoomaEditor }]) => {
      if (!active || !mount.current) return;
      const app = vue.createApp({
        render: () => vue.h(LoomaEditor, {
          modelValue: documentValue.current,
          label: "Editor guide playground",
          toolbarMode,
          disableHighlight,
          mentionItems: [
            { id: "ada", label: "Ada Lovelace", detail: "Design", initials: "AL" },
            { id: "grace", label: "Grace Hopper", detail: "Engineering", initials: "GH" }
          ],
          "onUpdate:modelValue": (value: typeof startingDocument) => { documentValue.current = value; }
        })
      });
      app.mount(mount.current);
      unmount = () => app.unmount();
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; unmount?.(); };
  }, [toolbarMode, disableHighlight]);

  return (
    <div className="looma-editor-guide-demo">
      <div className="looma-editor-guide-demo__settings">
        <label>
          Toolbar
          <select value={toolbarMode} onChange={(event) => setToolbarMode(event.target.value as "bubble" | "sticky")}>
            <option value="sticky">Sticky</option>
            <option value="bubble">Beside selection</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={disableHighlight} onChange={(event) => setDisableHighlight(event.target.checked)} />
          Reserve highlighting for the application
        </label>
      </div>
      {error ? <p role="alert">The editor demo could not load.</p> : null}
      <div ref={mount} className="looma-editor-guide-demo__editor" />
    </div>
  );
}
