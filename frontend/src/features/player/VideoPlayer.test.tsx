import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isHlsUrl } from './hls'
import { VideoPlayer } from './VideoPlayer'

const hls = vi.hoisted(() => ({
  isSupported: vi.fn(() => true),
  loadSource: vi.fn(),
  attachMedia: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn(),
}))

vi.mock('hls.js', () => {
  class FakeHls {
    static isSupported = hls.isSupported
    static Events = { ERROR: 'hlsError' }
    loadSource = hls.loadSource
    attachMedia = hls.attachMedia
    destroy = hls.destroy
    on = hls.on
  }
  return { default: FakeHls }
})

describe('isHlsUrl', () => {
  it.each([
    ['/api/stream/cam1/index.m3u8', true],
    ['/api/stream/cam1/index.m3u8?token=1', true],
    ['https://recordings.didicameras.live/a.mp4', false],
  ])('%s -> %s', (src, expected) => {
    expect(isHlsUrl(src)).toBe(expected)
  })
})

describe('VideoPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets MP4 sources directly without loading hls.js', () => {
    const { container } = render(<VideoPlayer src="https://x.test/a.mp4" />)

    expect(container.querySelector('video')).toHaveAttribute('src', 'https://x.test/a.mp4')
    expect(hls.loadSource).not.toHaveBeenCalled()
  })

  it('attaches hls.js for .m3u8 when the browser has no native HLS', async () => {
    const { container, unmount } = render(<VideoPlayer src="/api/stream/cam1/index.m3u8" />)

    await waitFor(() => {
      expect(hls.loadSource).toHaveBeenCalledWith('/api/stream/cam1/index.m3u8')
    })
    expect(hls.attachMedia).toHaveBeenCalledWith(container.querySelector('video'))

    unmount()
    expect(hls.destroy).toHaveBeenCalled()
  })
})
