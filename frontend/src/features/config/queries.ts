import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getConfig, updateConfig } from '@/api/config'
import type { FFmpegConfig } from '@/api/types'

export const configKeys = { all: ['config'] as const }

export const useConfig = () =>
  useQuery({ queryKey: configKeys.all, queryFn: ({ signal }) => getConfig(signal) })

export function useUpdateConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<FFmpegConfig>) => updateConfig(patch),
    onSuccess: (saved) => {
      queryClient.setQueryData(configKeys.all, saved)
    },
  })
}
