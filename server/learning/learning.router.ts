import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../http/async-handler.js'
import { ProblemError } from '../http/problem.js'
import { decodeCourseCursor, LearningRepository } from './learning.repository.js'

const courseIdSchema = z.uuid()
const courseListQuerySchema = z.object({
  query: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  cursor: z.string().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(48).default(12),
}).strict()

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, detail: string) {
  const parsed = schema.safeParse(value)
  if (parsed.success) {
    return parsed.data
  }

  throw new ProblemError({
    status: 400,
    code: 'VALIDATION_ERROR',
    title: 'Validation Failed',
    detail,
    errors: parsed.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'request',
      message: issue.message,
    })),
  })
}

function notFound(resource: 'course' | 'lesson') {
  return new ProblemError({
    status: 404,
    code: `${resource.toUpperCase()}_NOT_FOUND`,
    title: 'Not Found',
    detail: `The requested ${resource} does not exist.`,
  })
}

export function createLearningRouter(repository: LearningRepository) {
  const coursesRouter = Router()
  const lessonsRouter = Router()

  coursesRouter.get('/', asyncHandler(async (request, response) => {
    const query = parseOrThrow(courseListQuerySchema, request.query, 'The course query contains invalid fields.')
    if (query.cursor && !decodeCourseCursor(query.cursor)) {
      throw new ProblemError({
        status: 400,
        code: 'VALIDATION_ERROR',
        title: 'Validation Failed',
        detail: 'The course cursor is invalid.',
        errors: [{ field: 'cursor', message: 'must be a valid course cursor' }],
      })
    }

    response.status(200).json(await repository.listCourses(query))
  }))

  coursesRouter.get('/:courseId/outline', asyncHandler(async (request, response) => {
    const courseId = parseOrThrow(courseIdSchema, request.params.courseId, 'The course ID is invalid.')
    const outline = await repository.findCourseOutline(courseId)
    if (!outline) {
      throw notFound('course')
    }

    response.status(200).json(outline)
  }))

  coursesRouter.get('/:courseId', asyncHandler(async (request, response) => {
    const courseId = parseOrThrow(courseIdSchema, request.params.courseId, 'The course ID is invalid.')
    const course = await repository.findCourse(courseId)
    if (!course) {
      throw notFound('course')
    }

    response.status(200).json(course)
  }))

  lessonsRouter.get('/:lessonId', asyncHandler(async (request, response) => {
    const lessonId = parseOrThrow(courseIdSchema, request.params.lessonId, 'The lesson ID is invalid.')
    const lesson = await repository.findLesson(lessonId)
    if (!lesson) {
      throw notFound('lesson')
    }

    response.status(200).json(lesson)
  }))

  return { coursesRouter, lessonsRouter }
}
