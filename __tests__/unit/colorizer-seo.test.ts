import { localizePathname, routing } from '@/i18n/routing';
import { buildLocalizedPageMetadata } from '@/lib/seo';
import sitemap from '@/app/sitemap';

describe('canonical colorizer URLs', () => {
  it('keeps English unprefixed and translated pages addressable', () => {
    expect(localizePathname('en', '/')).toBe('/');
    expect(localizePathname('en', '/colorize-old-photos')).toBe('/colorize-old-photos');
    expect(localizePathname('zh', '/colorize-old-photos')).toBe('/zh/colorize-old-photos');
    expect(routing.localeDetection).toBe(false);
  });
  it('publishes the canonical English URL without indexable language alternates', () => {
    const metadata = buildLocalizedPageMetadata({ locale: 'en', path: '/colorize-old-photos', title: 'Colorizer', description: 'Colorize photos' });
    expect(metadata.alternates?.canonical).toBe('/colorize-old-photos');
    expect(metadata.alternates?.languages).toBeUndefined();
    const urls = sitemap().map(entry => entry.url);
    expect(urls).not.toContain('https://oldphotoliveai.com/colorize-old-photos');
    expect(urls.some(url => /\/en(?:\/|$)|\/colorize$/.test(url))).toBe(false);
  });
});
