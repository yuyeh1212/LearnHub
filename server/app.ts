import cors from 'cors'
import express from 'express'
import type { Pool } from 'pg'
import type { AppConfig } from './config.js'
import { createAuthRouter } from './auth/auth.router.js'
import { PostgresAuthRepository } from './auth/auth.repository.js'
import { asyncHandler } from './http/async-handler.js'
import { ProblemError, problemHandler, requestContext } from './http/problem.js'
import { securityHeaders } from './http/security-headers.js'
import { LearningRepository } from './learning/learning.repository.js'
import { createLearningRouter } from './learning/learning.router.js'
import { LearningProgressRepository } from './learning/learning-progress.repository.js'
import { createLearningProgressRouter } from './learning/learning-progress.router.js'
import { ContentAccessService } from './content/content-access.service.js'
import { PostgresContentRepository } from './content/content.repository.js'
import { LocalContentStorage } from './content/content-storage.js'
import { createContentRouter } from './content/content.router.js'
import { SupabaseContentAccessService } from './content/supabase-content-access.service.js'
import { createCronRouter } from './cron/cron.router.js'

type AppDependencies = Pick<AppConfig,
  | 'contentAccessTtlSeconds'
  | 'contentSigningSecret'
  | 'contentStorageRoot'
  | 'contentStorageDriver'
  | 'corsOrigin'
  | 'cronSecret'
  | 'jwtSecret'
  | 'publicApiBaseUrl'
  | 'supabaseSecretKey'
  | 'supabaseStorageBucket'
  | 'supabaseUrl'
> & {
  pool: Pool
}

export function createApp({
  pool,
  corsOrigin,
  cronSecret,
  jwtSecret,
  publicApiBaseUrl,
  contentStorageRoot,
  contentSigningSecret,
  contentAccessTtlSeconds,
  contentStorageDriver,
  supabaseUrl,
  supabaseSecretKey,
  supabaseStorageBucket,
}: AppDependencies) {
  const app = express()

  app.disable('x-powered-by')
  app.use(requestContext)
  app.use(securityHeaders)
  if (corsOrigin) {
    app.use(cors({ origin: corsOrigin, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }))
  }
  app.use(express.json({ limit: '32kb' }))

  app.get(['/health', '/api/v1/health'], (_request, response) => {
    response.status(200).json({ status: 'ok' })
  })

  app.get(['/ready', '/api/v1/ready'], asyncHandler(async (_request, response) => {
    await pool.query('SELECT 1')
    response.status(200).json({ status: 'ready' })
  }))

  const contentAccessService = new ContentAccessService({
    publicApiBaseUrl,
    signingSecret: contentSigningSecret,
    ttlSeconds: contentAccessTtlSeconds,
  })
  const contentAccessProvider = contentStorageDriver === 'supabase'
    ? new SupabaseContentAccessService({
        bucket: supabaseStorageBucket,
        secretKey: supabaseSecretKey ?? '',
        supabaseUrl: supabaseUrl ?? '',
        ttlSeconds: contentAccessTtlSeconds,
      })
    : contentAccessService
  const learningRepository = new LearningRepository(pool, contentAccessProvider)
  const { coursesRouter, lessonsRouter } = createLearningRouter(learningRepository)
  app.use('/api/v1/courses', coursesRouter)
  app.use('/api/v1/lessons', lessonsRouter)
  if (contentStorageDriver === 'local') {
    app.use('/api/v1/content-assets', createContentRouter({
      accessService: contentAccessService,
      repository: new PostgresContentRepository(pool),
      storage: new LocalContentStorage(contentStorageRoot),
    }))
  }

  app.use('/api/v1/auth', createAuthRouter({
    repository: new PostgresAuthRepository(pool),
    jwtSecret,
  }))
  app.use('/api/v1/cron', createCronRouter({ cronSecret, pool }))
  app.use('/api/v1', createLearningProgressRouter(new LearningProgressRepository(pool), jwtSecret))

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
