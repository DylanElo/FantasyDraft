import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { CHARACTERS, ENERGY, characterById } from './data'
import { authoritativeSkill, authoritativeSkillOptions, buildDivergentFistSequence, createAuthorityAdapter, toBattleSnapshot } from './authorityAdapter'
import type { AuthorityClient, AuthorityState, ServerBattleSnapshot } from './authorityAdapter'
import type { BattleSnapshot, CoreEnergy, ResolutionFrame, Screen, Skill } from './types'
import styles from './App.module.css'

const DEFAULT_TEAM = ['yuji_itadori', 'megumi_fushiguro', 'nobara_kugisaki']
const cx = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ')
const Battlefield = lazy(() => import('./Battlefield'))

function EnergyCost({ cost }: { cost: Skill['cost'] }) {
  return <span className={styles.cost} aria-label={cost.map((energy) => energy === 'black' ? 'Wild' : ENERGY[energy].name).join(', ')}>
    {cost.map((energy, index) => <i key={`${energy}-${index}`} data-energy={energy}>{energy === 'black' ? 'X' : ENERGY[energy].letter}</i>)}
  </span>
}

function Portrait({ id, className = '' }: { id: string; className?: string }) {
  const character = characterById(id)
  return <img className={className} src={character.portrait} alt="" draggable={false} />
}

function TitleScreen({ onEnter, onProfile }: { onEnter: () => void; onProfile: () => void }) {
  return <main className={cx(styles.screen, styles.titleScreen)}>
    <div className={styles.titleAtmosphere} />
    <div className={styles.titleCast} aria-hidden="true">
      <Portrait id="megumi_fushiguro" /><Portrait id="yuji_itadori" /><Portrait id="nobara_kugisaki" />
    </div>
    <section className={styles.titleCopy}>
      <p className={styles.eyebrow}>A tactical curse ritual</p>
      <h1><span>JJK</span> Arena</h1>
      <p>Three sorcerers. One ordered strike. Every decision survives contact with the barrier.</p>
      <div className={styles.actions}>
        <button className={styles.primaryButton} onClick={onEnter}>Enter the barrier</button>
        <button className={styles.textButton} onClick={onProfile}>Meet Yuji</button>
      </div>
      <small>Frontend VNext · Python-authoritative battle</small>
    </section>
  </main>
}

function ProfileScreen({ onBack, onSelect }: { onBack: () => void; onSelect: () => void }) {
  const yuji = characterById('yuji_itadori')
  const [selected, setSelected] = useState(yuji.skills[0])
  return <main className={cx(styles.screen, styles.profileScreen)}>
    <button className={styles.backButton} onClick={onBack}>← Back</button>
    <div className={styles.profilePortrait}><Portrait id={yuji.id} /><span>虎杖</span></div>
    <section className={styles.profileInfo}>
      <p className={styles.eyebrow}>Tokyo Jujutsu High · Bruiser</p>
      <h1>{yuji.name}</h1>
      <p className={styles.profileLead}>An honest close-range fighter who turns prepared openings into violent momentum.</p>
      <div className={styles.profileTags}><span>Soul Bruise</span><span>Momentum</span><span>Front line</span></div>
      <div className={styles.profileSkills} role="list" aria-label="Yuji skills">
        {yuji.skills.map((skill, index) => <button key={skill.id} role="listitem" aria-pressed={selected.id === skill.id} onClick={() => setSelected(skill)}>
          <b>0{index + 1}</b><span>{skill.name}</span><EnergyCost cost={skill.cost} />
        </button>)}
      </div>
      <article className={styles.skillDetail}>
        <div><p>Selected technique</p><h2>{selected.name}</h2></div><EnergyCost cost={selected.cost} />
        <p>{selected.description}</p>
        <div>{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}<span>CD {selected.cooldown}</span></div>
      </article>
      <button className={styles.primaryButton} onClick={onSelect}>Build a team</button>
    </section>
  </main>
}

function SelectionScreen({ initial, onBack, onConfirm }: { initial: string[]; onBack: () => void; onConfirm: (ids: string[]) => void }) {
  const [team, setTeam] = useState(initial)
  const [focus, setFocus] = useState(initial[0])
  const focused = characterById(focus)
  const toggle = (id: string) => {
    setFocus(id)
    setTeam((current) => current.includes(id) ? current.filter((entry) => entry !== id) : current.length < 3 ? [...current, id] : current)
  }
  return <main className={cx(styles.screen, styles.selectionScreen)}>
    <header className={styles.selectionHeader}>
      <button className={styles.backButton} onClick={onBack}>← Title</button>
      <div><p className={styles.eyebrow}>Team selection</p><h1>Choose your three</h1></div>
      <strong>{team.length}<small>/3</small></strong>
    </header>
    <section className={styles.selectionHero} style={{ '--accent': focused.accent } as React.CSSProperties}>
      <Portrait id={focused.id} />
      <div><p>{focused.motif}</p><h2>{focused.name}</h2><span>{focused.role}</span><small>{focused.state}</small></div>
    </section>
    <section className={styles.rosterGrid} aria-label="Available fighters">
      {CHARACTERS.map((character, index) => {
        const selected = team.includes(character.id)
        return <button key={character.id} aria-label={`${character.name}, ${selected ? `selected position ${team.indexOf(character.id) + 1}` : 'not selected'}`} aria-pressed={selected} onClick={() => toggle(character.id)} style={{ '--accent': character.accent } as React.CSSProperties}>
          <Portrait id={character.id} /><span><b>{character.shortName}</b><small>{character.role.split(' / ')[0]}</small></span>
          <i>{selected ? team.indexOf(character.id) + 1 : `0${index + 1}`}</i>
        </button>
      })}
    </section>
    <footer className={styles.selectionFooter}>
      <div className={styles.teamStrip}>{team.map((id, index) => <span key={id}><Portrait id={id} /><i>{index + 1}</i></span>)}</div>
      <button className={styles.primaryButton} disabled={team.length !== 3} onClick={() => onConfirm(team)}>Lock formation</button>
    </footer>
  </main>
}

function MatchupScreen({ player, enemy, onBack, onFight }: { player: string[]; enemy: string[]; onBack: () => void; onFight: () => void }) {
  return <main className={cx(styles.screen, styles.matchupScreen)}>
    <button className={styles.backButton} onClick={onBack}>← Edit team</button>
    <div className={styles.matchTitle}><p className={styles.eyebrow}>Colony 09 · Rain district</p><h1>Barrier breach</h1><span>First to break the opposing formation</span></div>
    <section className={styles.versus}>
      <div className={styles.matchTeam}>{player.map((id, index) => <article key={id}><Portrait id={id} /><span>0{index + 1}</span><h2>{characterById(id).shortName}</h2></article>)}</div>
      <strong>VS</strong>
      <div className={cx(styles.matchTeam, styles.enemyMatchTeam)}>{enemy.map((id, index) => <article key={id}><Portrait id={id} /><span>0{index + 1}</span><h2>{characterById(id).shortName}</h2></article>)}</div>
    </section>
    <button className={styles.primaryButton} onClick={onFight}>Begin encounter</button>
  </main>
}

function BattleScreen({ authority, authorityState, onFinish }: { authority: AuthorityClient; authorityState: AuthorityState; onFinish: (snapshot: BattleSnapshot) => void }) {
  const serverSnapshot = authorityState.snapshot!
  const playerId = authorityState.playerId!
  const [battle, setBattle] = useState(() => toBattleSnapshot(serverSnapshot, playerId))
  const [selectedCaster, setSelectedCaster] = useState<string | null>(null)
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [pendingTarget, setPendingTarget] = useState<string | null>(null)
  const [sequence, setSequence] = useState<ResolutionFrame[] | null>(null)
  const [playback, setPlayback] = useState('Select a fighter to begin planning')
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const commandRef = useRef<HTMLElement>(null)
  const resolvingRef = useRef(false)
  const confirmContextRef = useRef<{ before: ServerBattleSnapshot; actionId: string } | null>(null)
  const submittedActionRef = useRef<string | null>(null)
  const playedRevisionRef = useRef(-1)
  const options = useMemo(() => selectedCaster ? authoritativeSkillOptions(serverSnapshot, playerId, selectedCaster) : [], [serverSnapshot, playerId, selectedCaster])
  const selectedOption = options.find((option) => option.skill.id === selectedSkill)
  const legalTargets = selectedOption?.legalTargets ?? []
  const queuedCasters = new Set(battle.queue.map((action) => action.casterId))
  const wildActions = battle.queue.filter((action) => authoritativeSkill(serverSnapshot, playerId, action.casterId, action.skillId)?.cost.includes('black'))

  const canMutate = authorityState.connected && !authorityState.error && !authorityState.pendingCommand
    && serverSnapshot.turn_player_id === playerId && serverSnapshot.phase !== 'finished'

  const selectFighter = (id: string) => {
    if (!canMutate || battle.phase === 'RESOLVING') return
    if (legalTargets.includes(id)) {
      setPendingTarget(id)
      setPlayback(`${characterById(id).name} targeted. Confirm the target.`)
      return
    }
    if (battle.playerTeam.some((fighter) => fighter.characterId === id && fighter.hp > 0)) {
      setSelectedCaster(id)
      setSelectedSkill(null)
      setPendingTarget(null)
      setPlayback(`${characterById(id).name} selected`)
    }
  }

  const confirmTarget = () => {
    if (!selectedCaster || !selectedOption || !pendingTarget) return
    const target = selectedOption.targetPayloads.find((payload) => payload.characterId === pendingTarget)
    if (!target) return
    const { characterId: _characterId, ...targetPayload } = target
    const actionId = authority.submitAction({ caster_slot: selectedOption.casterSlot, skill_id: selectedOption.skillId, ...targetPayload })
    if (actionId) {
      submittedActionRef.current = actionId
      setPlayback(`Submitting ${selectedOption.skill.name} on ${characterById(pendingTarget).name}…`)
      setSelectedSkill(null)
      setPendingTarget(null)
    }
  }

  const confirm = () => {
    const actionId = submittedActionRef.current
    if (resolvingRef.current || battle.queue.length === 0 || !actionId) return
    confirmContextRef.current = { before: serverSnapshot, actionId }
    if (authority.confirmQueue()) {
      submittedActionRef.current = null
      resolvingRef.current = true
      setBattle({ ...battle, phase: 'RESOLVING' })
      setPlayback('Resolution committed to Python authority')
    } else confirmContextRef.current = null
  }

  const sequenceComplete = (frame: ResolutionFrame) => {
    resolvingRef.current = false
    setBattle(frame.snapshot)
    setSequence(null)
    setSelectedCaster(null)
    setSelectedSkill(null)
    setPendingTarget(null)
    setPlayback(frame.snapshot.phase === 'FINISHED' ? frame.message : 'Planning restored. Select a fighter.')
    if (frame.snapshot.phase === 'FINISHED') onFinish(frame.snapshot)
  }

  useEffect(() => { if (selectedCaster) commandRef.current?.querySelector('button')?.focus() }, [selectedCaster])

  useEffect(() => {
    const latest = authorityState.snapshot
    if (!latest || !authorityState.playerId) return
    const final = toBattleSnapshot(latest, authorityState.playerId)
    const context = confirmContextRef.current
    if (context && authorityState.pendingCommand !== 'confirm_queue' && latest.state_revision > context.before.state_revision) {
      confirmContextRef.current = null
      if (latest.state_revision <= playedRevisionRef.current) {
        if (!sequence) resolvingRef.current = false
        return
      }
      const frames = buildDivergentFistSequence(context.before, latest, authorityState.playerId, context.actionId, authorityState.events)
      playedRevisionRef.current = latest.state_revision
      if (frames) {
        setSequence(frames)
        return
      }
      resolvingRef.current = false
      setBattle(final)
      setPlayback(final.phase === 'FINISHED' ? 'Barrier verdict confirmed' : 'Authoritative resolution completed without a matching Divergent Fist sequence.')
      if (final.phase === 'FINISHED') onFinish(final)
      return
    }
    if (!sequence && !resolvingRef.current) {
      setBattle(final)
      if (final.phase === 'FINISHED' && battle.phase !== 'FINISHED') { onFinish(final); return }
      if (final.queue.length > 0) setPlayback('Authoritative queue ready for review')
    }
  }, [authorityState, sequence])

  return <main className={cx(styles.screen, styles.battleScreen)} data-stage={sequence?.[0]?.stage ?? (pendingTarget ? 'targeted' : selectedSkill ? 'targeting' : selectedCaster ? 'selected' : 'planning')} data-queue-open={battle.queue.length > 0 ? 'true' : undefined}>
    <Suspense fallback={null}><Battlefield snapshot={battle} selectedId={selectedCaster} legalTargetIds={legalTargets} pendingTargetId={pendingTarget} queuedIds={[...queuedCasters]} sequence={sequence} reducedMotion={reducedMotion} onFighterSelect={selectFighter} onSequenceStage={(frame) => { setPlayback(frame.message); setBattle(frame.snapshot) }} onSequenceComplete={sequenceComplete} /></Suspense>
    <header className={styles.battleHud}>
      <div><b>TURN {String(battle.turn).padStart(2, '0')}</b><span>{battle.phase === 'PLANNING' ? 'Your move' : battle.phase === 'QUEUE_REVIEW' ? 'Orders open' : battle.phase.replace('_', ' ')}</span></div>
      <div className={styles.energy} aria-label="Available energy">{(Object.keys(ENERGY) as CoreEnergy[]).map((color) => <span key={color}><i data-energy={color}>{ENERGY[color].letter}</i><b>{battle.energy[color]}</b></span>)}</div>
      <div><button className={styles.motionButton} aria-pressed={reducedMotion} onClick={() => setReducedMotion((value) => !value)}>Motion {reducedMotion ? 'reduced' : 'full'}</button><span>Python authority</span></div>
    </header>

    <div className={styles.battlePrompt} role="status" aria-live="polite"><span>{playback}</span></div>

    <div className={styles.a11yFighters} aria-label="Battlefield fighters">
      {[...battle.playerTeam, ...battle.enemyTeam].map((fighter) => {
        const legal = legalTargets.includes(fighter.characterId)
        const ally = battle.playerTeam.includes(fighter)
        return <button key={fighter.characterId} disabled={!canMutate || fighter.hp <= 0 || (!ally && !legal)} onClick={() => selectFighter(fighter.characterId)}>{legal ? `Target ${characterById(fighter.characterId).name}, legal target, ${fighter.hp} health` : `Select ${characterById(fighter.characterId).name}, ${fighter.hp} health`}</button>
      })}
    </div>

    {selectedCaster && !sequence && <section ref={commandRef} className={styles.commandCluster} aria-label="Technique commands">
      <header><span>Active sorcerer</span><b>{characterById(selectedCaster).name}</b></header>
      <div className={styles.techniqueRail}>{options.map((option, index) => <button key={option.skill.id} aria-pressed={selectedSkill === option.skill.id} disabled={!canMutate || Boolean(option.disabledReason)} title={option.disabledReason} onClick={() => { setSelectedSkill(option.skill.id); setPendingTarget(null); setPlayback(`${option.skill.name} selected. Choose a highlighted target.`) }}>
        <b>0{index + 1}</b><span>{option.skill.name}{option.disabledReason && <small>{option.disabledReason}</small>}</span><EnergyCost cost={option.skill.cost} />
      </button>)}</div>
      {selectedOption && <article className={styles.techniqueDetail}><div><strong>{selectedOption.skill.name}</strong><small>{selectedOption.skill.target.replace('_', ' ')} · {selectedOption.skill.tags.join(' · ')}</small></div><p>{selectedOption.skill.description}</p></article>}
    </section>}

    {pendingTarget && selectedOption && <section className={styles.targetConfirm} aria-label="Confirm target"><span>Target locked</span><b>{characterById(pendingTarget).name}</b><button className={styles.primaryButton} disabled={!canMutate} onClick={confirmTarget}>Confirm {characterById(pendingTarget).shortName}</button></section>}

    {battle.queue.length > 0 && !sequence && <section className={styles.cinematicQueue} aria-label="Action queue"><ol>{battle.queue.map((action, index) => {
      const caster = characterById(action.casterId)
      const target = characterById(action.targetId)
      const skill = authoritativeSkill(serverSnapshot, playerId, action.casterId, action.skillId)
      if (!skill) return null
      return <li key={action.id}><b>0{index + 1}</b><Portrait id={action.casterId} /><span><strong>{skill.name}</strong><small>{caster.shortName} → {target.shortName}</small></span><span className={styles.queueCost}><EnergyCost cost={skill.cost} /></span><i>→</i></li>
    })}</ol>
    {wildActions.length > 0 && <div className={styles.wildPay} role="group" aria-label="Assign Wild energy">
      {wildActions.map((action) => <span key={action.id}>
        <b>{characterById(action.casterId).shortName}</b>
        {(Object.keys(ENERGY) as CoreEnergy[]).map((color) => <button key={color} type="button" aria-pressed={action.wildPay === color} disabled={!canMutate || battle.energy[color] <= 0} onClick={() => authority.payWildcard(action.id, color)}><i data-energy={color}>{ENERGY[color].letter}</i></button>)}
      </span>)}
    </div>}
    <button className={styles.primaryButton} disabled={!canMutate || wildActions.some((action) => !action.wildPay)} onClick={confirm}>Confirm resolution</button></section>}
  </main>
}

function AuthorityGate({ state, onRetry, onLeave }: { state: AuthorityState; onRetry: () => void; onLeave: () => void }) {
  return <main className={cx(styles.screen, styles.battleScreen)}>
    <div className={styles.battlePrompt} role={state.error ? 'alert' : 'status'} aria-live="polite">
      <span>{state.error ?? 'Connecting to Python battle authority…'}</span>
    </div>
    {state.error && <div className={styles.actions}>
      <button className={styles.primaryButton} onClick={onRetry}>Try again</button>
      <button className={styles.textButton} onClick={onLeave}>Back to menu</button>
    </div>}
  </main>
}

function ResultsScreen({ battle, onRematch, onNewTeam }: { battle: BattleSnapshot; onRematch: () => void; onNewTeam: () => void }) {
  const won = battle.winner === 'player'
  return <main className={cx(styles.screen, styles.resultsScreen)}>
    <div className={styles.resultSlash} />
    <section>
      <p className={styles.eyebrow}>Authoritative verdict</p><h1>{won ? 'Barrier broken' : 'Formation lost'}</h1>
      <p>{won ? 'Your sequence held through the third exchange. The barrier awarded the stronger formation.' : 'The enemy controlled the exchange. Reorder your pressure and enter again.'}</p>
      <div className={styles.resultTeam}>{battle.playerTeam.map((fighter) => <article key={fighter.characterId}><Portrait id={fighter.characterId} /><span><b>{characterById(fighter.characterId).shortName}</b><small>{fighter.hp} HP</small></span></article>)}</div>
      <dl><div><dt>Turns</dt><dd>{battle.turn}</dd></div><div><dt>Team vitality</dt><dd>{battle.playerTeam.reduce((sum, fighter) => sum + fighter.hp, 0)}</dd></div><div><dt>Final revision</dt><dd>{battle.revision}</dd></div></dl>
      <div className={styles.actions}><button className={styles.primaryButton} onClick={onRematch}>Rematch</button><button className={styles.textButton} onClick={onNewTeam}>Change team</button></div>
    </section>
  </main>
}

export default function App({ authority: injectedAuthority }: { authority?: AuthorityClient }) {
  const [authority] = useState(() => injectedAuthority ?? createAuthorityAdapter())
  const [authorityState, setAuthorityState] = useState(() => authority.getState())
  const [screen, setScreen] = useState<Screen>('title')
  const [playerTeam, setPlayerTeam] = useState(DEFAULT_TEAM)
  const [battle, setBattle] = useState<BattleSnapshot | null>(null)
  const enemyTeam = useMemo(() => CHARACTERS.map((character) => character.id).filter((id) => !playerTeam.includes(id)), [playerTeam])
  const startBattle = () => { authority.startBattle(playerTeam, enemyTeam); setScreen('battle') }

  useEffect(() => {
    const unsubscribe = authority.subscribe(setAuthorityState)
    return () => { unsubscribe(); authority.disconnect() }
  }, [authority])

  if (screen === 'profile') return <ProfileScreen onBack={() => setScreen('title')} onSelect={() => setScreen('selection')} />
  if (screen === 'selection') return <SelectionScreen initial={playerTeam} onBack={() => setScreen('title')} onConfirm={(ids) => { setPlayerTeam(ids); setScreen('matchup') }} />
  if (screen === 'matchup') return <MatchupScreen player={playerTeam} enemy={enemyTeam} onBack={() => setScreen('selection')} onFight={startBattle} />
  if (screen === 'battle') {
    if (!authorityState.snapshot || !authorityState.playerId || authorityState.error) {
      return <AuthorityGate state={authorityState} onRetry={startBattle} onLeave={() => { authority.leaveMatch(); setScreen('matchup') }} />
    }
    return <BattleScreen authority={authority} authorityState={authorityState} onFinish={(final) => { setBattle(final); setScreen('results') }} />
  }
  if (screen === 'results' && battle) return <ResultsScreen battle={battle} onRematch={() => setScreen('matchup')} onNewTeam={() => setScreen('selection')} />
  return <TitleScreen onEnter={() => setScreen('selection')} onProfile={() => setScreen('profile')} />
}
