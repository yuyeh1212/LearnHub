export type AuthSessionExpiredReason = 'expired' | 'unauthorized'

const authSessionExpiredEventName = 'learnhub:auth-session-expired'

export function notifyAuthSessionExpired(reason: AuthSessionExpiredReason = 'unauthorized') {
  window.dispatchEvent(new CustomEvent(authSessionExpiredEventName, { detail: { reason } }))
}

export function subscribeAuthSessionExpired(
  handler: (reason: AuthSessionExpiredReason) => void,
) {
  const listener = (event: Event) => {
    const reason = event instanceof CustomEvent && event.detail?.reason === 'expired'
      ? 'expired'
      : 'unauthorized'
    handler(reason)
  }

  window.addEventListener(authSessionExpiredEventName, listener)
  return () => window.removeEventListener(authSessionExpiredEventName, listener)
}
