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
