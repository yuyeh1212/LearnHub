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

export type NewPasswordResetToken = {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
}

export interface AuthRepository {
  findByEmail(email: string): Promise<UserRecord | null>
  findById(id: string): Promise<UserRecord | null>
  create(user: NewUser): Promise<UserRecord>
  createPasswordResetToken(token: NewPasswordResetToken): Promise<void>
  resetPasswordWithToken(tokenHash: string, passwordHash: string): Promise<UserRecord | null>
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

  async createPasswordResetToken(token: NewPasswordResetToken): Promise<void> {
    await this.pool.query(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [token.id, token.userId, token.tokenHash, token.expiresAt],
    )
  }

  async resetPasswordWithToken(tokenHash: string, passwordHash: string): Promise<UserRecord | null> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const tokenResult = await client.query<{ tokenId: string; userId: string }>(
        `SELECT password_reset_tokens.id AS "tokenId", password_reset_tokens.user_id AS "userId"
         FROM password_reset_tokens
         WHERE password_reset_tokens.token_hash = $1
           AND password_reset_tokens.used_at IS NULL
           AND password_reset_tokens.expires_at > now()
         FOR UPDATE`,
        [tokenHash],
      )
      const token = tokenResult.rows[0]

      if (!token) {
        await client.query('ROLLBACK')
        return null
      }

      const userResult = await client.query<UserRecord>(
        `UPDATE users
         SET password_hash = $1
         WHERE id = $2
         RETURNING id, email, display_name AS "displayName", password_hash AS "passwordHash", role`,
        [passwordHash, token.userId],
      )

      await client.query(
        `UPDATE password_reset_tokens
         SET used_at = now()
         WHERE user_id = $1
           AND used_at IS NULL`,
        [token.userId],
      )
      await client.query('COMMIT')
      return userResult.rows[0] ?? null
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}
