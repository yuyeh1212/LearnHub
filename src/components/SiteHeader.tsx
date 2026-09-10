import { BrandMark } from './ui/BrandMark'

interface SiteHeaderProps {
  mode?: 'landing' | 'player'
}

export function SiteHeader({ mode = 'landing' }: SiteHeaderProps) {
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
      <label className="site-search">
        <span className="site-search__icon" aria-hidden="true" />
        <input type="search" placeholder="搜尋你想學習的技能" aria-label="搜尋課程" />
      </label>
      <div className="site-header__actions">
        <button className="signin-button" type="button">登入</button>
        <button className="register-button" type="button">免費註冊</button>
      </div>
    </header>
  )
}
