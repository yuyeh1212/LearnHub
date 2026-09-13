import { useEffect, useState } from 'react'
import type { LearningCourseSummary } from '../../contracts/learning'
import { LearningApiError, listMyLearningCourses } from '../../lib/learningApi'

type MyLearningState = {
  error: string | null
  isLoading: boolean
  isUnauthorized: boolean
  learningCourses: LearningCourseSummary[]
}

export function useMyLearning(accessToken: string | null) {
  const [state, setState] = useState<MyLearningState>({
    error: null,
    isLoading: Boolean(accessToken),
    isUnauthorized: false,
    learningCourses: [],
  })
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!accessToken) {
      setState({ error: null, isLoading: false, isUnauthorized: false, learningCourses: [] })
      return
    }

    const controller = new AbortController()
    setState((current) => ({ ...current, error: null, isLoading: true, isUnauthorized: false }))

    void listMyLearningCourses(accessToken, controller.signal)
      .then((page) => setState({
        error: null,
        isLoading: false,
        isUnauthorized: false,
        learningCourses: page.data,
      }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return

        const isUnauthorized = error instanceof LearningApiError && error.status === 401
        setState({
          error: isUnauthorized
            ? '登入狀態已過期，請重新登入。'
            : error instanceof LearningApiError
              ? error.message
              : '目前無法取得學習紀錄，請稍後再試。',
          isLoading: false,
          isUnauthorized,
          learningCourses: [],
        })
      })

    return () => controller.abort()
  }, [accessToken, retryKey])

  return { ...state, retry: () => setRetryKey((current) => current + 1) }
}
