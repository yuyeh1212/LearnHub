import { Pool } from 'pg'

type DatabasePoolOptions = {
  serverless?: boolean
}

export function createDatabasePool(connectionString: string, options: DatabasePoolOptions = {}) {
  return new Pool({
    connectionString,
    ...(options.serverless ? {
      allowExitOnIdle: true,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 5_000,
      max: 1,
      ssl: { rejectUnauthorized: false },
    } : {}),
  })
}
