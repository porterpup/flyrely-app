/** Give up on a request after this long so spinners cannot hang on bad wifi. */
export const REQUEST_TIMEOUT_MS = 12000;

/**
 * fetch with an abort timer. Rejects with an AbortError (name 'AbortError') when the timer fires;
 * other network failures reject as usual. The timer is cleared once the response headers arrive.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  ms: number = REQUEST_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** True when a thrown value is the abort raised by fetchWithTimeout. */
export function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

export const TIMEOUT_MESSAGE = 'That took too long. Check your connection and try again.';
