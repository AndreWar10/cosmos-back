export type Locale = 'en' | 'pt';

export function isLocale(value: string): value is Locale {
  return value === 'en' || value === 'pt';
}

export function resolveLocale(value?: string): Locale {
  if (!value || value === 'en') return 'en';
  if (value === 'pt') return 'pt';
  return 'en';
}
