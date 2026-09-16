const LEGACY_REDIRECTS = [
  { source: "/en/animate", destination: "/animate", statusCode: 301 },
  { source: "/en/animate-old-photos", destination: "/animate", statusCode: 301 },
  { source: "/en/colorize", destination: "/colorize-old-photos", statusCode: 301 },
  { source: "/en/colorize-old-photos", destination: "/colorize-old-photos", statusCode: 301 },
  { source: "/en/restore", destination: "/restore-old-photos", statusCode: 301 },
  { source: "/en/restore-old-photos", destination: "/restore-old-photos", statusCode: 301 },
  { source: "/en/bring-to-life", destination: "/bring-to-life", statusCode: 301 },
  { source: "/en/about", destination: "/about", statusCode: 301 },
  { source: "/en/pricing", destination: "/pricing", statusCode: 301 },
  { source: "/en/repair-damaged-old-photos", destination: "/repair-damaged-old-photos", statusCode: 301 },
  { source: "/en/:path*", destination: "/:path*", statusCode: 301 },
];

module.exports = { LEGACY_REDIRECTS };
