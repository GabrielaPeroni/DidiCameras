import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'

import { LoginPage } from '@/features/auth/LoginPage'
import { CamerasPage } from '@/features/cameras/CamerasPage'
import { ConfigPage } from '@/features/config/ConfigPage'
import { PlayerPage } from '@/features/player/PlayerPage'
import { HistoryPage } from '@/features/recordings/HistoryPage'

import { paths } from './paths'

/** Mirrors `app/urls.py`; `/` keeps redirecting to the live view like the Django login flow did. */
export const routes: RouteObject[] = [
  { path: paths.login, element: <LoginPage /> },
  { path: paths.cameras, element: <CamerasPage /> },
  { path: paths.history, element: <HistoryPage /> },
  { path: paths.config, element: <ConfigPage /> },
  { path: '/:cameraId/:recordingId', element: <PlayerPage /> },
  { path: '/', element: <Navigate to={paths.cameras} replace /> },
  { path: '*', element: <Navigate to={paths.cameras} replace /> },
]

export const createRouter = () => createBrowserRouter(routes)
