import type { Camera, Paginated, Recording } from '@/api/types'

export const cameras: Camera[] = [
  {
    id: 1,
    name: 'cam1',
    location: 'Entrada',
    is_active: true,
    live_url: 'rtc.didicameras.live/cam1',
  },
  {
    id: 2,
    name: 'cam2',
    location: 'Interior da Loja',
    is_active: false,
    live_url: 'rtc.didicameras.live/cam2',
  },
]

export function makeRecording(overrides: Partial<Recording> = {}): Recording {
  return {
    id: 17,
    camera: { id: 1, name: 'cam1', location: 'Entrada' },
    s3_url: 'https://s3.example.com/bucket-recordings/cam1/2025-01-02_10-30.mp4',
    timestamp: '2025-01-02T10:30:00',
    duration: 300,
    size: 52_428_800,
    filename: '2025-01-02_10-30.mp4',
    public_direct_url: 'https://recordings.didicameras.live/cam1/2025-01-02_10-30.mp4',
    ...overrides,
  }
}

export function page<T>(results: T[], overrides: Partial<Paginated<T>> = {}): Paginated<T> {
  return { count: results.length, next: null, previous: null, results, ...overrides }
}
