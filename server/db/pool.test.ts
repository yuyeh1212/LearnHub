import assert from 'node:assert/strict'
import test from 'node:test'
import { createDatabasePool } from './pool.js'

test('serverless database pools use one short-lived encrypted connection', async () => {
  const pool = createDatabasePool('postgresql://user:password@example.com:6543/postgres', {
    serverless: true,
  })

  assert.equal(pool.options.max, 1)
  assert.equal(pool.options.connectionTimeoutMillis, 5_000)
  assert.equal(pool.options.idleTimeoutMillis, 5_000)
  assert.deepEqual(pool.options.ssl, { rejectUnauthorized: false })

  await pool.end()
})
