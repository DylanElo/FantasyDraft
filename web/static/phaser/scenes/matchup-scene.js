import { TOKEN_TYPE } from '../core/runtime-config.js?v=58';
import { safeText } from '../core/text.js?v=58';
import { IncidentCutLayouts, Season3UI } from '../ui/season3-ui.js?v=58';
import { BaseScene } from './base-scene.js?v=58';

const {
  colors: S3_COLORS,
  button: drawS3Button,
  header: drawS3Header,
  panel: drawS3Panel,
  world: drawS3World,
} = Season3UI.flow;

const MATCHUP_WORLD_KEY = 'culling-current-rooftop';

export class MatchupScene extends BaseScene {
    constructor() {
      super('MatchupScene');
    }

    matchupLayout(frame) {
      return IncidentCutLayouts.matchup(frame);
    }

    overlayRect(x, y, w, h, color, alpha = 1) {
      const node = this.add.rectangle(x, y, w, h, color, alpha).setOrigin(0, 0);
      this.nodes.push(node);
      return node;
    }

    renderMode(region, isCpu) {
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.bone,
        accent: isCpu ? S3_COLORS.gold : S3_COLORS.cyan,
        cut: 8,
        washAlpha: 0.2,
      });
      this.mono(region.x + 12, region.y + 8, isCpu ? 'CPU PRACTICE' : 'PRIVATE ROOM', {
        color: S3_COLORS.redText,
        fontSize: '11px',
        fontStyle: '900',
      });
      this.text(region.x + 12, region.y + 24, isCpu ? `${safeText(this.store.difficulty, 'normal').toUpperCase()} DIFFICULTY` : safeText(this.store.roomId, 'lobby').toUpperCase(), {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
        color: S3_COLORS.inkText,
        fontSize: '17px',
        fontStyle: '900',
      });
      this.mono(region.x + region.w - 12, region.y + 8, isCpu ? 'SERVER-SIMULATED RIVAL' : 'OPPONENT ROSTER HIDDEN', {
        color: S3_COLORS.cyanText,
        fontSize: '11px',
        fontStyle: '900',
      }).setOrigin(1, 0);
    }

    renderTeam(region, teamIds, options = {}) {
      const hidden = !!options.hidden;
      const accent = options.accent || S3_COLORS.cyan;
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.paper,
        accent,
        cut: 10,
        wash: false,
        hatch: false,
        strokeWidth: 2.5,
      });
      this.mono(region.x + 11, region.y + 8, options.label || 'TRIO', {
        color: options.enemy ? S3_COLORS.redText : S3_COLORS.cyanText,
        fontSize: '12px',
        fontStyle: '900',
      });
      if (hidden) {
        this.mono(region.x + region.w - 11, region.y + 8, 'IDENTITY SEALED', {
          color: S3_COLORS.mutedText,
          fontSize: '11px',
          fontStyle: '900',
        }).setOrigin(1, 0);
      }

      const gap = 7;
      const inset = 8;
      const cardY = region.y + 28;
      const cardH = region.h - 36;
      const cardW = (region.w - inset * 2 - gap * 2) / 3;
      [0, 1, 2].forEach((index) => {
        const x = region.x + inset + index * (cardW + gap);
        const id = teamIds[index];
        drawS3Panel(this, x, cardY, cardW, cardH, {
          fill: hidden || !id ? S3_COLORS.smoke : S3_COLORS.paper,
          accent,
          cut: 6,
          wash: hidden || !id,
          hatch: hidden,
          strokeWidth: 2,
          shadowAlpha: 0.08,
        });

        if (hidden || !id) {
          this.text(x + cardW / 2, cardY + 31, '?', {
            fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
            color: options.enemy ? S3_COLORS.redText : S3_COLORS.cyanText,
            fontSize: '36px',
            fontStyle: '900',
          }).setOrigin(0.5, 0);
          this.mono(x + cardW / 2, cardY + cardH - 30, hidden ? 'HIDDEN' : `SLOT ${index + 1}`, {
            color: S3_COLORS.mutedText,
            fontSize: '11px',
            fontStyle: '900',
          }).setOrigin(0.5, 0);
          return;
        }

        const character = this.store.character(id);
        this.portraitArtwork(character, x + 3, cardY + 3, cardW - 6, cardH - 6, {
          context: 'hero',
          tone: accent,
        });
        const bandH = 48;
        this.overlayRect(x + 3, cardY + cardH - bandH - 3, cardW - 6, bandH, S3_COLORS.bone, 0.95);
        this.overlayRect(x + 3, cardY + cardH - bandH - 3, cardW - 6, 3, accent, 0.96);
        this.mono(x + 7, cardY + 7, `0${index + 1}`, {
          backgroundColor: options.enemy ? '#B91F1A' : '#101B36',
          color: S3_COLORS.whiteText,
          fontSize: '10px',
          fontStyle: '900',
          padding: { x: 4, y: 2 },
        });
        const name = this.text(x + cardW / 2, cardY + cardH - bandH + 2, safeText(character.name, id), {
          color: S3_COLORS.inkText,
          fontSize: '12px',
          fontStyle: '900',
          align: 'center',
          lineSpacing: -1,
          wordWrap: { width: cardW - 8 },
        }).setOrigin(0.5, 0);
        name.setMaxLines(3);
      });
    }

    renderObjective(region, isCpu) {
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.bone,
        accent: S3_COLORS.gold,
        cut: 12,
        washAlpha: 0.12,
        hatch: false,
        strokeWidth: 2.5,
      });
      this.mono(region.x + region.w / 2, region.y + 8, 'MATCH OBJECTIVE', {
        color: S3_COLORS.redText,
        fontSize: '11px',
        fontStyle: '900',
      }).setOrigin(0.5, 0);
      this.text(region.x + region.w / 2, region.y + 23, 'DEFEAT ALL THREE', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
        color: S3_COLORS.inkText,
        fontSize: '21px',
        fontStyle: '900',
      }).setOrigin(0.5, 0);
      this.mono(region.x + region.w / 2, region.y + 51, isCpu ? 'CLASSIC 3V3 / SERVER RESOLUTION' : 'PRIVATE 3V3 / SERVER AUTHORITATIVE', {
        color: S3_COLORS.cyanText,
        fontSize: '11px',
        fontStyle: '900',
      }).setOrigin(0.5, 0);
    }

    renderStatus(region, isCpu, waiting, pending) {
      const connectionError = safeText(this.store.matchLaunchError);
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: connectionError || pending || waiting ? S3_COLORS.smoke : S3_COLORS.paper,
        accent: connectionError ? S3_COLORS.red : pending ? S3_COLORS.gold : waiting ? S3_COLORS.cyan : S3_COLORS.red,
        cut: 7,
        washAlpha: 0.16,
      });
      const lobbyMessage = this.store.lobbyStatus && this.store.lobbyStatus.message;
      const title = connectionError
        ? 'ARENA ENTRY FAILED'
        : pending
          ? 'CONNECTING TO ARENA'
          : waiting
            ? 'WAITING FOR CHALLENGER'
            : isCpu
              ? 'BOTH TRIOS READY FOR SERVER CHECK'
              : 'YOUR TRIO IS READY TO JOIN';
      this.mono(region.x + 12, region.y + 8, title, {
        color: connectionError ? S3_COLORS.redText : pending || waiting ? S3_COLORS.cyanText : S3_COLORS.inkText,
        fontSize: '12px',
        fontStyle: '900',
      });
      const subline = connectionError
        || (lobbyMessage
          ? safeText(lobbyMessage).slice(0, 44)
          : waiting
            ? `ROOM ${safeText(this.store.lobbyStatus && this.store.lobbyStatus.room_id, this.store.roomId).toUpperCase()}`
            : 'ROSTERS LOCK ONLY AFTER THE SERVER ACCEPTS THE MATCH');
      const sublineNode = this.mono(region.x + 12, region.y + 27, subline, {
        color: S3_COLORS.mutedText,
        fontSize: '10px',
        fontStyle: '800',
        lineSpacing: -1,
        wordWrap: { width: region.w - 24 },
      });
      sublineNode.setMaxLines(2);
    }

    renderConfrontation(region, enemyIds, hidden, isCpu) {
      const g = this.graphics;
      const midY = region.y + region.h * 0.51;
      g.fillStyle(S3_COLORS.red, 0.14);
      g.fillTriangle(region.x, region.y, region.x + region.w, region.y, region.x + region.w, midY + 18);
      g.fillStyle(S3_COLORS.cyan, 0.12);
      g.fillTriangle(region.x, midY - 18, region.x + region.w, region.bottom, region.x, region.bottom);
      g.lineStyle(4, S3_COLORS.bone, 0.86);
      g.beginPath(); g.moveTo(region.x - 8, midY + 22); g.lineTo(region.x + region.w + 8, midY - 22); g.strokePath();
      g.lineStyle(2, S3_COLORS.red, 0.9);
      g.beginPath(); g.moveTo(region.x - 8, midY + 16); g.lineTo(region.x + region.w + 8, midY - 28); g.strokePath();

      const drawTrio = (ids, enemy, sealed) => {
        const top = enemy ? region.y + 22 : midY + 10;
        const areaH = region.h * 0.43;
        const cropW = region.w * 0.39;
        const cropH = areaH * 0.9;
        [0, 1, 2].forEach((index) => {
          const x = region.x + (enemy ? index * region.w * 0.29 - 6 : region.w - cropW - index * region.w * 0.29 + 6);
          const y = top + (index === 1 ? -8 : 10);
          const id = ids[index];
          if (sealed || !id) {
            g.fillStyle(S3_COLORS.ink, 0.82); g.fillPoints([{ x: x + 10, y }, { x: x + cropW, y: y + 8 }, { x: x + cropW - 12, y: y + cropH }, { x, y: y + cropH - 10 }], true);
            this.text(x + cropW / 2, y + cropH * 0.34, '?', { fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif', fontSize: '42px', fontStyle: '900', color: S3_COLORS.mutedText }).setOrigin(0.5, 0);
            return;
          }
          const character = this.store.character(id);
          this.portraitArtwork(character, x, y, cropW, cropH, { context: 'hero', alpha: index === 1 ? 1 : 0.9, depth: index === 1 ? 1 : 0 });
          g.lineStyle(index === 1 ? 3 : 1.5, enemy ? S3_COLORS.red : S3_COLORS.cyan, 0.9);
          g.beginPath(); g.moveTo(x + 4, y + cropH - 4); g.lineTo(x + cropW - 4, y + cropH - 14); g.strokePath();
          this.mono(x + 4, y + cropH - 22, `0${index + 1} ${safeText(character.name, id).toUpperCase().slice(0, 14)}`, { color: S3_COLORS.whiteText, backgroundColor: enemy ? '#B91F1A' : '#101B36', fontSize: '9px', fontStyle: '900', padding: { x: 3, y: 2 } });
        });
      };
      drawTrio(enemyIds, true, hidden);
      drawTrio(this.store.playerTeam.slice(0, 3), false, false);
      this.mono(region.x + 12, region.y + 8, hidden ? 'CHALLENGER / IDENTITIES SEALED' : 'RIVAL TRIO', { color: S3_COLORS.redText, fontSize: '11px', fontStyle: '900', backgroundColor: '#F2E8D5', padding: { x: 4, y: 2 } });
      this.mono(region.x + region.w - 12, region.bottom - 24, 'YOUR TRIO', { color: S3_COLORS.cyanText, fontSize: '11px', fontStyle: '900', backgroundColor: '#F2E8D5', padding: { x: 4, y: 2 } }).setOrigin(1, 0);
      this.text(region.x + region.w / 2, midY - 24, 'VS', { fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif', fontSize: '40px', fontStyle: '900', color: S3_COLORS.inkText, stroke: S3_COLORS.bone, strokeThickness: 5 }).setOrigin(0.5, 0);
      this.mono(region.x + region.w / 2, midY + 18, isCpu ? 'CPU PRACTICE' : 'PRIVATE PVP', { color: S3_COLORS.inkText, backgroundColor: '#D8BF68', fontSize: '10px', fontStyle: '900', padding: { x: 5, y: 2 } }).setOrigin(0.5, 0);
    }

    render() {
      const frame = this.layout.frame();
      const layout = this.matchupLayout(frame);
      const isCpu = this.store.matchMode === 'cpu';
      const pending = !!this.store.matchLaunchPending;
      const connectionError = !!this.store.matchLaunchError;
      const waiting = !isCpu && !!(this.store.lobbyStatus && this.store.lobbyStatus.status !== 'cancelled');
      const enemyIds = isCpu ? this.store.enemyTeam.slice(0, 3) : [];
      const hidden = !isCpu;
      this.clearSurface();
      drawS3World(this, frame, MATCHUP_WORLD_KEY, { imageAlpha: 0.46, washAlpha: 0.5 });
      drawS3Header(this, frame, {
        eyebrow: isCpu ? 'MATCHUP / CPU PRACTICE' : 'MATCHUP / PRIVATE ROOM',
        title: 'Ready To Enter',
        accent: waiting ? S3_COLORS.gold : S3_COLORS.cyan,
        backHandler: pending ? null : () => this.store.returnFromMatchup(),
      });
      this.renderConfrontation(layout.confrontation, enemyIds, hidden, isCpu);
      this.renderStatus(layout.status, isCpu, waiting, pending);

      const label = waiting
        ? 'Cancel Private Room'
        : pending
          ? 'Connecting To Arena...'
          : connectionError
            ? 'Retry Arena Entry'
            : isCpu
              ? 'Enter Arena'
              : 'Join Private Room';
      drawS3Button(this, layout.cta.x, layout.cta.y, layout.cta.w, layout.cta.h, label, () => {
        if (waiting) this.store.resetToLobby();
        else this.store.startMatch();
      }, {
        variant: waiting || connectionError ? 'bone' : pending ? 'smoke' : 'primary',
        accent: waiting || connectionError ? S3_COLORS.red : pending ? S3_COLORS.gold : S3_COLORS.cyan,
        disabled: pending,
        fontSize: '18px',
      });
      this.toast(frame, { y: layout.status.y - 54, theme: 'light' });
      this.presentSurface(frame, { moteCount: 8, parallax: 4 });
    }
}
