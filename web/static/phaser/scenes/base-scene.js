import { COLORS, TOKEN_MOTION, TOKEN_TOUCH } from '../core/runtime-config.js?v=18';
import { initials, safeText } from '../core/text.js?v=18';
import { LayoutService } from '../core/layout-service.js?v=18';
import { bladePoints } from '../components/blade.js?v=18';
import { drawBladePlate, drawPlatePoly, fillPoly } from '../components/plate.js?v=18';
import { drawSkewTag } from '../components/widgets.js?v=18';
import { FONT_MONO, FONT_UI, displayStyle, labelStyle, statStyle, upper } from '../components/text-styles.js?v=18';
import { drawBreathe, drawEmbers, drawRays, drawShine, drawTargetPulse, drawTargetPulsePoly, reducedMotion } from '../components/fx.js?v=18';

export class BaseScene extends Phaser.Scene {
    constructor(key) {
      super(key);
      this.keyName = key;
      this.buttons = [];
      this.nodes = [];
      this.layout = null;
      this.store = null;
      this.graphics = null;
      this.fxGraphics = null;
      this.fxTasks = [];
      this.unsubscribe = null;
      this.lastTap = null;
      this.pressedLabel = null;
    }

    create() {
      this.store = window.JJKPhaserShell.store;
      this.layout = new LayoutService(this);
      this.baseGraphics = this.add.graphics();
      this.graphics = this.baseGraphics;
      this.fxGraphics = this.add.graphics();
      this.fxGraphics.setDepth(40);
      this.input.on('pointerdown', (pointer) => this.handlePointer(pointer));
      this.scale.on('resize', () => this.render());
      this.unsubscribe = this.store.onChange(() => {
        if (this.scene.isActive(this.keyName)) this.render();
      });
      this.render();
    }

    shutdown() {
      if (this.unsubscribe) this.unsubscribe();
    }

    update(time) {
      if (!this.fxGraphics) return;
      this.fxGraphics.clear();
      if (reducedMotion()) {
        this.drawTapPulse();
        return;
      }
      this.fxTasks.forEach((task) => {
        if (task.kind === 'shine') drawShine(this.fxGraphics, task.poly, time, task.offsetMs || 0);
        else if (task.kind === 'breathe') drawBreathe(this.fxGraphics, task.poly, time, task.color);
        else if (task.kind === 'pulse') drawTargetPulse(this.fxGraphics, task.x, task.y, task.r, time, task.offsetMs || 0);
        else if (task.kind === 'pulsePoly') drawTargetPulsePoly(this.fxGraphics, task.poly, time, task.offsetMs || 0);
        else if (task.kind === 'embers') drawEmbers(this.fxGraphics, task.xs, task.baseY, time);
        else if (task.kind === 'rays') drawRays(this.fxGraphics, task.cx, task.cy, task.radius, time, task.color);
      });
      this.drawTapPulse();
    }

    fx(task) {
      this.fxTasks.push(task);
    }

    handlePointer(pointer) {
      for (let i = this.buttons.length - 1; i >= 0; i -= 1) {
        const button = this.buttons[i];
        if (pointer.x >= button.x && pointer.x <= button.x + button.w && pointer.y >= button.y && pointer.y <= button.y + button.h) {
          this.lastTap = { x: pointer.x, y: pointer.y, t: this.time.now, disabled: !!button.disabled };
          window.dispatchEvent(new CustomEvent('jjk:ui-tap', { detail: { scene: this.keyName, disabled: !!button.disabled } }));
          this.pressedLabel = button.disabled ? null : button.label;
          if (!button.disabled) button.onClick();
          if (this.scene.isActive(this.keyName)) this.render();
          this.time.delayedCall(TOKEN_MOTION.pressMs || 80, () => {
            this.pressedLabel = null;
            if (this.scene.isActive(this.keyName)) this.render();
          });
          return;
        }
      }
    }

    clearSurface() {
      this.baseGraphics.clear();
      this.graphics = this.baseGraphics;
      this.nodes.forEach((node) => node.destroy());
      this.nodes = [];
      this.buttons = [];
      this.fxTasks = [];
    }

    /* Display-list layer bump: everything drawn after this covers everything
       added before it (images included). Needed because a single Graphics
       object renders below images added later in the same pass. */
    layer() {
      const g = this.add.graphics();
      this.nodes.push(g);
      this.graphics = g;
      return g;
    }

    text(x, y, value, style) {
      const node = this.add.text(x, y, safeText(value), {
        fontFamily: FONT_UI,
        fontSize: '14px',
        color: COLORS.text,
        ...style,
      });
      this.nodes.push(node);
      return node;
    }

    nodeText(x, y, value, style) {
      return this.text(x, y, value, style);
    }

    /* Display type is Lilita One, always uppercase. */
    display(x, y, value, size, style) {
      return this.text(x, y, upper(value), displayStyle(size, style));
    }

    label(x, y, value, size, style) {
      return this.text(x, y, upper(value), labelStyle(size || 11, style));
    }

    mono(x, y, value, style) {
      return this.text(x, y, value, {
        fontFamily: FONT_MONO,
        fontSize: '11px',
        color: COLORS.muted,
        ...style,
      });
    }

    stat(x, y, value, size, style) {
      return this.text(x, y, value, statStyle(size || 11, style));
    }

    skewTag(x, y, value, opts) {
      return drawSkewTag(this, this.graphics, x, y, value, opts || {});
    }

    /* Radial violet-to-ink app gradient (surface-app-grad). */
    drawAppBg(frame) {
      const g = this.graphics;
      g.fillStyle(COLORS.ink950, 1);
      g.fillRect(0, 0, frame.fullWidth, frame.fullHeight);
      const cx = frame.x + frame.width / 2;
      const cy = -frame.height * 0.1;
      const maxR = frame.width * 1.2;
      for (let i = 12; i >= 1; i -= 1) {
        g.fillStyle(COLORS.curse900, 0.05);
        g.fillEllipse(cx, cy, maxR * (i / 12) * 2, maxR * (i / 12) * 1.34);
      }
      if (frame.desktop) {
        g.lineStyle(2, COLORS.ink700, 0.8);
        g.strokeRoundedRect(frame.x - 1, frame.y, frame.width + 2, frame.height, 4);
      }
    }

    /* Oversized kanji watermark, faint violet. */
    kanjiWatermark(frame, glyph = '呪') {
      const node = this.text(frame.x + frame.width + 60, frame.y + 150, glyph, {
        fontFamily: '"Yuji Mai", serif',
        fontSize: '340px',
        color: '#8B3FF0',
      });
      node.setOrigin(1, 0);
      node.setAlpha(0.06);
      node.setAngle(8);
      return node;
    }

    /* THE pressable plate. Registers hit area + press-onto-ledge state. */
    plateButton(x, y, w, h, label, onClick, options) {
      const opts = options || {};
      const pressed = this.pressedLabel === label;
      const disabled = !!opts.disabled;
      const tone = opts.tone || 'primary';
      const tones = {
        primary: { top: COLORS.curse400, bottom: COLORS.curse600, ledge: COLORS.curse900, color: '#FFFFFF' },
        gold: { top: COLORS.gold300, bottom: COLORS.gold500, ledge: COLORS.gold800, color: COLORS.inkText },
        ink: { top: COLORS.ink700, bottom: COLORS.ink800, ledge: COLORS.keyline, color: COLORS.text },
        danger: { top: COLORS.red400, bottom: COLORS.red600, ledge: 0xa3172b, color: '#FFFFFF' },
        ghost: { top: COLORS.ink900, bottom: COLORS.ink900, ledge: null, color: COLORS.muted },
      };
      const t = tones[tone] || tones.primary;
      const alpha = disabled ? 0.45 : 1;
      const points = drawBladePlate(this.graphics, x, y, w, h, {
        cut: opts.cut,
        corners: opts.corners || 'br',
        fillTop: opts.fillTop === undefined ? t.top : opts.fillTop,
        fillBottom: opts.fillBottom === undefined ? t.bottom : opts.fillBottom,
        ledge: disabled ? null : (opts.ledge === undefined ? t.ledge : opts.ledge),
        pressed,
        alpha,
        keyline: opts.keyline,
        glow: opts.glow,
      });
      if (label && opts.showLabel !== false) {
        const node = this.text(x + w / 2, y + h / 2 + (pressed ? 3 : 0), upper(label), {
          fontFamily: opts.display ? '"Lilita One", Inter, sans-serif' : FONT_UI,
          fontSize: `${opts.fontSize || 14}px`,
          fontStyle: opts.display ? '400' : '900',
          letterSpacing: opts.display ? 1 : 0.4,
          color: opts.color || t.color,
          align: 'center',
        }).setOrigin(0.5, 0.5);
        node.setAlpha(alpha);
        if (opts.maxWidth) node.setWordWrapWidth(opts.maxWidth);
      }
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
        disabled,
      });
      this.publishButtons();
      return points;
    }

    /* Raised non-interactive panel plate. */
    platePanel(x, y, w, h, opts) {
      const o = opts || {};
      return drawBladePlate(this.graphics, x, y, w, h, {
        cut: o.cut,
        corners: o.corners || 'br',
        fillTop: o.fillTop === undefined ? COLORS.ink800 : o.fillTop,
        fillBottom: o.fillBottom === undefined ? COLORS.ink800 : o.fillBottom,
        alpha: o.alpha,
        keyline: o.keyline,
        bevel: o.bevel,
        glow: o.glow,
      });
    }

    publishButtons() {
      window.__phaserShellButtons = this.buttons.map((button) => ({
        scene: this.keyName,
        label: button.label || 'hotspot',
        x: Math.round(button.x),
        y: Math.round(button.y),
        w: Math.round(button.w),
        h: Math.round(button.h),
        disabled: !!button.disabled,
      }));
    }

    hotspot(x, y, w, h, label, onClick, disabled) {
      this.buttons.push({ x, y, w, h, label, onClick, disabled: !!disabled });
      this.publishButtons();
    }

    topBar(frame, title, backHandler) {
      const x = frame.x + frame.gutter;
      this.label(x, frame.top, 'Cursed Arena', 10, { color: COLORS.curseText });
      this.display(x, frame.top + 14, title, 26);
      if (backHandler) {
        this.iconButton(frame.x + frame.width - frame.gutter - 44, frame.top + 6, 44, 38, '<', backHandler);
      }
    }

    toast(frame) {
      this.publishButtons();
      if (!this.store.toast) return;
      const x = frame.x + 18;
      const y = frame.height - 108;
      const w = frame.width - 36;
      drawBladePlate(this.graphics, x, y, w, 48, {
        fillTop: COLORS.ink700,
        fillBottom: COLORS.ink800,
        corners: 'both',
      });
      this.text(x + 16, y + 24, safeText(this.store.toast), {
        fontSize: '12px',
        fontStyle: '600',
        color: COLORS.text,
      }).setOrigin(0, 0.5);
    }

    drawTapPulse() {
      if (!this.lastTap || this.time.now - this.lastTap.t > 180) return;
      const age = (this.time.now - this.lastTap.t) / 180;
      const radius = 10 + age * 20;
      const color = this.lastTap.disabled ? COLORS.red500 : COLORS.gold400;
      this.fxGraphics.lineStyle(2, color, 0.75 * (1 - age));
      this.fxGraphics.strokeCircle(this.lastTap.x, this.lastTap.y, radius);
    }

    iconButton(x, y, w, h, label, onClick, options) {
      this.plateButton(x, y, w, h, label, onClick, {
        tone: 'ink',
        fontSize: 15,
        ...(options || {}),
      });
    }

    /* Circular portrait chip (queue rows, recommended-team strips). */
    portrait(characterOrId, x, y, size, options) {
      const opts = options || {};
      const id = typeof characterOrId === 'string'
        ? characterOrId
        : (characterOrId && (characterOrId.id || characterOrId.character_id));
      const name = typeof characterOrId === 'string'
        ? safeText(this.store.character(characterOrId).name, characterOrId)
        : safeText(characterOrId && characterOrId.name, id);
      const key = this.store.portraitKey(id);
      const cx = x + size / 2;
      const cy = y + size / 2;
      const ring = opts.targetable ? COLORS.target : opts.selected ? COLORS.selection : (opts.tone || COLORS.ink500);
      this.graphics.fillStyle(COLORS.keyline, 1);
      this.graphics.fillCircle(cx, cy, size / 2 + 3);
      this.graphics.fillStyle(COLORS.ink800, opts.dead ? 0.7 : 1);
      this.graphics.fillCircle(cx, cy, size / 2);
      if (this.textures.exists(key)) {
        const image = this.add.image(cx, cy, key);
        const frame = this.textures.getFrame(key);
        const scale = size / Math.min(frame.width, frame.height);
        image.setScale(scale);
        const maskShape = this.make.graphics({ add: false });
        maskShape.fillStyle(0xffffff, 1);
        maskShape.fillCircle(cx, cy, size / 2 - 1);
        image.setMask(maskShape.createGeometryMask());
        image.setAlpha(opts.dead ? 0.35 : 1);
        this.nodes.push(image);
        this.nodes.push(maskShape);
        this.layer();
      } else {
        this.display(cx, cy, initials(name), Math.max(16, Math.round(size * 0.3))).setOrigin(0.5, 0.5);
      }
      this.graphics.lineStyle(opts.selected || opts.targetable ? 3 : 2, ring, opts.dead ? 0.4 : 1);
      this.graphics.strokeCircle(cx, cy, size / 2 + 1);
    }

    /* Blade-cut rectangular portrait plate (fighter cards, pedestals). */
    portraitPlate(characterOrId, x, y, w, h, opts = {}) {
      const id = typeof characterOrId === 'string'
        ? characterOrId
        : (characterOrId && (characterOrId.id || characterOrId.character_id));
      const key = this.store.portraitKey(id);
      const corners = opts.corners || 'br';
      const points = bladePoints(x, y, w, h, opts.cut === undefined ? 16 : opts.cut, corners);
      const rim = opts.rim === undefined ? COLORS.keyline : opts.rim;
      drawPlatePoly(this.graphics, points, {
        fillTop: COLORS.ink800,
        fillBottom: COLORS.ink900,
        keyline: false,
        bevel: false,
      });
      if (this.textures.exists(key)) {
        const frame = this.textures.getFrame(key);
        const scale = Math.max(w / frame.width, h / frame.height);
        const image = this.add.image(x + w / 2, y + h * (opts.focusY === undefined ? 0.42 : opts.focusY), key);
        image.setScale(scale);
        const maskShape = this.make.graphics({ add: false });
        fillPoly(maskShape, points, 0xffffff, 1);
        image.setMask(maskShape.createGeometryMask());
        image.setAlpha(opts.dead ? 0.35 : opts.alpha === undefined ? 1 : opts.alpha);
        this.nodes.push(image);
        this.nodes.push(maskShape);
        this.layer();
      } else {
        const name = typeof characterOrId === 'string' ? id : safeText(characterOrId && characterOrId.name, id);
        this.display(x + w / 2, y + h / 2, initials(name), Math.max(16, Math.round(h * 0.24)), {
          color: COLORS.curseText,
        }).setOrigin(0.5, 0.5);
      }
      // Rim on top of the art
      this.graphics.lineStyle(opts.rimWidth || 2.5, rim, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) this.graphics.lineTo(points[i].x, points[i].y);
      this.graphics.closePath();
      this.graphics.strokePath();
      return points;
    }

    render() {}
  }
