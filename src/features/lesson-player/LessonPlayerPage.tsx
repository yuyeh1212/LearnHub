import { useState } from 'react'
import { SiteHeader } from '../../components/SiteHeader'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { learningPoints, reactCourse, type Lesson } from '../../data/courseData'
import { LessonVideoPlayer } from './LessonVideoPlayer'
import './lessonPlayer.css'

interface LessonPlayerPageProps {
  completion: number
  completedLessonIds: string[]
  currentLesson: Lesson
  lessonPositionSeconds: Record<string, number>
  onSelectLesson: (lessonId: string) => void
  onCompleteLesson: (lessonId: string) => void
  onToggleLessonCompletion: (lessonId: string) => void
  onSaveLessonPosition: (lessonId: string, seconds: number) => void
}

export function LessonPlayerPage({
  completion,
  completedLessonIds,
  currentLesson,
  lessonPositionSeconds = {},
  onSelectLesson,
  onCompleteLesson,
  onToggleLessonCompletion,
  onSaveLessonPosition,
}: LessonPlayerPageProps) {
  const [notice, setNotice] = useState('')
  const isCurrentLessonComplete = completedLessonIds.includes(currentLesson.id)
  const currentLessonIndex = Math.max(reactCourse.lessons.findIndex((lesson) => lesson.id === currentLesson.id), 0)
  const previousLesson = reactCourse.lessons[currentLessonIndex - 1]
  const nextLesson = reactCourse.lessons[currentLessonIndex + 1]

  const handleComplete = () => {
    onToggleLessonCompletion(currentLesson.id)
    setNotice(isCurrentLessonComplete ? '已恢復為進行中，首頁進度已同步更新。' : '已標記完成，首頁進度已同步更新。')
  }

  const handleLessonSelect = (lesson: Lesson) => {
    onSelectLesson(lesson.id)
    setNotice(`已切換至 ${lesson.id} ${lesson.title}。`)
  }

  const handleVideoEnded = () => {
    onCompleteLesson(currentLesson.id)

    if (nextLesson) {
      onSelectLesson(nextLesson.id)
      setNotice(`已完成 ${currentLesson.title}，已切換至下一單元：${nextLesson.title}。`)
      return
    }

    setNotice('恭喜完成本章最後一個單元，課程進度已同步更新。')
  }

  return (
    <div className="lesson-page">
      <a className="skip-link" href="#lesson-content">跳至主要內容</a>
      <SiteHeader mode="player" />
      <main id="lesson-content" className="lesson-shell">
        <nav className="breadcrumbs" aria-label="麵包屑"><a href="#home">我的課程</a><span>/</span><a href="#home">React 全端工程師培養課程</a><span>/</span><span>第 8 章</span></nav>
        <div className="lesson-layout">
          <section className="lesson-main" aria-labelledby="lesson-title">
            <LessonVideoPlayer lesson={currentLesson} savedPositionSeconds={lessonPositionSeconds[currentLesson.id] ?? 0} onEnded={handleVideoEnded} onPositionChange={(seconds) => onSaveLessonPosition(currentLesson.id, seconds)} />
            <div className="lesson-content">
              <div className="lesson-content__heading"><div><p>{currentLesson.chapter}　·　{currentLesson.durationMinutes} 分鐘 · 影片課程</p><h1 id="lesson-title">{currentLesson.title}</h1></div><Button variant={isCurrentLessonComplete ? 'secondary' : 'primary'} onClick={handleComplete}>{isCurrentLessonComplete ? '已標記完成' : '標記為已完成'}</Button></div>
              {notice && <p className="lesson-notice" role="status">{notice}</p>}
              <p className="lesson-content__summary">本單元深入探討 React 18 中的 useEffect 生命週期機制，示範如何安全處理非同步 API 請求、快取策略與 AbortController 競態預防，並封裝成高效的可複用自訂 Hook。</p>
              <section className="points-grid" aria-label="核心學習要點">{learningPoints.map((point) => <article key={point.title}><span aria-hidden="true" /><h2>{point.title}</h2><p>{point.description}</p></article>)}</section>
              <section className="resource-card"><div className="resource-card__file" aria-hidden="true">JS</div><div><h2>章節講義與範例代碼</h2><p>useFetch.ts 範例與完整測試案例（ZIP，3.2 MB）</p></div><button type="button">下載資源包</button></section>
              <nav className="lesson-pager" aria-label="單元導覽"><button type="button" disabled={!previousLesson} onClick={() => previousLesson && handleLessonSelect(previousLesson)}>← {previousLesson ? `上一單元：${previousLesson.title}` : '已是第一單元'}</button><button type="button" disabled={!nextLesson} onClick={() => nextLesson && handleLessonSelect(nextLesson)}>{nextLesson ? `下一單元：${nextLesson.title}` : '已是最後單元'} →</button></nav>
            </div>
          </section>
          <aside className="course-outline" aria-label="課程大綱">
            <div className="course-outline__head"><div><p>課程大綱目錄</p><h2>React 全端實戰課程</h2></div><span>{completion}% 完成度</span></div>
            <ProgressBar value={completion} label={`課程完成進度 ${completion}%`} size="small" />
            <div className="outline-chapter"><div className="outline-chapter__title"><span>{reactCourse.chapter}</span><span>{reactCourse.lessons.length} 單元</span></div>{reactCourse.lessons.map((lesson) => { const isActive = lesson.id === currentLesson.id; const isComplete = completedLessonIds.includes(lesson.id); return <button type="button" aria-current={isActive ? 'step' : undefined} className={`outline-lesson${isComplete ? ' outline-lesson--done' : ''}${isActive ? ' outline-lesson--active' : ''}`} key={lesson.id} onClick={() => handleLessonSelect(lesson)}><span className="outline-lesson__mark" aria-hidden="true" /> <span>{lesson.id} {lesson.title}</span><time>{lesson.duration}</time></button> })}</div>
            <button type="button" className="collapsed-chapter">第 9 章：客製化 Hook 架構設計 <span>⌄</span></button>
          </aside>
        </div>
      </main>
    </div>
  )
}
