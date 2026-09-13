import { useEffect, useState } from 'react'
import type { CourseOutline, LessonDetail } from '../../contracts/learning'
import { LearningApiError, getCourseOutline, getLesson } from '../../lib/learningApi'

type CoursePlayerState = {
  courseOutline: CourseOutline | null
  currentLesson: LessonDetail | null
  error: string | null
  isLoading: boolean
}

export function useCoursePlayerData(courseId: string, preferredLessonId: string | null = null) {
  const [state, setState] = useState<CoursePlayerState>({
    courseOutline: null,
    currentLesson: null,
    error: null,
    isLoading: true,
  })
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [contentRefreshKey, setContentRefreshKey] = useState(0)
  const [isRefreshingContent, setIsRefreshingContent] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setState({ courseOutline: null, currentLesson: null, error: null, isLoading: true })
    setSelectedLessonId(null)

    void getCourseOutline(courseId, controller.signal)
      .then((courseOutline) => {
        const lessons = courseOutline.chapters.flatMap((chapter) => chapter.lessons)
        const firstLesson = lessons.at(0)
        if (!firstLesson) {
          setState({ courseOutline, currentLesson: null, error: '這門課目前還沒有可播放的單元。', isLoading: false })
          return
        }

        setState((current) => ({ ...current, courseOutline, isLoading: true }))
        setSelectedLessonId(lessons.some((lesson) => lesson.id === preferredLessonId) ? preferredLessonId : firstLesson.id)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setState({
          courseOutline: null,
          currentLesson: null,
          error: error instanceof LearningApiError ? error.message : '目前無法取得課程內容，請稍後再試。',
          isLoading: false,
        })
      })

    return () => controller.abort()
  }, [courseId, preferredLessonId, retryKey])

  useEffect(() => {
    if (!selectedLessonId) {
      return
    }

    const controller = new AbortController()
    setState((current) => ({ ...current, error: null, isLoading: current.currentLesson === null }))
    setIsRefreshingContent(state.currentLesson !== null)

    void getLesson(selectedLessonId, controller.signal)
      .then((currentLesson) => setState((current) => ({ ...current, currentLesson, isLoading: false })))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setState((current) => current.currentLesson
          ? { ...current, isLoading: false }
          : {
              ...current,
              currentLesson: null,
              error: error instanceof LearningApiError ? error.message : '目前無法取得單元內容，請稍後再試。',
              isLoading: false,
            })
      })
      .finally(() => setIsRefreshingContent(false))

    return () => controller.abort()
  }, [contentRefreshKey, selectedLessonId])

  useEffect(() => {
    if (!state.currentLesson) return
    const expirations = [
      state.currentLesson.videoAccessExpiresAt,
      ...state.currentLesson.resources.map((resource) => resource.accessExpiresAt),
    ].filter((value): value is string => Boolean(value)).map((value) => Date.parse(value)).filter(Number.isFinite)
    if (!expirations.length) return

    const refreshInMilliseconds = Math.max(0, Math.min(...expirations) - Date.now() - 60_000)
    const timer = window.setTimeout(
      () => setContentRefreshKey((current) => current + 1),
      Math.min(refreshInMilliseconds, 2_147_483_647),
    )
    return () => window.clearTimeout(timer)
  }, [state.currentLesson])

  return {
    ...state,
    isRefreshingContent,
    refreshContentAccess: () => setContentRefreshKey((current) => current + 1),
    retry: () => setRetryKey((current) => current + 1),
    selectLesson: setSelectedLessonId,
  }
}
