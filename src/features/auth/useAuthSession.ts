import { useCallback, useEffect, useState } from 'react'
import type { AuthenticatedUser, AuthenticationResult } from '../../contracts/auth'
import * as authApi from '../../lib/authApi'
import { notifyAuthSessionExpired, subscribeAuthSessionExpired } from '../../lib/authSessionEvents'

const sessionStorageKey = 'learnhub.authentication'
const sessionExpirySkewMs = 5_000

type StoredAuthentication = Pick<AuthenticationResult, 'accessToken' | 'expiresInSeconds' | 'tokenType' | 'user'> & {
  expiresAt: number
}

function isAuthenticationExpired(authentication: StoredAuthentication) {
  return authentication.expiresAt - sessionExpirySkewMs <= Date.now()
}

function readStoredAuthentication(): StoredAuthentication | null {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(sessionStorageKey) ?? 'null')
    if (
      !value
      || typeof value !== 'object'
      || !('accessToken' in value)
      || !('expiresAt' in value)
      || !('user' in value)
      || typeof value.accessToken !== 'string'
      || typeof value.expiresAt !== 'number'
    ) {
      window.sessionStorage.removeItem(sessionStorageKey)
      return null
    }

    const authentication = value as StoredAuthentication
    if (isAuthenticationExpired(authentication)) {
      window.sessionStorage.removeItem(sessionStorageKey)
      return null
    }

    return authentication
  } catch {
    window.sessionStorage.removeItem(sessionStorageKey)
    return null
  }
}

export function useAuthSession() {
  const [authentication, setAuthentication] = useState<StoredAuthentication | null>(readStoredAuthentication)
  const [isRestoring, setIsRestoring] = useState(Boolean(authentication))

  const clearAuthentication = useCallback(() => {
    window.sessionStorage.removeItem(sessionStorageKey)
    setAuthentication(null)
  }, [])

  const saveAuthentication = useCallback((result: AuthenticationResult) => {
    const next: StoredAuthentication = {
      accessToken: result.accessToken,
      expiresAt: Date.now() + (result.expiresInSeconds * 1_000),
      expiresInSeconds: result.expiresInSeconds,
      tokenType: result.tokenType,
      user: result.user,
    }
    window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(next))
    setAuthentication(next)
  }, [])

  useEffect(() => subscribeAuthSessionExpired(() => clearAuthentication()), [clearAuthentication])

  useEffect(() => {
    if (!authentication) return

    const delayMs = authentication.expiresAt - Date.now() - sessionExpirySkewMs
    if (delayMs <= 0) {
      clearAuthentication()
      notifyAuthSessionExpired('expired')
      return
    }

    const timeoutId = window.setTimeout(() => {
      clearAuthentication()
      notifyAuthSessionExpired('expired')
    }, delayMs)

    return () => window.clearTimeout(timeoutId)
  }, [authentication?.expiresAt, clearAuthentication])

  useEffect(() => {
    if (!authentication) {
      setIsRestoring(false)
      return
    }

    if (isAuthenticationExpired(authentication)) {
      clearAuthentication()
      notifyAuthSessionExpired('expired')
      setIsRestoring(false)
      return
    }

    let isCurrent = true
    setIsRestoring(true)
    void authApi.getCurrentUser(authentication.accessToken)
      .then((user) => {
        if (!isCurrent) return
        const next = { ...authentication, user }
        window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(next))
        setAuthentication(next)
      })
      .catch(() => {
        if (isCurrent) clearAuthentication()
      })
      .finally(() => {
        if (isCurrent) setIsRestoring(false)
      })

    return () => { isCurrent = false }
  }, [authentication?.accessToken, clearAuthentication])

  const authenticate = useCallback(async (
    mode: 'login' | 'register',
    input: { displayName?: string; email: string; password: string },
  ) => {
    const result = mode === 'login'
      ? await authApi.login({ email: input.email, password: input.password })
      : await authApi.register({ displayName: input.displayName?.trim() ?? '', email: input.email, password: input.password })
    saveAuthentication(result)
    return result.user
  }, [saveAuthentication])

  return {
    accessToken: authentication?.accessToken ?? null,
    authenticate,
    isRestoring,
    signOut: clearAuthentication,
    user: authentication?.user as AuthenticatedUser | null,
  }
}
