import { PageHeader } from '@/components/ui'

import { RecordingsList } from './RecordingsList'

export function HistoryPage() {
  return (
    <>
      <PageHeader
        title="Histórico de Gravações"
        subtitle="Monitore e acesse as gravações das suas câmeras de segurança"
      />
      <RecordingsList />
    </>
  )
}
