import { focalCoverCrop, portraitEntryFor, starterPortraitEntries } from '../core/portrait-registry.js?v=37';
import { COLORS, CULLING_COLORS, ENERGY_COLORS, ENERGY_LABELS, TOKEN_RADIUS, TOKEN_TOUCH, TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=37';
import { initials, safeText } from '../core/text.js?v=37';
import { LayoutService } from '../core/layout-service.js?v=37';
import { costColors } from '../core/roster.js?v=37';
import { SKILL_ACTION_ATLASES, createPresentationLayer } from '../core/presentation-layer.js?v=37';

const COMBAT_SKILL_ASSETS = Object.freeze([
  Object.freeze({ key: 's3-skill-body', url: '/static/assets/skills/culling-current/body.webp' }),
  Object.freeze({ key: 's3-skill-technique', url: '/static/assets/skills/culling-current/technique.webp' }),
  Object.freeze({ key: 's3-skill-focus', url: '/static/assets/skills/culling-current/focus.webp' }),
  Object.freeze({ key: 's3-skill-curse', url: '/static/assets/skills/culling-current/curse.webp' }),
]);

// TextureManager is game-wide while each Phaser scene owns a Loader. Without
// a game-wide flight registry, a fast scene transition can queue the same
// portrait in two loaders before either one registers the finished texture.
const PRESENTATION_ASSET_FLIGHTS = new Map();
let ACTIVE_POINTER_DISPATCH = null;

function characterId(value) {
  if (typeof value === 'string') return value;
  return value && (value.id || value.character_id) || null;
}

function cropFrameName(prefix, crop) {
  const token = [crop.x, crop.y, crop.width, crop.height]
    .map((value) => Math.round(Number(value) * 1000).toString(36))
    .join('_');
  return `__jjk_${prefix}_${token}`;
}

function applyBoundedCropFrame(image, texture, crop) {
  if (!image || !texture || typeof texture.add !== 'function' || typeof image.setFrame !== 'function') return false;
  const frameName = cropFrameName('cover', crop);
  const hasFrame = typeof texture.has === 'function' && texture.has(frameName);
  const frame = hasFrame
    ? (typeof texture.get === 'function' ? texture.get(frameName) : true)
    : texture.add(frameName, 0, crop.x, crop.y, crop.width, crop.height);
  if (!frame) return false;
  image.setFrame(frameName);
  image.setOrigin(0.5, 0.5);
  image.setScale(crop.scale);
  return true;
}

export class BaseScene extends Phaser.Scene {
    constructor(key) {
      super(key);
      this.keyName = key;
      this.buttons = [];
      this.nodes = [];
      this.layout = null;
      this.store = null;
      this.domUI = null;
      this.graphics = null;
      this.unsubscribe = null;
      this.lastTap = null;
      this.presentationLayer = null;
      this.presentationIntroPlayed = false;
      this.presentationSettingsOpen = false;
      this.pendingAssetKeys = new Set();
      this.attemptedAssetKeys = new Set();
      this.presentationAssetLoadError = null;
    }

    create() {
      this.store = window.JJKPhaserShell.store;
      this.domUI = window.JJKPhaserShell.domUI || null;
      this.layout = new LayoutService(this);
      this.graphics = this.add.graphics();
      this.presentationLayer = createPresentationLayer(this);
      this.presentationAssetLoadError = (file) => {
        if (this.store && this.store.assets && this.store.assets.reportPortraitLoadError) {
          this.store.assets.reportPortraitLoadError(file);
        }
      };
      if (this.load && this.load.on) this.load.on('loaderror', this.presentationAssetLoadError);
      this.input.on('pointerdown', (pointer) => this.handlePointer(pointer));
      this.scale.on('resize', () => this.render());
      this.unsubscribe = this.store.onChange(() => {
        if (this.scene.isActive(this.keyName)) this.render();
      });
      this.ensureSceneAssets();
      this.render();
    }

    shutdown() {
      if (this.unsubscribe) this.unsubscribe();
      if (this.load && this.load.off && this.presentationAssetLoadError) {
        this.load.off('loaderror', this.presentationAssetLoadError);
      }
      this.presentationAssetLoadError = null;
      if (this.domUI) this.domUI.clearScene(this.keyName);
      this.domUI = null;
    }

    handlePointer(pointer) {
      if (ACTIVE_POINTER_DISPATCH && ACTIVE_POINTER_DISPATCH.pointer === pointer
        && ACTIVE_POINTER_DISPATCH.scene !== this.keyName) return;
      for (let i = this.buttons.length - 1; i >= 0; i -= 1) {
        const button = this.buttons[i];
        if (pointer.x >= button.x && pointer.x <= button.x + button.w && pointer.y >= button.y && pointer.y <= button.y + button.h) {
          // Scene changes happen inside button callbacks while Phaser is still
          // dispatching this same pointer object. Keep a microtask-scoped token
          // so a newly created destination scene cannot consume it again.
          const dispatchToken = { pointer, scene: this.keyName };
          ACTIVE_POINTER_DISPATCH = dispatchToken;
          Promise.resolve().then(() => {
            if (ACTIVE_POINTER_DISPATCH === dispatchToken) ACTIVE_POINTER_DISPATCH = null;
          });
          this.activateHitTarget(button, pointer);
          return;
        }
      }
    }

    activateHitTarget(button, pointer = null) {
      if (!button || !this.scene) return;
      // Pointer dispatch originates from Phaser's active scene and must be
      // allowed to complete even when the callback immediately transitions
      // away. A stale DOM mirror, however, must never activate an inactive
      // scene after that transition.
      if (!pointer && !this.scene.isActive(this.keyName)) return;
      const tapX = pointer && Number.isFinite(pointer.x) ? pointer.x : button.x + button.w / 2;
      const tapY = pointer && Number.isFinite(pointer.y) ? pointer.y : button.y + button.h / 2;
      this.lastTap = { x: tapX, y: tapY, t: this.time.now, disabled: !!button.disabled };
      window.dispatchEvent(new CustomEvent('jjk:ui-tap', {
        detail: { scene: this.keyName, disabled: !!button.disabled, input: pointer ? 'pointer' : 'keyboard' },
      }));
      const cue = button.disabled ? 'disabled' : (button.cue || 'press');
      const playCue = () => {
        if (this.presentationLayer && !this.presentationLayer.isDestroyed()) {
          this.presentationLayer.interactionCue(this, { cue });
        }
      };
      const audio = this.presentationLayer && this.presentationLayer.audio;
      if (audio && audio.isUnlocked && !audio.isUnlocked() && audio.unlockFromGesture) {
        Promise.resolve(audio.unlockFromGesture()).then(playCue).catch(() => {});
      } else {
        playCue();
      }
      if (!button.disabled) button.onClick();
      if (this.scene.isActive(this.keyName)) this.render();
      this.time.delayedCall(180, () => {
        if (this.scene.isActive(this.keyName)) this.render();
      });
    }

    clearSurface() {
      this.graphics.clear();
      this.nodes.forEach((node) => node.destroy());
      this.nodes = [];
      this.buttons = [];
      this.syncButtonDebug();
      this.ensureSceneAssets();
    }

    portraitIdsForScene() {
      if (this.keyName === 'FirstCreationScene' || this.keyName === 'DraftScene') {
        return starterPortraitEntries().map((entry) => entry.id);
      }
      const ids = new Set();
      const addTeam = (team) => {
        (Array.isArray(team) ? team : []).forEach((member) => {
          const id = characterId(member);
          if (id) ids.add(id);
        });
      };
      if (this.store) {
        addTeam(this.store.playerTeam);
        addTeam(this.store.enemyTeam);
        const players = this.store.state && this.store.state.players;
        Object.values(players || {}).forEach((player) => addTeam(player && player.team));
      }
      return [...ids];
    }

    usesSkillPresentationAssets() {
      return this.keyName === 'CombatScene' || this.keyName === 'FirstCreationScene';
    }

    ensureSceneAssets() {
      if (!this.load || !this.load.image || !this.textures || !this.textures.exists) return false;
      const requested = [];
      const requestImage = (key, url) => {
        if (!this.attemptedAssetKeys) this.attemptedAssetKeys = new Set();
        if (!key || !url || this.textures.exists(key) || this.pendingAssetKeys.has(key) || this.attemptedAssetKeys.has(key)) return;
        const activeFlight = PRESENTATION_ASSET_FLIGHTS.get(key);
        if (activeFlight) {
          activeFlight.waiters.add(this);
          this.attemptedAssetKeys.add(key);
          return;
        }
        this.attemptedAssetKeys.add(key);
        this.pendingAssetKeys.add(key);
        PRESENTATION_ASSET_FLIGHTS.set(key, { owner: this, waiters: new Set([this]) });
        requested.push(key);
        this.load.image(key, url);
      };

      this.portraitIdsForScene().forEach((id) => {
        const entry = portraitEntryFor(id);
        if (entry) requestImage(entry.textureKey, entry.url);
      });
      if (this.usesSkillPresentationAssets()) {
        Object.values(SKILL_ACTION_ATLASES).forEach((atlas) => requestImage(atlas.key, atlas.path));
        COMBAT_SKILL_ASSETS.forEach((asset) => requestImage(asset.key, asset.url));
      }
      if (!requested.length) return false;

      const complete = () => {
        const waitingScenes = new Set();
        requested.forEach((key) => {
          this.pendingAssetKeys.delete(key);
          const flight = PRESENTATION_ASSET_FLIGHTS.get(key);
          if (!flight || flight.owner !== this) return;
          flight.waiters.forEach((waitingScene) => waitingScenes.add(waitingScene));
          PRESENTATION_ASSET_FLIGHTS.delete(key);
        });
        waitingScenes.forEach((waitingScene) => {
          if (waitingScene.scene && waitingScene.scene.isActive && waitingScene.scene.isActive(waitingScene.keyName)) {
            waitingScene.render();
          }
        });
      };
      if (this.load.once) this.load.once('complete', complete);
      const loading = this.load.isLoading && this.load.isLoading();
      if (!loading && this.load.start) this.load.start();
      return true;
    }

    togglePresentationSettings(force) {
      this.presentationSettingsOpen = force === undefined ? !this.presentationSettingsOpen : Boolean(force);
      return this.presentationSettingsOpen;
    }

    renderPresentationSettingsSheet(frame, options = {}) {
      if (!this.presentationSettingsOpen || !this.presentationLayer || !this.presentationLayer.settings) return false;
      const settings = this.presentationLayer.settings;
      const value = settings.snapshot();
      const fullW = frame.fullWidth === undefined ? frame.width : frame.fullWidth;
      const fullH = frame.fullHeight === undefined ? frame.height : frame.fullHeight;
      const hasExit = typeof options.onExit === 'function';
      const sheetW = Math.min(360, frame.width - 28);
      const sheetH = hasExit ? 356 : 344;
      const sheetX = frame.x + (frame.width - sheetW) / 2;
      const sheetY = Math.max(frame.top + 62, Math.min(frame.bottom - sheetH - 10, frame.top + (frame.height - sheetH) / 2));
      const panel = this.add.graphics().setDepth(190);
      this.nodes.push(panel);

      // This blocker is registered before the controls so reverse hit testing
      // always gives the visible settings buttons priority.
      this.registerHitTarget(0, 0, fullW, fullH, 'Close presentation settings', () => {
        this.togglePresentationSettings(false);
      }, { blocker: true, mirror: false });
      panel.fillStyle(CULLING_COLORS.charcoal, 0.58);
      panel.fillRect(0, 0, fullW, fullH);
      const points = [
        { x: sheetX + 14, y: sheetY },
        { x: sheetX + sheetW, y: sheetY },
        { x: sheetX + sheetW, y: sheetY + sheetH - 14 },
        { x: sheetX + sheetW - 14, y: sheetY + sheetH },
        { x: sheetX, y: sheetY + sheetH },
        { x: sheetX, y: sheetY + 14 },
      ];
      panel.fillStyle(CULLING_COLORS.ivory, 0.99);
      panel.fillPoints(points, true);
      panel.fillStyle(CULLING_COLORS.cobalt, 0.96);
      panel.fillTriangle(sheetX, sheetY + 14, sheetX + 176, sheetY, sheetX, sheetY + 72);
      panel.lineStyle(2, CULLING_COLORS.cyan, 0.9);
      panel.strokePoints(points, true);
      panel.lineStyle(1, CULLING_COLORS.charcoal, 0.18);
      [sheetY + 63, sheetY + 119, sheetY + 175, sheetY + 231].forEach((lineY) => {
        panel.beginPath();
        panel.moveTo(sheetX + 14, lineY);
        panel.lineTo(sheetX + sheetW - 14, lineY);
        panel.strokePath();
      });

      this.text(sheetX + 16, sheetY + 10, 'PRESENTATION', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: '21px',
        fontStyle: '900',
        color: CULLING_COLORS.inverseText,
      }).setDepth(191);
      this.mono(sheetX + 17, sheetY + 38, 'AUDIO / HAPTICS / MOTION', {
        color: '#CDE6FF',
        fontSize: '10px',
        fontStyle: '800',
      }).setDepth(191);

      const drawControl = (x, y, w, label, onClick, selected = false, danger = false) => {
        const h = 44;
        const fill = danger ? CULLING_COLORS.vermilion : selected ? CULLING_COLORS.cobalt : CULLING_COLORS.ivory;
        const stroke = danger ? CULLING_COLORS.charcoal : selected ? CULLING_COLORS.cyan : CULLING_COLORS.cobalt;
        panel.fillStyle(fill, selected || danger ? 0.97 : 0.9);
        panel.fillPoints([
          { x: x + 7, y }, { x: x + w, y }, { x: x + w, y: y + h - 7 },
          { x: x + w - 7, y: y + h }, { x, y: y + h }, { x, y: y + 7 },
        ], true);
        panel.lineStyle(1.5, stroke, 0.9);
        panel.strokePoints([
          { x: x + 7, y }, { x: x + w, y }, { x: x + w, y: y + h - 7 },
          { x: x + w - 7, y: y + h }, { x, y: y + h }, { x, y: y + 7 },
        ], true);
        this.mono(x + w / 2, y + 14, label, {
          color: selected || danger ? CULLING_COLORS.inverseText : CULLING_COLORS.cobaltText,
          fontSize: '11px',
          fontStyle: '900',
        }).setOrigin(0.5, 0).setDepth(191);
        this.registerHitTarget(x, y, w, h, label, onClick, { cue: selected ? 'select' : 'press' });
      };
      const labelX = sheetX + 18;
      const controlRight = sheetX + sheetW - 16;
      const rowLabel = (y, title, detail) => {
        this.mono(labelX, y + 8, title, { color: CULLING_COLORS.cobaltText, fontSize: '11px', fontStyle: '900' }).setDepth(191);
        if (detail) this.mono(labelX, y + 25, detail, { color: CULLING_COLORS.mutedText, fontSize: '9px', fontStyle: '700' }).setDepth(191);
      };

      const soundY = sheetY + 68;
      rowLabel(soundY, 'SOUND', value.muted ? 'ALL CUES MUTED' : 'INTERACTION CUES ON');
      drawControl(controlRight - 94, soundY, 94, value.muted ? 'MUTED' : 'ON', () => settings.toggleMuted(), !value.muted);

      const volumeY = sheetY + 124;
      rowLabel(volumeY, 'VOLUME', 'PERSISTS ON THIS DEVICE');
      drawControl(controlRight - 148, volumeY, 44, '-', () => settings.stepVolume(-1));
      this.mono(controlRight - 76, volumeY + 15, `${Math.round(value.volume * 100)}%`, {
        color: CULLING_COLORS.cobaltText,
        fontSize: '12px',
        fontStyle: '900',
      }).setOrigin(0.5, 0).setDepth(191);
      drawControl(controlRight - 44, volumeY, 44, '+', () => settings.stepVolume(1));

      const hapticsY = sheetY + 180;
      rowLabel(hapticsY, 'HAPTICS', 'SAFE DEVICE VIBRATION');
      drawControl(controlRight - 94, hapticsY, 94, value.haptics ? 'ON' : 'OFF', () => settings.toggleHaptics(), value.haptics);

      const motionY = sheetY + 236;
      rowLabel(motionY, 'MOTION', 'SYSTEM / REDUCED / FULL');
      drawControl(controlRight - 126, motionY, 126, value.motion.toUpperCase(), () => settings.cycleMotion(), value.motion === 'reduced');

      const footerY = sheetY + sheetH - 54;
      if (hasExit) {
        const gap = 8;
        const footerW = (sheetW - 40 - gap) / 2;
        drawControl(sheetX + 16, footerY, footerW, options.exitLabel || 'EXIT', () => {
          this.togglePresentationSettings(false);
          options.onExit();
        }, false, true);
        drawControl(sheetX + 16 + footerW + gap, footerY, footerW, 'CLOSE', () => this.togglePresentationSettings(false), true);
      } else {
        drawControl(sheetX + sheetW - 126, footerY, 110, 'CLOSE', () => this.togglePresentationSettings(false), true);
      }
      return true;
    }

    presentSurface(region, options = {}) {
      if (!this.presentationLayer || this.presentationLayer.isDestroyed()) return;
      if (options.ambient !== false) {
        this.presentationLayer.ambientWorld(this, {
          region,
          options: {
            count: options.moteCount || 7,
            parallax: options.parallax == null ? 3 : options.parallax,
            depth: options.ambientDepth == null ? -10 : options.ambientDepth,
            colors: options.colors,
          },
        });
      }
      if (this.presentationIntroPlayed) return;
      this.presentationIntroPlayed = true;
      const targets = (options.targets || this.nodes.filter((node) => node && (node.type === 'Text' || node.type === 'Container')))
        .filter((node) => node && node.active !== false && node.setAlpha)
        .slice(0, options.maxIntroTargets || 20);
      this.presentationLayer.sceneIntro(this, {
        targets,
        options: {
          distance: options.introDistance || 14,
          stagger: options.introStagger || 28,
          duration: options.introDuration || 320,
        },
      });
    }

    syncButtonDebug() {
      window.__phaserShellButtons = this.buttons.map((button) => ({
        scene: this.keyName,
        label: button.label || 'hotspot',
        x: Math.round(button.x),
        y: Math.round(button.y),
        w: Math.round(button.w),
        h: Math.round(button.h),
        disabled: !!button.disabled,
      }));
      if (!this.domUI) return;
      const width = Number((this.scale && this.scale.width) || (this.game && this.game.config && this.game.config.width) || 0);
      const height = Number((this.scale && this.scale.height) || (this.game && this.game.config && this.game.config.height) || 0);
      const phase = this.store && this.store.state && this.store.state.phase;
      this.domUI.queueSceneActions({
        sceneKey: this.keyName,
        heading: this.accessibilityHeading || '',
        queueReviewOpen: this.keyName === 'CombatScene' && Boolean(this.store && this.store.queueReviewOpen),
        resolving: this.keyName === 'CombatScene' && phase === 'resolving',
        bounds: { width, height },
        toast: this.store && this.store.toast,
        actions: this.buttons.map((button) => ({
          key: button.accessibilityKey,
          label: button.label || 'Action',
          x: button.x,
          y: button.y,
          w: button.w,
          h: button.h,
          disabled: !!button.disabled,
          disabledReason: button.disabledReason,
          blocker: !!button.blocker,
          mirror: button.mirror,
          activate: () => this.activateHitTarget(button),
        })),
      });
    }

    registerHitTarget(x, y, w, h, label, onClick, options) {
      const opts = options || {};
      const minTarget = TOKEN_TOUCH.minTarget || 44;
      const hitW = Math.max(w, minTarget);
      const hitH = Math.max(h, minTarget);
      this.buttons.push({
        x: x - (hitW - w) / 2,
        y: y - (hitH - h) / 2,
        w: hitW,
        h: hitH,
        label,
        onClick,
        disabled: !!opts.disabled,
        disabledReason: opts.disabled
          ? (opts.disabledReason || opts.reason || 'Unavailable in the current state.')
          : '',
        cue: opts.cue || null,
        accessibilityKey: opts.accessibilityId || opts.a11yId || label || 'action',
        blocker: !!opts.blocker,
        mirror: opts.mirror !== false,
      });
      this.syncButtonDebug();
    }

    coverImage(textureKey, x, y, w, h, options) {
      if (!textureKey || !this.textures.exists(textureKey)) return null;
      const opts = options || {};
      const image = this.add.image(x + w / 2, y + h / 2, textureKey);
      const sourceWidth = image.frame.realWidth || image.frame.width;
      const sourceHeight = image.frame.realHeight || image.frame.height;
      const crop = focalCoverCrop(sourceWidth, sourceHeight, w, h, opts.focal);
      const texture = image.texture || (this.textures.get && this.textures.get(textureKey));
      if (!applyBoundedCropFrame(image, texture, crop)) {
        // Compatibility path for stripped Phaser test doubles. Shipping
        // Phaser registers a true subframe above so the crop has local 0.5
        // origin and cannot be positioned by the full source-sheet bounds.
        image.setOrigin(
          (crop.x + crop.width / 2) / sourceWidth,
          (crop.y + crop.height / 2) / sourceHeight,
        );
        image.setCrop(crop.x, crop.y, crop.width, crop.height);
        image.setScale(crop.scale);
      }
      image.setDepth(opts.depth === undefined ? -30 : opts.depth);
      image.setAlpha(opts.alpha === undefined ? 1 : opts.alpha);
      image.setData('coverCrop', crop);
      this.nodes.push(image);
      return image;
    }

    portraitContextFor(w, h) {
      if (h > w * 1.15) return 'hero';
      if (w > h * 1.15) return 'combat';
      return 'square';
    }

    drawPortraitFallback(characterOrId, x, y, w, h, options) {
      const opts = options || {};
      const id = typeof characterOrId === 'string'
        ? characterOrId
        : (characterOrId && (characterOrId.id || characterOrId.character_id));
      const name = typeof characterOrId === 'string'
        ? safeText(this.store.character(characterOrId).name, characterOrId)
        : safeText(characterOrId && characterOrId.name, id);
      const tone = opts.tone || this.store.assets.toneFor(id || name);
      const alpha = opts.dead ? 0.42 : (opts.alpha === undefined ? 0.98 : opts.alpha);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const circle = opts.shape === 'circle';

      this.graphics.fillStyle(CULLING_COLORS.ivory, alpha);
      if (circle) this.graphics.fillCircle(cx, cy, Math.min(w, h) / 2);
      else this.graphics.fillRect(x, y, w, h);
      this.graphics.fillStyle(CULLING_COLORS.sky, opts.dead ? 0.12 : 0.46);
      if (circle) this.graphics.fillCircle(cx, cy - h * 0.08, Math.min(w, h) * 0.34);
      else this.graphics.fillTriangle(x, y, x + w, y, x, y + h);
      this.graphics.fillStyle(tone, opts.dead ? 0.08 : 0.2);
      this.graphics.fillCircle(cx, cy, Math.max(8, Math.min(w, h) * 0.28));
      if (!circle) {
        this.graphics.lineStyle(1, tone, opts.dead ? 0.18 : 0.52);
        this.graphics.beginPath();
        this.graphics.moveTo(x + 6, y + h - 7);
        this.graphics.lineTo(x + w - 6, y + 7);
        this.graphics.strokePath();
      }
      this.text(cx, cy - Math.max(7, Math.min(w, h) * 0.14), initials(name), {
        fontFamily: TOKEN_TYPE.display || TOKEN_TYPE.ui || 'Inter, Arial, sans-serif',
        fontSize: `${Math.max(14, Math.round(Math.min(w, h) * 0.3))}px`,
        fontStyle: '900',
        color: opts.dead ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
      }).setOrigin(0.5, 0);
      return null;
    }

    portraitArtwork(characterOrId, x, y, w, h, options) {
      const opts = options || {};
      const id = typeof characterOrId === 'string'
        ? characterOrId
        : (characterOrId && (characterOrId.id || characterOrId.character_id));
      const context = opts.context || this.portraitContextFor(w, h);
      const key = opts.textureKey || this.store.portraitKey(id);
      if (!this.textures.exists(key)) {
        return this.drawPortraitFallback(characterOrId, x, y, w, h, { ...opts, context });
      }
      const focal = opts.focal || this.store.portraitFocal(id, context);
      return this.coverImage(key, x, y, w, h, {
        focal,
        depth: opts.depth === undefined ? 0 : opts.depth,
        alpha: opts.dead ? 0.35 : (opts.alpha === undefined ? 0.96 : opts.alpha),
      });
    }

    text(x, y, value, style) {
      const node = this.add.text(x, y, safeText(value), {
        fontFamily: TOKEN_TYPE.ui || 'Inter, Arial, sans-serif',
        fontSize: `${TYPE_SCALE.body}px`,
        color: COLORS.text,
        ...style,
      });
      this.nodes.push(node);
      return node;
    }

    mono(x, y, value, style) {
      return this.text(x, y, value, {
        fontFamily: TOKEN_TYPE.mono || '"JetBrains Mono", monospace',
        fontSize: `${TYPE_SCALE.label}px`,
        color: COLORS.muted,
        ...style,
      });
    }

    drawAppBg(frame) {
      const g = this.graphics;
      g.fillGradientStyle(COLORS.voidBlack, COLORS.inkBlack, 0x120b0d, COLORS.voidBlack, 1);
      g.fillRect(0, 0, frame.fullWidth, frame.fullHeight);
      g.fillStyle(COLORS.bg, 0.86);
      g.fillRoundedRect(frame.x, frame.y, frame.width, frame.height, frame.desktop ? 22 : 0);
      g.lineStyle(1, COLORS.talismanDim, frame.desktop ? 0.28 : 0);
      g.strokeRoundedRect(frame.x + 0.5, frame.y + 0.5, frame.width - 1, frame.height - 1, frame.desktop ? 22 : 0);

      const cx = frame.x + frame.width / 2;
      const cy = frame.y + frame.height * 0.47;
      [320, 236, 154].forEach((radius, index) => {
        g.lineStyle(index === 1 ? 1.5 : 1, index === 1 ? COLORS.domain : COLORS.talismanDim, index === 1 ? 0.045 : 0.03);
        g.strokeCircle(cx, cy, radius);
      });
      for (let i = 0; i < 7; i += 1) {
        const y = frame.y + 84 + i * 104;
        g.lineStyle(1, COLORS.surfaceLine, 0.045);
        g.strokeCircle(frame.x + (i % 2 ? frame.width - 34 : 34), y, 72);
      }
      for (let i = 0; i < 15; i += 1) {
        const y = frame.y + 42 + i * 48;
        g.lineStyle(1, i % 3 === 0 ? COLORS.talismanDim : 0xffffff, i % 3 === 0 ? 0.055 : 0.025);
        g.beginPath();
        g.moveTo(frame.x, y);
        g.lineTo(frame.x + frame.width, y + (i % 2 ? -18 : 18));
        g.strokePath();
      }
      for (let i = 0; i < 9; i += 1) {
        const x = frame.x + 18 + i * 49;
        g.lineStyle(1, COLORS.talismanDim, 0.045);
        g.beginPath();
        g.moveTo(x, frame.y + 2);
        g.lineTo(x - 34, frame.y + frame.height - 2);
        g.strokePath();
      }
    }

    topBar(frame, title, backHandler) {
      const y = frame.top + 2;
      this.graphics.fillStyle(COLORS.inkBlack, 0.68);
      this.graphics.fillRoundedRect(frame.x + 10, frame.top - 4, frame.width - 20, 52, 16);
      this.graphics.fillStyle(COLORS.talismanDim, 0.06);
      this.graphics.fillRoundedRect(frame.x + 14, frame.top, frame.width - 28, 16, 10);
      this.graphics.lineStyle(1, COLORS.talismanDim, 0.24);
      this.graphics.strokeRoundedRect(frame.x + 10, frame.top - 4, frame.width - 20, 52, 16);
      this.mono(frame.x + frame.gutter, y, 'CURSED CLASH', {
        color: COLORS.paperText,
        fontSize: '11px',
        fontStyle: '700',
      });
      this.text(frame.x + frame.gutter, frame.top + 17, title, {
        fontFamily: 'Cinzel, Inter, serif',
        fontSize: '25px',
        fontStyle: '900',
        color: COLORS.text,
      });
      if (backHandler) {
        this.iconButton(frame.x + frame.width - frame.gutter - 44, frame.top, 44, 44, '<', backHandler);
      }
    }

    toast(frame, options) {
      const opts = options || {};
      this.drawTapPulse();
      this.syncButtonDebug();
      if (!this.store.toast) return;
      const g = this.graphics;
      const x = frame.x + 18;
      const y = opts.y === undefined ? frame.bottom - 106 : opts.y;
      const w = frame.width - 36;
      const light = opts.theme === 'light';
      g.fillStyle(light ? 0xf7f4ec : COLORS.surfaceRaised, 0.96);
      g.fillRoundedRect(x, y, w, 48, 16);
      g.fillStyle(light ? 0xbfd6f2 : COLORS.talismanDim, light ? 0.46 : 0.12);
      g.fillRoundedRect(x + 3, y + 3, w - 6, 18, 13);
      g.lineStyle(1.5, light ? 0x2566ff : COLORS.selection, 0.72);
      g.strokeRoundedRect(x, y, w, 48, 16);
      g.lineStyle(1, light ? 0x33363a : COLORS.talismanDim, light ? 0.18 : 0.28);
      g.beginPath();
      g.moveTo(x + 12, y + 8);
      g.lineTo(x + w - 12, y + 8);
      g.strokePath();
      this.mono(x + 14, y + 16, this.store.toast, { color: light ? '#33363a' : COLORS.paperText, fontSize: '11px' });
    }

    drawTapPulse() {
      if (!this.lastTap || this.time.now - this.lastTap.t > 180) return;
      if (this.presentationLayer && this.presentationLayer.motion && this.presentationLayer.motion.reducedMotion) return;
      const age = (this.time.now - this.lastTap.t) / 180;
      const radius = 10 + age * 20;
      const color = this.lastTap.disabled ? COLORS.enemy : COLORS.selection;
      this.graphics.lineStyle(2, color, 0.75 * (1 - age));
      this.graphics.strokeCircle(this.lastTap.x, this.lastTap.y, radius);
    }

    button(x, y, w, h, label, onClick, options) {
      const opts = options || {};
      const g = this.graphics;
      const fill = opts.fill === undefined ? COLORS.panel2 : opts.fill;
      const stroke = opts.stroke === undefined ? COLORS.line : opts.stroke;
      const alpha = opts.disabled ? 0.42 : (opts.alpha === undefined ? 0.96 : opts.alpha);
      const radius = opts.radius === undefined ? Math.min(14, TOKEN_RADIUS.skillCard || 14) : opts.radius;
      const topFill = opts.gradientTop === undefined ? fill : opts.gradientTop;
      g.fillStyle(fill, alpha);
      g.fillRoundedRect(x, y, w, h, radius);
      if (!opts.disabled) {
        g.fillStyle(topFill, opts.glowAlpha === undefined ? 0.12 : opts.glowAlpha);
        g.fillRoundedRect(x + 3, y + 3, w - 6, Math.max(3, h * 0.22), Math.max(4, radius - 5));
      }
      g.lineStyle(opts.strokeWidth || 1.5, stroke, opts.strokeAlpha === undefined ? 0.64 : opts.strokeAlpha);
      g.strokeRoundedRect(x, y, w, h, radius);
      g.lineStyle(1, COLORS.talismanPaper, opts.disabled ? 0.025 : 0.06);
      g.beginPath();
      g.moveTo(x + 10, y + 1.5);
      g.lineTo(x + w - 10, y + 1.5);
      g.strokePath();
      const text = this.text(x + w / 2, y + h / 2 - 8, label, {
        fontFamily: opts.mono ? (TOKEN_TYPE.mono || '"JetBrains Mono", monospace') : (TOKEN_TYPE.ui || 'Inter, Arial, sans-serif'),
        fontSize: opts.fontSize || `${TYPE_SCALE.body}px`,
        fontStyle: '800',
        color: opts.color || COLORS.text,
        align: 'center',
      }).setOrigin(0.5, 0);
      if (opts.maxWidth) text.setWordWrapWidth(opts.maxWidth);
      this.registerHitTarget(x, y, w, h, label, onClick, {
        disabled: opts.disabled,
        disabledReason: opts.disabledReason || opts.reason,
        accessibilityId: opts.accessibilityId || opts.a11yId,
        blocker: opts.blocker,
        mirror: opts.mirror,
      });
    }

    iconButton(x, y, w, h, label, onClick, options) {
      this.button(x, y, w, h, label, onClick, {
        fill: COLORS.panel,
        stroke: COLORS.line,
        fontSize: '16px',
        mono: true,
        ...(options || {}),
      });
    }

    cardPanel(x, y, w, h, tone, alpha) {
      const g = this.graphics;
      g.fillStyle(COLORS.panel, alpha === undefined ? 0.9 : alpha);
      const radius = Math.min(TOKEN_RADIUS.panelMin || 18, 18);
      g.fillRoundedRect(x, y, w, h, radius);
      g.fillStyle(COLORS.surfaceRaised, 0.26);
      g.fillRoundedRect(x + 4, y + 4, w - 8, Math.max(10, h * 0.22), Math.max(8, radius - 4));
      g.fillStyle(tone || COLORS.line, 0.07);
      g.fillTriangle(x + w - 52, y, x + w, y, x + w, y + 52);
      g.fillTriangle(x, y + h - 46, x + 46, y + h, x, y + h);
      g.lineStyle(1.5, tone || COLORS.line, 0.42);
      g.strokeRoundedRect(x, y, w, h, radius);
      g.lineStyle(1, COLORS.talismanPaper, 0.055);
      g.beginPath();
      g.moveTo(x + 14, y + 10);
      g.lineTo(x + w - 14, y + 10);
      g.strokePath();
    }

    energyOrbs(x, y, energy, size) {
      const colors = ['green', 'red', 'blue', 'white'];
      colors.forEach((color, index) => {
        const count = Number((energy && energy[color]) || 0);
        const cx = x + index * (size + 12);
        this.graphics.fillStyle(ENERGY_COLORS[color], count ? 0.95 : 0.12);
        this.graphics.fillCircle(cx, y, size / 2);
        this.graphics.lineStyle(1, ENERGY_COLORS[color], 0.75);
        this.graphics.strokeCircle(cx, y, size / 2);
        this.mono(cx + size / 2 + 2, y - 7, String(count), { fontSize: '10px', color: COLORS.text });
      });
    }

    costPips(x, y, cost, size) {
      costColors(cost).slice(0, 5).forEach((color, index) => {
        const cx = x + index * (size + 5);
        const fill = ENERGY_COLORS[color] || COLORS.black;
        this.graphics.fillStyle(fill, color === 'white' ? 0.88 : 0.96);
        this.graphics.fillCircle(cx, y, size / 2);
        this.graphics.lineStyle(1, color === 'black' ? COLORS.talismanPaper : fill, 0.82);
        this.graphics.strokeCircle(cx, y, size / 2);
        this.mono(cx - 3, y - 4, ENERGY_LABELS[color] || 'X', {
          color: color === 'white' ? '#08080a' : COLORS.text,
          fontSize: `${TYPE_SCALE.micro}px`,
        });
      });
      if (!cost || !cost.length) {
        this.graphics.lineStyle(1, COLORS.queued, 0.72);
        this.graphics.strokeCircle(x, y, size / 2);
        this.mono(x - 4, y - 4, '0', { color: '#b7dbc0', fontSize: `${TYPE_SCALE.micro}px` });
      }
    }

    portrait(characterOrId, x, y, size, options) {
      const opts = options || {};
      const id = typeof characterOrId === 'string'
        ? characterOrId
        : (characterOrId && (characterOrId.id || characterOrId.character_id));
      const name = typeof characterOrId === 'string'
        ? safeText(this.store.character(characterOrId).name, characterOrId)
        : safeText(characterOrId && characterOrId.name, id);
      const tone = this.store.assets.toneFor(id || name);
      const cx = x + size / 2;
      const cy = y + size / 2;
      this.graphics.fillStyle(COLORS.inkBlack, opts.dead ? 0.74 : 0.92);
      this.graphics.fillCircle(cx, cy, size / 2 + 3);
      this.graphics.fillStyle(tone, opts.dead ? 0.13 : 0.26);
      this.graphics.fillCircle(cx, cy, size / 2);
      if (opts.noRing) {
        this.graphics.lineStyle(1.25, opts.tone || tone, opts.dead ? 0.24 : 0.48);
        this.graphics.strokeCircle(cx, cy, size / 2);
      } else {
        this.graphics.lineStyle(opts.targetable ? 2.5 : 1, opts.tone || tone, opts.dead ? 0.28 : 0.56);
        this.graphics.strokeCircle(cx, cy, size / 2 + 3);
        this.graphics.lineStyle(opts.selected ? 2.5 : 1.25, opts.tone || tone, opts.targetable ? 0.92 : 0.68);
        this.graphics.strokeCircle(cx, cy, size / 2);
      }
      this.portraitArtwork(characterOrId, x + 3, y + 3, size - 6, size - 6, {
        context: 'square',
        dead: opts.dead,
        shape: 'circle',
        tone: opts.tone || tone,
      });
    }

    talismanLabel(x, y, text, tone) {
      const w = Math.max(76, text.length * 7 + 28);
      this.graphics.fillStyle(COLORS.surfaceRaised, 0.92);
      this.graphics.fillRoundedRect(x, y, w, 22, 6);
      this.graphics.fillStyle(tone || COLORS.selection, 0.12);
      this.graphics.fillTriangle(x, y, x + 16, y, x, y + 16);
      this.graphics.lineStyle(1, tone || COLORS.selection, 0.48);
      this.graphics.strokeRoundedRect(x, y, w, 22, 6);
      this.mono(x + 12, y + 6, text, { color: COLORS.paperText, fontSize: '10px' });
      return w;
    }

    /* ---- Dossier-plate primitives (Combat/Queue-Review visual language,
       generalized here for reuse by non-combat scenes). The rounded
       primitives above stay untouched -- BootScene still uses drawAppBg. ---- */

    /* Shared cut-corner hexagon shape. Most Combat panels cut the top-left
       and bottom-right corners (asymmetric sizes allowed); pass cut:0 (or
       cutTL/cutBR:0) for an uncut edge. */
    cutRectPoints(x, y, w, h, options) {
      const opts = options || {};
      const cut = opts.cut === undefined ? 7 : opts.cut;
      const cutTL = opts.cutTL === undefined ? cut : opts.cutTL;
      const cutBR = opts.cutBR === undefined ? cut : opts.cutBR;
      if (!cutTL && !cutBR) {
        return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
      }
      const points = [];
      points.push({ x: x + cutTL, y });
      points.push({ x: x + w, y });
      if (cutBR) {
        points.push({ x: x + w, y: y + h - cutBR });
        points.push({ x: x + w - cutBR, y: y + h });
      } else {
        points.push({ x: x + w, y: y + h });
      }
      points.push({ x, y: y + h });
      if (cutTL) points.push({ x, y: y + cutTL });
      return points;
    }

    /* Default panel for the dossier language -- replaces cardPanel. Dark
       cut-corner fill, tone corner-triangle accent, optional edge bar. */
    platePanel(x, y, w, h, tone, options) {
      const opts = options || {};
      const points = this.cutRectPoints(x, y, w, h, { cut: opts.cut === undefined ? 7 : opts.cut });
      const g = this.graphics;
      g.fillStyle(opts.fill === undefined ? 0x080c0f : opts.fill, opts.alpha === undefined ? 0.9 : opts.alpha);
      g.fillPoints(points, true);
      if (opts.accentTriangle !== false) {
        const accentSize = opts.accentSize || 60;
        g.fillStyle(tone || COLORS.line, opts.accentAlpha === undefined ? 0.1 : opts.accentAlpha);
        g.fillTriangle(x, y, x + Math.min(w, accentSize), y, x, y + Math.min(h, accentSize));
      }
      if (opts.edgeBar) {
        g.fillStyle(tone || COLORS.selection, opts.edgeBarAlpha === undefined ? 0.7 : opts.edgeBarAlpha);
        if (opts.edgeBar === 'left') g.fillRect(x, y, opts.edgeBarWidth || 3, h);
        else if (opts.edgeBar === 'top') g.fillRect(x, y, w, opts.edgeBarWidth || 3);
      }
      g.lineStyle(opts.strokeWidth || 1.5, tone || COLORS.line, opts.strokeAlpha === undefined ? 0.5 : opts.strokeAlpha);
      g.strokePoints(points, true);
      if (opts.highlight !== false) {
        g.lineStyle(1, COLORS.talismanPaper, 0.06);
        g.beginPath();
        g.moveTo(x + 10, y + 6);
        g.lineTo(x + w - 10, y + 6);
        g.strokePath();
      }
    }

    /* Extracted from Combat's renderWorld rain/domain-glow loops. Called by
       worldBackdrop when ambient !== 'none'; also standalone-callable. */
    renderAmbientParticles(frame, kind) {
      const g = this.graphics;
      if (kind === 'rain') {
        for (let index = 0; index < 22; index += 1) {
          const x = frame.x + 10 + ((index * 47) % Math.max(40, frame.width - 20));
          const y = 66 + ((index * 83) % Math.max(120, frame.height - 160));
          const length = 14 + (index % 4) * 7;
          g.lineStyle(index % 5 === 0 ? 1.4 : 1, 0xb7d5dc, index % 5 === 0 ? 0.18 : 0.09);
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x - 4, y + length);
          g.strokePath();
        }
      }
      if (kind === 'rain' || kind === 'motes') {
        [0.22, 0.48, 0.73].forEach((progress, index) => {
          const cx = frame.x + frame.width * (0.28 + progress * 0.42);
          const cy = frame.height * (0.26 + progress * 0.43);
          g.fillStyle(COLORS.domain, 0.028 + index * 0.012);
          g.fillCircle(cx, cy, 58 + index * 34);
        });
      }
    }

    /* Default background for the dossier language -- replaces drawAppBg.
       Generalizes Combat's renderWorld: texture-or-gradient base, local
       translucent grading, optional ambient layer. Pass textureKey: null
       (the default) to always take the same gradient-fallback path Combat
       itself uses when its own texture is missing -- no new art required. */
    worldBackdrop(frame, options) {
      const opts = options || {};
      const g = this.graphics;
      const textureKey = opts.textureKey || null;
      if (textureKey && this.textures.exists(textureKey)) {
        const world = this.add.image(frame.x + frame.width / 2, frame.height / 2, textureKey);
        world.setDisplaySize(frame.width, frame.height);
        world.setDepth(-30);
        this.nodes.push(world);
      } else {
        const grad = opts.fallbackGradient || [0x07131c, 0x0b1820, 0x03070b, 0x020406];
        g.fillGradientStyle(grad[0], grad[1], grad[2], grad[3], 1);
        g.fillRect(frame.x, 0, frame.width, frame.height);
      }
      if (opts.grade !== false) {
        g.fillStyle(0x020507, 0.14);
        g.fillRect(frame.x, 0, frame.width, frame.height);
        g.fillStyle(0x071016, 0.12);
        g.fillRect(frame.x, 0, frame.width, 94);
        g.fillStyle(0x020506, 0.24);
        g.fillRect(frame.x, frame.height - 332, frame.width, 332);
      }
      if (opts.ambient && opts.ambient !== 'none') {
        this.renderAmbientParticles(frame, opts.ambient);
      }
    }

    /* Default header for the dossier language -- replaces topBar. Angular
       header plate from Combat's renderTopHud, generalized: rightSlot lets
       a scene draw its own right-aligned content (Combat puts its energy
       meter/connection status there; other scenes can leave it empty). */
    dossierHeader(frame, options) {
      const opts = options || {};
      const g = this.graphics;
      const x = frame.x + 10;
      const y = frame.top;
      const w = frame.width - 20;
      const tone = opts.tone || COLORS.selection;
      const points = [
        { x, y },
        { x: x + w - 48, y },
        { x: x + w, y: y + 22 },
        { x: x + w, y: y + 68 },
        { x: x + 18, y: y + 68 },
        { x, y: y + 50 },
      ];
      g.fillStyle(0x05090d, 0.78);
      g.fillPoints(points, true);
      g.fillStyle(tone, 0.12);
      g.fillTriangle(x, y, x + 122, y, x, y + 58);
      g.lineStyle(1.5, tone, 0.52);
      g.strokePoints(points, true);
      g.lineStyle(1, 0xd8c28a, 0.18);
      g.beginPath();
      g.moveTo(x + 12, y + 21);
      g.lineTo(x + w - 66, y + 21);
      g.strokePath();
      if (opts.eyebrow) {
        this.mono(x + 12, y + 6, opts.eyebrow, {
          color: COLORS.paperText,
          fontSize: `${TYPE_SCALE.label}px`,
          fontStyle: '700',
        });
      }
      if (opts.title) {
        this.text(x + 12, y + 27, opts.title, {
          fontFamily: TOKEN_TYPE.display || 'Georgia, serif',
          fontSize: '20px',
          fontStyle: '700',
        });
      }
      if (opts.rightSlot) opts.rightSlot(x + w, y);
      if (opts.backHandler) {
        this.iconButton(x + w - 54, y + 16, 44, 44, '<', opts.backHandler, {
          fill: 0x0d1114,
          stroke: COLORS.line,
          fontSize: '11px',
          mono: true,
          radius: 5,
          strokeAlpha: 0.72,
        });
      }
      return { x, y, w, bottom: y + 68 };
    }

    /* Default character token for the dossier language -- replaces
       portrait()'s circular ring. Generalizes renderPortraitPlate /
       renderIdentitySeal into one cut-corner tile; same call contract as
       portrait() (dead/selected/targetable/tone options) for low-friction
       swap-in at existing call sites. */
    platePortrait(characterOrId, x, y, size, options) {
      const opts = options || {};
      const w = opts.w || size;
      const h = opts.h || size;
      const id = typeof characterOrId === 'string'
        ? characterOrId
        : (characterOrId && (characterOrId.id || characterOrId.character_id));
      const name = typeof characterOrId === 'string'
        ? safeText(this.store.character(characterOrId).name, characterOrId)
        : safeText(characterOrId && characterOrId.name, id);
      const dead = !!opts.dead;
      const tone = opts.tone || this.store.assets.toneFor(id || name);
      const points = this.cutRectPoints(x, y, w, h, { cut: opts.cut === undefined ? 7 : opts.cut });
      this.graphics.fillStyle(0x05090c, dead ? 0.5 : 0.94);
      this.graphics.fillPoints(points, true);
      this.graphics.fillStyle(tone, dead ? 0.08 : 0.22);
      this.graphics.fillTriangle(x, y, x + w, y, x, y + h);
      this.graphics.lineStyle(opts.selected || opts.targetable ? 2 : 1, tone, dead ? 0.24 : (opts.targetable ? 0.9 : 0.68));
      this.graphics.strokePoints(points, true);
      this.portraitArtwork(characterOrId, x + 3, y + 3, w - 6, h - 6, {
        context: opts.context || this.portraitContextFor(w, h),
        dead,
        tone,
      });
    }

    /* Default state chip for the dossier language -- replaces
       talismanLabel's rounded pill. Generalized from renderFighterPlate's
       stateLabel chip; same (x, y, text, tone) call shape as talismanLabel. */
    dossierTag(x, y, text, tone, options) {
      const opts = options || {};
      const chipH = opts.height || 20;
      const chipW = opts.width || (text.length * 7 + 18);
      this.graphics.fillStyle(tone || COLORS.selection, opts.alpha === undefined ? 0.88 : opts.alpha);
      this.graphics.fillPoints([
        { x: x + 5, y: y - chipH / 2 },
        { x: x + chipW, y: y - chipH / 2 },
        { x: x + chipW - 5, y: y + chipH / 2 },
        { x: x + 5, y: y + chipH / 2 },
      ], true);
      this.mono(x + 9, y - chipH / 2 + 5, text, {
        color: opts.color || '#07090a',
        fontSize: opts.fontSize || `${TYPE_SCALE.label}px`,
        fontStyle: '700',
      });
      return chipW;
    }

    /* Full-screen dim + angular bottom-sheet-with-header, generalized from
       Combat's renderSkillDetailSheet/renderQueueReviewSheet. Returns the
       interior content rect so the caller fills in scene-specific rows.
       Primary reuse target: DraftRosterScene's renderCharacterDetailSheet. */
    dossierSheet(frame, options) {
      const opts = options || {};
      const x = frame.x + 12;
      const y = opts.y === undefined ? Math.max(168, frame.height * 0.34) : opts.y;
      const w = frame.width - 24;
      const h = frame.height - y + (opts.bottomInset === undefined ? 18 : opts.bottomInset);
      const tone = opts.tone || COLORS.selection;
      const g = this.graphics;
      const fullW = frame.fullWidth === undefined ? frame.width : frame.fullWidth;
      const fullH = frame.fullHeight === undefined ? frame.height : frame.fullHeight;
      g.fillStyle(0x010305, 0.5);
      g.fillRect(0, 0, fullW, fullH);
      const points = this.cutRectPoints(x, y, w, h, { cutTL: 18, cutBR: 0 });
      g.fillStyle(0x080c0f, 0.97);
      g.fillPoints(points, true);
      g.fillStyle(tone, 0.12);
      g.fillTriangle(x + 18, y, x + 178, y, x, y + 168);
      g.lineStyle(2, tone, 0.68);
      g.strokePoints(points, true);
      if (opts.eyebrow) {
        this.mono(x + 18, y + 18, opts.eyebrow, { color: COLORS.paperText, fontSize: `${TYPE_SCALE.label}px` });
      }
      if (opts.title) {
        this.text(x + 18, y + 42, opts.title, {
          fontFamily: TOKEN_TYPE.display || 'Georgia, serif',
          fontSize: '22px',
          fontStyle: '700',
          wordWrap: { width: w - 88 },
        });
      }
      if (opts.blockOverlay !== false) {
        this.buttons.push({ x: 0, y: 0, w: fullW, h: fullH, label: 'Sheet Overlay', onClick: () => {}, disabled: false });
      }
      if (opts.onClose) {
        this.iconButton(x + w - 58, y + 14, 44, 44, '×', opts.onClose, { stroke: COLORS.enemy, fontSize: '14px', radius: 5 });
      }
      return { x: x + 18, y: y + 60, w: w - 36, h: h - 78, sheetX: x, sheetY: y, sheetW: w, sheetH: h };
    }

    /* Section label + rule, generalized from renderFighterLane's
       "HOSTILE SIGNATURES"/"YOUR FIELD" lane headers. */
    railLabel(x, y, text, tone, options) {
      const opts = options || {};
      this.mono(x, y, text, {
        color: opts.color || COLORS.paperText,
        fontSize: opts.fontSize || `${TYPE_SCALE.label}px`,
        fontStyle: '700',
      });
      if (opts.width) {
        const lineY = y + (opts.lineY === undefined ? 5 : opts.lineY);
        const lineOffset = opts.lineOffset === undefined ? 90 : opts.lineOffset;
        this.graphics.lineStyle(1, tone || COLORS.line, opts.lineAlpha === undefined ? 0.42 : opts.lineAlpha);
        this.graphics.beginPath();
        this.graphics.moveTo(x + lineOffset, lineY);
        this.graphics.lineTo(x + opts.width, lineY);
        this.graphics.strokePath();
      }
    }

    /* Rectangular progress bar, generalized from renderFighterPlate's HP
       bar math. Used for mission-progress bars (FirstCreation, Result). */
    progressRail(x, y, w, h, pct, tone, options) {
      const opts = options || {};
      const clampedPct = Math.max(0, Math.min(1, pct));
      this.graphics.fillStyle(opts.trackColor === undefined ? 0x020405 : opts.trackColor, opts.trackAlpha === undefined ? 0.96 : opts.trackAlpha);
      this.graphics.fillRect(x, y, w, h);
      this.graphics.fillStyle(tone || COLORS.selection, opts.fillAlpha === undefined ? 0.94 : opts.fillAlpha);
      this.graphics.fillRect(x, y, w * clampedPct, h);
      if (opts.stroke !== false) {
        this.graphics.lineStyle(1, COLORS.line, 0.3);
        this.graphics.strokeRect(x, y, w, h);
      }
    }

    render() {}
  }
