import { COLORS, LOCAL_PORTRAIT_FILES, TOKEN_MOTION, TOKEN_TYPE } from '../core/runtime-config.js?v=22';
import { LayoutService } from '../core/layout-service.js?v=22';
import { firstCreationRoster, imageKeyFor, portraitFileFor } from '../core/roster.js?v=22';
import { BaseScene } from './base-scene.js?v=22';

export class BootScene extends BaseScene {
    constructor() {
      super('BootScene');
      this.loadProgress = 0;
      this.hasEnteredLobby = false;
    }

    preload() {
      this.load.on('progress', (value) => {
        this.loadProgress = value || 0;
      });
      this.load.image('combat-underpass-night', '/static/assets/environments/underpass-courtyard-night.png');
      Object.keys(firstCreationRoster()).forEach((id) => {
        const file = portraitFileFor(id);
        if (LOCAL_PORTRAIT_FILES.has(file)) {
          this.load.svg(imageKeyFor(id), `/static/assets/portraits/${file}`, { width: 192, height: 192 });
          this.load.svg(`${imageKeyFor(id)}-card`, `/static/assets/portraits/${file}`, { width: 168, height: 224 });
        }
      });
    }

    create() {
      this.store = window.JJKPhaserShell.store;
      this.layout = new LayoutService(this);
      this.graphics = this.add.graphics();
      this.nodes = [];
      this.buttons = [];
      if (this.store && this.store.setStatus) this.store.setStatus('Opening domain');
      this.renderBootSplash();
      this.input.once('pointerdown', () => this.enterLobby());
      this.time.delayedCall(920, () => this.enterLobby());
    }

    enterLobby() {
      if (this.hasEnteredLobby) return;
      this.hasEnteredLobby = true;
      this.cameras.main.fadeOut(220, 5, 7, 17);
      this.time.delayedCall(230, () => this.scene.start('LobbyScene'));
    }

    renderBootSplash() {
      const frame = this.layout.frame();
      this.worldBackdrop(frame, { textureKey: null, ambient: 'motes' });
      const cx = frame.x + frame.width / 2;
      const cy = frame.height * 0.43;
      const radiusBase = Math.min(frame.width, frame.height) * 0.28;

      this.graphics.fillStyle(COLORS.voidBlack, 0.5);
      this.graphics.fillRect(frame.x, 0, frame.width, frame.height);
      [1, 0.72, 0.44].forEach((scale, index) => {
        const radius = radiusBase * scale;
        this.graphics.lineStyle(index === 0 ? 1 : 2, index === 1 ? COLORS.selection : COLORS.domain, index === 1 ? 0.42 : 0.2);
        this.graphics.strokeCircle(cx, cy, radius);
      });
      for (let i = 0; i < 10; i += 1) {
        const angle = (Math.PI * 2 * i) / 10;
        const x1 = cx + Math.cos(angle) * (radiusBase * 0.35);
        const y1 = cy + Math.sin(angle) * (radiusBase * 0.35);
        const x2 = cx + Math.cos(angle) * (radiusBase * 1.04);
        const y2 = cy + Math.sin(angle) * (radiusBase * 1.04);
        this.graphics.lineStyle(1, i % 2 ? COLORS.talismanDim : COLORS.domain, i % 2 ? 0.14 : 0.18);
        this.graphics.beginPath();
        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
        this.graphics.strokePath();
      }

      const sigil = this.text(cx, cy - 58, 'JJK', {
        fontFamily: TOKEN_TYPE.display || 'Cinzel, Inter, serif',
        fontSize: '58px',
        fontStyle: '900',
        color: COLORS.text,
      }).setOrigin(0.5, 0);

      const sealW = 168;
      const sealH = 28;
      const seal = this.add.graphics({ x: cx - sealW / 2, y: cy + 16 });
      const sealPoints = this.cutRectPoints(0, 0, sealW, sealH, { cut: 8 });
      seal.fillStyle(COLORS.talismanPaper, 0.92);
      seal.fillPoints(sealPoints, true);
      seal.fillStyle(COLORS.sealRed, 0.76);
      seal.fillTriangle(sealW - 40, 0, sealW, 0, sealW, sealH);
      seal.lineStyle(1, COLORS.selection, 0.82);
      seal.strokePoints(sealPoints, true);
      this.nodes.push(seal);
      this.mono(cx, cy + 24, 'CURSED CLASH', { color: '#08080a', fontSize: '10px' }).setOrigin(0.5, 0);
      this.text(cx, cy + 72, 'Cursed Clash', {
        fontFamily: TOKEN_TYPE.display || 'Cinzel, Inter, serif',
        fontSize: '24px',
        fontStyle: '900',
      }).setOrigin(0.5, 0);
      this.mono(cx, cy + 108, 'DRAFT A TRIO / READ THE TECHNIQUE / BREAK THE DOMAIN', {
        color: COLORS.paperText,
        fontSize: '10px',
      }).setOrigin(0.5, 0);

      const meterW = Math.min(frame.width - 92, 280);
      const meterX = cx - meterW / 2;
      const meterY = frame.height - 128;
      this.progressRail(meterX, meterY, meterW, 8, Math.max(0.18, this.loadProgress || 1), COLORS.domain, {
        trackColor: COLORS.inkBlack,
        trackAlpha: 0.92,
        fillAlpha: 0.72,
      });
      this.mono(cx, meterY + 22, 'OPENING DOMAIN', { color: COLORS.text, fontSize: '10px' }).setOrigin(0.5, 0);
      this.mono(cx, meterY + 46, 'TAP TO ENTER', { color: COLORS.dim, fontSize: '10px' }).setOrigin(0.5, 0);

      this.tweens.add({
        targets: sigil,
        y: '-=8',
        alpha: 0.78,
        duration: TOKEN_MOTION.domainPulseMs || 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: seal,
        alpha: 0.68,
        duration: 760,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
