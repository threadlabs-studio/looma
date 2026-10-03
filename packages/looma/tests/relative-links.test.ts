import { describe, expect, it } from 'vitest';
import { siteRelativeHref } from '../src/editor/extensions/relative-links';

describe('site-relative links', () => {
  it('keeps paths, queries, and fragments on the supplied origin', () => {
    expect(siteRelativeHref('https://docs.example.test/team/page?q=one#part', 'https://docs.example.test')).toBe('/team/page?q=one#part');
    expect(siteRelativeHref('//docs.example.test/team', 'https://docs.example.test')).toBe('/team');
  });
  it('preserves other origins, credentials, non-web schemes, and already relative links', () => {
    for (const href of ['https://other.example.test/page', 'http://docs.example.test/page', 'https://docs.example.test:8443/page', 'https://docs.example.test.evil.test/page', 'https://user:pass@docs.example.test/page', 'mailto:hello@example.test', 'tel:123', '#part', '?q=one', '/team/page', '../page']) {
      expect(siteRelativeHref(href, 'https://docs.example.test')).toBe(href);
    }
  });
  it('leaves links intact when the base cannot be used', () => {
    expect(siteRelativeHref('https://docs.example.test/page', '')).toBe('https://docs.example.test/page');
    expect(siteRelativeHref('https://docs.example.test/page', 'mailto:hello@example.test')).toBe('https://docs.example.test/page');
  });
});
