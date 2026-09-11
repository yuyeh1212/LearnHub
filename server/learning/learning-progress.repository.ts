import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import type { CourseProgress, CursorPage, Enrollment, LessonProgress } from '../../src/contracts/learning.js'

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
