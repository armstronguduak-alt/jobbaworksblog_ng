'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * TanStack Query provider — used ONLY for client-side real-time data
 * (dashboard stats, wallet balances, notifications).
 * Public pages use server-side fetching + ISR instead.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,        // 1 min
        gcTime: 5 * 60 * 1000,       // 5 min
        refetchOnWindowFocus: false,
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
