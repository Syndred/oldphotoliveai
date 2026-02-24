// Auto-mock for next-intl/server used in server component tests

const getTranslations = async (namespace?: string) => {
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

export { getTranslations };
