import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { DialogProvider } from './contexts/DialogContext'
import { HelmetProvider } from 'react-helmet-async'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min — cached data is "fresh" for 5 min
      gcTime: 15 * 60 * 1000,          // 15 min — keep unused cache for 15 min
      refetchOnWindowFocus: false,      // Don't refetch when user switches tabs
      retry: 2,                         // Retry failed queries twice
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000), // Exponential backoff: 1s, 2s, 4s, max 8s
    },
  },
})

if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DialogProvider>
          <App />
        </DialogProvider>
      </AuthProvider>
    </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
)
