import type { RequestHandler } from 'express'
import { verifyAccessToken } from './token.js'
import { ProblemError } from '../http/problem.js'

export function requireAuthentication(jwtSecret: string): RequestHandler {
  return async (request, response, next) => {
    const authorization = request.header('authorization')
    const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null

    if (!token) {
      next(new ProblemError({
        status: 401,
        code: 'UNAUTHENTICATED',
        title: 'Unauthenticated',
        detail: 'A Bearer access token is required.',
      }))
      return
    }

    try {
      response.locals.auth = await verifyAccessToken(token, jwtSecret)
      next()
    } catch {
      next(new ProblemError({
        status: 401,
        code: 'UNAUTHENTICATED',
        title: 'Unauthenticated',
        detail: 'A valid access token is required.',
      }))
    }
  }
}
