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
      staleTime: 10 * 60 * 1000,       // 10 min — cached data stays fresh much longer
      gcTime: 30 * 60 * 1000,           // 30 min — keep unused cache for 30 min
      refetchOnWindowFocus: false,       // Don't refetch when user switches tabs
      refetchOnReconnect: false,         // Don't refetch on network reconnect
      refetchOnMount: false,             // Don't refetch when component remounts (SPA navigation)
      retry: 2,                          // Retry failed queries twice
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
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
