import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { CHARACTERS, characterById } from './data'
import type { BattleSnapshot, ResolutionFrame } from './types'

export interface BattlefieldState {
  snapshot: BattleSnapshot
  selectedId: string | null
  legalTargetIds: string[]
  pendingTargetId: string | null
  queuedIds: string[]
}

interface Props extends BattlefieldState {
  sequence: ResolutionFrame[] | null
  reducedMotion: boolean
  onFighterSelect: (id: string) => void
  onSequenceStage: (frame: ResolutionFrame) => void
  onSequenceComplete: (frame: ResolutionFrame) => void
}

interface FighterView {
  id: string
  side: 'player' | 'enemy'
  container: Phaser.GameObjects.Container
  art: Phaser.GameObjects.Image
  aura: Phaser.GameObjects.Ellipse
  hp: Phaser.GameObjects.Rectangle
  hpText: Phaser.GameObjects.Text
  status: Phaser.GameObjects.Text
  home: Phaser.Math.Vector2
  baseScale: number
}

class ArenaScene extends Phaser.Scene {
  private state?: BattlefieldState
  private fighters = new Map<string, FighterView>()
  private playing = false
  private reducedMotion = false

  preload() {
    this.load.image('arena', '/assets/environments/culling-current-rooftop-v2.webp')
    CHARACTERS.forEach((character) => this.load.image(character.id, character.portrait))
  }

  create() {
    this.drawArena()
    this.game.events.on('battle-state', this.applyState, this)
    this.game.events.on('battle-sequence', this.playSequence, this)
    this.scale.on('resize', this.relayout, this)
    this.game.events.emit('arena-ready')
  }

  private drawArena() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor(0x071122)
    const arena = this.add.image(width / 2, height / 2, 'arena').setName('arena')
    arena.setScale(Math.max(width / arena.width, height / arena.height)).setAlpha(0.88).setDepth(-10).setScrollFactor(0)
    this.add.rectangle(width / 2, height / 2, width, height, 0x071122, 0.32).setName('shade').setDepth(-9).setScrollFactor(0)
    this.add.ellipse(width / 2, height * 0.72, width * 0.78, height * 0.22, 0x071122, 0.34).setDepth(-8).setScrollFactor(0)
    this.add.particles(0, 0, '__WHITE', {
      x: { min: 0, max: width }, y: -20, lifespan: 1500,
      speedY: { min: 190, max: 340 }, speedX: { min: -42, max: -18 },
      scaleX: 0.45, scaleY: { min: 4, max: 10 }, alpha: { start: 0.18, end: 0 },
      frequency: 24, blendMode: 'ADD', tint: 0x8fe7ee,
    }).setDepth(30)
  }

  private layoutFor(id: string, side: 'player' | 'enemy') {
    const { width, height } = this.scale
    const order = side === 'player' ? this.state!.snapshot.playerTeam : this.state!.snapshot.enemyTeam
    const index = order.findIndex((fighter) => fighter.characterId === id)
    const compact = width / height < 2.35
    const formation = side === 'player'
      ? [[.25, .66, 1.08], [.13, .49, .78], [.34, .40, .68]]
      : [[.70, .49, .92], [.84, .64, .82], [.88, .38, .66]]
    const [nx, ny, scale] = formation[Math.max(0, index)]
    return { x: width * nx, y: height * ny, scale: scale * (compact ? .92 : 1) }
  }

  private createFighter(id: string, side: 'player' | 'enemy') {
    const character = characterById(id)
    const spot = this.layoutFor(id, side)
    const container = this.add.container(spot.x, spot.y).setDepth(Math.round(spot.y))
    const shadow = this.add.ellipse(0, 74, 150, 28, 0x02050a, .58)
    const aura = this.add.ellipse(0, 72, 132, 38, 0x35dde8, .06).setStrokeStyle(3, 0x35dde8, .5).setVisible(false)
    const art = this.add.image(0, 0, id).setOrigin(.5, .68).setDisplaySize(190, 254)
    if (side === 'enemy') art.setFlipX(true)
    const fade = this.add.rectangle(0, 56, 190, 64, 0x071122, .2)
    const name = this.add.text(-70, 76, character.shortName.toUpperCase(), { fontFamily: 'Arial', fontSize: '14px', fontStyle: 'bold', color: '#f2e8d5' }).setStroke('#071122', 4)
    const hpBack = this.add.rectangle(0, 100, 142, 7, 0x071122, .9).setOrigin(.5)
    const hp = this.add.rectangle(-71, 100, 142, 5, 0x4fb06d, 1).setOrigin(0, .5)
    const hpText = this.add.text(72, 90, '100', { fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', color: '#f2e8d5' }).setOrigin(1, .5).setStroke('#071122', 3)
    const status = this.add.text(-70, 109, 'READY', { fontFamily: 'Arial', fontSize: '9px', color: '#b7b5ad' }).setStroke('#071122', 3)
    const hit = this.add.ellipse(0, 0, 170, 230, 0xffffff, 0).setInteractive({ useHandCursor: true })
    hit.on('pointerdown', () => this.game.events.emit('fighter-select', id))
    container.add([shadow, aura, art, fade, name, hpBack, hp, hpText, status, hit]).setScale(spot.scale)
    this.tweens.add({ targets: art, y: -5, duration: 1350 + this.fighters.size * 120, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    const view = { id, side, container, art, aura, hp, hpText, status, home: new Phaser.Math.Vector2(spot.x, spot.y), baseScale: spot.scale }
    this.fighters.set(id, view)
    return view
  }

  private applyState(state: BattlefieldState) {
    this.state = state
    if (!this.fighters.size) {
      state.snapshot.playerTeam.forEach((fighter) => this.createFighter(fighter.characterId, 'player'))
      state.snapshot.enemyTeam.forEach((fighter) => this.createFighter(fighter.characterId, 'enemy'))
    }
    if (this.playing) return
    const all = [...state.snapshot.playerTeam, ...state.snapshot.enemyTeam]
    this.fighters.forEach((view, id) => {
      const fighter = all.find((entry) => entry.characterId === id)!
      const selected = id === state.selectedId
      const legal = state.legalTargetIds.includes(id)
      const pending = id === state.pendingTargetId
      view.aura.setVisible(selected || legal || pending)
        .setFillStyle(pending ? 0xd8bf68 : selected ? 0xe32620 : 0x35dde8, .12)
        .setStrokeStyle(pending ? 5 : 3, pending ? 0xd8bf68 : selected ? 0xe32620 : 0x35dde8, .9)
      view.container.setAlpha(state.legalTargetIds.length && view.side === 'enemy' && !legal ? .42 : 1)
      view.art.setTint(fighter.hp <= 0 ? 0x555b66 : 0xffffff)
      view.status.setText(fighter.hp <= 0 ? 'DEFEATED' : fighter.statuses[0]?.toUpperCase() ?? (state.queuedIds.includes(id) ? 'QUEUED' : 'READY'))
      this.setHp(view, fighter.hp)
      const spot = this.layoutFor(id, view.side)
      view.home.set(spot.x, spot.y)
      view.baseScale = spot.scale
      view.container.setScale(spot.scale * (selected ? 1.08 : 1))
      view.container.setPosition(spot.x + (selected ? (view.side === 'player' ? 24 : -24) : 0), spot.y - (selected ? 10 : 0))
    })
    const selected = state.selectedId && this.fighters.get(state.selectedId)
    this.cameras.main.pan(this.scale.width / 2, this.scale.height / 2, 260, 'Sine.easeOut')
    this.cameras.main.zoomTo(selected ? 1.05 : 1, 260, 'Sine.easeOut')
  }

  private setHp(view: FighterView, amount: number) {
    view.hp.width = 142 * Math.max(0, amount) / 100
    view.hp.setFillStyle(amount > 50 ? 0x4fb06d : amount > 20 ? 0xd8bf68 : 0xe32620)
    view.hpText.setText(String(amount))
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(this.reducedMotion ? Math.min(ms, 80) : ms, resolve))
  }

  private tween(config: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((resolve) => this.tweens.add({ ...config, duration: this.reducedMotion ? Math.min(Number(config.duration) || 0, 90) : config.duration, onComplete: () => resolve() }))
  }

  private async playSequence(payload: { frames: ResolutionFrame[]; reducedMotion: boolean }) {
    if (this.playing || !payload.frames.length) return
    this.playing = true
    this.reducedMotion = payload.reducedMotion
    const actor = this.fighters.get(payload.frames[0].actorId)
    const target = this.fighters.get(payload.frames[0].targetId)
    if (!actor || !target) return
    for (const frame of payload.frames) {
      this.game.events.emit('battle-stage', frame)
      if (frame.stage === 'focus') {
        this.cameras.main.pan((actor.container.x + target.container.x) / 2, Math.min(actor.container.y, target.container.y), 280, 'Sine.easeOut')
        this.cameras.main.zoomTo(this.reducedMotion ? 1.04 : 1.16, 280, 'Sine.easeOut')
        actor.aura.setVisible(true).setFillStyle(0xe32620, .18).setStrokeStyle(4, 0xd8bf68, 1)
        await this.wait(330)
      } else if (frame.stage === 'advance') {
        await this.tween({ targets: actor.container, x: target.container.x + (actor.side === 'player' ? -125 : 125), y: target.container.y + 18, ease: 'Cubic.easeInOut', duration: 360 })
      } else if (frame.stage === 'strike') {
        await this.impact(actor, target, frame, false)
      } else if (frame.stage === 'recoil') {
        await this.tween({ targets: actor.container, x: actor.container.x - 30, duration: 160, ease: 'Quad.easeOut' })
        const charge = this.add.circle(target.container.x, target.container.y - 12, 18, 0x35dde8, .18).setStrokeStyle(3, 0x35dde8, .9).setDepth(1000)
        await this.tween({ targets: charge, scale: 2.3, alpha: .75, duration: 380, yoyo: true })
        charge.destroy()
      } else if (frame.stage === 'delayed') {
        await this.impact(actor, target, frame, true)
      } else if (frame.stage === 'return') {
        await this.tween({ targets: actor.container, x: actor.home.x, y: actor.home.y, duration: 430, ease: 'Cubic.easeInOut' })
        actor.aura.setVisible(false)
        this.cameras.main.pan(this.scale.width / 2, this.scale.height / 2, 420, 'Sine.easeOut')
        this.cameras.main.zoomTo(1, 420, 'Sine.easeOut')
      } else if (frame.stage === 'planning') {
        await this.wait(180)
      }
    }
    this.playing = false
    this.game.events.emit('battle-sequence-complete', payload.frames.at(-1))
  }

  private async impact(actor: FighterView, target: FighterView, frame: ResolutionFrame, delayed: boolean) {
    const color = delayed ? 0x35dde8 : 0xe32620
    const burst = this.add.circle(target.container.x, target.container.y - 30, delayed ? 38 : 24, color, .55).setDepth(1000)
    const number = this.add.text(target.container.x, target.container.y - 118, `−${frame.damage}`, { fontFamily: 'Arial', fontSize: delayed ? '32px' : '25px', fontStyle: 'bold', color: delayed ? '#35dde8' : '#f2e8d5' }).setOrigin(.5).setStroke('#071122', 6).setDepth(1001)
    if (!this.reducedMotion) this.cameras.main.shake(delayed ? 180 : 110, delayed ? .008 : .004)
    const fighter = [...frame.snapshot.playerTeam, ...frame.snapshot.enemyTeam].find((entry) => entry.characterId === target.id)
    if (fighter) this.setHp(target, fighter.hp)
    await Promise.all([
      this.tween({ targets: burst, scale: delayed ? 2.8 : 2, alpha: 0, duration: delayed ? 260 : 150 }),
      this.tween({ targets: target.container, x: target.container.x + (actor.side === 'player' ? 24 : -24), angle: actor.side === 'player' ? 3 : -3, duration: 90, yoyo: true }),
      this.tween({ targets: number, y: number.y - 38, alpha: 0, duration: 520 }),
    ])
    burst.destroy()
    number.destroy()
    await this.wait(delayed ? 230 : 160)
  }

  private relayout() {
    const arena = this.children.getByName('arena') as Phaser.GameObjects.Image | null
    const shade = this.children.getByName('shade') as Phaser.GameObjects.Rectangle | null
    if (arena) arena.setPosition(this.scale.width / 2, this.scale.height / 2).setScale(Math.max(this.scale.width / arena.width, this.scale.height / arena.height))
    shade?.setPosition(this.scale.width / 2, this.scale.height / 2).setSize(this.scale.width, this.scale.height)
    if (this.state && !this.playing) this.applyState(this.state)
  }

  shutdown() {
    this.game.events.off('battle-state', this.applyState, this)
    this.game.events.off('battle-sequence', this.playSequence, this)
    this.scale.off('resize', this.relayout, this)
  }
}

export default function Battlefield(props: Props) {
  const host = useRef<HTMLDivElement>(null)
  const game = useRef<Phaser.Game | null>(null)
  const current = useRef(props)
  current.current = props

  useEffect(() => {
    if (!host.current) return
    const instance = new Phaser.Game({
      type: Phaser.AUTO, parent: host.current, transparent: true,
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      scene: ArenaScene, audio: { noAudio: true },
      render: { antialias: true, powerPreference: 'high-performance' },
    })
    game.current = instance
    const sendState = () => instance.events.emit('battle-state', current.current)
    const select = (id: string) => current.current.onFighterSelect(id)
    const stage = (frame: ResolutionFrame) => current.current.onSequenceStage(frame)
    const complete = (frame: ResolutionFrame) => current.current.onSequenceComplete(frame)
    instance.events.on('arena-ready', sendState)
    instance.events.on('fighter-select', select)
    instance.events.on('battle-stage', stage)
    instance.events.on('battle-sequence-complete', complete)
    return () => {
      instance.events.off('arena-ready', sendState)
      instance.events.off('fighter-select', select)
      instance.events.off('battle-stage', stage)
      instance.events.off('battle-sequence-complete', complete)
      instance.destroy(true)
      game.current = null
    }
  }, [])

  useEffect(() => { game.current?.events.emit('battle-state', props) }, [props.snapshot, props.selectedId, props.pendingTargetId, props.legalTargetIds, props.queuedIds])
  useEffect(() => {
    if (props.sequence) game.current?.events.emit('battle-sequence', { frames: props.sequence, reducedMotion: props.reducedMotion })
  }, [props.sequence, props.reducedMotion])

  return <div ref={host} className="battlefield-canvas" aria-hidden="true" />
}
