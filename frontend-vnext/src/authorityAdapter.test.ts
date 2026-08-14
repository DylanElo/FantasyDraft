import { describe, expect, it, vi } from 'vitest'
import { AuthorityAdapter, authoritativeSkillOptions, buildDivergentFistSequence, toBattleSnapshot } from './authorityAdapter'
import type { AuthoritySession, ServerBattleSnapshot, ServerEvent, SocketLike } from './authorityAdapter'

class FakeSocket implements SocketLike {
  connected = false
  handlers = new Map<string, (payload?: unknown) => void>()
  emitted: Array<{ event: string; payload?: unknown }> = []
  on = (event: string, handler: (payload?: unknown) => void) => { this.handlers.set(event, handler) }
  off = (event: string) => { this.handlers.delete(event) }
  emit = (event: string, payload?: unknown) => { this.emitted.push({ event, payload }) }
  disconnect = vi.fn()
  receive(event: string, payload?: unknown) { this.handlers.get(event)?.(payload) }
}

const session: AuthoritySession = { room_id: 'room-1', player_id: 'p1', resume_token: 'resume-1' }

function snapshot(overrides: Partial<ServerBattleSnapshot> = {}): ServerBattleSnapshot {
  return {
    match_id: 'room-1', turn_player_id: 'p1', phase: 'planning', turn_number: 1, state_revision: 1,
    winner_id: null, result_type: null, event_log: [],
    players: {
      p1: { id: 'p1', name: 'Player', energy: { green: 1, blue: 0, white: 0, red: 0 }, queue_confirmed: false, active_slots: [0, 1, 2], team: [
        { character_id: 'yuji_itadori', name: 'Yuji Itadori', hp: 100, max_hp: 100, alive: true, statuses: [] },
        { character_id: 'megumi_fushiguro', name: 'Megumi Fushiguro', hp: 100, max_hp: 100, alive: true, statuses: [] },
        { character_id: 'nobara_kugisaki', name: 'Nobara Kugisaki', hp: 100, max_hp: 100, alive: true, statuses: [] },
      ] },
      cpu: { id: 'cpu', name: 'CPU', energy: { green: 0, blue: 0, white: 0, red: 0 }, queue_confirmed: false, active_slots: [0, 1, 2], team: [
        { character_id: 'maki_zenin', name: 'Maki Zenin', hp: 100, max_hp: 100, alive: true, statuses: [] },
        { character_id: 'panda', name: 'Panda', hp: 100, max_hp: 100, alive: true, statuses: [] },
        { character_id: 'junpei_yoshino', name: 'Junpei Yoshino', hp: 100, max_hp: 100, alive: true, statuses: [] },
      ] },
    },
    pending_actions: { p1: [], cpu: [] }, queue_order: { p1: [], cpu: [] },
    skill_catalog: {
      yuji_itadori: { skills: [{ id: 'fc_yuji_itadori_divergent_fist', name: 'Divergent Fist', text: '20 damage and 10 delayed damage.', cost: ['green'], cooldown: 0, classes: ['Melee'], target_rule: { kind: 'enemy' } }] },
    },
    skill_options: { '0': { fc_yuji_itadori_divergent_fist: { effective_skill_id: 'fc_yuji_itadori_divergent_fist', adjusted_cost: ['green'], disabled_reason: null, legal_target_payloads: [{ target_player_id: 'cpu', target_slot: 0 }] } } },
    ...overrides,
  }
}

describe('AuthorityAdapter', () => {
  it('lazily acquires the vendored client when it loads after React', () => {
    const socket = new FakeSocket()
    let loaded = false
    const adapter = new AuthorityAdapter(() => loaded ? socket : null, null)
    expect(adapter.getState().error).toBeTruthy()
    loaded = true
    adapter.startBattle([], [])
    socket.connected = true
    socket.receive('connect')
    expect(socket.emitted.at(-1)?.event).toBe('battle_v2_start_classic')
  })

  it('connects, starts, submits and confirms with revision/nonce while consuming events once', () => {
    const socket = new FakeSocket()
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() }
    const adapter = new AuthorityAdapter(() => socket, storage)
    adapter.startBattle(['yuji_itadori', 'megumi_fushiguro', 'nobara_kugisaki'], ['maki_zenin', 'panda', 'junpei_yoshino'])
    socket.connected = true
    socket.receive('connect')
    expect(socket.emitted[0]).toMatchObject({ event: 'battle_v2_start_classic', payload: { roster_mode: 'first_creation' } })

    socket.receive('battle_v2_session', session)
    socket.receive('battle_v2_update', snapshot())
    expect(storage.setItem).toHaveBeenCalled()
    expect(authoritativeSkillOptions(adapter.getState().snapshot!, 'p1', 'yuji_itadori')[0].targetPayloads[0]).toMatchObject({ characterId: 'maki_zenin', target_slot: 0 })

    const actionId = adapter.submitAction({ caster_slot: 0, skill_id: 'fc_yuji_itadori_divergent_fist', target_player_id: 'cpu', target_slot: 0 })!
    const submit = socket.emitted.at(-1)!
    expect(submit).toMatchObject({ event: 'battle_v2_submit_plan', payload: { state_revision: 1, actions: [{ id: actionId, caster_slot: 0, target_slot: 0 }] } })
    expect((submit.payload as Record<string, unknown>).client_action_nonce).toBeTruthy()

    const queuedAction = { id: actionId, player_id: 'p1', caster_slot: 0, skill_id: 'fc_yuji_itadori_divergent_fist', target_player_id: 'cpu', target_slot: 0, wildcard_pays: [], queue_index: 0 }
    socket.receive('battle_v2_update', snapshot({ state_revision: 2, phase: 'queue_review', pending_actions: { p1: [queuedAction], cpu: [] }, queue_order: { p1: [actionId], cpu: [] } }))
    expect(toBattleSnapshot(adapter.getState().snapshot!, 'p1').queue[0].id).toBe(actionId)
    expect(adapter.confirmQueue()).toBe(true)
    expect(socket.emitted.at(-1)).toMatchObject({ event: 'battle_v2_confirm_queue', payload: { state_revision: 2 } })

    const events: ServerEvent[] = [
      { type: 'skill_resolved', message: 'Yuji used Divergent Fist', payload: { action_id: actionId, player_id: 'p1', caster_slot: 0, skill_id: 'fc_yuji_itadori_divergent_fist' } },
      { type: 'damage', message: '20', payload: { action_id: actionId, target_player_id: 'cpu', target_slot: 0, actual_hp_damage: 20 } },
      { type: 'damage', message: '10', payload: { action_id: actionId, target_player_id: 'cpu', target_slot: 0, actual_hp_damage: 10 } },
    ]
    const after = snapshot({ state_revision: 3, turn_number: 2, event_log: events, players: { ...snapshot().players, cpu: { ...snapshot().players.cpu, team: [{ ...snapshot().players.cpu.team[0], hp: 70 }, ...snapshot().players.cpu.team.slice(1)] } } })
    socket.receive('battle_v2_update', after)
    expect(adapter.getState().events.map((event) => event.type)).toEqual(['skill_resolved', 'damage', 'damage'])
    expect(buildDivergentFistSequence(snapshot({ state_revision: 2 }), after, 'p1', actionId, adapter.getState().events)?.at(-1)?.snapshot.enemyTeam[0].hp).toBe(70)
    socket.receive('battle_v2_update', after)
    expect(adapter.getState().events).toEqual([])

    adapter.disconnect()
    expect(socket.disconnect).toHaveBeenCalledOnce()
    expect(socket.handlers.size).toBe(0)
  })

  it('appends a second queued action instead of replacing the first, and drops a stale entry for the same caster', () => {
    const socket = new FakeSocket()
    const adapter = new AuthorityAdapter(() => socket, null)
    adapter.startBattle(['yuji_itadori', 'megumi_fushiguro', 'nobara_kugisaki'], ['maki_zenin', 'panda', 'junpei_yoshino'])
    socket.connected = true
    socket.receive('connect')
    socket.receive('battle_v2_session', session)
    socket.receive('battle_v2_update', snapshot())

    const firstId = adapter.submitAction({ caster_slot: 0, skill_id: 'fc_yuji_itadori_divergent_fist', target_player_id: 'cpu', target_slot: 0 })!
    const firstAction = { id: firstId, player_id: 'p1', caster_slot: 0, skill_id: 'fc_yuji_itadori_divergent_fist', target_player_id: 'cpu', target_slot: 0, wildcard_pays: [], queue_index: 0 }
    socket.receive('battle_v2_update', snapshot({ state_revision: 2, phase: 'queue_review', pending_actions: { p1: [firstAction], cpu: [] }, queue_order: { p1: [firstId], cpu: [] } }))

    const secondId = adapter.submitAction({ caster_slot: 1, skill_id: 'fc_megumi_fushiguro_divine_dogs', target_player_id: 'cpu', target_slot: 1 })!
    const secondSubmit = socket.emitted.at(-1)!
    expect(secondSubmit).toMatchObject({
      event: 'battle_v2_submit_plan',
      payload: { actions: [{ id: firstId, caster_slot: 0, queue_index: 0 }, { id: secondId, caster_slot: 1, queue_index: 1 }] },
    })
    const secondAction = { id: secondId, player_id: 'p1', caster_slot: 1, skill_id: 'fc_megumi_fushiguro_divine_dogs', target_player_id: 'cpu', target_slot: 1, wildcard_pays: [], queue_index: 1 }
    socket.receive('battle_v2_update', snapshot({ state_revision: 3, phase: 'queue_review', pending_actions: { p1: [firstAction, secondAction], cpu: [] }, queue_order: { p1: [firstId, secondId], cpu: [] } }))

    const replacementId = adapter.submitAction({ caster_slot: 0, skill_id: 'fc_yuji_itadori_black_flash_attempt', target_player_id: 'cpu', target_slot: 0 })!
    const thirdSubmit = socket.emitted.at(-1)!
    expect((thirdSubmit.payload as { actions: Array<{ id: string; caster_slot: number }> }).actions).toEqual([
      { id: secondId, caster_slot: 1, queue_index: 0, skill_id: 'fc_megumi_fushiguro_divine_dogs', wildcard_pays: [], target_player_id: 'cpu', target_slot: 1, target_slots: undefined, secondary_target_slot: undefined, alternate_target_player_id: undefined, alternate_target_slot: undefined },
      { id: replacementId, caster_slot: 0, queue_index: 1, skill_id: 'fc_yuji_itadori_black_flash_attempt', wildcard_pays: [], target_player_id: 'cpu', target_slot: 0 },
    ])
  })

  it('clears a finished match session before starting a fresh battle so rematch does not resume the dead match', () => {
    const socket = new FakeSocket()
    const storage = { getItem: () => JSON.stringify(session), setItem: vi.fn(), removeItem: vi.fn() }
    const adapter = new AuthorityAdapter(() => socket, storage)
    adapter.startBattle([], [])
    socket.connected = true
    socket.receive('connect')
    expect(socket.emitted.at(-1)).toEqual({ event: 'battle_v2_resume', payload: session })

    socket.receive('battle_v2_update', snapshot({ phase: 'finished', winner_id: 'p1' }))
    socket.emitted.length = 0
    adapter.startBattle(['yuji_itadori', 'megumi_fushiguro', 'nobara_kugisaki'], ['maki_zenin', 'panda', 'junpei_yoshino'])
    expect(storage.removeItem).toHaveBeenCalledWith('jjk_vnext_battle_resume')
    expect(adapter.getState().session).toBeNull()
    expect(socket.emitted.at(-1)?.event).toBe('battle_v2_start_classic')
  })

  it('resumes and retries the same pending command only after authoritative reconciliation', () => {
    const socket = new FakeSocket()
    const storage = { getItem: () => JSON.stringify(session), setItem: vi.fn(), removeItem: vi.fn() }
    const adapter = new AuthorityAdapter(() => socket, storage)
    adapter.startBattle([], [])
    socket.connected = true
    socket.receive('connect')
    expect(socket.emitted.at(-1)).toEqual({ event: 'battle_v2_resume', payload: session })
    socket.receive('battle_v2_update', snapshot())
    expect(adapter.submitAction({ caster_slot: 0, skill_id: 'fc_yuji_itadori_divergent_fist', target_player_id: 'cpu', target_slot: 0 })).toBeTruthy()
    const original = socket.emitted.at(-1)!

    socket.receive('disconnect')
    socket.receive('connect')
    socket.receive('battle_v2_session', { ...session, resume_token: 'resume-2' })
    socket.receive('battle_v2_update', snapshot())
    expect(socket.emitted.at(-1)).toEqual(original)
    expect(adapter.getState().pendingCommand).toBe('submit_plan')
  })

  it('fails closed on server errors and rejected resumes', () => {
    const socket = new FakeSocket()
    const storage = { getItem: () => JSON.stringify(session), setItem: vi.fn(), removeItem: vi.fn() }
    const adapter = new AuthorityAdapter(() => socket, storage)
    socket.receive('battle_v2_error', { message: 'stale state revision' })
    expect(adapter.getState().error).toBe('stale state revision')
    socket.receive('battle_v2_update', snapshot())
    expect(adapter.getState().error).toBe('stale state revision')
    expect(adapter.submitAction({ caster_slot: 0, skill_id: 'x', target_player_id: 'cpu', target_slot: 0 })).toBeNull()
    socket.receive('battle_v2_resume_rejected', { message: 'Battle session could not be resumed.' })
    expect(storage.removeItem).toHaveBeenCalled()
    expect(adapter.getState().session).toBeNull()
  })
})
