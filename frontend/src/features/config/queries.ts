import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getConfig, resetConfig, updateConfig } from '@/api/config'
import type { FFmpegConfig, FFmpegConfigPatch } from '@/api/types'

export const configKeys = { all: ['config'] as const }

export const useConfig = () =>
  useQuery({ queryKey: configKeys.all, queryFn: ({ signal }) => getConfig(signal) })

export type ConfigMutation = { kind: 'update'; patch: FFmpegConfigPatch } | { kind: 'reset' }

/** Save and reset share one mutation so the form has a single pending/error state. */
export function useSaveConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: ConfigMutation): Promise<FFmpegConfig> =>
      action.kind === 'reset' ? resetConfig() : updateConfig(action.patch),
    onSuccess: (saved) => {
      queryClient.setQueryData(configKeys.all, saved)
    },
  })
}
