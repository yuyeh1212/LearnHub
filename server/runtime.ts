import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { createDatabasePool } from './db/pool.js'

export function createRuntime(environment = process.env) {
  const config = loadConfig(environment)
  const pool = createDatabasePool(config.databaseUrl, {
    serverless: environment.VERCEL === '1',
  })
  const app = createApp({
    pool,
    corsOrigin: config.corsOrigin,
    cronSecret: config.cronSecret,
    jwtSecret: config.jwtSecret,
    passwordResetDebugResponse: config.passwordResetDebugResponse,
    publicApiBaseUrl: config.publicApiBaseUrl,
    contentStorageRoot: config.contentStorageRoot,
    contentSigningSecret: config.contentSigningSecret,
    contentAccessTtlSeconds: config.contentAccessTtlSeconds,
    contentStorageDriver: config.contentStorageDriver,
    supabaseUrl: config.supabaseUrl,
    supabaseSecretKey: config.supabaseSecretKey,
    supabaseStorageBucket: config.supabaseStorageBucket,
  })

  return { app, config, pool }
}
