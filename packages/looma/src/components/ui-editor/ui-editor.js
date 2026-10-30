import { createDocumentEditorSession } from "@threadlabs/looma/editor";
import "@threadlabs/looma/editor.css";
import { placeSurface } from "../shared/overlay.js";
import "../ui-editor-surface/ui-editor-surface.css";
import "./ui-editor.css";

let sequence = 0;
const connections = new WeakMap();

// The host projects session snapshots and forwards native requests; all chrome is authored HTML.
export function connect(host, { signal }) {
  const root = host.element;
  let codeLanguages = null;
  const props = () => ({
    content: host.props.content.value, references: host.props.references.value ?? undefined,
    editable: host.props.editable.value, contentDensity: host.props.contentDensity.value,
    placeholder: host.props.placeholder.value, label: host.props.label.value,
    codeLanguages,
    mentionItems: host.props.mentionItems.value, mentionLimit: host.props.mentionLimit.value,
    linkBaseUrl: host.props.linkBaseUrl.value, linkTargetLabel: host.props.linkTargetLabel.value,
    toolbarMode: host.props.toolbarMode.value, compactToolbar: host.props.compactToolbar.value,
    selectionActions: host.props.selectionActions.value, rangeActions: host.props.rangeActions.value,
    toolbarTriggerId: host.props.toolbarTriggerId.value, toolbarOpen: host.props.toolbarOpen.value,
    disableHighlight: host.props.disableHighlight.value,
  });
  let entry = connections.get(root);
  if (!entry) {
    entry = { host, token: 0 };
    entry.session = createDocumentEditorSession(props(), {
      root, identity: `editor-${++sequence}`,
      hasResponder: name => entry.host.hasResponder(name),
      request: (name, detail, options) => entry.host.request(name, detail, options),
      dispatch: (name, detail) => entry.host.dispatch(name, detail),
      changed: snapshot => { entry.host.state.view = snapshot; },
    });
    connections.set(root, entry);
  }
  entry.host = host;
  const token = ++entry.token;
  const session = entry.session;
  host.state.view = session.snapshot();
  host.effect(() => { session.update(props()); });
  host.effect(() => {
    const view = host.state.view;
    queueMicrotask(() => queueMicrotask(() => {
      if (signal.aborted) return;
      session.rendered(host.refs);
      placeSurface(host.refs.codeShell, view.code?.placement);
      placeSurface(host.refs.mobileShell, view.mobileToolbarStyle);
      placeSurface(host.refs.tableOverlayShell, view.table?.overlayPlacement);
      placeSurface(host.refs.tableMenu, view.table?.menuPlacement);
    }));
  });
  let policyRequest;
  let servicesInitialized = false;
  const loadPolicy = (refresh = false) => {
    policyRequest?.abort();
    const request = policyRequest = new AbortController();
    const requestSignal = AbortSignal.any([signal, request.signal]);
    const service = name => host.request(name, null, { signal: requestSignal }).catch(error => {
      if (!requestSignal.aborted) reportError(error);
      return null;
    });
    Promise.all([service("image-delivery"), servicesInitialized ? codeLanguages : service("code-languages")]).then(([policy, languages]) => {
      if (requestSignal.aborted || token !== entry.token) return;
      servicesInitialized = true;
      codeLanguages = languages ?? null;
      session.update({ codeLanguages, resolveImageSource: typeof policy?.resolveSource === "function" ? policy.resolveSource : undefined, resolveImageAttributes: typeof policy?.resolveAttributes === "function" ? policy.resolveAttributes : undefined });
      session.connect();
      if (refresh) session.refreshServices();
    }, error => { if (!requestSignal.aborted) { reportError(error); session.connect(); } });
  };
  host.on("command", event => {
    if (event.target === root && event.command === "--refresh-services") loadPolicy(true);
  });
  host.on("responder", event => {
    if (event.detail?.name === "image-delivery" && host.hasResponder("image-delivery")) loadPolicy(true);
  });
  loadPolicy();
  return () => {
    queueMicrotask(() => {
      if (entry.token !== token) return;
      session.destroy();
      connections.delete(root);
    });
  };
}
