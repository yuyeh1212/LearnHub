import { Router } from 'express'
import type { Pool } from 'pg'
import { asyncHandler } from '../http/async-handler.js'
import { ProblemError } from '../http/problem.js'

type CronRouterDependencies = {
  cronSecret: string | null
  pool: Pool
}

function verifyCronRequest(authorization: string | undefined, cronSecret: string | null) {
  return Boolean(cronSecret && authorization === `Bearer ${cronSecret}`)
}

export function createCronRouter({ cronSecret, pool }: CronRouterDependencies) {
  const router = Router()

  router.get('/supabase-heartbeat', asyncHandler(async (request, response) => {
    if (!verifyCronRequest(request.header('authorization'), cronSecret)) {
      throw new ProblemError({
        status: 401,
        code: 'CRON_UNAUTHORIZED',
        title: 'Unauthorized',
        detail: 'A valid cron authorization header is required.',
      })
    }

    await pool.query('SELECT 1')
    response.status(200).json({ status: 'ok' })
  }))

  return router
}
