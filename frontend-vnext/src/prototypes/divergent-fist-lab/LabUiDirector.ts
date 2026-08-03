import Phaser from 'phaser'
import { ASSET_MANIFEST, RENDER_DEPTHS } from './assetManifest'
import type { LabBeat } from './labConfig'
import { MOUNTED_UI_ASSET_IDS } from './runtimeContracts'

export class LabUiDirector {
  private readonly energyPips: Phaser.GameObjects.Image
  private readonly selectedSkill: Phaser.GameObjects.Container
  private readonly confirm: Phaser.GameObjects.Container
  private readonly queue: Phaser.GameObjects.Container

  constructor(scene: Phaser.Scene) {
    const depth = RENDER_DEPTHS.ui
    this.energyPips = scene.add.image(0, 0, ASSET_MANIFEST.ui.energyPips.key).setOrigin(0, 0).setDisplaySize(116, 29).setDepth(depth)

    const selectedFrame = scene.add.image(0, 0, ASSET_MANIFEST.ui.selectedSkill.key).setDisplaySize(286, 72)
    const selectedIcon = scene.add.image(-110, 0, ASSET_MANIFEST.ui.skillIcon.key).setDisplaySize(48, 48)
    const selectedText = scene.add.text(-72, -11, 'DIVERGENT FIST', {
      color: '#f2e8d5', fontFamily: 'Barlow Condensed, Arial', fontSize: '22px', fontStyle: 'bold',
    })
    this.selectedSkill = scene.add.container(0, 0, [selectedFrame, selectedIcon, selectedText]).setDepth(depth).setVisible(false)

    const confirmFrame = scene.add.image(0, 0, ASSET_MANIFEST.ui.confirm.key).setDisplaySize(210, 62)
    const confirmText = scene.add.text(0, 0, 'TARGET CONFIRMED', {
      color: '#f2e8d5', fontFamily: 'Barlow Condensed, Arial', fontSize: '17px', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.confirm = scene.add.container(0, 0, [confirmFrame, confirmText]).setDepth(depth).setVisible(false)

    const actor = scene.add.image(-112, 0, ASSET_MANIFEST.ui.queueActor.key).setDisplaySize(104, 76)
    const skill = scene.add.image(0, 0, ASSET_MANIFEST.ui.queueSkill.key).setDisplaySize(104, 76)
    const target = scene.add.image(112, 0, ASSET_MANIFEST.ui.queueTarget.key).setDisplaySize(104, 76)
    const icon = scene.add.image(0, 0, ASSET_MANIFEST.ui.skillIcon.key).setDisplaySize(44, 44)
    const queueText = scene.add.text(0, 51, '01  YUJI → DIVERGENT FIST → MAKI', {
      color: '#f2e8d5', backgroundColor: '#17191edb', padding: { x: 10, y: 5 },
      fontFamily: 'Barlow Condensed, Arial', fontSize: '15px', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.queue = scene.add.container(0, 0, [actor, skill, target, icon, queueText]).setDepth(depth).setVisible(false)
  }

  present(beat: LabBeat, queueVisible: boolean) {
    this.selectedSkill.setVisible(beat === 'skill-selected' || beat === 'maki-targeted' || beat === 'target-confirmed')
    this.confirm.setVisible(beat === 'target-confirmed')
    this.queue.setVisible(queueVisible)
  }

  layout(width: number, height: number) {
    this.energyPips.setPosition(18, 18)
    this.selectedSkill.setPosition(width * 0.5, Math.max(54, height * 0.11))
    this.confirm.setPosition(width * 0.5, height - 74)
    this.queue.setPosition(width * 0.5, height - 92)
  }

  hideTransient() {
    this.selectedSkill.setVisible(false)
    this.confirm.setVisible(false)
    this.queue.setVisible(false)
  }

  activeAssetIds() {
    const ids = ['ui.energy-pips']
    if (this.selectedSkill.visible) ids.push('ui.selected-skill', 'ui.skill-icon')
    if (this.confirm.visible) ids.push('ui.confirm')
    if (this.queue.visible) ids.push('ui.queue-actor', 'ui.queue-skill', 'ui.queue-target', 'ui.skill-icon')
    return [...new Set(ids)]
  }
}
