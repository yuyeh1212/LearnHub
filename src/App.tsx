import { useEffect, useMemo, useState } from 'react'
import { AuthenticationDialog } from './features/auth/AuthenticationDialog'
import { useAuthSession } from './features/auth/useAuthSession'
import { LandingPage } from './features/landing/LandingPage'
import { LessonPlayerPage } from './features/lesson-player/LessonPlayerPage'
import { readLearningProgressCache } from './features/lesson-player/learningProgressCache'
import { useCoursePlayerData } from './features/lesson-player/useCoursePlayerData'
import { MyLearningPage } from './features/my-learning/MyLearningPage'
import { subscribeAuthSessionExpired } from './lib/authSessionEvents'

type View = { name: 'home' } | { name: 'learning' } | { courseId: string; name: 'lesson' }

function getViewFromHash(): View {
  const match = window.location.hash.match(/^#lesson\/([^/]+)$/)
  if (match) return { name: 'lesson', courseId: decodeURIComponent(match[1]) }
  return window.location.hash === '#learning' ? { name: 'learning' } : { name: 'home' }
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
  const preferredLessonId = useMemo(
    () => readLearningProgressCache(user?.id ?? null, courseId)?.currentLessonId ?? null,
    [courseId, user?.id],
  )
  const { courseOutline, currentLesson, error, isLoading, isRefreshingContent, refreshContentAccess, retry, selectLesson } = useCoursePlayerData(courseId, preferredLessonId)

  if (isLoading) return <main className="app-data-state" role="status"><h1>正在載入課程</h1><p>正在取得課程大綱和單元內容，等一下就好。</p></main>

  if (error || !courseOutline || !currentLesson) {
    return <main className="app-data-state" role="alert"><h1>暫時無法開啟播放器</h1><p>{error ?? '這門課目前沒有可播放的單元。'}</p><button type="button" onClick={retry}>重新載入課程</button><a href="#home">回到課程目錄</a></main>
  }

  return <LessonPlayerPage accessToken={accessToken} authUser={user} course={courseOutline.course} chapters={courseOutline.chapters} currentLesson={currentLesson} isRefreshingContent={isRefreshingContent} onRefreshContentAccess={refreshContentAccess} onRegister={onRegister} onRequestAuthentication={onRequestAuthentication} onSelectLesson={selectLesson} onSignIn={onSignIn} onSignOut={onSignOut} />
}

export function App() {
  const [view, setView] = useState<View>(getViewFromHash)
  const [dialogMode, setDialogMode] = useState<'login' | 'register' | null>(null)
  const [dialogMessage, setDialogMessage] = useState('')
  const auth = useAuthSession()

  useEffect(() => {
    const handleHashChange = () => setView(getViewFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => subscribeAuthSessionExpired(() => {
    setDialogMessage('登入已過期，請重新登入。你現在看的頁面會保留。')
    setDialogMode('login')
  }), [])

  const closeDialog = () => {
    setDialogMessage('')
    setDialogMode(null)
  }

  const openSignIn = () => {
    setDialogMessage('')
    setDialogMode('login')
  }

  const openRegister = () => {
    setDialogMessage('')
    setDialogMode('register')
  }

  const content = view.name === 'lesson'
    ? <LessonRoute accessToken={auth.accessToken} courseId={view.courseId} onRegister={openRegister} onRequestAuthentication={openSignIn} onSignIn={openSignIn} onSignOut={auth.signOut} user={auth.user} />
    : view.name === 'learning'
      ? <MyLearningPage accessToken={auth.accessToken} authUser={auth.user} isRestoringSession={auth.isRestoring} onRegister={openRegister} onSignIn={openSignIn} onSignOut={auth.signOut} />
      : <LandingPage authUser={auth.user} onRegister={openRegister} onSignIn={openSignIn} onSignOut={auth.signOut} />

  return <>{content}<AuthenticationDialog isOpen={dialogMode !== null} message={dialogMessage} mode={dialogMode ?? 'login'} onClose={closeDialog} onSubmit={async (mode, input) => { await auth.authenticate(mode, input) }} /></>
}
