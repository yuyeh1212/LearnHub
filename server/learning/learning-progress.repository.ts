import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import type {
  CourseProgress,
  CursorPage,
  Enrollment,
  LearningCourseSummary,
  LessonProgress,
} from '../../src/contracts/learning.js'

type EnrollmentRow = {
  id: string
  courseId: string
  enrolledAt: Date
}

type CourseLessonRow = {
  id: string
  durationSeconds: number
}

type LessonProgressRow = {
  lessonId: string
  positionSeconds: number
  completedAt: Date | null
  updatedAt: Date
}

type CourseLearningStateRow = {
  currentLessonId: string | null
  updatedAt: Date
}

type LearningCourseRow = {
  category: string
  completedLessonCount: number
  courseId: string
  courseSlug: string
  courseSummary: string
  courseTitle: string
  coverImageUrl: string | null
  currentLessonChapterId: string | null
  currentLessonContentType: 'video' | null
  currentLessonDurationSeconds: number | null
  currentLessonId: string | null
  currentLessonPosition: number | null
  currentLessonTitle: string | null
  enrolledAt: Date
  enrollmentId: string
  instructorName: string
  learnerCount: number
  lessonCount: number
  updatedAt: Date
}

function toIsoDate(value: Date) {
  return value.toISOString()
}

function toEnrollment(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    courseId: row.courseId,
    enrolledAt: toIsoDate(row.enrolledAt),
  }
}

function toLessonProgress(row: LessonProgressRow): LessonProgress {
  return {
    lessonId: row.lessonId,
    positionSeconds: row.positionSeconds,
    completedAt: row.completedAt ? toIsoDate(row.completedAt) : null,
    updatedAt: toIsoDate(row.updatedAt),
  }
}

function toLearningCourseSummary(row: LearningCourseRow): LearningCourseSummary {
  const lessonCount = Number(row.lessonCount)
  const completedLessonCount = Number(row.completedLessonCount)

  return {
    course: {
      id: row.courseId,
      slug: row.courseSlug,
      title: row.courseTitle,
      summary: row.courseSummary,
      category: row.category,
      instructorName: row.instructorName,
      learnerCount: Number(row.learnerCount),
      coverImageUrl: row.coverImageUrl,
    },
    enrollment: {
      id: row.enrollmentId,
      courseId: row.courseId,
      enrolledAt: toIsoDate(row.enrolledAt),
    },
    currentLesson: row.currentLessonId ? {
      id: row.currentLessonId,
      chapterId: row.currentLessonChapterId ?? '',
      position: Number(row.currentLessonPosition),
      title: row.currentLessonTitle ?? '',
      durationSeconds: Number(row.currentLessonDurationSeconds),
      contentType: row.currentLessonContentType ?? 'video',
    } : null,
    completedLessonCount,
    lessonCount,
    completionPercent: lessonCount ? Math.round((completedLessonCount / lessonCount) * 100) : 0,
    updatedAt: toIsoDate(row.updatedAt),
  }
}

export class LearningProgressRepository {
  constructor(private readonly pool: Pool) {}

  async courseExists(courseId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM courses WHERE id = $1 AND status = 'published'
      ) AS "exists"`,
      [courseId],
    )

    return result.rows[0]?.exists ?? false
  }

  async enroll(userId: string, courseId: string): Promise<Enrollment> {
    const result = await this.pool.query<EnrollmentRow>(
      `INSERT INTO enrollments (id, user_id, course_id)
       VALUES ($1, $2, $3)
       RETURNING id, course_id AS "courseId", enrolled_at AS "enrolledAt"`,
      [randomUUID(), userId, courseId],
    )

    return toEnrollment(result.rows[0])
  }

  async listEnrollments(userId: string): Promise<CursorPage<Enrollment>> {
    const result = await this.pool.query<EnrollmentRow>(
      `SELECT id, course_id AS "courseId", enrolled_at AS "enrolledAt"
       FROM enrollments
       WHERE user_id = $1
       ORDER BY enrolled_at DESC
       LIMIT 48`,
      [userId],
    )

    return { data: result.rows.map(toEnrollment), nextCursor: null }
  }

  async listLearningCourses(userId: string): Promise<CursorPage<LearningCourseSummary>> {
    const result = await this.pool.query<LearningCourseRow>(
      `SELECT
        enrollments.id AS "enrollmentId",
        enrollments.course_id AS "courseId",
        enrollments.enrolled_at AS "enrolledAt",
        courses.slug AS "courseSlug",
        courses.title AS "courseTitle",
        courses.summary AS "courseSummary",
        courses.category,
        courses.instructor_name AS "instructorName",
        courses.cover_image_url AS "coverImageUrl",
        (SELECT COUNT(*)::integer FROM enrollments AS course_enrollments
          WHERE course_enrollments.course_id = courses.id) AS "learnerCount",
        COALESCE(progress.lesson_count, 0)::integer AS "lessonCount",
        COALESCE(progress.completed_lesson_count, 0)::integer AS "completedLessonCount",
        current_lesson.id AS "currentLessonId",
        current_lesson.chapter_id AS "currentLessonChapterId",
        current_lesson.position AS "currentLessonPosition",
        current_lesson.title AS "currentLessonTitle",
        current_lesson.duration_seconds AS "currentLessonDurationSeconds",
        current_lesson.content_type AS "currentLessonContentType",
        GREATEST(
          enrollments.enrolled_at,
          COALESCE(learning_state.updated_at, '-infinity'::timestamptz),
          COALESCE(progress.progress_updated_at, '-infinity'::timestamptz)
        ) AS "updatedAt"
       FROM enrollments
       INNER JOIN courses ON courses.id = enrollments.course_id
       LEFT JOIN course_learning_states AS learning_state
         ON learning_state.user_id = enrollments.user_id
         AND learning_state.course_id = enrollments.course_id
       LEFT JOIN LATERAL (
         SELECT
           COUNT(lessons.id)::integer AS lesson_count,
           (COUNT(lesson_progress.lesson_id)
             FILTER (WHERE lesson_progress.completed_at IS NOT NULL))::integer AS completed_lesson_count,
           MAX(lesson_progress.updated_at) AS progress_updated_at
         FROM chapters
         INNER JOIN lessons ON lessons.chapter_id = chapters.id
         LEFT JOIN lesson_progress
           ON lesson_progress.lesson_id = lessons.id
           AND lesson_progress.user_id = enrollments.user_id
         WHERE chapters.course_id = courses.id
       ) AS progress ON true
       LEFT JOIN LATERAL (
         SELECT lessons.id, lessons.chapter_id, lessons.position, lessons.title,
           lessons.duration_seconds, lessons.content_type
         FROM chapters
         INNER JOIN lessons ON lessons.chapter_id = chapters.id
         WHERE chapters.course_id = courses.id
         ORDER BY
           CASE WHEN lessons.id = learning_state.current_lesson_id THEN 0 ELSE 1 END,
           chapters.position ASC,
           lessons.position ASC
         LIMIT 1
       ) AS current_lesson ON true
       WHERE enrollments.user_id = $1 AND courses.status = 'published'
       ORDER BY "updatedAt" DESC, enrollments.id DESC
       LIMIT 48`,
      [userId],
    )

    return { data: result.rows.map(toLearningCourseSummary), nextCursor: null }
  }

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2
      ) AS "exists"`,
      [userId, courseId],
    )

    return result.rows[0]?.exists ?? false
  }

  async findCourseProgress(userId: string, courseId: string): Promise<CourseProgress> {
    const [lessonsResult, progressResult, stateResult] = await Promise.all([
      this.pool.query<CourseLessonRow>(
        `SELECT lessons.id, lessons.duration_seconds AS "durationSeconds"
         FROM lessons
         INNER JOIN chapters ON chapters.id = lessons.chapter_id
         WHERE chapters.course_id = $1
         ORDER BY chapters.position ASC, lessons.position ASC`,
        [courseId],
      ),
      this.pool.query<LessonProgressRow>(
        `SELECT lesson_id AS "lessonId", position_seconds AS "positionSeconds",
          completed_at AS "completedAt", updated_at AS "updatedAt"
         FROM lesson_progress
         WHERE user_id = $1
           AND lesson_id IN (
             SELECT lessons.id
             FROM lessons
             INNER JOIN chapters ON chapters.id = lessons.chapter_id
             WHERE chapters.course_id = $2
           )`,
        [userId, courseId],
      ),
      this.pool.query<CourseLearningStateRow>(
        `SELECT current_lesson_id AS "currentLessonId", updated_at AS "updatedAt"
         FROM course_learning_states
         WHERE user_id = $1 AND course_id = $2`,
        [userId, courseId],
      ),
    ])

    const lessons = lessonsResult.rows
    const progress = progressResult.rows.map(toLessonProgress)
    const state = stateResult.rows[0]
    const latestProgressAt = progressResult.rows.reduce<Date | null>(
      (latest, row) => !latest || row.updatedAt > latest ? row.updatedAt : latest,
      null,
    )
    const updatedAt = state?.updatedAt ?? latestProgressAt ?? new Date()
    const completedLessonCount = progress.filter((item) => item.completedAt).length

    return {
      courseId,
      currentLessonId: state?.currentLessonId ?? lessons[0]?.id ?? null,
      completedLessonCount,
      lessonCount: lessons.length,
      completionPercent: lessons.length ? Math.round((completedLessonCount / lessons.length) * 100) : 0,
      lessons: progress,
      updatedAt: toIsoDate(updatedAt),
    }
  }

  async updateCurrentLesson(userId: string, courseId: string, currentLessonId: string | null): Promise<void> {
    await this.pool.query(
      `INSERT INTO course_learning_states (user_id, course_id, current_lesson_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, course_id) DO UPDATE
       SET current_lesson_id = EXCLUDED.current_lesson_id`,
      [userId, courseId, currentLessonId],
    )
  }

  async lessonBelongsToCourse(lessonId: string, courseId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM lessons
        INNER JOIN chapters ON chapters.id = lessons.chapter_id
        WHERE lessons.id = $1 AND chapters.course_id = $2
      ) AS "exists"`,
      [lessonId, courseId],
    )

    return result.rows[0]?.exists ?? false
  }

  async findCourseForLesson(lessonId: string): Promise<string | null> {
    const result = await this.pool.query<{ courseId: string }>(
      `SELECT courses.id AS "courseId"
       FROM lessons
       INNER JOIN chapters ON chapters.id = lessons.chapter_id
       INNER JOIN courses ON courses.id = chapters.course_id
       WHERE lessons.id = $1 AND courses.status = 'published'`,
      [lessonId],
    )

    return result.rows[0]?.courseId ?? null
  }

  async updateLessonProgress(
    userId: string,
    lessonId: string,
    positionSeconds: number,
    completed: boolean,
  ): Promise<LessonProgress> {
    const result = await this.pool.query<LessonProgressRow>(
      `INSERT INTO lesson_progress (user_id, lesson_id, position_seconds, completed_at)
       VALUES ($1, $2, $3, CASE WHEN $4 THEN now() ELSE NULL END)
       ON CONFLICT (user_id, lesson_id) DO UPDATE
       SET position_seconds = EXCLUDED.position_seconds,
           completed_at = CASE
             WHEN $4 THEN COALESCE(lesson_progress.completed_at, now())
             ELSE NULL
           END
       RETURNING lesson_id AS "lessonId", position_seconds AS "positionSeconds",
         completed_at AS "completedAt", updated_at AS "updatedAt"`,
      [userId, lessonId, positionSeconds, completed],
    )

    return toLessonProgress(result.rows[0])
  }
}
