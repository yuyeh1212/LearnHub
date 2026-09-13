import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../http/async-handler.js'
import { ProblemError } from '../http/problem.js'
import { createFixedWindowRateLimiter } from '../http/rate-limit.js'
import { validateBody } from '../http/validate.js'
import type { AuthRepository } from './auth.repository.js'
import { requireAuthentication } from './auth.middleware.js'
import { AuthService } from './auth.service.js'

const emailSchema = z.string().trim().email().max(254)
const passwordSchema = z.string()
  .min(12)
  .max(256)
  .refine((value) => new TextEncoder().encode(value).byteLength <= 72, {
    message: 'must be at most 72 bytes when encoded as UTF-8',
  })

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(100),
}).strict()

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
}).strict()

type AuthRouterDependencies = {
  repository: AuthRepository
  jwtSecret: string
}

export function createAuthRouter({ repository, jwtSecret }: AuthRouterDependencies) {
  const router = Router()
  const service = new AuthService(repository, jwtSecret)
  const registerRateLimit = createFixedWindowRateLimiter({
    keyPrefix: 'auth:register',
    maxRequests: 5,
    windowMs: 10 * 60 * 1_000,
    detail: 'Too many registration attempts. Please wait before trying again.',
  })
  const loginRateLimit = createFixedWindowRateLimiter({
    keyPrefix: 'auth:login',
    maxRequests: 10,
    windowMs: 60 * 1_000,
    detail: 'Too many login attempts. Please wait before trying again.',
  })

  router.post('/register', registerRateLimit, validateBody(registerSchema), asyncHandler(async (request, response) => {
    const result = await service.register(request.body)
    response.status(201).location(`/api/v1/users/${result.user.id}`).json(result)
  }))

  router.post('/login', loginRateLimit, validateBody(loginSchema), asyncHandler(async (request, response) => {
    const result = await service.login(request.body)
    response.status(200).json(result)
  }))

  router.get('/me', requireAuthentication(jwtSecret), asyncHandler(async (_request, response) => {
    const auth = response.locals.auth

    if (!auth) {
      throw new ProblemError({
        status: 401,
        code: 'UNAUTHENTICATED',
        title: 'Unauthenticated',
        detail: 'A valid access token is required.',
      })
    }

    response.status(200).json(await service.getCurrentUser(auth.userId))
  }))

  return router
}
