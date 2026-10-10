import { LEGACY_REDIRECTS } from "@/config/redirects.cjs";

describe("legacy language redirects", () => {
  it("redirects explicit aliases before generic locale fallbacks", () => {
    expect(LEGACY_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/en/animate-old-photos",
          destination: "/animate",
          statusCode: 301,
        }),
        expect.objectContaining({
          source: "/en/restore",
          destination: "/restore-old-photos",
          statusCode: 301,
        }),
        expect.objectContaining({
          source: "/en/:path*",
          destination: "/:path*",
          statusCode: 301,
        }),
      ])
    );
  });
});
