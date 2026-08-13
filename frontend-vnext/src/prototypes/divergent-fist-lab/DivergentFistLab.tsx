import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ALL_LAB_ASSETS } from './assetManifest'
import { snapshotForBeat } from './beatSnapshot'
import { LAB_BEATS } from './labConfig'
import type { LabBeat, PlaybackSpeed } from './labConfig'
import { presentationForBeat } from './presentationModel'
import { validReviewBeat, validViewportPreset, VIEWPORT_PRESETS } from './reviewMode'
import type { ViewportPreset } from './reviewMode'
import { TimelineDirector } from './timeline'
import type { TimelineSnapshot } from './timeline'
import styles from './DivergentFistLab.module.css'

const DivergentFistBattlefield = lazy(() => import('./DivergentFistBattlefield'))

function interactionStateFor(beat: LabBeat) {
  const index = LAB_BEATS.indexOf(beat)
  return {
    yujiSelected: index >= LAB_BEATS.indexOf('yuji-selected'),
    skillSelected: index >= LAB_BEATS.indexOf('skill-selected'),
    targetSelected: index >= LAB_BEATS.indexOf('maki-targeted'),
    targetConfirmed: index >= LAB_BEATS.indexOf('target-confirmed'),
    queued: index >= LAB_BEATS.indexOf('queued'),
  }
}

export default function DivergentFistLab() {
  const params = new URLSearchParams(window.location.search)
  const qaSize = params.get('qa')?.match(/^(1440x900|1280x720|844x390)$/)?.[1]
  const artistReview = params.get('review') === '1'
  const initialBeat = validReviewBeat(params.get('beat'))
  const initialReducedMotion = params.get('reduced') === '1'
  const initialDebugAll = params.get('debug') === '1'
  const [preset, setPreset] = useState<ViewportPreset>(() => validViewportPreset(params.get('preset')))
  const [qaWidth, qaHeight] = qaSize?.split('x').map(Number) ?? []
  const reviewSize = VIEWPORT_PRESETS[preset]
  const stageWidth = artistReview ? reviewSize.width : qaWidth
  const stageHeight = artistReview ? reviewSize.height : qaHeight
  const director = useRef(new TimelineDirector())
  const [timeline, setTimeline] = useState<TimelineSnapshot>(() => director.current.snapshot())
  const [yujiSelected, setYujiSelected] = useState(false)
  const [skillSelected, setSkillSelected] = useState(false)
  const [targetSelected, setTargetSelected] = useState(false)
  const [targetConfirmed, setTargetConfirmed] = useState(false)
  const [queued, setQueued] = useState(false)
  const [debugAll, setDebugAll] = useState(initialDebugAll)
  const [fighterAnchors, setFighterAnchors] = useState(artistReview && params.get('anchors') === '1')
  const [formationGuides, setFormationGuides] = useState(false)
  const [effectAnchors, setEffectAnchors] = useState(false)
  const [cameraBounds, setCameraBounds] = useState(false)
  const [assetLabels, setAssetLabels] = useState(artistReview && params.get('labels') === '1')
  const [hitboxes, setHitboxes] = useState(false)

  const syncInteraction = (beat: LabBeat) => {
    const state = interactionStateFor(beat)
    setYujiSelected(state.yujiSelected)
    setSkillSelected(state.skillSelected)
    setTargetSelected(state.targetSelected)
    setTargetConfirmed(state.targetConfirmed)
    setQueued(state.queued)
  }

  useEffect(() => {
    const current = director.current
    const unsubscribe = current.subscribe(setTimeline)
    current.setReducedMotion(initialReducedMotion)
    if (artistReview) {
      current.show(initialBeat)
      syncInteraction(initialBeat)
    }
    return () => {
      unsubscribe()
      current.destroy()
    }
  }, [])

  const reset = () => {
    setYujiSelected(false)
    setSkillSelected(false)
    setTargetSelected(false)
    setTargetConfirmed(false)
    setQueued(false)
    director.current.reset()
  }

  const replay = () => {
    setYujiSelected(true)
    setSkillSelected(true)
    setTargetSelected(true)
    setTargetConfirmed(true)
    setQueued(true)
    director.current.replay()
  }

  const move = (direction: 'previous' | 'next') => {
    director.current[direction]()
    syncInteraction(director.current.snapshot().beat)
  }

  const jump = (beat: LabBeat) => {
    director.current.jump(beat)
    syncInteraction(beat)
  }

  const exportCleanFrame = () => {
    const restore = { assetLabels, fighterAnchors, effectAnchors, formationGuides, cameraBounds, hitboxes, debugAll }
    setAssetLabels(false); setFighterAnchors(false); setEffectAnchors(false); setFormationGuides(false); setCameraBounds(false); setHitboxes(false); setDebugAll(false)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="divergent-fist-canvas"] canvas')
      canvas?.toBlob((blob) => {
        if (!blob) return
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `divergent-fist-${timeline.beat}-${stageWidth}x${stageHeight}.png`
        link.click()
        URL.revokeObjectURL(link.href)
        setAssetLabels(restore.assetLabels); setFighterAnchors(restore.fighterAnchors); setEffectAnchors(restore.effectAnchors); setFormationGuides(restore.formationGuides); setCameraBounds(restore.cameraBounds); setHitboxes(restore.hitboxes); setDebugAll(restore.debugAll)
      }, 'image/png')
    }))
  }

  const presentation = presentationForBeat(timeline.beat)
  const visual = snapshotForBeat(timeline.beat, stageWidth || 1440, stageHeight || 900, timeline.reducedMotion)
  const previousBeat = LAB_BEATS[Math.max(0, timeline.index - 1)]
  const nextBeat = LAB_BEATS[Math.min(LAB_BEATS.length - 1, timeline.index + 1)]

  return <main className={`${styles.lab} ${artistReview ? styles.artistReview : ''}`}>
    <section className={styles.stage} aria-label="Divergent Fist choreography battlefield" style={stageWidth && stageHeight ? { width: stageWidth, height: stageHeight, minHeight: stageHeight } : undefined}>
      <Suspense fallback={<div className={styles.loading}>Loading Phaser laboratory…</div>}>
        <DivergentFistBattlefield
          beat={timeline.beat}
          playing={timeline.playing}
          paused={timeline.paused}
          speed={timeline.speed}
          reducedMotion={timeline.reducedMotion}
          debugAll={debugAll}
          fighterAnchors={fighterAnchors}
          formationGuides={formationGuides}
          effectAnchors={effectAnchors}
          cameraBounds={cameraBounds}
          assetLabels={assetLabels}
          hitboxes={hitboxes}
        />
      </Suspense>
    </section>

    {artistReview ? <aside className={styles.artistToolbar} aria-label="Artist review controls">
      <strong>Artist review · {timeline.beat}</strong>
      <label>Beat<select value={timeline.beat} onChange={(event) => jump(event.target.value as LabBeat)}>{LAB_BEATS.map((beat) => <option key={beat}>{beat}</option>)}</select></label>
      <label>Preset<select value={preset} onChange={(event) => setPreset(event.target.value as ViewportPreset)}>{Object.entries(VIEWPORT_PRESETS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
      <label><input type="checkbox" checked={assetLabels} onChange={(event) => setAssetLabels(event.target.checked)} /> Asset IDs</label>
      <label><input type="checkbox" checked={fighterAnchors} onChange={(event) => setFighterAnchors(event.target.checked)} /> Origins and anchors</label>
      <button onClick={exportCleanFrame}>Export clean frame</button>
    </aside> : <section className={styles.workbench} aria-label="Prototype workbench">
      <header className={styles.labHeader}>
        <div>
          <p>Isolated Phaser choreography laboratory</p>
          <h1>Divergent Fist · Yuji → Maki</h1>
          <span>Blocking placeholders only. Final character, environment, VFX, icon, texture, and type assets remain human-production work.</span>
        </div>
        <a href="/">Return to frontend</a>
      </header>

      <div className={styles.statusGrid}>
        <article><span>Current beat</span><strong>{timeline.beat}</strong><small>{timeline.index + 1} / {LAB_BEATS.length} · prev {previousBeat} · next {nextBeat}</small></article>
        <article><span>Timeline</span><strong>{timeline.playing ? timeline.paused ? 'Paused' : 'Playing' : 'Manual'}</strong><small>{timeline.speed}× · {timeline.reducedMotion ? 'Reduced motion' : 'Full motion'}</small></article>
        <article><span>Asset contract</span><strong>{ALL_LAB_ASSETS.length} slots</strong><small>All currently marked placeholder</small></article>
        <article className={styles.queueStatus}><span>Mock queue</span><strong>{queued ? '01 · Yuji / Divergent Fist / Maki' : 'Empty'}</strong><small>{queued ? 'Ready to resolve' : 'Confirm Maki to queue'}</small></article>
        <article><span>Active poses</span><strong>{presentation.yujiPose} · {presentation.makiPose}</strong><small>Yuji 100 · Maki {presentation.makiHealth}</small></article>
        <article><span>Camera</span><strong>{visual.camera.mode}</strong><small>{visual.camera.zoom.toFixed(2)}× · {Math.round(visual.camera.x)}, {Math.round(visual.camera.y)}</small></article>
      </div>

      <div className={styles.controlGroups}>
        <fieldset>
          <legend>Interaction</legend>
          <button onClick={() => { setYujiSelected(true); director.current.show('yuji-selected') }}>Select Yuji</button>
          <button disabled={!yujiSelected} onClick={() => { setSkillSelected(true); setTargetSelected(false); setTargetConfirmed(false); director.current.show('skill-selected') }}>Select Divergent Fist</button>
          <button disabled={!skillSelected} onClick={() => { setTargetSelected(true); setTargetConfirmed(false); director.current.show('maki-targeted') }}>Select Maki</button>
          <button disabled={!targetSelected} onClick={() => { setTargetConfirmed(true); director.current.show('target-confirmed') }}>Confirm target</button>
          <button disabled={!targetConfirmed} onClick={() => { setQueued(true); director.current.show('queued') }}>Queue action</button>
          <button disabled={!queued} onClick={() => director.current.playFrom('resolution-start')}>Resolve</button>
        </fieldset>

        <fieldset>
          <legend>Timeline</legend>
          <button onClick={replay}>Replay full sequence</button>
          <button disabled={!timeline.playing || timeline.paused} onClick={() => director.current.pause()}>Pause</button>
          <button disabled={!timeline.playing || !timeline.paused} onClick={() => director.current.resume()}>Resume</button>
          <button onClick={() => move('previous')}>Previous beat</button>
          <button onClick={() => move('next')}>Next beat</button>
          <label>Jump
            <select aria-label="Jump to beat" value={timeline.beat} onChange={(event) => jump(event.target.value as LabBeat)}>
              {LAB_BEATS.map((beat) => <option key={beat} value={beat}>{beat}</option>)}
            </select>
          </label>
          <button onClick={reset}>Reset</button>
        </fieldset>

        <fieldset>
          <legend>Playback</legend>
          <label>Speed
            <select value={timeline.speed} onChange={(event) => director.current.setSpeed(Number(event.target.value) as PlaybackSpeed)}>
              <option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option>
            </select>
          </label>
          <label><input type="checkbox" checked={timeline.reducedMotion} onChange={(event) => director.current.setReducedMotion(event.target.checked)} /> Reduced motion</label>
          <label><input type="checkbox" checked={debugAll} onChange={(event) => setDebugAll(event.target.checked)} /> All debug visuals</label>
          <label><input type="checkbox" checked={fighterAnchors} onChange={(event) => setFighterAnchors(event.target.checked)} /> Fighter anchors</label>
          <label><input type="checkbox" checked={formationGuides} onChange={(event) => setFormationGuides(event.target.checked)} /> Formation guides</label>
          <label><input type="checkbox" checked={effectAnchors} onChange={(event) => setEffectAnchors(event.target.checked)} /> Effect anchors</label>
          <label><input type="checkbox" checked={cameraBounds} onChange={(event) => setCameraBounds(event.target.checked)} /> Camera bounds</label>
          <label><input type="checkbox" checked={assetLabels} onChange={(event) => setAssetLabels(event.target.checked)} /> Asset labels</label>
          <label><input type="checkbox" checked={hitboxes} onChange={(event) => setHitboxes(event.target.checked)} /> Hitboxes</label>
        </fieldset>
      </div>

      <p className={styles.live} role="status" aria-live="assertive">{timeline.announcement}</p>
    </section>}
  </main>
}
