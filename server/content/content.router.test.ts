import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import express from 'express'
import { ContentAccessService } from './content-access.service.js'
import { createContentRouter } from './content.router.js'
import { LocalContentStorage } from './content-storage.js'
import type { ContentRepository } from './content.repository.js'
import { problemHandler, requestContext } from '../http/problem.js'

const assetId = '11111111-1111-4111-8111-111111111111'

test('signed content endpoint supports byte ranges and rejects a changed disposition', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'learnhub-content-'))
  const objectDirectory = join(storageRoot, 'lessons')
  await mkdir(objectDirectory)
  await writeFile(join(objectDirectory, 'sample.mp4'), Buffer.from('0123456789'))

  const repository: ContentRepository = {
    findById: async (requestedAssetId) => requestedAssetId === assetId ? {
      id: assetId,
      storageKey: 'lessons/sample.mp4',
      mediaType: 'video/mp4',
      originalFileName: 'sample.mp4',
      byteSize: 10,
    } : null,
  }
  const accessService = new ContentAccessService({
    publicApiBaseUrl: 'http://127.0.0.1/api/v1',
    signingSecret: 'a-development-secret-that-is-long-enough',
    ttlSeconds: 900,
  })
  const app = express()
  app.use(requestContext)
  app.use('/api/v1/content-assets', createContentRouter({
    accessService,
    repository,
    storage: new LocalContentStorage(storageRoot),
  }))
  app.use(problemHandler)
  const server = app.listen(0)

  try {
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    const signedUrl = new URL(accessService.createAccess({ assetId, disposition: 'inline' }).url)
    signedUrl.host = `127.0.0.1:${address.port}`
    signedUrl.protocol = 'http:'

    const rangeResponse = await fetch(signedUrl, { headers: { Range: 'bytes=2-5' } })
    assert.equal(rangeResponse.status, 206)
    assert.equal(rangeResponse.headers.get('content-range'), 'bytes 2-5/10')
    assert.equal(await rangeResponse.text(), '2345')

    signedUrl.searchParams.set('disposition', 'attachment')
    const deniedResponse = await fetch(signedUrl)
    assert.equal(deniedResponse.status, 403)
    assert.equal(deniedResponse.headers.get('content-type'), 'application/problem+json; charset=utf-8')
  } finally {
    server.close()
    await rm(storageRoot, { recursive: true, force: true })
  }
})
