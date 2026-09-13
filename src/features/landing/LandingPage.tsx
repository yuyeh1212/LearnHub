import { useState } from 'react'
import type { AuthenticatedUser } from '../../contracts/auth'
import { CourseCard } from '../../components/CourseCard'
import { SiteHeader } from '../../components/SiteHeader'
import { Button } from '../../components/ui/Button'
import { useCourseCatalog } from './useCourseCatalog'
import './landing.css'

interface LandingPageProps {
  authUser: AuthenticatedUser | null
  onRegister: () => void
  onSignIn: () => void
  onSignOut: () => void
}

export function LandingPage({ authUser, onRegister, onSignIn, onSignOut }: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { activeQuery, courses, error, hasMore, isLoading, isLoadingMore, loadMore, loadMoreError, retry } = useCourseCatalog(searchQuery)
  const firstCourse = courses[0]

  const handleSearchSubmit = () => {
    const results = document.getElementById('featured-course-results')
    if (!results) return

    results.focus({ preventScroll: true })
    results.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <div className="landing-page">
      <a className="skip-link" href="#main-content">跳至主要內容</a>
      <div className="landing-shell">
        <SiteHeader authUser={authUser} searchQuery={searchQuery} searchResults={courses} onRegister={onRegister} onSearchQueryChange={setSearchQuery} onSearchSubmit={handleSearchSubmit} onSignIn={onSignIn} onSignOut={onSignOut} />
        <main id="main-content">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero__content">
              <p className="eyebrow">為職涯下一步，累積能被看見的實戰能力</p>
              <h1 id="hero-title">學習實戰技能，<br /><span>打造你的卓越職涯</span></h1>
              <p className="hero__summary">從有脈絡的課程開始，將每一次練習轉成作品、成果與下一個機會。</p>
              <div className="hero__actions"><a href="#explore"><Button>探索所有課程</Button></a></div>
            </div>
            <div className="hero-map" aria-label="職涯學習路徑示意">
              <div className="hero-map__topline"><span>課程資料即時載入</span><span>{isLoading ? '同步中' : `已載入 ${courses.length} 門課程`}</span></div>
              <div className="hero-map__route"><div className="route-node route-node--done"><b>01</b><span>探索方向</span></div><div className="route-line route-line--done" /><div className="route-node route-node--active"><b>02</b><span>開始學習</span></div><div className="route-line" /><div className="route-node"><b>03</b><span>累積成果</span></div></div>
              {firstCourse ? <div className="hero-map__lesson"><div className="lesson-signal" aria-hidden="true"><i /><i /><i /><i /></div><div><small>推薦課程</small><strong>{firstCourse.title}</strong></div><a href={`#lesson/${firstCourse.id}`}>開始</a></div> : <p className="hero-map__empty">課程準備完成後會顯示在這裡。</p>}
            </div>
          </section>

          <section className="courses-section" id="explore" aria-labelledby="courses-title">
            <div className="section-heading section-heading--inline"><div><p className="eyebrow">精選課程</p><h2 id="courses-title">用真實工作情境，把能力練得更扎實</h2></div><a href="#explore">探索課程目錄 →</a></div>
            {activeQuery && !isLoading && !error && <p className="course-search-status" role="status">{courses.length ? `已載入 ${courses.length} 門與「${activeQuery}」相關的課程。` : `找不到與「${activeQuery}」相關的課程。`}</p>}
            <div aria-labelledby="courses-title" className="course-grid" id="featured-course-results" tabIndex={-1}>
              {isLoading && <div className="course-search-empty" role="status"><h3>正在載入課程</h3><p>請稍候，正在取得最新課程內容。</p></div>}
              {error && <div className="course-search-empty" role="alert"><h3>暫時無法取得課程</h3><p>{error}</p><button type="button" onClick={retry}>重新整理課程</button></div>}
              {!isLoading && !error && courses.length > 0 && courses.map((course) => <CourseCard key={course.id} course={course} />)}
              {!isLoading && !error && courses.length === 0 && <div className="course-search-empty"><h3>沒有符合的課程</h3><p>試試看搜尋 React、資料分析或 UX。</p></div>}
            </div>
            {!isLoading && !error && courses.length > 0 && (hasMore || loadMoreError) && (
              <div className="course-load-more" aria-live="polite">
                {loadMoreError && <p className="course-load-more__error" role="alert">{loadMoreError}</p>}
                {hasMore && <button type="button" disabled={isLoadingMore} onClick={loadMore}>{isLoadingMore ? '正在載入更多課程…' : '載入更多課程'}</button>}
              </div>
            )}
          </section>

        </main>
      </div>
      <footer className="site-footer"><div><strong>LearnHub</strong><p>讓每一次學習，成為你職涯向前的證據。</p></div><div><a href="#explore">探索課程</a><a href="#learning">我的學習</a></div><p>© 2026 LearnHub</p></footer>
    </div>
  )
}
