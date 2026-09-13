import type { AuthenticatedUser, AuthenticationResult } from '../contracts/auth'
import { notifyAuthSessionExpired } from './authSessionEvents'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3001/api/v1'

type ProblemResponse = {
  detail?: string
  title?: string
}

export class AuthApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

async function request<T>(
  path: string,
  options: RequestInit,
  requestOptions: { notifyOnUnauthorized?: boolean } = {},
): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, options)
  } catch {
    throw new AuthApiError('目前無法連線到帳戶服務，請稍後再試。')
  }

  if (!response.ok) {
    const problem: ProblemResponse | null = await response.json().catch(() => null)
    if (response.status === 401 && requestOptions.notifyOnUnauthorized) {
      notifyAuthSessionExpired('unauthorized')
    }
    throw new AuthApiError(problem?.detail || problem?.title || '帳戶服務暫時無法回應，請稍後再試。', response.status)
  }

  return response.json() as Promise<T>
}

function jsonRequest(body: unknown, accessToken?: string): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  }
}

export function register(input: { displayName: string; email: string; password: string }) {
  return request<AuthenticationResult>('/auth/register', jsonRequest(input))
}

export function login(input: { email: string; password: string }) {
  return request<AuthenticationResult>('/auth/login', jsonRequest(input))
}

export function getCurrentUser(accessToken: string) {
  return request<AuthenticatedUser>('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }, { notifyOnUnauthorized: true })
}
