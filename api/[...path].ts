import { attachDatabasePool } from '@vercel/functions'
import { createRuntime } from '../server/runtime.js'

const { app, pool } = createRuntime()

attachDatabasePool(pool)

export default app
