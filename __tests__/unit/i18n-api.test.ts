import { getErrorMessage, getRequestLocale } from "@/lib/i18n-api";

function createRequest(opts: {
  cookie?: string;
  acceptLanguage?: string;
} = {}): Request {
  const headers = new Headers();
  if (opts.cookie) headers.set("Cookie", opts.cookie);
  if (opts.acceptLanguage) headers.set("Accept-Language", opts.acceptLanguage);
  return new Request("http://localhost/api/test", { headers });
}

describe("getRequestLocale", () => {
  it("returns en as default when no cookie or Accept-Language exists", () => {
    expect(getRequestLocale(createRequest())).toBe("en");
  });

  it("returns locale from NEXT_LOCALE cookie", () => {
    expect(getRequestLocale(createRequest({ cookie: "NEXT_LOCALE=zh" }))).toBe("zh");
    expect(getRequestLocale(createRequest({ cookie: "NEXT_LOCALE=ja" }))).toBe("ja");
  });

  it("returns locale from NEXT_LOCALE cookie when multiple cookies are present", () => {
    const req = createRequest({ cookie: "foo=bar; NEXT_LOCALE=es; other=value" });
    expect(getRequestLocale(req)).toBe("es");
  });

  it("returns locale from Accept-Language when no cookie exists", () => {
    expect(
      getRequestLocale(
        createRequest({ acceptLanguage: "zh-CN,zh;q=0.9,en;q=0.8" })
      )
    ).toBe("zh");
    expect(
      getRequestLocale(
        createRequest({ acceptLanguage: "es-ES,es;q=0.9,en;q=0.8" })
      )
    ).toBe("es");
    expect(
      getRequestLocale(
        createRequest({ acceptLanguage: "ja-JP,ja;q=0.9,en;q=0.8" })
      )
    ).toBe("ja");
  });

  it("gives cookie precedence over Accept-Language", () => {
    const req = createRequest({
      cookie: "NEXT_LOCALE=en",
      acceptLanguage: "ja-JP,ja;q=0.9",
    });
    expect(getRequestLocale(req)).toBe("en");
  });

  it("falls back to default for unsupported locales", () => {
    expect(getRequestLocale(createRequest({ cookie: "NEXT_LOCALE=fr" }))).toBe("en");
    expect(
      getRequestLocale(createRequest({ acceptLanguage: "fr-FR,de;q=0.9" }))
    ).toBe("en");
  });
});

describe("getErrorMessage", () => {
  it("returns English, Spanish, and Japanese messages for taskNotFound", () => {
    expect(getErrorMessage("taskNotFound", "en")).toBe("Task not found");
    expect(getErrorMessage("taskNotFound", "es")).toBe("Tarea no encontrada");
    expect(getErrorMessage("taskNotFound", "ja")).toBe("タスクが見つかりません");
  });

  it("returns a translated Chinese message instead of the key", () => {
    expect(getErrorMessage("taskNotFound", "zh")).not.toBe("taskNotFound");
  });

  it("returns translated fileTypeNotSupported messages for all locales", () => {
    expect(getErrorMessage("fileTypeNotSupported", "en")).toBe(
      "Please upload a JPEG, PNG, or WebP image"
    );
    expect(getErrorMessage("fileTypeNotSupported", "es")).toBe(
      "Sube una imagen JPEG, PNG o WebP"
    );
    expect(getErrorMessage("fileTypeNotSupported", "ja")).toBe(
      "JPEG、PNG、WebP 画像をアップロードしてください"
    );
    expect(getErrorMessage("fileTypeNotSupported", "zh")).not.toBe(
      "fileTypeNotSupported"
    );
  });

  it("interpolates params in localized error messages", () => {
    expect(getErrorMessage("paymentFailed", "en", { reason: "Card declined" })).toBe(
      "Payment failed: Card declined"
    );
    expect(getErrorMessage("paymentFailed", "es", { reason: "Tarjeta rechazada" })).toBe(
      "El pago falló: Tarjeta rechazada"
    );
    expect(getErrorMessage("paymentFailed", "ja", { reason: "カードが拒否されました" })).toBe(
      "支払いに失敗しました: カードが拒否されました"
    );

    const zhReason = "测试原因";
    const zhMessage = getErrorMessage("paymentFailed", "zh", { reason: zhReason });
    expect(zhMessage).toContain(zhReason);
    expect(zhMessage).not.toBe("paymentFailed");
  });

  it("returns the key itself when translation is missing", () => {
    expect(getErrorMessage("nonExistentKey", "en")).toBe("nonExistentKey");
  });

  it("returns all known API error keys for every supported locale", () => {
    const locales = ["en", "zh", "es", "ja"] as const;
    const keys = [
      "fileTypeNotSupported",
      "fileTooLarge",
      "uploadFailed",
      "uploadStorageConfigError",
      "uploadStorageAuthError",
      "uploadStorageBucketMissing",
      "uploadStorageNetworkError",
      "uploadSupportHint",
      "quotaExceeded",
      "creditsExpired",
      "rateLimited",
      "taskNotFound",
      "cannotCancel",
      "unauthorized",
      "checkoutFailed",
      "retryFailed",
      "historyLoadFailed",
      "taskCreateFailed",
      "sourceImageUnreachable",
      "modelConfigError",
      "intermediateDownloadFailed"
    ];

    for (const locale of locales) {
      for (const key of keys) {
        expect(getErrorMessage(key, locale)).not.toBe(key);
      }
    }
  });
});
