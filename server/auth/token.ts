import { SignJWT, jwtVerify } from 'jose'
import type { UserRole } from '../../src/contracts/auth.js'

const accessTokenLifetimeSeconds = 15 * 60
const tokenAlgorithm = 'HS256'

export type AccessTokenClaims = {
  userId: string
  email: string
  role: UserRole
}

function getSecret(secret: string) {
  return new TextEncoder().encode(secret)
}

export async function createAccessToken(claims: AccessTokenClaims, secret: string) {
  return new SignJWT({ email: claims.email, role: claims.role })
    .setProtectedHeader({ alg: tokenAlgorithm, typ: 'JWT' })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(`${accessTokenLifetimeSeconds}s`)
    .sign(getSecret(secret))
}

export async function verifyAccessToken(token: string, secret: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, getSecret(secret), { algorithms: [tokenAlgorithm] })

  if (
    !payload.sub
    || typeof payload.email !== 'string'
    || (payload.role !== 'learner' && payload.role !== 'admin')
  ) {
    throw new Error('Invalid access token claims')
  }

  return { userId: payload.sub, email: payload.email, role: payload.role }
}

export { accessTokenLifetimeSeconds }
