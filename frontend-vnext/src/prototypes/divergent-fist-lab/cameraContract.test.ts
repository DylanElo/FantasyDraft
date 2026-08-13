import { describe, expect, it } from 'vitest'
import { snapshotForBeat } from './beatSnapshot'
import { cameraDuration, CameraPlaybackModel } from './cameraContract'
import { LAB_BEATS, LAB_TIMINGS } from './labConfig'
import type { PlaybackSpeed } from './labConfig'
import { TimelineDirector } from './timeline'

const planning = () => snapshotForBeat('planning', 1440, 900, false).camera
const impact = () => snapshotForBeat('physical-impact', 1440, 900, false).camera

describe('Divergent Fist camera contract', () => {
  it.each([
    [0.5, 760],
    [1, 380],
    [2, 190],
  ] as const)('scales camera duration at %s× with the shared playback clock', (speed, expected) => {
    expect(cameraDuration(LAB_TIMINGS['yuji-advance'], speed)).toBe(expected)
    const timeline = new TimelineDirector()
    timeline.setSpeed(speed)
    expect(timeline.durationFor('yuji-advance')).toBe(expected)
  })

  it('freezes camera progress while paused and resumes without a jump', () => {
    const model = new CameraPlaybackModel(planning())
    model.start(impact(), 380)
    model.advance(95, 1)
    model.pause()
    const paused = model.snapshot()
    model.advance(500, 1)
    expect(model.snapshot()).toEqual(paused)
    model.resume()
    model.advance(285, 1)
    expect(model.snapshot()).toMatchObject({ ...impact(), transition: 'settled' })
  })

  it('defines a complete settled camera snapshot for every named beat', () => {
    for (const beat of LAB_BEATS) {
      expect(snapshotForBeat(beat, 844, 390, false).camera).toMatchObject({
        rotation: 0,
        viewport: { width: 844, height: 390 },
        shake: { active: false, intensity: 0 },
        flash: { active: false },
        fade: { active: false },
        transition: 'settled',
      })
    }
  })

  it('restores camera state for jump, reset, and replay', () => {
    const timeline = new TimelineDirector()
    timeline.jump('delayed-impact')
    const delayed = snapshotForBeat(timeline.snapshot().beat, 1440, 900, false).camera
    timeline.jump('planning')
    timeline.jump('delayed-impact')
    expect(snapshotForBeat(timeline.snapshot().beat, 1440, 900, false).camera).toEqual(delayed)
    timeline.reset()
    expect(snapshotForBeat(timeline.snapshot().beat, 1440, 900, false).camera).toEqual(planning())
    timeline.jump('return')
    timeline.replay()
    expect(snapshotForBeat(timeline.snapshot().beat, 1440, 900, false).camera).toEqual(planning())
  })

  it('cancels the active camera completion on reset', () => {
    const model = new CameraPlaybackModel(planning())
    model.start(impact(), 380)
    expect(model.hasActiveCallback()).toBe(true)
    model.reset(planning())
    expect(model.hasActiveCallback()).toBe(false)
    model.advance(1000, 2)
    expect(model.snapshot()).toEqual(planning())
  })

  it('uses the intended reduced framing while preserving both hit states', () => {
    const full = snapshotForBeat('delayed-impact', 844, 390, false)
    const reduced = snapshotForBeat('delayed-impact', 844, 390, true)
    expect(reduced.camera.zoom).toBeLessThan(full.camera.zoom)
    expect(reduced.fighters.yuji.x).not.toBe(full.fighters.yuji.x)
    expect(reduced.fighters.maki.health).toBe(70)
  })

  it.each([0.5, 1, 2] as PlaybackSpeed[])('camera and fighter beat timing finish together at %s×', (speed) => {
    const model = new CameraPlaybackModel(planning())
    const baseDuration = LAB_TIMINGS['yuji-advance']
    model.start(impact(), baseDuration)
    model.advance(cameraDuration(baseDuration, speed), speed)
    expect(model.snapshot().transition).toBe('settled')
    const timeline = new TimelineDirector()
    timeline.setSpeed(speed)
    expect(timeline.durationFor('yuji-advance')).toBe(cameraDuration(baseDuration, speed))
  })
})
