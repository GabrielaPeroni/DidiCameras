import { useQuery } from '@tanstack/react-query'

import { listCameras } from '@/api/cameras'

export const cameraKeys = { all: ['cameras'] as const }

export const useCameras = () =>
  useQuery({
    queryKey: cameraKeys.all,
    queryFn: ({ signal }) => listCameras(signal),
    // `is_active` is the live status; keep it reasonably fresh while the grid is open.
    refetchInterval: 30_000,
  })
