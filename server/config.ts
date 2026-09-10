import 'dotenv/config'
import { z } from 'zod'

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().url(),
})

export type AppConfig = {
  environment: 'development' | 'test' | 'production'
  port: number
  databaseUrl: string
  jwtSecret: string
  corsOrigin: string
}

export function loadConfig(environment = process.env): AppConfig {
  const parsed = environmentSchema.safeParse(environment)

  if (!parsed.success) {
    const invalidFields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Invalid server configuration: ${invalidFields}`)
  }

  return {
    environment: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    databaseUrl: parsed.data.DATABASE_URL,
    jwtSecret: parsed.data.JWT_SECRET,
    corsOrigin: parsed.data.CORS_ORIGIN,
  }
}
