/** Order the main links and group onboarding guidance in the server-rendered sidebar. */
export function orderNavigation(options, { nav = [], base }) {
  const order = new Map(nav.filter(entry => entry.position === 'start').map((entry, index) => [entry.href, index]));
  const localPath = href => href?.startsWith(base) ? '/' + href.slice(base.length).replace(/^v\/[^/]+\//, '') : href;
  const rank = entry => order.get(localPath(entry.href)) ?? order.size;
  const layout = layer => {
    if (!layer?.server?.load) return layer;
    const load = layer.server.load;
    return { ...layer, server: { ...layer.server, async load(context) {
      const result = await load(context);
      const shell = result.data?.markupress;
      if (!shell?.nav) return result;
      const links = [...shell.nav].sort((left, right) => rank(left) - rank(right));
      const guideRank = node => ({ '/': -1, '/getting-started/': 0, '/design-system/': 1 })[localPath(node.href)] ?? 2;
      const mainSections = new Set(shell.nav.map(link => localPath(link.href)));
      const guidance = shell.sidebar?.some(node => localPath(node.href) === '/design-system/');
      let sidebar = shell.sidebar;
      if (guidance && context.navigationTree && shell.home) {
        sidebar = await context.navigationTree({ from: '/' + shell.home.slice(base.length), current: context.url.pathname });
        sidebar = sidebar.map(node => {
          const overview = node.children.find(child => localPath(child.href) === '/design-system/');
          return overview ? { ...node, href: overview.href, current: overview.current, overviewLabel: 'Overview',
            children: node.children.filter(child => child !== overview) } : node;
        });
      }
      sidebar = guidance ? sidebar
        .filter(node => !(['/components/', '/customize/', '/editor/'].includes(localPath(node.href)) && mainSections.has(localPath(node.href))))
        .sort((left, right) => guideRank(left) - guideRank(right)) : sidebar;
      const chrome = { nav: links, ...(sidebar ? { sidebar } : {}), ...(guidance && context.navigationTree ? { sidebarNavigation: 'tree' } : {}) };
      return { ...result,
        props: { ...result.props, ...Object.fromEntries(Object.entries(chrome).filter(([name]) => name in (result.props ?? {}))) },
        data: { ...result.data, markupress: { ...shell, ...chrome } },
      };
    } } };
  };
  return { ...options,
    ...(options.pages ? { pages: options.pages.map(page => ({ ...page, layout: layout(page.layout) })) } : {}),
    ...(options.layouts ? { layouts: Object.fromEntries(Object.entries(options.layouts).map(([name, layer]) => [name, layout(layer)])) } : {}),
  };
}
