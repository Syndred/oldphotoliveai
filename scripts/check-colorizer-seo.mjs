import assert from 'node:assert/strict';

// Run after `npm run build` and `npm run start -- --hostname localhost --port 43189`.
const origin = process.argv[2] || 'http://localhost:43189';
const headers = { 'Accept-Language': 'zh-CN', Cookie: 'NEXT_LOCALE=zh' };
for (const path of ['/animate', '/animate-free', '/bring-to-life', '/to-video']) {
  const alias = await fetch(`${origin}/en${path}`, { redirect: 'manual' });
  assert.equal(alias.status, 301);
  assert.equal(new URL(alias.headers.get('location'), origin).pathname, path);
  const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes(`rel="canonical" href="https://oldphotoliveai.com${path}"`));
  assert.doesNotMatch(html, /rel="canonical" href="https:\/\/oldphotoliveai.com\/en/);
  console.log(`200 ${path}: canonical points to final English URL`);
}
for (const [from, to] of [
  ['/en', '/'],
  ['/colorize', '/colorize-old-photos'],
  ['/en/colorize', '/colorize-old-photos'],
  ['/en/colorize-old-photos', '/colorize-old-photos'],
  ['/zh/colorize', '/zh/colorize-old-photos'],
]) {
  const response = await fetch(`${origin}${from}?source=seo-check`, { redirect: 'manual', headers });
  assert.equal(response.status, 301, from);
  const location = new URL(response.headers.get('location'), origin);
  assert.equal(location.pathname, to);
  assert.equal(location.search, '?source=seo-check');
  console.log(`301 ${from} -> ${to} (query preserved)`);
}
for (const locale of ['en', 'zh', 'es', 'ja']) {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  for (const suffix of ['', '/colorize-old-photos']) {
    const path = `${prefix}${suffix}` || '/';
    const response = await fetch(`${origin}${path}`, { redirect: 'manual', headers });
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`));
    assert.ok(html.includes(`rel="canonical" href="https://oldphotoliveai.com${path === "/" ? "" : path}"`), path);
    assert.ok(html.includes(`hrefLang="zh-Hans" href="https://oldphotoliveai.com/zh${suffix}"`), path);
    if (path === '/') {
      assert.ok(html.includes('<title>AI Photo Colorizer - Colorize Old Photos Online Free</title>'));
      assert.match(html, /<h1[^>]*>Colorize Old Photos with AI<\/h1>/);
      assert.equal((html.match(/<h1\b/g) || []).length, 1);
    }
    if (path === '/colorize-old-photos') {
      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
      assert.ok(description?.includes('Sign in to try your daily free quota'));
      assert.doesNotMatch(description, /no signup/i);
    }
    console.log(`200 ${path}: language, canonical and hreflang verified`);
  }
}
const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
assert.ok(sitemap.includes('<loc>https://oldphotoliveai.com/colorize-old-photos</loc>'));
assert.doesNotMatch(sitemap, /https:\/\/oldphotoliveai.com\/en(?:\/|["<])/);
assert.doesNotMatch(sitemap, /https:\/\/oldphotoliveai.com(?:\/zh|\/es|\/ja)?\/colorize["<]/);
console.log('Sitemap contains canonical URLs only; all SEO smoke checks passed.');
