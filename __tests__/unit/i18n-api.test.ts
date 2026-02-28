// Unit tests for src/lib/i18n-api.ts
// Tests getRequestLocale() and getErrorMessage()

import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

// ── Helpers ─────────────────────────────────────────────────────────────────

function createRequest(opts: {
  cookie?: string;
  acceptLanguage?: string;
} = {}): Request {
  const headers = new Headers();
  if (opts.cookie) headers.set("Cookie", opts.cookie);
  if (opts.acceptLanguage) headers.set("Accept-Language", opts.acceptLanguage);
  return new Request("http://localhost/api/test", { headers });
}

// ── getRequestLocale ────────────────────────────────────────────────────────

describe("getRequestLocale", () => {
  it("returns 'en' as default when no cookie or Accept-Language", () => {
    const req = createRequest();
    expect(getRequestLocale(req)).toBe("en");
  });

  it("returns locale from NEXT_LOCALE cookie", () => {
    const req = createRequest({ cookie: "NEXT_LOCALE=zh" });
    expect(getRequestLocale(req)).toBe("zh");
  });

  it("returns locale from NEXT_LOCALE cookie when multiple cookies present", () => {
    const req = createRequest({ cookie: "other=value; NEXT_LOCALE=zh; foo=bar" });
    expect(getRequestLocale(req)).toBe("zh");
  });

  it("returns locale from Accept-Language when no cookie", () => {
    const req = createRequest({ acceptLanguage: "zh-CN,zh;q=0.9,en;q=0.8" });
    expect(getRequestLocale(req)).toBe("zh");
  });

  it("returns en from Accept-Language header", () => {
    const req = createRequest({ acceptLanguage: "en-US,en;q=0.9" });
    expect(getRequestLocale(req)).toBe("en");
  });

  it("cookie takes priority over Accept-Language", () => {
    const req = createRequest({
      cookie: "NEXT_LOCALE=en",
      acceptLanguage: "zh-CN,zh;q=0.9",
    });
    expect(getRequestLocale(req)).toBe("en");
  });

  it("falls back to default for unsupported cookie locale", () => {
    const req = createRequest({ cookie: "NEXT_LOCALE=fr" });
    expect(getRequestLocale(req)).toBe("en");
  });

  it("falls back to default for unsupported Accept-Language", () => {
    const req = createRequest({ acceptLanguage: "fr-FR,de;q=0.9" });
    expect(getRequestLocale(req)).toBe("en");
  });

  it("handles Accept-Language with prefix match", () => {
    const req = createRequest({ acceptLanguage: "zh-TW;q=0.9" });
    expect(getRequestLocale(req)).toBe("zh");
  });
});

// ── getErrorMessage ─────────────────────────────────────────────────────────

describe("getErrorMessage", () => {
  it("returns English error message for en locale", () => {
    expect(getErrorMessage("taskNotFound", "en")).toBe("Task not found");
  });

  it("returns Chinese error message for zh locale", () => {
    expect(getErrorMessage("taskNotFound", "zh")).toBe("未找到该任务");
  });

  it("returns English fileTypeNotSupported message", () => {
    expect(getErrorMessage("fileTypeNotSupported", "en")).toBe(
      "Please upload a JPEG, PNG, or WebP image"
    );
  });

  it("returns Chinese fileTypeNotSupported message", () => {
    expect(getErrorMessage("fileTypeNotSupported", "zh")).toBe(
      "请上传 JPEG、PNG 或 WebP 格式的图片"
    );
  });

  it("interpolates params in error message", () => {
    const msg = getErrorMessage("paymentFailed", "en", { reason: "Card declined" });
    expect(msg).toBe("Payment failed: Card declined");
  });

  it("interpolates params in Chinese error message", () => {
    const msg = getErrorMessage("paymentFailed", "zh", { reason: "卡被拒绝" });
    expect(msg).toBe("支付失败：卡被拒绝");
  });

  it("returns the key itself when translation is missing", () => {
    expect(getErrorMessage("nonExistentKey", "en")).toBe("nonExistentKey");
  });

  it("returns all known error keys for en locale", () => {
    const keys = [
      "fileTypeNotSupported", "fileTooLarge", "uploadFailed",
      "uploadStorageConfigError", "uploadStorageAuthError",
      "uploadStorageBucketMissing", "uploadStorageNetworkError",
      "uploadSupportHint",
      "quotaExceeded", "creditsExpired", "rateLimited",
      "taskNotFound", "cannotCancel", "unauthorized",
      "checkoutFailed", "retryFailed", "historyLoadFailed",
      "taskCreateFailed", "sourceImageUnreachable",
      "modelConfigError", "intermediateDownloadFailed",
    ];
    for (const key of keys) {
      const msg = getErrorMessage(key, "en");
      expect(msg).not.toBe(key); // should have a real translation
    }
  });

  it("returns all known error keys for zh locale", () => {
    const keys = [
      "fileTypeNotSupported", "fileTooLarge", "uploadFailed",
      "uploadStorageConfigError", "uploadStorageAuthError",
      "uploadStorageBucketMissing", "uploadStorageNetworkError",
      "uploadSupportHint",
      "quotaExceeded", "creditsExpired", "rateLimited",
      "taskNotFound", "cannotCancel", "unauthorized",
      "checkoutFailed", "retryFailed", "historyLoadFailed",
      "taskCreateFailed", "sourceImageUnreachable",
      "modelConfigError", "intermediateDownloadFailed",
    ];
    for (const key of keys) {
      const msg = getErrorMessage(key, "zh");
      expect(msg).not.toBe(key); // should have a real translation
    }
  });
});
