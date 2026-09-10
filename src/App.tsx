import { useEffect, useState } from 'react'
import { LandingPage } from './features/landing/LandingPage'
import { LessonPlayerPage } from './features/lesson-player/LessonPlayerPage'

type View = 'home' | 'lesson'

function getViewFromHash(): View {
  return window.location.hash === '#lesson' ? 'lesson' : 'home'
}

export function App() {
  const [view, setView] = useState<View>(getViewFromHash)

  useEffect(() => {
    const handleHashChange = () => setView(getViewFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return view === 'lesson' ? <LessonPlayerPage /> : <LandingPage />
}
