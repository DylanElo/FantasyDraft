import { BOOT, COLORS, TYPE_SCALE } from '../core/runtime-config.js?v=21';
import { clamp, safeText, shortText } from '../core/text.js?v=21';
import { DraftRosterScene } from './draft-roster-scene.js?v=21';

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
        this.railLabel(x, y + 74, 'CPU TRIO', COLORS.enemy, { color: '#f1a0a0' });
        this.store.enemyTeam.forEach((id, index) => this.renderDraftSlot(x + index * (slotW + 8), y + 88, slotW, id, index, COLORS.enemy));
      } else if (this.store.lobbyStatus && this.store.lobbyStatus.status === 'waiting') {
        this.text(x, y + 76, `Waiting in room ${this.store.lobbyStatus.room_id}.`, { color: '#a3eadf', fontSize: `${TYPE_SCALE.body}px` });
      }
    }

    renderDraftSlot(x, y, w, id, index, tone) {
      const character = this.store.character(id);
      this.platePanel(x, y, w, 62, tone, { alpha: 0.78, edgeBar: 'left' });
      this.platePortrait(character, x + 6, y + 8, 38, { tone });
      this.mono(x + 8, y + 5, `S${index + 1}`, { color: COLORS.text, fontSize: `${TYPE_SCALE.micro}px` });
      this.text(x + 50, y + 14, shortText(safeText(character.name, id), 16), {
        fontSize: `${TYPE_SCALE.body}px`,
        fontStyle: '800',
        wordWrap: { width: w - 56 },
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.worldBackdrop(frame, { textureKey: null, ambient: 'motes' });
      this.dossierHeader(frame, { eyebrow: 'CURSED CLASH', title: 'Draft', backHandler: () => this.store.resetToLobby() });
      const x = frame.x + frame.gutter;
      const compact = frame.height < 760;
      const ultraCompact = frame.height < 700;
      const isCpu = this.store.matchMode === 'cpu';
      let y = 86;
      // On very short viewports the mission-preview panel is the first thing
      // dropped -- it's the least essential block (the same info is always
      // reachable from Mission Map) and freeing its ~88px is what keeps the
      // roster grid from being squeezed below its safe minimum card height.
      if (!ultraCompact) y += this.renderMissionPreview(frame, y);

      const presets = (BOOT.firstCreation && BOOT.firstCreation.presets) || {};
      const presetNames = Object.keys(presets).slice(0, 4);
      this.railLabel(x, y, 'PRESETS', COLORS.line);
      const small = (frame.width - 44) / 2;
      const presetBtnH = compact ? 30 : 36;
      presetNames.slice(0, 2).forEach((name, index) => {
        this.button(x + index * (small + 12), y + 16, small, presetBtnH, name.replace(/_/g, ' '), () => this.store.applyPreset(name, 'playerTeam'), {
          fill: COLORS.surfaceRaised,
          stroke: COLORS.ally,
          fontSize: `${TYPE_SCALE.label}px`,
          mono: true,
        });
      });
      let presetsBottom = y + 16 + presetBtnH;
      if (isCpu) {
        const cpuPresetY = presetsBottom + (compact ? 6 : 8);
        presetNames.slice(2, 4).forEach((name, index) => {
          this.button(x + index * (small + 12), cpuPresetY, small, presetBtnH, `CPU ${name.replace(/_/g, ' ')}`, () => this.store.applyPreset(name, 'enemyTeam'), {
            fill: COLORS.surfaceRaised,
            stroke: COLORS.enemy,
            fontSize: `${TYPE_SCALE.label}px`,
            mono: true,
          });
        });
        presetsBottom = cpuPresetY + presetBtnH;
        const difficultyLabelY = presetsBottom + (compact ? 10 : 12);
        this.railLabel(x, difficultyLabelY, 'CPU DIFFICULTY', COLORS.enemy, { color: '#f1a0a0' });
        const diffBtnY = difficultyLabelY + (compact ? 14 : 18);
        const diffBtnH = compact ? 28 : 32;
        const diffW = (frame.width - 44 - 16) / 3;
        ['easy', 'normal', 'hard'].forEach((level, index) => {
          const active = this.store.difficulty === level;
          this.button(x + index * (diffW + 8), diffBtnY, diffW, diffBtnH, level.toUpperCase(), () => this.store.setDifficulty(level), {
            fill: active ? COLORS.selection : COLORS.surfaceRaised,
            stroke: active ? COLORS.selection : COLORS.line,
            fontSize: `${TYPE_SCALE.label}px`,
            mono: true,
          });
        });
        presetsBottom = diffBtnY + diffBtnH;
      }
      y = presetsBottom + (compact ? 12 : 18);

      this.renderTeamDock(frame, y);
      y += (isCpu ? 88 + 62 : 62) + (compact ? 12 : 16);

      const targetW = (frame.width - 44) / 2;
      const editH = compact ? 30 : 34;
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
      const ctaH = 40;
      const ctaY = frame.height - ctaH - 14;
      const navH = compact ? 30 : 38;
      const navY = ctaY - (compact ? 8 : 10) - navH;

      const roster = this.store.rosterEntries();
      const cardGap = compact ? 8 : 12;
      const rosterCardTop = rosterLabelY + (compact ? 20 : 26);
      // renderRosterCard's own internal content (portrait, name, role, skill
      // preview) uses fixed offsets up to ~91px regardless of the h it's
      // given -- shrinking cardH below that makes its own text spill out
      // past the card's drawn edge. So cardH never shrinks; only the row
      // count adapts to whatever space is actually available.
      const cardH = 100;
      const available = navY - rosterCardTop;
      const rows = Math.max(1, Math.floor((available + cardGap) / (cardH + cardGap)));
      const pageSize = rows * 2;
      const pageMax = Math.max(0, Math.ceil(roster.length / pageSize) - 1);
      this.store.draftPage = clamp(this.store.draftPage, 0, pageMax);
      const page = roster.slice(this.store.draftPage * pageSize, this.store.draftPage * pageSize + pageSize);
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
