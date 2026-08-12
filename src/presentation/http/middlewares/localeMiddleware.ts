import type { NextFunction, Request, Response } from 'express';
import { resolveLocale, type Locale } from '../../../shared/types/locale.js';

declare global {
  namespace Express {
    interface Request {
      locale: Locale;
    }
  }
}

export function localeMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const prefix = req.params.locale;
  req.locale = resolveLocale(
    typeof prefix === 'string' ? prefix : undefined,
  );
  next();
}
