import assert from 'node:assert/strict'
import test from 'node:test'
import { compare } from 'bcryptjs'
import type { AuthRepository, NewUser, UserRecord } from './auth.repository.js'
import { AuthService } from './auth.service.js'
import { verifyAccessToken } from './token.js'

const jwtSecret = 'local-test-secret-that-is-long-enough-for-hs256'

class InMemoryAuthRepository implements AuthRepository {
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
