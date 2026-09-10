import { BrandMark } from './ui/BrandMark'

interface SearchResult {
  category: string
  id: string
  title: string
}

interface SiteHeaderProps {
  mode?: 'landing' | 'player'
  searchQuery?: string
  searchResults?: SearchResult[]
  onSearchSubmit?: () => void
  onSearchQueryChange?: (value: string) => void
}

export function SiteHeader({ mode = 'landing', searchQuery = '', searchResults = [], onSearchSubmit, onSearchQueryChange }: SiteHeaderProps) {
  const hasSearchQuery = Boolean(searchQuery.trim())

  if (mode === 'player') {
    return (
      <header className="site-header site-header--player">
        <a href="#home" className="site-header__brand"><BrandMark /></a>
        <a href="#home" className="back-link">← 回到我的課程</a>
        <div className="site-header__profile" aria-label="使用者帳戶">
          <span className="profile-avatar" aria-hidden="true">AC</span>
          <span className="profile-name">Alex Chen</span>
        </div>
      </header>
    )
  }

  return (
    <header className="site-header">
      <a href="#home" className="site-header__brand"><BrandMark /></a>
      <nav className="site-header__nav" aria-label="主要導覽">
        <a href="#explore">探索課程</a>
        <a href="#paths">職涯路徑</a>
      </nav>
      <form className="site-search" onSubmit={(event) => { event.preventDefault(); onSearchSubmit?.() }} role="search">
        <span className="site-search__icon" aria-hidden="true" />
        <input aria-controls="featured-course-results" aria-label="搜尋課程" onChange={(event) => onSearchQueryChange?.(event.target.value)} placeholder="搜尋你想學習的技能" type="search" value={searchQuery} />
        {hasSearchQuery && <aside className="site-search__results" aria-label="即時搜尋結果"><p className="site-search__summary" role="status">{searchResults.length ? `找到 ${searchResults.length} 門相關課程` : '沒有符合的課程'}</p>{searchResults.length ? <ul>{searchResults.map((course) => <li key={course.id}><button type="button" onClick={onSearchSubmit}><span>{course.category}</span><strong>{course.title}</strong></button></li>)}</ul> : <p className="site-search__empty">試試看搜尋 React、資料分析或 UX。</p>}</aside>}
      </form>
      <div className="site-header__actions">
        <button className="signin-button" type="button">登入</button>
        <button className="register-button" type="button">免費註冊</button>
      </div>
    </header>
  )
}
