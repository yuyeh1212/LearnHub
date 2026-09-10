import type { Pool } from 'pg'
import type { UserRole } from '../../src/contracts/auth.js'

export type UserRecord = {
  id: string
  email: string
  displayName: string
  passwordHash: string
  role: UserRole
}

export type NewUser = UserRecord

export interface AuthRepository {
  findByEmail(email: string): Promise<UserRecord | null>
  findById(id: string): Promise<UserRecord | null>
  create(user: NewUser): Promise<UserRecord>
}

export class PostgresAuthRepository implements AuthRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRecord>(
      `SELECT id, email, display_name AS "displayName", password_hash AS "passwordHash", role
       FROM users
       WHERE lower(email) = lower($1)`,
      [email],
    )

    return result.rows[0] ?? null
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRecord>(
      `SELECT id, email, display_name AS "displayName", password_hash AS "passwordHash", role
       FROM users
       WHERE id = $1`,
      [id],
    )

    return result.rows[0] ?? null
  }

  async create(user: NewUser): Promise<UserRecord> {
    const result = await this.pool.query<UserRecord>(
      `INSERT INTO users (id, email, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, display_name AS "displayName", password_hash AS "passwordHash", role`,
      [user.id, user.email, user.passwordHash, user.displayName, user.role],
    )

    return result.rows[0]
  }
}
