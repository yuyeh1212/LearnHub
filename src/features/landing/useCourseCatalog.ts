import { useCallback, useEffect, useRef, useState } from 'react'
import type { CourseSummary } from '../../contracts/learning'
import { LearningApiError, listCourses } from '../../lib/learningApi'

const courseCatalogPageSize = 6
const searchDebounceMs = 350

type CatalogState = {
  activeQuery: string
  courses: CourseSummary[]
  error: string | null
  isLoading: boolean
  isLoadingMore: boolean
  loadMoreError: string | null
  nextCursor: string | null
}

function getCourseCatalogError(error: unknown) {
  return error instanceof LearningApiError ? error.message : '課程暫時載不進來，請稍後再試。'
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs)

    return () => window.clearTimeout(timeoutId)
  }, [delayMs, value])

  return debouncedValue
}

export function useCourseCatalog(query: string) {
  const activeQuery = useDebouncedValue(query.trim(), searchDebounceMs)
  const loadMoreControllerRef = useRef<AbortController | null>(null)
  const [state, setState] = useState<CatalogState>({
    activeQuery: '',
    courses: [],
    error: null,
    isLoading: true,
    isLoadingMore: false,
    loadMoreError: null,
    nextCursor: null,
  })
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    return () => loadMoreControllerRef.current?.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadMoreControllerRef.current?.abort()
    loadMoreControllerRef.current = null

    setState((current) => ({
      ...current,
      activeQuery,
      error: null,
      isLoading: true,
      isLoadingMore: false,
      loadMoreError: null,
    }))

    void listCourses({ limit: courseCatalogPageSize, query: activeQuery }, controller.signal)
      .then((page) => setState({
        activeQuery,
        courses: page.data,
        error: null,
        isLoading: false,
        isLoadingMore: false,
        loadMoreError: null,
        nextCursor: page.nextCursor,
      }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setState({
          activeQuery,
          courses: [],
          error: getCourseCatalogError(error),
          isLoading: false,
          isLoadingMore: false,
          loadMoreError: null,
          nextCursor: null,
        })
      })

    return () => controller.abort()
  }, [activeQuery, retryKey])

  const loadMore = useCallback(() => {
    if (!state.nextCursor || state.isLoading || state.isLoadingMore) {
      return
    }

    const cursor = state.nextCursor
    const queryForPage = state.activeQuery
    const controller = new AbortController()
    loadMoreControllerRef.current?.abort()
    loadMoreControllerRef.current = controller

    setState((current) => ({ ...current, isLoadingMore: true, loadMoreError: null }))

    void listCourses({ cursor, limit: courseCatalogPageSize, query: queryForPage }, controller.signal)
      .then((page) => {
        setState((current) => {
          if (current.activeQuery !== queryForPage) {
            return current
          }

          return {
            ...current,
            courses: [...current.courses, ...page.data],
            isLoadingMore: false,
            loadMoreError: null,
            nextCursor: page.nextCursor,
          }
        })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setState((current) => {
          if (current.activeQuery !== queryForPage) {
            return current
          }

          return {
            ...current,
            isLoadingMore: false,
            loadMoreError: getCourseCatalogError(error),
          }
        })
      })
      .finally(() => {
        if (loadMoreControllerRef.current === controller) {
          loadMoreControllerRef.current = null
        }
      })
  }, [state.activeQuery, state.isLoading, state.isLoadingMore, state.nextCursor])

  const retry = useCallback(() => setRetryKey((current) => current + 1), [])

  return { ...state, hasMore: Boolean(state.nextCursor), loadMore, retry }
}
