import type { CourseListQuery, CourseOutline, CourseSummary, CursorPage, LessonDetail } from '../contracts/learning'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3001/api/v1'

type ProblemResponse = {
  detail?: string
  title?: string
}

export class LearningApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LearningApiError'
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, { signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }

    throw new LearningApiError('目前無法連線到課程服務，請稍後重新整理。')
  }

  if (!response.ok) {
    const problem: ProblemResponse | null = await response.json().catch(() => null)
    throw new LearningApiError(problem?.detail || problem?.title || '課程服務暫時無法回應，請稍後再試。')
  }

  return response.json() as Promise<T>
}

export function listCourses(query: Pick<CourseListQuery, 'query'>, signal?: AbortSignal) {
  const search = new URLSearchParams()
  if (query.query?.trim()) {
    search.set('query', query.query.trim())
  }

  const suffix = search.size ? `?${search.toString()}` : ''
  return request<CursorPage<CourseSummary>>(`/courses${suffix}`, signal)
}

export function getCourseOutline(courseId: string, signal?: AbortSignal) {
  return request<CourseOutline>(`/courses/${encodeURIComponent(courseId)}/outline`, signal)
}

export function getLesson(lessonId: string, signal?: AbortSignal) {
  return request<LessonDetail>(`/lessons/${encodeURIComponent(lessonId)}`, signal)
}
