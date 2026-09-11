import { useState } from 'react'
import type { AuthenticatedUser } from '../../contracts/auth'
import { CourseCard } from '../../components/CourseCard'
import { SiteHeader } from '../../components/SiteHeader'
import { Button } from '../../components/ui/Button'
import { useCourseCatalog } from './useCourseCatalog'
import './landing.css'

const paths = [
  { number: '01', title: '軟體工程師', description: '從前端基礎到系統設計，建立可被看見的實作能力。', skills: ['React', 'TypeScript', 'System Design'] },
  { number: '02', title: '產品經理', description: '把使用者洞察轉成能推進團隊的產品決策。', skills: ['產品策略', '數據分析', '溝通協作'] },
  { number: '03', title: 'UX 設計師', description: '用研究、流程與原型，讓設計真正改變產品體驗。', skills: ['UX Research', 'Figma', 'Design Systems'] },
]

interface LandingPageProps {
  authUser: AuthenticatedUser | null
  onRegister: () => void
  onSignIn: () => void
  onSignOut: () => void
}

export function LandingPage({ authUser, onRegister, onSignIn, onSignOut }: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { courses, error, isLoading, retry } = useCourseCatalog(searchQuery)
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
              <div className="hero__actions"><a href="#explore"><Button>探索所有課程</Button></a><a className="hero__text-link" href="#paths">查看職涯路徑 <span aria-hidden="true">↓</span></a></div>
            </div>
            <div className="hero-map" aria-label="職涯學習路徑示意">
              <div className="hero-map__topline"><span>課程資料即時載入</span><span>{isLoading ? '同步中' : `共 ${courses.length} 門課程`}</span></div>
              <div className="hero-map__route"><div className="route-node route-node--done"><b>01</b><span>探索方向</span></div><div className="route-line route-line--done" /><div className="route-node route-node--active"><b>02</b><span>開始學習</span></div><div className="route-line" /><div className="route-node"><b>03</b><span>累積成果</span></div></div>
              {firstCourse ? <div className="hero-map__lesson"><div className="lesson-signal" aria-hidden="true"><i /><i /><i /><i /></div><div><small>推薦課程</small><strong>{firstCourse.title}</strong></div><a href={`#lesson/${firstCourse.id}`}>開始</a></div> : <p className="hero-map__empty">課程準備完成後會顯示在這裡。</p>}
            </div>
          </section>

          <section className="courses-section" id="explore" aria-labelledby="courses-title">
            <div className="section-heading section-heading--inline"><div><p className="eyebrow">精選課程</p><h2 id="courses-title">用真實工作情境，把能力練得更扎實</h2></div><a href="#explore">探索課程目錄 →</a></div>
            {searchQuery.trim() && !isLoading && !error && <p className="course-search-status" role="status">{courses.length ? `找到 ${courses.length} 門與「${searchQuery.trim()}」相關的課程。` : `找不到與「${searchQuery.trim()}」相關的課程。`}</p>}
            <div aria-labelledby="courses-title" className="course-grid" id="featured-course-results" tabIndex={-1}>
              {isLoading && <div className="course-search-empty" role="status"><h3>正在載入課程</h3><p>請稍候，正在取得最新課程內容。</p></div>}
              {error && <div className="course-search-empty" role="alert"><h3>暫時無法取得課程</h3><p>{error}</p><button type="button" onClick={retry}>重新整理課程</button></div>}
              {!isLoading && !error && courses.length > 0 && courses.map((course) => <CourseCard key={course.id} course={course} />)}
              {!isLoading && !error && courses.length === 0 && <div className="course-search-empty"><h3>沒有符合的課程</h3><p>試試看搜尋 React、資料分析或 UX。</p></div>}
            </div>
          </section>

          <section className="cohort-section" aria-labelledby="cohort-title"><div className="cohort-section__intro"><p className="eyebrow">同期共學</p><h2 id="cohort-title">需要節奏與回饋時，和一群人一起前進</h2><p>由講師帶領的有限名額班，讓你有清楚的每週任務與作品回饋。</p></div><div className="cohort-list"><article><p>09/28 開課</p><h3>LLM 應用工程實戰班</h3><span>6 週 · 線上直播 · 14 個名額</span><button type="button">了解班級內容</button></article><article><p>10/05 開課</p><h3>產品 UX 策略工作坊</h3><span>4 週 · 小組演練 · 9 個名額</span><button type="button">了解班級內容</button></article></div></section>

          <section className="paths-section" id="paths" aria-labelledby="paths-title"><div className="section-heading"><p className="eyebrow">職涯路徑</p><h2 id="paths-title">不是課程清單，而是能走下去的方向</h2><p>依你想抵達的位置，找到下一個最值得投入的技能組合。</p></div><div className="path-grid">{paths.map((path) => <article key={path.number} className="path-card"><span>{path.number}</span><h3>{path.title}</h3><p>{path.description}</p><ul>{path.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul><a href="#explore">查看路徑 →</a></article>)}</div></section>
        </main>
      </div>
      <footer className="site-footer"><div><strong>LearnHub</strong><p>讓每一次學習，成為你職涯向前的證據。</p></div><div><a href="#explore">探索課程</a><a href="#paths">職涯路徑</a><a href="#home">我的學習</a></div><p>© 2026 LearnHub</p></footer>
    </div>
  )
}
