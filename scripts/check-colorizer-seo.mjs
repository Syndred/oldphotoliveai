import assert from "node:assert/strict";

// Run after `npm run build` and `npm run start -- --hostname localhost --port 43189`.
const origin = process.argv[2] || "http://localhost:43189";
const canonicalOrigin = "https://oldphotoliveai.com";
const headers = { "Accept-Language": "zh-CN", Cookie: "NEXT_LOCALE=zh" };

function firstCapture(match) {
  return match?.slice(1).find(Boolean);
}

function match(html, pattern, message) {
  const value = firstCapture(html.match(pattern))
    ?.replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  assert.ok(value, message);
  return value;
}

function canonicalFrom(html) {
  return match(
    html,
    /<link[^>]+rel="canonical"[^>]+href="([^"]+)"|<link[^>]+href="([^"]+)"[^>]+rel="canonical"/i,
    "canonical link missing"
  );
}

function normalizeUrl(url) {
  return url === `${canonicalOrigin}/` ? canonicalOrigin : url.replace(/\/$/, "");
}

function schemaTypes(html) {
  const types = [];
  for (const script of html.matchAll(
    /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  )) {
    const value = JSON.parse(script[1]);
    for (const node of Array.isArray(value) ? value : [value]) {
      if (node?.["@type"]) types.push(node["@type"]);
    }
  }
  return types;
}

const redirects = [
  ["/en", "/"],
  ["/colorize", "/colorize-old-photos"],
  ["/en/colorize", "/colorize-old-photos"],
  ["/zh/colorize", "/zh/colorize-old-photos"],
  ["/restore", "/restore-old-photos"],
  ["/en/restore", "/restore-old-photos"],
  ["/en/restore-old-photos", "/restore-old-photos"],
  ["/zh/restore", "/zh"],
  ["/animate-old-photos", "/animate"],
  ["/en/animate-old-photos", "/animate"],
  ["/zh/animate-old-photos", "/zh"],
  ["/zh/animate", "/zh"],
  ["/es/no-login", "/no-login"],
  ["/es/colorize-old-photos", "/colorize-old-photos"],
  ["/es/colorize", "/colorize-old-photos"],
  ["/ja/pricing", "/pricing"],
  ["/ja/animate-old-photos", "/animate"],
  ["/en/privacy", "/privacy"],
  ["/zh/blog/old-photo-scan", "/zh"],
  ["/zh/photo-restoration-cost", "/zh"],
  ["/zh/unknown-old-page", "/zh"],
  ["/zh/terms", "/terms"],
  ["/zh/privacy", "/privacy"],
];

for (const [from, to] of redirects) {
  const response = await fetch(`${origin}${from}?source=seo-check`, {
    redirect: "manual",
    headers,
  });
  assert.equal(response.status, 301, `${from} must be an exact permanent 301`);
  const location = new URL(response.headers.get("location"), origin);
  assert.equal(location.pathname, to, `${from} must point directly to ${to}`);
  assert.equal(location.search, "?source=seo-check", `${from} must preserve query strings`);

  const destination = await fetch(`${origin}${to}`, { redirect: "manual", headers });
  assert.equal(destination.status, 200, `${from} destination must be a direct 200`);
  console.log(`301 ${from} -> ${to} (query preserved; destination 200)`);
}

// Client-supplied next-intl headers must not bypass public canonical redirects.
for (const [from, to] of [["/en", "/"], ["/en/colorize", "/colorize-old-photos"], ["/en/pricing", "/pricing"]]) {
  const response = await fetch(`${origin}${from}?orderId=proof&session_id=cs-proof`, { redirect: "manual", headers: { ...headers, "x-next-intl-locale": "en" } });
  assert.equal(response.status, 301, `${from} must normalize even with a client intl header`);
  const location = new URL(response.headers.get("location"), origin);
  assert.equal(location.pathname, to);
  assert.equal(location.search, "?orderId=proof&session_id=cs-proof");
}

// Application migrations retain their path/query, then defer to normal auth.
for (const locale of ["es", "ja"]) {
  for (const path of ["/result/legacy-task", "/history", "/login", "/admin"]) {
    const response = await fetch(`${origin}/${locale}${path}?orderId=legacy&session_id=cs-return`, { redirect: "manual", headers });
    assert.equal(response.status, 301, `${locale}${path} must migrate permanently`);
    const location = new URL(response.headers.get("location"), origin);
    assert.equal(location.pathname, path);
    assert.equal(location.search, "?orderId=legacy&session_id=cs-return");
  }
}
for (const path of ["/zh/login", "/zh/admin"]) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual", headers });
  assert.equal(response.status, 200, `${path} must remain accessible`);
  assert.match(await response.text(), /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);
}
// A returning guest's existing result remains a Chinese application route.
const legacyResult = await fetch(`${origin}/zh/result/legacy-task`, { redirect: "manual", headers: { ...headers, Cookie: "NEXT_LOCALE=zh; opla_anon_visitor=seo-route-proof" } });
assert.equal(legacyResult.status, 200, "Chinese result route must survive public-page consolidation");
assert.match(await legacyResult.text(), /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);

const pageContracts = [
  {
    path: "/",
    title: "OldPhotoLive AI – AI Photo Restoration, Colorization & Animation",
    h1: "Restore, Colorize & Animate Old Photos with AI",
    description: /One photo from \$1\.99, watermark-free result, no subscription/,
    canonical: canonicalOrigin,
    hreflangs: ["en", "zh-Hans", "x-default"],
  },
  {
    path: "/colorize-old-photos",
    title: "Photo Colorization with AI – Colorize Black and White Photos Online | OldPhotoLive AI",
    h1: "Photo Colorization with AI",
    description: /watermark-free result with images up to 2K — \$1\.99 per photo, no subscription/,
    canonical: `${canonicalOrigin}/colorize-old-photos`,
    hreflangs: ["en", "zh-Hans", "x-default"],
  },
  {
    path: "/restore-old-photos",
    title: "Restore Old Photos Online – AI Photo Restoration | OldPhotoLive AI",
    h1: "Restore Old Photos with AI",
    description: /Restore old damaged photos online with AI/,
    canonical: `${canonicalOrigin}/restore-old-photos`,
    hreflangs: ["en", "x-default"],
  },
  {
    path: "/animate",
    title: "Animate Old Photos with AI – Online Photo Animation",
    h1: "Animate Old Photos with AI",
    description: /Animate old photos with AI.*\$1\.99 per photo.*no subscription/,
    canonical: `${canonicalOrigin}/animate`,
    hreflangs: ["en", "x-default"],
  },
  {
    path: "/bring-to-life",
    title: "Bring Old Photos to Life with AI | OldPhotoLive AI",
    h1: "Bring Old Photos to Life with AI",
    description: /Bring old photos to life with AI/,
    canonical: `${canonicalOrigin}/bring-to-life`,
    hreflangs: ["en", "x-default"],
  },
  {
    path: "/pricing",
    title: "Pricing – One Photo from $1.99, No Subscription | OldPhotoLive AI",
    h1: "Pay Once, Restore When You Need",
    description: /One photo from \$1\.99/,
    canonical: `${canonicalOrigin}/pricing`,
    hreflangs: ["en", "zh-Hans", "x-default"],
  },
  {
    path: "/zh",
    title: "老照片修复与上色 - OldPhotoLive AI",
    h1: "OldPhotoLive AI：在线修复、上色并动态化旧照片",
    description: /单张 \$1\.99/,
    canonical: `${canonicalOrigin}/zh`,
    hreflangs: ["en", "zh-Hans", "x-default"],
  },
  {
    path: "/zh/pricing",
    title: "价格 – 单张 $1.99，无需订阅 | OldPhotoLive AI",
    h1: "按需购买，用完再补",
    description: /单张 \$1\.99/,
    canonical: `${canonicalOrigin}/zh/pricing`,
    hreflangs: ["en", "zh-Hans", "x-default"],
  },
  {
    path: "/zh/colorize-old-photos",
    title: "AI 黑白照片上色 – 在线给老照片上色 | OldPhotoLive AI",
    h1: "用 AI 给黑白老照片上色",
    description: /\$1\.99/,
    canonical: `${canonicalOrigin}/zh/colorize-old-photos`,
    hreflangs: ["en", "zh-Hans", "x-default"],
  },
  {
    path: "/photo-restoration-cost",
    title: "Photo Restoration Cost – What You Pay for AI vs Manual Restoration | OldPhotoLive AI",
    h1: "What does photo restoration cost?",
    description: /manual studio quote/,
    canonical: `${canonicalOrigin}/photo-restoration-cost`,
    hreflangs: ["en", "x-default"],
  },
];

const pageHtml = new Map();
for (const contract of pageContracts) {
  const response = await fetch(`${origin}${contract.path}`, {
    redirect: "manual",
    headers,
  });
  assert.equal(response.status, 200, `${contract.path} must return 200`);
  const html = await response.text();
  pageHtml.set(contract.path, html);
  assert.equal(match(html, /<title[^>]*>([\s\S]*?)<\/title>/i, "title missing"), contract.title);
  assert.equal(match(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i, "H1 missing"), contract.h1);
  const description = match(
    html,
    /<meta[^>]+name="description"[^>]+content="([^"]+)"|<meta[^>]+content="([^"]+)"[^>]+name="description"/i,
    "meta description missing"
  );
  assert.match(description, contract.description);
  assert.equal(normalizeUrl(canonicalFrom(html)), normalizeUrl(contract.canonical));
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${contract.path} must have one H1`);
  assert.doesNotMatch(html, /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);
  assert.doesNotMatch(html, /free trial|free credits|daily free|free daily|無料で|無料プレビュー|免费额度|免费生成|gratis/i, `${contract.path} must not advertise free processing`);
  assert.doesNotMatch(html, /hrefLang="(?:es|ja)"/i, `${contract.path} must not advertise retired languages`);
  for (const lang of contract.hreflangs) {
    assert.match(html, new RegExp(`hrefLang="${lang}"`), `${contract.path} missing ${lang}`);
  }
  assert.doesNotMatch(html, /href="\/restore(?:[?#"])/, `${contract.path} links to legacy /restore`);
  assert.doesNotMatch(html, /href="\/en(?:\/|"|\?)/, `${contract.path} links to legacy /en`);
  assert.doesNotMatch(html, /href="\/zh\/(?:terms|privacy)(?:[?#"])/, `${contract.path} links to a redirected legal page`);
  console.log(`200 ${contract.path}: title, H1, description, canonical and hreflang verified`);
}

const repair = await fetch(`${origin}/repair-damaged-old-photos`, {
  redirect: "manual",
  headers,
});
assert.equal(repair.status, 200);
const repairHtml = await repair.text();
assert.match(repairHtml, /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);
assert.equal(
  normalizeUrl(canonicalFrom(repairHtml)),
  `${canonicalOrigin}/repair-damaged-old-photos`
);
assert.doesNotMatch(repairHtml, /hrefLang=/, "noindex repair page must not join hreflang clusters");

for (const path of ["/no-login", "/animate-free", "/to-video"]) {
  const response = await fetch(`${origin}${path}`, {
    redirect: "manual",
    headers,
  });
  assert.equal(response.status, 200, `${path} must remain accessible`);
  const html = await response.text();
  assert.match(
    html,
    /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i,
    `${path} must be noindex`
  );
  assert.equal(
    normalizeUrl(canonicalFrom(html)),
    `${canonicalOrigin}${path}`,
    `${path} must keep its self-canonical`
  );
}

const expectedSchemas = new Map([
  ["/", ["Organization", "WebSite", "WebApplication", "FAQPage"]],
  ["/colorize-old-photos", ["Organization", "WebSite", "BreadcrumbList", "FAQPage", "SoftwareApplication"]],
  ["/restore-old-photos", ["Organization", "WebSite", "BreadcrumbList", "FAQPage", "SoftwareApplication"]],
  ["/animate", ["Organization", "WebSite", "BreadcrumbList", "WebApplication"]],
  ["/bring-to-life", ["Organization", "WebSite", "BreadcrumbList", "WebPage"]],
  ["/photo-restoration-cost", ["Organization", "WebSite", "Article", "BreadcrumbList", "FAQPage"]],
]);

for (const [path, expected] of expectedSchemas) {
  const actual = schemaTypes(pageHtml.get(path)).sort();
  assert.deepEqual(actual, [...expected].sort(), `${path} schema types must be unique and intentional`);
}
assert.match(pageHtml.get("/bring-to-life"), /href="\/animate"/);
assert.match(pageHtml.get("/animate"), /href="\/restore-old-photos"/);
assert.match(pageHtml.get("/animate"), /href="\/colorize-old-photos"/);
assert.match(pageHtml.get("/pricing"), /href="\/photo-restoration-cost"/, "cost guide must have an incoming internal link");
assert.match(pageHtml.get("/colorize-old-photos"), /2048/);
assert.match(pageHtml.get("/colorize-old-photos"), /10 MB/);
assert.match(pageHtml.get("/colorize-old-photos"), /at no extra cost/);
assert.doesNotMatch(pageHtml.get("/colorize-old-photos"), /<img[^>]+alt=""/i, "comparison images must have descriptive alt text");

const robotsResponse = await fetch(`${origin}/robots.txt`);
assert.equal(robotsResponse.status, 200);
const robots = await robotsResponse.text();
assert.doesNotMatch(robots, /Disallow:\s*\/(?:en|es)(?:\/|\s|$)/i);
assert.match(robots, /Sitemap:\s*https:\/\/oldphotoliveai\.com\/sitemap\.xml/i);

const sitemapResponse = await fetch(`${origin}/sitemap.xml`);
assert.equal(sitemapResponse.status, 200);
const sitemap = await sitemapResponse.text();
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.ok(sitemapUrls.length > 5, "sitemap must contain the complete canonical inventory");
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, "sitemap URLs must be unique");
for (const forbidden of [
  `${canonicalOrigin}/restore`,
  `${canonicalOrigin}/animate-old-photos`,
  `${canonicalOrigin}/repair-damaged-old-photos`,
  `${canonicalOrigin}/no-login`,
  `${canonicalOrigin}/animate-free`,
  `${canonicalOrigin}/to-video`,
]) {
  assert.ok(!sitemapUrls.includes(forbidden), `sitemap must exclude ${forbidden}`);
}
assert.ok(!sitemapUrls.some((url) => /\/(en|es|ja)(?:\/|$)/.test(new URL(url).pathname)), "sitemap must exclude migrated language URLs");
assert.deepEqual(sitemapUrls.filter(url => new URL(url).pathname.startsWith("/zh")).sort(), [
  `${canonicalOrigin}/zh`, `${canonicalOrigin}/zh/pricing`, `${canonicalOrigin}/zh/colorize-old-photos`,
].sort(), "Chinese sitemap must include only three maintained pages");
assert.ok(sitemapUrls.includes(`${canonicalOrigin}/photo-restoration-cost`));
for (const href of [...sitemap.matchAll(/<xhtml:link[^>]+href="([^"]+)"/g)].map(match => match[1])) {
  assert.ok(!/\/(en|es|ja)(?:\/|$)/.test(new URL(href).pathname), `hreflang must not point to migrated ${href}`);
  assert.ok(!new URL(href).pathname.startsWith("/zh/") || ["/zh/pricing", "/zh/colorize-old-photos"].includes(new URL(href).pathname), `hreflang must not point to secondary Chinese ${href}`);
}

for (const url of sitemapUrls) {
  const path = new URL(url).pathname;
  const response = await fetch(`${origin}${path}`, { redirect: "manual", headers });
  assert.equal(response.status, 200, `${url} in sitemap must return 200`);
  const html = await response.text();
  assert.doesNotMatch(html, /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i, `${url} must be indexable`);
  assert.equal(normalizeUrl(canonicalFrom(html)), normalizeUrl(url), `${url} must be self-canonical`);
}

console.log(`Sitemap verified: ${sitemapUrls.length} unique, indexable, self-canonical 200 URLs.`);
console.log("All SEO production smoke checks passed.");
