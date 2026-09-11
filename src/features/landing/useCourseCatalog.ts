import { useEffect, useState } from 'react'
import type { CourseSummary } from '../../contracts/learning'
import { LearningApiError, listCourses } from '../../lib/learningApi'

type CatalogState = {
  courses: CourseSummary[]
  error: string | null
  isLoading: boolean
}

export function useCourseCatalog(query: string) {
  const [state, setState] = useState<CatalogState>({ courses: [], error: null, isLoading: true })
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState((current) => ({ ...current, error: null, isLoading: true }))

    void listCourses({ query }, controller.signal)
      .then((page) => setState({ courses: page.data, error: null, isLoading: false }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setState({
          courses: [],
          error: error instanceof LearningApiError ? error.message : '目前無法取得課程，請稍後再試。',
          isLoading: false,
        })
      })

    return () => controller.abort()
  }, [query, retryKey])

  return { ...state, retry: () => setRetryKey((current) => current + 1) }
}
