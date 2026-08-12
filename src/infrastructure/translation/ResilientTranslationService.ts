import { translate as googleTranslate } from 'google-translate-api-x';
import { env, externalApis } from '../../config/env.js';
import type { TranslationService } from '../../domain/services/TranslationService.js';
import type { Locale } from '../../shared/types/locale.js';
import { httpGet } from '../../shared/http/httpClient.js';
import { CACHE_TTL, upstreamCache } from '../../shared/cache/MemoryCache.js';

interface MyMemoryResponse {
  responseData?: {
    translatedText?: string;
  };
}

async function translateWithGoogle(
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

/**
 * Google is often blocked on cloud IPs; MyMemory works better there.
 * Never cache failed translations (that would pin English under /pt for the TTL).
 */
export class ResilientTranslationService implements TranslationService {
  async translate(text: string, target: Locale): Promise<string> {
    if (!text?.trim() || target === 'en') return text;

    const normalized = text.trim();
    const cacheKey = `tr:${target}:${normalized}`;

    const cached = upstreamCache.get<string>(cacheKey);
    if (cached !== undefined) return cached;

    const providers =
      env.NODE_ENV === 'production'
        ? [translateWithMyMemory, translateWithGoogle]
        : [translateWithGoogle, translateWithMyMemory];

    for (const provider of providers) {
      try {
        const translated = await provider(normalized, target);
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
