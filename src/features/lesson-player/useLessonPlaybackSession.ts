import { useEffect, useMemo, useState } from 'react'

export function useLessonPlaybackSession(lessonIds: string[]) {
  const lessonKey = useMemo(() => lessonIds.join(':'), [lessonIds])
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(lessonIds[0] ?? null)
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([])
  const [lessonPositionSeconds, setLessonPositionSeconds] = useState<Record<string, number>>({})

  useEffect(() => {
    setCurrentLessonId(lessonIds[0] ?? null)
    setCompletedLessonIds([])
    setLessonPositionSeconds({})
  }, [lessonKey])

  const completeLesson = (lessonId: string) => {
    setCompletedLessonIds((current) => current.includes(lessonId) ? current : [...current, lessonId])
  }

  const toggleLessonCompletion = (lessonId: string) => {
    setCompletedLessonIds((current) => current.includes(lessonId)
      ? current.filter((id) => id !== lessonId)
      : [...current, lessonId])
  }

  const saveLessonPosition = (lessonId: string, seconds: number) => {
    const positionSeconds = Math.max(0, Math.floor(seconds))
    setLessonPositionSeconds((current) => current[lessonId] === positionSeconds
      ? current
      : { ...current, [lessonId]: positionSeconds })
  }

  return {
    completedLessonIds,
    completeLesson,
    currentLessonId,
    lessonPositionSeconds,
    saveLessonPosition,
    selectLesson: setCurrentLessonId,
    toggleLessonCompletion,
  }
}
