import { useEffect, useState } from 'react'
import { reactCourse } from '../../data/courseData'

const STORAGE_KEY = 'learnhub.react-course-progress'
const defaultCompletedLessonIds = ['8-1']

interface StoredCourseProgress {
  completedLessonIds: string[]
  currentLessonId: string
  lessonPositionSeconds: Record<string, number>
}

function readLessonPositions(value: unknown, lessonIds: Set<string>) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter(([lessonId, seconds]) =>
      lessonIds.has(lessonId) && typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0,
    ).map(([lessonId, seconds]) => [lessonId, Math.floor(seconds as number)]),
  )
}

function readStoredProgress(): StoredCourseProgress {
  const lessonIds = new Set(reactCourse.lessons.map((lesson) => lesson.id))

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)
    if (!storedValue) {
      return { completedLessonIds: defaultCompletedLessonIds, currentLessonId: '8-2', lessonPositionSeconds: {} }
    }

    const storedProgress: unknown = JSON.parse(storedValue)
    if (!storedProgress || typeof storedProgress !== 'object') {
      throw new Error('Invalid stored course progress')
    }

    const { completedLessonIds, currentLessonId, lessonPositionSeconds } = storedProgress as Partial<StoredCourseProgress>
    return {
      completedLessonIds: Array.isArray(completedLessonIds)
        ? completedLessonIds.filter((lessonId): lessonId is string => typeof lessonId === 'string' && lessonIds.has(lessonId))
        : defaultCompletedLessonIds,
      currentLessonId: typeof currentLessonId === 'string' && lessonIds.has(currentLessonId) ? currentLessonId : '8-2',
      lessonPositionSeconds: readLessonPositions(lessonPositionSeconds, lessonIds),
    }
  } catch {
    return { completedLessonIds: defaultCompletedLessonIds, currentLessonId: '8-2', lessonPositionSeconds: {} }
  }
}

export function useCourseProgress() {
  const [progress, setProgress] = useState<StoredCourseProgress>(readStoredProgress)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  const currentLesson = reactCourse.lessons.find((lesson) => lesson.id === progress.currentLessonId) ?? reactCourse.lessons[0]
  const completion = Math.round((progress.completedLessonIds.length / reactCourse.lessons.length) * 100)

  const selectLesson = (lessonId: string) => {
    setProgress((current) => ({ ...current, currentLessonId: lessonId }))
  }

  const toggleLessonCompletion = (lessonId: string) => {
    setProgress((current) => {
      const completedLessonIds = new Set(current.completedLessonIds)
      completedLessonIds.has(lessonId) ? completedLessonIds.delete(lessonId) : completedLessonIds.add(lessonId)

      return { ...current, completedLessonIds: [...completedLessonIds] }
    })
  }

  const saveLessonPosition = (lessonId: string, seconds: number) => {
    setProgress((current) => {
      const positionSeconds = Math.max(0, Math.floor(seconds))
      if (current.lessonPositionSeconds[lessonId] === positionSeconds) {
        return current
      }

      return {
        ...current,
        lessonPositionSeconds: { ...current.lessonPositionSeconds, [lessonId]: positionSeconds },
      }
    })
  }

  return {
    completion,
    completedLessonIds: progress.completedLessonIds,
    currentLesson,
    lessonPositionSeconds: progress.lessonPositionSeconds ?? {},
    saveLessonPosition,
    selectLesson,
    toggleLessonCompletion,
  }
}
