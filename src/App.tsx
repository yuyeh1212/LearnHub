import { useEffect, useState } from 'react'
import { LandingPage } from './features/landing/LandingPage'
import { LessonPlayerPage } from './features/lesson-player/LessonPlayerPage'
import { useCoursePlayerData } from './features/lesson-player/useCoursePlayerData'

type View = { name: 'home' } | { courseId: string; name: 'lesson' }

function getViewFromHash(): View {
  const match = window.location.hash.match(/^#lesson\/([^/]+)$/)
  return match ? { name: 'lesson', courseId: decodeURIComponent(match[1]) } : { name: 'home' }
}

function LessonRoute({ courseId }: { courseId: string }) {
  const { courseOutline, currentLesson, error, isLoading, retry, selectLesson } = useCoursePlayerData(courseId)

  if (isLoading) return <main className="app-data-state" role="status"><h1>正在載入課程</h1><p>請稍候，正在取得課程大綱與單元內容。</p></main>

  if (error || !courseOutline || !currentLesson) {
    return <main className="app-data-state" role="alert"><h1>暫時無法開啟播放器</h1><p>{error ?? '這門課目前沒有可播放的單元。'}</p><button type="button" onClick={retry}>重新載入課程</button><a href="#home">回到課程目錄</a></main>
  }

  return <LessonPlayerPage course={courseOutline.course} chapters={courseOutline.chapters} currentLesson={currentLesson} onSelectLesson={selectLesson} />
}

export function App() {
  const [view, setView] = useState<View>(getViewFromHash)

  useEffect(() => {
    const handleHashChange = () => setView(getViewFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return view.name === 'lesson' ? <LessonRoute courseId={view.courseId} /> : <LandingPage />
}
