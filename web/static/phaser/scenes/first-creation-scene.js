import { COLORS } from '../core/runtime-config.js?v=18';
import { clamp, shortText } from '../core/text.js?v=18';
import { DraftScene } from './draft-scene.js?v=18';

export class FirstCreationScene extends DraftScene {
    constructor() {
      super('FirstCreationScene');
    }

    renderTrioSlots(frame, y) {
      const x = frame.x + frame.gutter;
      const slotW = (frame.width - 64) / 3;
      const ready = this.store.playerTeam.length;
      this.mono(x, y - 18, `CHOOSE YOUR FIRST TRIO ${ready}/3`, { color: ready === 3 ? '#b7dbc0' : COLORS.paperText, fontSize: '9px' });
      [0, 1, 2].forEach((index) => {
        const id = this.store.playerTeam[index];
        const sx = x + index * (slotW + 8);
        this.cardPanel(sx, y, slotW, 76, id ? COLORS.ally : COLORS.line, id ? 0.84 : 0.52);
        this.mono(sx + 8, y + 7, `S${index + 1}`, { color: id ? COLORS.text : COLORS.dim, fontSize: '8px' });
        if (id) {
          const character = this.store.character(id);
          this.portrait(character, sx + slotW / 2 - 19, y + 7, 38, { tone: COLORS.ally });
          this.text(sx + slotW / 2, y + 48, character.name, {
            fontSize: '9px',
            fontStyle: '800',
            align: 'center',
            wordWrap: { width: slotW - 12 },
          }).setOrigin(0.5, 0);
        } else {
          this.mono(sx + slotW / 2, y + 31, 'OPEN SLOT', { color: COLORS.dim, fontSize: '8px' }).setOrigin(0.5, 0);
        }
      });
    }

    renderPresetTile(entry, x, y, w, h) {
      const active = entry.team.every((id) => this.store.playerTeam.includes(id));
      this.cardPanel(x, y, w, h, active ? COLORS.queued : COLORS.selection, active ? 0.88 : 0.68);
      this.text(x + 10, y + 9, shortText(entry.title, 21), { fontSize: '11px', fontStyle: '900' });
      const portraitSize = 26;
      entry.team.slice(0, 3).forEach((id, index) => {
        this.portrait(this.store.character(id), x + 12 + index * 31, y + 30, portraitSize, { tone: COLORS.selection });
      });
      const chipW = active ? 76 : 70;
      const chipX = x + w - chipW - 10;
      this.graphics.fillStyle(active ? COLORS.queued : COLORS.surfaceRaised, active ? 0.9 : 0.82);
      this.graphics.fillRoundedRect(chipX, y + h - 23, chipW, 17, 8);
      this.graphics.lineStyle(1, active ? COLORS.queued : COLORS.selection, 0.7);
      this.graphics.strokeRoundedRect(chipX, y + h - 23, chipW, 17, 8);
      this.mono(chipX + chipW / 2, y + h - 18, active ? 'ACTIVE TRIO' : 'USE PRESET', { color: active ? '#d8f0dc' : COLORS.paperText, fontSize: '7px' }).setOrigin(0.5, 0);
      this.buttons.push({ x, y, w, h, label: `Use ${entry.title}`, onClick: () => this.store.applyPreset(entry.id, 'playerTeam') });
    }

    renderMissionHeader(frame, y) {
      const x = frame.x + frame.gutter;
      const mission = this.store.activeMission();
      const profile = (window.JJK_BOOTSTRAP && window.JJK_BOOTSTRAP.firstCreation && window.JJK_BOOTSTRAP.firstCreation.profile) || {};
      const completed = (profile.completed_missions || []).length;
      const total = this.store.missions().length || 1;
      const pct = clamp(completed / total, 0, 1);
      this.cardPanel(x, y, frame.width - 32, 78, COLORS.talismanDim, 0.78);
      this.text(x + 14, y + 12, 'Welcome To Jujutsu High', {
        fontFamily: '"Lilita One", Inter, sans-serif',
        fontSize: '18px',
        fontStyle: '900',
      });
      this.mono(x + 16, y + 41, mission ? shortText(mission.title, 33) : 'Starter route ready', { color: COLORS.paperText, fontSize: '9px' });
      this.graphics.fillStyle(COLORS.inkBlack, 0.76);
      this.graphics.fillRoundedRect(x + 16, y + 59, frame.width - 172, 8, 4);
      this.graphics.fillStyle(COLORS.selection, 0.92);
      this.graphics.fillRoundedRect(x + 16, y + 59, (frame.width - 172) * pct, 8, 4);
      this.mono(x + frame.width - 174, y + 58, `${completed}/${total} ROUTES`, { color: COLORS.text, fontSize: '7px' });
      this.button(x + frame.width - 138, y + 22, 104, 34, 'Mission Map', () => this.store.changeScene('MissionMapScene'), {
        fill: COLORS.surfaceRaised,
        stroke: COLORS.selection,
        mono: true,
        fontSize: '9px',
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      this.topBar(frame, 'First Creation', () => this.store.resetToLobby());
      if (this.store.detailCharacterId) {
        this.renderCharacterDetailSheet(frame, 'playerTeam');
        this.toast(frame);
        return;
      }
      const x = frame.x + frame.gutter;
      let y = 86;

      this.renderMissionHeader(frame, y);
      y += 108;
      this.renderTrioSlots(frame, y);
      y += 92;

      const presets = this.store.presetEntries();
      const presetPageSize = frame.height < 790 ? 2 : 4;
      const presetMax = Math.max(0, Math.ceil(presets.length / presetPageSize) - 1);
      this.store.creationPresetPage = clamp(this.store.creationPresetPage, 0, presetMax);
      const presetPage = presets.slice(this.store.creationPresetPage * presetPageSize, this.store.creationPresetPage * presetPageSize + presetPageSize);
      this.mono(x, y - 6, 'STARTER PRESETS', { color: COLORS.paperText, fontSize: '9px' });
      const presetW = (frame.width - 44) / 2;
      presetPage.forEach((entry, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        this.renderPresetTile(entry, x + col * (presetW + 12), y + 14 + row * 72, presetW, 60);
      });
      if (presetMax > 0) {
        this.button(x + frame.width - 100, y - 12, 68, 28, `Set ${this.store.creationPresetPage + 1}`, () => {
          this.store.creationPresetPage = this.store.creationPresetPage >= presetMax ? 0 : this.store.creationPresetPage + 1;
          this.store.notify();
        }, { fill: COLORS.surfaceRaised, stroke: COLORS.selection, mono: true, fontSize: '8px' });
      }

      y += presetPageSize > 2 ? 166 : 94;
      this.mono(x, y, 'TAP A DOSSIER TO INSPECT SKILLS', { color: COLORS.text, fontSize: '8px' });
      const roster = this.store.rosterEntries();
      const pageSize = frame.height < 790 ? 4 : 6;
      const pageMax = Math.max(0, Math.ceil(roster.length / pageSize) - 1);
      this.store.draftPage = clamp(this.store.draftPage, 0, pageMax);
      const page = roster.slice(this.store.draftPage * pageSize, this.store.draftPage * pageSize + pageSize);
      const cardW = (frame.width - 44) / 2;
      page.forEach((character, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        this.renderStarterRosterCard(character, x + col * (cardW + 12), y + 20 + row * 92, cardW, 80, 'playerTeam');
      });

      const navY = Math.min(frame.height - 110, y + 20 + Math.ceil(page.length / 2) * 92 + 6);
      this.button(x, navY, 70, 34, 'Prev', () => {
        this.store.draftPage = Math.max(0, this.store.draftPage - 1);
        this.store.notify();
      }, { disabled: this.store.draftPage === 0, fill: COLORS.surfaceRaised, mono: true, fontSize: '9px' });
      this.mono(x + 86, navY + 11, `Roster ${this.store.draftPage + 1}/${pageMax + 1}`, { color: COLORS.muted, fontSize: '9px' });
      this.button(x + frame.width - 102, navY, 70, 34, 'Next', () => {
        this.store.draftPage = Math.min(pageMax, this.store.draftPage + 1);
        this.store.notify();
      }, { disabled: this.store.draftPage === pageMax, fill: COLORS.surfaceRaised, mono: true, fontSize: '9px' });

      const ready = this.store.playerTeam.length === 3;
      this.button(x, frame.height - 58, frame.width - 32, 42, ready ? 'Enter Domain' : `Choose ${3 - this.store.playerTeam.length} More`, () => this.store.startMatch(), {
        fill: ready ? COLORS.selection : COLORS.surfaceRaised,
        gradientTop: ready ? COLORS.talismanDim : COLORS.surfaceRaised,
        stroke: ready ? COLORS.talismanPaper : COLORS.line,
        color: ready ? '#08080a' : COLORS.text,
        fontSize: '14px',
        disabled: !ready,
      });
      this.renderCharacterDetailSheet(frame, 'playerTeam');
      this.toast(frame);
    }
  }
