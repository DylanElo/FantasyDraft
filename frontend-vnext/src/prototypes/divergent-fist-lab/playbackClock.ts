import type { PlaybackSpeed } from './labConfig'

export const scaledDuration = (baseDuration: number, speed: PlaybackSpeed) => baseDuration / speed

export const rescaleRemaining = (remaining: number, previousSpeed: PlaybackSpeed, nextSpeed: PlaybackSpeed) =>
  remaining * previousSpeed / nextSpeed

export const retimeRemaining = (remaining: number, previousDuration: number, nextDuration: number) =>
  previousDuration > 0 ? remaining * nextDuration / previousDuration : nextDuration
