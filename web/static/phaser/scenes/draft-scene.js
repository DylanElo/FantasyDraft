import { TOKEN_TYPE } from '../core/runtime-config.js?v=37';
import { safeText } from '../core/text.js?v=37';
import {
  S3_COLORS,
  drawS3Button,
  drawS3Header,
  drawS3Panel,
  drawS3World,
} from '../ui/season-three-ui.js?v=37';
import { DraftRosterScene } from './draft-roster-scene.js?v=37';

const TEAM_SETUP_WORLD_KEY = 'culling-current-campus';
const DIFFICULTIES = Object.freeze(['easy', 'normal', 'hard']);

export class DraftScene extends DraftRosterScene {
    constructor(key) {
      super(key || 'DraftScene');
    }

    renderSetupControls(region, teamKey) {
      if (this.store.matchMode !== 'cpu') {
        drawS3Panel(this, region.x, region.y, region.w, region.h, {
          fill: S3_COLORS.paper,
          accent: S3_COLORS.cyan,
          cut: 7,
          washAlpha: 0.18,
        });
        this.mono(region.x + 12, region.y + 8, 'PRIVATE ROOM / YOUR TRIO', {
          color: S3_COLORS.redText,
          fontSize: '11px',
          fontStyle: '900',
        });
        this.text(region.x + region.w - 12, region.y + 8, safeText(this.store.roomId, 'lobby').toUpperCase(), {
          fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
          color: S3_COLORS.inkText,
          fontSize: '16px',
          fontStyle: '900',
        }).setOrigin(1, 0);
        return;
      }

      const gap = 6;
      const buttonW = (region.w - gap * 2) / 3;
      drawS3Button(this, region.x, region.y, buttonW, region.h, 'My Trio', () => {
        this.store.setDraftTarget('playerTeam');
      }, {
        variant: teamKey === 'playerTeam' ? 'primary' : 'bone',
        accent: S3_COLORS.cyan,
        fontSize: '12px',
        mono: true,
      });
      drawS3Button(this, region.x + buttonW + gap, region.y, buttonW, region.h, 'CPU Trio', () => {
        this.store.setDraftTarget('enemyTeam');
      }, {
        variant: teamKey === 'enemyTeam' ? 'primary' : 'bone',
        accent: S3_COLORS.red,
        fontSize: '12px',
        mono: true,
      });
      const difficultyIndex = Math.max(0, DIFFICULTIES.indexOf(this.store.difficulty));
      drawS3Button(this, region.x + (buttonW + gap) * 2, region.y, buttonW, region.h, `Diff: ${this.store.difficulty}`, () => {
        this.store.setDifficulty(DIFFICULTIES[(difficultyIndex + 1) % DIFFICULTIES.length]);
      }, {
        variant: 'bone',
        accent: S3_COLORS.gold,
        fontSize: '11px',
        mono: true,
      });
    }

    render() {
      const frame = this.layout.frame();
      const isCpu = this.store.matchMode === 'cpu';
      const teamKey = this.activeTeamKey();
      const detail = this.store.detailCharacterId ? this.store.character(this.store.detailCharacterId) : null;
      this.clearSurface();
      drawS3World(this, frame, TEAM_SETUP_WORLD_KEY, {
        imageAlpha: detail ? 0.34 : 0.54,
        washAlpha: detail ? 0.58 : 0.48,
      });

      if (detail && detail.id) {
        this.renderSetupCharacterStudy(frame, detail, teamKey, (_layout, selected) => {
          drawS3Header(this, frame, {
            eyebrow: `TEAM SETUP / ${teamKey === 'enemyTeam' ? 'CPU' : 'PLAYER'} STUDY`,
            title: 'Character Study',
            accent: selected ? (teamKey === 'enemyTeam' ? S3_COLORS.red : S3_COLORS.cyan) : S3_COLORS.red,
            backHandler: () => this.store.closeCharacterDetail(),
          });
        });
        this.presentSurface(frame, { moteCount: 6, parallax: 2 });
        return;
      }

      const layout = this.teamSetupLayout(frame);
      drawS3Header(this, frame, {
        eyebrow: isCpu ? 'JJK ARENA / CPU PRACTICE' : 'JJK ARENA / PRIVATE ROOM',
        title: 'Team Setup',
        accent: teamKey === 'enemyTeam' ? S3_COLORS.red : S3_COLORS.cyan,
        backHandler: () => this.store.resetToLobby(),
      });
      this.renderSetupControls(layout.controls, teamKey);
      this.renderSetupTrio(layout, teamKey);
      this.renderSetupRosterBrowser(layout, teamKey);

      const ready = this.store.playerTeam.length === 3 && (!isCpu || this.store.enemyTeam.length === 3);
      const missing = Math.max(0, 3 - (this.store[teamKey] || []).length);
      drawS3Button(this, layout.cta.x, layout.cta.y, layout.cta.w, layout.cta.h, ready ? 'Review Matchup' : `Choose ${missing} More`, () => {
        this.store.openMatchup();
      }, {
        variant: ready ? 'primary' : 'smoke',
        accent: ready ? S3_COLORS.cyan : S3_COLORS.red,
        disabled: !ready,
        fontSize: '18px',
      });
      this.toast(frame, { y: layout.toastY, theme: 'light' });
      this.presentSurface(frame, { moteCount: 7, parallax: 3 });
    }
}
