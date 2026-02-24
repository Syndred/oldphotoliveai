const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export type RetryConfig = Partial<typeof RETRY_CONFIG>;

export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: RetryConfig
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, backoffMultiplier } = {
    ...RETRY_CONFIG,
    ...config,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        console.error(
          `[retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  throw lastError;
}
