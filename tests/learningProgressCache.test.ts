import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearLearningProgressCache,
  readPendingLearningProgressWrites,
  readLearningProgressCache,
  writePendingLearningProgressWrites,
  writeLearningProgressCache,
} from '../src/features/lesson-player/learningProgressCache.js'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: new MemoryStorage() },
})

test('learning progress cache is isolated by user and course', () => {
  writeLearningProgressCache('user-a', 'course-a', {
    currentLessonId: 'lesson-2',
    currentLessonUpdatedAt: 100,
    lessonPositions: { 'lesson-2': { positionSeconds: 42, updatedAt: 100 } },
  })

  assert.equal(readLearningProgressCache('user-a', 'course-a')?.lessonPositions['lesson-2']?.positionSeconds, 42)
  assert.equal(readLearningProgressCache('user-b', 'course-a'), null)
  assert.equal(readLearningProgressCache('user-a', 'course-b'), null)
})

test('learning progress cache can be cleared without affecting another course', () => {
  writeLearningProgressCache('user-a', 'course-b', {
    currentLessonId: 'lesson-1',
    currentLessonUpdatedAt: 200,
    lessonPositions: {},
  })

  clearLearningProgressCache('user-a', 'course-a')

  assert.equal(readLearningProgressCache('user-a', 'course-a'), null)
  assert.equal(readLearningProgressCache('user-a', 'course-b')?.currentLessonId, 'lesson-1')
})

test('pending learning progress writes are isolated and replaceable', () => {
  writePendingLearningProgressWrites('user-a', 'course-a', {
    'lesson-1': { completed: false, positionSeconds: 80.7, updatedAt: 300 },
  })

  assert.deepEqual(readPendingLearningProgressWrites('user-a', 'course-a'), {
    'lesson-1': { completed: false, positionSeconds: 80, updatedAt: 300 },
  })
  assert.deepEqual(readPendingLearningProgressWrites('user-b', 'course-a'), {})
  assert.deepEqual(readPendingLearningProgressWrites('user-a', 'course-b'), {})

  writePendingLearningProgressWrites('user-a', 'course-a', {})

  assert.deepEqual(readPendingLearningProgressWrites('user-a', 'course-a'), {})
})

test('clearing learning progress also clears pending writes for the same course', () => {
  writeLearningProgressCache('user-a', 'course-a', {
    currentLessonId: 'lesson-2',
    currentLessonUpdatedAt: 100,
    lessonPositions: { 'lesson-2': { positionSeconds: 42, updatedAt: 100 } },
  })
  writePendingLearningProgressWrites('user-a', 'course-a', {
    'lesson-2': { completed: false, positionSeconds: 42, updatedAt: 100 },
  })
  writePendingLearningProgressWrites('user-a', 'course-b', {
    'lesson-1': { completed: true, positionSeconds: 120, updatedAt: 200 },
  })

  clearLearningProgressCache('user-a', 'course-a')

  assert.equal(readLearningProgressCache('user-a', 'course-a'), null)
  assert.deepEqual(readPendingLearningProgressWrites('user-a', 'course-a'), {})
  assert.deepEqual(readPendingLearningProgressWrites('user-a', 'course-b'), {
    'lesson-1': { completed: true, positionSeconds: 120, updatedAt: 200 },
  })
})
