import { componentRegistry, lowerDocument, RequestEvent } from "@nextwebwg/html-next/runtime";
import { defineComponent, h, onBeforeUnmount, onMounted, onUpdated, shallowRef, type Component } from "vue";

const propNames = ["content", "references", "editable", "contentDensity", "placeholder", "label", "id", "mentionItems", "mentionLimit", "linkBaseUrl", "linkTargetLabel", "toolbarMode", "compactToolbar", "selectionActions", "rangeActions", "toolbarTriggerId", "toolbarOpen", "disableHighlight"];
const requests = ["code-languages", "extensions", "slash-commands", "mention-query", "link-search", "link-resolve", "image-upload", "file-upload", "image-delivery"];
const events = ["change", "toolbar-open", "toolbar-close", "selection-action", "range-action", "upload-error", "image-activate", "image-rendition-error"];
const camel = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
const eventProp = (name: string) => `on${name[0].toUpperCase()}${name.slice(1)}`;

/** A test-only native mount using the current HTML Next API and the page's registered definitions. */
export function nativeEditorFixture(compact = false): Component {
  return defineComponent({
    inheritAttrs: false,
    setup(_props, { attrs }) {
      const mount = shallowRef<HTMLElement>();
      let root: HTMLElement | undefined;
      const cleanups: Array<() => void> = [];
      const responders = new Map<string, { kind: string; stop: () => void }>();
      let sync = () => {};
      onUpdated(() => sync());
      const readProps = () => Object.fromEntries(propNames.filter(name => name in attrs && (!compact || ["content", "label", "id", "editable"].includes(name))).map(name => [name, attrs[name]]));
      onMounted(() => {
        const invocation = document.createElement(compact ? "ui-compact-editor" : "ui-editor");
        const container = mount.value!;
        for (const name of events) {
          const listener = (event: Event) => {
            if (event.target !== root) return;
            const handler = attrs[eventProp(name)] ?? attrs[eventProp(camel(name))];
            if (typeof handler === "function") handler(event);
          };
          container.addEventListener(name, listener);
          cleanups.push(() => container.removeEventListener(name, listener));
        }
        sync = () => {
          if (root) componentRegistry.update(root, readProps());
          for (const name of compact ? ["extensions"] : requests) {
            const responder = attrs[camel(name)];
            const listener = attrs[eventProp(name)] ?? attrs[eventProp(camel(name))];
            const kind = typeof responder === "function" ? "function" : typeof listener === "function" ? "event" : "none";
            if (responders.get(name)?.kind === kind) continue;
            responders.get(name)?.stop(); responders.delete(name);
            if (kind === "function") {
              const stop = RequestEvent.respond(mount.value!, name, (detail, init) => {
                const answer = attrs[camel(name)];
                return typeof answer === "function" ? answer(detail, init) : null;
              });
              responders.set(name, { kind, stop });
            } else if (kind === "event") {
              const receive = (event: Event) => {
                const handler = attrs[eventProp(name)] ?? attrs[eventProp(camel(name))];
                if (typeof handler === "function") handler(event);
              };
              mount.value!.addEventListener(name, receive);
              responders.set(name, { kind, stop: () => mount.value?.removeEventListener(name, receive) });
            }
          }
        };
        sync();
        container.append(invocation);
        lowerDocument(document, { props: new Map([[invocation, readProps()]]) });
        root = container.firstElementChild as HTMLElement;
        sync();
      });
      onBeforeUnmount(() => {
        cleanups.splice(0).forEach(cleanup => cleanup());
        responders.forEach(({ stop }) => stop());
        root?.remove();
      });
      return () => h("div", { ref: mount });
    },
  });
}
