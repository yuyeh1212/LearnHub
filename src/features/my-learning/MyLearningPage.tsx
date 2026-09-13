import type { AuthenticatedUser } from '../../contracts/auth'
import type { LearningCourseSummary } from '../../contracts/learning'
import { SiteHeader } from '../../components/SiteHeader'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { useMyLearning } from './useMyLearning'
import './myLearning.css'

interface MyLearningPageProps {
  accessToken: string | null
  authUser: AuthenticatedUser | null
  isRestoringSession: boolean
  onRegister: () => void
  onSignIn: () => void
  onSignOut: () => void
}

function formatLearningDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Taipei',
    year: 'numeric',
  }).format(new Date(value))
}

function getCourseActionLabel(course: LearningCourseSummary) {
  if (course.completionPercent === 100) return '複習課程'
  if (course.completionPercent === 0) return '開始第一課'
  return '繼續上課'
}

function LearningCourseCard({ learningCourse }: { learningCourse: LearningCourseSummary }) {
  return (
    <article className="learning-course-card">
      <div className="learning-course-card__accent" aria-hidden="true"><span /><span /><span /></div>
      <div className="learning-course-card__body">
        <div className="learning-course-card__topline"><span>{learningCourse.course.category}</span><time dateTime={learningCourse.updatedAt}>最近學習 {formatLearningDate(learningCourse.updatedAt)}</time></div>
        <h3>{learningCourse.course.title}</h3>
        <p className="learning-course-card__lesson">{learningCourse.currentLesson ? `目前單元：${learningCourse.currentLesson.title}` : '課程單元準備中'}</p>
        <div className="learning-course-card__progress"><span>{learningCourse.completedLessonCount}／{learningCourse.lessonCount} 個單元</span><strong>{learningCourse.completionPercent}%</strong></div>
        <ProgressBar label={`${learningCourse.course.title} 完成進度`} size="small" value={learningCourse.completionPercent} />
        <a className="learning-course-card__action" href={`#lesson/${learningCourse.course.id}`}>{getCourseActionLabel(learningCourse)} <span aria-hidden="true">→</span></a>
      </div>
    </article>
  )
}

export function MyLearningPage({ accessToken, authUser, isRestoringSession, onRegister, onSignIn, onSignOut }: MyLearningPageProps) {
  const { error, isLoading, isUnauthorized, learningCourses, retry } = useMyLearning(accessToken)
  const featuredCourse = learningCourses[0]
  const completedCourseCount = learningCourses.filter((course) => course.completionPercent === 100).length
  const inProgressCourseCount = learningCourses.length - completedCourseCount

  return (
    <div className="my-learning-page">
      <a className="skip-link" href="#my-learning-content">跳至主要內容</a>
      <div className="my-learning-shell">
        <SiteHeader authUser={authUser} mode="learning" onRegister={onRegister} onSignIn={onSignIn} onSignOut={onSignOut} />
        <main id="my-learning-content">
          {isRestoringSession || (authUser && isLoading) ? <section className="my-learning-state" role="status"><span className="my-learning-state__pulse" aria-hidden="true" /><h1>正在整理你的學習紀錄</h1><p>課程、單元和進度會一起放在這裡。</p></section> : null}

          {!isRestoringSession && !authUser ? <section className="my-learning-guest" aria-labelledby="learning-guest-title"><p className="eyebrow">你的學習空間</p><h1 id="learning-guest-title">登入後，進度就不會散掉。</h1><p>你可以查看已加入的課程、保存觀看位置，從上次停下的單元繼續。</p><div><button className="learning-primary-action" type="button" onClick={onSignIn}>登入查看學習紀錄</button><button className="learning-secondary-action" type="button" onClick={onRegister}>建立免費帳戶</button></div></section> : null}

          {!isRestoringSession && authUser && !isLoading && error ? <section className="my-learning-state" role="alert"><span className="my-learning-state__mark" aria-hidden="true">!</span><h1>暫時無法取得學習紀錄</h1><p>{error}</p><button type="button" onClick={isUnauthorized ? onSignIn : retry}>{isUnauthorized ? '重新登入' : '重新整理'}</button></section> : null}

          {!isRestoringSession && authUser && !isLoading && !error && learningCourses.length === 0 ? <section className="my-learning-empty" aria-labelledby="learning-empty-title"><div className="my-learning-empty__route" aria-hidden="true"><i /><i /><i /></div><p className="eyebrow">從第一門課開始</p><h1 id="learning-empty-title">你的學習清單還是空的。</h1><p>先選一門最接近目前目標的課。加入後，就能在這裡追蹤進度。</p><a href="#explore">找課程</a></section> : null}

          {!isRestoringSession && authUser && !isLoading && !error && featuredCourse ? <>
            <section className="my-learning-hero" aria-labelledby="my-learning-title">
              <div><p className="eyebrow">歡迎回來，{authUser.displayName}</p><h1 id="my-learning-title">接著上次的地方繼續。</h1><p>最近學到哪、完成多少、下一個單元是什麼，都整理在這裡。</p></div>
              <dl><div><dt>學習中</dt><dd>{inProgressCourseCount}</dd></div><div><dt>已完成</dt><dd>{completedCourseCount}</dd></div><div><dt>全部課程</dt><dd>{learningCourses.length}</dd></div></dl>
            </section>

            <section className="learning-focus" aria-labelledby="learning-focus-title">
              <div className="learning-focus__route" aria-hidden="true"><span className="is-done">加入課程</span><i /><span className="is-active">持續學習</span><i /><span>完成課程</span></div>
              <div className="learning-focus__content"><p>最近學習 · {featuredCourse.course.category}</p><h2 id="learning-focus-title">{featuredCourse.course.title}</h2><span>{featuredCourse.currentLesson ? `接下來：${featuredCourse.currentLesson.title}` : '課程單元準備中'}</span></div>
              <div className="learning-focus__progress"><strong>{featuredCourse.completionPercent}%</strong><span>{featuredCourse.completedLessonCount}／{featuredCourse.lessonCount} 個單元完成</span><ProgressBar label={`${featuredCourse.course.title} 完成進度`} value={featuredCourse.completionPercent} /></div>
              <a href={`#lesson/${featuredCourse.course.id}`}>{getCourseActionLabel(featuredCourse)} <span aria-hidden="true">→</span></a>
            </section>

            <section className="learning-library" aria-labelledby="learning-library-title"><div className="learning-library__heading"><div><p className="eyebrow">已加入的課程</p><h2 id="learning-library-title">你的學習清單</h2></div><a href="#explore">找更多課程 →</a></div><div className="learning-course-grid">{learningCourses.map((learningCourse) => <LearningCourseCard key={learningCourse.enrollment.id} learningCourse={learningCourse} />)}</div></section>
          </> : null}
        </main>
      </div>
      <footer className="my-learning-footer"><strong>LearnHub</strong><p>回來時，直接接著下一步。</p><a href="#home">回到課程首頁</a></footer>
    </div>
  )
}
