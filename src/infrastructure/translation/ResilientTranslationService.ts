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
 * Tries Google first (works well locally). On cloud hosts Google often blocks
 * datacenter IPs, so we fall back to MyMemory.
 */
export class ResilientTranslationService implements TranslationService {
  async translate(text: string, target: Locale): Promise<string> {
    if (!text?.trim() || target === 'en') return text;

    const normalized = text.trim();
    const cacheKey = `tr:${target}:${normalized}`;

    return upstreamCache.getOrSet(
      cacheKey,
      async () => {
        try {
          return await translateWithGoogle(normalized, target);
        } catch (googleError) {
          console.warn(
            '[translation] Google failed, trying MyMemory:',
            googleError instanceof Error ? googleError.message : googleError,
          );

          try {
            return await translateWithMyMemory(normalized, target);
          } catch (myMemoryError) {
            console.warn(
              '[translation] MyMemory failed, returning original:',
              myMemoryError instanceof Error
                ? myMemoryError.message
                : myMemoryError,
            );
            return normalized;
          }
        }
      },
      CACHE_TTL.translation,
    );
  }

  async translateMany(texts: string[], target: Locale): Promise<string[]> {
    if (target === 'en') return texts;
    return Promise.all(texts.map((text) => this.translate(text, target)));
  }
}
