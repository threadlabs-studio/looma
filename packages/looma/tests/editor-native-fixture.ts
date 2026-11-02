import { componentRegistry, lowerDocument, RequestEvent } from "@nextwebwg/html-next/runtime";
import type { NativeSceneComponent } from "./renderers/scene";

const propNames = ["content", "references", "editable", "contentDensity", "placeholder", "label", "id", "mentionItems", "mentionLimit", "linkBaseUrl", "linkTargetLabel", "toolbarMode", "compactToolbar", "selectionActions", "rangeActions", "toolbarTriggerId", "toolbarOpen", "disableHighlight"];
const requests = ["code-languages", "extensions", "slash-commands", "mention-query", "link-search", "link-resolve", "image-upload", "file-upload", "image-delivery"];
const events = ["change", "toolbar-open", "toolbar-close", "selection-action", "range-action", "upload-error", "image-activate", "image-rendition-error"];
const camel = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
const eventProp = (name: string) => `on${name[0].toUpperCase()}${name.slice(1)}`;

/** A test-only native mount using the current HTML Next API and the page's registered definitions. */
export function nativeEditorFixture(compact = false): NativeSceneComponent {
  return { kind: "native-scene", mount(container, props) {
    let root: HTMLElement | undefined;
    const cleanups: Array<() => void> = [];
    const responders = new Map<string, { kind: string; stop: () => void }>();
    const readProps = () => Object.fromEntries(propNames.filter(name => name in props() && (!compact || ["content", "label", "id", "editable"].includes(name))).map(name => [name, props()[name]]));
    for (const name of events) {
      const listener = (event: Event) => {
        if (event.target !== root) return;
        const attrs = props();
        const handler = attrs[eventProp(name)] ?? attrs[eventProp(camel(name))];
        if (typeof handler === "function") handler(event);
      };
      container.addEventListener(name, listener);
      cleanups.push(() => container.removeEventListener(name, listener));
    }
    const sync = () => {
      if (root) componentRegistry.update(root, readProps());
      const attrs = props();
      for (const name of compact ? ["extensions"] : requests) {
        const responder = attrs[camel(name)];
        const listener = attrs[eventProp(name)] ?? attrs[eventProp(camel(name))];
        const kind = typeof responder === "function" ? "function" : typeof listener === "function" ? "event" : "none";
        if (responders.get(name)?.kind === kind) continue;
        responders.get(name)?.stop(); responders.delete(name);
        if (kind === "function") {
          const stop = RequestEvent.respond(container, name, (detail, init) => {
            const answer = props()[camel(name)];
            return typeof answer === "function" ? answer(detail, init) : null;
          });
          responders.set(name, { kind, stop });
        } else if (kind === "event") {
          const receive = (event: Event) => {
            const attrs = props();
            const handler = attrs[eventProp(name)] ?? attrs[eventProp(camel(name))];
            if (typeof handler === "function") handler(event);
          };
          container.addEventListener(name, receive);
          responders.set(name, { kind, stop: () => container.removeEventListener(name, receive) });
        }
      }
    };
    sync();
    const invocation = document.createElement(compact ? "ui-compact-editor" : "ui-editor");
    container.append(invocation);
    lowerDocument(document, { props: new Map([[invocation, readProps()]]) });
    root = container.firstElementChild as HTMLElement;
    sync();
    return { update: sync, unmount() {
      cleanups.splice(0).forEach(cleanup => cleanup());
      responders.forEach(({ stop }) => stop());
      root?.remove();
    } };
  } };
}
