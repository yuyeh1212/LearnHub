import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CourseProgress } from '../../contracts/learning'
import {
  enrollInCourse,
  getCourseProgress,
  LearningApiError,
  updateCurrentLesson,
  updateLessonProgress,
} from '../../lib/learningApi'
import {
  clearLearningProgressCache,
  readPendingLearningProgressWrites,
  readLearningProgressCache,
  writeLearningProgressCache,
  writePendingLearningProgressWrites,
  type CachedLearningProgress,
  type CachedLessonPosition,
  type PendingLessonProgressWrite,
} from './learningProgressCache'

export type LearningAccessState = 'checking' | 'enrolled' | 'guest' | 'not-enrolled' | 'error'

type PendingLessonProgress = PendingLessonProgressWrite

function toCompletedLessonIds(progress: CourseProgress) {
  return progress.lessons.filter((lesson) => lesson.completedAt).map((lesson) => lesson.lessonId)
}

function createEmptyCache(): CachedLearningProgress {
  return { currentLessonId: null, currentLessonUpdatedAt: 0, lessonPositions: {} }
}

function getCachedPositionMap(cache: CachedLearningProgress | null, lessonIds: string[]) {
  return Object.fromEntries(lessonIds.flatMap((lessonId) => {
    const position = cache?.lessonPositions[lessonId]
    return position ? [[lessonId, position.positionSeconds]] : []
  }))
}

export function useCourseLearningProgress(courseId: string, lessonIds: string[], accessToken: string | null, userId: string | null) {
  const lessonKey = useMemo(() => lessonIds.join(':'), [lessonIds])
  const initialCache = useMemo(() => readLearningProgressCache(userId, courseId), [courseId, lessonKey, userId])
  const initialPendingWrites = useMemo(() => readPendingLearningProgressWrites(userId, courseId), [courseId, userId])
  const initialCurrentLessonId = initialCache?.currentLessonId && lessonIds.includes(initialCache.currentLessonId)
    ? initialCache.currentLessonId
    : lessonIds[0] ?? null
  const initialLessonPositions = getCachedPositionMap(initialCache, lessonIds)
  const [accessState, setAccessState] = useState<LearningAccessState>(accessToken ? 'checking' : 'guest')
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(initialCurrentLessonId)
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([])
  const [lessonPositionSeconds, setLessonPositionSeconds] = useState<Record<string, number>>(initialLessonPositions)
  const [syncError, setSyncError] = useState('')
  const [isEnrolling, setIsEnrolling] = useState(false)
  const pendingWritesRef = useRef(new Map<string, PendingLessonProgress>(Object.entries(initialPendingWrites)))
  const completedLessonIdsRef = useRef<string[]>([])
  const lessonPositionSecondsRef = useRef<Record<string, number>>(initialLessonPositions)
  const cachedProgressRef = useRef<CachedLearningProgress | null>(initialCache)
  const writeTimerRef = useRef<number | null>(null)

  const persistPendingWrites = useCallback(() => {
    writePendingLearningProgressWrites(userId, courseId, Object.fromEntries(pendingWritesRef.current.entries()))
  }, [courseId, userId])

  const applyProgress = useCallback((progress: CourseProgress) => {
    const cachedProgress = readLearningProgressCache(userId, courseId)
    const serverUpdatedAt = Date.parse(progress.updatedAt)
    const shouldUseCachedCurrentLesson = Boolean(
      cachedProgress?.currentLessonId
      && lessonIds.includes(cachedProgress.currentLessonId)
      && cachedProgress.currentLessonUpdatedAt > (Number.isFinite(serverUpdatedAt) ? serverUpdatedAt : 0),
    )
    const nextCurrentLessonId = shouldUseCachedCurrentLesson
      ? cachedProgress?.currentLessonId ?? null
      : progress.currentLessonId && lessonIds.includes(progress.currentLessonId)
        ? progress.currentLessonId
        : lessonIds[0] ?? null
    const nextCompletedLessonIds = toCompletedLessonIds(progress)
    const serverLessonProgress = new Map(progress.lessons.map((lesson) => [lesson.lessonId, lesson]))
    const nextCachedLessonPositions: Record<string, CachedLessonPosition> = {}

    for (const lessonId of lessonIds) {
      const serverPosition = serverLessonProgress.get(lessonId)
      const cachedPosition = cachedProgress?.lessonPositions[lessonId]
      const parsedServerUpdatedAt = serverPosition ? Date.parse(serverPosition.updatedAt) : 0
      nextCachedLessonPositions[lessonId] = cachedPosition && (
        !serverPosition || cachedPosition.updatedAt > (Number.isFinite(parsedServerUpdatedAt) ? parsedServerUpdatedAt : 0)
      )
        ? cachedPosition
        : serverPosition
          ? {
              positionSeconds: serverPosition.positionSeconds,
              updatedAt: Number.isFinite(parsedServerUpdatedAt) ? parsedServerUpdatedAt : 0,
            }
          : { positionSeconds: 0, updatedAt: 0 }
    }

    const nextLessonPositionSeconds = Object.fromEntries(
      Object.entries(nextCachedLessonPositions).map(([lessonId, position]) => [lessonId, position.positionSeconds]),
    )
    const nextCache: CachedLearningProgress = {
      currentLessonId: nextCurrentLessonId,
      currentLessonUpdatedAt: shouldUseCachedCurrentLesson
        ? cachedProgress?.currentLessonUpdatedAt ?? 0
        : Number.isFinite(serverUpdatedAt) ? serverUpdatedAt : 0,
      lessonPositions: nextCachedLessonPositions,
    }
    cachedProgressRef.current = nextCache
    writeLearningProgressCache(userId, courseId, nextCache)
    setCurrentLessonId(nextCurrentLessonId)
    completedLessonIdsRef.current = nextCompletedLessonIds
    lessonPositionSecondsRef.current = nextLessonPositionSeconds
    setCompletedLessonIds(nextCompletedLessonIds)
    setLessonPositionSeconds(nextLessonPositionSeconds)
    setSyncError('')
  }, [courseId, lessonKey, userId])

  useEffect(() => {
    const cachedProgress = readLearningProgressCache(userId, courseId)
    const nextCurrentLessonId = cachedProgress?.currentLessonId && lessonIds.includes(cachedProgress.currentLessonId)
      ? cachedProgress.currentLessonId
      : lessonIds[0] ?? null
    const nextLessonPositionSeconds = getCachedPositionMap(cachedProgress, lessonIds)
    cachedProgressRef.current = cachedProgress
    setCurrentLessonId(nextCurrentLessonId)
    completedLessonIdsRef.current = []
    lessonPositionSecondsRef.current = nextLessonPositionSeconds
    setCompletedLessonIds([])
    setLessonPositionSeconds(nextLessonPositionSeconds)
    setSyncError('')
    pendingWritesRef.current = new Map(Object.entries(readPendingLearningProgressWrites(userId, courseId)))
  }, [courseId, lessonKey, userId])

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
          clearLearningProgressCache(userId, courseId)
          cachedProgressRef.current = null
          lessonPositionSecondsRef.current = {}
          setLessonPositionSeconds({})
          setCurrentLessonId(lessonIds[0] ?? null)
          setAccessState('not-enrolled')
          return
        }
        setAccessState('error')
        setSyncError(error instanceof Error ? error.message : '目前無法取得你的學習進度。')
      })

    return () => controller.abort()
  }, [accessToken, applyProgress, courseId, lessonKey, userId])

  const flushPendingWrites = useCallback(async (keepalive = false) => {
    if (!accessToken || accessState !== 'enrolled') return
    const pendingWrites = [...pendingWritesRef.current.entries()]
    if (pendingWrites.length === 0) return
    if (writeTimerRef.current) {
      window.clearTimeout(writeTimerRef.current)
      writeTimerRef.current = null
    }

    const results = await Promise.allSettled(pendingWrites.map(([lessonId, progress]) => {
      const { completed, positionSeconds } = progress
      return updateLessonProgress(lessonId, { completed, positionSeconds }, accessToken, keepalive)
    }))
    let hasFailedWrite = false
    results.forEach((result, index) => {
      const [lessonId, flushedProgress] = pendingWrites[index]
      if (result.status === 'rejected') {
        hasFailedWrite = true
        return
      }

      const currentProgress = pendingWritesRef.current.get(lessonId)
      if (currentProgress && currentProgress.updatedAt <= flushedProgress.updatedAt) {
        pendingWritesRef.current.delete(lessonId)
      }
    })
    persistPendingWrites()
    if (hasFailedWrite) {
      setSyncError('觀看位置暫時無法同步，請保持頁面開啟後再試一次。')
      return
    }
    setSyncError('')
  }, [accessState, accessToken, persistPendingWrites])

  useEffect(() => {
    if (accessState === 'enrolled' && accessToken && pendingWritesRef.current.size > 0) {
      void flushPendingWrites()
    }
  }, [accessState, accessToken, flushPendingWrites])

  useEffect(() => {
    const flushBeforeLeaving = () => { void flushPendingWrites(true) }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushBeforeLeaving()
        return
      }

      if (document.visibilityState === 'visible') {
        void flushPendingWrites()
      }
    }
    const retryPendingWrites = () => { void flushPendingWrites() }

    window.addEventListener('pagehide', flushBeforeLeaving)
    window.addEventListener('focus', retryPendingWrites)
    window.addEventListener('online', retryPendingWrites)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('pagehide', flushBeforeLeaving)
      window.removeEventListener('focus', retryPendingWrites)
      window.removeEventListener('online', retryPendingWrites)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (writeTimerRef.current) window.clearTimeout(writeTimerRef.current)
      void flushPendingWrites()
    }
  }, [flushPendingWrites])

  const queueProgressWrite = useCallback((lessonId: string, progress: PendingLessonProgress) => {
    if (!accessToken || accessState !== 'enrolled') return
    pendingWritesRef.current.set(lessonId, progress)
    persistPendingWrites()
    if (writeTimerRef.current) return
    writeTimerRef.current = window.setTimeout(() => { void flushPendingWrites() }, 4_000)
  }, [accessState, accessToken, flushPendingWrites, persistPendingWrites])

  const selectLesson = useCallback((lessonId: string) => {
    if (!lessonIds.includes(lessonId)) return
    setCurrentLessonId(lessonId)
    if (accessToken && accessState === 'enrolled') {
      const nextCache = {
        ...(cachedProgressRef.current ?? createEmptyCache()),
        currentLessonId: lessonId,
        currentLessonUpdatedAt: Date.now(),
      }
      cachedProgressRef.current = nextCache
      writeLearningProgressCache(userId, courseId, nextCache)
      void flushPendingWrites()
      void updateCurrentLesson(courseId, { currentLessonId: lessonId }, accessToken)
        .catch(() => setSyncError('目前單元暫時無法同步，請稍後再試。'))
    }
  }, [accessState, accessToken, courseId, flushPendingWrites, lessonKey, userId])

  const saveLessonPosition = useCallback((lessonId: string, seconds: number) => {
    if (!accessToken || accessState !== 'enrolled') return
    const positionSeconds = Math.max(0, Math.floor(seconds))
    if (lessonPositionSecondsRef.current[lessonId] === positionSeconds) return
    const next = { ...lessonPositionSecondsRef.current, [lessonId]: positionSeconds }
    lessonPositionSecondsRef.current = next
    setLessonPositionSeconds(next)
    const nextCache = {
      ...(cachedProgressRef.current ?? createEmptyCache()),
      lessonPositions: {
        ...(cachedProgressRef.current?.lessonPositions ?? {}),
        [lessonId]: { positionSeconds, updatedAt: Date.now() },
      },
    }
    cachedProgressRef.current = nextCache
    writeLearningProgressCache(userId, courseId, nextCache)
    if (positionSeconds > 0) {
      queueProgressWrite(lessonId, {
        completed: completedLessonIdsRef.current.includes(lessonId),
        positionSeconds,
        updatedAt: Date.now(),
      })
    }
  }, [accessState, accessToken, courseId, queueProgressWrite, userId])

  const flushProgress = useCallback(() => {
    void flushPendingWrites()
  }, [flushPendingWrites])

  const setLessonCompletion = useCallback((lessonId: string, completed: boolean) => {
    if (!accessToken || accessState !== 'enrolled') return
    const next = completed
      ? completedLessonIdsRef.current.includes(lessonId) ? completedLessonIdsRef.current : [...completedLessonIdsRef.current, lessonId]
      : completedLessonIdsRef.current.filter((id) => id !== lessonId)
    completedLessonIdsRef.current = next
    setCompletedLessonIds(next)
    queueProgressWrite(lessonId, { completed, positionSeconds: lessonPositionSecondsRef.current[lessonId] ?? 0, updatedAt: Date.now() })
    void flushPendingWrites()
  }, [accessState, accessToken, flushPendingWrites, queueProgressWrite])

  const enroll = useCallback(async () => {
    if (!accessToken) return false
    setIsEnrolling(true)
    setSyncError('')
    try {
      await enrollInCourse(courseId, accessToken)
      const progress = await getCourseProgress(courseId, accessToken)
      applyProgress(progress)
      setAccessState('enrolled')
      return true
    } catch (error) {
      if (error instanceof LearningApiError && error.status === 409) {
        try {
          const progress = await getCourseProgress(courseId, accessToken)
          applyProgress(progress)
          setAccessState('enrolled')
          return true
        } catch (recoveryError) {
          setSyncError(recoveryError instanceof Error ? recoveryError.message : '目前無法取得你的學習進度。')
          return false
        }
      }
      setSyncError(error instanceof Error ? error.message : '目前無法加入課程，請稍後再試。')
      return false
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
