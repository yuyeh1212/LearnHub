import type { RequestHandler } from 'express'

export const securityHeaders: RequestHandler = (request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.setHeader('X-Permitted-Cross-Domain-Policies', 'none')

  if (request.secure || request.header('x-forwarded-proto') === 'https') {
    response.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  }

  next()
}
