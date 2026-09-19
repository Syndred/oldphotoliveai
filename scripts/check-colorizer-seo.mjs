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
  ["/zh/restore", "/zh/restore-old-photos"],
  ["/animate-old-photos", "/animate"],
  ["/en/animate-old-photos", "/animate"],
  ["/zh/animate-old-photos", "/animate"],
  ["/zh/animate", "/animate"],
  ["/es/no-login", "/no-login"],
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

const pageContracts = [
  {
    path: "/",
    title: "Colorize Photo Online Free – AI Photo Colorizer",
    h1: "Colorize Photos with AI",
    description: /daily free account quota/,
    canonical: canonicalOrigin,
    hreflangs: ["en", "zh-Hans", "es", "ja", "x-default"],
  },
  {
    path: "/colorize-old-photos",
    title: "Colorize Old Photos Online Free – AI Old Photo Colorizer | OldPhotoLive AI",
    h1: "Colorize Old Photos with AI",
    description: /daily free quota/,
    canonical: `${canonicalOrigin}/colorize-old-photos`,
    hreflangs: ["en", "zh-Hans", "es", "ja", "x-default"],
  },
  {
    path: "/restore-old-photos",
    title: "Restore Old Photos Online Free – AI Photo Restoration | OldPhotoLive AI",
    h1: "Restore Old Photos with AI",
    description: /Restore old damaged photos online with AI/,
    canonical: `${canonicalOrigin}/restore-old-photos`,
    hreflangs: ["en", "zh-Hans", "es", "ja", "x-default"],
  },
  {
    path: "/animate",
    title: "Animate Old Photos with AI – Online Photo Animation",
    h1: "Animate Old Photos with AI",
    description: /daily free quota/,
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
    path: "/to-video",
    title: "Photo to Video AI for Old Photos | OldPhotoLive AI",
    h1: "Turn an Old Photo into Video with AI",
    description: /photo to video AI/,
    canonical: `${canonicalOrigin}/to-video`,
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
  for (const lang of contract.hreflangs) {
    assert.match(html, new RegExp(`hrefLang="${lang}"`), `${contract.path} missing ${lang}`);
  }
  assert.doesNotMatch(html, /href="\/restore(?:[?#"])/, `${contract.path} links to legacy /restore`);
  assert.doesNotMatch(html, /href="\/en(?:\/|"|\?)/, `${contract.path} links to legacy /en`);
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

const expectedSchemas = new Map([
  ["/", ["Organization", "WebSite", "WebApplication", "FAQPage"]],
  ["/colorize-old-photos", ["Organization", "WebSite", "BreadcrumbList", "FAQPage", "SoftwareApplication"]],
  ["/restore-old-photos", ["Organization", "WebSite", "BreadcrumbList", "FAQPage", "SoftwareApplication"]],
  ["/animate", ["Organization", "WebSite", "BreadcrumbList", "WebApplication"]],
  ["/bring-to-life", ["Organization", "WebSite", "BreadcrumbList", "WebPage"]],
  ["/to-video", ["Organization", "WebSite", "BreadcrumbList", "WebApplication"]],
]);

for (const [path, expected] of expectedSchemas) {
  const actual = schemaTypes(pageHtml.get(path)).sort();
  assert.deepEqual(actual, [...expected].sort(), `${path} schema types must be unique and intentional`);
}
assert.match(pageHtml.get("/bring-to-life"), /href="\/animate"/);
assert.match(pageHtml.get("/animate"), /href="\/restore-old-photos"/);
assert.match(pageHtml.get("/animate"), /href="\/colorize-old-photos"/);

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
]) {
  assert.ok(!sitemapUrls.includes(forbidden), `sitemap must exclude ${forbidden}`);
}
assert.ok(!sitemapUrls.some((url) => /\/en(?:\/|$)/.test(url)), "sitemap must exclude /en aliases");

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
