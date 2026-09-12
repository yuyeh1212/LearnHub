import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../http/async-handler.js'
import { ProblemError } from '../http/problem.js'
import type { ContentAccessService } from './content-access.service.js'
import type { ContentRepository } from './content.repository.js'
import type { ContentStorage } from './content-storage.js'

const assetIdSchema = z.uuid()
const accessQuerySchema = z.object({
  expires: z.coerce.number().int().positive(),
  disposition: z.enum(['attachment', 'inline']),
  signature: z.string().regex(/^[a-f0-9]{64}$/),
}).strict()

type ContentRouterDependencies = {
  accessService: ContentAccessService
  repository: ContentRepository
  storage: ContentStorage
}

function contentAccessDenied() {
  return new ProblemError({
    status: 403,
    code: 'CONTENT_ACCESS_DENIED',
    title: 'Content Access Denied',
    detail: 'The content access link is invalid or has expired.',
  })
}

function contentNotFound() {
  return new ProblemError({
    status: 404,
    code: 'CONTENT_ASSET_NOT_FOUND',
    title: 'Not Found',
    detail: 'The requested content asset is unavailable.',
  })
}

function parseRange(value: string | undefined, size: number) {
  if (!value) return null
  const match = value.match(/^bytes=(\d*)-(\d*)$/)
  if (!match || (!match[1] && !match[2])) return undefined

  const requestedStart = match[1] ? Number(match[1]) : null
  const requestedEnd = match[2] ? Number(match[2]) : null
  const start = requestedStart ?? Math.max(0, size - (requestedEnd ?? 0))
  const end = requestedStart === null ? size - 1 : Math.min(requestedEnd ?? size - 1, size - 1)

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) {
    return undefined
  }

  return { start, end }
}

function contentDispositionHeader(disposition: 'attachment' | 'inline', fileName: string) {
  const asciiName = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_') || 'content'
  return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

export function createContentRouter({ accessService, repository, storage }: ContentRouterDependencies) {
  const router = Router()

  const deliverContent = asyncHandler(async (request, response) => {
    const assetId = assetIdSchema.safeParse(request.params.assetId)
    const query = accessQuerySchema.safeParse(request.query)
    if (!assetId.success || !query.success || !accessService.verifyAccess({ assetId: assetId.data, ...query.data })) {
      throw contentAccessDenied()
    }

    const asset = await repository.findById(assetId.data)
    if (!asset) throw contentNotFound()

    const object = await storage.open(asset.storageKey)
    if (!object) throw contentNotFound()

    const range = parseRange(request.headers.range, object.size)
    if (range === undefined) {
      response.status(416).set('Content-Range', `bytes */${object.size}`).end()
      return
    }

    const remainingSeconds = Math.max(0, query.data.expires - Math.floor(Date.now() / 1_000))
    response.set({
      'Accept-Ranges': 'bytes',
      'Cache-Control': `private, max-age=${remainingSeconds}, immutable`,
      'Content-Disposition': contentDispositionHeader(query.data.disposition, asset.originalFileName),
      'Content-Type': asset.mediaType,
      'X-Content-Type-Options': 'nosniff',
    })

    if (range) {
      response.status(206).set({
        'Content-Length': String(range.end - range.start + 1),
        'Content-Range': `bytes ${range.start}-${range.end}/${object.size}`,
      })
    } else {
      response.status(200).set('Content-Length', String(object.size))
    }

    if (request.method === 'HEAD') {
      response.end()
      return
    }

    const stream = object.createReadStream(range ?? undefined)
    stream.on('error', () => response.destroy())
    response.on('close', () => stream.destroy())
    stream.pipe(response)
  })

  router.head('/:assetId', deliverContent)
  router.get('/:assetId', deliverContent)
  return router
}
