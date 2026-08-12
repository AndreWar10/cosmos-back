import { externalApis } from '../../config/env.js';
import type { TranslationService } from '../../domain/services/TranslationService.js';
import type { Locale } from '../../shared/types/locale.js';
import { httpGet } from '../../shared/http/httpClient.js';

interface MyMemoryResponse {
  responseData?: {
    translatedText?: string;
  };
  responseStatus?: number;
}

const MAX_CHUNK = 450;

function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > MAX_CHUNK) {
    let splitAt = remaining.lastIndexOf(' ', MAX_CHUNK);
    if (splitAt < MAX_CHUNK * 0.5) splitAt = MAX_CHUNK;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

export class MyMemoryTranslationService implements TranslationService {
  async translate(text: string, target: Locale): Promise<string> {
    if (!text?.trim() || target === 'en') return text;

    const chunks = chunkText(text.trim());
    const translatedChunks = await Promise.all(
      chunks.map((chunk) => this.translateChunk(chunk, target)),
    );

    return translatedChunks.join(' ');
  }

  async translateMany(texts: string[], target: Locale): Promise<string[]> {
    if (target === 'en') return texts;

    return Promise.all(texts.map((text) => this.translate(text, target)));
  }

  private async translateChunk(text: string, target: Locale): Promise<string> {
    try {
      const response = await httpGet<MyMemoryResponse>(
        externalApis.myMemoryTranslate,
        {
          query: {
            q: text,
            langpair: `en|${target}`,
          },
          timeoutMs: 12_000,
        },
      );

      const translated = response.responseData?.translatedText?.trim();
      if (!translated) return text;

      if (/MYMEMORY WARNING/i.test(translated)) return text;

      return translated;
    } catch {
      return text;
    }
  }
}
