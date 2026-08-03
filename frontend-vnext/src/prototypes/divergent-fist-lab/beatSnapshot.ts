import { RENDER_DEPTHS } from './assetManifest'
import type { FighterPose } from './FighterEntity'
import { FIGHTER_IDS, formationSnapshot } from './formationLayout'
import type { FighterId } from './formationLayout'
import type { LabBeat } from './labConfig'
import type { CameraFrame } from './cameraContract'
import { presentationForBeat } from './presentationModel'
import type { ImpactMode } from './presentationModel'

export interface FighterVisualSnapshot {
  x: number
  y: number
  scale: number
  scaleX: number
  scaleY: number
  angle: number
  depth: number
  pose: FighterPose
  health: number
  quiet: boolean
  selected: boolean
  targeted: boolean
}

export interface BeatSnapshot {
  beat: LabBeat
  fighters: Record<FighterId, FighterVisualSnapshot>
  camera: CameraFrame
  targeting: boolean
  queue: boolean
  impact: ImpactMode
}

export function snapshotForBeat(beat: LabBeat, width: number, height: number, reducedMotion: boolean): BeatSnapshot {
  const formation = formationSnapshot(width, height)
  const presentation = presentationForBeat(beat)
  const travel = reducedMotion ? 0.34 : 1
  const resolution = ['resolution-start', 'physical-anticipation', 'yuji-advance', 'physical-strike', 'physical-impact', 'first-reaction', 'stagger', 'delay-hold', 'cursed-compression', 'delayed-impact', 'second-reaction', 'health-settle', 'recovery', 'return'].includes(beat)
  const selectedOnly = beat === 'yuji-selected'
  const activeOnly = presentation.targeting || resolution

  const fighters = Object.fromEntries(FIGHTER_IDS.map((id) => {
    const spot = formation[id]
    return [id, {
      ...spot,
      scaleX: spot.scale,
      scaleY: spot.scale,
      angle: 0,
      depth: RENDER_DEPTHS.fighter + spot.y / 1000,
      pose: id === 'yuji' ? presentation.yujiPose : id === 'maki' ? presentation.makiPose : 'idle',
      health: id === 'maki' ? presentation.makiHealth : 100,
      quiet: selectedOnly ? id !== 'yuji' : activeOnly ? id !== 'yuji' && id !== 'maki' : false,
      selected: id === 'yuji' && (selectedOnly || beat === 'skill-selected' || presentation.targeting),
      targeted: id === 'maki' && presentation.targeting,
    } satisfies FighterVisualSnapshot]
  })) as Record<FighterId, FighterVisualSnapshot>

  const yuji = fighters.yuji
  const maki = fighters.maki
  if (beat === 'yuji-selected') {
    yuji.x += 38 * travel
    yuji.y -= 12
    yuji.scale = yuji.scaleX = yuji.scaleY = formation.yuji.scale * 1.14
  } else if (beat === 'physical-anticipation') {
    yuji.x += 46 * travel
    yuji.y -= 10
    yuji.scaleX = formation.yuji.scale * 1.06
    yuji.scaleY = formation.yuji.scale * 1.1
  } else if (beat === 'yuji-advance') {
    yuji.x = maki.x - 176 * travel
    yuji.y = maki.y + 18
    yuji.scale = yuji.scaleX = yuji.scaleY = formation.yuji.scale * 1.28
  } else if (beat === 'physical-strike' || beat === 'physical-impact') {
    yuji.x = maki.x - 112 * travel
    yuji.y = maki.y + 10
    yuji.scale = yuji.scaleX = yuji.scaleY = formation.yuji.scale * 1.34
  } else if (['first-reaction', 'stagger', 'delay-hold', 'cursed-compression', 'delayed-impact', 'second-reaction', 'health-settle', 'recovery'].includes(beat)) {
    yuji.x = maki.x - 132 * travel
    yuji.y = maki.y + 14
    yuji.scale = yuji.scaleX = yuji.scaleY = formation.yuji.scale * 1.3
  }

  if (beat === 'first-reaction') {
    maki.x += 44 * travel
    maki.angle = 6 * travel
  } else if (['stagger', 'delay-hold', 'cursed-compression', 'delayed-impact'].includes(beat)) {
    maki.x += 30 * travel
    maki.angle = -4 * travel
  } else if (beat === 'second-reaction') {
    maki.x += 62 * travel
    maki.angle = -10 * travel
    maki.scale = maki.scaleX = maki.scaleY = formation.maki.scale * 1.08
  }

  const pairX = (yuji.x + maki.x) / 2
  const framing = presentation.camera === 'yuji'
    ? { mode: presentation.camera, x: yuji.x + 120, y: yuji.y - 95, zoom: reducedMotion ? 1.02 : 1.08 }
    : presentation.camera === 'pair'
      ? { mode: presentation.camera, x: pairX, y: Math.min(yuji.y, maki.y) - 80, zoom: reducedMotion ? 1.03 : 1.12 }
      : presentation.camera === 'maki'
        ? { mode: presentation.camera, x: maki.x - 40, y: maki.y - 120, zoom: reducedMotion ? 1.03 : 1.14 }
        : { mode: presentation.camera, x: width / 2, y: height / 2, zoom: 1 }

  const camera: CameraFrame = {
    ...framing,
    rotation: 0,
    viewport: { width, height },
    shake: { active: false, intensity: 0 },
    flash: { active: false },
    fade: { active: false },
    transition: 'settled',
  }

  return { beat, fighters, camera, targeting: presentation.targeting, queue: presentation.queue, impact: presentation.impact }
}
