import 'dotenv/config'
import { Pool } from 'pg'
import { LearningProgressRepository } from '../server/learning/learning-progress.repository.js'

const database = new Pool({ connectionString: process.env.DATABASE_URL })

try {
  const userResult = await database.query<{ userId: string }>(
    `SELECT user_id AS "userId"
     FROM enrollments
     ORDER BY enrolled_at DESC
     LIMIT 1`,
  )
  const userId = process.env.LEARNING_VERIFY_USER_ID ?? userResult.rows[0]?.userId
  if (!userId) {
    throw new Error('No enrolled learner is available for verification.')
  }

  const page = await new LearningProgressRepository(database).listLearningCourses(userId)
  const firstCourse = page.data[0]
  if (!firstCourse) {
    throw new Error('The selected learner has no learning courses.')
  }

  console.info(JSON.stringify({
    completionPercent: firstCourse.completionPercent,
    courseCount: page.data.length,
    currentLesson: firstCourse.currentLesson?.title ?? null,
    firstCourse: firstCourse.course.title,
  }))
} finally {
  await database.end()
}
