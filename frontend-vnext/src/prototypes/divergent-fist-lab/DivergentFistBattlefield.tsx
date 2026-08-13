import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { ALL_LAB_ASSETS, ASSET_MANIFEST, ENVIRONMENT_LAYERS, RENDER_DEPTHS } from './assetManifest'
import { snapshotForBeat } from './beatSnapshot'
import { CameraDirector } from './CameraDirector'
import { FighterEntity } from './FighterEntity'
import { ImpactDirector } from './ImpactDirector'
import { LabUiDirector } from './LabUiDirector'
import { TargetingDirector } from './TargetingDirector'
import { FIGHTER_IDS, formationFor } from './formationLayout'
import type { FighterId } from './formationLayout'
import { DIVERGENT_FIST_DAMAGE, LAB_BEATS, LAB_TIMINGS } from './labConfig'
import type { LabBeat, PlaybackSpeed } from './labConfig'
import { presentationForBeat } from './presentationModel'

interface Props {
  beat: LabBeat
  playing: boolean
  paused: boolean
  speed: PlaybackSpeed
  reducedMotion: boolean
  debugAll: boolean
  fighterAnchors: boolean
  formationGuides: boolean
  effectAnchors: boolean
  cameraBounds: boolean
  assetLabels: boolean
  hitboxes: boolean
}

interface LabState extends Props {}

const COLORS = { bone: 0xf2e8d5, ink: 0x17191e, red: 0xe32620, cyan: 0x35dde8, gold: 0xd8bf68, green: 0x4fb06d }

const FIGHTERS = [
  { id: 'megumi', name: 'Megumi', team: 'ally' as const, slot: 1, facing: 'right' as const },
  { id: 'nobara', name: 'Nobara', team: 'ally' as const, slot: 2, facing: 'right' as const },
  { id: 'yuji', name: 'Yuji', team: 'ally' as const, slot: 0, facing: 'right' as const },
  { id: 'maki', name: 'Maki', team: 'enemy' as const, slot: 0, facing: 'left' as const },
  { id: 'junpei', name: 'Junpei', team: 'enemy' as const, slot: 2, facing: 'left' as const },
  { id: 'panda', name: 'Panda', team: 'enemy' as const, slot: 1, facing: 'left' as const },
] as const

class DivergentFistScene extends Phaser.Scene {
  private readonly fighters = new Map<string, FighterEntity>()
  private readonly environment: Phaser.GameObjects.Image[] = []
  private targeting?: TargetingDirector
  private impacts?: ImpactDirector
  private ui?: LabUiDirector
  private cameraDirector?: CameraDirector
  private selectedRing?: Phaser.GameObjects.Ellipse
  private debug?: Phaser.GameObjects.Graphics
  private layerLabel?: Phaser.GameObjects.Text
  private effectLabel?: Phaser.GameObjects.Text
  private readonly fighterAssetLabels = new Map<string, Phaser.GameObjects.Text>()
  private state?: LabState
  private currentBeat: LabBeat = 'planning'

  constructor() {
    super('divergent-fist-lab')
  }

  preload() {
    ALL_LAB_ASSETS.forEach(({ key, src }) => this.load.image(key, src))
  }

  create() {
    this.cameras.main.setBackgroundColor(0x101b36).setRoundPixels(true)
    this.cameraDirector = new CameraDirector(this, this.cameras.main)
    this.createEnvironment()
    this.createFighters()
    this.targeting = new TargetingDirector(this)
    this.impacts = new ImpactDirector(this)
    this.ui = new LabUiDirector(this)
    this.createInterface()
    this.scale.on('resize', this.relayout, this)
    this.game.events.on('df-state', this.applyState, this)
    this.relayout()
    this.game.events.emit('df-ready')
  }

  private createEnvironment() {
    ENVIRONMENT_LAYERS.forEach((asset) => {
      const alpha = asset.id === 'environment.barrier' ? 0.72
        : asset.id === 'environment.foreground' ? 0.45
          : asset.id === 'environment.rain' ? 0.24
            : asset.id === 'environment.haze' ? 0.26
              : asset.id === 'environment.lighting' ? 0.3 : 1
      this.environment.push(this.add.image(0, 0, asset.key).setName(asset.id).setOrigin(...asset.origin).setDepth(asset.depth).setAlpha(alpha))
    })
  }

  private createFighters() {
    FIGHTERS.forEach((fighter) => {
      const yuji = fighter.id === 'yuji'
      const maki = fighter.id === 'maki'
      const poseAssets = yuji ? {
        idle: ASSET_MANIFEST.yuji.idle,
        selected: ASSET_MANIFEST.yuji.selected,
        anticipation: ASSET_MANIFEST.yuji.anticipation,
        strike: ASSET_MANIFEST.yuji.strike,
        recovery: ASSET_MANIFEST.yuji.recovery,
        return: ASSET_MANIFEST.yuji.return,
      } : maki ? {
        idle: ASSET_MANIFEST.maki.idle,
        targeted: ASSET_MANIFEST.maki.targeted,
        'physical-hit': ASSET_MANIFEST.maki.physicalHit,
        stagger: ASSET_MANIFEST.maki.stagger,
        'delayed-hit': ASSET_MANIFEST.maki.delayedHit,
        recovery: ASSET_MANIFEST.maki.recovery,
        defeated: ASSET_MANIFEST.maki.defeated,
      } : { idle: ASSET_MANIFEST.support }
      const entity = new FighterEntity(this, {
        ...fighter,
        formationSlot: fighter.slot,
        poseAssets,
        shadowAsset: yuji ? ASSET_MANIFEST.yuji.shadow : maki ? ASSET_MANIFEST.maki.shadow : ASSET_MANIFEST.yuji.shadow,
        healthAssets: { track: ASSET_MANIFEST.ui.healthTrack, fill: ASSET_MANIFEST.ui.healthFill, damageLag: ASSET_MANIFEST.ui.damageLag },
        mirrorArt: !yuji && !maki && fighter.facing === 'left',
      })
      this.fighters.set(fighter.id, entity)
    })
  }

  private createInterface() {
    this.selectedRing = this.add.ellipse(0, 0, 196, 58, COLORS.gold, 0.08).setStrokeStyle(5, COLORS.gold, 0.95).setDepth(RENDER_DEPTHS.worldEffect).setVisible(false)
    this.debug = this.add.graphics().setDepth(RENDER_DEPTHS.debug).setVisible(false)
    this.layerLabel = this.add.text(14, 48, '', {
      color: '#f2e8d5', backgroundColor: '#17191edb', padding: { x: 8, y: 6 }, fontFamily: 'monospace', fontSize: '11px',
    }).setDepth(RENDER_DEPTHS.debug + 1).setScrollFactor(0).setVisible(false)
    this.effectLabel = this.add.text(14, 0, '', {
      color: '#35dde8', backgroundColor: '#17191edb', padding: { x: 8, y: 6 }, fontFamily: 'monospace', fontSize: '11px',
    }).setDepth(RENDER_DEPTHS.debug + 1).setScrollFactor(0).setVisible(false)
    for (const id of ['yuji', 'maki']) {
      this.fighterAssetLabels.set(id, this.add.text(0, 0, '', {
        color: '#d8bf68', backgroundColor: '#17191edb', padding: { x: 5, y: 3 }, fontFamily: 'monospace', fontSize: '10px',
      }).setOrigin(0.5).setDepth(RENDER_DEPTHS.debug + 1).setVisible(false))
    }
  }

  private applyState(state: LabState) {
    const beatChanged = state.beat !== this.currentBeat
    const motionChanged = state.reducedMotion !== this.state?.reducedMotion
    this.state = state
    this.tweens.timeScale = state.speed
    this.time.timeScale = state.speed
    this.fighters.forEach((fighter) => fighter.setReducedMotion(state.reducedMotion))
    if (beatChanged || motionChanged || state.beat === 'planning') this.presentBeat(state.beat)
    else this.refreshTargeting()
    if (state.paused) {
      this.tweens.pauseAll()
      this.cameraDirector?.pause()
    } else {
      this.tweens.resumeAll()
      this.cameraDirector?.resume()
    }
    this.drawDebug()
  }

  private presentBeat(beat: LabBeat, forceCanonical = false) {
    const previousIndex = LAB_BEATS.indexOf(this.currentBeat)
    const nextIndex = LAB_BEATS.indexOf(beat)
    const canonical = forceCanonical || !this.state?.playing || nextIndex <= previousIndex || nextIndex - previousIndex > 1
    const presentation = presentationForBeat(beat)
    const duration = LAB_TIMINGS[beat]
    const animate = Boolean(this.state?.playing)
    const yuji = this.fighters.get('yuji')!
    const maki = this.fighters.get('maki')!
    const travel = this.state?.reducedMotion ? 0.34 : 1
    this.currentBeat = beat

    if (canonical) {
      this.applySnapshot(beat)
      this.game.events.emit('df-beat-presented', beat)
      return
    }
    yuji.setPose(presentation.yujiPose)
    maki.setPose(presentation.makiPose)
    maki.setHealth(presentation.makiHealth, ['physical-impact', 'delayed-impact', 'health-settle'].includes(beat) ? duration * 2 : 0)
    this.ui?.present(beat, presentation.queue)
    this.selectedRing?.setVisible(beat === 'yuji-selected' || beat === 'skill-selected').setPosition(yuji.home.x + 30 * travel, yuji.home.y + 8)

    if (presentation.targeting) {
      this.quietSupporting('yuji', 'maki')
      yuji.setSelected(true)
      maki.setTargeted(true)
      this.targeting?.show(yuji, maki)
    } else if (nextIndex >= LAB_BEATS.indexOf('resolution-start') && beat !== 'planning-restored') {
      this.quietSupporting('yuji', 'maki')
      this.targeting?.hide()
    } else {
      this.targeting?.hide()
    }

    if (beat === 'yuji-selected') {
      this.quietSupporting('yuji')
      yuji.setSelected(true)
      this.move(yuji.container, { x: yuji.home.x + 38 * travel, y: yuji.home.y - 12, scale: yuji.homeScale * 1.14 }, duration, animate)
    } else if (beat === 'resolution-start') {
      this.impacts?.hide()
    } else if (beat === 'physical-anticipation') {
      this.move(yuji.container, { x: yuji.home.x + 46 * travel, y: yuji.home.y - 10, scaleX: yuji.homeScale * 1.06, scaleY: yuji.homeScale * 1.1 }, duration, animate)
    } else if (beat === 'yuji-advance') {
      this.move(yuji.container, { x: maki.container.x - 176 * travel, y: maki.container.y + 18, scale: yuji.homeScale * 1.28 }, duration, animate)
    } else if (beat === 'physical-strike') {
      this.move(yuji.container, { x: maki.container.x - 112 * travel, y: maki.container.y + 10, scale: yuji.homeScale * 1.34 }, duration, animate)
    } else if (beat === 'physical-impact') {
      this.impacts?.showPhysical(maki, animate, duration, Boolean(this.state?.reducedMotion))
    } else if (beat === 'first-reaction') {
      this.move(maki.container, { x: maki.home.x + 44 * travel, angle: 6 * travel }, duration, animate, true)
    } else if (beat === 'stagger') {
      this.impacts?.hide()
      this.move(maki.container, { x: maki.home.x + 30 * travel, angle: -4 * travel }, duration, animate)
    } else if (beat === 'cursed-compression') {
      this.impacts?.showCompression(maki, animate, duration, Boolean(this.state?.reducedMotion))
    } else if (beat === 'delayed-impact') {
      this.impacts?.showDelayed(maki, animate, duration, Boolean(this.state?.reducedMotion))
    } else if (beat === 'second-reaction') {
      this.move(maki.container, { x: maki.home.x + 62 * travel, angle: -10 * travel, scale: maki.homeScale * 1.08 }, duration, animate, true)
    } else if (beat === 'health-settle') {
      this.impacts?.hide()
    } else if (beat === 'recovery') {
      this.impacts?.showResidual(maki)
    } else if (beat === 'return') {
      this.impacts?.hide()
      this.move(yuji.container, { x: yuji.home.x, y: yuji.home.y, scale: yuji.homeScale }, duration, animate)
      this.move(maki.container, { x: maki.home.x, y: maki.home.y, scale: maki.homeScale, angle: 0 }, duration, animate)
    } else if (beat === 'planning-restored') {
      this.resetPresentation(DIVERGENT_FIST_DAMAGE.healthAfterDelayed)
      maki.setHealth(DIVERGENT_FIST_DAMAGE.healthAfterDelayed)
      this.impacts?.showResidual(maki)
    }

    this.applyCamera(beat, duration, animate)
    if (!this.state?.reducedMotion && beat === 'physical-impact') this.cameraDirector?.shakeFor(110, 5)
    if (!this.state?.reducedMotion && beat === 'delayed-impact') this.cameraDirector?.shakeFor(170, 9)
    this.drawDebug()
    this.game.events.emit('df-beat-presented', beat)
  }

  private applySnapshot(beat: LabBeat) {
    const snapshot = snapshotForBeat(beat, this.scale.width, this.scale.height, Boolean(this.state?.reducedMotion))
    this.resetPresentation(snapshot.fighters.maki.health)
    FIGHTER_IDS.forEach((id) => {
      const fighter = this.fighters.get(id)!
      const state = snapshot.fighters[id]
      fighter.setPose(state.pose).setHealth(state.health).setQuiet(state.quiet)
      if (state.targeted) fighter.setTargeted(true)
      else if (state.selected) fighter.setSelected(true)
      fighter.container.setPosition(state.x, state.y).setScale(state.scaleX, state.scaleY).setAngle(state.angle).setDepth(state.depth)
    })
    const yuji = this.fighters.get('yuji')!
    const maki = this.fighters.get('maki')!
    this.selectedRing?.setVisible(beat === 'yuji-selected' || beat === 'skill-selected').setPosition(yuji.home.x + 30 * (this.state?.reducedMotion ? 0.34 : 1), yuji.home.y + 8)
    if (snapshot.targeting) this.targeting?.show(yuji, maki)
    this.ui?.present(beat, snapshot.queue)
    if (snapshot.impact === 'physical') this.impacts?.showPhysical(maki, false, LAB_TIMINGS[beat], Boolean(this.state?.reducedMotion))
    else if (snapshot.impact === 'compression') this.impacts?.showCompression(maki, false, LAB_TIMINGS[beat], Boolean(this.state?.reducedMotion))
    else if (snapshot.impact === 'delayed') this.impacts?.showDelayed(maki, false, LAB_TIMINGS[beat], Boolean(this.state?.reducedMotion))
    else if (snapshot.impact === 'residual') this.impacts?.showResidual(maki)
    this.cameraDirector?.snap(snapshot.camera)
    this.drawDebug()
  }

  private move(targets: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[], values: Record<string, number>, duration: number, animate: boolean, yoyo = false) {
    if (animate) this.tweens.add({ targets, ...values, duration, yoyo, ease: 'Cubic.easeOut' })
    else Object.entries(values).forEach(([key, value]) => (targets as unknown as Record<string, number>)[key] = value)
  }

  private resetPresentation(makiHealth: number) {
    this.tweens.killAll()
    this.cameraDirector?.cancel()
    this.fighters.forEach((fighter) => fighter.resetVisuals(fighter.id === 'maki' ? makiHealth : 100))
    this.targeting?.hide()
    this.impacts?.hide()
    this.selectedRing?.setVisible(false)
    this.ui?.hideTransient()
  }

  private refreshTargeting() {
    if (!this.state) return
    if (presentationForBeat(this.state.beat).targeting) this.targeting?.show(this.fighters.get('yuji')!, this.fighters.get('maki')!)
  }

  private quietSupporting(...activeIds: string[]) {
    this.fighters.forEach((fighter, id) => fighter.setQuiet(!activeIds.includes(id)))
  }

  private applyCamera(beat: LabBeat, duration: number, animate: boolean) {
    const target = snapshotForBeat(beat, this.scale.width, this.scale.height, Boolean(this.state?.reducedMotion)).camera
    this.cameraDirector?.transitionTo(target, duration, animate)
  }

  private relayout() {
    const { width, height } = this.scale
    this.environment.forEach((layer) => layer.setPosition(width / 2, height / 2).setScale(Math.max(width / layer.width, height / layer.height)))
    FIGHTER_IDS.forEach((id) => {
      const spot = formationFor(id, width, height)
      this.fighters.get(id)?.setFormation(spot.x, spot.y, spot.scale)
    })
    this.ui?.layout(width, height)
    this.effectLabel?.setPosition(14, Math.max(160, height - 82))
    if (this.state) this.presentBeat(this.state.beat, true)
  }

  private drawDebug() {
    const graphics = this.debug
    const state = this.state
    if (!graphics || !state) return
    const enabled = (specific: boolean) => state.debugAll || specific
    const visible = state.debugAll || state.fighterAnchors || state.formationGuides || state.effectAnchors || state.cameraBounds || state.assetLabels || state.hitboxes
    graphics.setVisible(visible).clear()
    this.layerLabel?.setVisible(enabled(state.assetLabels))
    this.effectLabel?.setVisible(enabled(state.assetLabels))
    this.fighterAssetLabels.forEach((label) => label.setVisible(enabled(state.assetLabels)))
    if (!visible) return
    if (enabled(state.formationGuides)) {
      graphics.lineStyle(1, COLORS.green, 0.38)
      for (let x = this.scale.width / 8; x < this.scale.width; x += this.scale.width / 8) graphics.lineBetween(x, 0, x, this.scale.height)
      for (let y = this.scale.height / 6; y < this.scale.height; y += this.scale.height / 6) graphics.lineBetween(0, y, this.scale.width, y)
    }
    if (enabled(state.fighterAnchors)) {
      graphics.lineStyle(2, COLORS.gold, 0.9)
      this.fighters.forEach((fighter) => {
        graphics.strokeCircle(fighter.container.x, fighter.container.y, 10)
        const status = fighter.worldAnchor('status')
        const target = fighter.worldAnchor('target')
        graphics.strokeCircle(status.x, status.y, 7).strokeCircle(target.x, target.y, 7)
      })
    }
    if (enabled(state.effectAnchors)) {
      const yuji = this.fighters.get('yuji')!
      const maki = this.fighters.get('maki')!
      this.targeting?.drawDebug(graphics, yuji, maki)
      this.impacts?.drawDebug(graphics, maki)
    }
    if (enabled(state.cameraBounds)) {
      const view = this.cameras.main.worldView
      graphics.lineStyle(3, COLORS.red, 0.75).strokeRect(view.x + 12, view.y + 12, view.width - 24, view.height - 24)
    }
    if (enabled(state.hitboxes)) {
      graphics.lineStyle(2, COLORS.red, 0.7)
      this.fighters.forEach((fighter) => {
        const width = 210 * fighter.container.scaleX
        const height = 350 * fighter.container.scaleY
        graphics.strokeRect(fighter.container.x - width / 2, fighter.container.y - height, width, height)
      })
    }
    if (enabled(state.assetLabels)) this.updateAssetLabels()
  }

  private updateAssetLabels() {
    this.layerLabel?.setText(ENVIRONMENT_LAYERS.map((asset) => `${asset.depth}: ${asset.id}`).join('\n'))
    for (const id of ['yuji', 'maki']) {
      const fighter = this.fighters.get(id)!
      const anchor = fighter.worldAnchor('status')
      this.fighterAssetLabels.get(id)?.setText(fighter.currentAssetId).setPosition(anchor.x, anchor.y - 18)
    }
    const active = [...(this.targeting?.activeAssetIds() ?? []), ...(this.impacts?.activeAssetIds() ?? []), ...(this.ui?.activeAssetIds() ?? [])]
    this.effectLabel?.setText(active.join('\n'))
  }

  shutdown() {
    this.cameraDirector?.destroy()
    this.scale.off('resize', this.relayout, this)
    this.game.events.off('df-state', this.applyState, this)
  }
}

export default function DivergentFistBattlefield(props: Props) {
  const host = useRef<HTMLDivElement>(null)
  const game = useRef<Phaser.Game | null>(null)
  const current = useRef(props)
  current.current = props

  useEffect(() => {
    if (!host.current) return
    const instance = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      transparent: false,
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      scene: DivergentFistScene,
      audio: { noAudio: true },
      render: { antialias: true, powerPreference: 'high-performance' },
    })
    game.current = instance
    const sendState = () => instance.events.emit('df-state', current.current)
    instance.events.on('df-ready', sendState)
    return () => {
      instance.events.off('df-ready', sendState)
      instance.destroy(true)
      game.current = null
    }
  }, [])

  useEffect(() => {
    game.current?.events.emit('df-state', props)
  }, [props.beat, props.playing, props.paused, props.speed, props.reducedMotion, props.debugAll, props.fighterAnchors, props.formationGuides, props.effectAnchors, props.cameraBounds, props.assetLabels, props.hitboxes])

  return <div ref={host} data-testid="divergent-fist-canvas" aria-hidden="true" />
}
