import { DIVERGENT_FIST_DAMAGE, LAB_BEATS } from './labConfig'
import type { LabBeat } from './labConfig'
import type { FighterPose } from './FighterEntity'

export interface TargetingPresentation {
  actorId: 'yuji'
  targetId: 'maki'
  arc: boolean
  arrow: boolean
  sigil: boolean
  targetEnergy: boolean
  subduedIds: readonly string[]
}

export const TARGETING_PRESENTATION: TargetingPresentation = {
  actorId: 'yuji',
  targetId: 'maki',
  arc: true,
  arrow: true,
  sigil: true,
  targetEnergy: true,
  subduedIds: ['megumi', 'nobara', 'junpei', 'panda'],
}

export type CameraMode = 'wide' | 'yuji' | 'pair' | 'maki'
export type ImpactMode = 'none' | 'physical' | 'compression' | 'delayed' | 'residual'

export interface BeatPresentation {
  yujiPose: FighterPose
  makiPose: FighterPose
  camera: CameraMode
  impact: ImpactMode
  targeting: boolean
  queue: boolean
  controls: boolean
  makiHealth: 100 | 80 | 70
}

const indexOf = (beat: LabBeat) => LAB_BEATS.indexOf(beat)

export function presentationForBeat(beat: LabBeat): BeatPresentation {
  const index = indexOf(beat)
  const atLeast = (candidate: LabBeat) => index >= indexOf(candidate)
  const after = (start: LabBeat, end: LabBeat) => index >= indexOf(start) && index <= indexOf(end)
  const targeting = after('maki-targeted', 'target-confirmed')
  const queue = after('queued', 'resolution-start')
  const controls = index < indexOf('resolution-start') || beat === 'planning-restored'

  let yujiPose: FighterPose = 'idle'
  if (beat === 'yuji-selected' || beat === 'skill-selected' || targeting) yujiPose = 'selected'
  else if (beat === 'physical-anticipation') yujiPose = 'anticipation'
  else if (after('yuji-advance', 'physical-impact')) yujiPose = 'strike'
  else if (after('first-reaction', 'health-settle')) yujiPose = 'recovery'
  else if (beat === 'recovery') yujiPose = 'recovery'
  else if (beat === 'return') yujiPose = 'return'

  let makiPose: FighterPose = targeting ? 'targeted' : 'idle'
  if (after('physical-impact', 'first-reaction')) makiPose = 'physical-hit'
  else if (after('stagger', 'cursed-compression')) makiPose = 'stagger'
  else if (after('delayed-impact', 'second-reaction')) makiPose = 'delayed-hit'
  else if (after('health-settle', 'return')) makiPose = 'recovery'

  const impact: ImpactMode = beat === 'physical-impact' ? 'physical'
    : beat === 'cursed-compression' ? 'compression'
      : beat === 'delayed-impact' ? 'delayed'
        : beat === 'planning-restored' ? 'residual' : 'none'
  const makiHealth = atLeast('delayed-impact') ? DIVERGENT_FIST_DAMAGE.healthAfterDelayed
    : atLeast('physical-impact') ? DIVERGENT_FIST_DAMAGE.healthAfterPhysical : 100
  const camera: CameraMode = beat === 'yuji-selected' || beat === 'skill-selected' ? 'yuji'
    : after('resolution-start', 'first-reaction') ? 'pair'
      : after('stagger', 'health-settle') ? 'maki' : 'wide'

  return { yujiPose, makiPose, camera, impact, targeting, queue, controls, makiHealth }
}
