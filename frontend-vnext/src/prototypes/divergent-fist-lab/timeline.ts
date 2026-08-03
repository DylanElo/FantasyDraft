import { BEAT_ANNOUNCEMENTS, LAB_BEATS, LAB_TIMINGS, REDUCED_MOTION_TIMINGS } from './labConfig'
import type { LabBeat, PlaybackSpeed } from './labConfig'
import { rescaleRemaining, retimeRemaining, scaledDuration } from './playbackClock'

export interface TimelineSnapshot {
  beat: LabBeat
  index: number
  playing: boolean
  paused: boolean
  speed: PlaybackSpeed
  reducedMotion: boolean
  announcement: string
}

type Listener = (snapshot: TimelineSnapshot) => void

export class TimelineDirector {
  private index = 0
  private playing = false
  private paused = false
  private speed: PlaybackSpeed = 1
  private reducedMotion = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private deadline = 0
  private remaining = 0
  private readonly listeners = new Set<Listener>()

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => this.listeners.delete(listener)
  }

  snapshot(): TimelineSnapshot {
    const beat = LAB_BEATS[this.index]
    return {
      beat,
      index: this.index,
      playing: this.playing,
      paused: this.paused,
      speed: this.speed,
      reducedMotion: this.reducedMotion,
      announcement: BEAT_ANNOUNCEMENTS[beat],
    }
  }

  durationFor(beat: LabBeat) {
    const timings = this.reducedMotion ? REDUCED_MOTION_TIMINGS : LAB_TIMINGS
    return scaledDuration(timings[beat], this.speed)
  }

  show(beat: LabBeat) {
    this.stopTimer()
    this.index = LAB_BEATS.indexOf(beat)
    this.playing = false
    this.paused = false
    this.emit()
  }

  jump(beat: LabBeat) {
    this.show(beat)
  }

  playFrom(beat: LabBeat = LAB_BEATS[this.index]) {
    this.stopTimer()
    this.index = LAB_BEATS.indexOf(beat)
    this.playing = true
    this.paused = false
    this.emit()
    this.schedule(this.durationFor(beat))
  }

  replay() {
    this.playFrom('planning')
  }

  reset() {
    this.show('planning')
  }

  next() {
    this.stopTimer()
    this.playing = false
    this.paused = false
    this.index = Math.min(this.index + 1, LAB_BEATS.length - 1)
    this.emit()
  }

  previous() {
    this.stopTimer()
    this.playing = false
    this.paused = false
    this.index = Math.max(this.index - 1, 0)
    this.emit()
  }

  pause() {
    if (!this.playing || this.paused) return
    this.remaining = Math.max(0, this.deadline - Date.now())
    this.stopTimer()
    this.paused = true
    this.emit()
  }

  resume() {
    if (!this.playing || !this.paused) return
    this.paused = false
    this.emit()
    this.schedule(this.remaining || this.durationFor(LAB_BEATS[this.index]))
  }

  setSpeed(speed: PlaybackSpeed) {
    const previousSpeed = this.speed
    if (this.playing && !this.paused) this.remaining = Math.max(0, this.deadline - Date.now())
    if (this.playing) this.remaining = rescaleRemaining(this.remaining, previousSpeed, speed)
    this.speed = speed
    if (this.playing && !this.paused) this.schedule(this.remaining)
    this.emit()
  }

  setReducedMotion(reducedMotion: boolean) {
    const beat = LAB_BEATS[this.index]
    const previousDuration = (this.reducedMotion ? REDUCED_MOTION_TIMINGS : LAB_TIMINGS)[beat]
    if (this.playing && !this.paused) this.remaining = Math.max(0, this.deadline - Date.now())
    if (this.playing) this.remaining = retimeRemaining(this.remaining, previousDuration, (reducedMotion ? REDUCED_MOTION_TIMINGS : LAB_TIMINGS)[beat])
    this.reducedMotion = reducedMotion
    if (this.playing && !this.paused) this.schedule(this.remaining)
    this.emit()
  }

  destroy() {
    this.stopTimer()
    this.listeners.clear()
  }

  private schedule(ms: number) {
    this.stopTimer()
    this.remaining = ms
    this.deadline = Date.now() + ms
    this.timer = setTimeout(() => this.advance(), ms)
  }

  private advance() {
    this.timer = null
    if (!this.playing || this.paused) return
    if (this.index >= LAB_BEATS.length - 1) {
      this.playing = false
      this.emit()
      return
    }
    this.index += 1
    this.emit()
    this.schedule(this.durationFor(LAB_BEATS[this.index]))
  }

  private stopTimer() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private emit() {
    const snapshot = this.snapshot()
    this.listeners.forEach((listener) => listener(snapshot))
  }
}
