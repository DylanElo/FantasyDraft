import Phaser from 'phaser'
import { ASSET_MANIFEST, RENDER_DEPTHS } from './assetManifest'
import type { FighterEntity } from './FighterEntity'
import { MOUNTED_TARGETING_EFFECT_IDS } from './runtimeContracts'

const CYAN = 0x35dde8

export class TargetingDirector {
  private readonly arc: Phaser.GameObjects.Image
  private readonly arrow: Phaser.GameObjects.Image
  private readonly sigilOuter: Phaser.GameObjects.Image
  private readonly sigilInner: Phaser.GameObjects.Image
  private readonly energy: Phaser.GameObjects.Ellipse

  constructor(private readonly scene: Phaser.Scene) {
    this.arc = scene.add.image(0, 0, ASSET_MANIFEST.effects.intentArc.key).setDepth(RENDER_DEPTHS.worldEffect).setVisible(false)
    this.arrow = scene.add.image(0, 0, ASSET_MANIFEST.effects.arrowEndpoint.key).setDepth(RENDER_DEPTHS.worldEffect + 0.3).setVisible(false)
    this.sigilOuter = scene.add.image(0, 0, ASSET_MANIFEST.effects.targetSigilOuter.key).setDepth(RENDER_DEPTHS.worldEffect).setVisible(false)
    this.sigilInner = scene.add.image(0, 0, ASSET_MANIFEST.effects.targetSigilInner.key).setDepth(RENDER_DEPTHS.worldEffect + 0.1).setVisible(false)
    this.energy = scene.add.ellipse(0, 0, 154, 230, CYAN, 0.035).setStrokeStyle(2, CYAN, 0.42).setDepth(RENDER_DEPTHS.worldEffect - 0.1).setVisible(false)
  }

  show(actor: FighterEntity, target: FighterEntity) {
    const start = actor.worldAnchor('effect')
    const end = target.worldAnchor('effect')
    const distance = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y)
    const arcHeight = Math.max(150, this.scene.scale.height * 0.3)
    this.arc.setVisible(true).setPosition((start.x + end.x) / 2, Math.min(start.y, end.y) - arcHeight * 0.25).setDisplaySize(distance + 80, arcHeight)
    this.arrow.setVisible(true).setPosition(end.x - 8, end.y - 6).setDisplaySize(54, 54)
    const ground = target.worldAnchor('target')
    this.sigilOuter.setVisible(true).setPosition(ground.x, ground.y).setDisplaySize(250, 92)
    this.sigilInner.setVisible(true).setPosition(ground.x, ground.y).setDisplaySize(210, 76)
    this.energy.setVisible(true).setPosition(target.container.x, target.container.y - 122 * target.homeScale)
  }

  hide() {
    this.arc.setVisible(false)
    this.arrow.setVisible(false)
    this.sigilOuter.setVisible(false)
    this.sigilInner.setVisible(false)
    this.energy.setVisible(false)
  }

  activeAssetIds() {
    return this.arc.visible ? [...MOUNTED_TARGETING_EFFECT_IDS] : []
  }

  drawDebug(graphics: Phaser.GameObjects.Graphics, actor: FighterEntity, target: FighterEntity) {
    const start = actor.worldAnchor('effect')
    const end = target.worldAnchor('effect')
    graphics.lineStyle(2, CYAN, 0.85).lineBetween(start.x, start.y, end.x, end.y)
    graphics.strokeCircle(start.x, start.y, 7).strokeCircle(end.x, end.y, 7)
  }
}
