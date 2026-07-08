import { COLORS, ENERGY_COLORS, ENERGY_LABELS, TOKEN_RADIUS, TOKEN_TOUCH, TOKEN_TYPE } from '../core/runtime-config.js?v=16';
import { initials, safeText } from '../core/text.js?v=16';
import { LayoutService } from '../core/layout-service.js?v=16';
import { costColors } from '../core/roster.js?v=16';

export class BaseScene extends Phaser.Scene {
    constructor(key) {
      super(key);
      this.keyName = key;
      this.buttons = [];
      this.nodes = [];
      this.layout = null;
      this.store = null;
      this.graphics = null;
      this.unsubscribe = null;
      this.lastTap = null;
    }

    create() {
      this.store = window.JJKPhaserShell.store;
      this.layout = new LayoutService(this);
      this.graphics = this.add.graphics();
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

    handlePointer(pointer) {
      for (let i = this.buttons.length - 1; i >= 0; i -= 1) {
        const button = this.buttons[i];
        if (pointer.x >= button.x && pointer.x <= button.x + button.w && pointer.y >= button.y && pointer.y <= button.y + button.h) {
          this.lastTap = { x: pointer.x, y: pointer.y, t: this.time.now, disabled: !!button.disabled };
          window.dispatchEvent(new CustomEvent('jjk:ui-tap', { detail: { scene: this.keyName, disabled: !!button.disabled } }));
          if (!button.disabled) button.onClick();
          if (this.scene.isActive(this.keyName)) this.render();
          this.time.delayedCall(180, () => {
            if (this.scene.isActive(this.keyName)) this.render();
          });
          return;
        }
      }
    }

    clearSurface() {
      this.graphics.clear();
      this.nodes.forEach((node) => node.destroy());
      this.nodes = [];
      this.buttons = [];
    }

    text(x, y, value, style) {
      const node = this.add.text(x, y, safeText(value), {
        fontFamily: TOKEN_TYPE.ui || 'Inter, Arial, sans-serif',
        fontSize: '14px',
        color: COLORS.text,
        ...style,
      });
      this.nodes.push(node);
      return node;
    }

    mono(x, y, value, style) {
      return this.text(x, y, value, {
        fontFamily: TOKEN_TYPE.mono || '"JetBrains Mono", monospace',
        fontSize: '11px',
        color: COLORS.muted,
        ...style,
      });
    }

    drawAppBg(frame) {
      const g = this.graphics;
      g.fillGradientStyle(0x02030b, 0x061120, 0x180622, 0x030712, 1);
      g.fillRect(0, 0, frame.fullWidth, frame.fullHeight);
      g.fillStyle(COLORS.bg, 0.86);
      g.fillRoundedRect(frame.x, frame.y, frame.width, frame.height, frame.desktop ? 22 : 0);
      g.lineStyle(1, 0xffffff, frame.desktop ? 0.14 : 0);
      g.strokeRoundedRect(frame.x + 0.5, frame.y + 0.5, frame.width - 1, frame.height - 1, frame.desktop ? 22 : 0);

      const cx = frame.x + frame.width / 2;
      const cy = frame.y + frame.height * 0.47;
      [320, 236, 154].forEach((radius, index) => {
        g.lineStyle(index === 1 ? 2 : 1, index === 1 ? COLORS.purple : COLORS.gold, index === 1 ? 0.06 : 0.035);
        g.strokeCircle(cx, cy, radius);
      });
      for (let i = 0; i < 7; i += 1) {
        const y = frame.y + 84 + i * 104;
        g.lineStyle(1, COLORS.purple, 0.03);
        g.strokeCircle(frame.x + (i % 2 ? frame.width - 34 : 34), y, 72);
      }
      for (let i = 0; i < 15; i += 1) {
        const y = frame.y + 42 + i * 48;
        g.lineStyle(1, i % 3 === 0 ? COLORS.gold : 0xffffff, i % 3 === 0 ? 0.05 : 0.03);
        g.beginPath();
        g.moveTo(frame.x, y);
        g.lineTo(frame.x + frame.width, y + (i % 2 ? -18 : 18));
        g.strokePath();
      }
      for (let i = 0; i < 9; i += 1) {
        const x = frame.x + 18 + i * 49;
        g.lineStyle(1, COLORS.gold, 0.05);
        g.beginPath();
        g.moveTo(x, frame.y + 2);
        g.lineTo(x - 34, frame.y + frame.height - 2);
        g.strokePath();
      }
    }

    topBar(frame, title, backHandler) {
      const y = frame.top + 2;
      this.graphics.fillStyle(0x020617, 0.38);
      this.graphics.fillRoundedRect(frame.x + 10, frame.top - 4, frame.width - 20, 52, 16);
      this.graphics.lineStyle(1, COLORS.purple, 0.16);
      this.graphics.strokeRoundedRect(frame.x + 10, frame.top - 4, frame.width - 20, 52, 16);
      this.mono(frame.x + frame.gutter, y, 'CURSED CLASH', {
        color: '#fde68a',
        fontSize: '11px',
        fontStyle: '700',
      });
      this.text(frame.x + frame.gutter, frame.top + 17, title, {
        fontFamily: 'Cinzel, Inter, serif',
        fontSize: '25px',
        fontStyle: '900',
        color: '#f8fafc',
      });
      if (backHandler) {
        this.iconButton(frame.x + frame.width - frame.gutter - 42, frame.top + 4, 42, 36, '<', backHandler);
      }
    }

    toast(frame) {
      this.drawTapPulse();
      window.__phaserShellButtons = this.buttons.map((button) => ({
        scene: this.keyName,
        label: button.label || 'hotspot',
        x: Math.round(button.x),
        y: Math.round(button.y),
        w: Math.round(button.w),
        h: Math.round(button.h),
        disabled: !!button.disabled,
      }));
      if (!this.store.toast) return;
      const g = this.graphics;
      const x = frame.x + 18;
      const y = frame.height - 106;
      const w = frame.width - 36;
      g.fillStyle(0x111827, 0.96);
      g.fillRoundedRect(x, y, w, 48, 16);
      g.fillStyle(0x17112a, 0.36);
      g.fillRoundedRect(x + 3, y + 3, w - 6, 18, 13);
      g.lineStyle(1.5, COLORS.gold, 0.72);
      g.strokeRoundedRect(x, y, w, 48, 16);
      g.lineStyle(1, COLORS.purple, 0.28);
      g.beginPath();
      g.moveTo(x + 12, y + 8);
      g.lineTo(x + w - 12, y + 8);
      g.strokePath();
      this.mono(x + 14, y + 16, this.store.toast, { color: '#fde68a', fontSize: '11px' });
    }

    drawTapPulse() {
      if (!this.lastTap || this.time.now - this.lastTap.t > 180) return;
      const age = (this.time.now - this.lastTap.t) / 180;
      const radius = 10 + age * 20;
      const color = this.lastTap.disabled ? COLORS.red : COLORS.gold;
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
        g.fillStyle(topFill, opts.glowAlpha === undefined ? 0.22 : opts.glowAlpha);
        g.fillRoundedRect(x + 3, y + 3, w - 6, Math.max(3, h * 0.22), Math.max(4, radius - 5));
      }
      g.lineStyle(opts.strokeWidth || 1.5, stroke, opts.strokeAlpha === undefined ? 0.75 : opts.strokeAlpha);
      g.strokeRoundedRect(x, y, w, h, radius);
      g.lineStyle(1, 0xffffff, opts.disabled ? 0.03 : 0.08);
      g.beginPath();
      g.moveTo(x + 10, y + 1.5);
      g.lineTo(x + w - 10, y + 1.5);
      g.strokePath();
      const text = this.text(x + w / 2, y + h / 2 - 8, label, {
        fontFamily: opts.mono ? (TOKEN_TYPE.mono || '"JetBrains Mono", monospace') : (TOKEN_TYPE.ui || 'Inter, Arial, sans-serif'),
        fontSize: opts.fontSize || '13px',
        fontStyle: '800',
        color: opts.color || COLORS.text,
        align: 'center',
      }).setOrigin(0.5, 0);
      if (opts.maxWidth) text.setWordWrapWidth(opts.maxWidth);
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
      });
      window.__phaserShellButtons = this.buttons.map((button) => ({
        scene: this.keyName,
        label: button.label,
        x: Math.round(button.x),
        y: Math.round(button.y),
        w: Math.round(button.w),
        h: Math.round(button.h),
        disabled: button.disabled,
      }));
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
      g.fillStyle(0x111827, 0.2);
      g.fillRoundedRect(x + 4, y + 4, w - 8, Math.max(10, h * 0.22), Math.max(8, radius - 4));
      g.fillStyle(tone || COLORS.line, 0.08);
      g.fillTriangle(x + w - 52, y, x + w, y, x + w, y + 52);
      g.fillTriangle(x, y + h - 46, x + 46, y + h, x, y + h);
      g.lineStyle(1.5, tone || COLORS.line, 0.46);
      g.strokeRoundedRect(x, y, w, h, radius);
      g.lineStyle(1, 0xffffff, 0.06);
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
        this.mono(cx + size / 2 + 2, y - 7, String(count), { fontSize: '10px', color: '#e2e8f0' });
      });
    }

    costPips(x, y, cost, size) {
      costColors(cost).slice(0, 5).forEach((color, index) => {
        const cx = x + index * (size + 5);
        const fill = ENERGY_COLORS[color] || COLORS.black;
        this.graphics.fillStyle(fill, color === 'white' ? 0.88 : 0.96);
        this.graphics.fillCircle(cx, y, size / 2);
        this.graphics.lineStyle(1, color === 'black' ? COLORS.white : fill, 0.82);
        this.graphics.strokeCircle(cx, y, size / 2);
        this.mono(cx - 3, y - 4, ENERGY_LABELS[color] || 'X', {
          color: color === 'white' ? '#020617' : '#ffffff',
          fontSize: '7px',
        });
      });
      if (!cost || !cost.length) {
        this.graphics.lineStyle(1, COLORS.green, 0.72);
        this.graphics.strokeCircle(x, y, size / 2);
        this.mono(x - 4, y - 4, '0', { color: '#bbf7d0', fontSize: '7px' });
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
      const key = this.store.portraitKey(id);
      const tone = this.store.assets.toneFor(id || name);
      const cx = x + size / 2;
      const cy = y + size / 2;
      this.graphics.fillStyle(0x020617, opts.dead ? 0.74 : 0.92);
      this.graphics.fillCircle(cx, cy, size / 2 + 3);
      this.graphics.fillStyle(tone, opts.dead ? 0.13 : 0.26);
      this.graphics.fillCircle(cx, cy, size / 2);
      this.graphics.lineStyle(opts.targetable ? 3 : 1, opts.tone || tone, opts.dead ? 0.28 : 0.58);
      this.graphics.strokeCircle(cx, cy, size / 2 + 3);
      this.graphics.lineStyle(opts.selected ? 3 : 1.5, opts.tone || tone, opts.targetable ? 1 : 0.72);
      this.graphics.strokeCircle(cx, cy, size / 2);
      if (this.textures.exists(key)) {
        const image = this.add.image(cx, cy, key);
        image.setDisplaySize(size - 6, size - 6);
        image.setAlpha(opts.dead ? 0.38 : 0.96);
        this.nodes.push(image);
      } else {
        this.text(cx, cy - 11, initials(name), {
          fontSize: `${Math.max(18, Math.round(size * 0.32))}px`,
          fontStyle: '900',
        }).setOrigin(0.5, 0);
      }
    }

    talismanLabel(x, y, text, tone) {
      const w = Math.max(76, text.length * 7 + 28);
      this.graphics.fillStyle(0x0b1020, 0.92);
      this.graphics.fillRoundedRect(x, y, w, 22, 6);
      this.graphics.fillStyle(tone || COLORS.gold, 0.14);
      this.graphics.fillTriangle(x, y, x + 16, y, x, y + 16);
      this.graphics.lineStyle(1, tone || COLORS.gold, 0.5);
      this.graphics.strokeRoundedRect(x, y, w, 22, 6);
      this.mono(x + 12, y + 6, text, { color: '#fde68a', fontSize: '8px' });
      return w;
    }

    render() {}
  }
