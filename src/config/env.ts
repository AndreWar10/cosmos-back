import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3333),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NASA_API_KEY: z.string().min(1).default('DEMO_KEY'),
  /** Optional The Space Devs token — raises Launch Library rate limits. */
  LAUNCH_LIBRARY_TOKEN: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;

export const externalApis = {
  nasaApod: 'https://api.nasa.gov/planetary/apod',
  nasaNeo: 'https://api.nasa.gov/neo/rest/v1/feed',
  spaceflightNews: 'https://api.spaceflightnewsapi.net/v4/articles/',
  // api.spacexdata.com was archived (down). SpaceX launches via Launch Library 2.
  launchLibrary: 'https://ll.thespacedevs.com/2.2.0/launch',
  myMemoryTranslate: 'https://api.mymemory.translated.net/get',
} as const;
