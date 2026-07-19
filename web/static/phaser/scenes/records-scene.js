import { TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=36';
import { safeText, shortText } from '../core/text.js?v=36';
import {
  S3_COLORS,
  drawS3Button,
  drawS3Panel,
  drawS3Progress,
  drawS3World,
  outcomeVisual,
  recordsModel,
} from '../ui/season3-master-ui.js?v=36';
import { BaseScene } from './base-scene.js?v=36';

const STORM_WORLD_KEY = 'culling-current-campus';

function recordsComposition(frame) {
  const compact = frame.bottom - frame.top < 735;
  const gutter = frame.width <= 360 ? 10 : 12;
  const gap = compact ? 7 : 9;
  const x = frame.x + gutter;
  const w = frame.width - gutter * 2;
  const header = { x, y: frame.top, w, h: 58 };
  const profile = { x, y: header.y + header.h + gap, w, h: compact ? 204 : 228 };
  const summary = { x, y: profile.y + profile.h + gap, w, h: compact ? 64 : 70 };
  const pager = { x, y: frame.bottom - 46, w, h: 46 };
  const timelineY = summary.y + summary.h + gap + 20;
  const timeline = { x, y: timelineY, w, h: Math.max(104, pager.y - gap - timelineY), rowGap: 7 };
  timeline.rowH = compact ? 88 : 96;
  timeline.maxRows = Math.max(1, Math.min(3, Math.floor((timeline.h + timeline.rowGap) / (timeline.rowH + timeline.rowGap))));
  return { compact, header, profile, summary, timeline, pager };
}

function teamIds(record) {
  const raw = Array.isArray(record && record.team) ? record.team
    : Array.isArray(record && record.playerTeam) ? record.playerTeam
      : [];
  return raw.map((fighter) => typeof fighter === 'string' ? fighter : fighter && (fighter.character_id || fighter.id)).filter(Boolean).slice(0, 3);
}

function favoriteTrio(records, fallback) {
  const counts = new Map();
  (Array.isArray(records) ? records : []).forEach((record, index) => {
    const ids = teamIds(record);
    if (ids.length !== 3) return;
    const key = ids.join('|');
    const prior = counts.get(key) || { ids, count: 0, latest: Number.MAX_SAFE_INTEGER };
    prior.count += 1;
    prior.latest = Math.min(prior.latest, index);
    counts.set(key, prior);
  });
  const winner = [...counts.values()].sort((left, right) => right.count - left.count || left.latest - right.latest)[0];
  return winner ? winner.ids : (Array.isArray(fallback) ? fallback.slice(0, 3) : []);
}

function localRecordDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return 'RECENT MATCH';
  try {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
  } catch (_error) {
    return 'RECENT MATCH';
  }
}

export class RecordsScene extends BaseScene {
    constructor() {
      super('RecordsScene');
      this.recordsPage = 0;
      this.profileEntrancePlayed = false;
    }

    renderHeader(region) {
      this.graphics.fillStyle(S3_COLORS.bone, 0.94);
      this.graphics.fillRect(region.x, region.y, region.w, region.h);
      this.graphics.fillStyle(S3_COLORS.vermilion, 0.96);
      this.graphics.fillTriangle(region.x, region.y, region.x + Math.min(178, region.w * 0.52), region.y, region.x, region.y + region.h);
      this.mono(region.x + 12, region.y + 7, 'PLAYER PROFILE // DEVICE', {
        color: '#DDEBFF',
        fontSize: '10px',
        fontStyle: '900',
      });
      this.text(region.x + 12, region.y + 23, 'BATTLE RECORD', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        color: '#FFFFFF',
        fontSize: '23px',
        fontStyle: '900',
      });
      drawS3Button(this, region.x + region.w - 94, region.y + 7, 44, 44, 'SFX', () => this.togglePresentationSettings(), {
        variant: 'bone',
        accent: S3_COLORS.cyan,
        fontSize: '10px',
        mono: true,
      });
      drawS3Button(this, region.x + region.w - 46, region.y + 7, 44, 44, 'HOME', () => this.store.changeScene('LobbyScene'), {
        variant: 'primary',
        accent: S3_COLORS.vermilion,
        fontSize: '9px',
        mono: true,
      });
    }

    renderProfile(region, model, trio) {
      const g = this.graphics;
      g.fillStyle(S3_COLORS.ink, 0.24);
      g.fillRect(region.x, region.y, region.w, region.h);
      g.fillStyle(S3_COLORS.cyan, 0.12);
      g.fillTriangle(region.x, region.y, region.x + region.w, region.y, region.x + region.w, region.y + region.h * 0.6);
      g.lineStyle(2.5, S3_COLORS.cyan, 0.86);
      g.beginPath();
      g.moveTo(region.x, region.y);
      g.lineTo(region.x + region.w, region.y);
      g.strokePath();
      this.mono(region.x + 13, region.y + 10, 'LOCAL CURSOR IDENTITY', {
        color: '#FFFFFF',
        fontSize: '10px',
        fontStyle: '900',
        stroke: '#101828',
        strokeThickness: 3,
      });
      this.text(region.x + 13, region.y + 27, safeText(this.store.playerName, 'PLAYER').toUpperCase(), {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        color: '#FFFFFF',
        fontSize: region.w <= 340 ? '28px' : '32px',
        fontStyle: '900',
        stroke: '#101828',
        strokeThickness: 5,
      });
      this.mono(region.x + 14, region.y + 63, model.total
        ? `MOST DEPLOYED TRIO // ${model.total} RECORDED MATCH${model.total === 1 ? '' : 'ES'}`
        : 'CURRENT TRIO // BATTLE HISTORY STARTS AFTER YOUR FIRST MATCH', {
        color: '#EEF7FF',
        fontSize: '9px',
        fontStyle: '900',
        stroke: '#101828',
        strokeThickness: 3,
      });

      const portraitY = region.y + 84;
      const portraitH = region.h - 94;
      const overlap = 10;
      const portraitW = Math.min(128, (region.w - 24 + overlap * 2) / 3);
      const totalW = portraitW * 3 - overlap * 2;
      const startX = region.x + (region.w - totalW) / 2;
      const introNodes = [];
      trio.slice(0, 3).forEach((id, index) => {
        const x = startX + index * (portraitW - overlap);
        const y = portraitY + (index === 1 ? -5 : 3);
        const h = portraitH + (index === 1 ? 5 : -3);
        g.fillStyle(S3_COLORS.ink, 0.42);
        g.fillRect(x + 3, y + 4, portraitW, h);
        g.lineStyle(index === 1 ? 3 : 2, index === 1 ? S3_COLORS.gold : S3_COLORS.bone, 0.95);
        g.strokeRect(x, y, portraitW, h);
        const art = this.portraitArtwork(this.store.character(id), x + 3, y + 3, portraitW - 6, h - 6, {
          context: 'hero',
          tone: index === 1 ? S3_COLORS.gold : S3_COLORS.cyan,
        });
        if (art) {
          art.setDepth(2 + index);
          introNodes.push(art);
        }
      });
      if (!this.profileEntrancePlayed && this.presentationLayer) {
        this.profileEntrancePlayed = true;
        this.presentationLayer.sceneIntro(this, {
          targets: introNodes,
          options: { distance: 18, stagger: 80, duration: 320 },
        });
      }
    }

    renderSummary(region, model) {
      const decided = model.counts.win + model.counts.loss + model.counts.draw + model.counts.no_contest;
      const winRate = decided ? model.counts.win / decided : 0;
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.bone,
        accent: S3_COLORS.gold,
        cut: 9,
        washAlpha: 0.12,
      });
      this.text(region.x + 12, region.y + 8, `${Math.round(winRate * 100)}%`, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        color: S3_COLORS.text,
        fontSize: '28px',
        fontStyle: '900',
      });
      this.mono(region.x + 78, region.y + 13, 'WIN RATE', {
        color: '#9A211A',
        fontSize: '10px',
        fontStyle: '900',
      });
      this.mono(region.x + 78, region.y + 31, `${model.counts.win}W  ${model.counts.loss}L  ${model.counts.draw}D  ${model.counts.no_contest}NC`, {
        color: S3_COLORS.mutedText,
        fontSize: '10px',
        fontStyle: '800',
      });
      const progressX = region.x + Math.min(184, region.w * 0.55);
      this.mono(progressX, region.y + 7, model.fastestWin ? `FASTEST WIN // ${model.fastestWin}T` : 'FASTEST WIN // --', {
        color: S3_COLORS.text,
        fontSize: '9px',
        fontStyle: '900',
      });
      this.mono(progressX, region.y + 25, `BIGGEST HIT // ${model.biggestHit}`, {
        color: '#9A211A',
        fontSize: '9px',
        fontStyle: '900',
      });
      this.mono(progressX, region.y + 43, `TOTAL DAMAGE // ${model.totalDamage}`, {
        color: S3_COLORS.mutedText,
        fontSize: '9px',
        fontStyle: '800',
      });
      drawS3Progress(this, region.x + 12, region.y + region.h - 10, Math.max(72, progressX - region.x - 24), 6, winRate, { fill: S3_COLORS.cyan });
    }

    renderTimeline(region, model) {
      this.mono(region.x, region.y - 19, 'RECENT BATTLE TIMELINE // LATEST FIRST', {
        color: '#FFFFFF',
        fontSize: '10px',
        fontStyle: '900',
        stroke: '#101828',
        strokeThickness: 3,
      });
      if (!model.records.length) {
        drawS3Panel(this, region.x, region.y, region.w, Math.min(region.h, 92), {
          fill: S3_COLORS.bone,
          accent: S3_COLORS.smokeDeep,
          cut: 8,
        });
        this.text(region.x + 14, region.y + 20, 'No finished battles yet.', {
          fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
          color: S3_COLORS.text,
          fontSize: '18px',
          fontStyle: '900',
        });
        this.text(region.x + 14, region.y + 48, 'Your first authoritative result will appear here.', {
          color: S3_COLORS.mutedText,
          fontSize: '11px',
        });
        return;
      }

      const pageCount = Math.max(1, Math.ceil(model.records.length / region.maxRows));
      this.recordsPage = Math.max(0, Math.min(pageCount - 1, this.recordsPage));
      const start = this.recordsPage * region.maxRows;
      model.records.slice(start, start + region.maxRows).forEach((record, index) => {
        const y = region.y + index * (region.rowH + region.rowGap);
        const visual = outcomeVisual(record.outcome);
        drawS3Panel(this, region.x, y, region.w, region.rowH, {
          fill: S3_COLORS.bone,
          accent: visual.accent,
          cut: 8,
          strokeWidth: 2,
          washAlpha: 0.08,
        });
        this.text(region.x + 12, y + 8, safeText(record.result, 'Result').toUpperCase(), {
          fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
          color: record.outcome === 'loss' ? '#9A211A' : S3_COLORS.text,
          fontSize: '18px',
          fontStyle: '900',
        });
        this.mono(region.x + 12, y + 34, `${localRecordDate(record.at)} // ${Number(record.turns || 0)} TURNS // ${Number(record.damage || 0)} DMG`, {
          color: S3_COLORS.mutedText,
          fontSize: '9px',
          fontStyle: '800',
        });
        this.text(region.x + 12, y + 51, shortText(record.winner || 'Recorded match', 26), {
          color: S3_COLORS.text,
          fontSize: '11px',
          fontStyle: '700',
        }).setMaxLines(1);
        const impact = Array.isArray(record.biggest) ? record.biggest[0] : null;
        if (impact && region.rowH >= 88) {
          this.mono(region.x + 12, y + region.rowH - 21, `IMPACT // ${shortText(safeText(impact.message), 25)} // ${Number(impact.amount || 0)}`, {
            color: '#9A211A',
            fontSize: '9px',
            fontStyle: '900',
          });
        }
        const ids = teamIds(record);
        ids.forEach((id, portraitIndex) => {
          const size = Math.min(38, region.rowH - 18);
          const px = region.x + region.w - 12 - size - portraitIndex * (size - 5);
          this.graphics.fillStyle(S3_COLORS.smoke, 0.96);
          this.graphics.fillCircle(px + size / 2, y + region.rowH / 2, size / 2);
          this.portraitArtwork(this.store.character(id), px, y + (region.rowH - size) / 2, size, size, {
            context: 'square',
            tone: visual.accent,
          });
        });
      });
    }

    renderPager(region, model, rowCount) {
      const pageCount = Math.max(1, Math.ceil(model.records.length / Math.max(1, rowCount)));
      this.recordsPage = Math.max(0, Math.min(pageCount - 1, this.recordsPage));
      drawS3Button(this, region.x, region.y, 82, region.h, 'PREVIOUS', () => {
        this.recordsPage = Math.max(0, this.recordsPage - 1);
      }, {
        disabled: this.recordsPage === 0,
        variant: 'primary',
        accent: S3_COLORS.cyan,
        fontSize: '11px',
        mono: true,
      });
      this.mono(region.x + region.w / 2, region.y + 16, `ARCHIVE ${this.recordsPage + 1}/${pageCount}`, {
        color: '#FFFFFF',
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '900',
        stroke: '#101828',
        strokeThickness: 3,
      }).setOrigin(0.5, 0);
      drawS3Button(this, region.x + region.w - 82, region.y, 82, region.h, 'NEXT', () => {
        this.recordsPage = Math.min(pageCount - 1, this.recordsPage + 1);
      }, {
        disabled: this.recordsPage === pageCount - 1,
        variant: 'primary',
        accent: S3_COLORS.cyan,
        fontSize: '11px',
        mono: true,
      });
    }

    render() {
      const frame = this.layout.frame();
      const layout = recordsComposition(frame);
      this.clearSurface();
      drawS3World(this, frame, STORM_WORLD_KEY, { imageAlpha: 0.82, washAlpha: 0.18 });

      const model = recordsModel(this.store.records);
      const trio = favoriteTrio(this.store.records, this.store.playerTeam);
      this.renderHeader(layout.header);
      this.renderProfile(layout.profile, model, trio);
      this.renderSummary(layout.summary, model);
      this.renderTimeline(layout.timeline, model);
      this.renderPager(layout.pager, model, layout.timeline.maxRows);
      this.toast(frame, { y: layout.pager.y - 48, theme: 'light' });
      this.renderPresentationSettingsSheet(frame, { onExit: () => this.store.changeScene('LobbyScene') });
    }
  }
