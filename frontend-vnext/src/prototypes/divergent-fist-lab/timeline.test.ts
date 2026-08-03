import { afterEach, describe, expect, it, vi } from 'vitest'
import { DIVERGENT_FIST_DAMAGE, LAB_BEATS } from './labConfig'
import { TimelineDirector } from './timeline'

afterEach(() => vi.useRealTimers())

describe('Divergent Fist timeline director', () => {
  it('plays every named beat in deterministic order and keeps both damage events separate', () => {
    vi.useFakeTimers()
    const director = new TimelineDirector()
    const seen: string[] = []
    director.subscribe(({ beat }) => {
      if (seen.at(-1) !== beat) seen.push(beat)
    })

    director.replay()
    for (let index = 0; index < LAB_BEATS.length; index += 1) vi.runOnlyPendingTimers()

    expect(seen).toEqual(LAB_BEATS)
    expect(DIVERGENT_FIST_DAMAGE).toMatchObject({
      physical: 20,
      delayed: 10,
      healthAfterPhysical: 80,
      healthAfterDelayed: 70,
    })
    expect(director.snapshot()).toMatchObject({ beat: 'planning-restored', playing: false })
  })

  it('supports pause, manual navigation, reduced motion, reset, and replay', () => {
    vi.useFakeTimers()
    const director = new TimelineDirector()
    director.setReducedMotion(true)
    director.setSpeed(2)
    director.replay()
    director.pause()
    vi.runAllTimers()
    expect(director.snapshot()).toMatchObject({ beat: 'planning', paused: true, reducedMotion: true, speed: 2 })

    director.next()
    expect(director.snapshot().beat).toBe('yuji-selected')
    director.previous()
    expect(director.snapshot().beat).toBe('planning')
    director.jump('delay-hold')
    expect(director.durationFor('delay-hold')).toBe(190)
    director.reset()
    expect(director.snapshot()).toMatchObject({ beat: 'planning', playing: false, paused: false })
    director.replay()
    expect(director.snapshot().playing).toBe(true)
    director.pause()
    director.resume()
    expect(director.snapshot()).toMatchObject({ playing: true, paused: false })
  })
})
