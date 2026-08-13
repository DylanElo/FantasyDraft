import { describe, expect, it } from 'vitest'
import { FORMATIONS, formationSnapshot, layoutModeFor } from './formationLayout'
import { presentationForBeat, TARGETING_PRESENTATION } from './presentationModel'

describe('Divergent Fist presentation contract', () => {
  it('shows one explicit actor-to-target intent and keeps damage events separate', () => {
    expect(TARGETING_PRESENTATION).toMatchObject({ actorId: 'yuji', targetId: 'maki', arc: true, arrow: true, sigil: true })
    expect(TARGETING_PRESENTATION.subduedIds).toHaveLength(4)
    expect(presentationForBeat('physical-impact')).toMatchObject({ impact: 'physical', makiHealth: 80 })
    expect(presentationForBeat('cursed-compression')).toMatchObject({ impact: 'compression', makiHealth: 80 })
    expect(presentationForBeat('delayed-impact')).toMatchObject({ impact: 'delayed', makiHealth: 70 })
  })

  it('uses a mobile formation and restores stable planning positions', () => {
    expect(layoutModeFor(844, 390)).toBe('mobile')
    expect(FORMATIONS.mobile).not.toEqual(FORMATIONS.desktop)
    expect(formationSnapshot(1440, 900)).toEqual(formationSnapshot(1440, 900))
    expect(presentationForBeat('planning-restored')).toMatchObject({ yujiPose: 'idle', makiPose: 'idle', controls: true, makiHealth: 70 })
  })
})
