import { useEffect, useId, useState } from 'react'
import { AuthApiError } from '../../lib/authApi'
import { Button } from '../../components/ui/Button'
import './authenticationDialog.css'

interface AuthenticationDialogProps {
  isOpen: boolean
  mode: 'login' | 'register'
  onClose: () => void
  onSubmit: (mode: 'login' | 'register', input: { displayName?: string; email: string; password: string }) => Promise<void>
}

export function AuthenticationDialog({ isOpen, mode, onClose, onSubmit }: AuthenticationDialogProps) {
  const [activeMode, setActiveMode] = useState(mode)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const titleId = useId()
  const errorId = useId()

  useEffect(() => {
    if (isOpen) {
      setActiveMode(mode)
      setError('')
    }
  }, [isOpen, mode])

  if (!isOpen) return null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await onSubmit(activeMode, { displayName, email, password })
      setPassword('')
      onClose()
    } catch (reason) {
      setError(reason instanceof AuthApiError ? reason.message : '暫時無法完成帳戶操作，請稍後再試。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isRegistering = activeMode === 'register'
  return (
    <div className="authentication-dialog" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section aria-describedby={error ? errorId : undefined} aria-labelledby={titleId} aria-modal="true" className="authentication-dialog__panel" role="dialog">
        <button aria-label="關閉登入視窗" className="authentication-dialog__close" type="button" onClick={onClose}>×</button>
        <p className="authentication-dialog__eyebrow">LEARNHUB 帳戶</p>
        <h1 id={titleId}>{isRegistering ? '建立帳戶，開始累積學習紀錄' : '登入，接續你的學習'}</h1>
        <p className="authentication-dialog__summary">{isRegistering ? '註冊後可加入課程，並將播放進度同步到你的帳戶。' : '登入後可從上次停留的單元繼續學習。'}</p>
        <form onSubmit={handleSubmit}>
          {isRegistering && <label>顯示名稱<input autoComplete="name" disabled={isSubmitting} maxLength={100} minLength={1} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>}
          <label>電子信箱<input autoComplete="email" disabled={isSubmitting} maxLength={254} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>密碼<input aria-describedby={isRegistering ? 'password-hint' : undefined} autoComplete={isRegistering ? 'new-password' : 'current-password'} disabled={isSubmitting} maxLength={256} minLength={12} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {isRegistering && <p className="authentication-dialog__hint" id="password-hint">至少 12 個字元</p>}
          {error && <p className="authentication-dialog__error" id={errorId} role="alert">{error}</p>}
          <Button disabled={isSubmitting} type="submit">{isSubmitting ? '處理中…' : isRegistering ? '建立免費帳戶' : '登入並繼續學習'}</Button>
        </form>
        <p className="authentication-dialog__switch">{isRegistering ? '已經有帳戶？' : '還沒有帳戶？'} <button type="button" onClick={() => { setActiveMode(isRegistering ? 'login' : 'register'); setError('') }}>{isRegistering ? '改為登入' : '免費註冊'}</button></p>
      </section>
    </div>
  )
}
