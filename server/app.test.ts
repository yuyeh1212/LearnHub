import assert from 'node:assert/strict'
import test from 'node:test'
import type { AddressInfo } from 'node:net'
import type { Pool } from 'pg'
import { createApp } from './app.js'

test('health and readiness endpoints are available below the production API prefix', async () => {
  let readinessChecks = 0
  const pool = {
    query: async () => {
      readinessChecks += 1
      return { rows: [{ one: 1 }] }
    },
  } as unknown as Pool
  const app = createApp({
    pool,
    contentAccessTtlSeconds: 900,
    contentSigningSecret: 'content-signing-secret-that-is-long-enough',
    contentStorageDriver: 'local',
    contentStorageRoot: process.cwd(),
    corsOrigin: 'http://127.0.0.1:4173',
    jwtSecret: 'jwt-secret-that-is-at-least-32-characters',
    publicApiBaseUrl: 'http://127.0.0.1:3001/api/v1',
    supabaseSecretKey: null,
    supabaseStorageBucket: 'learnhub-content',
    supabaseUrl: null,
  })
  const server = app.listen(0, '127.0.0.1')

  try {
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const { port } = server.address() as AddressInfo
    const health = await fetch(`http://127.0.0.1:${port}/api/v1/health`)
    const ready = await fetch(`http://127.0.0.1:${port}/api/v1/ready`)

    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { status: 'ok' })
    assert.equal(ready.status, 200)
    assert.deepEqual(await ready.json(), { status: 'ready' })
    assert.equal(readinessChecks, 1)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
