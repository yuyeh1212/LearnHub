import assert from 'node:assert/strict'
import test from 'node:test'
import type { AddressInfo } from 'node:net'
import type { Pool } from 'pg'
import { createApp } from './app.js'

function createTestApp(pool: Pool) {
  return createApp({
    pool,
    contentAccessTtlSeconds: 900,
    contentSigningSecret: 'content-signing-secret-that-is-long-enough',
    contentStorageDriver: 'local',
    contentStorageRoot: process.cwd(),
    corsOrigin: 'http://127.0.0.1:4173',
    cronSecret: 'local-test-cron-secret',
    jwtSecret: 'jwt-secret-that-is-at-least-32-characters',
    publicApiBaseUrl: 'http://127.0.0.1:3001/api/v1',
    supabaseSecretKey: null,
    supabaseStorageBucket: 'learnhub-content',
    supabaseUrl: null,
  })
}

async function withTestServer<T>(pool: Pool, run: (baseUrl: string) => Promise<T>) {
  const app = createTestApp(pool)
  const server = app.listen(0, '127.0.0.1')

  try {
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const { port } = server.address() as AddressInfo
    return await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function readProblemCode(response: Response) {
  const body: unknown = await response.json()
  if (!isRecord(body)) {
    throw new Error('Expected a problem response object.')
  }

  return body.code
}

test('health and readiness endpoints are available below the production API prefix', async () => {
  let readinessChecks = 0
  const pool = {
    query: async () => {
      readinessChecks += 1
      return { rows: [{ one: 1 }] }
    },
  } as unknown as Pool

  await withTestServer(pool, async (baseUrl) => {
    const health = await fetch(`${baseUrl}/api/v1/health`)
    const ready = await fetch(`${baseUrl}/api/v1/ready`)

    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { status: 'ok' })
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(health.headers.get('x-frame-options'), 'DENY')
    assert.equal(health.headers.get('referrer-policy'), 'no-referrer')
    assert.equal(health.headers.get('x-powered-by'), null)
    assert.equal(ready.status, 200)
    assert.deepEqual(await ready.json(), { status: 'ready' })
    assert.equal(readinessChecks, 1)
  })
})

test('auth login and registration endpoints are rate limited', async () => {
  const pool = { query: async () => ({ rows: [] }) } as unknown as Pool

  await withTestServer(pool, async (baseUrl) => {
    const postJson = (path: string, body: unknown) => fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    for (let index = 0; index < 10; index += 1) {
      const response = await postJson('/api/v1/auth/login', { email: 'not-an-email', password: 'short' })
      assert.equal(response.status, 400)
    }

    const limitedLogin = await postJson('/api/v1/auth/login', { email: 'not-an-email', password: 'short' })
    assert.equal(limitedLogin.status, 429)
    assert.equal(limitedLogin.headers.get('content-type')?.includes('application/problem+json'), true)
    assert.equal(limitedLogin.headers.get('ratelimit-limit'), '10')
    assert.ok(limitedLogin.headers.get('retry-after'))
    assert.equal(await readProblemCode(limitedLogin), 'RATE_LIMIT_EXCEEDED')

    for (let index = 0; index < 5; index += 1) {
      const response = await postJson('/api/v1/auth/register', { email: 'not-an-email', password: 'short', displayName: '' })
      assert.equal(response.status, 400)
    }

    const limitedRegister = await postJson('/api/v1/auth/register', { email: 'not-an-email', password: 'short', displayName: '' })
    assert.equal(limitedRegister.status, 429)
    assert.equal(limitedRegister.headers.get('content-type')?.includes('application/problem+json'), true)
    assert.equal(limitedRegister.headers.get('ratelimit-limit'), '5')
    assert.ok(limitedRegister.headers.get('retry-after'))
    assert.equal(await readProblemCode(limitedRegister), 'RATE_LIMIT_EXCEEDED')
  })
})

test('supabase heartbeat cron endpoint requires cron authorization', async () => {
  let heartbeatChecks = 0
  const pool = {
    query: async () => {
      heartbeatChecks += 1
      return { rows: [{ one: 1 }] }
    },
  } as unknown as Pool

  await withTestServer(pool, async (baseUrl) => {
    const unauthorized = await fetch(`${baseUrl}/api/v1/cron/supabase-heartbeat`)
    assert.equal(unauthorized.status, 401)
    assert.equal(await readProblemCode(unauthorized), 'CRON_UNAUTHORIZED')
    assert.equal(heartbeatChecks, 0)

    const authorized = await fetch(`${baseUrl}/api/v1/cron/supabase-heartbeat`, {
      headers: { Authorization: 'Bearer local-test-cron-secret' },
    })
    assert.equal(authorized.status, 200)
    assert.deepEqual(await authorized.json(), { status: 'ok' })
    assert.equal(heartbeatChecks, 1)
  })
})
