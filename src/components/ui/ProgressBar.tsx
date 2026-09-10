interface ProgressBarProps {
  value: number
  label: string
  size?: 'small' | 'medium'
}

export function ProgressBar({ value, label, size = 'medium' }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(value, 100))

  return (
    <div className={`progress progress--${size}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue}>
      <span className="progress__value" style={{ width: `${safeValue}%` }} />
    </div>
  )
}
