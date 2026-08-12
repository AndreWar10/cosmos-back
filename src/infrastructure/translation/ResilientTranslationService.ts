import { translate as googleTranslate } from 'google-translate-api-x';
import { externalApis } from '../../config/env.js';
import type { TranslationService } from '../../domain/services/TranslationService.js';
import type { Locale } from '../../shared/types/locale.js';
import { httpGet } from '../../shared/http/httpClient.js';
import { CACHE_TTL, upstreamCache } from '../../shared/cache/MemoryCache.js';

interface MyMemoryResponse {
  responseData?: {
    translatedText?: string;
  };
}

/** Unofficial but widely used Google endpoint — works better from cloud IPs. */
async function translateWithGtx(
  text: string,
  target: Locale,
): Promise<string> {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', target);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`GTX responded with ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  // Shape: [[["translated","original",...],...],...]
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    throw new Error('Unexpected GTX payload');
  }

  const translated = payload[0]
    .map((part) => (Array.isArray(part) ? String(part[0] ?? '') : ''))
    .join('')
    .trim();

  if (!translated) throw new Error('Empty GTX translation');
  return translated;
}

async function translateWithGooglePackage(
  text: string,
  target: Locale,
): Promise<string> {
  const result = await googleTranslate(text, {
    from: 'en',
    to: target,
    forceBatch: false,
  });

  const translated = Array.isArray(result)
    ? result.map((item) => item.text).join(' ')
    : result.text;

  if (!translated?.trim()) {
    throw new Error('Empty Google Translate response');
  }

  return translated.trim();
}

async function translateWithMyMemory(
  text: string,
  target: Locale,
): Promise<string> {
  const response = await httpGet<MyMemoryResponse>(
    externalApis.myMemoryTranslate,
    {
      query: {
        q: text.slice(0, 450),
        langpair: `en|${target}`,
      },
      timeoutMs: 12_000,
    },
  );

  const translated = response.responseData?.translatedText?.trim();
  if (!translated || /MYMEMORY WARNING/i.test(translated)) {
    throw new Error('MyMemory translation unavailable');
  }

  return translated;
}

type Provider = {
  name: string;
  run: (text: string, target: Locale) => Promise<string>;
};

const providers: Provider[] = [
  { name: 'gtx', run: translateWithGtx },
  { name: 'mymemory', run: translateWithMyMemory },
  { name: 'google-package', run: translateWithGooglePackage },
];

/**
 * Never cache failed translations — that pinned English under /pt for the TTL.
 * Cache key is versioned (v2) to invalidate previously cached English fallbacks.
 */
export class ResilientTranslationService implements TranslationService {
  async translate(text: string, target: Locale): Promise<string> {
    if (!text?.trim() || target === 'en') return text;

    const normalized = text.trim();
    const cacheKey = `tr:v2:${target}:${normalized}`;

    const cached = upstreamCache.get<string>(cacheKey);
    if (cached !== undefined) return cached;

    for (const provider of providers) {
      try {
        const translated = await provider.run(normalized, target);
        if (!translated || translated === normalized) {
          // Might be a proper noun — still accept, but try next if empty.
          if (!translated) continue;
        }
        upstreamCache.set(cacheKey, translated, CACHE_TTL.translation);
        return translated;
      } catch (error) {
        console.warn(
          `[translation] ${provider.name} failed:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    // Do NOT cache failures — next request can retry providers.
    return normalized;
  }

  async translateMany(texts: string[], target: Locale): Promise<string[]> {
    if (target === 'en') return texts;
    return Promise.all(texts.map((text) => this.translate(text, target)));
  }
}
