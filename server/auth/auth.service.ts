import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { compare, hash } from 'bcryptjs'
import type { AuthenticatedUser, AuthenticationResult, PasswordResetResult, UserRole } from '../../src/contracts/auth.js'
import { ProblemError } from '../http/problem.js'
import type { AuthRepository, UserRecord } from './auth.repository.js'
import { accessTokenLifetimeSeconds, createAccessToken } from './token.js'

const passwordHashRounds = 12
const missingUserPasswordHash = hash('not-a-real-password', passwordHashRounds)
export const passwordResetTokenLifetimeMinutes = 30

export type RegisterInput = {
  email: string
  password: string
  displayName: string
}

export type LoginInput = Pick<RegisterInput, 'email' | 'password'>
export type PasswordResetRequestInput = Pick<RegisterInput, 'email'>
export type PasswordResetInput = {
  password: string
  token: string
}
export type PasswordResetRequestResult = {
  expiresInMinutes: number
  resetToken: string | null
}

function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase('en-US')
}

function toAuthenticatedUser(user: UserRecord): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}

function createPasswordResetToken() {
  return randomBytes(32).toString('base64url')
}

function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwtSecret: string,
  ) {}

  async register(input: RegisterInput): Promise<AuthenticationResult> {
    const email = normalizeEmail(input.email)
    const existingUser = await this.repository.findByEmail(email)

    if (existingUser) {
      throw new ProblemError({
        status: 409,
        code: 'EMAIL_ALREADY_REGISTERED',
        title: 'Email Already Registered',
        detail: 'An account already uses this email address.',
      })
    }

    const user = {
      id: randomUUID(),
      email,
      displayName: input.displayName.trim(),
      passwordHash: await hash(input.password, passwordHashRounds),
      role: 'learner' as UserRole,
    }

    try {
      const createdUser = await this.repository.create(user)
      return this.createAuthenticationResult(createdUser)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ProblemError({
          status: 409,
          code: 'EMAIL_ALREADY_REGISTERED',
          title: 'Email Already Registered',
          detail: 'An account already uses this email address.',
        })
      }

      throw error
    }
  }

  async login(input: LoginInput): Promise<AuthenticationResult> {
    const user = await this.repository.findByEmail(normalizeEmail(input.email))
    const passwordHash = user?.passwordHash ?? await missingUserPasswordHash
    const isPasswordValid = await compare(input.password, passwordHash)

    if (!user || !isPasswordValid) {
      throw new ProblemError({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        title: 'Invalid Credentials',
        detail: 'The email address or password is incorrect.',
      })
    }

    return this.createAuthenticationResult(user)
  }

  async requestPasswordReset(input: PasswordResetRequestInput): Promise<PasswordResetRequestResult> {
    const user = await this.repository.findByEmail(normalizeEmail(input.email))

    if (!user) {
      return {
        expiresInMinutes: passwordResetTokenLifetimeMinutes,
        resetToken: null,
      }
    }

    const resetToken = createPasswordResetToken()
    await this.repository.createPasswordResetToken({
      id: randomUUID(),
      userId: user.id,
      tokenHash: hashPasswordResetToken(resetToken),
      expiresAt: new Date(Date.now() + passwordResetTokenLifetimeMinutes * 60 * 1_000),
    })

    return {
      expiresInMinutes: passwordResetTokenLifetimeMinutes,
      resetToken,
    }
  }

  async resetPassword(input: PasswordResetInput): Promise<PasswordResetResult> {
    const user = await this.repository.resetPasswordWithToken(
      hashPasswordResetToken(input.token),
      await hash(input.password, passwordHashRounds),
    )

    if (!user) {
      throw new ProblemError({
        status: 400,
        code: 'PASSWORD_RESET_TOKEN_INVALID',
        title: 'Password Reset Token Invalid',
        detail: 'The password reset link is invalid or has expired.',
      })
    }

    return { message: 'Password has been reset. Please sign in with the new password.' }
  }

  async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.repository.findById(userId)

    if (!user) {
      throw new ProblemError({
        status: 401,
        code: 'UNAUTHENTICATED',
        title: 'Unauthenticated',
        detail: 'A valid access token is required.',
      })
    }

    return toAuthenticatedUser(user)
  }

  private async createAuthenticationResult(user: UserRecord): Promise<AuthenticationResult> {
    const accessToken = await createAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    }, this.jwtSecret)

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresInSeconds: accessTokenLifetimeSeconds,
      user: toAuthenticatedUser(user),
    }
  }
}
