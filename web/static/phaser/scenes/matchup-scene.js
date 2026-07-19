import { TOKEN_TYPE } from '../core/runtime-config.js?v=35';
import { safeText } from '../core/text.js?v=35';
import {
  S3_COLORS,
  drawS3Button,
  drawS3Header,
  drawS3Panel,
  drawS3World,
} from '../ui/season-three-ui.js?v=35';
import { BaseScene } from './base-scene.js?v=35';

const MATCHUP_WORLD_KEY = 'culling-current-rooftop';

export class MatchupScene extends BaseScene {
    constructor() {
      super('MatchupScene');
    }

    matchupLayout(frame) {
      const x = frame.x + 10;
      const w = frame.width - 20;
      const header = { x, y: frame.top, w, h: 62 };
      header.bottom = header.y + header.h;
      const cta = { x, y: frame.bottom - 50, w, h: 50 };
      const status = { x, y: cta.y - 58, w, h: 50 };
      const player = { x, y: status.y - 190, w, h: 182 };
      const objective = { x, y: player.y - 78, w, h: 70 };
      const enemy = { x, y: objective.y - 190, w, h: 182 };
      const mode = { x, y: header.bottom + 8, w, h: 54 };
      return { frame, header, mode, enemy, objective, player, status, cta };
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
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: pending || waiting ? S3_COLORS.smoke : S3_COLORS.paper,
        accent: pending ? S3_COLORS.gold : waiting ? S3_COLORS.cyan : S3_COLORS.red,
        cut: 7,
        washAlpha: 0.16,
      });
      const lobbyMessage = this.store.lobbyStatus && this.store.lobbyStatus.message;
      const title = pending
        ? 'CONNECTING TO ARENA'
        : waiting
          ? 'WAITING FOR CHALLENGER'
          : isCpu
            ? 'BOTH TRIOS READY FOR SERVER CHECK'
            : 'YOUR TRIO IS READY TO JOIN';
      this.mono(region.x + 12, region.y + 8, title, {
        color: pending || waiting ? S3_COLORS.cyanText : S3_COLORS.inkText,
        fontSize: '12px',
        fontStyle: '900',
      });
      const subline = lobbyMessage
        ? safeText(lobbyMessage).slice(0, 44)
        : waiting
          ? `ROOM ${safeText(this.store.lobbyStatus && this.store.lobbyStatus.room_id, this.store.roomId).toUpperCase()}`
          : 'ROSTERS LOCK ONLY AFTER THE SERVER ACCEPTS THE MATCH';
      const sublineNode = this.mono(region.x + 12, region.y + 27, subline, {
        color: S3_COLORS.mutedText,
        fontSize: '9px',
        fontStyle: '800',
        lineSpacing: -1,
        wordWrap: { width: region.w - 24 },
      });
      sublineNode.setMaxLines(2);
    }

    render() {
      const frame = this.layout.frame();
      const layout = this.matchupLayout(frame);
      const isCpu = this.store.matchMode === 'cpu';
      const pending = !!this.store.matchLaunchPending;
      const waiting = !isCpu && !!(this.store.lobbyStatus && this.store.lobbyStatus.status !== 'cancelled');
      const enemyIds = isCpu ? this.store.enemyTeam.slice(0, 3) : [];
      this.clearSurface();
      drawS3World(this, frame, MATCHUP_WORLD_KEY, { imageAlpha: 0.46, washAlpha: 0.5 });
      drawS3Header(this, frame, {
        eyebrow: isCpu ? 'MATCHUP / CPU PRACTICE' : 'MATCHUP / PRIVATE ROOM',
        title: 'Ready To Enter',
        accent: waiting ? S3_COLORS.gold : S3_COLORS.cyan,
        backHandler: pending ? null : () => this.store.returnFromMatchup(),
      });
      this.renderMode(layout.mode, isCpu);
      this.renderTeam(layout.enemy, enemyIds, {
        label: isCpu ? 'RIVAL TRIO' : 'CHALLENGER TRIO',
        accent: S3_COLORS.red,
        enemy: true,
        hidden: !isCpu,
      });
      this.renderObjective(layout.objective, isCpu);
      this.renderTeam(layout.player, this.store.playerTeam.slice(0, 3), {
        label: 'YOUR TRIO',
        accent: S3_COLORS.cyan,
      });
      this.renderStatus(layout.status, isCpu, waiting, pending);

      const label = waiting
        ? 'Cancel Private Room'
        : pending
          ? 'Connecting To Arena...'
          : isCpu
            ? 'Enter Arena'
            : 'Join Private Room';
      drawS3Button(this, layout.cta.x, layout.cta.y, layout.cta.w, layout.cta.h, label, () => {
        if (waiting) this.store.resetToLobby();
        else this.store.startMatch();
      }, {
        variant: waiting ? 'bone' : pending ? 'smoke' : 'primary',
        accent: waiting ? S3_COLORS.red : pending ? S3_COLORS.gold : S3_COLORS.cyan,
        disabled: pending,
        fontSize: '18px',
      });
      this.toast(frame, { y: layout.status.y - 54, theme: 'light' });
      this.presentSurface(frame, { moteCount: 8, parallax: 4 });
    }
}
