import type { Locale } from '../../shared/types/locale.js';

export interface TranslationService {
  translate(
    text: string,
    target: Locale,
    source?: Locale,
  ): Promise<string>;
  translateMany(
    texts: string[],
    target: Locale,
    source?: Locale,
  ): Promise<string[]>;
}
