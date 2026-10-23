import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import { AuthProvider } from '@/lib/AuthProvider'
import { createQueryClient } from '@/lib/queryClient'
import { createRouter } from '@/routes/router'

import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root element missing from index.html')

const queryClient = createQueryClient()
const router = createRouter()

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
