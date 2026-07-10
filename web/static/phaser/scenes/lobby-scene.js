/* LOBBY — mobile-app-v2 composition: full-bleed poster hero under a bottom
   protection gradient, HUD with trophies, skewed season tag, giant blade-cut
   BATTLE plate (shine + breathing glow), two mode tiles, Arena Pass strip. */

import { COLORS } from '../core/runtime-config.js?v=18';
import { BaseScene } from './base-scene.js?v=18';
import { bladePoints } from '../components/blade.js?v=18';
import { drawBladePlate, drawPlatePoly } from '../components/plate.js?v=18';
import { drawHpBar } from '../components/widgets.js?v=18';

export class LobbyScene extends BaseScene {
    constructor() {
      super('LobbyScene');
    }

    winsCount() {
      return this.store.records.filter((record) => record.result === 'Victory').length;
    }

    renderHeroPoster(frame) {
      const heroH = frame.height * 0.68;
      if (this.textures.exists('hero_lobby')) {
        const tex = this.textures.getFrame('hero_lobby');
        const scale = Math.max(frame.width / tex.width, heroH / tex.height);
        const image = this.add.image(frame.x + frame.width / 2, heroH * 0.5, 'hero_lobby');
        image.setScale(scale);
        const maskShape = this.make.graphics({ add: false });
        maskShape.fillStyle(0xffffff, 1);
        maskShape.fillRect(frame.x, 0, frame.width, heroH);
        image.setMask(maskShape.createGeometryMask());
        this.nodes.push(image);
        this.nodes.push(maskShape);
      }
      const g = this.layer();
      // Scanlines — very subtle texture over the poster.
      g.lineStyle(1, 0xffffff, 0.02);
      for (let y = 0; y < heroH; y += 4) {
        g.beginPath();
        g.moveTo(frame.x, y);
        g.lineTo(frame.x + frame.width, y);
        g.strokePath();
      }
      // Protection gradients: slight top scrim, heavy bottom ramp into ink.
      g.fillStyle(COLORS.ink950, 0.25);
      g.fillRect(frame.x, 0, frame.width, frame.height * 0.1);
      const rampTop = frame.height * 0.38;
      const rampBottom = frame.height * 0.74;
      const bands = 14;
      for (let i = 0; i < bands; i += 1) {
        const y0 = rampTop + ((rampBottom - rampTop) * i) / bands;
        const y1 = rampTop + ((rampBottom - rampTop) * (i + 1)) / bands;
        g.fillStyle(COLORS.ink950, 0.94 * ((i + 1) / bands));
        g.fillRect(frame.x, y0, frame.width, y1 - y0 + 1);
      }
      g.fillStyle(COLORS.ink950, 0.94);
      g.fillRect(frame.x, rampBottom, frame.width, frame.height - rampBottom);
    }

    renderHud(frame) {
      const x = frame.x + frame.gutter;
      const y = 14;
      // Level badge — blade-both violet plate.
      drawPlatePoly(this.graphics, bladePoints(x, y, 44, 44, 12, 'both'), {
        fillTop: COLORS.curse400,
        fillBottom: COLORS.curse600,
      });
      this.display(x + 22, y + 22, String(Math.min(99, this.winsCount() + 1)), 17).setOrigin(0.5, 0.5);
      this.hotspot(x, y, 44, 44, 'Player Level', () => this.store.changeScene('RecordsScene'));

      this.text(x + 53, y + 4, this.store.playerName, {
        fontSize: '12px',
        fontStyle: '900',
      });
      this.text(x + 53, y + 22, '\u{1F3C6}', { fontSize: '10px' });
      this.stat(x + 70, y + 23, String(this.winsCount() * 30 + 1000), 11, { color: COLORS.goldTextSoft });
      this.hotspot(x + 48, y, 120, 44, 'Edit Name', () => {
        const next = window.prompt('Player name', this.store.playerName);
        if (next !== null) this.store.setIdentity('name', next);
      });

      // Room pill (private-match code), right side.
      const pillW = 118;
      const pillX = frame.x + frame.width - frame.gutter - pillW;
      this.graphics.fillStyle(COLORS.keyline, 1);
      this.graphics.fillRoundedRect(pillX - 1.5, y + 6.5, pillW + 3, 31, 17);
      this.graphics.fillStyle(COLORS.ink800, 1);
      this.graphics.fillRoundedRect(pillX, y + 8, pillW, 28, 14);
      this.label(pillX + 12, y + 13, 'Room', 8, { color: COLORS.dim });
      this.stat(pillX + 12, y + 23, String(this.store.roomId).slice(0, 10), 10, { color: COLORS.text });
      this.hotspot(pillX, y + 2, pillW, 40, 'Edit Room', () => {
        const next = window.prompt('Room code', this.store.roomId);
        if (next !== null) this.store.setIdentity('room', next);
      });
    }

    renderModeTiles(frame, y, tileH) {
      const x = frame.x + frame.gutter;
      const tileW = (frame.width - frame.gutter * 2 - 9) / 2;
      const tiles = [
        {
          icon: '\u{1F91D}', title: 'Private Match', sub: 'Challenge a friend',
          onClick: () => { this.store.setMatchMode('pvp'); this.store.changeScene('DraftScene'); },
        },
        {
          icon: '\u{1F5FA}', title: 'Missions', sub: this.missionSub(),
          onClick: () => this.store.changeScene('MissionMapScene'),
        },
      ];
      tiles.forEach((tile, index) => {
        const tx = x + index * (tileW + 9);
        this.plateButton(tx, y, tileW, tileH, tile.title, tile.onClick, {
          tone: 'ink', showLabel: false,
        });
        this.text(tx + 14, y + 10, tile.icon, { fontSize: '17px' });
        this.text(tx + 14, y + 34, tile.title, { fontSize: '13px', fontStyle: '900' });
        this.text(tx + 14, y + 52, tile.sub, { fontSize: '10px', fontStyle: '500', color: COLORS.muted });
      });
    }

    missionSub() {
      const profile = (window.JJK_BOOTSTRAP && window.JJK_BOOTSTRAP.firstCreation && window.JJK_BOOTSTRAP.firstCreation.profile) || {};
      const completed = (profile.completed_missions || []).length;
      const total = this.store.missions().length || 1;
      return `Student Era · ${completed}/${total}`;
    }

    renderArenaPass(frame, y, stripH) {
      const x = frame.x + frame.gutter;
      const w = frame.width - frame.gutter * 2;
      this.platePanel(x, y, w, stripH, { fillTop: COLORS.ink800, fillBottom: COLORS.ink800 });
      const chipPoints = drawBladePlate(this.graphics, x + 10, y + (stripH - 40) / 2, 40, 40, {
        corners: 'both', cut: 12,
        fillTop: COLORS.gold300,
        fillBottom: COLORS.gold500,
      });
      this.fx({ kind: 'shine', poly: chipPoints, offsetMs: 1600 });
      this.text(x + 30, y + stripH / 2, '\u{1F381}', { fontSize: '16px' }).setOrigin(0.5, 0.5);

      const profile = (window.JJK_BOOTSTRAP && window.JJK_BOOTSTRAP.firstCreation && window.JJK_BOOTSTRAP.firstCreation.profile) || {};
      const completed = (profile.completed_missions || []).length;
      const total = this.store.missions().length || 1;
      this.text(x + 62, y + 12, `Arena Pass · Tier ${completed + 1}`, { fontSize: '12px', fontStyle: '900' });
      drawHpBar(this.graphics, x + 62, y + 32, w - 62 - 92, 8, completed / total, 'gold');
      this.plateButton(x + w - 78, y + (stripH - 36) / 2, 68, 36, 'Claim', () => this.store.changeScene('FirstCreationScene'), {
        tone: 'gold', fontSize: 11,
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      this.renderHeroPoster(frame);
      this.kanjiWatermark(frame);
      this.layer();
      this.renderHud(frame);

      // Season tag under HUD.
      this.skewTag(frame.x + frame.gutter, 66, 'Season 1 · Jujutsu High', { fontSize: 10 });

      // Ambient embers rise from the command area.
      const emberXs = [0.08, 0.22, 0.41, 0.58, 0.74, 0.9].map((p) => frame.x + frame.width * p);
      this.fx({ kind: 'embers', xs: emberXs, baseY: frame.height - 60 });

      // Command area pinned to the bottom.
      const x = frame.x + frame.gutter;
      const w = frame.width - frame.gutter * 2;
      const stripH = 60;
      const tileH = 70;
      const ctaH = 76;
      let y = frame.height - 14 - stripH;
      const tilesY = y - 9 - tileH;
      const ctaY = tilesY - 11 - ctaH;
      const titleY = ctaY - 12;

      this.display(x, titleY - 74, 'Welcome to', 34, { stroke: '#0E0B16', strokeThickness: 6 });
      this.display(x, titleY - 38, 'Jujutsu High', 34, { stroke: '#0E0B16', strokeThickness: 6 });

      // Giant BATTLE plate — shine sweep + breathing glow.
      const ctaPoints = this.plateButton(x, ctaY, w, ctaH, '⚔ Battle', () => {
        this.store.setMatchMode('cpu');
        this.store.changeScene('DraftScene');
      }, {
        tone: 'primary', corners: 'both', display: true, fontSize: 30,
      });
      this.fx({ kind: 'breathe', poly: ctaPoints });
      this.fx({ kind: 'shine', poly: ctaPoints });

      this.renderModeTiles(frame, tilesY, tileH);
      this.renderArenaPass(frame, y, stripH);
      this.toast(frame);
    }
  }
