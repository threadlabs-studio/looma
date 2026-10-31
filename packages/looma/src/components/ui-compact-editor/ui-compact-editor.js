import { createCompactEditorSession } from "@threadlabs/looma/editor/compact";
import "./ui-compact-editor.css";

// The declaration owns the stable field and fallback; Tiptap owns only its empty mount.
export function connect(host, { signal }) {
  let session;
  const props = () => ({ content: host.props.content.value, label: host.props.label.value, id: host.props.id.value, editable: host.props.editable.value });
  const stop = host.effect(() => { const next = props(); session?.update(next); });
  const command = event => {
    if (event.target !== host.element && event.target !== session?.editor.view.dom) return;
    if (event.command === "--focus" || event.command === "--focus-end") {
      session?.focus(event.command === "--focus-end" ? "end" : "start");
      if (event.target !== host.element) event.stopPropagation();
    }
  };
  host.element.addEventListener("command", command);
  host.request("extensions", null, { signal }).then(extensions => {
    if (signal.aborted) return;
    session = createCompactEditorSession(host.refs.mount, props(), extensions ?? [], content => host.dispatch("change", { content }));
    // `id` belongs to the actual textbox, so native invokers address that field directly.
    session.editor.view.dom.addEventListener("command", command);
    host.state.ready = true;
  }, error => { if (!signal.aborted) reportError(error); });
  return () => {
    stop();
    host.element.removeEventListener("command", command);
    session?.editor.view.dom.removeEventListener("command", command);
    session?.destroy();
  };
}
