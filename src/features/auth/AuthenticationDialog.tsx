import { useEffect, useId, useState } from 'react'
import { AuthApiError, requestPasswordReset, resetPassword } from '../../lib/authApi'
import { Button } from '../../components/ui/Button'
import './authenticationDialog.css'

type AuthenticationMode = 'login' | 'register'
type DialogMode = AuthenticationMode | 'forgot-password' | 'reset-password'

interface AuthenticationDialogProps {
  isOpen: boolean
  message?: string
  mode: AuthenticationMode
  onClose: () => void
  onSubmit: (mode: AuthenticationMode, input: { displayName?: string; email: string; password: string }) => Promise<void>
}

export function AuthenticationDialog({ isOpen, message, mode, onClose, onSubmit }: AuthenticationDialogProps) {
  const [activeMode, setActiveMode] = useState<DialogMode>(mode)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const titleId = useId()
  const summaryId = useId()
  const errorId = useId()

  useEffect(() => {
    if (isOpen) {
      setActiveMode(mode)
      setError('')
      setSuccess('')
      setResetToken('')
    }
  }, [isOpen, mode])

  if (!isOpen) return null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      if (activeMode === 'forgot-password') {
        const result = await requestPasswordReset({ email })
        setSuccess(result.resetToken
          ? `Beta 測試模式已準備好重設流程，請在 ${result.expiresInMinutes} 分鐘內設定新密碼。`
          : '如果此信箱有帳戶，我們已準備好密碼重設流程。')
        setPassword('')
        if (result.resetToken) {
          setResetToken(result.resetToken)
          setActiveMode('reset-password')
        }
        return
      }

      if (activeMode === 'reset-password') {
        await resetPassword({ password, token: resetToken })
        setPassword('')
        setResetToken('')
        setActiveMode('login')
        setSuccess('密碼已更新，請用新密碼登入。')
        return
      }

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
  const isRequestingPasswordReset = activeMode === 'forgot-password'
  const isResettingPassword = activeMode === 'reset-password'
  const summary = isRegistering
    ? '註冊後可加入課程，並將播放進度同步到你的帳戶。'
    : isRequestingPasswordReset
      ? '輸入註冊信箱後，Beta 測試模式會直接帶你完成密碼重設；正式寄信服務接上後會改由信件傳送連結。'
      : isResettingPassword
        ? '請設定一組新的密碼，完成後再重新登入。'
        : message || '登入後可從上次停留的單元繼續學習。'
  const title = isRegistering
    ? '建立帳戶，開始累積學習紀錄'
    : isRequestingPasswordReset
      ? '重設你的登入密碼'
      : isResettingPassword
        ? '設定新的密碼'
        : '登入，接續你的學習'
  const submitLabel = isSubmitting
    ? '處理中…'
    : isRegistering
      ? '建立免費帳戶'
      : isRequestingPasswordReset
        ? '取得重設密碼流程'
        : isResettingPassword
          ? '更新密碼'
          : '登入並繼續學習'

  return (
    <div className="authentication-dialog" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section aria-describedby={error ? `${summaryId} ${errorId}` : summaryId} aria-labelledby={titleId} aria-modal="true" className="authentication-dialog__panel" role="dialog">
        <button aria-label="關閉登入視窗" className="authentication-dialog__close" type="button" onClick={onClose}>×</button>
        <p className="authentication-dialog__eyebrow">LEARNHUB 帳戶</p>
        <h1 id={titleId}>{title}</h1>
        <p className="authentication-dialog__summary" id={summaryId}>{summary}</p>
        <form onSubmit={handleSubmit}>
          {isRegistering && <label>顯示名稱<input autoComplete="name" disabled={isSubmitting} maxLength={100} minLength={1} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>}
          {!isResettingPassword && <label>電子信箱<input autoComplete="email" disabled={isSubmitting} maxLength={254} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>}
          {!isRequestingPasswordReset && <label>{isResettingPassword ? '新密碼' : '密碼'}<input aria-describedby={isRegistering || isResettingPassword ? 'password-hint' : undefined} autoComplete={isRegistering || isResettingPassword ? 'new-password' : 'current-password'} disabled={isSubmitting} maxLength={256} minLength={12} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
          {(isRegistering || isResettingPassword) && <p className="authentication-dialog__hint" id="password-hint">至少 12 個字元</p>}
          {success && <p className="authentication-dialog__success" role="status">{success}</p>}
          {error && <p className="authentication-dialog__error" id={errorId} role="alert">{error}</p>}
          <Button disabled={isSubmitting} type="submit">{submitLabel}</Button>
        </form>
        {!isResettingPassword && <p className="authentication-dialog__switch">{isRegistering ? '已經有帳戶？' : isRequestingPasswordReset ? '想起密碼了？' : '還沒有帳戶？'} <button type="button" onClick={() => { setActiveMode(isRegistering || isRequestingPasswordReset ? 'login' : 'register'); setError(''); setSuccess('') }}>{isRegistering || isRequestingPasswordReset ? '改為登入' : '免費註冊'}</button></p>}
        {activeMode === 'login' && <p className="authentication-dialog__switch authentication-dialog__switch--secondary"><button type="button" onClick={() => { setActiveMode('forgot-password'); setError(''); setSuccess(''); setPassword('') }}>忘記密碼？</button></p>}
      </section>
    </div>
  )
}
