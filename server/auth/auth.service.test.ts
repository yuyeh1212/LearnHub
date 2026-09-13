import assert from 'node:assert/strict'
import test from 'node:test'
import { compare } from 'bcryptjs'
import type { AuthRepository, NewPasswordResetToken, NewUser, UserRecord } from './auth.repository.js'
import { AuthService } from './auth.service.js'
import { verifyAccessToken } from './token.js'

const jwtSecret = 'local-test-secret-that-is-long-enough-for-hs256'

class InMemoryAuthRepository implements AuthRepository {
  private readonly resetTokens = new Map<string, NewPasswordResetToken & { usedAt: Date | null }>()
  private readonly users = new Map<string, UserRecord>()

  async findByEmail(email: string) {
    return [...this.users.values()].find((user) => user.email === email) ?? null
  }

  async findById(id: string) {
    return this.users.get(id) ?? null
  }

  async create(user: NewUser) {
    if (await this.findByEmail(user.email)) {
      throw { code: '23505' }
    }

    this.users.set(user.id, user)
    return user
  }

  async createPasswordResetToken(token: NewPasswordResetToken) {
    this.resetTokens.set(token.tokenHash, { ...token, usedAt: null })
  }

  async resetPasswordWithToken(tokenHash: string, passwordHash: string) {
    const token = this.resetTokens.get(tokenHash)
    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      return null
    }

    const user = this.users.get(token.userId)
    if (!user) {
      return null
    }

    const updatedUser = { ...user, passwordHash }
    this.users.set(user.id, updatedUser)

    for (const resetToken of this.resetTokens.values()) {
      if (resetToken.userId === user.id && !resetToken.usedAt) {
        resetToken.usedAt = new Date()
      }
    }

    return updatedUser
  }
}

test('register stores only a password hash and returns a verifiable access token', async () => {
  const repository = new InMemoryAuthRepository()
  const service = new AuthService(repository, jwtSecret)
  const result = await service.register({
    email: '  LEARNER@example.com ',
    password: 'a-strong-local-password',
    displayName: '  LearnHub Learner ',
  })

  const storedUser = await repository.findById(result.user.id)
  assert.ok(storedUser)
  assert.notEqual(storedUser.passwordHash, 'a-strong-local-password')
  assert.equal(await compare('a-strong-local-password', storedUser.passwordHash), true)
  assert.deepEqual(await verifyAccessToken(result.accessToken, jwtSecret), {
    userId: result.user.id,
    email: 'learner@example.com',
    role: 'learner',
  })
})

test('login rejects an incorrect password without identifying which credential failed', async () => {
  const repository = new InMemoryAuthRepository()
  const service = new AuthService(repository, jwtSecret)
  await service.register({
    email: 'learner@example.com',
    password: 'a-strong-local-password',
    displayName: 'LearnHub Learner',
  })

  await assert.rejects(
    () => service.login({ email: 'learner@example.com', password: 'wrong-password-value' }),
    { code: 'INVALID_CREDENTIALS', status: 401 },
  )
})

test('password reset changes the stored password and consumes the token', async () => {
  const repository = new InMemoryAuthRepository()
  const service = new AuthService(repository, jwtSecret)
  await service.register({
    email: 'learner@example.com',
    password: 'a-strong-local-password',
    displayName: 'LearnHub Learner',
  })

  const resetRequest = await service.requestPasswordReset({ email: 'LEARNER@example.com' })
  assert.equal(resetRequest.expiresInMinutes, 30)
  assert.ok(resetRequest.resetToken)

  await service.resetPassword({
    token: resetRequest.resetToken,
    password: 'a-new-strong-local-password',
  })

  await assert.rejects(
    () => service.login({ email: 'learner@example.com', password: 'a-strong-local-password' }),
    { code: 'INVALID_CREDENTIALS', status: 401 },
  )

  const login = await service.login({ email: 'learner@example.com', password: 'a-new-strong-local-password' })
  assert.equal(login.user.email, 'learner@example.com')
  await assert.rejects(
    () => service.resetPassword({ token: resetRequest.resetToken!, password: 'another-strong-password' }),
    { code: 'PASSWORD_RESET_TOKEN_INVALID', status: 400 },
  )
})

test('password reset request does not reveal unknown email addresses', async () => {
  const repository = new InMemoryAuthRepository()
  const service = new AuthService(repository, jwtSecret)
  const resetRequest = await service.requestPasswordReset({ email: 'missing@example.com' })

  assert.equal(resetRequest.expiresInMinutes, 30)
  assert.equal(resetRequest.resetToken, null)
})
