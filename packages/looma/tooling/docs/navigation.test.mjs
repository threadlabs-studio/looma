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
