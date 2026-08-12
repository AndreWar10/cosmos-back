import { translate as googleTranslate } from 'google-translate-api-x';
import type { TranslationService } from '../../domain/services/TranslationService.js';
import type { Locale } from '../../shared/types/locale.js';

const MAX_CHUNK = 4500;

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

export class GoogleTranslationService implements TranslationService {
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
      const result = await googleTranslate(text, {
        from: 'en',
        to: target,
        forceBatch: false,
      });

      const translated = Array.isArray(result)
        ? result.map((item) => item.text).join(' ')
        : result.text;

      return translated?.trim() || text;
    } catch (error) {
      console.warn(
        '[translation] failed, returning original text:',
        error instanceof Error ? error.message : error,
      );
      return text;
    }
  }
}
