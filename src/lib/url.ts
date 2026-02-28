/**
 * Convert an R2 storage key to a full CDN URL.
 * Handles cases where NEXT_PUBLIC_R2_DOMAIN already includes the protocol prefix.
 */
export function buildCdnUrl(key: string): string {
  const domain = (process.env.NEXT_PUBLIC_R2_DOMAIN ?? "").replace(/\/+$/, "");
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  if (domain.startsWith("http://") || domain.startsWith("https://")) {
    return `${domain}/${encodedKey}`;
  }
  return `https://${domain}/${encodedKey}`;
}
