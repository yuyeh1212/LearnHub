export type ISODateTime = string

export type CourseStatus = 'draft' | 'published' | 'archived'
export type LessonContentType = 'video'
export type LessonResourceKind = 'code' | 'document' | 'exercise'

export interface CourseSummary {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  instructorName: string
  learnerCount: number
  coverImageUrl: string | null
}

export interface CourseDetail extends CourseSummary {
  status: CourseStatus
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface ChapterSummary {
  id: string
  courseId: string
  position: number
  title: string
}

export interface LessonSummary {
  id: string
  chapterId: string
  position: number
  title: string
  durationSeconds: number
  contentType: LessonContentType
}

export interface LessonResource {
  id: string
  lessonId: string
  position: number
  title: string
  kind: LessonResourceKind
  downloadUrl: string
  accessExpiresAt: ISODateTime | null
  sizeBytes: number | null
}

export interface LessonDetail extends LessonSummary {
  description: string
  videoUrl: string
  videoAccessExpiresAt: ISODateTime | null
  resources: LessonResource[]
}

export interface CourseOutlineChapter extends ChapterSummary {
  lessons: LessonSummary[]
}

export interface CourseOutline {
  course: CourseDetail
  chapters: CourseOutlineChapter[]
}

export interface Enrollment {
  id: string
  courseId: string
  enrolledAt: ISODateTime
}

export interface LessonProgress {
  lessonId: string
  positionSeconds: number
  completedAt: ISODateTime | null
  updatedAt: ISODateTime
}

export interface CourseProgress {
  courseId: string
  currentLessonId: string | null
  completedLessonCount: number
  lessonCount: number
  completionPercent: number
  lessons: LessonProgress[]
  updatedAt: ISODateTime
}

export interface CourseListQuery {
  cursor?: string
  limit?: number
  query?: string
  category?: string
}

export interface CursorPage<T> {
  data: T[]
  nextCursor: string | null
}

export interface UpdateCourseProgressInput {
  currentLessonId: string | null
}

export interface UpsertLessonProgressInput {
  positionSeconds: number
  completed: boolean
}
