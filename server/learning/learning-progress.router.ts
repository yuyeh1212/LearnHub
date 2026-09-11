import { Router } from 'express'
import { z } from 'zod'
import { requireAuthentication } from '../auth/auth.middleware.js'
import { asyncHandler } from '../http/async-handler.js'
import { ProblemError } from '../http/problem.js'
import { validateBody } from '../http/validate.js'
import { LearningProgressRepository } from './learning-progress.repository.js'

const courseIdSchema = z.uuid()
const enrollmentSchema = z.object({ courseId: courseIdSchema }).strict()
const updateCourseProgressSchema = z.object({ currentLessonId: courseIdSchema.nullable() }).strict()
const updateLessonProgressSchema = z.object({
  positionSeconds: z.number().int().min(0).max(86_400),
  completed: z.boolean(),
}).strict()

function parseId(value: unknown, label: string) {
  const parsed = courseIdSchema.safeParse(value)
  if (parsed.success) {
    return parsed.data
  }

  throw new ProblemError({
    status: 400,
    code: 'VALIDATION_ERROR',
    title: 'Validation Failed',
    detail: `The ${label} is invalid.`,
    errors: [{ field: label, message: 'must be a UUID' }],
  })
}

function courseNotFound() {
  return new ProblemError({
    status: 404,
    code: 'COURSE_NOT_FOUND',
    title: 'Not Found',
    detail: 'The requested course does not exist.',
  })
}

function lessonNotFound() {
  return new ProblemError({
    status: 404,
    code: 'LESSON_NOT_FOUND',
    title: 'Not Found',
    detail: 'The requested lesson does not exist.',
  })
}

function enrollmentRequired() {
  return new ProblemError({
    status: 403,
    code: 'ENROLLMENT_REQUIRED',
    title: 'Enrollment Required',
    detail: 'Enroll in this course before updating its learning progress.',
  })
}

function enrollmentConflict() {
  return new ProblemError({
    status: 409,
    code: 'ALREADY_ENROLLED',
    title: 'Conflict',
    detail: 'You are already enrolled in this course.',
  })
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}

export function createLearningProgressRouter(repository: LearningProgressRepository, jwtSecret: string) {
  const router = Router()
  router.use(requireAuthentication(jwtSecret))

  router.post('/enrollments', validateBody(enrollmentSchema), asyncHandler(async (request, response) => {
    const auth = response.locals.auth
    const courseId = request.body.courseId
    if (!await repository.courseExists(courseId)) {
      throw courseNotFound()
    }

    try {
      const enrollment = await repository.enroll(auth.userId, courseId)
      response.status(201).location(`/api/v1/me/enrollments/${enrollment.id}`).json(enrollment)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw enrollmentConflict()
      }
      throw error
    }
  }))

  router.get('/me/enrollments', asyncHandler(async (_request, response) => {
    response.status(200).json(await repository.listEnrollments(response.locals.auth.userId))
  }))

  router.get('/me/course-progress/:courseId', asyncHandler(async (request, response) => {
    const courseId = parseId(request.params.courseId, 'courseId')
    const userId = response.locals.auth.userId
    if (!await repository.courseExists(courseId)) {
      throw courseNotFound()
    }
    if (!await repository.isEnrolled(userId, courseId)) {
      throw enrollmentRequired()
    }

    response.status(200).json(await repository.findCourseProgress(userId, courseId))
  }))

  router.patch('/me/course-progress/:courseId', validateBody(updateCourseProgressSchema), asyncHandler(async (request, response) => {
    const courseId = parseId(request.params.courseId, 'courseId')
    const userId = response.locals.auth.userId
    if (!await repository.courseExists(courseId)) {
      throw courseNotFound()
    }
    if (!await repository.isEnrolled(userId, courseId)) {
      throw enrollmentRequired()
    }
    if (request.body.currentLessonId && !await repository.lessonBelongsToCourse(request.body.currentLessonId, courseId)) {
      throw new ProblemError({
        status: 400,
        code: 'VALIDATION_ERROR',
        title: 'Validation Failed',
        detail: 'The current lesson must belong to this course.',
        errors: [{ field: 'currentLessonId', message: 'must belong to the requested course' }],
      })
    }

    await repository.updateCurrentLesson(userId, courseId, request.body.currentLessonId)
    response.status(200).json(await repository.findCourseProgress(userId, courseId))
  }))

  router.put('/me/lesson-progress/:lessonId', validateBody(updateLessonProgressSchema), asyncHandler(async (request, response) => {
    const lessonId = parseId(request.params.lessonId, 'lessonId')
    const userId = response.locals.auth.userId
    const courseId = await repository.findCourseForLesson(lessonId)
    if (!courseId) {
      throw lessonNotFound()
    }
    if (!await repository.isEnrolled(userId, courseId)) {
      throw enrollmentRequired()
    }

    response.status(200).json(await repository.updateLessonProgress(
      userId,
      lessonId,
      request.body.positionSeconds,
      request.body.completed,
    ))
  }))

  return router
}
