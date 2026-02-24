// Auto-mock for next-intl used in all tests
// Returns the translation key as the value, making tests independent of locale

const useTranslations = (namespace?: string) => {
  const t = (key: string, params?: Record<string, unknown>) => {
    if (params) {
      let result = key;
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v));
      }
      return result;
    }
    return key;
  };
  return t;
};

const useLocale = () => "en";

export { useTranslations, useLocale };
