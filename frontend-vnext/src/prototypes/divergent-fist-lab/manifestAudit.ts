import { ALL_LAB_ASSETS, EFFECT_SLOTS, ENVIRONMENT_LAYERS, UI_SLOTS } from './assetManifest'
import { FIGHTER_IDS, FORMATIONS } from './formationLayout'
import { REQUIRED_POSES, missingRequiredPoses } from './poseContract'
import { MOUNTED_IMPACT_EFFECT_IDS, MOUNTED_TARGETING_EFFECT_IDS, MOUNTED_UI_ASSET_IDS } from './runtimeContracts'
import { ASSET_MANIFEST } from './assetManifest'

export interface ManifestAuditIssue {
  code: string
  message: string
}

export interface ManifestAuditOptions {
  pathExists: (placeholderPath: string) => boolean | Promise<boolean>
  readText: (placeholderPath: string) => string | Promise<string>
}

const sameSet = (left: readonly string[], right: readonly string[]) => left.length === right.length && left.every((id) => right.includes(id))

export async function auditManifest(options: ManifestAuditOptions) {
  const issues: ManifestAuditIssue[] = []
  const ids = ALL_LAB_ASSETS.map(({ id }) => id)
  if (new Set(ids).size !== ids.length) issues.push({ code: 'duplicate-id', message: 'Asset IDs must be unique.' })

  for (const asset of ALL_LAB_ASSETS) {
    if (!await options.pathExists(asset.placeholderPath)) issues.push({ code: 'missing-path', message: `${asset.id}: ${asset.placeholderPath} does not resolve.` })
    if (asset.origin.some((value) => value < 0 || value > 1)) issues.push({ code: 'invalid-origin', message: `${asset.id}: origin must be within 0..1.` })
    const source = await options.readText(asset.placeholderPath)
    const viewBox = source.match(/viewBox="0 0 (\d+) (\d+)"/)
    if (asset.transparent && !asset.allowOpaqueBackground && viewBox) {
      const fullRect = new RegExp(`<rect[^>]*width="${viewBox[1]}"[^>]*height="${viewBox[2]}"[^>]*(?!fill="none")[^>]*>`)
      if (fullRect.test(source)) issues.push({ code: 'opaque-background', message: `${asset.id}: unexpected full-canvas opaque rectangle.` })
    }
  }

  const yujiPoses = { idle: ASSET_MANIFEST.yuji.idle, selected: ASSET_MANIFEST.yuji.selected, anticipation: ASSET_MANIFEST.yuji.anticipation, strike: ASSET_MANIFEST.yuji.strike, recovery: ASSET_MANIFEST.yuji.recovery, return: ASSET_MANIFEST.yuji.return }
  const makiPoses = { idle: ASSET_MANIFEST.maki.idle, targeted: ASSET_MANIFEST.maki.targeted, 'physical-hit': ASSET_MANIFEST.maki.physicalHit, stagger: ASSET_MANIFEST.maki.stagger, 'delayed-hit': ASSET_MANIFEST.maki.delayedHit, recovery: ASSET_MANIFEST.maki.recovery, defeated: ASSET_MANIFEST.maki.defeated }
  for (const [fighter, poses] of Object.entries({ yuji: yujiPoses, maki: makiPoses }) as [keyof typeof REQUIRED_POSES, typeof yujiPoses | typeof makiPoses][]) {
    const missing = missingRequiredPoses(fighter, poses)
    if (missing.length) issues.push({ code: 'missing-pose', message: `${fighter}: missing ${missing.join(', ')}.` })
    const files = Object.values(poses).map(({ placeholderPath }) => placeholderPath)
    if (new Set(files).size !== files.length) issues.push({ code: 'shared-pose-file', message: `${fighter}: every required pose needs a distinct file.` })
  }

  const mountedEnvironment = ENVIRONMENT_LAYERS.map(({ id }) => id)
  const declaredEnvironment = Object.values(ASSET_MANIFEST.environment).map(({ id }) => id)
  if (!sameSet(mountedEnvironment, declaredEnvironment)) issues.push({ code: 'environment-mismatch', message: 'Mounted environment layers do not match the manifest.' })
  const mountedEffects = [...MOUNTED_TARGETING_EFFECT_IDS, ...MOUNTED_IMPACT_EFFECT_IDS]
  if (!sameSet(mountedEffects, EFFECT_SLOTS.map(({ id }) => id))) issues.push({ code: 'effect-mismatch', message: 'Mounted effects do not match the manifest.' })
  if (!sameSet(MOUNTED_UI_ASSET_IDS, UI_SLOTS.map(({ id }) => id))) issues.push({ code: 'ui-mismatch', message: 'Mounted UI slots do not match the manifest.' })
  if (ALL_LAB_ASSETS.some(({ mounted }) => !mounted)) issues.push({ code: 'unmounted-required', message: 'A production-required asset is not mounted.' })

  for (const mode of Object.keys(FORMATIONS) as (keyof typeof FORMATIONS)[]) {
    const slots = Object.keys(FORMATIONS[mode])
    if (!sameSet(slots, [...FIGHTER_IDS])) issues.push({ code: 'formation-mismatch', message: `${mode}: formation fighter slots are invalid.` })
  }

  return { ok: issues.length === 0, checkedAssets: ALL_LAB_ASSETS.length, issues }
}

export function formatManifestAudit(report: Awaited<ReturnType<typeof auditManifest>>) {
  const lines = [`Divergent Fist manifest audit: ${report.ok ? 'PASS' : 'FAIL'}`, `Checked assets: ${report.checkedAssets}`]
  report.issues.forEach(({ code, message }) => lines.push(`- [${code}] ${message}`))
  return lines.join('\n')
}
