import { COLORS, TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=22';
import { clamp, shortText } from '../core/text.js?v=22';
import { DraftScene } from './draft-scene.js?v=22';

export class FirstCreationScene extends DraftScene {
    constructor() {
      super('FirstCreationScene');
    }

    renderTrioSlots(frame, y) {
      const x = frame.x + frame.gutter;
      const slotW = (frame.width - 64) / 3;
      const ready = this.store.playerTeam.length;
      this.railLabel(x, y - 18, `CHOOSE YOUR FIRST TRIO ${ready}/3`, COLORS.ally, { color: ready === 3 ? '#b7dbc0' : COLORS.paperText });
      [0, 1, 2].forEach((index) => {
        const id = this.store.playerTeam[index];
        const sx = x + index * (slotW + 8);
        this.platePanel(sx, y, slotW, 82, id ? COLORS.ally : COLORS.line, { alpha: id ? 0.84 : 0.52 });
        this.mono(sx + 8, y + 6, `S${index + 1}`, { color: id ? COLORS.text : COLORS.dim, fontSize: `${TYPE_SCALE.micro}px` });
        if (id) {
          const character = this.store.character(id);
          this.platePortrait(character, sx + slotW / 2 - 19, y + 6, 38, { tone: COLORS.ally });
          this.text(sx + slotW / 2, y + 50, character.name, {
            fontSize: `${TYPE_SCALE.body}px`,
            fontStyle: '800',
            align: 'center',
            wordWrap: { width: slotW - 12 },
          }).setOrigin(0.5, 0);
        } else {
          this.text(sx + slotW / 2, y + 34, 'Open Slot', { color: COLORS.dim, fontSize: `${TYPE_SCALE.body}px` }).setOrigin(0.5, 0);
        }
      });
    }

    renderPresetTile(entry, x, y, w, h) {
      const active = entry.team.every((id) => this.store.playerTeam.includes(id));
      this.platePanel(x, y, w, h, active ? COLORS.queued : COLORS.line, { alpha: active ? 0.88 : 0.68 });
      this.text(x + 10, y + 9, shortText(entry.title, 21), { fontSize: `${TYPE_SCALE.subtitle}px`, fontStyle: '900' });
      const portraitSize = 24;
      entry.team.slice(0, 3).forEach((id, index) => {
        this.platePortrait(this.store.character(id), x + 12 + index * 29, y + 30, portraitSize, { tone: COLORS.selection });
      });
      // Chip sits on its own row below the portraits -- a wide "USE PRESET"/
      // "ACTIVE TRIO" label doesn't fit beside 3 portraits without overlap
      // in this tile width, so stack instead of cramming them side by side.
      this.dossierTag(x + 12, y + h - 18, active ? 'ACTIVE TRIO' : 'USE PRESET', active ? COLORS.queued : COLORS.selection, {
        color: active ? '#d8f0dc' : '#07090a',
      });
      this.buttons.push({ x, y, w, h, label: `Use ${entry.title}`, onClick: () => this.store.applyPreset(entry.id, 'playerTeam') });
    }

    renderMissionHeader(frame, y) {
      const x = frame.x + frame.gutter;
      const mission = this.store.activeMission();
      const profile = this.store.firstCreationProfile();
      const completed = (profile.completed_missions || []).length;
      const total = this.store.missions().length || 1;
      const pct = clamp(completed / total, 0, 1);
      this.platePanel(x, y, frame.width - 32, 86, COLORS.talismanDim, { edgeBar: 'left' });
      this.text(x + 14, y + 12, 'Welcome To Jujutsu High', {
        fontFamily: TOKEN_TYPE.display || 'Georgia, serif',
        fontSize: '18px',
        fontStyle: '900',
      });
      this.text(x + 16, y + 42, mission ? shortText(mission.title, 33) : 'Starter route ready', { color: COLORS.paperText, fontSize: `${TYPE_SCALE.body}px` });
      this.progressRail(x + 16, y + 65, frame.width - 172, 8, pct, COLORS.selection);
      this.mono(x + frame.width - 174, y + 64, `${completed}/${total} ROUTES`, { color: COLORS.text, fontSize: `${TYPE_SCALE.label}px` });
      this.button(x + frame.width - 138, y + 18, 104, 44, 'Mission Map', () => this.store.changeScene('MissionMapScene'), {
        fill: COLORS.surfaceRaised,
        stroke: COLORS.line,
        mono: true,
        fontSize: `${TYPE_SCALE.label}px`,
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.worldBackdrop(frame, { textureKey: null, ambient: 'motes' });
      const header = this.dossierHeader(frame, { eyebrow: 'CURSED CLASH', title: 'First Creation', backHandler: () => this.store.resetToLobby() });
      if (this.store.detailCharacterId) {
        this.renderCharacterDetailSheet(frame, 'playerTeam');
        this.toast(frame);
        return;
      }
      const x = frame.x + frame.gutter;
      const usableHeight = frame.bottom - frame.top;
      const compact = !frame.desktop || frame.bottom < 918;
      // On very short viewports, presets (a shortcut, not essential --
      // every character is still reachable via the roster grid below) are
      // the first thing dropped, same principle as Draft's mission-preview
      // skip: free real space rather than let the roster grid get squeezed
      // below its safe minimum card height.
      const ultraCompact = usableHeight < 740;
      let y = header.bottom + 8;

      this.renderMissionHeader(frame, y);
      y += 118;
      this.renderTrioSlots(frame, y);
      y += 100;

      if (!ultraCompact) {
        const presets = this.store.presetEntries();
        const presetPageSize = compact ? 2 : 4;
        const presetMax = Math.max(0, Math.ceil(presets.length / presetPageSize) - 1);
        this.store.creationPresetPage = clamp(this.store.creationPresetPage, 0, presetMax);
        const presetPage = presets.slice(this.store.creationPresetPage * presetPageSize, this.store.creationPresetPage * presetPageSize + presetPageSize);
        this.railLabel(x, y - 6, 'STARTER PRESETS', COLORS.line);
        const presetW = (frame.width - 44) / 2;
        const presetRowH = 88;
        const presetTop = y + 38;
        presetPage.forEach((entry, index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          this.renderPresetTile(entry, x + col * (presetW + 12), presetTop + row * (presetRowH + 12), presetW, presetRowH);
        });
        if (presetMax > 0) {
          this.button(x + frame.width - 104, y - 14, 72, 44, `Set ${this.store.creationPresetPage + 1}`, () => {
            this.store.creationPresetPage = this.store.creationPresetPage >= presetMax ? 0 : this.store.creationPresetPage + 1;
            this.store.notify();
          }, { fill: COLORS.surfaceRaised, stroke: COLORS.line, mono: true, fontSize: `${TYPE_SCALE.label}px` });
        }
        y += 38 + Math.ceil(presetPage.length / 2) * (presetRowH + 12) + 8;
      }
      this.text(x, y, 'Tap a dossier to inspect skills', { color: COLORS.muted, fontSize: `${TYPE_SCALE.body}px` });
      const rosterLabelY = y;

      // Same bottom-up budget approach as draft-scene.js: reserve the
      // footer first, then size the roster grid to whatever real space is
      // left, instead of a fixed height threshold that ignores how much
      // the mission header/trio/presets blocks already consumed above it.
      const ctaH = 46;
      const ctaY = frame.bottom - ctaH;
      const navH = 44;
      const navY = ctaY - (compact ? 8 : 10) - navH;

      const roster = this.store.rosterEntries();
      const cardGap = compact ? 10 : 12;
      const rosterCardTop = rosterLabelY + (compact ? 18 : 22);
      // Full role copy needs up to two lines and the complete first-skill
      // name needs up to two. Keep the two-column pattern and adapt only the
      // number of visible rows.
      const cardH = 132;
      const available = navY - rosterCardTop;
      const rowsThatFit = Math.max(0, Math.floor((available + cardGap) / (cardH + cardGap)));
      const rows = Math.min(frame.width >= 430 ? 2 : 1, rowsThatFit);
      const pageSize = Math.max(2, rows * 2);
      const pageMax = Math.max(0, Math.ceil(roster.length / pageSize) - 1);
      this.store.draftPage = clamp(this.store.draftPage, 0, pageMax);
      const page = rows > 0 ? roster.slice(this.store.draftPage * pageSize, this.store.draftPage * pageSize + pageSize) : [];
      const cardW = (frame.width - 44) / 2;
      page.forEach((character, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        this.renderStarterRosterCard(character, x + col * (cardW + 12), rosterCardTop + row * (cardH + cardGap), cardW, cardH, 'playerTeam');
      });

      this.button(x, navY, 70, navH, 'Prev', () => {
        this.store.draftPage = Math.max(0, this.store.draftPage - 1);
        this.store.notify();
      }, { disabled: this.store.draftPage === 0, fill: COLORS.surfaceRaised, mono: true, fontSize: `${TYPE_SCALE.label}px` });
      this.mono(x + 86, navY + navH / 2 - 6, `Roster ${this.store.draftPage + 1}/${pageMax + 1}`, { color: COLORS.muted, fontSize: `${TYPE_SCALE.label}px` });
      this.button(x + frame.width - 102, navY, 70, navH, 'Next', () => {
        this.store.draftPage = Math.min(pageMax, this.store.draftPage + 1);
        this.store.notify();
      }, { disabled: this.store.draftPage === pageMax, fill: COLORS.surfaceRaised, mono: true, fontSize: `${TYPE_SCALE.label}px` });

      const ready = this.store.playerTeam.length === 3;
      this.button(x, ctaY, frame.width - 32, ctaH, ready ? 'Enter Domain' : `Choose ${3 - this.store.playerTeam.length} More`, () => this.store.startMatch(), {
        fill: ready ? COLORS.selection : COLORS.surfaceRaised,
        gradientTop: ready ? COLORS.talismanDim : COLORS.surfaceRaised,
        stroke: ready ? COLORS.talismanPaper : COLORS.line,
        color: ready ? '#08080a' : COLORS.text,
        fontSize: `${TYPE_SCALE.subtitle}px`,
        disabled: !ready,
      });
      this.renderCharacterDetailSheet(frame, 'playerTeam');
      this.toast(frame);
    }
  }
