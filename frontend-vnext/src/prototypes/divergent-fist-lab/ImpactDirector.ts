import Phaser from 'phaser'
import { ASSET_MANIFEST, RENDER_DEPTHS } from './assetManifest'
import { DIVERGENT_FIST_DAMAGE } from './labConfig'
import type { FighterEntity } from './FighterEntity'
import { MOUNTED_IMPACT_EFFECT_IDS } from './runtimeContracts'

export class ImpactDirector {
  private readonly physical: Phaser.GameObjects.Image
  private readonly speedLines: Phaser.GameObjects.Image
  private readonly hitFlash: Phaser.GameObjects.Image
  private readonly compression: Phaser.GameObjects.Image
  private readonly delayed: Phaser.GameObjects.Image
  private readonly residual: Phaser.GameObjects.Image
  private readonly physicalDamageStyle: Phaser.GameObjects.Image
  private readonly delayedDamageStyle: Phaser.GameObjects.Image
  private readonly damage: Phaser.GameObjects.Text

  constructor(private readonly scene: Phaser.Scene) {
    const depth = RENDER_DEPTHS.worldEffect
    this.speedLines = scene.add.image(0, 0, ASSET_MANIFEST.effects.physicalSpeedLines.key).setDepth(depth).setVisible(false)
    this.hitFlash = scene.add.image(0, 0, ASSET_MANIFEST.effects.physicalHitFlash.key).setDepth(depth + 0.1).setVisible(false)
    this.physical = scene.add.image(0, 0, ASSET_MANIFEST.effects.physicalImpact.key).setDepth(depth + 0.2).setVisible(false)
    this.compression = scene.add.image(0, 0, ASSET_MANIFEST.effects.cursedCompression.key).setDepth(depth + 0.1).setVisible(false)
    this.delayed = scene.add.image(0, 0, ASSET_MANIFEST.effects.delayedImpact.key).setDepth(depth + 0.2).setVisible(false)
    this.residual = scene.add.image(0, 0, ASSET_MANIFEST.effects.residualEnergy.key).setDisplaySize(220, 220).setDepth(depth).setAlpha(0.32).setVisible(false)
    this.physicalDamageStyle = scene.add.image(0, 0, ASSET_MANIFEST.effects.physicalDamage.key).setDepth(depth + 0.4).setVisible(false)
    this.delayedDamageStyle = scene.add.image(0, 0, ASSET_MANIFEST.effects.delayedDamage.key).setDepth(depth + 0.4).setVisible(false)
    this.damage = scene.add.text(0, 0, '', {
      color: '#f2e8d5', fontFamily: 'Barlow Condensed, Arial', fontSize: '58px', fontStyle: 'bold',
    }).setOrigin(0.5).setStroke('#17191e', 9).setDepth(depth + 0.5).setVisible(false)
  }

  showPhysical(target: FighterEntity, animate: boolean, duration: number, reducedMotion: boolean) {
    this.hide()
    const point = target.worldAnchor('effect')
    const scale = 300 / this.physical.width
    this.speedLines.setVisible(true).setPosition(point.x - 155, point.y + 12).setDisplaySize(360, 180).setAlpha(reducedMotion ? 0.35 : 0.72)
    this.hitFlash.setVisible(true).setPosition(point.x - 20, point.y).setDisplaySize(220, 220).setAlpha(reducedMotion ? 0.35 : 0.82)
    this.physical.setVisible(true).setPosition(point.x - 36, point.y).setScale(animate ? scale * 0.24 : scale).setAlpha(1)
    this.physicalDamageStyle.setVisible(true).setPosition(point.x + 138, point.y - 122).setDisplaySize(150, 75).setAlpha(0.52)
    this.damage.setVisible(true).setText(`−${DIVERGENT_FIST_DAMAGE.physical}`).setColor('#e32620').setPosition(point.x + 138, point.y - 122).setAlpha(1)
    if (animate) {
      this.scene.tweens.add({ targets: this.physical, scale, alpha: reducedMotion ? 0.8 : 0, duration: Math.max(90, duration * 2.2), ease: 'Cubic.easeOut' })
      if (!reducedMotion) this.scene.tweens.add({ targets: [this.damage, this.physicalDamageStyle], y: point.y - 180, alpha: 0, duration: 520 })
    }
  }

  showCompression(target: FighterEntity, animate: boolean, duration: number, reducedMotion: boolean) {
    this.hide()
    const point = target.worldAnchor('effect')
    const scale = 430 / this.compression.width
    const startScale = reducedMotion ? scale * 0.94 : scale * 1.35
    this.compression.setVisible(true).setPosition(point.x, point.y + 10).setScale(animate ? startScale : scale * 0.82).setAlpha(animate ? 0.3 : 0.95)
    if (animate) this.scene.tweens.add({ targets: this.compression, scale: scale * 0.82, alpha: 0.95, duration, ease: 'Cubic.easeIn' })
  }

  showDelayed(target: FighterEntity, animate: boolean, duration: number, reducedMotion: boolean) {
    this.hide()
    const point = target.worldAnchor('effect')
    const scale = 470 / this.delayed.width
    this.delayed.setVisible(true).setPosition(point.x, point.y).setScale(animate ? scale * (reducedMotion ? 1 : 0.72) : scale * 1.12).setAlpha(1)
    this.delayedDamageStyle.setVisible(true).setPosition(point.x + 150, point.y - 130).setDisplaySize(150, 75).setAlpha(0.52)
    this.damage.setVisible(true).setText(`−${DIVERGENT_FIST_DAMAGE.delayed}`).setColor('#35dde8').setPosition(point.x + 150, point.y - 130).setAlpha(1)
    if (animate) {
      this.scene.tweens.add({ targets: this.delayed, scale: scale * 1.18, alpha: reducedMotion ? 0.82 : 0.18, duration: Math.max(120, duration * 2), ease: 'Back.easeOut' })
      if (!reducedMotion) this.scene.tweens.add({ targets: [this.damage, this.delayedDamageStyle], y: point.y - 185, alpha: 0, duration: 560 })
    }
  }

  showResidual(target: FighterEntity) {
    this.hide()
    const point = target.worldAnchor('effect')
    this.residual.setVisible(true).setPosition(point.x, point.y + 25)
  }

  hide() {
    const objects = [this.physical, this.speedLines, this.hitFlash, this.compression, this.delayed, this.residual, this.physicalDamageStyle, this.delayedDamageStyle, this.damage]
    this.scene.tweens.killTweensOf(objects)
    objects.forEach((object) => object.setVisible(false).setAlpha(1))
  }

  activeAssetIds() {
    if (this.physical.visible) return ['effects.physical-impact', 'effects.physical-speed-lines', 'effects.physical-hit-flash', 'effects.physical-damage']
    if (this.compression.visible) return ['effects.cursed-compression']
    if (this.delayed.visible) return ['effects.delayed-impact', 'effects.delayed-damage']
    if (this.residual.visible) return ['effects.residual-energy']
    return []
  }

  drawDebug(graphics: Phaser.GameObjects.Graphics, target: FighterEntity) {
    const point = target.worldAnchor('effect')
    graphics.lineStyle(2, 0xe32620, 0.9).strokeCircle(point.x, point.y, 12)
  }
}
