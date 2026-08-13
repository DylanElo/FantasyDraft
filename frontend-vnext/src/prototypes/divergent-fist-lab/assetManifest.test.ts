import { describe, expect, it } from 'vitest'
import { ALL_LAB_ASSETS, ASSET_MANIFEST } from './assetManifest'

describe('Divergent Fist asset contract', () => {
  it('keeps every asset addressable and every action pose distinct', () => {
    expect(ALL_LAB_ASSETS.length).toBeGreaterThanOrEqual(38)
    expect(new Set(ALL_LAB_ASSETS.map(({ id }) => id)).size).toBe(ALL_LAB_ASSETS.length)
    expect(new Set(ALL_LAB_ASSETS.map(({ key }) => key)).size).toBe(ALL_LAB_ASSETS.length)
    expect(new Set(Object.values(ASSET_MANIFEST.yuji).filter((item) => item.id.includes('yuji.')).map(({ src }) => src)).size).toBeGreaterThanOrEqual(7)
    expect(new Set(Object.values(ASSET_MANIFEST.maki).filter((item) => item.id.includes('maki.')).map(({ src }) => src)).size).toBeGreaterThanOrEqual(8)
    expect(ALL_LAB_ASSETS.every(({ status }) => status === 'placeholder')).toBe(true)
  })
})
