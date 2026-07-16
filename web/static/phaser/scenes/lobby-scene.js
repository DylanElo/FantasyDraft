import { COLORS, TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=21';
import { BaseScene } from './base-scene.js?v=21';

export class LobbyScene extends BaseScene {
    constructor() {
      super('LobbyScene');
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.worldBackdrop(frame, { textureKey: null, ambient: 'motes' });
      this.dossierHeader(frame, { eyebrow: 'CURSED CLASH', title: 'Mobile Arena' });
      const x = frame.x + frame.gutter;
      let y = 92;
      this.platePanel(x, y, frame.width - 32, 150, COLORS.talismanDim, { edgeBar: 'left' });
      const heroCx = x + frame.width - 92;
      const heroCy = y + 70;
      [52, 36, 20].forEach((radius, index) => {
        this.graphics.lineStyle(index === 1 ? 2 : 1, index === 1 ? COLORS.selection : COLORS.domain, index === 1 ? 0.38 : 0.18);
        this.graphics.strokeCircle(heroCx, heroCy, radius);
      });
      this.graphics.lineStyle(1, COLORS.talismanDim, 0.28);
      this.graphics.beginPath();
      this.graphics.moveTo(heroCx - 48, heroCy);
      this.graphics.lineTo(heroCx + 48, heroCy);
      this.graphics.moveTo(heroCx, heroCy - 48);
      this.graphics.lineTo(heroCx, heroCy + 48);
      this.graphics.strokePath();
      this.text(x + 18, y + 16, 'JJK ARENA', {
        fontFamily: TOKEN_TYPE.display || 'Georgia, serif',
        fontSize: '31px',
        fontStyle: '900',
      });
      // Real readable copy uses the sans body font, not monospace -- mono
      // stays reserved for short tags/numbers so the screen doesn't read
      // as a spec sheet.
      this.text(x + 20, y + 54, 'Cursed Clash / First Creation', { color: COLORS.muted, fontSize: `${TYPE_SCALE.body}px` });
      this.text(x + 20, y + 76, 'Draft a trio. Break the domain.', { color: COLORS.paperText, fontSize: `${TYPE_SCALE.body}px` });
      this.button(x + 18, y + 106, (frame.width - 72) / 2, 30, `Name: ${this.store.playerName}`, () => {
        const next = window.prompt('Player name', this.store.playerName);
        if (next !== null) this.store.setIdentity('name', next);
      }, { fill: COLORS.surfaceRaised, stroke: COLORS.line, fontSize: `${TYPE_SCALE.label}px`, mono: true, radius: 14 });
      this.button(x + 36 + (frame.width - 72) / 2, y + 106, (frame.width - 72) / 2, 30, `Room: ${this.store.roomId}`, () => {
        const next = window.prompt('Room code', this.store.roomId);
        if (next !== null) this.store.setIdentity('room', next);
      }, { fill: COLORS.surfaceRaised, stroke: COLORS.line, fontSize: `${TYPE_SCALE.label}px`, mono: true, radius: 14 });

      // Quick Play is the one primary action on this screen -- it's the
      // only element that keeps the bright gold/selection treatment.
      // Everything else below defaults to a neutral outline so the eye
      // has one clear place to land.
      y += 172;
      this.button(x, y, frame.width - 32, 84, 'Quick Play', () => {
        this.store.setMatchMode('cpu');
        this.store.changeScene('DraftScene');
      }, { fill: COLORS.selection, gradientTop: COLORS.talismanDim, stroke: COLORS.talismanPaper, color: '#08080a', fontSize: '22px', radius: 18, glowAlpha: 0.16 });
      this.dossierTag(x + 16, y + 60, 'CPU PRACTICE', COLORS.selection);

      y += 102;
      const modeW = (frame.width - 44) / 2;
      this.button(x, y, modeW, 66, 'Private PvP', () => {
        this.store.setMatchMode('pvp');
        this.store.changeScene('DraftScene');
      }, { fill: COLORS.surfaceRaised, stroke: COLORS.line, fontSize: `${TYPE_SCALE.subtitle}px`, radius: 18 });
      this.button(x + modeW + 12, y, modeW, 66, 'First Creation', () => {
        this.store.setMatchMode('cpu');
        this.store.changeScene('FirstCreationScene');
      }, { fill: COLORS.surfaceRaised, stroke: COLORS.line, fontSize: `${TYPE_SCALE.subtitle}px`, radius: 18 });

      y += 88;
      const half = (frame.width - 44) / 2;
      this.button(x, y, half, 56, 'Mission Map', () => this.store.changeScene('MissionMapScene'), { fill: COLORS.surfaceRaised, stroke: COLORS.line, fontSize: `${TYPE_SCALE.subtitle}px` });
      this.button(x + half + 12, y, half, 56, 'Records', () => this.store.changeScene('RecordsScene'), { fill: COLORS.surfaceRaised, stroke: COLORS.line, fontSize: `${TYPE_SCALE.subtitle}px` });

      y += 76;
      const recordsH = Math.max(96, frame.height - y - 24);
      this.platePanel(x, y, frame.width - 32, recordsH, COLORS.line, { alpha: 0.9 });
      this.railLabel(x + 16, y + 16, 'RECENT RECORDS', COLORS.line, { width: frame.width - 64 });
      const records = this.store.records.slice(0, 3);
      if (!records.length) {
        this.text(x + 16, y + 52, 'No finished domains yet.', { color: COLORS.muted, fontSize: `${TYPE_SCALE.body}px` });
      } else {
        records.forEach((record, index) => {
          this.text(x + 16, y + 46 + index * 28, `${record.result} / ${record.turns}T / ${record.damage} DMG`, {
            color: record.result === 'Victory' ? '#b7dbc0' : '#f1a0a0',
            fontSize: `${TYPE_SCALE.body}px`,
          });
        });
      }
      this.toast(frame);
    }
  }
