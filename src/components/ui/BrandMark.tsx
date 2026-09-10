interface BrandMarkProps {
  compact?: boolean
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <span className="brand-mark" aria-label="LearnHub">
      <span className="brand-mark__glyph" aria-hidden="true"><i /></span>
      {!compact && <span className="brand-mark__word">LearnHub</span>}
    </span>
  )
}
