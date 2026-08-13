import { characterById } from './data'
import type { BattleSnapshot, CoreEnergy, QueuedAction, ResolutionFrame, SkillOption } from './types'

const STARTING_ENERGY: Record<CoreEnergy, number> = { green: 3, blue: 3, white: 3, red: 3 }
const clone = (snapshot: BattleSnapshot): BattleSnapshot => structuredClone(snapshot)

export function createBattle(playerIds: string[], enemyIds: string[]): BattleSnapshot {
  const fighter = (characterId: string) => ({ characterId, hp: 100, defense: 0, statuses: [] })
  return {
    revision: 0,
    turn: 1,
    phase: 'PLANNING',
    playerTeam: playerIds.map(fighter),
    enemyTeam: enemyIds.map(fighter),
    energy: { ...STARTING_ENERGY },
    queue: [],
    winner: null,
  }
}

function reservedEnergy(snapshot: BattleSnapshot, exceptCaster?: string) {
  const remaining = { ...snapshot.energy }
  snapshot.queue.filter((action) => action.casterId !== exceptCaster).forEach((action) => {
    const skill = characterById(action.casterId).skills.find((entry) => entry.id === action.skillId)!
    skill.cost.forEach((cost) => {
      const payment = cost === 'black' ? action.wildPay : cost
      if (payment) remaining[payment] -= 1
    })
  })
  return remaining
}

export function skillOptions(snapshot: BattleSnapshot, casterId: string): SkillOption[] {
  const caster = snapshot.playerTeam.find((fighter) => fighter.characterId === casterId)
  if (!caster || caster.hp <= 0) return []
  const remaining = reservedEnergy(snapshot, casterId)
  return characterById(casterId).skills.map((skill) => {
    const needed = { ...remaining }
    let disabledReason = ''
    for (const cost of skill.cost) {
      if (cost === 'black') {
        if (!Object.values(needed).some((amount) => amount > 0)) disabledReason = 'No core energy can pay Wild.'
      } else if (needed[cost] <= 0) disabledReason = `Not enough ${cost} energy.`
      else needed[cost] -= 1
    }
    const legalTargets = skill.target === 'self' ? [casterId]
      : skill.target === 'ally' ? snapshot.playerTeam.filter((fighter) => fighter.hp > 0).map((fighter) => fighter.characterId)
      : snapshot.enemyTeam.filter((fighter) => fighter.hp > 0).map((fighter) => fighter.characterId)
    return { skill, legalTargets, disabledReason: disabledReason || undefined }
  })
}

export function queueAction(snapshot: BattleSnapshot, action: Omit<QueuedAction, 'id' | 'wildPay'>): BattleSnapshot {
  const next = clone(snapshot)
  const skill = characterById(action.casterId).skills.find((entry) => entry.id === action.skillId)!
  const remaining = reservedEnergy(next, action.casterId)
  const wildPay = skill.cost.includes('black')
    ? (Object.keys(remaining) as CoreEnergy[]).find((color) => remaining[color] > 0)
    : undefined
  next.queue = next.queue.filter((entry) => entry.casterId !== action.casterId)
  next.queue.push({ ...action, id: `${action.casterId}-${next.revision + 1}`, wildPay })
  next.phase = 'QUEUE_REVIEW'
  next.revision += 1
  return next
}

export function moveAction(snapshot: BattleSnapshot, actionId: string, direction: -1 | 1): BattleSnapshot {
  const next = clone(snapshot)
  const index = next.queue.findIndex((action) => action.id === actionId)
  const destination = index + direction
  if (index >= 0 && destination >= 0 && destination < next.queue.length) {
    ;[next.queue[index], next.queue[destination]] = [next.queue[destination], next.queue[index]]
    next.revision += 1
  }
  return next
}

export function cycleWild(snapshot: BattleSnapshot, actionId: string): BattleSnapshot {
  const next = clone(snapshot)
  const action = next.queue.find((entry) => entry.id === actionId)
  if (!action?.wildPay) return next
  const colors: CoreEnergy[] = ['green', 'blue', 'white', 'red']
  action.wildPay = colors[(colors.indexOf(action.wildPay) + 1) % colors.length]
  next.revision += 1
  return next
}

export function resolveQueue(snapshot: BattleSnapshot): ResolutionFrame[] {
  let next = clone(snapshot)
  next.phase = 'RESOLVING'
  const frames: ResolutionFrame[] = []
  for (const action of next.queue) {
    const character = characterById(action.casterId)
    const skill = character.skills.find((entry) => entry.id === action.skillId)!
    const targets = skill.target === 'enemy_team'
      ? next.enemyTeam.filter((fighter) => fighter.hp > 0)
      : [...next.playerTeam, ...next.enemyTeam].filter((fighter) => fighter.characterId === action.targetId)
    frames.push({ snapshot: clone(next), message: `${character.shortName} readies ${skill.name}`, actorId: action.casterId, targetId: action.targetId, stage: 'focus' })
    frames.push({ snapshot: clone(next), message: `${character.shortName} advances`, actorId: action.casterId, targetId: action.targetId, stage: 'advance' })
    const divergent = skill.id === 'fc_yuji_itadori_divergent_fist'
    const firstDamage = divergent ? 20 : skill.impact
    targets.forEach((target) => {
      if (firstDamage > 0) target.hp = Math.max(0, target.hp - firstDamage)
      else {
        target.defense += 15
        target.statuses = [...target.statuses, skill.tags.at(-1) ?? 'Guarded']
      }
    })
    next.revision += 1
    frames.push({ snapshot: clone(next), message: `${skill.name} · ${firstDamage || 'guard'}${firstDamage ? ' damage' : ''}`, actorId: action.casterId, targetId: action.targetId, stage: 'strike', damage: firstDamage || undefined })
    if (divergent) {
      frames.push({ snapshot: clone(next), message: 'Cursed energy lags behind the fist…', actorId: action.casterId, targetId: action.targetId, stage: 'recoil' })
      targets.forEach((target) => { target.hp = Math.max(0, target.hp - 10) })
      next.revision += 1
      frames.push({ snapshot: clone(next), message: 'Delayed cursed impact · 10 damage', actorId: action.casterId, targetId: action.targetId, stage: 'delayed', damage: 10 })
    }
    frames.push({ snapshot: clone(next), message: 'Formation restored', actorId: action.casterId, targetId: action.targetId, stage: 'return' })
  }

  const enemyDefeated = next.enemyTeam.every((fighter) => fighter.hp <= 0)
  const sliceComplete = next.turn >= 3
  if (enemyDefeated || sliceComplete) {
    next.phase = 'FINISHED'
    const playerHp = next.playerTeam.reduce((total, fighter) => total + fighter.hp, 0)
    const enemyHp = next.enemyTeam.reduce((total, fighter) => total + fighter.hp, 0)
    next.winner = playerHp >= enemyHp ? 'player' : 'enemy'
  } else {
    next.turn += 1
    next.phase = 'PLANNING'
    next.energy = { ...STARTING_ENERGY }
  }
  next.queue = []
  next.revision += 1
  frames.push({ snapshot: clone(next), message: next.phase === 'FINISHED' ? 'Barrier verdict confirmed' : `Turn ${next.turn} · planning`, actorId: '', targetId: '', stage: 'planning' })
  return frames
}
