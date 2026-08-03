import productionAssetIds from './productionAssetIds.json' with { type: 'json' }

export type Facing = 'left' | 'right' | 'neutral'
export type AssetStatus = 'placeholder' | 'production'

export interface LabAsset {
  id: string
  key: string
  src: string
  placeholderPath: string
  productionPath: string
  status: AssetStatus
  mounted: boolean
  depth: number
  transparent: boolean
  allowOpaqueBackground: boolean
  origin: readonly [number, number]
  groundAnchor?: readonly [number, number]
  facing: Facing
  mirror: boolean
  safeAreaPercent: number
  attachments: readonly string[]
  desktop: string
  mobile: string
}

export const RENDER_DEPTHS = {
  sky: -100,
  city: -90,
  middle: -80,
  ground: -70,
  barrier: -60,
  fighterShadow: 0,
  fighter: 10,
  worldEffect: 30,
  foreground: 40,
  rain: 50,
  haze: 60,
  lighting: 70,
  ui: 100,
  debug: 200,
} as const

const root = '/assets/combat/divergent-fist'
const productionAssets = new Set<string>(productionAssetIds)
const asset = (
  id: string,
  placeholderPath: string,
  productionPath: string,
  options: Partial<Omit<LabAsset, 'id' | 'key' | 'src' | 'placeholderPath' | 'productionPath' | 'status'>> = {},
): LabAsset => {
  const status: AssetStatus = productionAssets.has(id) ? 'production' : 'placeholder'
  return {
    id,
    key: `df_${id.replaceAll('.', '_')}`,
    src: `${root}/${status === 'production' ? productionPath : placeholderPath}?v=4`,
    placeholderPath,
    productionPath,
    status,
    mounted: true,
    depth: RENDER_DEPTHS.worldEffect,
    transparent: true,
    allowOpaqueBackground: false,
    origin: [0.5, 0.5],
    facing: 'neutral',
    mirror: true,
    safeAreaPercent: 6,
    attachments: [],
    desktop: 'Required at 1440x900 and 1280x720.',
    mobile: 'Required at 844x390.',
    ...options,
  }
}

const fighter = (id: string, path: string, productionPath: string, facing: 'left' | 'right', attachments: readonly string[] = []) => asset(id, path, productionPath, {
  depth: RENDER_DEPTHS.fighter,
  origin: [0.5, 1],
  groundAnchor: [0.5, 1],
  facing,
  mirror: false,
  attachments,
})

export const ASSET_MANIFEST = {
  yuji: {
    idle: fighter('yuji.idle', 'yuji/idle.svg', 'yuji/idle-1200x1600.webp', 'right', ['effect:lead-fist']),
    selected: fighter('yuji.selected', 'yuji/selected.svg', 'yuji/selected-1200x1600.webp', 'right', ['effect:lead-fist']),
    anticipation: fighter('yuji.anticipation', 'yuji/anticipation.svg', 'yuji/anticipation-1200x1600.webp', 'right', ['effect:lead-fist']),
    strike: fighter('yuji.strike', 'yuji/strike.svg', 'yuji/strike-1600x1600.webp', 'right', ['effect:contact']),
    recovery: fighter('yuji.recovery', 'yuji/recovery.svg', 'yuji/recovery-1200x1600.webp', 'right', ['effect:lead-fist']),
    return: fighter('yuji.return', 'yuji/return.svg', 'yuji/return-1200x1600.webp', 'right'),
    shadow: asset('yuji.shadow', 'placeholders/shadow.svg', 'yuji/shadow-800x240.webp', { depth: RENDER_DEPTHS.fighterShadow }),
  },
  maki: {
    idle: fighter('maki.idle', 'maki/idle.svg', 'maki/idle-1200x1600.webp', 'left', ['effect:torso']),
    targeted: fighter('maki.targeted', 'maki/targeted.svg', 'maki/targeted-1200x1600.webp', 'left', ['target:ground', 'effect:torso']),
    physicalHit: fighter('maki.physical-hit', 'maki/physical-hit.svg', 'maki/physical-hit-1400x1600.webp', 'left', ['effect:contact']),
    stagger: fighter('maki.stagger', 'maki/stagger.svg', 'maki/stagger-1400x1600.webp', 'left', ['effect:torso']),
    delayedHit: fighter('maki.delayed-hit', 'maki/delayed-hit.svg', 'maki/delayed-hit-1400x1600.webp', 'left', ['effect:torso']),
    recovery: fighter('maki.recovery', 'maki/recovery.svg', 'maki/recovery-1200x1600.webp', 'left'),
    defeated: fighter('maki.defeated', 'maki/defeated.svg', 'maki/defeated-1400x1600.webp', 'left'),
    shadow: asset('maki.shadow', 'placeholders/shadow.svg', 'maki/shadow-800x240.webp', { depth: RENDER_DEPTHS.fighterShadow }),
  },
  environment: {
    sky: asset('environment.sky', 'environment/sky.svg', 'environment/sky-2560x1440.webp', { depth: RENDER_DEPTHS.sky, transparent: false, allowOpaqueBackground: true }),
    city: asset('environment.city', 'environment/city.svg', 'environment/city-distant-2560x1440.webp', { depth: RENDER_DEPTHS.city }),
    middle: asset('environment.middle', 'environment/middle.svg', 'environment/architecture-middle-2560x1440.webp', { depth: RENDER_DEPTHS.middle }),
    ground: asset('environment.ground', 'environment/ground.svg', 'environment/battle-ground-2560x1440.webp', { depth: RENDER_DEPTHS.ground }),
    barrier: asset('environment.barrier', 'environment/barrier.svg', 'environment/barrier-2560x1440.webp', { depth: RENDER_DEPTHS.barrier }),
    foreground: asset('environment.foreground', 'environment/foreground.svg', 'environment/foreground-2560x1440.webp', { depth: RENDER_DEPTHS.foreground }),
    rain: asset('environment.rain', 'environment/rain.svg', 'environment/rain-1920x1080.webp', { depth: RENDER_DEPTHS.rain }),
    haze: asset('environment.haze', 'environment/haze.svg', 'environment/haze-1920x1080.webp', { depth: RENDER_DEPTHS.haze }),
    lighting: asset('environment.lighting', 'environment/lighting.svg', 'environment/lighting-1920x1080.webp', { depth: RENDER_DEPTHS.lighting }),
  },
  effects: {
    intentArc: asset('effects.intent-arc', 'effects/intent-arc.svg', 'effects/intent-arc-1600x600.webp'),
    arrowEndpoint: asset('effects.arrow-endpoint', 'effects/arrow-endpoint.svg', 'effects/arrow-endpoint-256x256.webp'),
    targetSigilOuter: asset('effects.target-sigil-outer', 'effects/target-sigil-outer.svg', 'effects/target-sigil-outer-800x400.webp'),
    targetSigilInner: asset('effects.target-sigil-inner', 'effects/target-sigil-inner.svg', 'effects/target-sigil-inner-800x400.webp'),
    physicalImpact: asset('effects.physical-impact', 'effects/physical-impact.svg', 'effects/physical-impact-1024x1024.webp'),
    physicalSpeedLines: asset('effects.physical-speed-lines', 'effects/physical-speed-lines.svg', 'effects/physical-speed-lines-1024x512.webp'),
    physicalHitFlash: asset('effects.physical-hit-flash', 'effects/physical-hit-flash.svg', 'effects/physical-hit-flash-1024x1024.webp'),
    cursedCompression: asset('effects.cursed-compression', 'effects/cursed-compression.svg', 'effects/cursed-compression-1024x1024.webp'),
    delayedImpact: asset('effects.delayed-impact', 'effects/delayed-impact.svg', 'effects/delayed-impact-1024x1024.webp'),
    residualEnergy: asset('effects.residual-energy', 'effects/residual-energy.svg', 'effects/residual-energy-1024x1024.webp'),
    physicalDamage: asset('effects.physical-damage', 'effects/damage-physical.svg', 'effects/damage-physical-treatment.svg'),
    delayedDamage: asset('effects.delayed-damage', 'effects/damage-delayed.svg', 'effects/damage-delayed-treatment.svg'),
  },
  ui: {
    healthTrack: asset('ui.health-track', 'ui/health-track.svg', 'ui/health-track-512x96.webp', { depth: RENDER_DEPTHS.ui, origin: [0, 0.5] }),
    healthFill: asset('ui.health-fill', 'ui/health-fill.svg', 'ui/health-fill-512x64.webp', { depth: RENDER_DEPTHS.ui, origin: [0, 0.5], allowOpaqueBackground: true }),
    damageLag: asset('ui.damage-lag', 'ui/damage-lag.svg', 'ui/damage-lag-512x64.webp', { depth: RENDER_DEPTHS.ui, origin: [0, 0.5], allowOpaqueBackground: true }),
    energyPips: asset('ui.energy-pips', 'ui/energy-pips.svg', 'ui/energy-pips-512x128.webp', { depth: RENDER_DEPTHS.ui }),
    queueActor: asset('ui.queue-actor', 'ui/queue-actor.svg', 'ui/queue-actor-256x192.webp', { depth: RENDER_DEPTHS.ui }),
    queueSkill: asset('ui.queue-skill', 'ui/queue-skill.svg', 'ui/queue-skill-256x192.webp', { depth: RENDER_DEPTHS.ui }),
    queueTarget: asset('ui.queue-target', 'ui/queue-target.svg', 'ui/queue-target-256x192.webp', { depth: RENDER_DEPTHS.ui }),
    confirm: asset('ui.confirm', 'ui/confirm.svg', 'ui/confirm-640x192.webp', { depth: RENDER_DEPTHS.ui }),
    skillIcon: asset('ui.skill-icon', 'effects/skill-icon.svg', 'ui/divergent-fist-icon-512x512.webp', { depth: RENDER_DEPTHS.ui }),
    selectedSkill: asset('ui.selected-skill', 'ui/selected-skill.svg', 'ui/selected-skill-768x192.webp', { depth: RENDER_DEPTHS.ui }),
  },
  support: asset('support.fighter', 'placeholders/support-silhouette.svg', 'support/support-fighter-1200x1600.webp', {
    depth: RENDER_DEPTHS.fighter,
    origin: [0.5, 1],
    groundAnchor: [0.5, 1],
    facing: 'right',
  }),
} as const

const collect = (value: unknown, output: LabAsset[]) => {
  if (value && typeof value === 'object' && 'src' in value && 'key' in value) output.push(value as LabAsset)
  else if (value && typeof value === 'object') Object.values(value).forEach((entry) => collect(entry, output))
  return output
}

export const ALL_LAB_ASSETS = collect(ASSET_MANIFEST, [])

export const ENVIRONMENT_LAYERS = [
  ASSET_MANIFEST.environment.sky,
  ASSET_MANIFEST.environment.city,
  ASSET_MANIFEST.environment.middle,
  ASSET_MANIFEST.environment.ground,
  ASSET_MANIFEST.environment.barrier,
  ASSET_MANIFEST.environment.foreground,
  ASSET_MANIFEST.environment.rain,
  ASSET_MANIFEST.environment.haze,
  ASSET_MANIFEST.environment.lighting,
] as const

export const EFFECT_SLOTS = Object.values(ASSET_MANIFEST.effects)
export const UI_SLOTS = Object.values(ASSET_MANIFEST.ui)
