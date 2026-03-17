export function getRateLimitBucket(
  pathname: string,
  method: string
): string {
  if (pathname.startsWith("/api/upload")) {
    return "upload";
  }

  if (pathname === "/api/quota") {
    return "quota";
  }

  if (pathname.startsWith("/api/history")) {
    return method === "DELETE" ? "history:delete" : "history:read";
  }

  if (pathname.startsWith("/api/stripe/checkout")) {
    return "stripe:checkout";
  }

  if (pathname.startsWith("/api/stripe/portal")) {
    return "stripe:portal";
  }

  if (pathname.startsWith("/api/stripe/subscription")) {
    return "stripe:subscription";
  }

  if (pathname === "/api/tasks") {
    return method === "POST" ? "tasks:create" : "tasks";
  }

  if (pathname.startsWith("/api/tasks/")) {
    if (pathname.endsWith("/stream")) {
      return "tasks:stream";
    }

    if (pathname.endsWith("/status")) {
      return "tasks:status";
    }

    if (pathname.endsWith("/cancel")) {
      return "tasks:cancel";
    }

    if (pathname.endsWith("/retry")) {
      return "tasks:retry";
    }

    return "tasks:item";
  }

  return pathname;
}
