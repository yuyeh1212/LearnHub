import { Buffer } from 'node:buffer'
import type { Pool } from 'pg'
import type { ContentAccessProvider } from '../content/content-access.service.js'
import type {
  CourseDetail,
  CourseListQuery,
  CourseOutline,
  CourseOutlineChapter,
  CourseSummary,
  CursorPage,
  LessonDetail,
  LessonResource,
  LessonSummary,
} from '../../src/contracts/learning.js'

type CourseRow = {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  instructorName: string
  learnerCount: number
  coverImageUrl: string | null
  status: CourseDetail['status']
  createdAt: Date
  updatedAt: Date
}

type ChapterRow = {
  id: string
  courseId: string
  position: number
  title: string
}

type LessonRow = LessonSummary & {
  description: string
  videoAssetId: string | null
  videoFileName: string | null
  videoStorageKey: string | null
  videoUrl: string
}

type ResourceRow = Omit<LessonResource, 'accessExpiresAt'> & {
  contentAssetId: string | null
  contentFileName: string | null
  contentStorageKey: string | null
}

type CourseCursor = {
  createdAt: string
  id: string
}

function toIsoDate(value: Date) {
  return value.toISOString()
}

function toCourseSummary(row: CourseRow): CourseSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    instructorName: row.instructorName,
    learnerCount: Number(row.learnerCount),
    coverImageUrl: row.coverImageUrl,
  }
}

function toCourseDetail(row: CourseRow): CourseDetail {
  return {
    ...toCourseSummary(row),
    status: row.status,
    createdAt: toIsoDate(row.createdAt),
    updatedAt: toIsoDate(row.updatedAt),
  }
}

function encodeCursor(cursor: CourseCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeCourseCursor(cursor: string): CourseCursor | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    if (
      !value
      || typeof value !== 'object'
      || !('createdAt' in value)
      || !('id' in value)
      || typeof value.createdAt !== 'string'
      || Number.isNaN(Date.parse(value.createdAt))
      || typeof value.id !== 'string'
    ) {
      return null
    }

    return { createdAt: value.createdAt, id: value.id }
  } catch {
    return null
  }
}

export class LearningRepository {
  constructor(
    private readonly pool: Pool,
    private readonly contentAccessService: ContentAccessProvider,
  ) {}

  async listCourses(query: CourseListQuery): Promise<CursorPage<CourseSummary>> {
    const cursor = query.cursor ? decodeCourseCursor(query.cursor) : null
    const limit = query.limit ?? 12
    const normalizedQuery = query.query?.trim() || null
    const category = query.category?.trim() || null
    const result = await this.pool.query<CourseRow>(
      `SELECT
        courses.id,
        courses.slug,
        courses.title,
        courses.summary,
        courses.category,
        courses.instructor_name AS "instructorName",
        COUNT(enrollments.id)::integer AS "learnerCount",
        courses.cover_image_url AS "coverImageUrl",
        courses.status,
        courses.created_at AS "createdAt",
        courses.updated_at AS "updatedAt"
      FROM courses
      LEFT JOIN enrollments ON enrollments.course_id = courses.id
      WHERE courses.status = 'published'
        AND ($1::text IS NULL OR courses.category = $1)
        AND (
          $2::text IS NULL
          OR courses.title ILIKE '%' || $2 || '%'
          OR courses.category ILIKE '%' || $2 || '%'
          OR courses.instructor_name ILIKE '%' || $2 || '%'
        )
        AND (
          $3::timestamptz IS NULL
          OR (courses.created_at, courses.id) < ($3::timestamptz, $4::uuid)
        )
      GROUP BY courses.id
      ORDER BY courses.created_at DESC, courses.id DESC
      LIMIT $5`,
      [category, normalizedQuery, cursor?.createdAt ?? null, cursor?.id ?? null, limit + 1],
    )

    const hasNextPage = result.rows.length > limit
    const pageRows = result.rows.slice(0, limit)
    const lastRow = pageRows.at(-1)

    return {
      data: pageRows.map(toCourseSummary),
      nextCursor: hasNextPage && lastRow
        ? encodeCursor({ createdAt: toIsoDate(lastRow.createdAt), id: lastRow.id })
        : null,
    }
  }

  async findCourse(courseId: string): Promise<CourseDetail | null> {
    const result = await this.pool.query<CourseRow>(
      `SELECT
        courses.id,
        courses.slug,
        courses.title,
        courses.summary,
        courses.category,
        courses.instructor_name AS "instructorName",
        COUNT(enrollments.id)::integer AS "learnerCount",
        courses.cover_image_url AS "coverImageUrl",
        courses.status,
        courses.created_at AS "createdAt",
        courses.updated_at AS "updatedAt"
      FROM courses
      LEFT JOIN enrollments ON enrollments.course_id = courses.id
      WHERE courses.id = $1 AND courses.status = 'published'
      GROUP BY courses.id`,
      [courseId],
    )

    return result.rows[0] ? toCourseDetail(result.rows[0]) : null
  }

  async findCourseOutline(courseId: string): Promise<CourseOutline | null> {
    const course = await this.findCourse(courseId)
    if (!course) {
      return null
    }

    const [chaptersResult, lessonsResult] = await Promise.all([
      this.pool.query<ChapterRow>(
        `SELECT id, course_id AS "courseId", position, title
         FROM chapters
         WHERE course_id = $1
         ORDER BY position ASC`,
        [courseId],
      ),
      this.pool.query<LessonSummary>(
        `SELECT id, chapter_id AS "chapterId", position, title,
          duration_seconds AS "durationSeconds", content_type AS "contentType"
         FROM lessons
         WHERE chapter_id IN (SELECT id FROM chapters WHERE course_id = $1)
         ORDER BY chapter_id, position ASC`,
        [courseId],
      ),
    ])

    const lessonsByChapter = new Map<string, LessonSummary[]>()
    for (const lesson of lessonsResult.rows) {
      const lessons = lessonsByChapter.get(lesson.chapterId) ?? []
      lessons.push(lesson)
      lessonsByChapter.set(lesson.chapterId, lessons)
    }

    const chapters: CourseOutlineChapter[] = chaptersResult.rows.map((chapter) => ({
      ...chapter,
      lessons: lessonsByChapter.get(chapter.id) ?? [],
    }))

    return { course, chapters }
  }

  async findLesson(lessonId: string): Promise<LessonDetail | null> {
    const lessonResult = await this.pool.query<LessonRow>(
      `SELECT lessons.id, lessons.chapter_id AS "chapterId", lessons.position, lessons.title,
        lessons.duration_seconds AS "durationSeconds", lessons.content_type AS "contentType",
        lessons.description, lessons.video_asset_id AS "videoAssetId", lessons.video_url AS "videoUrl",
        video_asset.storage_key AS "videoStorageKey", video_asset.original_file_name AS "videoFileName"
       FROM lessons
       INNER JOIN chapters ON chapters.id = lessons.chapter_id
       INNER JOIN courses ON courses.id = chapters.course_id
       LEFT JOIN content_assets AS video_asset ON video_asset.id = lessons.video_asset_id
       WHERE lessons.id = $1 AND courses.status = 'published'`,
      [lessonId],
    )
    const lesson = lessonResult.rows[0]
    if (!lesson) {
      return null
    }

    const resourcesResult = await this.pool.query<ResourceRow>(
      `SELECT lesson_resources.id, lesson_resources.lesson_id AS "lessonId",
        lesson_resources.position, lesson_resources.title, lesson_resources.kind,
        lesson_resources.content_asset_id AS "contentAssetId", lesson_resources.download_url AS "downloadUrl",
        lesson_resources.size_bytes AS "sizeBytes", content_asset.storage_key AS "contentStorageKey",
        content_asset.original_file_name AS "contentFileName"
       FROM lesson_resources
       LEFT JOIN content_assets AS content_asset ON content_asset.id = lesson_resources.content_asset_id
       WHERE lesson_id = $1
       ORDER BY position ASC`,
      [lessonId],
    )

    const videoAccess = lesson.videoAssetId
      ? await this.contentAccessService.createAccess({
          assetId: lesson.videoAssetId,
          disposition: 'inline',
          originalFileName: lesson.videoFileName ?? undefined,
          storageKey: lesson.videoStorageKey ?? undefined,
        })
      : null

    return {
      ...lesson,
      videoUrl: videoAccess?.url ?? lesson.videoUrl,
      videoAccessExpiresAt: videoAccess?.expiresAt ?? null,
      resources: await Promise.all(resourcesResult.rows.map(async (resource) => {
        const access = resource.contentAssetId
          ? await this.contentAccessService.createAccess({
              assetId: resource.contentAssetId,
              disposition: 'attachment',
              originalFileName: resource.contentFileName ?? undefined,
              storageKey: resource.contentStorageKey ?? undefined,
            })
          : null
        const {
          contentAssetId: _contentAssetId,
          contentFileName: _contentFileName,
          contentStorageKey: _contentStorageKey,
          ...publicResource
        } = resource
        return {
          ...publicResource,
          accessExpiresAt: access?.expiresAt ?? null,
          downloadUrl: access?.url ?? resource.downloadUrl,
          sizeBytes: Number(resource.sizeBytes),
        }
      })),
    }
  }
}
