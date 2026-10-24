import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/api/client'

/** Don't retry 4xx: a missing or forbidden resource won't fix itself on the next attempt. */
const shouldRetry = (failureCount: number, error: unknown) =>
  !(error instanceof ApiError && error.status < 500) && failureCount < 2

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000, refetchOnWindowFocus: false },
    },
  })
