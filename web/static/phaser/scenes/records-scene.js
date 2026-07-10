/* RECORDS — local battle record: big W/L display numeral, three stat
   tiles, recent battle rows. */

import { COLORS } from '../core/runtime-config.js?v=18';
import { shortText } from '../core/text.js?v=18';
import { BaseScene } from './base-scene.js?v=18';
import { drawBladePlate } from '../components/plate.js?v=18';

export class RecordsScene extends BaseScene {
    constructor() {
      super('RecordsScene');
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      this.kanjiWatermark(frame, '録');
      this.layer();
      const x = frame.x + frame.gutter;
      const w = frame.width - frame.gutter * 2;

      this.iconButton(frame.x + frame.width - frame.gutter - 44, 14, 44, 38, '<', () => this.store.changeScene('LobbyScene'));
      this.skewTag(x, 16, 'Local Battle Record', { fontSize: 10 });
      this.display(x, 40, 'Records', 28);

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

      // Headline W/L plate.
      this.platePanel(x, 90, w, 76);
      this.display(x + 16, 104, `${wins}W · ${losses}L`, 30, { color: COLORS.goldTextSoft });
      this.text(x + 18, 142, 'Battles recorded on this device', {
        fontSize: '10px', fontStyle: '500', color: COLORS.muted,
      });

      // Stat tiles.
      const tileY = 182;
      const tileW = (w - 20) / 3;
      [
        { label: 'Fastest Win', value: fastestWin ? `${fastestWin.turns}T` : '--' },
        { label: 'Biggest Hit', value: biggestHit ? String(biggestHit.amount || 0) : '0' },
        { label: 'Total Damage', value: String(totalDamage) },
      ].forEach((stat, index) => {
        const sx = x + index * (tileW + 10);
        drawBladePlate(this.graphics, sx, tileY, tileW, 64, {
          fillTop: COLORS.ink700,
          fillBottom: COLORS.ink800,
          cut: 12,
        });
        this.label(sx + 10, tileY + 10, stat.label, 7, { color: COLORS.dim });
        this.stat(sx + 10, tileY + 28, stat.value, 18, { color: COLORS.text });
      });

      // Recent battles.
      const y = 270;
      const maxRows = Math.max(3, Math.min(7, Math.floor((frame.height - y - 90) / 54)));
      if (!records.length) {
        this.text(x, y + 6, 'No finished battles yet.', { fontSize: '11px', color: COLORS.muted });
      }
      records.slice(0, maxRows).forEach((record, index) => {
        const rowY = y + index * 54;
        const victory = record.result === 'Victory';
        drawBladePlate(this.graphics, x, rowY, w, 46, {
          fillTop: COLORS.ink800,
          fillBottom: COLORS.ink900,
          cut: 10,
        });
        this.skewTag(x + 10, rowY + 8, record.result, {
          fontSize: 7, height: 15, padX: 6,
          bg: victory ? COLORS.gold400 : COLORS.ink700,
          color: victory ? '#0E0B16' : COLORS.redText,
        });
        this.text(x + 96, rowY + 9, shortText(record.winner || 'Battle record', 24), {
          fontSize: '10px', fontStyle: '700',
        });
        this.stat(x + w - 14, rowY + 12, `${record.turns}T · ${record.damage} DMG`, 10, { color: COLORS.muted }).setOrigin(1, 0);
        this.label(x + 96, rowY + 27, victory ? 'Victory registered' : 'Route uncleared', 7, {
          color: victory ? COLORS.goldTextSoft : COLORS.dim,
        });
      });

      this.plateButton(x, frame.height - 62, w, 46, 'Lobby', () => this.store.changeScene('LobbyScene'), {
        tone: 'ink', fontSize: 13,
      });
      this.toast(frame);
    }
  }
