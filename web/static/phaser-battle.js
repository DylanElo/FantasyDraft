(function () {
  class BattleScene extends Phaser.Scene {
    constructor() {
      super('JjkBattleScene');
      this.model = null;
      this.graphics = null;
      this.labels = [];
      this.hotspots = [];
    }

    create() {
      this.graphics = this.add.graphics();
      this.input.on('pointerdown', (pointer) => {
        for (const spot of this.hotspots) {
          if (
            pointer.x >= spot.x &&
            pointer.x <= spot.x + spot.w &&
            pointer.y >= spot.y &&
            pointer.y <= spot.y + spot.h
          ) {
            window.dispatchEvent(new CustomEvent('jjk:v2-arena-click', { detail: spot.detail }));
            break;
          }
        }
      });
      this.redraw();
    }

    setModel(model) {
      this.model = model;
      this.redraw();
    }

    clearLabels() {
      this.labels.forEach((label) => label.destroy());
      this.labels = [];
      this.hotspots = [];
    }

    label(x, y, text, style) {
      const label = this.add.text(x, y, text, {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '12px',
        color: '#f8fafc',
        ...style,
      });
      this.labels.push(label);
      return label;
    }

    drawStage(width, height) {
      const g = this.graphics;
      const cx = width * 0.5;
      const cy = height * 0.5;
      const radius = Math.min(width, height);

      g.fillGradientStyle(0x050711, 0x071228, 0x140712, 0x02040b, 1);
      g.fillRect(0, 0, width, height);

      g.fillStyle(0x2563eb, 0.16);
      g.fillCircle(width * 0.19, height * 0.22, radius * 0.46);
      g.fillStyle(0xef4444, 0.14);
      g.fillCircle(width * 0.82, height * 0.74, radius * 0.52);
      g.fillStyle(0xf59e0b, 0.07);
      g.fillCircle(cx, cy, radius * 0.34);

      g.fillStyle(0x030712, 0.62);
      g.fillRoundedRect(14, 14, width - 28, height - 28, 18);
      g.lineStyle(1, 0xffffff, 0.12);
      g.strokeRoundedRect(14, 14, width - 28, height - 28, 18);

      g.lineStyle(1, 0x60a5fa, 0.16);
      for (let i = 0; i < 9; i += 1) {
        const y = height * (0.18 + i * 0.075);
        g.beginPath();
        g.moveTo(width * 0.06, y);
        g.lineTo(width * 0.94, y + (i % 2 ? -height * 0.025 : height * 0.025));
        g.strokePath();
      }

      g.lineStyle(2, 0xa855f7, 0.24);
      g.strokeEllipse(cx, cy, width * 0.72, height * 0.42);
      g.lineStyle(2, 0xf59e0b, 0.18);
      g.strokeEllipse(cx, cy, width * 0.45, height * 0.25);

      g.lineStyle(2, 0xffffff, 0.12);
      g.beginPath();
      g.moveTo(width * 0.08, cy);
      g.lineTo(width * 0.92, cy);
      g.strokePath();

      const pulse = 0.12 + ((Date.now() / 900) % 1) * 0.06;
      g.fillStyle(0xa855f7, pulse);
      g.fillCircle(cx, cy, radius * 0.18);
    }

    drawPrompt(width, height) {
      const g = this.graphics;
      const prompt = this.model.prompt || 'Select a fighter';
      const promptW = Math.min(340, width * 0.58);
      const promptH = 42;
      const x = (width - promptW) / 2;
      const y = height * 0.462;
      g.fillStyle(0x050816, 0.78);
      g.fillRoundedRect(x, y, promptW, promptH, 10);
      g.lineStyle(1.5, 0xf59e0b, 0.52);
      g.strokeRoundedRect(x, y, promptW, promptH, 10);
      this.label(width * 0.5, y + 12, prompt, {
        fontSize: '13px',
        fontStyle: '800',
        color: '#fde68a',
        align: 'center',
      }).setOrigin(0.5, 0);
    }

    redraw() {
      if (!this.graphics || !this.model) return;
      const width = this.scale.width;
      const height = this.scale.height;
      const g = this.graphics;
      this.clearLabels();
      g.clear();

      this.drawStage(width, height);

      if (this.model.presentation !== 'dom_overlay') {
        this.drawTeam(this.model.enemy || [], 'enemy', width, height);
        this.drawTeam(this.model.mine || [], 'mine', width, height);
      }

      this.drawPrompt(width, height);

      if (this.model.queueCount) {
        this.label(width - 26, height - 30, `${this.model.queueCount}/3 queued`, {
          fontSize: '12px',
          color: '#86efac',
          fontStyle: '700',
          align: 'right',
        }).setOrigin(1, 0);
      }
    }

    drawTeam(team, side, width, height) {
      const y = side === 'enemy' ? height * 0.13 : height * 0.62;
      const label = side === 'enemy' ? 'OPPONENT' : 'MY TEAM';
      const color = side === 'enemy' ? 0xf87171 : 0x93c5fd;
      this.label(28, y - 28, label, {
        fontSize: '11px',
        fontStyle: '800',
        color: side === 'enemy' ? '#fca5a5' : '#bfdbfe',
        letterSpacing: 2,
      });

      const cardGap = Math.max(12, width * 0.025);
      const cardW = Math.min(190, (width - 72 - cardGap * 2) / 3);
      const cardH = Math.min(156, height * 0.27);
      const totalW = cardW * 3 + cardGap * 2;
      const startX = (width - totalW) / 2;
      team.forEach((fighter, index) => {
        const x = startX + index * (cardW + cardGap);
        this.drawFighter(fighter, x, y, cardW, cardH, color);
      });
    }

    drawFighter(fighter, x, y, w, h, sideColor) {
      const g = this.graphics;
      const border = fighter.targetable ? 0xfacc15 : fighter.selected ? 0xa855f7 : fighter.queued ? 0x22c55e : sideColor;
      const alpha = fighter.alive ? 1 : 0.42;
      const cx = x + w / 2;
      const avatarY = y + h * 0.36;
      const radius = Math.min(44, w * 0.30, h * 0.33);

      g.fillStyle(0x020617, 0.72 * alpha);
      g.fillRoundedRect(x, y + h * 0.18, w, h * 0.76, 16);
      g.lineStyle(fighter.targetable ? 3 : 1.5, border, fighter.targetable ? 0.95 : 0.48);
      g.strokeRoundedRect(x, y + h * 0.18, w, h * 0.76, 16);

      g.fillStyle(0x0f172a, 0.96 * alpha);
      g.fillCircle(cx, avatarY, radius + 8);
      g.lineStyle(fighter.targetable ? 4 : 2, border, fighter.targetable ? 1 : 0.72);
      g.strokeCircle(cx, avatarY, radius + 8);
      g.fillGradientStyle(0x1e293b, 0x334155, 0x111827, 0x020617, alpha);
      g.fillCircle(cx, avatarY, radius);
      g.fillStyle(sideColor, 0.22);
      g.fillCircle(cx + radius * 0.34, avatarY - radius * 0.20, radius * 0.55);
      this.label(cx, avatarY - 15, initials(fighter.name), {
        fontSize: `${Math.max(22, Math.round(radius * 0.70))}px`,
        fontStyle: '900',
        color: '#f8fafc',
        align: 'center',
      }).setOrigin(0.5, 0);

      const hpPct = Math.max(0, Math.min(1, fighter.hp / Math.max(1, fighter.maxHp)));
      const hpColor = hpPct <= 0.3 ? 0xfb7185 : hpPct <= 0.6 ? 0xfacc15 : 0x84cc16;
      g.fillStyle(0x020617, 0.9);
      g.fillRoundedRect(x + 12, y + h * 0.66, w - 24, 9, 5);
      g.fillStyle(hpColor, 1);
      g.fillRoundedRect(x + 12, y + h * 0.66, (w - 24) * hpPct, 9, 5);

      this.label(cx, y + h * 0.76, fighter.name, {
        fontSize: '12px',
        fontStyle: '800',
        color: '#f8fafc',
        align: 'center',
      }).setOrigin(0.5, 0).setCrop(-(w - 18) / 2, 0, w - 18, 16);
      this.label(cx, y + h * 0.87, `${fighter.hp}/${fighter.maxHp} HP`, {
        fontSize: '11px',
        color: '#cbd5e1',
        fontStyle: '700',
        align: 'center',
      }).setOrigin(0.5, 0);
      this.label(x + w - 12, y + h * 0.25, fighter.stateLabel || '', {
        fontSize: '10px',
        color: fighter.targetable ? '#fde68a' : fighter.queued ? '#86efac' : '#94a3b8',
        fontStyle: '800',
        align: 'right',
      }).setOrigin(1, 0);

      this.hotspots.push({
        x,
        y,
        w,
        h,
        detail: { side: fighter.side, slot: fighter.slot },
      });
    }
  }

  function initials(name) {
    return String(name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  class PhaserBattleRenderer {
    constructor(element) {
      this.element = element;
      this.scene = null;
      this.pendingModel = null;
      this.flushQueued = false;
      this.game = new Phaser.Game({
        type: Phaser.CANVAS,
        parent: element,
        backgroundColor: '#07071a',
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: Math.max(320, element.clientWidth || 640),
          height: Math.max(320, element.clientHeight || 420),
        },
        scene: BattleScene,
        audio: { noAudio: true },
        render: { antialias: true },
      });
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(element);
      this.queueFlush();
    }

    resize() {
      const width = Math.max(320, this.element.clientWidth || 640);
      const height = Math.max(320, this.element.clientHeight || 420);
      this.game.scale.resize(width, height);
      if (this.scene) this.scene.redraw();
    }

    update(model) {
      this.pendingModel = model;
      this.queueFlush();
    }

    queueFlush() {
      if (this.flushQueued) return;
      this.flushQueued = true;
      window.requestAnimationFrame(() => {
        this.flushQueued = false;
        this.flush();
      });
    }

    flush() {
      if (!this.pendingModel) return;
      if (!this.scene) {
        this.scene = this.game.scene.getScene('JjkBattleScene');
      }
      if (!this.scene || !this.scene.graphics) {
        this.queueFlush();
        return;
      }
      this.scene.setModel(this.pendingModel);
      this.resize();
    }
  }

  window.JJKPhaserBattle = {
    mount(element) {
      if (!window.Phaser || !element) return null;
      if (!element.__jjkPhaserBattle) {
        element.__jjkPhaserBattle = new PhaserBattleRenderer(element);
      }
      return element.__jjkPhaserBattle;
    },
  };
})();
