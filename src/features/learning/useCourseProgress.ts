import { useEffect, useState } from 'react'
import { reactCourse } from '../../data/courseData'

const STORAGE_KEY = 'learnhub.react-course-progress'
const defaultCompletedLessonIds = ['8-1']

interface StoredCourseProgress {
  completedLessonIds: string[]
  currentLessonId: string
}

function readStoredProgress(): StoredCourseProgress {
  const lessonIds = new Set(reactCourse.lessons.map((lesson) => lesson.id))

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)
    if (!storedValue) {
      return { completedLessonIds: defaultCompletedLessonIds, currentLessonId: '8-2' }
    }

    const storedProgress: unknown = JSON.parse(storedValue)
    if (!storedProgress || typeof storedProgress !== 'object') {
      throw new Error('Invalid stored course progress')
    }

    const { completedLessonIds, currentLessonId } = storedProgress as Partial<StoredCourseProgress>
    return {
      completedLessonIds: Array.isArray(completedLessonIds)
        ? completedLessonIds.filter((lessonId): lessonId is string => typeof lessonId === 'string' && lessonIds.has(lessonId))
        : defaultCompletedLessonIds,
      currentLessonId: typeof currentLessonId === 'string' && lessonIds.has(currentLessonId) ? currentLessonId : '8-2',
    }
  } catch {
    return { completedLessonIds: defaultCompletedLessonIds, currentLessonId: '8-2' }
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

  return {
    completion,
    completedLessonIds: progress.completedLessonIds,
    currentLesson,
    selectLesson,
    toggleLessonCompletion,
  }
}
