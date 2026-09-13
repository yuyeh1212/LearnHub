import type {
  CourseListQuery,
  CourseOutline,
  CourseProgress,
  CourseSummary,
  CursorPage,
  Enrollment,
  LessonDetail,
  LessonProgress,
  LearningCourseSummary,
  UpdateCourseProgressInput,
  UpsertLessonProgressInput,
} from '../contracts/learning'
import { notifyAuthSessionExpired } from './authSessionEvents'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3001/api/v1'

type ProblemResponse = {
  detail?: string
  title?: string
}

export class LearningApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'LearningApiError'
    this.status = status
  }
}

type RequestOptions = {
  accessToken?: string
  body?: unknown
  keepalive?: boolean
  method?: 'GET' | 'PATCH' | 'POST' | 'PUT'
  signal?: AbortSignal
}

async function request<T>(path: string, { accessToken, body, keepalive, method = 'GET', signal }: RequestOptions = {}): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      keepalive,
      signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }

    throw new LearningApiError('目前無法連線到課程服務，請稍後重新整理。')
  }

  if (!response.ok) {
    const problem: ProblemResponse | null = await response.json().catch(() => null)
    if (response.status === 401 && accessToken) {
      notifyAuthSessionExpired('unauthorized')
    }
    throw new LearningApiError(problem?.detail || problem?.title || '課程服務暫時無法回應，請稍後再試。', response.status)
  }

  return response.json() as Promise<T>
}

export function listCourses(query: Pick<CourseListQuery, 'cursor' | 'limit' | 'query'>, signal?: AbortSignal) {
  const search = new URLSearchParams()
  if (query.query?.trim()) {
    search.set('query', query.query.trim())
  }
  if (query.cursor) {
    search.set('cursor', query.cursor)
  }
  if (query.limit) {
    search.set('limit', String(query.limit))
  }

  const suffix = search.size ? `?${search.toString()}` : ''
  return request<CursorPage<CourseSummary>>(`/courses${suffix}`, { signal })
}

export function getCourseOutline(courseId: string, signal?: AbortSignal) {
  return request<CourseOutline>(`/courses/${encodeURIComponent(courseId)}/outline`, { signal })
}

export function getLesson(lessonId: string, signal?: AbortSignal) {
  return request<LessonDetail>(`/lessons/${encodeURIComponent(lessonId)}`, { signal })
}

export function enrollInCourse(courseId: string, accessToken: string) {
  return request<Enrollment>('/enrollments', { accessToken, body: { courseId }, method: 'POST' })
}

export function getCourseProgress(courseId: string, accessToken: string, signal?: AbortSignal) {
  return request<CourseProgress>(`/me/course-progress/${encodeURIComponent(courseId)}`, { accessToken, signal })
}

export function listMyLearningCourses(accessToken: string, signal?: AbortSignal) {
  return request<CursorPage<LearningCourseSummary>>('/me/learning-courses', { accessToken, signal })
}

export function updateCurrentLesson(courseId: string, input: UpdateCourseProgressInput, accessToken: string) {
  return request<CourseProgress>(`/me/course-progress/${encodeURIComponent(courseId)}`, { accessToken, body: input, method: 'PATCH' })
}

export function updateLessonProgress(lessonId: string, input: UpsertLessonProgressInput, accessToken: string, keepalive = false) {
  return request<LessonProgress>(`/me/lesson-progress/${encodeURIComponent(lessonId)}`, { accessToken, body: input, keepalive, method: 'PUT' })
}
