export const paths = {
  login: '/login',
  cameras: '/camera',
  history: '/history',
  config: '/config',
  /** Matches `Recording.friendly_url` on the backend: `/cam1/17/`. */
  recording: (cameraName: string, recordingId: number) =>
    `/${cameraName.toLowerCase()}/${recordingId}`,
} as const
