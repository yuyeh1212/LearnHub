import { BrandMark } from './ui/BrandMark'
import type { AuthenticatedUser } from '../contracts/auth'

interface SearchResult {
  category: string
  id: string
  title: string
}

interface SiteHeaderProps {
  authUser?: AuthenticatedUser | null
  mode?: 'landing' | 'learning' | 'player'
  onRegister?: () => void
  searchQuery?: string
  searchResults?: SearchResult[]
  onSignIn?: () => void
  onSignOut?: () => void
  onSearchSubmit?: () => void
  onSearchQueryChange?: (value: string) => void
}

function getInitials(displayName: string) {
  return displayName.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'LH'
}

export function SiteHeader({ authUser = null, mode = 'landing', onRegister, onSearchQueryChange, onSearchSubmit, onSignIn, onSignOut, searchQuery = '', searchResults = [] }: SiteHeaderProps) {
  const hasSearchQuery = Boolean(searchQuery.trim())

  if (mode === 'player') {
    return (
      <header className="site-header site-header--player">
        <a href="#home" className="site-header__brand"><BrandMark /></a>
        <a href={authUser ? '#learning' : '#home'} className="back-link">← 回到我的學習</a>
        {authUser ? <div className="site-header__profile" aria-label="使用者帳戶"><span className="profile-avatar" aria-hidden="true">{getInitials(authUser.displayName)}</span><span className="profile-name">{authUser.displayName}</span><button type="button" onClick={onSignOut}>登出</button></div> : <div className="site-header__actions"><button className="signin-button" type="button" onClick={onSignIn}>登入</button><button className="register-button" type="button" onClick={onRegister}>免費註冊</button></div>}
      </header>
    )
  }

  return (
    <header className={`site-header ${mode === 'learning' ? 'site-header--learning' : ''}`.trim()}>
      <a href="#home" className="site-header__brand"><BrandMark /></a>
      <nav className="site-header__nav" aria-label="主要導覽">
        <a href={mode === 'learning' ? '#home' : '#explore'}>找課程</a>
        <a aria-current={mode === 'learning' ? 'page' : undefined} href="#learning">我的學習</a>
      </nav>
      {mode === 'landing' && <form className="site-search" onSubmit={(event) => { event.preventDefault(); onSearchSubmit?.() }} role="search">
        <span className="site-search__icon" aria-hidden="true" />
        <input aria-controls="featured-course-results" aria-label="搜尋課程" onChange={(event) => onSearchQueryChange?.(event.target.value)} placeholder="搜尋課程、技能或關鍵字" type="search" value={searchQuery} />
        {hasSearchQuery && <aside className="site-search__results" aria-label="即時搜尋結果"><p className="site-search__summary" role="status">{searchResults.length ? `目前看到 ${searchResults.length} 門課程` : '目前沒有符合的課程'}</p>{searchResults.length ? <ul>{searchResults.map((course) => <li key={course.id}><a href={`#lesson/${course.id}`}><span>{course.category}</span><strong>{course.title}</strong></a></li>)}</ul> : <p className="site-search__empty">可以試試 React、資料分析或 UX。</p>}</aside>}
      </form>}
      <div className="site-header__actions">
        {authUser ? <><a className="site-header__user" href="#learning">{authUser.displayName}</a><button className="signin-button" type="button" onClick={onSignOut}>登出</button></> : <><button className="signin-button" type="button" onClick={onSignIn}>登入</button><button className="register-button" type="button" onClick={onRegister}>免費註冊</button></>}
      </div>
    </header>
  )
}
