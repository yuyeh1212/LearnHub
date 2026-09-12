import { useEffect, useState } from 'react'

type AsyncState<T> = {
  data: T | null
  error: string | null
  isLoading: boolean
}

export function useFetch<T>(url: string) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, isLoading: true })

  useEffect(() => {
    const controller = new AbortController()
    setState({ data: null, error: null, isLoading: true })

    void fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        return response.json() as Promise<T>
      })
      .then((data) => setState({ data, error: null, isLoading: false }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState({ data: null, error: error instanceof Error ? error.message : 'Request failed', isLoading: false })
      })

    return () => controller.abort()
  }, [url])

  return state
}
