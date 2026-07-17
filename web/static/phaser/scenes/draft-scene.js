import { BOOT, COLORS, TYPE_SCALE } from '../core/runtime-config.js?v=22';
import { clamp, safeText } from '../core/text.js?v=22';
import { DraftRosterScene } from './draft-roster-scene.js?v=22';

export class DraftScene extends DraftRosterScene {
    constructor(key) {
      super(key || 'DraftScene');
    }

    renderTeamDock(frame, y) {
      const x = frame.x + frame.gutter;
      this.railLabel(x, y - 14, this.store.matchMode === 'pvp' ? 'MY PRIVATE DOMAIN TRIO' : 'MY TRIO', COLORS.ally);
      this.renderTeamSummary(x, y, frame.width - 32, this.store.playerTeam, COLORS.ally);
      if (this.store.matchMode === 'cpu') {
        this.railLabel(x, y + 74, 'CPU TRIO', COLORS.enemy, { color: '#f1a0a0' });
        this.renderTeamSummary(x, y + 88, frame.width - 32, this.store.enemyTeam, COLORS.enemy);
      } else if (this.store.lobbyStatus && this.store.lobbyStatus.status === 'waiting') {
        this.text(x, y + 76, `Waiting in room ${this.store.lobbyStatus.room_id}.`, { color: '#a3eadf', fontSize: `${TYPE_SCALE.body}px` });
      }
    }

    renderTeamSummary(x, y, w, team, tone) {
      this.platePanel(x, y, w, 62, tone, { alpha: 0.78, edgeBar: 'left' });
      team.slice(0, 3).forEach((id, index) => {
        const character = this.store.character(id);
        const rowY = y + 5 + index * 18;
        this.mono(x + 10, rowY + 2, `S${index + 1}`, {
          color: tone,
          fontSize: `${TYPE_SCALE.micro}px`,
          fontStyle: '900',
        });
        this.text(x + 40, rowY, safeText(character.name, id), {
          fontSize: `${TYPE_SCALE.body}px`,
          fontStyle: '800',
          wordWrap: { width: w - 52 },
        });
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.worldBackdrop(frame, { textureKey: null, ambient: 'motes' });
      const header = this.dossierHeader(frame, { eyebrow: 'CURSED CLASH', title: 'Draft', backHandler: () => this.store.resetToLobby() });
      const x = frame.x + frame.gutter;
      const usableHeight = frame.bottom - frame.top;
      const compact = usableHeight < 760;
      const showMissionPreview = usableHeight >= 850;
      const isCpu = this.store.matchMode === 'cpu';
      let y = header.bottom + 8;
      // The mission preview is the first optional block dropped when the safe
      // frame cannot fit full roster copy plus navigation and the primary CTA.
      if (showMissionPreview) y += this.renderMissionPreview(frame, y);

      const presets = (BOOT.firstCreation && BOOT.firstCreation.presets) || {};
      const presetNames = Object.keys(presets).slice(0, 4);
      const small = (frame.width - 44) / 2;
      const renderDifficulty = (difficultyLabelY) => {
        this.railLabel(x, difficultyLabelY, 'CPU DIFFICULTY', COLORS.enemy, { color: '#f1a0a0' });
        const diffBtnY = difficultyLabelY + 18;
        const diffW = (frame.width - 44 - 16) / 3;
        ['easy', 'normal', 'hard'].forEach((level, index) => {
          const active = this.store.difficulty === level;
          this.button(x + index * (diffW + 8), diffBtnY, diffW, 44, level.toUpperCase(), () => this.store.setDifficulty(level), {
            fill: active ? COLORS.selection : COLORS.surfaceRaised,
            stroke: active ? COLORS.selection : COLORS.line,
            fontSize: `${TYPE_SCALE.label}px`,
            mono: true,
          });
        });
        return diffBtnY + 44;
      };
      const showPresetShortcuts = usableHeight >= 720;
      if (showPresetShortcuts) {
        this.railLabel(x, y, 'PRESETS', COLORS.line);
        presetNames.slice(0, 2).forEach((name, index) => {
          this.button(x + index * (small + 12), y + 16, small, 44, name.replace(/_/g, ' '), () => this.store.applyPreset(name, 'playerTeam'), {
            fill: COLORS.surfaceRaised,
            stroke: COLORS.ally,
            fontSize: `${TYPE_SCALE.label}px`,
            mono: true,
          });
        });
        let presetsBottom = y + 60;
        if (isCpu) {
          const cpuPresetY = presetsBottom + 8;
          presetNames.slice(2, 4).forEach((name, index) => {
            this.button(x + index * (small + 12), cpuPresetY, small, 44, `CPU ${name.replace(/_/g, ' ')}`, () => this.store.applyPreset(name, 'enemyTeam'), {
              fill: COLORS.surfaceRaised,
              stroke: COLORS.enemy,
              fontSize: `${TYPE_SCALE.label}px`,
              mono: true,
            });
          });
          presetsBottom = renderDifficulty(cpuPresetY + 56);
        }
        y = presetsBottom + (compact ? 12 : 18);
      } else if (isCpu) {
        y = renderDifficulty(y) + 12;
      }

      this.renderTeamDock(frame, y);
      y += (isCpu ? 88 + 62 : 62) + (compact ? 12 : 16);

      const targetW = (frame.width - 44) / 2;
      const editH = 44;
      this.button(x, y, targetW, editH, 'Edit Player', () => this.store.setDraftTarget('playerTeam'), {
        fill: this.store.draftTarget === 'playerTeam' ? COLORS.ally : COLORS.surfaceRaised,
        stroke: COLORS.ally,
        color: this.store.draftTarget === 'playerTeam' ? '#08080a' : COLORS.text,
        fontSize: `${TYPE_SCALE.label}px`,
        mono: true,
      });
      this.button(x + targetW + 12, y, targetW, editH, isCpu ? 'Edit CPU' : 'PvP Opponent', () => this.store.setDraftTarget('enemyTeam'), {
        fill: this.store.draftTarget === 'enemyTeam' ? COLORS.enemy : COLORS.surfaceRaised,
        stroke: isCpu ? COLORS.enemy : COLORS.line,
        fontSize: `${TYPE_SCALE.label}px`,
        mono: true,
        disabled: !isCpu,
      });
      y += editH + (compact ? 10 : 14);

      this.text(x, y, this.store.draftTarget === 'enemyTeam' ? 'Tap a roster card to edit the CPU team' : 'Tap a roster card to edit your team', { color: COLORS.muted, fontSize: `${TYPE_SCALE.body}px` });
      const rosterLabelY = y;

      // Footer is bottom-anchored first so the roster grid can size itself to
      // whatever real space remains above it -- this is what actually fixes
      // the overlap bug: pageSize used to come from a fixed frame.height
      // threshold that ignored how much variable content (CPU presets/
      // difficulty) had already consumed the space above it.
      const ctaH = 44;
      const ctaY = frame.bottom - ctaH;
      const navH = 44;
      const navY = ctaY - (compact ? 8 : 10) - navH;

      const roster = this.store.rosterEntries();
      const cardGap = compact ? 8 : 12;
      const rosterCardTop = rosterLabelY + (compact ? 20 : 26);
      // Full names, roles, and first-skill names are never pre-truncated.
      // Pagination adapts instead of squeezing this legibility budget.
      const cardH = 132;
      const available = navY - rosterCardTop;
      const rows = Math.max(0, Math.floor((available + cardGap) / (cardH + cardGap)));
      const pageSize = Math.max(2, rows * 2);
      const pageMax = Math.max(0, Math.ceil(roster.length / pageSize) - 1);
      this.store.draftPage = clamp(this.store.draftPage, 0, pageMax);
      const page = rows > 0 ? roster.slice(this.store.draftPage * pageSize, this.store.draftPage * pageSize + pageSize) : [];
      const cardW = (frame.width - 44) / 2;
      page.forEach((character, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const teamKey = this.store.draftTarget;
        this.renderRosterCard(character, x + col * (cardW + 12), rosterCardTop + row * (cardH + cardGap), cardW, cardH, teamKey);
      });

      this.button(x, navY, 74, navH, 'Prev', () => {
        this.store.draftPage = Math.max(0, this.store.draftPage - 1);
        this.store.notify();
      }, { disabled: this.store.draftPage === 0, fill: COLORS.surfaceRaised, mono: true, fontSize: `${TYPE_SCALE.label}px` });
      this.mono(x + 88, navY + navH / 2 - 6, `Page ${this.store.draftPage + 1}/${pageMax + 1}`, { color: COLORS.muted, fontSize: `${TYPE_SCALE.label}px` });
      this.button(x + frame.width - 106, navY, 74, navH, 'Next', () => {
        this.store.draftPage = Math.min(pageMax, this.store.draftPage + 1);
        this.store.notify();
      }, { disabled: this.store.draftPage === pageMax, fill: COLORS.surfaceRaised, mono: true, fontSize: `${TYPE_SCALE.label}px` });

      this.button(x, ctaY, frame.width - 32, ctaH, this.store.lobbyStatus ? 'Waiting For Opponent' : 'Ignite Battle', () => this.store.startMatch(), {
        fill: this.store.lobbyStatus ? COLORS.surfaceRaised : COLORS.selection,
        gradientTop: this.store.lobbyStatus ? COLORS.surfaceRaised : COLORS.talismanDim,
        stroke: this.store.lobbyStatus ? COLORS.ally : COLORS.talismanPaper,
        color: this.store.lobbyStatus ? COLORS.text : '#08080a',
        fontSize: `${TYPE_SCALE.subtitle}px`,
        disabled: !!this.store.lobbyStatus,
      });

      this.toast(frame);
    }
  }
