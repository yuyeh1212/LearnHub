import { useEffect, useState } from 'react'
import { LandingPage } from './features/landing/LandingPage'
import { useCourseProgress } from './features/learning/useCourseProgress'
import { LessonPlayerPage } from './features/lesson-player/LessonPlayerPage'

type View = 'home' | 'lesson'

function getViewFromHash(): View {
  return window.location.hash === '#lesson' ? 'lesson' : 'home'
}

export function App() {
  const [view, setView] = useState<View>(getViewFromHash)
  const courseProgress = useCourseProgress()

  useEffect(() => {
    const handleHashChange = () => setView(getViewFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return view === 'lesson'
    ? <LessonPlayerPage
        completion={courseProgress.completion}
        completedLessonIds={courseProgress.completedLessonIds}
        currentLesson={courseProgress.currentLesson}
        onSelectLesson={courseProgress.selectLesson}
        onToggleLessonCompletion={courseProgress.toggleLessonCompletion}
      />
    : <LandingPage completion={courseProgress.completion} currentLesson={courseProgress.currentLesson} />
}
