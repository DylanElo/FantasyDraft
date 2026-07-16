import { COLORS } from '../core/runtime-config.js?v=19';
import { shortText } from '../core/text.js?v=19';
import { BaseScene } from './base-scene.js?v=19';

export class RecordsScene extends BaseScene {
    constructor() {
      super('RecordsScene');
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.worldBackdrop(frame, { textureKey: null, ambient: 'motes' });
      this.dossierHeader(frame, { eyebrow: 'CURSED CLASH', title: 'Records', backHandler: () => this.store.changeScene('LobbyScene') });
      const x = frame.x + frame.gutter;
      const records = this.store.records;
      const wins = records.filter((record) => record.result === 'Victory').length;
      const losses = records.filter((record) => record.result === 'Defeat').length;
      const totalDamage = records.reduce((total, record) => total + Number(record.damage || 0), 0);
      const fastestWin = records
        .filter((record) => record.result === 'Victory' && Number(record.turns || 0) > 0)
        .sort((a, b) => Number(a.turns || 0) - Number(b.turns || 0))[0];
      const biggestHit = records
        .flatMap((record) => record.biggest || [])
        .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];
      this.platePanel(x, 96, frame.width - 32, 76, COLORS.queued, { edgeBar: 'left' });
      this.text(x + 16, 116, `${wins}W / ${losses}L`, { fontSize: '27px', fontStyle: '900' });
      this.mono(x + 18, 148, 'Local device battle records', { color: COLORS.text });
      const summaryY = 188;
      const summaryW = (frame.width - 52) / 3;
      [
        { label: 'FASTEST WIN', value: fastestWin ? `${fastestWin.turns}T` : '--', tone: COLORS.selection },
        { label: 'BIGGEST HIT', value: biggestHit ? String(biggestHit.amount || 0) : '0', tone: COLORS.enemy },
        { label: 'TOTAL DAMAGE', value: String(totalDamage), tone: COLORS.ally },
      ].forEach((stat, index) => {
        const sx = x + index * (summaryW + 10);
        this.platePanel(sx, summaryY, summaryW, 66, stat.tone, { alpha: 0.85, cut: 5 });
        this.mono(sx + 9, summaryY + 12, stat.label, { color: COLORS.paperText, fontSize: '7px' });
        this.text(sx + 9, summaryY + 31, stat.value, { fontSize: '18px', fontStyle: '900' });
      });
      const y = 278;
      const maxRows = Math.max(3, Math.min(7, Math.floor((frame.height - 348) / 54)));
      if (!records.length) {
        this.mono(x, y, 'No finished battles yet.', { color: COLORS.muted });
      }
      records.slice(0, maxRows).forEach((record, index) => {
        const rowY = y + index * 54;
        this.platePanel(x, rowY, frame.width - 32, 44, record.result === 'Victory' ? COLORS.queued : COLORS.enemy, { alpha: 0.85, cut: 5, edgeBar: 'left' });
        this.mono(x + 14, rowY + 9, `${record.result} / ${record.turns} turns`, {
          color: record.result === 'Victory' ? '#b7dbc0' : '#f1a0a0',
        });
        this.mono(x + 190, rowY + 9, `${record.damage} dmg`, { color: COLORS.text });
        this.mono(x + 14, rowY + 26, shortText(record.winner || 'Domain record', 28), { color: COLORS.muted, fontSize: '8px' });
      });
      this.button(x, frame.height - 62, frame.width - 32, 44, 'Lobby', () => this.store.changeScene('LobbyScene'), {
        fill: COLORS.panel2,
        stroke: COLORS.ally,
      });
      this.toast(frame);
    }
  }
