import { useQuery } from '@tanstack/react-query'

import { listCameras } from '@/api/cameras'

export const cameraKeys = { all: ['cameras'] as const }

export const useCameras = () =>
  useQuery({ queryKey: cameraKeys.all, queryFn: ({ signal }) => listCameras(signal) })
