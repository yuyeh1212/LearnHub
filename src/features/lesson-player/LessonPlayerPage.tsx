import { useEffect, useMemo, useState } from 'react'
import type { AuthenticatedUser } from '../../contracts/auth'
import type { CourseDetail, CourseOutlineChapter, LessonDetail, LessonSummary } from '../../contracts/learning'
import { SiteHeader } from '../../components/SiteHeader'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { formatPlaybackTime } from '../learning/formatPlaybackTime'
import { LessonVideoPlayer } from './LessonVideoPlayer'
import { useCourseLearningProgress } from './useCourseLearningProgress'
import './lessonPlayer.css'

type OutlineLesson = LessonSummary & { chapterTitle: string }

interface LessonPlayerPageProps {
  accessToken: string | null
  authUser: AuthenticatedUser | null
  course: CourseDetail
  chapters: CourseOutlineChapter[]
  currentLesson: LessonDetail
  isRefreshingContent: boolean
  onRefreshContentAccess: () => void
  onRegister: () => void
  onRequestAuthentication: () => void
  onSelectLesson: (lessonId: string) => void
  onSignIn: () => void
  onSignOut: () => void
}

function formatDuration(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} 分鐘`
}

function getResourceKindLabel(kind: LessonDetail['resources'][number]['kind']) {
  return kind === 'code' ? '程式碼' : kind === 'document' ? '講義' : '練習題'
}

export function LessonPlayerPage({ accessToken, authUser, course, chapters, currentLesson, isRefreshingContent, onRefreshContentAccess, onRegister, onRequestAuthentication, onSelectLesson, onSignIn, onSignOut }: LessonPlayerPageProps) {
  const [notice, setNotice] = useState('')
  const outlineLessons = useMemo<OutlineLesson[]>(() => chapters.flatMap((chapter) => chapter.lessons.map((lesson) => ({ ...lesson, chapterTitle: chapter.title }))), [chapters])
  const playback = useCourseLearningProgress(course.id, outlineLessons.map((lesson) => lesson.id), accessToken, authUser?.id ?? null)
  const currentLessonIndex = Math.max(outlineLessons.findIndex((lesson) => lesson.id === currentLesson.id), 0)
  const previousLesson = outlineLessons[currentLessonIndex - 1]
  const nextLesson = outlineLessons[currentLessonIndex + 1]
  const currentOutlineLesson = outlineLessons[currentLessonIndex]
  const completion = outlineLessons.length ? Math.round((playback.completedLessonIds.length / outlineLessons.length) * 100) : 0
  const isCurrentLessonComplete = playback.completedLessonIds.includes(currentLesson.id)
  const canTrackProgress = playback.accessState === 'enrolled'
  const completionButtonLabel = !canTrackProgress
    ? '加入課程後可標記完成'
    : isCurrentLessonComplete ? '已標記完成' : '標記為已完成'

  useEffect(() => {
    if (playback.currentLessonId && playback.currentLessonId !== currentLesson.id) {
      onSelectLesson(playback.currentLessonId)
    }
  }, [currentLesson.id, onSelectLesson, playback.currentLessonId])

  const selectLesson = (lessonId: string) => {
    playback.selectLesson(lessonId)
    onSelectLesson(lessonId)
  }

  const handleComplete = () => {
    if (!canTrackProgress) return
    playback.setLessonCompletion(currentLesson.id, !isCurrentLessonComplete)
    setNotice(isCurrentLessonComplete ? '已恢復為進行中。' : '已標記完成。')
  }

  const handleVideoEnded = () => {
    if (!canTrackProgress) {
      setNotice('影片播放完畢；加入課程後才會記錄完成進度。')
      return
    }
    playback.setLessonCompletion(currentLesson.id, true)
    if (nextLesson) {
      selectLesson(nextLesson.id)
      setNotice(`已完成 ${currentLesson.title}，已切換至下一單元：${nextLesson.title}。`)
      return
    }
    setNotice('恭喜完成本課程最後一個單元。')
  }

  return (
    <div className="lesson-page">
      <a className="skip-link" href="#lesson-content">跳至主要內容</a>
      <SiteHeader authUser={authUser} mode="player" onRegister={onRegister} onSignIn={onSignIn} onSignOut={onSignOut} />
      <main id="lesson-content" className="lesson-shell">
        <nav className="breadcrumbs" aria-label="麵包屑"><a href="#home">探索課程</a><span>/</span><a href="#home">{course.title}</a><span>/</span><span>{currentOutlineLesson?.chapterTitle}</span></nav>
        <div className="lesson-layout">
          <section className="lesson-main" aria-labelledby="lesson-title">
            <LessonVideoPlayer lesson={currentLesson} isLoadingProgress={playback.accessState === 'checking' && !(currentLesson.id in playback.lessonPositionSeconds)} isRefreshingSource={isRefreshingContent} savedPositionSeconds={playback.lessonPositionSeconds[currentLesson.id] ?? 0} onEnded={handleVideoEnded} onPause={playback.flushProgress} onPositionChange={(seconds) => playback.saveLessonPosition(currentLesson.id, seconds)} onRefreshSource={onRefreshContentAccess} />
            <div className="lesson-content">
              {playback.accessState === 'guest' && <section className="learning-sync-card"><div><strong>登入後儲存學習進度</strong><p>觀看位置與完成狀態會同步到你的帳戶。</p></div><Button variant="secondary" onClick={onRequestAuthentication}>登入並同步</Button></section>}
              {playback.accessState === 'checking' && <p className="learning-sync-status" role="status">正在取得你的學習進度…</p>}
              {playback.accessState === 'not-enrolled' && <section className="learning-sync-card"><div><strong>準備好開始這門課了嗎？</strong><p>加入課程後，觀看進度會同步到所有裝置。</p></div><Button disabled={playback.isEnrolling} onClick={() => void playback.enroll()}>{playback.isEnrolling ? '加入中…' : '加入課程並同步'}</Button></section>}
              {playback.accessState === 'enrolled' && <p className="learning-sync-status learning-sync-status--ready" role="status">進度已同步至 {authUser?.displayName ?? '你的帳戶'}。</p>}
              {(playback.syncError || playback.accessState === 'error') && <p className="learning-sync-error" role="alert">{playback.syncError || '目前無法取得你的學習進度。'}</p>}
              <div className="lesson-content__heading"><div><p>{currentOutlineLesson?.chapterTitle}　·　{formatDuration(currentLesson.durationSeconds)} · 影片課程</p><h1 id="lesson-title">{currentLesson.title}</h1></div><Button disabled={!canTrackProgress} title={canTrackProgress ? undefined : '請先加入課程'} variant={isCurrentLessonComplete ? 'secondary' : 'primary'} onClick={handleComplete}>{completionButtonLabel}</Button></div>
              {notice && <p className="lesson-notice" role="status">{notice}</p>}
              <p className="lesson-content__summary">{currentLesson.description}</p>
              {currentLesson.resources.length > 0 && <section className="resource-list" aria-label="本單元教材">{currentLesson.resources.map((resource) => <article className="resource-card" key={resource.id}><div className="resource-card__file" aria-hidden="true">{resource.kind === 'code' ? 'TS' : 'PDF'}</div><div><h2>{resource.title}</h2><p>{getResourceKindLabel(resource.kind)}{resource.sizeBytes ? `，${Math.ceil(resource.sizeBytes / 1024)} KB` : ''}</p></div><a href={resource.downloadUrl} target="_blank" rel="noopener noreferrer">下載教材</a></article>)}</section>}
              <nav className="lesson-pager" aria-label="單元導覽"><button type="button" disabled={!previousLesson} onClick={() => previousLesson && selectLesson(previousLesson.id)}>← {previousLesson ? `上一單元：${previousLesson.title}` : '已是第一單元'}</button><button type="button" disabled={!nextLesson} onClick={() => nextLesson && selectLesson(nextLesson.id)}>{nextLesson ? `下一單元：${nextLesson.title}` : '已是最後單元'} →</button></nav>
            </div>
          </section>
          <aside className="course-outline" aria-label="課程大綱">
            <div className="course-outline__head"><div><p>課程大綱目錄</p><h2>{course.title}</h2></div><span>{completion}% 完成度</span></div>
            <ProgressBar value={completion} label={`本次學習完成進度 ${completion}%`} size="small" />
            {chapters.map((chapter) => <div className="outline-chapter" key={chapter.id}><div className="outline-chapter__title"><span>{chapter.title}</span><span>{chapter.lessons.length} 單元</span></div>{chapter.lessons.map((lesson) => { const isActive = lesson.id === currentLesson.id; const isComplete = playback.completedLessonIds.includes(lesson.id); return <button type="button" aria-current={isActive ? 'step' : undefined} className={`outline-lesson${isComplete ? ' outline-lesson--done' : ''}${isActive ? ' outline-lesson--active' : ''}`} key={lesson.id} onClick={() => selectLesson(lesson.id)}><span className="outline-lesson__mark" aria-hidden="true" /><span>{lesson.position} {lesson.title}</span><time>{formatPlaybackTime(lesson.durationSeconds)}</time></button> })}</div>)}
          </aside>
        </div>
      </main>
    </div>
  )
}
