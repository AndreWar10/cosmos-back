import { UpstreamError } from '../errors/AppError.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}

function buildUrl(
  baseUrl: string,
  query?: HttpRequestOptions['query'],
): string {
  const url = new URL(baseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function httpGet<T>(
  baseUrl: string,
  options: HttpRequestOptions = {},
): Promise<T> {
  const { headers = {}, query, timeoutMs = 15_000 } = options;
  const url = buildUrl(baseUrl, query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new UpstreamError(
        url,
        `Upstream responded with ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof UpstreamError) throw error;

    if (error instanceof Error && error.name === 'AbortError') {
      throw new UpstreamError(url, 'Upstream request timed out');
    }

    throw new UpstreamError(
      url,
      error instanceof Error ? error.message : 'Unknown upstream error',
    );
  } finally {
    clearTimeout(timeout);
  }
}
