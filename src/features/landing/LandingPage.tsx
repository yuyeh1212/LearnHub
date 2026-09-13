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
              <p className="eyebrow">想補技能、換跑道，先從能做出成果的課開始</p>
              <h1 id="hero-title">學一項能用上的技能，<br /><span>把下一步走穩</span></h1>
              <p className="hero__summary">把課程、練習和作品整理在一起，學完不只看過，也能留下進度和成果。</p>
              <div className="hero__actions"><a href="#explore"><Button>查看所有課程</Button></a></div>
            </div>
            <div className="hero-map" aria-label="學習路線示意">
              <div className="hero-map__topline"><span>課程資料</span><span>{isLoading ? '載入中' : `已載入 ${courses.length} 門課程`}</span></div>
              <div className="hero-map__route"><div className="route-node route-node--done"><b>01</b><span>先選方向</span></div><div className="route-line route-line--done" /><div className="route-node route-node--active"><b>02</b><span>開始上課</span></div><div className="route-line" /><div className="route-node"><b>03</b><span>留下作品</span></div></div>
              {firstCourse ? <div className="hero-map__lesson"><div className="lesson-signal" aria-hidden="true"><i /><i /><i /><i /></div><div><small>推薦課程</small><strong>{firstCourse.title}</strong></div><a href={`#lesson/${firstCourse.id}`}>開始</a></div> : <p className="hero-map__empty">課程載入後，推薦內容會放在這裡。</p>}
            </div>
          </section>

          <section className="courses-section" id="explore" aria-labelledby="courses-title">
            <div className="section-heading section-heading--inline"><div><p className="eyebrow">精選課程</p><h2 id="courses-title">用接近工作現場的練習，把技能補起來</h2></div><a href="#explore">查看課程目錄 →</a></div>
            {activeQuery && !isLoading && !error && <p className="course-search-status" role="status">{courses.length ? `找到 ${courses.length} 門和「${activeQuery}」有關的課程。` : `目前沒有和「${activeQuery}」有關的課程。`}</p>}
            <div aria-labelledby="courses-title" className="course-grid" id="featured-course-results" tabIndex={-1}>
              {isLoading && <div className="course-search-empty" role="status"><h3>正在載入課程</h3><p>正在抓最新課程，等一下就好。</p></div>}
              {error && <div className="course-search-empty" role="alert"><h3>課程暫時載不進來</h3><p>{error}</p><button type="button" onClick={retry}>重新整理課程</button></div>}
              {!isLoading && !error && courses.length > 0 && courses.map((course) => <CourseCard key={course.id} course={course} />)}
              {!isLoading && !error && courses.length === 0 && <div className="course-search-empty"><h3>沒有找到相關課程</h3><p>可以試試 React、資料分析或 UX。</p></div>}
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
      <footer className="site-footer"><div><strong>LearnHub</strong><p>把學過的東西，整理成看得見的進度。</p></div><div><a href="#explore">找課程</a><a href="#learning">我的學習</a></div><p>© 2026 LearnHub</p></footer>
    </div>
  )
}
