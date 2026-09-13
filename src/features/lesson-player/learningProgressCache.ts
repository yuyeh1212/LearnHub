const STORAGE_PREFIX = 'learnhub.learning-progress'

export interface CachedLessonPosition {
  positionSeconds: number
  updatedAt: number
}

export interface CachedLearningProgress {
  currentLessonId: string | null
  currentLessonUpdatedAt: number
  lessonPositions: Record<string, CachedLessonPosition>
}

function getStorageKey(userId: string, courseId: string) {
  return `${STORAGE_PREFIX}:${userId}:${courseId}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseLessonPositions(value: unknown) {
  if (!isRecord(value)) return {}

  return Object.fromEntries(Object.entries(value).flatMap(([lessonId, entry]) => {
    if (!isRecord(entry)) return []
    const { positionSeconds, updatedAt } = entry
    if (
      typeof positionSeconds !== 'number'
      || !Number.isFinite(positionSeconds)
      || positionSeconds < 0
      || typeof updatedAt !== 'number'
      || !Number.isFinite(updatedAt)
      || updatedAt < 0
    ) {
      return []
    }

    return [[lessonId, { positionSeconds: Math.floor(positionSeconds), updatedAt }]]
  }))
}

export function readLearningProgressCache(userId: string | null, courseId: string): CachedLearningProgress | null {
  if (!userId) return null

  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(getStorageKey(userId, courseId)) ?? 'null')
    if (!isRecord(value)) return null

    return {
      currentLessonId: typeof value.currentLessonId === 'string' ? value.currentLessonId : null,
      currentLessonUpdatedAt: typeof value.currentLessonUpdatedAt === 'number' && Number.isFinite(value.currentLessonUpdatedAt)
        ? value.currentLessonUpdatedAt
        : 0,
      lessonPositions: parseLessonPositions(value.lessonPositions),
    }
  } catch {
    return null
  }
}

export function writeLearningProgressCache(userId: string | null, courseId: string, progress: CachedLearningProgress) {
  if (!userId) return

  try {
    window.localStorage.setItem(getStorageKey(userId, courseId), JSON.stringify(progress))
  } catch {
    // Progress still syncs to the server when local storage is unavailable.
  }
}

export function clearLearningProgressCache(userId: string | null, courseId: string) {
  if (!userId) return

  try {
    window.localStorage.removeItem(getStorageKey(userId, courseId))
  } catch {
    // Ignore storage restrictions and keep the server as the source of truth.
  }
}
