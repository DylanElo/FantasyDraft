import { describe, expect, it } from 'vitest'
import { snapshotForBeat } from './beatSnapshot'
import { DIVERGENT_FIST_DAMAGE, LAB_TIMINGS, REDUCED_MOTION_TIMINGS } from './labConfig'
import { resolvePoseAsset } from './poseContract'
import { ASSET_MANIFEST } from './assetManifest'
import { VIEWPORT_PRESETS } from './reviewMode'
import { FIGHTER_PRESENTATION_CHILD_ROLES } from './runtimeContracts'
import { TimelineDirector } from './timeline'

describe('Divergent Fist technical closure contracts', () => {
  it('parents the entire health presentation with the fighter', () => {
    expect(FIGHTER_PRESENTATION_CHILD_ROLES).toEqual([
      'shadow', 'fighter-art', 'name', 'health-track', 'damage-lag-fill', 'health-fill', 'health-text', 'statuses',
    ])
  })

  it('reconstructs forward, backward, jump, and reset states deterministically', () => {
    const director = new TimelineDirector()
    director.next()
    expect(director.snapshot().beat).toBe('yuji-selected')
    director.previous()
    expect(director.snapshot().beat).toBe('planning')
    director.jump('delayed-impact')
    const first = snapshotForBeat(director.snapshot().beat, 1440, 900, false)
    director.jump('planning')
    director.jump('delayed-impact')
    expect(snapshotForBeat(director.snapshot().beat, 1440, 900, false)).toEqual(first)
    expect(first).toMatchObject({ impact: 'delayed', targeting: false, queue: false, fighters: { maki: { health: 70, pose: 'delayed-hit' } } })
    director.reset()
    expect(snapshotForBeat(director.snapshot().beat, 1440, 900, false)).toMatchObject({ impact: 'none', targeting: false, queue: false })
  })

  it('keeps reduced motion readable without collapsing either hit', () => {
    expect(DIVERGENT_FIST_DAMAGE).toMatchObject({ physical: 20, delayed: 10 })
    expect(REDUCED_MOTION_TIMINGS['delay-hold']).toBe(LAB_TIMINGS['delay-hold'])
    expect(snapshotForBeat('physical-impact', 844, 390, true).fighters.maki.health).toBe(80)
    expect(snapshotForBeat('delayed-impact', 844, 390, true).fighters.maki.health).toBe(70)
  })

  it('defines the exact artist-review viewport presets', () => {
    expect(VIEWPORT_PRESETS).toMatchObject({
      desktop: { width: 1440, height: 900 }, laptop: { width: 1280, height: 720 }, mobile: { width: 844, height: 390 },
    })
  })

  it('reports a missing production-required pose instead of silently falling back in development', () => {
    expect(() => resolvePoseAsset('yuji', 'strike', { idle: ASSET_MANIFEST.yuji.idle }, true)).toThrow('Missing required pose asset: yuji.strike')
  })
})
