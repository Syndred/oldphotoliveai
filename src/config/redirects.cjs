// Public content migrations stay permanent and resolve aliases in one hop.
// Payment/history destinations preserve their full path and query string.
// Chinese application routes remain available for existing users.
const ALIASES = {
  colorize: "colorize-old-photos",
  restore: "restore-old-photos",
  "animate-old-photos": "animate",
};

const PUBLIC_REDIRECTS = [
  ...["en", "es", "ja"].flatMap((locale) => [
    ...Object.entries(ALIASES).map(([source, destination]) => ({
      source: `/${locale}/${source}`,
      destination: `/${destination}`,
      statusCode: 301,
      ...(locale === "en" ? { missing: [{ type: "header", key: "x-next-intl-locale" }] } : {}),
    })),
    {
      source: `/${locale}`,
      destination: "/",
      statusCode: 301,
      ...(locale === "en" ? { missing: [{ type: "header", key: "x-next-intl-locale" }] } : {}),
    },
    {
      source: `/${locale}/:path*`,
      destination: "/:path*",
      statusCode: 301,
      // next-intl internally rewrites unprefixed English pages to /en/... .
      // Redirecting that rewrite would loop back to the original public URL.
      // Real /en requests still normalize in middleware even with this header.
      ...(locale === "en" ? { missing: [{ type: "header", key: "x-next-intl-locale" }] } : {}),
    },
  ]),
  { source: "/colorize", destination: "/colorize-old-photos", statusCode: 301 },
  { source: "/restore", destination: "/restore-old-photos", statusCode: 301 },
  { source: "/animate-old-photos", destination: "/animate", statusCode: 301 },
  { source: "/zh/colorize", destination: "/zh/colorize-old-photos", statusCode: 301 },
  { source: "/zh/privacy", destination: "/privacy", statusCode: 301 },
  { source: "/zh/terms", destination: "/terms", statusCode: 301 },
  {
    source: "/zh/:path((?!pricing/?$|colorize-old-photos/?$|result(?:/|$)|history(?:/|$)|login(?:/|$)|admin(?:/|$)).*)",
    destination: "/zh",
    statusCode: 301,
  },
];

// Next uses strict source matching: explicitly cover slash-suffixed legacy URLs
// before the generic locale migration so aliases still reach their final URL.
const LEGACY_REDIRECTS = [
  ...PUBLIC_REDIRECTS.flatMap((rule) => [
    rule,
    { ...rule, source: `${rule.source}/` },
  ]),
  // Keep static-file slash normalization in Next's configuration layer. Next's
  // middleware invokes its matcher again after stripping the slash, so a
  // slash-only middleware matcher cannot handle normally excluded files.
  {
    source: "/:file((?:[^/]+/)*[^/]+\\.[^/]+)/",
    destination: "/:file",
    statusCode: 308,
  },
];

module.exports = { LEGACY_REDIRECTS };
