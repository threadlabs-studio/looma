function referencedTags(markup) {
  return [...markup.matchAll(/<(ui-[\w-]+)/g)].map((match) => match[1]);
}

/** Load the transitive component graph referenced by story markup and generated port templates. */
export async function discoverPorts(initialTags, loadPort) {
  const queue = [...initialTags];
  const seen = new Set();
  const ports = [];
  while (queue.length > 0) {
    const tag = queue.shift();
    if (seen.has(tag)) continue;
    seen.add(tag);
    const port = await loadPort(tag);
    if (port === null) continue;
    ports.push(port);
    for (const nested of referencedTags(port.port)) if (!seen.has(nested)) queue.push(nested);
  }
  return ports;
}

export { referencedTags };
