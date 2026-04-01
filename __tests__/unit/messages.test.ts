import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";
import jaMessages from "../../messages/ja.json";
import zhMessages from "../../messages/zh.json";

const localeMessages = {
  en: enMessages,
  es: esMessages,
  ja: jaMessages,
  zh: zhMessages,
} as const;

const requiredKeys = [
  "landing.footer.links.about",
  "legal.about.eyebrow",
  "legal.about.title",
  "legal.about.description",
  "legal.about.intro",
  "legal.about.operatorTitle",
  "legal.about.operatorBody",
  "legal.about.contactTitle",
  "legal.about.contactBody",
  "legal.about.emailLabel",
  "legal.about.addressLabel",
  "legal.about.adsTitle",
  "legal.about.adsBody",
  "legal.about.privacyLink",
  "legal.about.termsLink",
  "legal.privacy.businessInfoTitle",
  "legal.privacy.businessInfoBody",
  "legal.terms.businessInfoTitle",
  "legal.terms.businessInfoBody",
] as const;

function getValue(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);
}

function collectReplacementPaths(
  source: unknown,
  path: string[] = []
): string[] {
  if (typeof source === "string") {
    return source.includes("\uFFFD") ? [path.join(".")] : [];
  }

  if (Array.isArray(source)) {
    return source.flatMap((value, index) =>
      collectReplacementPaths(value, [...path, String(index)])
    );
  }

  if (source && typeof source === "object") {
    return Object.entries(source).flatMap(([key, value]) =>
      collectReplacementPaths(value, [...path, key])
    );
  }

  return [];
}

describe("message catalogs", () => {
  it("contains the legal and about keys for every locale", () => {
    for (const [locale, messages] of Object.entries(localeMessages)) {
      for (const key of requiredKeys) {
        expect(getValue(messages, key)).toEqual(expect.any(String));
      }
    }
  });

  it("does not contain placeholder question marks in localized legal/about copy", () => {
    const failures = Object.entries(localeMessages)
      .filter(([locale]) => locale !== "en")
      .flatMap(([locale, messages]) =>
        requiredKeys.flatMap((key) => {
          const value = getValue(messages, key);
          if (typeof value !== "string" || !value.includes("?")) return [];
          return [`${locale}.${key}`];
        })
      );

    expect(failures).toEqual([]);
  });

  it("does not contain Unicode replacement characters", () => {
    const failures = Object.entries(localeMessages).flatMap(([locale, messages]) =>
      collectReplacementPaths(messages).map((path) => `${locale}.${path}`)
    );

    expect(failures).toEqual([]);
  });
});
