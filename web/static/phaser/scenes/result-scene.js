/* RESULTS — mobile-app-v2 composition: rotating burst rays + gold radial
   wash, VICTORY in gold-gradient display type, MVP blade-framed portrait,
   reward chips popping in staggered, Battle Again / Home. */

import { COLORS } from '../core/runtime-config.js?v=18';
import { safeText, shortText } from '../core/text.js?v=18';
import { BaseScene } from './base-scene.js?v=18';
import { popIn, reducedMotion } from '../components/fx.js?v=18';

export class ResultScene extends BaseScene {
    constructor() {
      super('ResultScene');
      this.introPlayed = false;
    }

    create() {
      this.introPlayed = false;
      super.create();
    }

    /* Gold-gradient display text via a canvas texture (Graphics/Text can't
       gradient-fill glyphs in the canvas renderer). */
    gradientTitle(key, content, fontSize, stops) {
      if (this.textures.exists(key)) this.textures.remove(key);
      const text = content.toUpperCase();
      const font = `400 ${fontSize}px "Lilita One", Inter, sans-serif`;
      const probe = document.createElement('canvas').getContext('2d');
      probe.font = font;
      const w = Math.ceil(probe.measureText(text).width) + 16;
      const h = Math.ceil(fontSize * 1.3);
      const texture = this.textures.createCanvas(key, w, h);
      const ctx = texture.getContext();
      ctx.font = font;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const gradient = ctx.createLinearGradient(0, 0, w * 0.4, h);
      stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
      ctx.fillStyle = gradient;
      ctx.fillText(text, w / 2, h / 2);
      texture.refresh();
      return key;
    }

    mvpFighter(me) {
      const team = (me && me.team) || [];
      return team.find((character) => character && character.alive) || team[0] || null;
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      const state = this.store.state;
      const mine = this.store.mineId();
      const victory = !!state && state.winner_id === mine;
      const cx = frame.x + frame.width / 2;
      const burstY = frame.height * 0.3;

      // Burst rays + radial wash (gold for victory, cold ink for defeat).
      if (victory) {
        this.fx({ kind: 'rays', cx, cy: burstY, radius: 470, color: COLORS.gold500 });
        const g = this.graphics;
        for (let i = 8; i >= 1; i -= 1) {
          g.fillStyle(COLORS.gold500, 0.025);
          g.fillEllipse(cx, frame.height * 0.24, frame.width * 1.7 * (i / 8), frame.height * 0.85 * (i / 8));
        }
      } else {
        const g = this.graphics;
        for (let i = 6; i >= 1; i -= 1) {
          g.fillStyle(COLORS.red600, 0.02);
          g.fillEllipse(cx, frame.height * 0.24, frame.width * 1.5 * (i / 6), frame.height * 0.7 * (i / 6));
        }
      }

      const introNodes = [];

      // Title.
      const titleKey = this.gradientTitle(
        'result_title',
        victory ? 'Victory' : 'Defeat',
        62,
        victory
          ? [[0, '#FFFFFF'], [0.45, '#FFD873'], [1, '#F0A82E']]
          : [[0, '#FFFFFF'], [0.45, '#FF6B7E'], [1, '#D8203B']],
      );
      const title = this.add.image(cx, frame.height * 0.16, titleKey);
      this.nodes.push(title);
      introNodes.push([title, 0]);

      // MVP blade-framed portrait.
      const me = this.store.me() || {};
      const mvp = this.mvpFighter(me);
      const mvpW = 170;
      const mvpH = 210;
      const mvpY = frame.height * 0.24;
      this.layer();
      if (mvp) {
        this.portraitPlate(mvp, cx - mvpW / 2, mvpY, mvpW, mvpH, {
          corners: 'both',
          rim: victory ? COLORS.gold400 : COLORS.ink500,
          rimWidth: 3,
        });
        const badge = this.text(cx, mvpY + mvpH + 18, `MVP · ${safeText(mvp.name, 'Fighter')}`.toUpperCase(), {
          fontSize: '11px',
          fontStyle: '900',
          letterSpacing: 1.4,
          color: victory ? '#0E0B16' : COLORS.text,
          backgroundColor: victory ? '#FBBF42' : '#2C2340',
          padding: { x: 12, y: 6 },
        }).setOrigin(0.5, 0.5);
        introNodes.push([badge, 100]);
      }

      // Reward chips (real match data — no fake currency).
      const last = this.store.records[0] || {};
      const turns = last.turns || (state && state.turn_number) || 0;
      const damage = last.damage || 0;
      const chips = [
        { label: `🏆 ${victory ? '+30' : '-10'}`, bg: '#FBBF42', color: '#0E0B16' },
        { label: `${damage} DMG`, bg: '#2C2340', color: '#FBF8FF' },
        { label: `${turns} TURNS`, bg: '#2C2340', color: '#FBF8FF' },
      ];
      const mission = this.store.activeMission();
      if (victory && mission && (mission.unlocks || []).length) {
        chips.push({ label: `UNLOCK: ${shortText(mission.unlocks[0], 14)}`, bg: '#6D28D9', color: '#FFFFFF' });
      }
      const chipY = frame.height * 0.24 + mvpH + 52;
      let totalW = 0;
      const chipNodes = chips.map((chip) => {
        const node = this.text(0, chipY, chip.label, {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '11px',
          fontStyle: '700',
          color: chip.color,
          backgroundColor: chip.bg,
          padding: { x: 10, y: 6 },
        });
        totalW += node.width + 8;
        return node;
      });
      let chipX = cx - (totalW - 8) / 2;
      chipNodes.forEach((node, index) => {
        node.setPosition(chipX, chipY);
        chipX += node.width + 8;
        introNodes.push([node, 200 + index * 100]);
      });

      // Actions.
      const x = frame.x + frame.gutter;
      const w = frame.width - frame.gutter * 2;
      this.plateButton(x + w / 2 - 140, frame.height - 132, 280, 54, 'Battle Again', () => this.store.changeScene('DraftScene'), {
        tone: 'primary', corners: 'both', display: true, fontSize: 18,
      });
      this.plateButton(x + w / 2 - 140, frame.height - 66, 280, 44, 'Home', () => this.store.resetToLobby(), {
        tone: 'ghost', fontSize: 12,
      });

      if (!this.introPlayed && !reducedMotion()) {
        this.introPlayed = true;
        introNodes.forEach(([node, delay]) => popIn(this, node, delay));
      }
      this.toast(frame);
    }
  }
