import { LAB_BEATS } from './labConfig'
import type { LabBeat } from './labConfig'

export const VIEWPORT_PRESETS = {
  desktop: { width: 1440, height: 900, label: 'Desktop 1440×900' },
  laptop: { width: 1280, height: 720, label: 'Desktop 1280×720' },
  mobile: { width: 844, height: 390, label: 'Mobile landscape 844×390' },
} as const

export type ViewportPreset = keyof typeof VIEWPORT_PRESETS

export function validReviewBeat(value: string | null): LabBeat {
  return LAB_BEATS.includes(value as LabBeat) ? value as LabBeat : 'planning'
}

export function validViewportPreset(value: string | null): ViewportPreset {
  return value && value in VIEWPORT_PRESETS ? value as ViewportPreset : 'desktop'
}
