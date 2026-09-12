import assert from 'node:assert/strict'
import test from 'node:test'
import { ContentAccessService } from './content-access.service.js'

const assetId = '11111111-1111-4111-8111-111111111111'
const now = new Date('2026-09-12T00:00:00.000Z').getTime()

test('content access URLs are signed and expire at the configured time', () => {
  const service = new ContentAccessService({
    now: () => now,
    publicApiBaseUrl: 'https://api.learnhub.example/api/v1/',
    signingSecret: 'a-development-secret-that-is-long-enough',
    ttlSeconds: 900,
  })

  const access = service.createAccess({ assetId, disposition: 'inline' })
  const url = new URL(access.url)
  const expires = Number(url.searchParams.get('expires'))
  const signature = url.searchParams.get('signature') ?? ''

  assert.equal(access.expiresAt, '2026-09-12T00:15:00.000Z')
  assert.equal(url.pathname, `/api/v1/content-assets/${assetId}`)
  assert.equal(service.verifyAccess({ assetId, disposition: 'inline', expires, signature }), true)
  assert.equal(service.verifyAccess({ assetId, disposition: 'attachment', expires, signature }), false)
})

test('expired content access URLs are rejected', () => {
  let currentTime = now
  const service = new ContentAccessService({
    now: () => currentTime,
    publicApiBaseUrl: 'https://api.learnhub.example/api/v1',
    signingSecret: 'a-development-secret-that-is-long-enough',
    ttlSeconds: 60,
  })
  const access = service.createAccess({ assetId, disposition: 'inline' })
  const url = new URL(access.url)

  currentTime += 61_000
  assert.equal(service.verifyAccess({
    assetId,
    disposition: 'inline',
    expires: Number(url.searchParams.get('expires')),
    signature: url.searchParams.get('signature') ?? '',
  }), false)
})
