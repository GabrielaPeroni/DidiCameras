import { describe, expect, it } from 'vitest'

import { crfLabel, resolutionLabel } from './options'

describe('resolutionLabel', () => {
  it.each([
    ['480:360', 'Baixa'],
    ['1080:720', 'Média'],
    ['1920:1080', 'Alta'],
    ['', 'Nativa'],
    ['640:480', '640:480'],
  ])('%j -> %s', (value, label) => {
    expect(resolutionLabel(value)).toBe(label)
  })
})

describe('crfLabel', () => {
  it.each([
    [18, 'Alta'],
    [21, 'Alta'],
    [22, 'Média'],
    [26, 'Baixa'],
    [29, 'Baixa'],
    [30, 'Muito Baixa'],
    [32, 'Muito Baixa'],
    [17, 'Indefinido'],
    [33, 'Indefinido'],
  ])('%i -> %s', (value, label) => {
    expect(crfLabel(value)).toBe(label)
  })
})
