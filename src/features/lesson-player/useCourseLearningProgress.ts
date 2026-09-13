import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CourseProgress } from '../../contracts/learning'
import {
  enrollInCourse,
  getCourseProgress,
  LearningApiError,
  updateCurrentLesson,
  updateLessonProgress,
} from '../../lib/learningApi'

export type LearningAccessState = 'checking' | 'enrolled' | 'guest' | 'not-enrolled' | 'error'

type PendingLessonProgress = {
  completed: boolean
  positionSeconds: number
}

function toPositionMap(progress: CourseProgress) {
  return Object.fromEntries(progress.lessons.map((lesson) => [lesson.lessonId, lesson.positionSeconds]))
}

function toCompletedLessonIds(progress: CourseProgress) {
  return progress.lessons.filter((lesson) => lesson.completedAt).map((lesson) => lesson.lessonId)
}

export function useCourseLearningProgress(courseId: string, lessonIds: string[], accessToken: string | null) {
  const lessonKey = useMemo(() => lessonIds.join(':'), [lessonIds])
  const [accessState, setAccessState] = useState<LearningAccessState>(accessToken ? 'checking' : 'guest')
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(lessonIds[0] ?? null)
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([])
  const [lessonPositionSeconds, setLessonPositionSeconds] = useState<Record<string, number>>({})
  const [syncError, setSyncError] = useState('')
  const [isEnrolling, setIsEnrolling] = useState(false)
  const pendingWritesRef = useRef(new Map<string, PendingLessonProgress>())
  const completedLessonIdsRef = useRef<string[]>([])
  const lessonPositionSecondsRef = useRef<Record<string, number>>({})
  const writeTimerRef = useRef<number | null>(null)

  const applyProgress = useCallback((progress: CourseProgress) => {
    setCurrentLessonId(progress.currentLessonId && lessonIds.includes(progress.currentLessonId)
      ? progress.currentLessonId
      : lessonIds[0] ?? null)
    const nextCompletedLessonIds = toCompletedLessonIds(progress)
    const nextLessonPositionSeconds = toPositionMap(progress)
    completedLessonIdsRef.current = nextCompletedLessonIds
    lessonPositionSecondsRef.current = nextLessonPositionSeconds
    setCompletedLessonIds(nextCompletedLessonIds)
    setLessonPositionSeconds(nextLessonPositionSeconds)
    setSyncError('')
  }, [lessonKey])

  useEffect(() => {
    setCurrentLessonId(lessonIds[0] ?? null)
    completedLessonIdsRef.current = []
    lessonPositionSecondsRef.current = {}
    setCompletedLessonIds([])
    setLessonPositionSeconds({})
    setSyncError('')
    pendingWritesRef.current.clear()
  }, [courseId, lessonKey])

  useEffect(() => {
    if (!accessToken) {
      setAccessState('guest')
      return
    }

    const controller = new AbortController()
    setAccessState('checking')
    setSyncError('')
    void getCourseProgress(courseId, accessToken, controller.signal)
      .then((progress) => {
        applyProgress(progress)
        setAccessState('enrolled')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof LearningApiError && error.status === 403) {
          setAccessState('not-enrolled')
          return
        }
        setAccessState('error')
        setSyncError(error instanceof Error ? error.message : '目前無法取得你的學習進度。')
      })

    return () => controller.abort()
  }, [accessToken, applyProgress, courseId])

  const flushPendingWrites = useCallback(async (keepalive = false) => {
    if (!accessToken || accessState !== 'enrolled') return
    const pendingWrites = [...pendingWritesRef.current.entries()]
    pendingWritesRef.current.clear()
    if (writeTimerRef.current) {
      window.clearTimeout(writeTimerRef.current)
      writeTimerRef.current = null
    }

    const results = await Promise.allSettled(pendingWrites.map(([lessonId, progress]) => updateLessonProgress(
      lessonId,
      progress,
      accessToken,
      keepalive,
    )))
    if (results.some((result) => result.status === 'rejected')) {
      setSyncError('觀看位置暫時無法同步，請保持頁面開啟後再試一次。')
    }
  }, [accessState, accessToken])

  useEffect(() => {
    const flushBeforeLeaving = () => { void flushPendingWrites(true) }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushBeforeLeaving()
    }

    window.addEventListener('pagehide', flushBeforeLeaving)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('pagehide', flushBeforeLeaving)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (writeTimerRef.current) window.clearTimeout(writeTimerRef.current)
      void flushPendingWrites()
    }
  }, [flushPendingWrites])

  const queueProgressWrite = useCallback((lessonId: string, progress: PendingLessonProgress) => {
    if (!accessToken || accessState !== 'enrolled') return
    pendingWritesRef.current.set(lessonId, progress)
    if (writeTimerRef.current) return
    writeTimerRef.current = window.setTimeout(() => { void flushPendingWrites() }, 4_000)
  }, [accessState, accessToken, flushPendingWrites])

  const selectLesson = useCallback((lessonId: string) => {
    if (!lessonIds.includes(lessonId)) return
    setCurrentLessonId(lessonId)
    if (accessToken && accessState === 'enrolled') {
      void flushPendingWrites()
      void updateCurrentLesson(courseId, { currentLessonId: lessonId }, accessToken)
        .catch(() => setSyncError('目前單元暫時無法同步，請稍後再試。'))
    }
  }, [accessState, accessToken, courseId, flushPendingWrites, lessonKey])

  const saveLessonPosition = useCallback((lessonId: string, seconds: number) => {
    const positionSeconds = Math.max(0, Math.floor(seconds))
    if (lessonPositionSecondsRef.current[lessonId] === positionSeconds) return
    const next = { ...lessonPositionSecondsRef.current, [lessonId]: positionSeconds }
    lessonPositionSecondsRef.current = next
    setLessonPositionSeconds(next)
    if (positionSeconds > 0) {
      queueProgressWrite(lessonId, {
        completed: completedLessonIdsRef.current.includes(lessonId),
        positionSeconds,
      })
    }
  }, [queueProgressWrite])

  const flushProgress = useCallback(() => {
    void flushPendingWrites()
  }, [flushPendingWrites])

  const setLessonCompletion = useCallback((lessonId: string, completed: boolean) => {
    const next = completed
      ? completedLessonIdsRef.current.includes(lessonId) ? completedLessonIdsRef.current : [...completedLessonIdsRef.current, lessonId]
      : completedLessonIdsRef.current.filter((id) => id !== lessonId)
    completedLessonIdsRef.current = next
    setCompletedLessonIds(next)
    queueProgressWrite(lessonId, { completed, positionSeconds: lessonPositionSecondsRef.current[lessonId] ?? 0 })
    void flushPendingWrites()
  }, [flushPendingWrites, queueProgressWrite])

  const enroll = useCallback(async () => {
    if (!accessToken) return
    setIsEnrolling(true)
    setSyncError('')
    try {
      await enrollInCourse(courseId, accessToken)
      const progress = await getCourseProgress(courseId, accessToken)
      applyProgress(progress)
      setAccessState('enrolled')
    } catch (error) {
      if (error instanceof LearningApiError && error.status === 409) {
        const progress = await getCourseProgress(courseId, accessToken)
        applyProgress(progress)
        setAccessState('enrolled')
        return
      }
      setSyncError(error instanceof Error ? error.message : '目前無法加入課程，請稍後再試。')
    } finally {
      setIsEnrolling(false)
    }
  }, [accessToken, applyProgress, courseId])

  return {
    accessState,
    completedLessonIds,
    currentLessonId,
    enroll,
    flushProgress,
    isEnrolling,
    lessonPositionSeconds,
    saveLessonPosition,
    selectLesson,
    setLessonCompletion,
    syncError,
  }
}
