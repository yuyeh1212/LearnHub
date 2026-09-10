import cors from 'cors'
import express from 'express'
import type { Pool } from 'pg'
import type { AppConfig } from './config.js'
import { createAuthRouter } from './auth/auth.router.js'
import { PostgresAuthRepository } from './auth/auth.repository.js'
import { ProblemError, problemHandler, requestContext } from './http/problem.js'

type AppDependencies = Pick<AppConfig, 'corsOrigin' | 'jwtSecret'> & {
  pool: Pool
}

export function createApp({ pool, corsOrigin, jwtSecret }: AppDependencies) {
  const app = express()

  app.disable('x-powered-by')
  app.use(requestContext)
  app.use(cors({ origin: corsOrigin, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }))
  app.use(express.json({ limit: '32kb' }))

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' })
  })

  app.use('/api/v1/auth', createAuthRouter({
    repository: new PostgresAuthRepository(pool),
    jwtSecret,
  }))

  app.use((request, _response, next) => {
    next(new ProblemError({
      status: 404,
      code: 'ROUTE_NOT_FOUND',
      title: 'Not Found',
      detail: `No route matches ${request.method} ${request.originalUrl}.`,
    }))
  })

  app.use(problemHandler)
  return app
}
