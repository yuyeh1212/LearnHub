import type { RequestHandler } from 'express'
import { ProblemError } from './problem.js'

type RateLimitBucket = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  code?: string
  detail: string
  keyPrefix: string
  maxRequests: number
  title?: string
  windowMs: number
}

function getClientIdentifier(request: Parameters<RequestHandler>[0]) {
  return request.ip || request.socket.remoteAddress || 'unknown-client'
}

export function createFixedWindowRateLimiter({
  code = 'RATE_LIMIT_EXCEEDED',
  detail,
  keyPrefix,
  maxRequests,
  title = 'Too Many Requests',
  windowMs,
}: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>()
  let lastCleanupAt = 0

  return (request, response, next) => {
    const now = Date.now()
    if (now - lastCleanupAt >= windowMs) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key)
      }
      lastCleanupAt = now
    }

    const key = `${keyPrefix}:${getClientIdentifier(request)}`
    const current = buckets.get(key)
    const bucket = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + windowMs }

    bucket.count += 1
    buckets.set(key, bucket)

    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000))
    response.setHeader('RateLimit-Limit', String(maxRequests))
    response.setHeader('RateLimit-Remaining', String(Math.max(0, maxRequests - bucket.count)))
    response.setHeader('RateLimit-Reset', String(retryAfterSeconds))

    if (bucket.count > maxRequests) {
      response.setHeader('Retry-After', String(retryAfterSeconds))
      next(new ProblemError({
        status: 429,
        code,
        title,
        detail,
      }))
      return
    }

    next()
  }
}
