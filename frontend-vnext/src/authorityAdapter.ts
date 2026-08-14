import type { BattleSnapshot, CoreEnergy, Energy, QueuedAction, ResolutionFrame, Skill, SkillOption, TargetKind } from './types'

export interface SocketLike {
  connected?: boolean
  on: (event: string, handler: (payload?: unknown) => void) => void
  off?: (event: string, handler: (payload?: unknown) => void) => void
  emit: (event: string, payload?: unknown) => void
  disconnect: () => void
}

declare global {
  interface Window {
    io?: () => SocketLike
  }
}

interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export interface ServerStatus {
  id: string
  name: string
  payload: Record<string, unknown>
}

export interface ServerCharacter {
  character_id: string
  name: string
  max_hp: number
  hp: number
  alive: boolean
  statuses: ServerStatus[]
}

export interface ServerPlayer {
  id: string
  name: string
  energy: Record<CoreEnergy, number>
  team: ServerCharacter[]
  active_slots: number[]
  queue_confirmed: boolean
}

export interface ServerTargetPayload {
  target_player_id: string
  target_slot: number | null
  target_slots?: number[]
  secondary_target_slot?: number | null
  alternate_target_player_id?: string | null
  alternate_target_slot?: number | null
}

export interface ServerAction extends ServerTargetPayload {
  id: string
  player_id: string
  caster_slot: number
  skill_id: string
  wildcard_pays: CoreEnergy[]
  queue_index: number
}

export interface ServerSkill {
  id: string
  name: string
  text?: string
  description?: string
  cost: Energy[]
  cooldown: number
  classes?: string[]
  target_rule?: { kind?: string }
}

interface ServerSkillOption {
  effective_skill_id: string
  adjusted_cost: Energy[]
  disabled_reason: string | null
  legal_target_payloads: ServerTargetPayload[]
}

export interface ServerEvent {
  type: string
  message: string
  payload: Record<string, unknown>
}

export interface ServerBattleSnapshot {
  match_id: string
  turn_player_id: string
  phase: string
  turn_number: number
  players: Record<string, ServerPlayer>
  pending_actions: Record<string, ServerAction[]>
  queue_order: Record<string, string[]>
  event_log: ServerEvent[]
  winner_id: string | null
  result_type?: string | null
  state_revision: number
  skill_catalog: Record<string, { skills: ServerSkill[] }>
  skill_options: Record<string, Record<string, ServerSkillOption>>
}

export interface AuthoritySession {
  room_id: string
  player_id: string
  resume_token: string
}

export type PendingCommandKind = 'submit_plan' | 'confirm_queue' | 'update_queue'

interface PendingCommand {
  event: string
  kind: PendingCommandKind
  revision: number
  envelope: Record<string, unknown>
}

export interface AuthorityState {
  connected: boolean
  snapshot: ServerBattleSnapshot | null
  events: ServerEvent[]
  session: AuthoritySession | null
  playerId: string | null
  pendingCommand: PendingCommandKind | null
  error: string | null
}

export interface SubmitActionIntent extends ServerTargetPayload {
  caster_slot: number
  skill_id: string
}

export interface AuthorityClient {
  getState: () => AuthorityState
  subscribe: (listener: (state: AuthorityState) => void) => () => void
  startBattle: (playerTeam: string[], enemyTeam: string[]) => void
  submitAction: (action: SubmitActionIntent) => string | null
  payWildcard: (actionId: string, energy: CoreEnergy) => boolean
  confirmQueue: () => boolean
  leaveMatch: () => void
  disconnect: () => void
}

const RESUME_KEY = 'jjk_vnext_battle_resume'
const CORE_ENERGY: CoreEnergy[] = ['green', 'blue', 'white', 'red']
const DIVERGENT_FIST = 'fc_yuji_itadori_divergent_fist'

const safeStorage = (): StorageLike | null => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export class AuthorityAdapter implements AuthorityClient {
  private socket: SocketLike | null
  private storage: StorageLike | null
  private listeners = new Set<(state: AuthorityState) => void>()
  private handlers = new Map<string, (payload?: unknown) => void>()
  private state: AuthorityState
  private eventCursor = 0
  private matchId: string | null = null
  private pending: PendingCommand | null = null
  private startPayload: Record<string, unknown> | null = null
  private nonceCounter = 0
  private actionCounter = 0
  private retryAfterResume = false

  constructor(
    private socketFactory: () => SocketLike | null = () => window.io?.() ?? null,
    storage: StorageLike | null = safeStorage(),
  ) {
    this.socket = this.socketFactory()
    this.storage = storage
    const session = this.loadSession()
    this.state = {
      connected: Boolean(this.socket?.connected),
      snapshot: null,
      events: [],
      session,
      playerId: session?.player_id ?? null,
      pendingCommand: null,
      error: this.socket ? null : 'Authoritative battle connection is unavailable.',
    }
    if (this.socket) this.bindSocket()
  }

  getState = () => this.state

  subscribe = (listener: (state: AuthorityState) => void) => {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  startBattle = (playerTeam: string[], enemyTeam: string[]) => {
    if (this.state.snapshot?.phase === 'finished') this.clearSession()
    this.startPayload = {
      player_name: 'VNext Player',
      roster_mode: 'first_creation',
      difficulty: 'normal',
      player_team: playerTeam,
      enemy_team: enemyTeam,
    }
    this.eventCursor = 0
    this.matchId = null
    this.pending = null
    if (!this.socket) {
      this.socket = this.socketFactory()
      if (this.socket) this.bindSocket()
    }
    this.update({ connected: Boolean(this.socket?.connected), snapshot: null, events: [], pendingCommand: null, error: null })
    if (!this.socket) {
      this.update({ error: 'Authoritative battle connection is unavailable.' })
      return
    }
    if (this.state.session) this.emitResume()
    else if (this.state.connected) this.socket.emit('battle_v2_start_classic', this.startPayload)
  }

  submitAction = (action: SubmitActionIntent) => {
    const snapshot = this.state.snapshot
    const playerId = this.state.playerId
    const priorPayloads = (snapshot && playerId ? this.queuedActionPayloads(snapshot, playerId) : [])
      .filter((entry) => entry.caster_slot !== action.caster_slot)
    const actionId = `vnext-${Date.now()}-${++this.actionCounter}`
    const newPayload = { id: actionId, queue_index: priorPayloads.length, wildcard_pays: [], ...action }
    const accepted = this.emitCommand('battle_v2_submit_plan', 'submit_plan', {
      actions: [...priorPayloads, newPayload].map((entry, index) => ({ ...entry, queue_index: index })),
    })
    return accepted ? actionId : null
  }

  payWildcard = (actionId: string, energy: CoreEnergy) => {
    const snapshot = this.state.snapshot
    const playerId = this.state.playerId
    if (!snapshot || !playerId) return false
    const actions = snapshot.pending_actions[playerId] ?? []
    if (!actions.some((entry) => entry.id === actionId)) return false
    const order = snapshot.queue_order[playerId] ?? actions.map((entry) => entry.id)
    const wildcardPays: Record<string, CoreEnergy[]> = {}
    for (const entry of actions) wildcardPays[entry.id] = entry.id === actionId ? [energy] : (entry.wildcard_pays as CoreEnergy[])
    return this.emitCommand('battle_v2_update_queue', 'update_queue', { queue_order: order, wildcard_pays: wildcardPays })
  }

  confirmQueue = () => this.emitCommand('battle_v2_confirm_queue', 'confirm_queue', {})

  leaveMatch = () => {
    this.pending = null
    this.retryAfterResume = false
    this.startPayload = null
    this.matchId = null
    this.eventCursor = 0
    this.clearSession()
    this.update({ snapshot: null, events: [], pendingCommand: null, error: null })
  }

  private queuedActionPayloads(snapshot: ServerBattleSnapshot, playerId: string) {
    const actions = snapshot.pending_actions[playerId] ?? []
    const order = snapshot.queue_order[playerId] ?? actions.map((entry) => entry.id)
    const orderIndex = new Map(order.map((id, index) => [id, index]))
    return [...actions]
      .sort((left, right) => (orderIndex.get(left.id) ?? left.queue_index) - (orderIndex.get(right.id) ?? right.queue_index))
      .map((entry, index) => ({
        id: entry.id,
        queue_index: index,
        caster_slot: entry.caster_slot,
        skill_id: entry.skill_id,
        wildcard_pays: entry.wildcard_pays,
        target_player_id: entry.target_player_id,
        target_slot: entry.target_slot,
        target_slots: entry.target_slots,
        secondary_target_slot: entry.secondary_target_slot,
        alternate_target_player_id: entry.alternate_target_player_id,
        alternate_target_slot: entry.alternate_target_slot,
      }))
  }

  disconnect = () => {
    if (!this.socket) return
    this.handlers.forEach((handler, event) => this.socket?.off?.(event, handler))
    this.handlers.clear()
    this.socket.disconnect()
    this.socket = null
    this.listeners.clear()
  }

  private bindSocket() {
    this.bind('connect', () => {
      this.update({ connected: true, events: [], error: null })
      if (this.state.session && this.startPayload) {
        this.retryAfterResume = Boolean(this.pending)
        this.emitResume()
      } else if (this.startPayload && !this.state.snapshot) {
        this.socket?.emit('battle_v2_start_classic', this.startPayload)
      }
    })
    this.bind('disconnect', () => this.update({ connected: false, events: [], error: 'Connection lost. Reconnecting…' }))
    this.bind('battle_v2_session', (payload) => this.receiveSession(payload))
    this.bind('battle_v2_update', (payload) => this.receiveSnapshot(payload))
    this.bind('battle_v2_error', (payload) => this.receiveError(payload))
    this.bind('battle_v2_resume_rejected', (payload) => {
      this.clearSession()
      this.receiveError(payload)
    })
  }

  private bind(event: string, handler: (payload?: unknown) => void) {
    this.handlers.set(event, handler)
    this.socket?.on(event, handler)
  }

  private emitResume() {
    const session = this.state.session
    if (!session) return
    this.socket?.emit('battle_v2_resume', session)
  }

  private receiveSession(payload: unknown) {
    if (!payload || typeof payload !== 'object') return
    const session = payload as AuthoritySession
    if (!session.room_id || !session.player_id || !session.resume_token) return
    this.storage?.setItem(RESUME_KEY, JSON.stringify(session))
    this.update({ session, playerId: session.player_id, events: [], error: null })
  }

  private receiveSnapshot(payload: unknown) {
    if (!payload || typeof payload !== 'object') return
    const snapshot = payload as ServerBattleSnapshot
    if (!snapshot.match_id || !snapshot.players || !Array.isArray(snapshot.event_log)) return
    if (this.matchId !== snapshot.match_id || snapshot.event_log.length < this.eventCursor) {
      this.matchId = snapshot.match_id
      this.eventCursor = 0
    }
    const events = snapshot.event_log.slice(this.eventCursor)
    this.eventCursor = snapshot.event_log.length
    const completed = this.pending && snapshot.state_revision > this.pending.revision
    if (completed) this.pending = null
    const shouldRetry = this.retryAfterResume && this.pending && snapshot.state_revision === this.pending.revision
    this.retryAfterResume = false
    this.update({
      connected: true,
      snapshot,
      events,
      playerId: this.state.session?.player_id ?? this.state.playerId,
      pendingCommand: this.pending?.kind ?? null,
      error: this.state.error,
    })
    if (shouldRetry && this.pending) this.socket?.emit(this.pending.event, this.pending.envelope)
  }

  private receiveError(payload: unknown) {
    const message = payload && typeof payload === 'object' && 'message' in payload
      ? String((payload as { message: unknown }).message)
      : 'The authoritative battle rejected the request.'
    this.pending = null
    this.retryAfterResume = false
    this.update({ events: [], pendingCommand: null, error: message })
  }

  private emitCommand(event: string, kind: PendingCommandKind, payload: Record<string, unknown>) {
    const snapshot = this.state.snapshot
    if (!this.socket || !this.state.connected || !snapshot || this.state.error || this.pending) return false
    const nonce = `${Date.now()}-${++this.nonceCounter}`
    const envelope = {
      ...payload,
      room_id: this.state.session?.room_id ?? snapshot.match_id,
      state_revision: snapshot.state_revision,
      client_action_nonce: nonce,
    }
    this.pending = { event, kind, revision: snapshot.state_revision, envelope }
    this.update({ events: [], pendingCommand: kind, error: null })
    this.socket.emit(event, envelope)
    return true
  }

  private update(patch: Partial<AuthorityState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener(this.state))
  }

  private loadSession(): AuthoritySession | null {
    try {
      const raw = this.storage?.getItem(RESUME_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as AuthoritySession
      return parsed.room_id && parsed.player_id && parsed.resume_token ? parsed : null
    } catch {
      return null
    }
  }

  private clearSession() {
    this.storage?.removeItem(RESUME_KEY)
    this.update({ session: null, playerId: null })
  }
}

export const createAuthorityAdapter = () => new AuthorityAdapter()

const playerIds = (snapshot: ServerBattleSnapshot, playerId: string) => {
  const enemyId = Object.keys(snapshot.players).find((id) => id !== playerId) ?? ''
  return { playerId, enemyId }
}

const characterAt = (snapshot: ServerBattleSnapshot, playerId: string, slot: number | null | undefined) => (
  slot === null || slot === undefined ? null : snapshot.players[playerId]?.team[slot] ?? null
)

const defenseFor = (character: ServerCharacter) => character.statuses.reduce((total, status) => (
  total + Number(status.payload.destructible_defense ?? 0)
), 0)

const fighter = (character: ServerCharacter) => ({
  characterId: character.character_id,
  hp: character.hp,
  defense: defenseFor(character),
  statuses: character.statuses.map((status) => status.name),
})

const targetKind = (kind?: string): TargetKind => (
  kind === 'enemy_team' || kind === 'ally' || kind === 'self' ? kind : 'enemy'
)

const skillFromServer = (skill: ServerSkill, cost: Energy[] = skill.cost): Skill => ({
  id: skill.id,
  name: skill.name,
  cost,
  cooldown: skill.cooldown,
  target: targetKind(skill.target_rule?.kind),
  tags: skill.classes ?? [],
  description: skill.text ?? skill.description ?? skill.name,
  impact: 0,
})

export interface AuthoritativeSkillOption extends SkillOption {
  casterSlot: number
  skillId: string
  targetPayloads: Array<ServerTargetPayload & { characterId: string }>
}

export function authoritativeSkillOptions(
  snapshot: ServerBattleSnapshot,
  playerId: string,
  casterId: string,
): AuthoritativeSkillOption[] {
  const player = snapshot.players[playerId]
  const casterSlot = player?.team.findIndex((entry) => entry.character_id === casterId) ?? -1
  if (casterSlot < 0) return []
  const catalog = snapshot.skill_catalog[casterId]?.skills ?? []
  const options = snapshot.skill_options[String(casterSlot)] ?? {}
  return catalog.flatMap((catalogSkill) => {
    const option = options[catalogSkill.id]
    if (!option) return []
    const effective = catalog.find((entry) => entry.id === option.effective_skill_id) ?? catalogSkill
    const targetPayloads = option.legal_target_payloads.flatMap((payload) => {
      const character = characterAt(snapshot, payload.target_player_id, payload.target_slot)
      return character ? [{ ...payload, characterId: character.character_id }] : []
    })
    return [{
      casterSlot,
      skillId: catalogSkill.id,
      skill: { ...skillFromServer(effective, option.adjusted_cost), id: catalogSkill.id },
      legalTargets: targetPayloads.map((payload) => payload.characterId),
      targetPayloads,
      disabledReason: option.disabled_reason || undefined,
    }]
  })
}

function queuedActions(snapshot: ServerBattleSnapshot, playerId: string): QueuedAction[] {
  const actions = snapshot.pending_actions[playerId] ?? []
  const order = snapshot.queue_order[playerId] ?? []
  const orderIndex = new Map(order.map((id, index) => [id, index]))
  return [...actions]
    .sort((left, right) => (orderIndex.get(left.id) ?? left.queue_index) - (orderIndex.get(right.id) ?? right.queue_index))
    .flatMap((action) => {
      const caster = characterAt(snapshot, playerId, action.caster_slot)
      const target = characterAt(snapshot, action.target_player_id, action.target_slot)
      if (!caster || !target) return []
      return [{
        id: action.id,
        casterId: caster.character_id,
        skillId: action.skill_id,
        targetId: target.character_id,
        wildPay: action.wildcard_pays[0],
      }]
    })
}

export function toBattleSnapshot(snapshot: ServerBattleSnapshot, playerId: string): BattleSnapshot {
  const ids = playerIds(snapshot, playerId)
  const mine = snapshot.players[ids.playerId]
  const enemy = snapshot.players[ids.enemyId]
  const phase = snapshot.phase === 'queue_review' ? 'QUEUE_REVIEW'
    : snapshot.phase === 'finished' ? 'FINISHED'
      : snapshot.phase === 'resolving' || snapshot.phase === 'turn_end' ? 'RESOLVING' : 'PLANNING'
  return {
    revision: snapshot.state_revision,
    turn: snapshot.turn_number,
    phase,
    playerTeam: (mine?.team ?? []).map(fighter),
    enemyTeam: (enemy?.team ?? []).map(fighter),
    energy: Object.fromEntries(CORE_ENERGY.map((color) => [color, Number(mine?.energy[color] ?? 0)])) as Record<CoreEnergy, number>,
    queue: queuedActions(snapshot, playerId),
    winner: snapshot.winner_id ? (snapshot.winner_id === playerId ? 'player' : 'enemy') : null,
  }
}

const setHp = (snapshot: BattleSnapshot, characterId: string, hp: number) => {
  const target = [...snapshot.playerTeam, ...snapshot.enemyTeam].find((entry) => entry.characterId === characterId)
  if (target) target.hp = Math.max(0, hp)
}

export function buildDivergentFistSequence(
  before: ServerBattleSnapshot,
  after: ServerBattleSnapshot,
  playerId: string,
  actionId: string,
  events: ServerEvent[],
): ResolutionFrame[] | null {
  const resolved = events.find((event) => event.type === 'skill_resolved'
    && event.payload.action_id === actionId
    && event.payload.skill_id === DIVERGENT_FIST)
  const damage = events.filter((event) => event.type === 'damage' && event.payload.action_id === actionId)
  if (!resolved || damage.length !== 2) return null
  const actor = characterAt(before, String(resolved.payload.player_id), Number(resolved.payload.caster_slot))
  const target = characterAt(before, String(damage[0].payload.target_player_id), Number(damage[0].payload.target_slot))
  if (!actor || !target) return null
  const amounts = damage.map((event) => Number(event.payload.actual_hp_damage ?? event.payload.amount))
  if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0)) return null
  const opening = toBattleSnapshot(before, playerId)
  opening.phase = 'RESOLVING'
  const physical = structuredClone(opening)
  const startingHp = [...opening.playerTeam, ...opening.enemyTeam].find((entry) => entry.characterId === target.character_id)?.hp
  if (startingHp === undefined) return null
  setHp(physical, target.character_id, startingHp - amounts[0])
  const delayed = structuredClone(physical)
  setHp(delayed, target.character_id, startingHp - amounts[0] - amounts[1])
  const final = toBattleSnapshot(after, playerId)
  return [
    { snapshot: structuredClone(opening), message: `${actor.name} readies Divergent Fist`, actorId: actor.character_id, targetId: target.character_id, stage: 'focus' },
    { snapshot: structuredClone(opening), message: `${actor.name} advances`, actorId: actor.character_id, targetId: target.character_id, stage: 'advance' },
    { snapshot: physical, message: `Divergent Fist · ${amounts[0]} damage`, actorId: actor.character_id, targetId: target.character_id, stage: 'strike', damage: amounts[0] },
    { snapshot: structuredClone(physical), message: 'Cursed energy lags behind the fist…', actorId: actor.character_id, targetId: target.character_id, stage: 'recoil' },
    { snapshot: delayed, message: `Delayed cursed impact · ${amounts[1]} damage`, actorId: actor.character_id, targetId: target.character_id, stage: 'delayed', damage: amounts[1] },
    { snapshot: structuredClone(delayed), message: 'Formation restored', actorId: actor.character_id, targetId: target.character_id, stage: 'return' },
    { snapshot: final, message: final.phase === 'FINISHED' ? 'Barrier verdict confirmed' : `Turn ${final.turn} · planning`, actorId: '', targetId: '', stage: 'planning' },
  ]
}

export function authoritativeSkill(
  snapshot: ServerBattleSnapshot,
  playerId: string,
  casterId: string,
  skillId: string,
) {
  const adjusted = authoritativeSkillOptions(snapshot, playerId, casterId).find((option) => option.skillId === skillId)?.skill
  if (adjusted) return adjusted
  const catalog = snapshot.skill_catalog[casterId]?.skills.find((skill) => skill.id === skillId)
  return catalog ? skillFromServer(catalog) : undefined
}
