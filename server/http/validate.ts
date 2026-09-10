import type { RequestHandler } from 'express'
import type { z } from 'zod'
import { ProblemError } from './problem.js'

export function validateBody(schema: z.ZodType): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.safeParse(request.body)

    if (!parsed.success) {
      next(new ProblemError({
        status: 400,
        code: 'VALIDATION_ERROR',
        title: 'Validation Failed',
        detail: 'The request body contains invalid fields.',
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      }))
      return
    }

    request.body = parsed.data
    next()
  }
}
