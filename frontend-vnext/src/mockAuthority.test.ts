import { describe, expect, it } from 'vitest'
import { createBattle, queueAction, resolveQueue } from './mockAuthority'

describe('Divergent Fist presentation contract', () => {
  it('preserves the authoritative 30 damage as readable 20 and 10 damage beats', () => {
    const battle = createBattle(
      ['yuji_itadori', 'megumi_fushiguro', 'nobara_kugisaki'],
      ['maki_zenin', 'panda', 'junpei_yoshino'],
    )
    const queued = queueAction(battle, {
      casterId: 'yuji_itadori',
      skillId: 'fc_yuji_itadori_divergent_fist',
      targetId: 'maki_zenin',
    })
    const frames = resolveQueue(queued)

    expect(frames.map((frame) => frame.stage)).toEqual(['focus', 'advance', 'strike', 'recoil', 'delayed', 'return', 'planning'])
    expect(frames.find((frame) => frame.stage === 'strike')?.snapshot.enemyTeam[0].hp).toBe(80)
    expect(frames.find((frame) => frame.stage === 'delayed')?.snapshot.enemyTeam[0].hp).toBe(70)
    expect(frames.at(-1)?.snapshot.phase).toBe('PLANNING')
  })
})
