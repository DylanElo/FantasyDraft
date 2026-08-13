import Phaser from 'phaser'
import type { CameraFrame } from './cameraContract'

export class CameraDirector {
  private frame: CameraFrame
  private transition?: Phaser.Tweens.Tween
  private shakeTween?: Phaser.Tweens.Tween
  private shake = { progress: 0, amplitude: 0 }

  constructor(private readonly scene: Phaser.Scene, private readonly camera: Phaser.Cameras.Scene2D.Camera) {
    this.frame = {
      mode: 'wide', x: scene.scale.width / 2, y: scene.scale.height / 2, zoom: 1, rotation: 0,
      viewport: { width: scene.scale.width, height: scene.scale.height },
      shake: { active: false, intensity: 0 }, flash: { active: false }, fade: { active: false }, transition: 'settled',
    }
  }

  transitionTo(target: CameraFrame, duration: number, animate: boolean) {
    this.stopTransition()
    this.stopShake()
    if (!animate || duration <= 0) return this.snap(target)
    const destination = structuredClone(target)
    this.frame.transition = 'transitioning'
    this.transition = this.scene.tweens.add({
      targets: this.frame,
      x: destination.x,
      y: destination.y,
      zoom: destination.zoom,
      rotation: destination.rotation,
      duration,
      ease: 'Sine.easeOut',
      onUpdate: () => this.render(),
      onComplete: () => {
        this.frame = destination
        this.transition = undefined
        this.render()
      },
    })
    return this
  }

  shakeFor(duration: number, amplitude: number) {
    this.stopShake()
    this.shake = { progress: 0, amplitude }
    this.frame.shake = { active: true, intensity: amplitude }
    this.shakeTween = this.scene.tweens.add({
      targets: this.shake,
      progress: 1,
      duration,
      ease: 'Linear',
      onUpdate: () => this.render(),
      onComplete: () => this.stopShake(),
    })
  }

  snap(target: CameraFrame) {
    this.cancel()
    this.frame = { ...structuredClone(target), transition: 'settled', shake: { active: false, intensity: 0 }, flash: { active: false }, fade: { active: false } }
    this.render()
    return this
  }

  cancel() {
    this.stopTransition()
    this.stopShake()
    this.camera.resetFX()
  }

  pause() { this.transition?.pause(); this.shakeTween?.pause() }
  resume() { this.transition?.resume(); this.shakeTween?.resume() }

  destroy() { this.cancel() }

  private stopTransition() {
    this.transition?.remove()
    this.transition = undefined
    this.frame.transition = 'settled'
  }

  private stopShake() {
    this.shakeTween?.remove()
    this.shakeTween = undefined
    this.shake = { progress: 0, amplitude: 0 }
    this.frame.shake = { active: false, intensity: 0 }
    this.render()
  }

  private render() {
    const decay = 1 - this.shake.progress
    const x = Math.sin(this.shake.progress * Math.PI * 8) * this.shake.amplitude * decay
    const y = Math.cos(this.shake.progress * Math.PI * 10) * this.shake.amplitude * 0.55 * decay
    this.camera.setZoom(this.frame.zoom).setRotation(this.frame.rotation).centerOn(this.frame.x + x, this.frame.y + y)
  }
}
