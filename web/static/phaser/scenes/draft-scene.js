import { COLORS } from '../core/runtime-config.js?v=16';
import { clamp, safeText, shortText } from '../core/text.js?v=16';
import { DraftRosterScene } from './draft-roster-scene.js?v=16';

export class DraftScene extends DraftRosterScene {
    constructor(key) {
      super(key || 'DraftScene');
    }

    renderTeamDock(frame, y) {
      const x = frame.x + frame.gutter;
      const slotW = (frame.width - 64) / 3;
      this.mono(x, y - 18, this.store.matchMode === 'pvp' ? 'MY PRIVATE DOMAIN TRIO' : 'MY TRIO', { color: '#bfdbfe' });
      this.store.playerTeam.forEach((id, index) => this.renderDraftSlot(x + index * (slotW + 8), y, slotW, id, index, COLORS.cyan));
      if (this.store.matchMode === 'cpu') {
        this.mono(x, y + 68, 'CPU TRIO', { color: '#fca5a5' });
        this.store.enemyTeam.forEach((id, index) => this.renderDraftSlot(x + index * (slotW + 8), y + 86, slotW, id, index, COLORS.red));
      } else if (this.store.lobbyStatus && this.store.lobbyStatus.status === 'waiting') {
        this.mono(x, y + 74, `Waiting in room ${this.store.lobbyStatus.room_id}.`, { color: '#a5f3fc' });
      }
    }

    renderDraftSlot(x, y, w, id, index, tone) {
      const character = this.store.character(id);
      this.cardPanel(x, y, w, 58, tone, 0.78);
      this.portrait(character, x + 6, y + 9, 34, { tone });
      this.mono(x + 8, y + 7, `S${index + 1}`, { color: '#e2e8f0', fontSize: '9px' });
      this.text(x + 46, y + 12, shortText(safeText(character.name, id), 16), {
        fontSize: '11px',
        fontStyle: '800',
        wordWrap: { width: w - 52 },
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      this.topBar(frame, 'Draft', () => this.store.resetToLobby());
      const x = frame.x + frame.gutter;
      let y = 88;
      y += this.renderMissionPreview(frame, y);
      const presets = (BOOT.firstCreation && BOOT.firstCreation.presets) || {};
      const presetNames = Object.keys(presets).slice(0, 4);
      this.mono(x, y, 'PRESETS', { color: '#fde68a' });
      const small = (frame.width - 44) / 2;
      presetNames.slice(0, 2).forEach((name, index) => {
        this.button(x + index * (small + 12), y + 18, small, 34, name.replace(/_/g, ' '), () => this.store.applyPreset(name, 'playerTeam'), {
          fill: 0x161b2f,
          stroke: COLORS.gold,
          fontSize: '10px',
          mono: true,
        });
      });
      if (this.store.matchMode === 'cpu') {
        presetNames.slice(2, 4).forEach((name, index) => {
          this.button(x + index * (small + 12), y + 58, small, 34, `CPU ${name.replace(/_/g, ' ')}`, () => this.store.applyPreset(name, 'enemyTeam'), {
            fill: 0x1b1118,
            stroke: COLORS.red,
            fontSize: '10px',
            mono: true,
          });
        });
      }

      y += this.store.matchMode === 'cpu' ? 130 : 94;
      this.renderTeamDock(frame, y);
      y += this.store.matchMode === 'cpu' ? 166 : 88;

      const targetW = (frame.width - 44) / 2;
      this.button(x, y, targetW, 32, 'Edit Player', () => this.store.setDraftTarget('playerTeam'), {
        fill: this.store.draftTarget === 'playerTeam' ? COLORS.cyan : 0x111827,
        stroke: COLORS.cyan,
        fontSize: '10px',
        mono: true,
      });
      this.button(x + targetW + 12, y, targetW, 32, this.store.matchMode === 'cpu' ? 'Edit CPU' : 'PvP Opponent', () => this.store.setDraftTarget('enemyTeam'), {
        fill: this.store.draftTarget === 'enemyTeam' ? COLORS.red : 0x111827,
        stroke: this.store.matchMode === 'cpu' ? COLORS.red : COLORS.line,
        fontSize: '10px',
        mono: true,
        disabled: this.store.matchMode !== 'cpu',
      });
      y += 44;

      this.mono(x, y, this.store.draftTarget === 'enemyTeam' ? 'TAP ROSTER CARD TO EDIT CPU TEAM' : 'TAP ROSTER CARD TO EDIT PLAYER TEAM', { color: '#cbd5e1' });
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
      }, { disabled: this.store.draftPage === 0, fill: 0x111827, mono: true });
      this.mono(x + 88, navY + 12, `Page ${this.store.draftPage + 1}/${pageMax + 1}`, { color: '#94a3b8' });
      this.button(x + frame.width - 106, navY, 74, 38, 'Next', () => {
        this.store.draftPage = Math.min(pageMax, this.store.draftPage + 1);
        this.store.notify();
      }, { disabled: this.store.draftPage === pageMax, fill: 0x111827, mono: true });

      this.button(x, frame.height - 54, frame.width - 32, 40, this.store.lobbyStatus ? 'Waiting For Opponent' : 'Ignite Battle', () => this.store.startMatch(), {
        fill: this.store.lobbyStatus ? 0x1f2937 : COLORS.purple,
        stroke: this.store.lobbyStatus ? COLORS.cyan : COLORS.gold,
        fontSize: '15px',
        disabled: !!this.store.lobbyStatus,
      });
      this.toast(frame);
    }
  }
