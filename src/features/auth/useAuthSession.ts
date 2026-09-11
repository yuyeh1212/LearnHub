import { useCallback, useEffect, useState } from 'react'
import type { AuthenticatedUser, AuthenticationResult } from '../../contracts/auth'
import * as authApi from '../../lib/authApi'

const sessionStorageKey = 'learnhub.authentication'

type StoredAuthentication = Pick<AuthenticationResult, 'accessToken' | 'expiresInSeconds' | 'tokenType' | 'user'>

function readStoredAuthentication(): StoredAuthentication | null {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(sessionStorageKey) ?? 'null')
    if (
      !value
      || typeof value !== 'object'
      || !('accessToken' in value)
      || !('user' in value)
      || typeof value.accessToken !== 'string'
    ) {
      return null
    }

    return value as StoredAuthentication
  } catch {
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
      expiresInSeconds: result.expiresInSeconds,
      tokenType: result.tokenType,
      user: result.user,
    }
    window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(next))
    setAuthentication(next)
  }, [])

  useEffect(() => {
    if (!authentication) {
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
