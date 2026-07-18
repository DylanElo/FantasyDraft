import { TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=27';
import { safeText, shortText } from '../core/text.js?v=27';
import {
  S3_COLORS,
  drawS3Button,
  drawS3Panel,
  drawS3Tag,
  drawS3World,
  outcomeVisual,
  recordsLayout,
  recordsModel,
} from '../ui/season3-master-ui.js?v=27';
import { BaseScene } from './base-scene.js?v=27';

const STORM_WORLD_KEY = 'culling-current-campus';

export class RecordsScene extends BaseScene {
    constructor() {
      super('RecordsScene');
      this.recordsPage = 0;
    }

    renderHeader(region) {
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.bone,
        accent: S3_COLORS.barrier,
        alpha: 0.96,
        cut: 10,
      });
      this.mono(region.x + 14, region.y + 10, 'LOCAL RECORD // DEVICE', {
        color: S3_COLORS.barrier,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '800',
      });
      this.text(region.x + 14, region.y + 29, 'BATTLE ARCHIVE', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: region.h < 70 ? '21px' : '24px',
        fontStyle: '900',
        color: S3_COLORS.text,
      });
      drawS3Button(this, region.x + region.w - 76, region.y + 10, 64, 44, 'HOME', () => this.store.changeScene('LobbyScene'), {
        fill: S3_COLORS.inkBlue,
        accent: S3_COLORS.cyan,
        fontSize: '14px',
      });
    }

    renderOverview(region, model) {
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.bone,
        accent: S3_COLORS.gold,
        alpha: 0.95,
        cut: 12,
      });
      this.text(region.x + 14, region.y + 12, `${model.total} MATCH${model.total === 1 ? '' : 'ES'}`, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: '24px',
        fontStyle: '900',
        color: S3_COLORS.text,
      });
      this.text(region.x + 14, region.y + region.h - 25, 'Stored only on this device', {
        color: S3_COLORS.mutedText,
        fontSize: `${TYPE_SCALE.label}px`,
      });

      const countText = `${model.counts.win}W  /  ${model.counts.loss}L  /  ${model.counts.draw}D  /  ${model.counts.no_contest}NC`;
      drawS3Tag(this, region.x + region.w - Math.min(190, region.w * 0.53) - 12, region.y + 12, countText, {
        w: Math.min(190, region.w * 0.53),
        h: 24,
        fill: S3_COLORS.ink,
        stroke: S3_COLORS.cyan,
        fontSize: '11px',
      });
    }

    renderStats(region, model) {
      const gap = 8;
      const cardW = (region.w - gap * 2) / 3;
      [
        { label: 'FASTEST WIN', value: model.fastestWin ? `${model.fastestWin}T` : '--', accent: S3_COLORS.gold },
        { label: 'BIGGEST HIT', value: String(model.biggestHit), accent: S3_COLORS.vermilion },
        { label: 'TOTAL DAMAGE', value: String(model.totalDamage), accent: S3_COLORS.cyan },
      ].forEach((stat, index) => {
        const x = region.x + index * (cardW + gap);
        drawS3Panel(this, x, region.y, cardW, region.h, {
          fill: S3_COLORS.bone,
          accent: stat.accent,
          alpha: 0.95,
          cut: 8,
          strokeWidth: 2,
        });
        this.mono(x + 9, region.y + 11, stat.label, {
          color: S3_COLORS.mutedText,
          fontSize: `${TYPE_SCALE.label}px`,
          fontStyle: '800',
        });
        this.text(x + 9, region.y + 34, stat.value, {
          fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
          fontSize: stat.value.length > 7 ? '15px' : '20px',
          fontStyle: '900',
          color: S3_COLORS.text,
        });
      });
    }

    renderRecordRows(region, model) {
      this.mono(region.x, region.y - 23, 'RECENT MATCHES // LATEST FIRST', {
        color: S3_COLORS.text,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '800',
      });
      if (!model.records.length) {
        drawS3Panel(this, region.x, region.y, region.w, Math.min(82, region.rowH + 24), {
          fill: S3_COLORS.bone,
          accent: S3_COLORS.smokeDeep,
          alpha: 0.94,
        });
        this.text(region.x + 14, region.y + 24, 'No finished battles yet.', {
          color: S3_COLORS.mutedText,
          fontSize: `${TYPE_SCALE.body}px`,
          fontStyle: '700',
        });
        return;
      }

      const pageCount = Math.max(1, Math.ceil(model.records.length / Math.max(1, region.maxRows)));
      this.recordsPage = Math.max(0, Math.min(pageCount - 1, this.recordsPage));
      const start = this.recordsPage * region.maxRows;
      model.records.slice(start, start + region.maxRows).forEach((record, index) => {
        const y = region.y + index * (region.rowH + region.rowGap);
        const visual = outcomeVisual(record.outcome);
        drawS3Panel(this, region.x, y, region.w, region.rowH, {
          fill: record.outcome === 'no_contest' ? S3_COLORS.smoke : S3_COLORS.bone,
          accent: visual.accent,
          alpha: 0.95,
          cut: 8,
          strokeWidth: 2,
        });
        const resultLabel = safeText(record.result, 'Result');
        this.text(region.x + 12, y + 8, resultLabel.toUpperCase(), {
          fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
          color: record.outcome === 'loss' ? '#9A211A' : S3_COLORS.text,
          fontSize: `${TYPE_SCALE.body}px`,
          fontStyle: '900',
        });
        this.mono(region.x + 108, y + 10, `${Number(record.turns || 0)} TURNS`, {
          color: S3_COLORS.mutedText,
          fontSize: `${TYPE_SCALE.label}px`,
          fontStyle: '800',
        });
        this.mono(region.x + region.w - 72, y + 10, `${Number(record.damage || 0)} DMG`, {
          color: record.outcome === 'loss' ? '#9A211A' : S3_COLORS.text,
          fontSize: `${TYPE_SCALE.label}px`,
          fontStyle: '800',
        });
        this.text(region.x + 12, y + 30, shortText(record.winner || 'Recorded match', region.w < 350 ? 30 : 38), {
          color: S3_COLORS.mutedText,
          fontSize: `${TYPE_SCALE.label}px`,
        });
      });
    }

    renderPager(region, model, rowCount) {
      const pageCount = Math.max(1, Math.ceil(model.records.length / Math.max(1, rowCount)));
      this.recordsPage = Math.max(0, Math.min(pageCount - 1, this.recordsPage));
      drawS3Button(this, region.x, region.y, 72, region.h, 'PREV', () => {
        this.recordsPage = Math.max(0, this.recordsPage - 1);
      }, {
        disabled: this.recordsPage === 0,
        fill: S3_COLORS.inkBlue,
        accent: S3_COLORS.cyan,
        fontSize: '12px',
      });
      this.mono(region.x + region.w / 2, region.y + 16, `ARCHIVE ${this.recordsPage + 1}/${pageCount}`, {
        color: S3_COLORS.text,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '800',
      }).setOrigin(0.5, 0);
      drawS3Button(this, region.x + region.w - 72, region.y, 72, region.h, 'NEXT', () => {
        this.recordsPage = Math.min(pageCount - 1, this.recordsPage + 1);
      }, {
        disabled: this.recordsPage === pageCount - 1,
        fill: S3_COLORS.inkBlue,
        accent: S3_COLORS.cyan,
        fontSize: '12px',
      });
    }

    render() {
      const frame = this.layout.frame();
      const layout = recordsLayout(frame);
      this.clearSurface();
      drawS3World(this, frame, STORM_WORLD_KEY, { topAlpha: 0.4, bottomAlpha: 0.82 });

      const model = recordsModel(this.store.records);
      this.renderHeader(layout.header);
      this.renderOverview(layout.overview, model);
      this.renderStats(layout.stats, model);
      this.renderRecordRows(layout.list, model);
      this.renderPager(layout.pager, model, layout.list.maxRows);
      drawS3Button(this, layout.lobby.x, layout.lobby.y, layout.lobby.w, layout.lobby.h, 'RETURN HOME', () => this.store.changeScene('LobbyScene'), {
        fill: S3_COLORS.inkBlue,
        accent: S3_COLORS.vermilion,
      });
      this.toast(frame, { y: layout.lobby.y - 48, theme: 'light' });
    }
  }
