import { localizePathname, routing } from '@/i18n/routing';
import { buildLocalizedPageMetadata } from '@/lib/seo';
import sitemap from '@/app/sitemap';
import { getToolPage, getToolPagePath } from '@/content/tool-pages';

describe('canonical colorizer URLs', () => {
  it('keeps English unprefixed and translated pages addressable', () => {
    expect(localizePathname('en', '/')).toBe('/');
    expect(localizePathname('en', '/colorize-old-photos')).toBe('/colorize-old-photos');
    expect(localizePathname('zh', '/colorize-old-photos')).toBe('/zh/colorize-old-photos');
    expect(routing.localeDetection).toBe(false);
  });
  it('publishes the canonical English URL with indexable language alternates', () => {
    const metadata = buildLocalizedPageMetadata({ locale: 'en', path: '/colorize-old-photos', title: 'Colorizer', description: 'Colorize photos' });
    expect(metadata.alternates?.canonical).toBe('/colorize-old-photos');
    expect(metadata.alternates?.languages?.en).toBe('https://oldphotoliveai.com/colorize-old-photos');
    const urls = sitemap().map(entry => entry.url);
    expect(urls).toContain('https://oldphotoliveai.com/colorize-old-photos');
    expect(urls.some(url => /\/en(?:\/|$)|\/colorize$/.test(url))).toBe(false);
  });
  it('locks keyword ownership and the restoration final URL', () => {
    const colorizer = getToolPage('en', 'colorize-old-photos');
    const restoration = getToolPage('en', 'restore-old-photos');

    expect(colorizer.title).toBe('Photo Colorization with AI – Colorize Black and White Photos Online');
    expect(colorizer.heroTitle).toBe('Photo Colorization with AI');
    expect(colorizer.keywords).toContain('old photo colorizer');
    expect(getToolPagePath('restore-old-photos')).toBe('/restore-old-photos');
    expect(restoration.heroTitle).toBe('Restore Old Photos with AI');
  });

  it('avoids unsupported output promises and duplicated payment answers', () => {
    for (const locale of ['en', 'zh'] as const) {
      const colorizer = getToolPage(locale, 'colorize-old-photos');
      expect(new Set(colorizer.faqs.map(item => item.answer)).size).toBe(colorizer.faqs.length);
      expect(colorizer.description).not.toMatch(/full-resolution|无限|原始分辨率/i);
      expect(colorizer.keywords.join(' ')).not.toMatch(/\bfree\b|免费/i);
      expect(colorizer.faqs.map(item => item.answer).filter(answer => answer.includes('$1.99'))).toHaveLength(0);
    }
  });
});
