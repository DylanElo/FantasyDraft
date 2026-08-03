import type { LabAsset } from './assetManifest'
import type { FighterPose } from './FighterEntity'

export const REQUIRED_POSES = {
  yuji: ['idle', 'selected', 'anticipation', 'strike', 'recovery', 'return'],
  maki: ['idle', 'targeted', 'physical-hit', 'stagger', 'delayed-hit', 'recovery', 'defeated'],
} as const satisfies Record<string, readonly FighterPose[]>

export type PoseAssets = Partial<Record<FighterPose, LabAsset>> & { idle: LabAsset }

export function missingRequiredPoses(fighter: keyof typeof REQUIRED_POSES, assets: Partial<Record<FighterPose, LabAsset>>) {
  return REQUIRED_POSES[fighter].filter((pose) => !assets[pose])
}

export function resolvePoseAsset(fighterId: string, pose: FighterPose, assets: PoseAssets, development: boolean) {
  const resolved = assets[pose]
  if (resolved) return resolved
  const message = `Missing required pose asset: ${fighterId}.${pose}`
  if (development) throw new Error(message)
  console.error(message)
  return assets.idle
}
