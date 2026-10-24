import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import { createRouter } from '@/routes/router'

import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root element missing from index.html')

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={createRouter()} />
  </StrictMode>,
)
