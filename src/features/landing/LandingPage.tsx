import { CourseCard } from '../../components/CourseCard'
import { SiteHeader } from '../../components/SiteHeader'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { featuredCourses, type Lesson } from '../../data/courseData'
import './landing.css'

const paths = [
  { number: '01', title: '軟體工程師', description: '從前端基礎到系統設計，建立可被看見的實作能力。', skills: ['React', 'TypeScript', 'System Design'] },
  { number: '02', title: '產品經理', description: '把使用者洞察轉成能推進團隊的產品決策。', skills: ['產品策略', '數據分析', '溝通協作'] },
  { number: '03', title: 'UX 設計師', description: '用研究、流程與原型，讓設計真正改變產品體驗。', skills: ['UX Research', 'Figma', 'Design Systems'] },
]

interface LandingPageProps {
  completion: number
  currentLesson: Lesson
}

export function LandingPage({ completion, currentLesson }: LandingPageProps) {
  return (
    <div className="landing-page">
      <a className="skip-link" href="#main-content">跳至主要內容</a>
      <div className="landing-shell">
        <SiteHeader />
        <main id="main-content">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero__content">
              <p className="eyebrow">為職涯下一步，累積能被看見的實戰能力</p>
              <h1 id="hero-title">學習實戰技能，<br /><span>打造你的卓越職涯</span></h1>
              <p className="hero__summary">從有脈絡的課程開始，將每一次練習轉成作品、成果與下一個機會。</p>
              <div className="hero__actions">
                <a href="#explore"><Button>探索所有課程</Button></a>
                <a className="hero__text-link" href="#paths">查看職涯路徑 <span aria-hidden="true">↓</span></a>
              </div>
            </div>
            <div className="hero-map" aria-label="職涯學習路徑示意">
              <div className="hero-map__topline"><span>你的職涯導航</span><span>本週學習 03:40</span></div>
              <div className="hero-map__route">
                <div className="route-node route-node--done"><b>01</b><span>建立基礎</span></div>
                <div className="route-line route-line--done" />
                <div className="route-node route-node--active"><b>02</b><span>實作專案</span></div>
                <div className="route-line" />
                <div className="route-node"><b>03</b><span>職涯躍升</span></div>
              </div>
              <div className="hero-map__lesson">
                <div className="lesson-signal" aria-hidden="true"><i /><i /><i /><i /></div>
                <div><small>正在進行</small><strong>{currentLesson.title}</strong></div>
                <a href="#lesson">繼續</a>
              </div>
              <ProgressBar value={completion} label={`React 課程完成進度 ${completion}%`} size="small" />
            </div>
          </section>

          <section className="continue-section" aria-labelledby="continue-title">
            <div className="section-heading section-heading--inline">
              <div><p className="eyebrow">繼續累積</p><h2 id="continue-title">從上次停下的地方繼續</h2></div>
              <a href="#lesson">查看我的課程 →</a>
            </div>
            <article className="continue-card">
              <div className="continue-card__signal" aria-hidden="true"><span /><span /><span /></div>
              <div className="continue-card__main">
                <p>React 全端工程師培養課程 <span>第 8 章</span></p>
                <h3>{currentLesson.title}</h3>
                <p className="continue-card__caption">下一個單元約需 {currentLesson.durationMinutes} 分鐘完成。</p>
              </div>
              <div className="continue-card__progress"><span>{completion}% 完成度</span><ProgressBar value={completion} label={`課程完成進度 ${completion}%`} /></div>
              <a href="#lesson"><Button>繼續學習</Button></a>
            </article>
          </section>

          <section className="courses-section" id="explore" aria-labelledby="courses-title">
            <div className="section-heading section-heading--inline">
              <div><p className="eyebrow">精選課程</p><h2 id="courses-title">用真實工作情境，把能力練得更扎實</h2></div>
              <a href="#explore">探索課程目錄 →</a>
            </div>
            <div className="course-grid">{featuredCourses.map((course) => <CourseCard key={course.id} course={course} />)}</div>
          </section>

          <section className="cohort-section" aria-labelledby="cohort-title">
            <div className="cohort-section__intro"><p className="eyebrow">同期共學</p><h2 id="cohort-title">需要節奏與回饋時，和一群人一起前進</h2><p>由講師帶領的有限名額班，讓你有清楚的每週任務與作品回饋。</p></div>
            <div className="cohort-list">
              <article><p>09/28 開課</p><h3>LLM 應用工程實戰班</h3><span>6 週 · 線上直播 · 14 個名額</span><button type="button">了解班級內容</button></article>
              <article><p>10/05 開課</p><h3>產品 UX 策略工作坊</h3><span>4 週 · 小組演練 · 9 個名額</span><button type="button">了解班級內容</button></article>
            </div>
          </section>

          <section className="paths-section" id="paths" aria-labelledby="paths-title">
            <div className="section-heading"><p className="eyebrow">職涯路徑</p><h2 id="paths-title">不是課程清單，而是能走下去的方向</h2><p>依你想抵達的位置，找到下一個最值得投入的技能組合。</p></div>
            <div className="path-grid">{paths.map((path) => <article key={path.number} className="path-card"><span>{path.number}</span><h3>{path.title}</h3><p>{path.description}</p><ul>{path.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul><a href="#explore">查看路徑 →</a></article>)}</div>
          </section>
        </main>
      </div>
      <footer className="site-footer"><div><strong>LearnHub</strong><p>讓每一次學習，成為你職涯向前的證據。</p></div><div><a href="#explore">探索課程</a><a href="#paths">職涯路徑</a><a href="#lesson">我的學習</a></div><p>© 2026 LearnHub</p></footer>
    </div>
  )
}
