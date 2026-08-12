import { z } from 'zod';

export const apodQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
});

export const newsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  search: z.string().trim().min(1).optional(),
});

export const launchesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  upcoming: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) =>
      value === undefined ? undefined : value === 'true',
    ),
  mode: z.enum(['list', 'latest', 'next']).optional().default('list'),
});

export const neoQuerySchema = z.object({
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be YYYY-MM-DD')
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be YYYY-MM-DD')
    .optional(),
});
