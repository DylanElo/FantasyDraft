export const FIGHTER_IDS = ['megumi', 'nobara', 'yuji', 'maki', 'junpei', 'panda'] as const
export type FighterId = typeof FIGHTER_IDS[number]

type FormationSpot = readonly [x: number, y: number, scale: number]
type Formation = Record<FighterId, FormationSpot>

export const FORMATIONS: Record<'desktop' | 'mobile', Formation> = {
  desktop: {
    megumi: [0.11, 0.69, 0.72], nobara: [0.23, 0.52, 0.64], yuji: [0.31, 0.84, 1.02],
    maki: [0.70, 0.81, 1.02], junpei: [0.82, 0.50, 0.62], panda: [0.90, 0.69, 0.70],
  },
  mobile: {
    megumi: [0.035, 0.75, 0.34], nobara: [0.13, 0.49, 0.31], yuji: [0.27, 0.94, 0.72],
    maki: [0.68, 0.93, 0.75], junpei: [0.86, 0.48, 0.30], panda: [0.955, 0.74, 0.34],
  },
}

export const layoutModeFor = (width: number, height: number) => height <= 520 && width > height ? 'mobile' : 'desktop'

export function formationFor(id: FighterId, width: number, height: number) {
  const mode = layoutModeFor(width, height)
  const [nx, ny, scale] = FORMATIONS[mode][id]
  const sizeScale = mode === 'mobile' ? height / 390 : Math.min(width / 1440, height / 900)
  return { x: width * nx, y: height * ny, scale: scale * sizeScale }
}

export const formationSnapshot = (width: number, height: number) => Object.fromEntries(
  FIGHTER_IDS.map((id) => [id, formationFor(id, width, height)]),
) as Record<FighterId, ReturnType<typeof formationFor>>
