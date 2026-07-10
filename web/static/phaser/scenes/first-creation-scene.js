/* FIRST CREATION — starter onboarding: mission progress strip, trio
   pedestal, preset chips, dossier card list (tap to inspect skills),
   Enter Domain gate. "Welcome to Jujutsu High", not endgame apocalypse. */

import { COLORS } from '../core/runtime-config.js?v=18';
import { clamp, shortText } from '../core/text.js?v=18';
import { DraftScene } from './draft-scene.js?v=18';
import { drawHpBar } from '../components/widgets.js?v=18';

export class FirstCreationScene extends DraftScene {
    constructor() {
      super('FirstCreationScene');
    }

    renderMissionStrip(frame, y) {
      const x = frame.x + frame.gutter;
      const w = frame.width - frame.gutter * 2;
      const mission = this.store.activeMission();
      const profile = (window.JJK_BOOTSTRAP && window.JJK_BOOTSTRAP.firstCreation && window.JJK_BOOTSTRAP.firstCreation.profile) || {};
      const completed = (profile.completed_missions || []).length;
      const total = this.store.missions().length || 1;
      this.platePanel(x, y, w, 62);
      this.text(x + 14, y + 10, mission ? shortText(mission.title, 30) : 'Starter route ready', {
        fontSize: '12px', fontStyle: '900',
      });
      drawHpBar(this.graphics, x + 14, y + 32, w - 220, 8, clamp(completed / total, 0, 1), 'gold');
      this.stat(x + w - 196, y + 31, `${completed}/${total} ROUTES`, 9, { color: COLORS.muted });
      this.plateButton(x + w - 116, y + 13, 104, 36, 'Mission Map', () => this.store.changeScene('MissionMapScene'), {
        tone: 'ink', fontSize: 10,
      });
    }

    renderPresetChips(frame, y) {
      const x = frame.x + frame.gutter;
      const w = frame.width - frame.gutter * 2;
      const presets = this.store.presetEntries();
      const perPage = 2;
      const pageMax = Math.max(0, Math.ceil(presets.length / perPage) - 1);
      this.store.creationPresetPage = clamp(this.store.creationPresetPage, 0, pageMax);
      const page = presets.slice(this.store.creationPresetPage * perPage, this.store.creationPresetPage * perPage + perPage);
      const chipW = (w - 46 - 8) / 2;
      page.forEach((entry, index) => {
        const active = entry.team.length === 3 && entry.team.every((id) => this.store.playerTeam.includes(id));
        this.plateButton(x + index * (chipW + 8), y, chipW, 34, shortText(entry.title, 20), () => this.store.applyPreset(entry.id, 'playerTeam'), {
          tone: active ? 'primary' : 'ink', fontSize: 9,
        });
        if (active) {
          this.label(x + index * (chipW + 8) + 6, y - 11, 'Active Trio', 7, { color: COLORS.curseText });
        }
      });
      if (pageMax > 0) {
        this.plateButton(x + w - 38, y, 38, 34, '>', () => {
          this.store.creationPresetPage = this.store.creationPresetPage >= pageMax ? 0 : this.store.creationPresetPage + 1;
          this.store.notify();
        }, { tone: 'ink', fontSize: 12 });
      }
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      this.kanjiWatermark(frame, '始');
      this.layer();
      const x = frame.x + frame.gutter;
      const w = frame.width - frame.gutter * 2;

      this.iconButton(frame.x + frame.width - frame.gutter - 44, 14, 44, 38, '<', () => this.store.resetToLobby());
      this.skewTag(x, 16, 'Welcome to Jujutsu High', { fontSize: 10 });
      this.display(x, 40, 'First Creation', 28);

      this.renderMissionStrip(frame, 82);

      // Trio pedestal (compact) + preset chips.
      const slotH = 118;
      this.renderPedestal(frame, 168, slotH, 'playerTeam');
      this.renderPresetChips(frame, 168 + slotH + 18);

      // Dossier list — tap a card to inspect skills before committing.
      const listY = 168 + slotH + 66;
      this.layer();
      this.label(x, listY - 14, 'Tap a dossier to inspect skills', 8, { color: COLORS.dim });
      const roster = this.store.rosterEntries();
      const ctaH = 56;
      const ctaY = frame.height - 16 - ctaH;
      const cardH = 72;
      const rows = Math.max(1, Math.floor((ctaY - 12 - listY - 40) / (cardH + 8)));
      const pageSize = rows;
      const pageMax = Math.max(0, Math.ceil(roster.length / pageSize) - 1);
      this.store.draftPage = clamp(this.store.draftPage, 0, pageMax);
      const page = roster.slice(this.store.draftPage * pageSize, this.store.draftPage * pageSize + pageSize);
      page.forEach((character, index) => {
        this.renderStarterRosterCard(character, x, listY + index * (cardH + 8), w, cardH, 'playerTeam');
      });
      if (pageMax > 0) {
        const navY = listY + page.length * (cardH + 8) + 2;
        this.plateButton(x, navY, 56, 32, '<', () => {
          this.store.draftPage = Math.max(0, this.store.draftPage - 1);
          this.store.notify();
        }, { tone: 'ink', fontSize: 12, disabled: this.store.draftPage === 0 });
        this.stat(x + w / 2, navY + 16, `${this.store.draftPage + 1}/${pageMax + 1}`, 10, { color: COLORS.dim }).setOrigin(0.5, 0.5);
        this.plateButton(x + w - 56, navY, 56, 32, '>', () => {
          this.store.draftPage = Math.min(pageMax, this.store.draftPage + 1);
          this.store.notify();
        }, { tone: 'ink', fontSize: 12, disabled: this.store.draftPage === pageMax });
      }

      // Enter Domain gate.
      this.layer();
      const ready = this.store.playerTeam.length === 3;
      this.plateButton(x, ctaY, w, ctaH, ready ? 'Enter Domain' : `Choose ${3 - this.store.playerTeam.length} More`, () => this.store.startMatch(), {
        tone: 'primary', corners: 'both', display: true, fontSize: 18,
        disabled: !ready,
      });

      this.renderCharacterDetailSheet(frame, 'playerTeam');
      this.toast(frame);
    }
  }
