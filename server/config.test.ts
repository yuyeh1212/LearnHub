import assert from 'node:assert/strict'
import test from 'node:test'
import { loadConfig } from './config.js'

test('blank optional deployment variables are treated as unset', () => {
  const jwtSecret = 'jwt-secret-that-is-at-least-32-characters'
  const config = loadConfig({
    DATABASE_URL: 'postgresql://learnhub:password@localhost:5432/learnhub',
    JWT_SECRET: jwtSecret,
    CORS_ORIGIN: '',
    PUBLIC_API_BASE_URL: '',
    CONTENT_STORAGE_ROOT: '',
    CONTENT_SIGNING_SECRET: '',
    CRON_SECRET: '',
    CONTENT_STORAGE_DRIVER: 'supabase',
    PASSWORD_RESET_DEBUG_RESPONSE: '',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SECRET_KEY: 'server-only-secret',
  })

  assert.equal(config.corsOrigin, null)
  assert.equal(config.publicApiBaseUrl, 'http://127.0.0.1:3001/api/v1')
  assert.equal(config.contentSigningSecret, jwtSecret)
  assert.equal(config.cronSecret, null)
  assert.equal(config.passwordResetDebugResponse, true)
  assert.equal(config.supabaseStorageBucket, 'learnhub-content')
})
