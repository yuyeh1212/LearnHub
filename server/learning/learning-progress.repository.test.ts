import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { LearningProgressRepository } from './learning-progress.repository.js'

test('course progress uses the saved current lesson and counts completed lessons', async () => {
  const firstLessonId = '11111111-1111-4111-8111-111111111111'
  const secondLessonId = '22222222-2222-4222-8222-222222222222'
  const updatedAt = new Date('2026-09-11T05:30:00.000Z')
  const pool = {
    query: async (statement: string) => {
      if (statement.includes('FROM lesson_progress')) {
        return {
          rows: [
            { lessonId: firstLessonId, positionSeconds: 120, completedAt: updatedAt, updatedAt },
            { lessonId: secondLessonId, positionSeconds: 42, completedAt: null, updatedAt },
          ],
        }
      }
      if (statement.includes('FROM lessons')) {
        return { rows: [{ id: firstLessonId, durationSeconds: 120 }, { id: secondLessonId, durationSeconds: 180 }] }
      }
      return { rows: [{ currentLessonId: secondLessonId, updatedAt }] }
    },
  } as unknown as Pool

  const repository = new LearningProgressRepository(pool)
  const progress = await repository.findCourseProgress('33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444')

  assert.equal(progress.currentLessonId, secondLessonId)
  assert.equal(progress.completedLessonCount, 1)
  assert.equal(progress.lessonCount, 2)
  assert.equal(progress.completionPercent, 50)
  assert.deepEqual(progress.lessons.map((lesson) => lesson.positionSeconds), [120, 42])
})

test('my learning courses include the current lesson and aggregate progress', async () => {
  const enrolledAt = new Date('2026-09-10T08:00:00.000Z')
  const updatedAt = new Date('2026-09-12T05:30:00.000Z')
  const pool = {
    query: async () => ({
      rows: [{
        category: '軟體工程',
        completedLessonCount: 2,
        courseId: '44444444-4444-4444-8444-444444444444',
        courseSlug: 'react-architecture',
        courseSummary: '建立可維護的前端架構能力。',
        courseTitle: 'React 全端工程師培養課程',
        coverImageUrl: null,
        currentLessonChapterId: '55555555-5555-4555-8555-555555555555',
        currentLessonContentType: 'video',
        currentLessonDurationSeconds: 920,
        currentLessonId: '22222222-2222-4222-8222-222222222222',
        currentLessonPosition: 2,
        currentLessonTitle: 'useEffect 與 API 整合',
        enrolledAt,
        enrollmentId: '66666666-6666-4666-8666-666666666666',
        instructorName: '林育賢',
        learnerCount: 18,
        lessonCount: 4,
        updatedAt,
      }],
    }),
  } as unknown as Pool

  const repository = new LearningProgressRepository(pool)
  const page = await repository.listLearningCourses('33333333-3333-4333-8333-333333333333')

  assert.equal(page.nextCursor, null)
  assert.equal(page.data[0].course.title, 'React 全端工程師培養課程')
  assert.equal(page.data[0].currentLesson?.title, 'useEffect 與 API 整合')
  assert.equal(page.data[0].completionPercent, 50)
  assert.equal(page.data[0].updatedAt, updatedAt.toISOString())
})
