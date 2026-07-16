import { BOOT, COLORS } from '../core/runtime-config.js?v=19';
import { clamp, safeText, shortText } from '../core/text.js?v=19';
import { DraftRosterScene } from './draft-roster-scene.js?v=19';

export class DraftScene extends DraftRosterScene {
    constructor(key) {
      super(key || 'DraftScene');
    }

    renderTeamDock(frame, y) {
      const x = frame.x + frame.gutter;
      const slotW = (frame.width - 64) / 3;
      this.railLabel(x, y - 14, this.store.matchMode === 'pvp' ? 'MY PRIVATE DOMAIN TRIO' : 'MY TRIO', COLORS.ally);
      this.store.playerTeam.forEach((id, index) => this.renderDraftSlot(x + index * (slotW + 8), y, slotW, id, index, COLORS.ally));
      if (this.store.matchMode === 'cpu') {
        this.railLabel(x, y + 72, 'CPU TRIO', COLORS.enemy, { color: '#f1a0a0' });
        this.store.enemyTeam.forEach((id, index) => this.renderDraftSlot(x + index * (slotW + 8), y + 86, slotW, id, index, COLORS.enemy));
      } else if (this.store.lobbyStatus && this.store.lobbyStatus.status === 'waiting') {
        this.mono(x, y + 74, `Waiting in room ${this.store.lobbyStatus.room_id}.`, { color: '#a3eadf' });
      }
    }

    renderDraftSlot(x, y, w, id, index, tone) {
      const character = this.store.character(id);
      this.platePanel(x, y, w, 58, tone, { alpha: 0.78, edgeBar: 'left' });
      this.platePortrait(character, x + 6, y + 9, 34, { tone });
      this.mono(x + 8, y + 7, `S${index + 1}`, { color: COLORS.text, fontSize: '9px' });
      this.text(x + 46, y + 12, shortText(safeText(character.name, id), 16), {
        fontSize: '11px',
        fontStyle: '800',
        wordWrap: { width: w - 52 },
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.worldBackdrop(frame, { textureKey: null, ambient: 'motes' });
      this.dossierHeader(frame, { eyebrow: 'CURSED CLASH', title: 'Draft', backHandler: () => this.store.resetToLobby() });
      const x = frame.x + frame.gutter;
      let y = 88;
      y += this.renderMissionPreview(frame, y);
      const presets = (BOOT.firstCreation && BOOT.firstCreation.presets) || {};
      const presetNames = Object.keys(presets).slice(0, 4);
      this.railLabel(x, y, 'PRESETS', COLORS.selection);
      const small = (frame.width - 44) / 2;
      presetNames.slice(0, 2).forEach((name, index) => {
        this.button(x + index * (small + 12), y + 18, small, 34, name.replace(/_/g, ' '), () => this.store.applyPreset(name, 'playerTeam'), {
          fill: COLORS.surfaceRaised,
          stroke: COLORS.selection,
          fontSize: '10px',
          mono: true,
        });
      });
      if (this.store.matchMode === 'cpu') {
        presetNames.slice(2, 4).forEach((name, index) => {
          this.button(x + index * (small + 12), y + 58, small, 34, `CPU ${name.replace(/_/g, ' ')}`, () => this.store.applyPreset(name, 'enemyTeam'), {
            fill: COLORS.surfaceRaised,
            stroke: COLORS.enemy,
            fontSize: '10px',
            mono: true,
          });
        });
        this.railLabel(x, y + 100, 'CPU DIFFICULTY', COLORS.enemy, { color: '#f1a0a0' });
        const diffW = (frame.width - 44 - 16) / 3;
        ['easy', 'normal', 'hard'].forEach((level, index) => {
          const active = this.store.difficulty === level;
          this.button(x + index * (diffW + 8), y + 116, diffW, 30, level.toUpperCase(), () => this.store.setDifficulty(level), {
            fill: active ? COLORS.selection : COLORS.surfaceRaised,
            stroke: active ? COLORS.selection : COLORS.line,
            fontSize: '10px',
            mono: true,
          });
        });
      }

      y += this.store.matchMode === 'cpu' ? 176 : 94;
      this.renderTeamDock(frame, y);
      y += this.store.matchMode === 'cpu' ? 166 : 88;

      const targetW = (frame.width - 44) / 2;
      this.button(x, y, targetW, 32, 'Edit Player', () => this.store.setDraftTarget('playerTeam'), {
        fill: this.store.draftTarget === 'playerTeam' ? COLORS.ally : COLORS.surfaceRaised,
        stroke: COLORS.ally,
        color: this.store.draftTarget === 'playerTeam' ? '#08080a' : COLORS.text,
        fontSize: '10px',
        mono: true,
      });
      this.button(x + targetW + 12, y, targetW, 32, this.store.matchMode === 'cpu' ? 'Edit CPU' : 'PvP Opponent', () => this.store.setDraftTarget('enemyTeam'), {
        fill: this.store.draftTarget === 'enemyTeam' ? COLORS.enemy : COLORS.surfaceRaised,
        stroke: this.store.matchMode === 'cpu' ? COLORS.enemy : COLORS.line,
        fontSize: '10px',
        mono: true,
        disabled: this.store.matchMode !== 'cpu',
      });
      y += 44;

      this.mono(x, y, this.store.draftTarget === 'enemyTeam' ? 'TAP ROSTER CARD TO EDIT CPU TEAM' : 'TAP ROSTER CARD TO EDIT PLAYER TEAM', { color: COLORS.text });
      const roster = this.store.rosterEntries();
      const pageSize = frame.height < 760 ? 2 : frame.height < 900 ? 4 : 6;
      const pageMax = Math.max(0, Math.ceil(roster.length / pageSize) - 1);
      this.store.draftPage = clamp(this.store.draftPage, 0, pageMax);
      const page = roster.slice(this.store.draftPage * pageSize, this.store.draftPage * pageSize + pageSize);
      const cardW = (frame.width - 44) / 2;
      page.forEach((character, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const teamKey = this.store.draftTarget;
        this.renderRosterCard(character, x + col * (cardW + 12), y + 24 + row * 102, cardW, 90, teamKey);
      });
      const navY = Math.min(frame.height - 112, y + 24 + Math.ceil(page.length / 2) * 102 + 12);
      this.button(x, navY, 74, 38, 'Prev', () => {
        this.store.draftPage = Math.max(0, this.store.draftPage - 1);
        this.store.notify();
      }, { disabled: this.store.draftPage === 0, fill: COLORS.surfaceRaised, mono: true });
      this.mono(x + 88, navY + 12, `Page ${this.store.draftPage + 1}/${pageMax + 1}`, { color: COLORS.muted });
      this.button(x + frame.width - 106, navY, 74, 38, 'Next', () => {
        this.store.draftPage = Math.min(pageMax, this.store.draftPage + 1);
        this.store.notify();
      }, { disabled: this.store.draftPage === pageMax, fill: COLORS.surfaceRaised, mono: true });

      this.button(x, frame.height - 54, frame.width - 32, 40, this.store.lobbyStatus ? 'Waiting For Opponent' : 'Ignite Battle', () => this.store.startMatch(), {
        fill: this.store.lobbyStatus ? COLORS.surfaceRaised : COLORS.selection,
        gradientTop: this.store.lobbyStatus ? COLORS.surfaceRaised : COLORS.talismanDim,
        stroke: this.store.lobbyStatus ? COLORS.ally : COLORS.talismanPaper,
        color: this.store.lobbyStatus ? COLORS.text : '#08080a',
        fontSize: '15px',
        disabled: !!this.store.lobbyStatus,
      });

      this.toast(frame);
    }
  }
