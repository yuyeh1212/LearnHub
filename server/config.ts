import 'dotenv/config'
import { resolve } from 'node:path'
import { z } from 'zod'

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().url().optional(),
  PUBLIC_API_BASE_URL: z.string().url().optional(),
  CONTENT_STORAGE_ROOT: z.string().trim().min(1).optional(),
  CONTENT_SIGNING_SECRET: z.string().min(32).optional(),
  CONTENT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
  CONTENT_STORAGE_DRIVER: z.enum(['local', 'supabase']).default('local'),
  CRON_SECRET: z.string().min(16).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9._-]{1,99}$/).default('learnhub-content'),
})

export type AppConfig = {
  environment: 'development' | 'test' | 'production'
  port: number
  databaseUrl: string
  jwtSecret: string
  corsOrigin: string | null
  publicApiBaseUrl: string
  contentStorageRoot: string
  contentSigningSecret: string
  contentAccessTtlSeconds: number
  contentStorageDriver: 'local' | 'supabase'
  cronSecret: string | null
  supabaseUrl: string | null
  supabaseSecretKey: string | null
  supabaseStorageBucket: string
}

export function loadConfig(environment = process.env): AppConfig {
  const normalizedEnvironment = Object.fromEntries(
    Object.entries(environment).map(([key, value]) => [
      key,
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    ]),
  )
  const parsed = environmentSchema.safeParse(normalizedEnvironment)

  if (!parsed.success) {
    const invalidFields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Invalid server configuration: ${invalidFields}`)
  }

  if (parsed.data.CONTENT_STORAGE_DRIVER === 'supabase' && (!parsed.data.SUPABASE_URL || !parsed.data.SUPABASE_SECRET_KEY)) {
    throw new Error('Invalid server configuration: SUPABASE_URL, SUPABASE_SECRET_KEY')
  }

  return {
    environment: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    databaseUrl: parsed.data.DATABASE_URL,
    jwtSecret: parsed.data.JWT_SECRET,
    corsOrigin: parsed.data.CORS_ORIGIN ?? null,
    publicApiBaseUrl: parsed.data.PUBLIC_API_BASE_URL ?? `http://127.0.0.1:${parsed.data.PORT}/api/v1`,
    contentStorageRoot: resolve(parsed.data.CONTENT_STORAGE_ROOT ?? 'storage/private'),
    contentSigningSecret: parsed.data.CONTENT_SIGNING_SECRET ?? parsed.data.JWT_SECRET,
    contentAccessTtlSeconds: parsed.data.CONTENT_ACCESS_TTL_SECONDS,
    contentStorageDriver: parsed.data.CONTENT_STORAGE_DRIVER,
    cronSecret: parsed.data.CRON_SECRET ?? null,
    supabaseUrl: parsed.data.SUPABASE_URL ?? null,
    supabaseSecretKey: parsed.data.SUPABASE_SECRET_KEY ?? null,
    supabaseStorageBucket: parsed.data.SUPABASE_STORAGE_BUCKET,
  }
}
