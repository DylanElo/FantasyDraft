export type Screen = 'title' | 'profile' | 'selection' | 'matchup' | 'battle' | 'results'
export type CoreEnergy = 'green' | 'blue' | 'white' | 'red'
export type Energy = CoreEnergy | 'black'
export type TargetKind = 'enemy' | 'enemy_team' | 'ally' | 'self'

export interface Skill {
  id: string
  name: string
  cost: Energy[]
  cooldown: number
  target: TargetKind
  tags: string[]
  description: string
  impact: number
}

export interface Character {
  id: string
  name: string
  shortName: string
  role: string
  state: string
  portrait: string
  accent: string
  motif: string
  skills: Skill[]
}

export interface FighterState {
  characterId: string
  hp: number
  defense: number
  statuses: string[]
}

export interface SkillOption {
  skill: Skill
  legalTargets: string[]
  disabledReason?: string
}

export interface QueuedAction {
  id: string
  casterId: string
  skillId: string
  targetId: string
  wildPay?: CoreEnergy
}

export interface BattleSnapshot {
  revision: number
  turn: number
  phase: 'PLANNING' | 'QUEUE_REVIEW' | 'RESOLVING' | 'FINISHED'
  playerTeam: FighterState[]
  enemyTeam: FighterState[]
  energy: Record<CoreEnergy, number>
  queue: QueuedAction[]
  winner: 'player' | 'enemy' | null
}

export interface ResolutionFrame {
  snapshot: BattleSnapshot
  message: string
  actorId: string
  targetId: string
  stage: 'focus' | 'advance' | 'strike' | 'recoil' | 'delayed' | 'return' | 'planning'
  damage?: number
}
