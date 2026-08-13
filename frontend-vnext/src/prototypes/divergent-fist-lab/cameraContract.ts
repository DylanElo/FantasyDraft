import type { PlaybackSpeed } from './labConfig'
import type { CameraMode } from './presentationModel'
import { scaledDuration } from './playbackClock'

export interface CameraFrame {
  mode: CameraMode
  x: number
  y: number
  zoom: number
  rotation: number
  viewport: { width: number; height: number }
  shake: { active: boolean; intensity: number }
  flash: { active: boolean }
  fade: { active: boolean }
  transition: 'settled' | 'transitioning'
}

const interpolate = (from: number, to: number, progress: number) => from + (to - from) * progress

export const cameraDuration = (baseDuration: number, speed: PlaybackSpeed) => scaledDuration(baseDuration, speed)

export class CameraPlaybackModel {
  private frame: CameraFrame
  private from: CameraFrame
  private target: CameraFrame
  private elapsed = 0
  private duration = 0
  private paused = false
  private callbackActive = false

  constructor(initial: CameraFrame) {
    this.frame = structuredClone(initial)
    this.from = structuredClone(initial)
    this.target = structuredClone(initial)
  }

  start(target: CameraFrame, baseDuration: number) {
    this.from = structuredClone(this.frame)
    this.target = structuredClone(target)
    this.elapsed = 0
    this.duration = baseDuration
    this.callbackActive = baseDuration > 0
    this.frame.transition = this.callbackActive ? 'transitioning' : 'settled'
    if (!this.callbackActive) this.frame = structuredClone(target)
  }

  advance(realMilliseconds: number, speed: PlaybackSpeed) {
    if (this.paused || !this.callbackActive) return
    this.elapsed = Math.min(this.duration, this.elapsed + realMilliseconds * speed)
    const progress = this.duration ? this.elapsed / this.duration : 1
    this.frame = {
      ...this.target,
      x: interpolate(this.from.x, this.target.x, progress),
      y: interpolate(this.from.y, this.target.y, progress),
      zoom: interpolate(this.from.zoom, this.target.zoom, progress),
      rotation: interpolate(this.from.rotation, this.target.rotation, progress),
      transition: progress === 1 ? 'settled' : 'transitioning',
    }
    if (progress === 1) this.callbackActive = false
  }

  pause() { this.paused = true }
  resume() { this.paused = false }

  reset(frame: CameraFrame) {
    this.frame = structuredClone(frame)
    this.from = structuredClone(frame)
    this.target = structuredClone(frame)
    this.elapsed = 0
    this.duration = 0
    this.paused = false
    this.callbackActive = false
  }

  snapshot() { return structuredClone(this.frame) }
  hasActiveCallback() { return this.callbackActive }
}
