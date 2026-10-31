import { bindModule } from "@nextwebwg/html-next/bindings";

/** Retain host-aware providers and a checked transfer revision across preparation and connection. */
export function preparedModule(create) {
  const bindings = new WeakMap();
  const instance = (host, source) => {
    let binding = bindings.get(host.props);
    if (!binding) {
      binding = bindModule(create(host), { browser: { source } });
      bindings.set(host.props, binding);
    }
    return binding;
  };
  return {
    connect(host, context) { return instance(host).connect(host, context); },
    prepare(host, options) { return instance(host).prepare(host, options); },
    adopt(host, options) { return instance(host, options.snapshot.source).adopt(host, options); },
  };
}
