export const LAB_BEATS = [
  'planning',
  'yuji-selected',
  'skill-selected',
  'maki-targeted',
  'target-confirmed',
  'queued',
  'resolution-start',
  'physical-anticipation',
  'yuji-advance',
  'physical-strike',
  'physical-impact',
  'first-reaction',
  'stagger',
  'delay-hold',
  'cursed-compression',
  'delayed-impact',
  'second-reaction',
  'health-settle',
  'recovery',
  'return',
  'planning-restored',
] as const

export type LabBeat = typeof LAB_BEATS[number]
export type PlaybackSpeed = 0.5 | 1 | 2

export const LAB_TIMINGS: Record<LabBeat, number> = {
  planning: 250,
  'yuji-selected': 250,
  'skill-selected': 200,
  'maki-targeted': 200,
  'target-confirmed': 180,
  queued: 180,
  'resolution-start': 180,
  'physical-anticipation': 160,
  'yuji-advance': 380,
  'physical-strike': 120,
  'physical-impact': 90,
  'first-reaction': 240,
  stagger: 340,
  'delay-hold': 380,
  'cursed-compression': 320,
  'delayed-impact': 120,
  'second-reaction': 290,
  'health-settle': 250,
  recovery: 200,
  return: 500,
  'planning-restored': 400,
}

export const REDUCED_MOTION_TIMINGS: Record<LabBeat, number> = {
  ...LAB_TIMINGS,
  'yuji-selected': 220,
  'yuji-advance': 300,
  return: 360,
}

export const BEAT_ANNOUNCEMENTS: Record<LabBeat, string> = {
  planning: 'Planning formation ready.',
  'yuji-selected': 'Yuji selected.',
  'skill-selected': 'Divergent Fist selected.',
  'maki-targeted': 'Maki targeted.',
  'target-confirmed': 'Maki confirmed as the target.',
  queued: 'Action queued: Yuji uses Divergent Fist on Maki.',
  'resolution-start': 'Resolution started.',
  'physical-anticipation': 'Yuji prepares the physical strike.',
  'yuji-advance': 'Yuji advances toward Maki.',
  'physical-strike': 'Yuji commits to the physical strike.',
  'physical-impact': 'Physical impact dealt 20 damage. Maki has 80 health.',
  'first-reaction': 'Maki reels from the physical strike.',
  stagger: 'Maki staggers while cursed energy lags behind the fist.',
  'delay-hold': 'The delayed cursed impact remains pending.',
  'cursed-compression': 'Cursed energy compresses around Maki.',
  'delayed-impact': 'Delayed impact dealt 10 damage. Maki has 70 health.',
  'second-reaction': 'Maki reacts to the delayed cursed impact.',
  'health-settle': 'Maki has 70 health remaining.',
  recovery: 'Yuji recovers and the residual cursed energy fades.',
  return: 'Yuji returns to formation.',
  'planning-restored': 'Sequence complete. Planning formation restored.',
}

export const DIVERGENT_FIST_DAMAGE = {
  physical: 20,
  delayed: 10,
  healthAfterPhysical: 80,
  healthAfterDelayed: 70,
} as const
