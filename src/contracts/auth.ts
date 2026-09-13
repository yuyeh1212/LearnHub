export type UserRole = 'learner' | 'admin'

export interface AuthenticatedUser {
  id: string
  email: string
  displayName: string
  role: UserRole
}

export interface AuthenticationResult {
  accessToken: string
  tokenType: 'Bearer'
  expiresInSeconds: number
  user: AuthenticatedUser
}

export interface PasswordResetRequestResult {
  expiresInMinutes: number
  message: string
  resetToken?: string
}

export interface PasswordResetResult {
  message: string
}
