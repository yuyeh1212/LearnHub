import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { createDatabasePool } from './db/pool.js'

const config = loadConfig()
const pool = createDatabasePool(config.databaseUrl)
const app = createApp({
  pool,
  corsOrigin: config.corsOrigin,
  jwtSecret: config.jwtSecret,
  publicApiBaseUrl: config.publicApiBaseUrl,
  contentStorageRoot: config.contentStorageRoot,
  contentSigningSecret: config.contentSigningSecret,
  contentAccessTtlSeconds: config.contentAccessTtlSeconds,
  contentStorageDriver: config.contentStorageDriver,
  supabaseUrl: config.supabaseUrl,
  supabaseSecretKey: config.supabaseSecretKey,
  supabaseStorageBucket: config.supabaseStorageBucket,
})
const server = app.listen(config.port, () => {
  console.info(`LearnHub API listening on http://127.0.0.1:${config.port}`)
})

let isShuttingDown = false

async function shutdown(signal: string) {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  console.info(`Received ${signal}; shutting down LearnHub API.`)
  server.close(async (closeError) => {
    await pool.end()
    process.exitCode = closeError ? 1 : 0
  })
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))
