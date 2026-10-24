import { describe, expect, it } from 'vitest'

import { fileExtension, formatBytes, formatDuration } from './format'

describe('formatDuration', () => {
  it.each([
    [null, '—'],
    [0, '0:00'],
    [59.6, '1:00'],
    [300, '5:00'],
    [3725, '1:02:05'],
    [-1, '—'],
  ])('%s -> %s', (input, expected) => {
    expect(formatDuration(input)).toBe(expected)
  })
})

describe('formatBytes', () => {
  it.each([
    [null, '—'],
    [512, '512 B'],
    [1536, '1,5 KB'],
    [52_428_800, '50 MB'],
    [3 * 1024 ** 3, '3 GB'],
  ])('%s -> %s', (input, expected) => {
    expect(formatBytes(input)).toBe(expected)
  })
})

describe('fileExtension', () => {
  it.each([
    ['cam1_2025-01-01.mp4', 'MP4'],
    ['https://recordings.didicameras.live/cam1/a.mkv', 'MKV'],
    ['no-extension', ''],
    ['.hidden', ''],
  ])('%s -> %s', (input, expected) => {
    expect(fileExtension(input)).toBe(expected)
  })
})
