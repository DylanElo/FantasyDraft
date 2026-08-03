import Phaser from 'phaser'
import { RENDER_DEPTHS } from './assetManifest'
import type { LabAsset } from './assetManifest'
import { resolvePoseAsset } from './poseContract'
import type { PoseAssets } from './poseContract'
import { FIGHTER_PRESENTATION_CHILD_ROLES } from './runtimeContracts'

export type FighterTeam = 'ally' | 'enemy'
export type FighterPose = 'idle' | 'selected' | 'targeted' | 'anticipation' | 'strike' | 'physical-hit' | 'stagger' | 'delayed-hit' | 'recovery' | 'return' | 'defeated'

export interface FighterEntitySpec {
  id: string
  name: string
  team: FighterTeam
  formationSlot: number
  facing: 'left' | 'right'
  poseAssets: PoseAssets
  shadowAsset: LabAsset
  healthAssets: { track: LabAsset; fill: LabAsset; damageLag: LabAsset }
  mirrorArt?: boolean
  maxHealth?: number
}

export class FighterEntity {
  readonly id: string
  readonly team: FighterTeam
  readonly formationSlot: number
  readonly container: Phaser.GameObjects.Container
  readonly statusAnchor = new Phaser.Math.Vector2()
  readonly targetAnchor = new Phaser.Math.Vector2()
  readonly effectAnchor = new Phaser.Math.Vector2()

  currentHealth: number
  currentPose: FighterPose = 'idle'
  currentAssetId: string
  readonly maximumHealth: number
  home = new Phaser.Math.Vector2()
  homeScale = 1

  private readonly scene: Phaser.Scene
  private readonly art: Phaser.GameObjects.Image
  private readonly shadow: Phaser.GameObjects.Image
  private readonly healthTrack: Phaser.GameObjects.Image
  private readonly healthFill: Phaser.GameObjects.Image
  private readonly damageLagFill: Phaser.GameObjects.Image
  private readonly healthText: Phaser.GameObjects.Text
  private readonly label: Phaser.GameObjects.Text
  private readonly statuses: Phaser.GameObjects.Text
  private readonly poseAssets: PoseAssets
  private readonly fullHealthScale: number
  private readonly fullDamageLagScale: number
  private idleTween?: Phaser.Tweens.Tween

  constructor(scene: Phaser.Scene, spec: FighterEntitySpec) {
    this.scene = scene
    this.id = spec.id
    this.team = spec.team
    this.formationSlot = spec.formationSlot
    this.poseAssets = spec.poseAssets
    this.maximumHealth = spec.maxHealth ?? 100
    this.currentHealth = this.maximumHealth
    this.currentAssetId = spec.poseAssets.idle.id

    this.container = scene.add.container(0, 0).setName(`fighter:${spec.id}`)
    this.shadow = scene.add.image(0, 0, spec.shadowAsset.key).setName('shadow').setOrigin(0.5).setDisplaySize(170, 48).setAlpha(0.65)
    this.art = scene.add.image(0, 0, spec.poseAssets.idle.key).setName('fighter-art').setOrigin(0.5, 1).setDisplaySize(210, 350)
    this.art.setFlipX(spec.mirrorArt ?? false)
    this.label = scene.add.text(-75, 8, spec.name.toUpperCase(), {
      color: '#f2e8d5', fontFamily: 'Barlow Condensed, Arial', fontSize: '16px', fontStyle: 'bold',
    }).setName('name').setStroke('#17191e', 5)
    this.healthTrack = scene.add.image(-77, 34, spec.healthAssets.track.key).setName('health-track').setOrigin(0, 0.5).setDisplaySize(154, 10)
    this.damageLagFill = scene.add.image(-75, 34, spec.healthAssets.damageLag.key).setName('damage-lag-fill').setOrigin(0, 0.5).setDisplaySize(150, 6)
    this.healthFill = scene.add.image(-75, 34, spec.healthAssets.fill.key).setName('health-fill').setOrigin(0, 0.5).setDisplaySize(150, 6)
    this.fullDamageLagScale = this.damageLagFill.scaleX
    this.fullHealthScale = this.healthFill.scaleX
    this.healthText = scene.add.text(77, 9, String(this.currentHealth), {
      color: '#f2e8d5', fontFamily: 'Inter, Arial', fontSize: '13px', fontStyle: 'bold',
    }).setName('health-text').setOrigin(1, 0).setStroke('#17191e', 4)
    this.statuses = scene.add.text(-75, 48, '', {
      color: '#35dde8', fontFamily: 'Inter, Arial', fontSize: '11px', fontStyle: 'bold',
    }).setName('statuses').setStroke('#17191e', 3)
    const presentationChildren: Record<typeof FIGHTER_PRESENTATION_CHILD_ROLES[number], Phaser.GameObjects.GameObject> = {
      shadow: this.shadow,
      'fighter-art': this.art,
      name: this.label,
      'health-track': this.healthTrack,
      'damage-lag-fill': this.damageLagFill,
      'health-fill': this.healthFill,
      'health-text': this.healthText,
      statuses: this.statuses,
    }
    this.container.add(FIGHTER_PRESENTATION_CHILD_ROLES.map((role) => presentationChildren[role]))
    this.statusAnchor.set(0, -238)
    this.targetAnchor.set(0, 2)
    this.effectAnchor.set(spec.facing === 'right' ? 80 : -80, -170)
    this.setReducedMotion(false)
  }

  setFormation(x: number, y: number, scale: number) {
    this.home.set(x, y)
    this.homeScale = scale
    this.container.setPosition(x, y).setScale(scale).setDepth(RENDER_DEPTHS.fighter + y / 1000)
    return this
  }

  setPose(pose: FighterPose) {
    const asset = resolvePoseAsset(this.id, pose, this.poseAssets, import.meta.env.DEV)
    this.currentPose = pose
    this.currentAssetId = asset.id
    this.art.setTexture(asset.key).setAlpha(pose === 'defeated' ? 0.5 : 1)
    return this
  }

  setQuiet(quiet: boolean) {
    this.container.setAlpha(quiet ? 0.28 : 1)
    return this
  }

  setSelected(selected: boolean) {
    this.container.setScale(this.homeScale * (selected ? 1.14 : 1))
    this.art.setTint(selected ? 0xfff0c0 : 0xffffff)
    return this
  }

  setTargeted(targeted: boolean) {
    this.art.setTint(targeted ? 0xbffcff : 0xffffff)
    return this
  }

  setHealth(health: number, duration = 0) {
    this.currentHealth = Phaser.Math.Clamp(health, 0, this.maximumHealth)
    const ratio = this.currentHealth / this.maximumHealth
    this.healthFill.setTint(this.currentHealth > 50 ? 0xffffff : this.currentHealth > 20 ? 0xd8bf68 : 0xe32620)
    this.healthText.setText(String(this.currentHealth))
    this.scene.tweens.killTweensOf([this.healthFill, this.damageLagFill])
    this.healthFill.setScale(this.fullHealthScale * ratio, this.healthFill.scaleY)
    const lagScale = this.fullDamageLagScale * ratio
    if (duration > 0) this.scene.tweens.add({ targets: this.damageLagFill, scaleX: lagScale, duration, delay: Math.min(180, duration * 0.35), ease: 'Cubic.easeOut' })
    else this.damageLagFill.setScale(lagScale, this.damageLagFill.scaleY)
    return this
  }

  setReducedMotion(reduced: boolean) {
    this.idleTween?.remove()
    this.art.y = 0
    if (!reduced) {
      this.idleTween = this.scene.tweens.add({
        targets: this.art, y: -6, duration: 1300 + this.formationSlot * 110, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      })
    }
    return this
  }

  resetVisuals(health = this.currentHealth) {
    this.scene.tweens.killTweensOf(this.container)
    this.container.setPosition(this.home.x, this.home.y).setScale(this.homeScale).setAlpha(1).setAngle(0).setDepth(RENDER_DEPTHS.fighter + this.home.y / 1000)
    this.art.clearTint().setAngle(0).setAlpha(1)
    this.setPose('idle').setHealth(health)
    return this
  }

  worldAnchor(anchor: 'status' | 'target' | 'effect') {
    const point = anchor === 'status' ? this.statusAnchor : anchor === 'target' ? this.targetAnchor : this.effectAnchor
    return this.container.getWorldTransformMatrix().transformPoint(point.x, point.y)
  }

  presentationChildRoles() {
    return this.container.list.map((child) => child.name)
  }
}
