import { TYPE_SCALE, TOKEN_TYPE } from '../core/runtime-config.js?v=28';
import { clamp, safeText } from '../core/text.js?v=28';
import {
  S3_COLORS,
  draftS3Layout,
  drawS3Button,
  drawS3Chip,
  drawS3Cost,
  drawS3Header,
  drawS3Pager,
  drawS3Panel,
  drawS3Portrait,
  drawS3World,
} from '../ui/season-three-ui.js?v=28';
import { DraftRosterScene } from './draft-roster-scene.js?v=28';

const DRAFT_WORLD_KEY = 'culling-current-campus';

export class DraftScene extends DraftRosterScene {
    constructor(key) {
      super(key || 'DraftScene');
    }

    renderS3Section(x, y, label, right, accent = S3_COLORS.red) {
      this.mono(x, y, label, {
        color: S3_COLORS.inkText,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '900',
      });
      const lineStart = Math.min(right - 18, x + Math.max(90, label.length * 7 + 16));
      this.graphics.lineStyle(2, accent, 0.72);
      this.graphics.beginPath();
      this.graphics.moveTo(lineStart, y + 6);
      this.graphics.lineTo(right, y + 6);
      this.graphics.strokePath();
    }

    renderTeamSummary(region, team, options = {}) {
      const accent = options.accent || S3_COLORS.cyan;
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: options.fill || S3_COLORS.paper,
        accent,
        cut: 8,
        washAlpha: 0.18,
      });
      this.mono(region.x + 10, region.y + 6, options.label || 'TEAM', {
        color: options.labelColor || S3_COLORS.inkText,
        fontSize: '12px',
        fontStyle: '900',
      });
      const slotW = (region.w - 44) / 3;
      team.slice(0, 3).forEach((id, index) => {
        const character = this.store.character(id);
        const x = region.x + 9 + index * (slotW + 13);
        drawS3Portrait(this, character, x, region.y + 23, 30, 30, { accent, selected: options.selected });
        const name = this.text(x + 36, region.y + 24, safeText(character.name, id), {
          color: S3_COLORS.inkText,
          fontSize: '10px',
          fontStyle: '900',
          lineSpacing: 0,
          wordWrap: { width: slotW - 37 },
        });
        // Variant-bearing starter names can require a third compact line at
        // 360px (for example Kokichi / Mechamaru and JJK0 Yuta).
        name.setMaxLines(3);
      });
    }

    renderDifficulty(region) {
      const gap = 6;
      const buttonW = (region.w - gap * 2) / 3;
      ['easy', 'normal', 'hard'].forEach((level, index) => {
        const active = this.store.difficulty === level;
        drawS3Button(this, region.x + index * (buttonW + gap), region.y, buttonW, region.h, level.toUpperCase(), () => this.store.setDifficulty(level), {
          variant: active ? 'primary' : 'bone',
          accent: active ? S3_COLORS.cyan : S3_COLORS.red,
          fontSize: '12px',
          mono: true,
        });
      });
    }

    renderRosterCard(character, x, y, w, h, teamKey) {
      const selected = this.store[teamKey].includes(character.id);
      const accent = selected ? (teamKey === 'playerTeam' ? S3_COLORS.cyan : S3_COLORS.red) : S3_COLORS.gold;
      drawS3Panel(this, x, y, w, h, {
        fill: selected ? 0xe1eee9 : S3_COLORS.paper,
        accent,
        strokeWidth: selected ? 3 : 1.5,
        cut: 7,
        washAlpha: selected ? 0.14 : 0.24,
      });
      drawS3Portrait(this, character, x + 8, y + 8, 40, 40, { accent, selected });
      const name = this.text(x + 55, y + 7, character.name, {
        color: S3_COLORS.inkText,
        fontSize: w < 175 ? '12px' : '13px',
        fontStyle: '900',
        lineSpacing: 0,
        wordWrap: { width: w - 62 },
      });
      name.setMaxLines(2);
      const role = this.text(x + 9, y + 51, character.role || 'Starter sorcerer', {
        color: S3_COLORS.mutedText,
        fontSize: `${TYPE_SCALE.label}px`,
        lineSpacing: 0,
        wordWrap: { width: w - 18 },
      });
      role.setMaxLines(2);
      const firstSkill = ((character.skills || [])[0] || {});
      drawS3Cost(this, x + 17, y + h - 14, firstSkill.cost || [], { size: 12, gap: 4 });
      const skillName = this.text(x + 50, y + h - 32, firstSkill.name || 'Technique', {
        color: selected ? S3_COLORS.cyanText : S3_COLORS.inkText,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '800',
        lineSpacing: 0,
        wordWrap: { width: w - 58 },
      });
      skillName.setMaxLines(2);
      if (selected) {
        drawS3Chip(this, x + w - 58, y + 50, teamKey === 'playerTeam' ? 'MY TRIO' : 'CPU', {
          w: 50,
          h: 20,
          fill: teamKey === 'playerTeam' ? S3_COLORS.cyanDeep : S3_COLORS.red,
          stroke: accent,
          fontSize: '11px',
        });
      }
      this.registerHitTarget(x, y, w, h, `Roster ${character.name}`, () => this.store.toggleTeamPick(teamKey, character.id));
    }

    render() {
      const frame = this.layout.frame();
      const isCpu = this.store.matchMode === 'cpu';
      const layout = draftS3Layout(frame, { cpu: isCpu });
      const activeTarget = isCpu && this.store.draftTarget === 'enemyTeam' ? 'enemyTeam' : 'playerTeam';
      this.clearSurface();
      drawS3World(this, frame, DRAFT_WORLD_KEY, { imageAlpha: 0.48, washAlpha: 0.7 });
      drawS3Header(this, frame, {
        eyebrow: isCpu ? 'JJK ARENA / CPU MATCHUP' : 'JJK ARENA / PRIVATE ROOM',
        title: 'Draft Your Trio',
        backHandler: () => this.store.resetToLobby(),
      });

      this.renderTeamSummary(layout.player, this.store.playerTeam, {
        label: isCpu ? 'PLAYER TRIO' : 'YOUR PRIVATE-ROOM TRIO',
        accent: S3_COLORS.cyan,
        selected: activeTarget === 'playerTeam',
      });
      if (layout.enemy) {
        this.renderTeamSummary(layout.enemy, this.store.enemyTeam, {
          label: 'CPU TRIO',
          accent: S3_COLORS.red,
          fill: S3_COLORS.bone,
          selected: activeTarget === 'enemyTeam',
        });
      }
      if (layout.difficulty) this.renderDifficulty(layout.difficulty);

      const targetW = (layout.targets.w - 8) / 2;
      drawS3Button(this, layout.targets.x, layout.targets.y, targetW, layout.targets.h, 'Edit Player', () => this.store.setDraftTarget('playerTeam'), {
        variant: activeTarget === 'playerTeam' ? 'primary' : 'bone',
        accent: S3_COLORS.cyan,
        fontSize: '12px',
        mono: true,
      });
      drawS3Button(this, layout.targets.x + targetW + 8, layout.targets.y, targetW, layout.targets.h, isCpu ? 'Edit CPU' : 'PvP Opponent', () => this.store.setDraftTarget('enemyTeam'), {
        variant: activeTarget === 'enemyTeam' ? 'primary' : 'bone',
        accent: S3_COLORS.red,
        fontSize: '12px',
        mono: true,
        disabled: !isCpu,
      });

      this.renderS3Section(layout.roster.x, layout.rosterLabelY, activeTarget === 'enemyTeam' ? 'EDIT CPU TEAM' : 'SELECT YOUR STARTERS', layout.roster.x + layout.roster.w, activeTarget === 'enemyTeam' ? S3_COLORS.red : S3_COLORS.cyan);
      const roster = this.store.rosterEntries();
      const cardGap = layout.roster.gap;
      const available = layout.pager.y - layout.roster.y;
      const rows = Math.max(1, Math.floor((available + cardGap) / (layout.roster.cardH + cardGap)));
      const pageSize = Math.max(2, rows * 2);
      const pageMax = Math.max(0, Math.ceil(roster.length / pageSize) - 1);
      this.store.draftPage = clamp(this.store.draftPage, 0, pageMax);
      const page = roster.slice(this.store.draftPage * pageSize, this.store.draftPage * pageSize + pageSize);
      const cardW = (layout.roster.w - 8) / 2;
      page.forEach((character, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        this.renderRosterCard(character, layout.roster.x + col * (cardW + 8), layout.roster.y + row * (layout.roster.cardH + cardGap), cardW, layout.roster.cardH, activeTarget);
      });

      drawS3Pager(this, layout.pager, `Roster ${this.store.draftPage + 1}/${pageMax + 1}`, () => {
        this.store.draftPage = Math.max(0, this.store.draftPage - 1);
        this.store.notify();
      }, () => {
        this.store.draftPage = Math.min(pageMax, this.store.draftPage + 1);
        this.store.notify();
      }, {
        prevDisabled: this.store.draftPage === 0,
        nextDisabled: this.store.draftPage === pageMax,
      });
      drawS3Button(this, layout.cta.x, layout.cta.y, layout.cta.w, layout.cta.h, this.store.lobbyStatus ? 'Waiting For Opponent' : 'Ignite Battle', () => this.store.startMatch(), {
        variant: this.store.lobbyStatus ? 'smoke' : 'primary',
        accent: this.store.lobbyStatus ? S3_COLORS.gold : S3_COLORS.cyan,
        disabled: !!this.store.lobbyStatus,
        fontSize: '18px',
      });
      this.toast(frame, { y: layout.toastY, theme: 'light' });
    }
  }
