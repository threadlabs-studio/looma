/** Place explicitly leading links before Markupress's generated sections in server-rendered order. */
export function orderNavigation(options, { nav = [], base }) {
  const order = new Map(nav.filter(entry => entry.position === 'start').map((entry, index) => [entry.href, index]));
  const rank = entry => {
    const href = entry.href.startsWith(base) ? '/' + entry.href.slice(base.length).replace(/^v\/[^/]+\//, '') : entry.href;
    return order.get(href) ?? order.size;
  };
  const layout = layer => {
    if (!layer?.server?.load) return layer;
    const load = layer.server.load;
    return { ...layer, server: { ...layer.server, async load(context) {
      const result = await load(context);
      const shell = result.data?.markupress;
      if (!shell?.nav) return result;
      const links = [...shell.nav].sort((left, right) => rank(left) - rank(right));
      return { ...result,
        props: { ...result.props, ...('nav' in (result.props ?? {}) ? { nav: links } : {}) },
        data: { ...result.data, markupress: { ...shell, nav: links } },
      };
    } } };
  };
  return { ...options,
    ...(options.pages ? { pages: options.pages.map(page => ({ ...page, layout: layout(page.layout) })) } : {}),
    ...(options.layouts ? { layouts: Object.fromEntries(Object.entries(options.layouts).map(([name, layer]) => [name, layout(layer)])) } : {}),
  };
}
