import { randomUUID } from 'node:crypto'
import type { ErrorRequestHandler, RequestHandler } from 'express'

export type FieldError = {
  field: string
  message: string
}

type ProblemOptions = {
  status: number
  code: string
  title: string
  detail: string
  errors?: FieldError[]
}

export class ProblemError extends Error {
  readonly status: number
  readonly code: string
  readonly title: string
  readonly errors?: FieldError[]

  constructor({ status, code, title, detail, errors }: ProblemOptions) {
    super(detail)
    this.name = 'ProblemError'
    this.status = status
    this.code = code
    this.title = title
    this.errors = errors
  }
}

export const requestContext: RequestHandler = (_request, response, next) => {
  response.locals.traceId = randomUUID()
  next()
}

export const problemHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const traceId = response.locals.traceId ?? randomUUID()
  const problem = error instanceof ProblemError
    ? error
    : new ProblemError({
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        title: 'Internal Server Error',
        detail: 'An unexpected error occurred.',
      })

  if (!(error instanceof ProblemError)) {
    console.error({ traceId, error })
  }

  response
    .status(problem.status)
    .type('application/problem+json')
    .json({
      type: `https://learnhub.local/problems/${problem.code.toLowerCase().replaceAll('_', '-')}`,
      title: problem.title,
      status: problem.status,
      detail: problem.message,
      instance: request.originalUrl,
      code: problem.code,
      traceId,
      ...(problem.errors ? { errors: problem.errors } : {}),
    })
}
