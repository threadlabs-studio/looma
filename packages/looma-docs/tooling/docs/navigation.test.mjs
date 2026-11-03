import assert from 'node:assert/strict';
import test from 'node:test';
import { orderNavigation } from './navigation.mjs';

for (const prefix of ['/system/', '/system/v/current/', '/system/v/0.44/']) {
  test(`configured navigation leads generated sections at ${prefix}`, async () => {
    const links = [
      { label: 'Components', href: prefix + 'components/', current: 'true' },
      { label: 'Editor', href: prefix + 'editor/', current: 'false' },
      { label: 'Get started', href: prefix + 'getting-started/', current: 'false' },
      { label: 'Customize', href: prefix + 'customize/', current: 'false' },
      { label: 'GitHub', href: 'https://github.com/threadlabs-studio/looma', current: 'false' },
    ];
    const result = { props: { nav: links, title: 'Looma' }, data: { markupress: { nav: links }, other: 'preserved' }, head: { lang: 'en' } };
    const layer = { component: 'shell.html', server: { load: async () => result } };
    const ordering = { base: '/system/', nav: [
      { href: '/getting-started/', position: 'start' },
      { href: '/customize/' }, { href: 'https://github.com/threadlabs-studio/looma' },
    ] };
    const config = orderNavigation({ pages: [{ dir: 'docs', layout: layer }], layouts: { home: layer } }, ordering);
    assert.equal(config.pages.length, 1);
    for (const wrapped of [config.pages[0].layout, config.layouts.home]) {
      const loaded = await wrapped.server.load({});
      assert.deepEqual(loaded.props.nav.map(link => link.label), ['Get started', 'Components', 'Editor', 'Customize', 'GitHub']);
      assert.equal(loaded.props.nav[1].current, 'true');
      assert.equal(loaded.data.markupress.nav, loaded.props.nav);
      assert.equal(loaded.props.title, 'Looma');
      assert.deepEqual(loaded.head, { lang: 'en' });
      assert.equal(loaded.data.other, 'preserved');
    }
    assert.equal(result.props.nav.length, 5);
  });
}

test('leaves unrelated layouts and loader output alone', async () => {
  const result = { props: { title: 'Other page' } };
  const config = orderNavigation({ pages: [
    { dir: 'named', layout: 'other' },
    { dir: 'inline', layout: { server: { load: async () => result } } },
  ] }, { base: '/', nav: [] });
  assert.equal(config.pages[0].layout, 'other');
  assert.equal(await config.pages[1].layout.server.load({}), result);
});


test('ordinary configured links retain their position after generated sections', async () => {
  const nav = [{ href: '/system/components/' }, { href: '/system/customize/' }];
  const layer = { server: { load: async () => ({ props: { nav }, data: { markupress: { nav } } }) } };
  const config = orderNavigation({ layouts: { home: layer } }, { base: '/system/', nav: [{ href: '/customize/' }] });
  assert.deepEqual((await config.layouts.home.server.load({})).props.nav, nav);
});

test('guide navigation starts with onboarding and keeps section links in the main navigation', async () => {
  const nav = ['components', 'editor', 'getting-started', 'customize'].map(name => ({ href: `/looma/${name}/` }));
  const sidebar = [
    { label: 'Components', href: '/looma/components/', children: [] },
    { label: 'Foundations', href: '/looma/tokens/', children: [] },
    { label: 'Create your design system', href: '/looma/design-system/', children: [{ label: 'Theme your system', href: '/looma/theme-your-system/', children: [] }] },
    { label: 'Getting Started', href: '/looma/getting-started/', children: [] },
    { label: 'Customize', href: '/looma/customize/', children: [] },
    { label: 'Editor', href: '/looma/editor/', children: [] },
  ];
  const layer = { server: { load: async () => ({ data: { markupress: { nav, sidebar } } }) } };
  const options = orderNavigation({ layouts: { docs: layer } }, { base: '/looma/' });
  const shell = (await options.layouts.docs.server.load({})).data.markupress;
  assert.deepEqual(shell.sidebar.map(node => node.label), ['Getting Started', 'Create your design system', 'Foundations']);
  assert.equal(shell.sidebar[1].children[0].label, 'Theme your system');
  assert.deepEqual(shell.nav, nav);
  assert.equal(sidebar.length, 6, 'the source navigation is not mutated');
});

test('guides use native route groups as disclosures while component navigation stays sectional', async () => {
  const nav = [];
  const overview = { label: 'Create your design system', href: '/system/v/0.44/design-system/', current: 'page', children: [] };
  const theme = { label: 'Theme your system', href: '/system/v/0.44/theme-your-system/', current: 'false', children: [] };
  const foundations = { label: 'Foundations', open: false, children: [{ label: 'Tokens', href: '/system/v/0.44/tokens/', current: 'false', children: [] }] };
  const sidebar = [overview, foundations];
  const layer = { server: { load: async () => ({ props: { sidebar, sidebarNavigation: 'sections' }, data: { markupress: { nav, sidebar, sidebarNavigation: 'sections', home: '/system/v/0.44/' } } }) } };
  const options = orderNavigation({ layouts: { docs: layer } }, { base: '/system/' });
  const loaded = await options.layouts.docs.server.load({ url: new URL('https://example.com/system/v/0.44/design-system/'), navigationTree: async query => {
    assert.deepEqual(query, { from: '/v/0.44/', current: '/system/v/0.44/design-system/' });
    return [{ label: 'Create your design system', open: true, children: [overview, theme] }, foundations];
  } });
  assert.equal(loaded.props.sidebarNavigation, 'tree');
  assert.equal(loaded.props.sidebar, loaded.data.markupress.sidebar);
  assert.equal(loaded.props.sidebar[0].href, overview.href);
  assert.deepEqual(loaded.props.sidebar[0].children, [theme]);
  assert.deepEqual(loaded.props.sidebar[1], foundations);
});
