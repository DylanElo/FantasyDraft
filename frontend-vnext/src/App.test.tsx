import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import type { AuthorityClient, AuthorityState, ServerAction, ServerBattleSnapshot, SubmitActionIntent } from './authorityAdapter'

vi.mock('./Battlefield', () => ({
  default: (props: { sequence: Array<{ message: string }> | null; onSequenceStage: (frame: unknown) => void; onSequenceComplete: (frame: unknown) => void }) => <button onClick={() => {
    props.sequence?.forEach(props.onSequenceStage)
    if (props.sequence?.length) props.onSequenceComplete(props.sequence.at(-1))
  }}>Complete battlefield sequence</button>,
}))

const fighters = (ids: string[]) => ids.map((character_id) => ({ character_id, name: character_id, hp: 100, max_hp: 100, alive: true, statuses: [] }))

function serverSnapshot(overrides: Partial<ServerBattleSnapshot> = {}): ServerBattleSnapshot {
  return {
    match_id: 'room', turn_player_id: 'p1', phase: 'planning', turn_number: 1, state_revision: 1, winner_id: null, event_log: [],
    players: {
      p1: { id: 'p1', name: 'Player', energy: { green: 1, blue: 0, white: 0, red: 0 }, team: fighters(['yuji_itadori', 'megumi_fushiguro', 'nobara_kugisaki']), active_slots: [0, 1, 2], queue_confirmed: false },
      cpu: { id: 'cpu', name: 'CPU', energy: { green: 0, blue: 0, white: 0, red: 0 }, team: fighters(['maki_zenin', 'panda', 'junpei_yoshino']), active_slots: [0, 1, 2], queue_confirmed: false },
    },
    pending_actions: { p1: [], cpu: [] }, queue_order: { p1: [], cpu: [] },
    skill_catalog: { yuji_itadori: { skills: [{ id: 'fc_yuji_itadori_divergent_fist', name: 'Divergent Fist', text: '20 damage and 10 delayed damage.', cost: ['green'], cooldown: 0, classes: ['Melee'], target_rule: { kind: 'enemy' } }] } },
    skill_options: { '0': { fc_yuji_itadori_divergent_fist: { effective_skill_id: 'fc_yuji_itadori_divergent_fist', adjusted_cost: ['green'], disabled_reason: null, legal_target_payloads: [{ target_player_id: 'cpu', target_slot: 0 }] } } },
    ...overrides,
  }
}

class FakeAuthority implements AuthorityClient {
  state: AuthorityState = { connected: true, snapshot: null, events: [], session: null, playerId: 'p1', pendingCommand: null, error: null }
  listeners = new Set<(state: AuthorityState) => void>()
  actionId = 'action-1'
  disconnected = false
  getState = () => this.state
  subscribe = (listener: (state: AuthorityState) => void) => { this.listeners.add(listener); listener(this.state); return () => this.listeners.delete(listener) }
  publish(patch: Partial<AuthorityState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach((listener) => listener(this.state)) }
  startBattle = vi.fn(() => this.publish({ snapshot: serverSnapshot(), events: [], error: null }))
  submitAction = vi.fn((intent: SubmitActionIntent) => {
    const action: ServerAction = { id: this.actionId, player_id: 'p1', queue_index: 0, wildcard_pays: [], ...intent }
    this.publish({ snapshot: serverSnapshot({ phase: 'queue_review', state_revision: 2, pending_actions: { p1: [action], cpu: [] }, queue_order: { p1: [this.actionId], cpu: [] } }), events: [] })
    return this.actionId
  })
  confirmQueue = vi.fn(() => {
    const base = serverSnapshot().players
    const events = [
      { type: 'skill_resolved', message: 'Yuji used Divergent Fist', payload: { action_id: this.actionId, player_id: 'p1', caster_slot: 0, skill_id: 'fc_yuji_itadori_divergent_fist' } },
      { type: 'damage', message: '20', payload: { action_id: this.actionId, target_player_id: 'cpu', target_slot: 0, actual_hp_damage: 20 } },
      { type: 'damage', message: '10', payload: { action_id: this.actionId, target_player_id: 'cpu', target_slot: 0, actual_hp_damage: 10 } },
      { type: 'skill_resolved', message: 'CPU action remains unanimated', payload: { action_id: 'cpu-1', player_id: 'cpu', caster_slot: 0, skill_id: 'cpu_skill' } },
    ]
    this.publish({ snapshot: serverSnapshot({ state_revision: 3, turn_number: 2, players: { ...base, cpu: { ...base.cpu, team: [{ ...base.cpu.team[0], hp: 70 }, ...base.cpu.team.slice(1)] } }, event_log: events }), events })
    return true
  })
  payWildcard = vi.fn(() => true)
  leaveMatch = vi.fn(() => this.publish({ snapshot: null, events: [], error: null }))
  disconnect = vi.fn(() => { this.disconnected = true })
}

async function reachBattle(user: ReturnType<typeof userEvent.setup>, authority: FakeAuthority) {
  render(<App authority={authority} />)
  await user.click(screen.getByRole('button', { name: 'Enter the barrier' }))
  await user.click(screen.getByRole('button', { name: 'Lock formation' }))
  await user.click(screen.getByRole('button', { name: 'Begin encounter' }))
  await screen.findByRole('button', { name: 'Complete battlefield sequence' })
}

describe('vertical-slice flow', () => {
  it('enters team selection with the keyboard', async () => {
    const user = userEvent.setup()
    render(<App authority={new FakeAuthority()} />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Enter the barrier' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: 'Choose your three' })).toBeVisible()
  })

  it('starts the locked six-fighter First Creation match', async () => {
    const user = userEvent.setup()
    const authority = new FakeAuthority()
    await reachBattle(user, authority)
    expect(authority.startBattle).toHaveBeenCalledWith(['yuji_itadori', 'megumi_fushiguro', 'nobara_kugisaki'], ['maki_zenin', 'panda', 'junpei_yoshino'])
    expect(screen.getByText('Python authority')).toBeVisible()
  })

  it('submits the server legal payload and plays authoritative 20 then 10 damage', async () => {
    const user = userEvent.setup()
    const authority = new FakeAuthority()
    await reachBattle(user, authority)

    const yuji = screen.getByRole('button', { name: /Select Yuji Itadori, 100 health/ })
    yuji.focus()
    await user.keyboard('{Enter}')
    const divergent = screen.getByRole('button', { name: /Divergent Fist/ })
    divergent.focus()
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: /Target Maki Zenin, legal target/ }))
    await user.click(screen.getByRole('button', { name: 'Confirm Maki' }))

    expect(authority.submitAction).toHaveBeenCalledWith({ caster_slot: 0, skill_id: 'fc_yuji_itadori_divergent_fist', target_player_id: 'cpu', target_slot: 0 })
    expect(screen.getByRole('region', { name: 'Action queue' })).toHaveTextContent('Yuji → Maki')
    await user.click(screen.getByRole('button', { name: 'Confirm resolution' }))
    expect(authority.confirmQueue).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Complete battlefield sequence' }))

    expect(screen.getByText('Planning restored. Select a fighter.')).toBeVisible()
    expect(screen.getByRole('button', { name: /Select Maki Zenin, 70 health/ })).toBeDisabled()
  })

  it('keeps reduced motion and fails closed without a valid snapshot', async () => {
    const user = userEvent.setup()
    const authority = new FakeAuthority()
    await reachBattle(user, authority)
    await user.click(screen.getByRole('button', { name: 'Motion full' }))
    expect(screen.getByRole('button', { name: 'Motion reduced' })).toHaveAttribute('aria-pressed', 'true')

    const failed = new FakeAuthority()
    failed.state = { ...failed.state, connected: false, error: 'Authoritative battle connection is unavailable.' }
    failed.startBattle = vi.fn()
    render(<App authority={failed} />)
    await user.click(screen.getAllByRole('button', { name: 'Enter the barrier' }).at(-1)!)
    await user.click(screen.getAllByRole('button', { name: 'Lock formation' }).at(-1)!)
    await user.click(screen.getAllByRole('button', { name: 'Begin encounter' }).at(-1)!)
    expect(screen.getByRole('alert')).toHaveTextContent('Authoritative battle connection is unavailable.')
  })
})
