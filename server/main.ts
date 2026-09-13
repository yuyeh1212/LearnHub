import { createRuntime } from './runtime.js'

const { app, config, pool } = createRuntime()
const server = app.listen(config.port, '0.0.0.0', () => {
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
