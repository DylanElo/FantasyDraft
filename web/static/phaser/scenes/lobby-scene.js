import { COLORS } from '../core/runtime-config.js?v=17';
import { BaseScene } from './base-scene.js?v=17';

export class LobbyScene extends BaseScene {
    constructor() {
      super('LobbyScene');
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      this.topBar(frame, 'Mobile Arena');
      const x = frame.x + frame.gutter;
      let y = 92;
      this.cardPanel(x, y, frame.width - 32, 142, COLORS.talismanDim, 0.9);
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
        fontFamily: 'Cinzel, Inter, serif',
        fontSize: '31px',
        fontStyle: '900',
      });
      this.mono(x + 20, y + 52, 'CURSED CLASH / FIRST CREATION', { color: COLORS.muted, fontSize: '9px' });
      this.mono(x + 20, y + 76, 'Draft a trio. Break the domain.', { color: COLORS.paperText, fontSize: '10px' });
      this.button(x + 18, y + 102, (frame.width - 72) / 2, 28, `Name: ${this.store.playerName}`, () => {
        const next = window.prompt('Player name', this.store.playerName);
        if (next !== null) this.store.setIdentity('name', next);
      }, { fill: COLORS.surfaceRaised, stroke: COLORS.talismanDim, fontSize: '11px', mono: true, radius: 14 });
      this.button(x + 36 + (frame.width - 72) / 2, y + 102, (frame.width - 72) / 2, 28, `Room: ${this.store.roomId}`, () => {
        const next = window.prompt('Room code', this.store.roomId);
        if (next !== null) this.store.setIdentity('room', next);
      }, { fill: COLORS.surfaceRaised, stroke: COLORS.ally, fontSize: '11px', mono: true, radius: 14 });

      y += 162;
      this.button(x, y, frame.width - 32, 82, 'Quick Play', () => {
        this.store.setMatchMode('cpu');
        this.store.changeScene('DraftScene');
      }, { fill: COLORS.selection, gradientTop: COLORS.talismanDim, stroke: COLORS.talismanPaper, color: '#08080a', fontSize: '20px', radius: 18, glowAlpha: 0.16 });
      this.talismanLabel(x + 16, y + 50, 'CPU PRACTICE', COLORS.selection);

      y += 98;
      const modeW = (frame.width - 44) / 2;
      this.button(x, y, modeW, 64, 'Private PvP', () => {
        this.store.setMatchMode('pvp');
        this.store.changeScene('DraftScene');
      }, { fill: COLORS.surfaceRaised, gradientTop: 0x10211e, stroke: COLORS.ally, fontSize: '15px', radius: 18 });
      this.button(x + modeW + 12, y, modeW, 64, 'First Creation', () => {
        this.store.setMatchMode('cpu');
        this.store.changeScene('FirstCreationScene');
      }, { fill: COLORS.surfaceRaised, gradientTop: 0x17121d, stroke: COLORS.domain, fontSize: '14px', radius: 18 });
      this.talismanLabel(x + 16, y + 38, 'PRIVATE ROOM', COLORS.ally);
      this.talismanLabel(x + modeW + 28, y + 38, 'STARTER TRIO', COLORS.domain);

      y += 82;
      const half = (frame.width - 44) / 2;
      this.button(x, y, half, 54, 'Mission Map', () => this.store.changeScene('MissionMapScene'), { fill: COLORS.surfaceRaised, stroke: COLORS.selection, fontSize: '12px' });
      this.button(x + half + 12, y, half, 54, 'Records', () => this.store.changeScene('RecordsScene'), { fill: COLORS.surfaceRaised, stroke: COLORS.queued, fontSize: '12px' });

      y += 74;
      this.cardPanel(x, y, frame.width - 32, Math.max(92, frame.height - y - 24), COLORS.line, 0.66);
      this.mono(x + 16, y + 14, 'RECENT RECORDS', { color: COLORS.text });
      const records = this.store.records.slice(0, 3);
      if (!records.length) {
        this.mono(x + 16, y + 48, 'No finished domains yet.', { color: COLORS.dim });
      } else {
        records.forEach((record, index) => {
          this.mono(x + 16, y + 42 + index * 22, `${record.result} / ${record.turns}T / ${record.damage} DMG`, {
            color: record.result === 'Victory' ? '#b7dbc0' : '#f1a0a0',
          });
        });
      }
      this.toast(frame);
    }
  }
