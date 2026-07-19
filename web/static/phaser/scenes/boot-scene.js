import {
  PORTRAIT_SOURCE_HEIGHT,
  PORTRAIT_SOURCE_WIDTH,
  starterPortraitContractIssues,
  starterPortraitEntries,
} from '../core/portrait-registry.js?v=36';
import { TOKEN_MOTION, TOKEN_TYPE } from '../core/runtime-config.js?v=36';
import { LayoutService } from '../core/layout-service.js?v=36';
import { firstCreationRoster } from '../core/roster.js?v=36';
import { getPersistentPresentationSettings } from '../core/presentation-settings.js?v=36';
import {
  INITIAL_ENVIRONMENT_KEYS,
  environmentAssetFor,
  registerEnvironmentTextureAttempt,
} from '../core/asset-registry.js?v=36';
import {
  S3_COLORS,
  bootS3Layout,
  drawS3Chip,
  drawS3Panel,
  drawS3Progress,
  drawS3World,
} from '../ui/season-three-ui.js?v=36';
import { BaseScene } from './base-scene.js?v=36';

export class BootScene extends BaseScene {
    constructor() {
      super('BootScene');
      this.loadProgress = 0;
      this.hasEnteredLobby = false;
    }

    preload() {
      const assets = window.JJKPhaserShell && window.JJKPhaserShell.store && window.JJKPhaserShell.store.assets;
      this.load.on('progress', (value) => {
        this.loadProgress = value || 0;
      });
      this.load.on('loaderror', (file) => {
        if (assets && assets.reportPortraitLoadError) assets.reportPortraitLoadError(file);
      });
      INITIAL_ENVIRONMENT_KEYS.forEach((key) => {
        const environment = environmentAssetFor(key);
        if (!environment) return;
        registerEnvironmentTextureAttempt(this, environment.key);
        this.load.image(environment.key, environment.url);
      });
      starterPortraitContractIssues(firstCreationRoster()).forEach((issue) => {
        if (assets && assets.reportPortraitContractIssue) assets.reportPortraitContractIssue(issue);
      });
      // The opening domain needs only the story trio/current saved team. The
      // BaseScene loader stages the remaining portraits and skill atlases when
      // First Creation or Combat actually becomes active.
      const shellStore = window.JJKPhaserShell && window.JJKPhaserShell.store;
      const startupPortraitIds = new Set([
        'yuji_itadori',
        'megumi_fushiguro',
        'nobara_kugisaki',
        ...((shellStore && shellStore.playerTeam) || []),
      ]);
      starterPortraitEntries().forEach((entry) => {
        if (!startupPortraitIds.has(entry.id)) return;
        this.load.image(entry.textureKey, entry.url);
      });
    }

    create() {
      this.store = window.JJKPhaserShell.store;
      this.layout = new LayoutService(this);
      this.graphics = this.add.graphics();
      this.nodes = [];
      this.buttons = [];
      this.presentationSettings = getPersistentPresentationSettings();
      this.validatePortraitDimensions();
      if (this.store && this.store.setStatus) this.store.setStatus('Opening domain');
      this.renderBootSplash();
      this.input.once('pointerdown', () => this.enterLobby());
      this.time.delayedCall(920, () => this.enterLobby());
    }

    validatePortraitDimensions() {
      starterPortraitEntries().forEach((entry) => {
        if (!this.textures.exists(entry.textureKey)) return;
        const texture = this.textures.get(entry.textureKey);
        const source = texture && texture.getSourceImage ? texture.getSourceImage() : null;
        const width = source && Number(source.width);
        const height = source && Number(source.height);
        if (width === PORTRAIT_SOURCE_WIDTH && height === PORTRAIT_SOURCE_HEIGHT) return;
        this.store.assets.reportPortraitContractIssue({
          code: 'dimension_mismatch',
          id: entry.id,
          message: `Portrait ${entry.id} must be ${PORTRAIT_SOURCE_WIDTH}x${PORTRAIT_SOURCE_HEIGHT}; received ${width || 0}x${height || 0}.`,
        });
      });
    }

    enterLobby() {
      if (this.hasEnteredLobby) return;
      this.hasEnteredLobby = true;
      if (window.JJKPhaserShell) window.JJKPhaserShell.bootReady = true;
      const startDestination = () => {
        // Resolve at transition time so a resume update received during the
        // exit fade becomes Boot's single destination instead of briefly
        // opening a stale Lobby scene.
        const destination = this.store && this.store.scene ? this.store.scene : 'LobbyScene';
        this.scene.start(destination);
      };
      if (this.presentationSettings && this.presentationSettings.effectiveReducedMotion()) {
        startDestination();
        return;
      }
      this.cameras.main.fadeOut(220, 5, 7, 17);
      this.time.delayedCall(230, startDestination);
    }

    renderBootSplash() {
      const frame = this.layout.frame();
      const layout = bootS3Layout(frame);
      drawS3World(this, frame, 'culling-current-home', { imageAlpha: 0.58, washAlpha: 0.32 });
      const cx = layout.sigil.x + layout.sigil.w / 2;
      const cy = layout.sigil.y + layout.sigil.h / 2;
      const radiusBase = layout.sigil.w * 0.48;
      drawS3Panel(this, layout.sigil.x, layout.sigil.y, layout.sigil.w, layout.sigil.h, {
        fill: S3_COLORS.bone,
        accent: S3_COLORS.red,
        cut: 16,
        washAlpha: 0.26,
        strokeWidth: 2.5,
      });
      [1, 0.72, 0.44].forEach((scale, index) => {
        const radius = radiusBase * scale;
        this.graphics.lineStyle(index === 0 ? 1 : 2, index === 1 ? S3_COLORS.cyan : S3_COLORS.red, index === 1 ? 0.64 : 0.28);
        this.graphics.strokeCircle(cx, cy, radius);
      });
      for (let i = 0; i < 10; i += 1) {
        const angle = (Math.PI * 2 * i) / 10;
        const x1 = cx + Math.cos(angle) * (radiusBase * 0.35);
        const y1 = cy + Math.sin(angle) * (radiusBase * 0.35);
        const x2 = cx + Math.cos(angle) * (radiusBase * 1.04);
        const y2 = cy + Math.sin(angle) * (radiusBase * 1.04);
        this.graphics.lineStyle(1, i % 2 ? S3_COLORS.ink : S3_COLORS.red, i % 2 ? 0.16 : 0.32);
        this.graphics.beginPath();
        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
        this.graphics.strokePath();
      }

      const sigil = this.text(cx, cy - 38, 'JJK', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
        fontSize: '48px',
        fontStyle: '900',
        color: S3_COLORS.inkText,
      }).setOrigin(0.5, 0);
      drawS3Chip(this, cx - 72, cy + 23, 'JJK ARENA', {
        w: 144,
        h: 24,
        fill: S3_COLORS.ink,
        stroke: S3_COLORS.cyan,
        fontSize: '12px',
      });
      this.text(cx, layout.title.y, 'JJK Arena', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
        fontSize: '28px',
        fontStyle: '900',
        color: S3_COLORS.inkText,
      }).setOrigin(0.5, 0);
      this.mono(cx, layout.title.y + 33, 'ASSEMBLE A TRIO / BREAK THE BARRIER', {
        color: S3_COLORS.redText,
        fontSize: '11px',
        fontStyle: '900',
      }).setOrigin(0.5, 0);
      drawS3Progress(this, layout.meter.x, layout.meter.y, layout.meter.w, layout.meter.h, Math.max(0.18, this.loadProgress || 1), { fill: S3_COLORS.cyan });
      drawS3Panel(this, layout.enter.x, layout.enter.y, layout.enter.w, layout.enter.h, {
        fill: S3_COLORS.paper,
        accent: S3_COLORS.red,
        cut: 8,
        washAlpha: 0.18,
      });
      this.mono(cx, layout.enter.y + 8, 'OPENING DOMAIN', { color: S3_COLORS.redText, fontSize: '11px', fontStyle: '900' }).setOrigin(0.5, 0);
      this.mono(cx, layout.enter.y + 25, 'TAP ANYWHERE TO ENTER', { color: S3_COLORS.inkText, fontSize: '11px', fontStyle: '900' }).setOrigin(0.5, 0);

      if (!this.presentationSettings || !this.presentationSettings.effectiveReducedMotion()) {
        this.tweens.add({
          targets: sigil,
          y: '-=8',
          alpha: 0.78,
          duration: TOKEN_MOTION.domainPulseMs || 3000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }
