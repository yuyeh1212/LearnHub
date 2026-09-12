import { useEffect, useState } from 'react'
import { AuthenticationDialog } from './features/auth/AuthenticationDialog'
import { useAuthSession } from './features/auth/useAuthSession'
import { LandingPage } from './features/landing/LandingPage'
import { LessonPlayerPage } from './features/lesson-player/LessonPlayerPage'
import { useCoursePlayerData } from './features/lesson-player/useCoursePlayerData'

type View = { name: 'home' } | { courseId: string; name: 'lesson' }

function getViewFromHash(): View {
  const match = window.location.hash.match(/^#lesson\/([^/]+)$/)
  return match ? { name: 'lesson', courseId: decodeURIComponent(match[1]) } : { name: 'home' }
}

interface LessonRouteProps {
  accessToken: string | null
  courseId: string
  onRegister: () => void
  onRequestAuthentication: () => void
  onSignIn: () => void
  onSignOut: () => void
  user: ReturnType<typeof useAuthSession>['user']
}

function LessonRoute({ accessToken, courseId, onRegister, onRequestAuthentication, onSignIn, onSignOut, user }: LessonRouteProps) {
  const { courseOutline, currentLesson, error, isLoading, isRefreshingContent, refreshContentAccess, retry, selectLesson } = useCoursePlayerData(courseId)

  if (isLoading) return <main className="app-data-state" role="status"><h1>正在載入課程</h1><p>請稍候，正在取得課程大綱與單元內容。</p></main>

  if (error || !courseOutline || !currentLesson) {
    return <main className="app-data-state" role="alert"><h1>暫時無法開啟播放器</h1><p>{error ?? '這門課目前沒有可播放的單元。'}</p><button type="button" onClick={retry}>重新載入課程</button><a href="#home">回到課程目錄</a></main>
  }

  return <LessonPlayerPage accessToken={accessToken} authUser={user} course={courseOutline.course} chapters={courseOutline.chapters} currentLesson={currentLesson} isRefreshingContent={isRefreshingContent} onRefreshContentAccess={refreshContentAccess} onRegister={onRegister} onRequestAuthentication={onRequestAuthentication} onSelectLesson={selectLesson} onSignIn={onSignIn} onSignOut={onSignOut} />
}

export function App() {
  const [view, setView] = useState<View>(getViewFromHash)
  const [dialogMode, setDialogMode] = useState<'login' | 'register' | null>(null)
  const auth = useAuthSession()

  useEffect(() => {
    const handleHashChange = () => setView(getViewFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const openSignIn = () => setDialogMode('login')
  const openRegister = () => setDialogMode('register')
  const content = view.name === 'lesson'
    ? <LessonRoute accessToken={auth.accessToken} courseId={view.courseId} onRegister={openRegister} onRequestAuthentication={openSignIn} onSignIn={openSignIn} onSignOut={auth.signOut} user={auth.user} />
    : <LandingPage authUser={auth.user} onRegister={openRegister} onSignIn={openSignIn} onSignOut={auth.signOut} />

  return <>{content}<AuthenticationDialog isOpen={dialogMode !== null} mode={dialogMode ?? 'login'} onClose={() => setDialogMode(null)} onSubmit={async (mode, input) => { await auth.authenticate(mode, input) }} /></>
}
