"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, useEffect } from 'react'
import { get, set, del } from 'idb-keyval'

// Create a persister using idb-keyval (IndexedDB)
const createPersister = () => {
  return createAsyncStoragePersister({
    storage: {
      getItem: async (key) => {
        const value = await get(key)
        return value
      },
      setItem: async (key, value) => {
        await set(key, value)
      },
      removeItem: async (key) => {
        await del(key)
      },
    },
  })
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes by default
            staleTime: 1000 * 60 * 5,
            // Garbage collect after 7 days (matches maxAge)
            gcTime: 1000 * 60 * 60 * 24 * 7,
            // Retry failed queries 1 time
            retry: 1,
            // Refetch on window focus
            refetchOnWindowFocus: true,
          },
        },
      })
  )

  const [persister] = useState(() => {
    if (typeof window !== 'undefined') {
      return createPersister()
    }
    return undefined
  })

  if (persister) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
          buster: 'v1', // Increment this to bust the cache on breaking changes
        }}
      >
        {children}
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </PersistQueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
