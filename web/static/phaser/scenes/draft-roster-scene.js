import { TOKEN_TYPE } from '../core/runtime-config.js?v=57';
import { clamp, safeText, titleize } from '../core/text.js?v=57';
import { Season3UI } from '../ui/season3-ui.js?v=57';
import { FirstCreationScene } from './first-creation-scene.js?v=57';

const {
  colors: S3_COLORS,
  button: drawS3Button,
  pager: drawS3Pager,
  panel: drawS3Panel,
} = Season3UI.flow;

export const TEAM_SETUP_FILTERS = Object.freeze([
  Object.freeze({ id: 'all', label: 'ALL 19' }),
  Object.freeze({ id: 'tokyo', label: 'TOKYO' }),
  Object.freeze({ id: 'kyoto', label: 'KYOTO' }),
  Object.freeze({ id: 'special', label: 'SPECIAL' }),
]);

export class DraftRosterScene extends FirstCreationScene {
    constructor(key = 'DraftScene') {
      super(key);
    }

    teamSetupLayout(frame) {
      const x = frame.x + 10;
      const w = frame.width - 20;
      const header = { x, y: frame.top, w, h: 62 };
      header.bottom = header.y + header.h;
      const cta = { x, y: frame.bottom - 50, w, h: 50 };
      const pager = { x, y: cta.y - 52, w, h: 44 };
      const controls = { x, y: header.bottom + 8, w, h: 44 };
      const trioLabelY = controls.y + controls.h + 8;
      const trio = { x, y: trioLabelY + 18, w, h: 90 };
      const filters = { x, y: trio.y + trio.h + 8, w, h: 44 };
      const featured = {
        x,
        y: filters.y + filters.h + 8,
        w,
        h: Math.max(218, pager.y - filters.y - filters.h - 16),
      };
      return {
        frame,
        header,
        controls,
        trioLabelY,
        trio,
        filters,
        featured,
        pager,
        cta,
        toastY: pager.y - 54,
      };
    }

    filteredSetupRoster() {
      return this.filteredRoster();
    }

    activeTeamKey() {
      return this.store.matchMode === 'cpu' && this.store.draftTarget === 'enemyTeam'
        ? 'enemyTeam'
        : 'playerTeam';
    }

    setSetupFilter(filterId) {
      this.setCreationFilter(filterId);
    }

    moveSetupRoster(delta) {
      this.moveCreationRoster(delta);
    }

    openSetupCharacterStudy(characterId) {
      this.openCharacterStudy(characterId);
    }

    moveSetupStudySkill(delta, skillCount) {
      this.moveStudySkill(delta, skillCount);
    }

    renderSetupTrio(layout, teamKey) {
      const { x, y, w, h } = layout.trio;
      const gap = 7;
      const slotW = (w - gap * 2) / 3;
      const team = this.store[teamKey] || [];
      const accent = teamKey === 'enemyTeam' ? S3_COLORS.red : S3_COLORS.cyan;
      this.renderSectionLabel(
        x,
        layout.trioLabelY,
        `${teamKey === 'enemyTeam' ? 'CPU' : 'ACTIVE'} TRIO ${team.length}/3`,
        x + w,
        team.length === 3 ? accent : S3_COLORS.red,
      );

      [0, 1, 2].forEach((index) => {
        const id = team[index];
        const sx = x + index * (slotW + gap);
        drawS3Panel(this, sx, y, slotW, h, {
          fill: id ? S3_COLORS.paper : S3_COLORS.smoke,
          accent: id ? accent : S3_COLORS.red,
          strokeWidth: id ? 2.5 : 1.5,
          wash: false,
          hatch: false,
          cut: 6,
        });
        if (!id) {
          this.text(sx + slotW / 2, y + 12, '+', {
            fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
            color: S3_COLORS.redText,
            fontSize: '27px',
            fontStyle: '900',
          }).setOrigin(0.5, 0);
          this.mono(sx + slotW / 2, y + 53, `SLOT ${index + 1}`, {
            color: S3_COLORS.mutedText,
            fontSize: '11px',
            fontStyle: '900',
          }).setOrigin(0.5, 0);
          return;
        }

        const character = this.store.character(id);
        this.portraitArtwork(character, sx + 3, y + 3, slotW - 6, h - 6, {
          context: 'hero',
          tone: accent,
        });
        const bandH = 42;
        this.overlayRect(sx + 3, y + h - bandH - 3, slotW - 6, bandH, S3_COLORS.bone, 0.94);
        this.overlayRect(sx + 3, y + h - bandH - 3, slotW - 6, 3, accent, 0.94);
        const name = this.text(sx + slotW / 2, y + h - bandH + 1, safeText(character.name, id), {
          color: S3_COLORS.inkText,
          fontSize: '12px',
          fontStyle: '900',
          align: 'center',
          lineSpacing: -1,
          wordWrap: { width: slotW - 8 },
        }).setOrigin(0.5, 0);
        name.setMaxLines(3);
        this.registerHitTarget(sx, y, slotW, h, `Study ${character.name}`, () => this.openSetupCharacterStudy(character.id));
      });
    }

    renderSetupFilters(region) {
      const gap = 5;
      const buttonW = (region.w - gap * (TEAM_SETUP_FILTERS.length - 1)) / TEAM_SETUP_FILTERS.length;
      TEAM_SETUP_FILTERS.forEach((entry, index) => {
        const active = this.creationFilter === entry.id;
        drawS3Button(this, region.x + index * (buttonW + gap), region.y, buttonW, region.h, entry.label, () => {
          this.setSetupFilter(entry.id);
        }, {
          variant: active ? 'primary' : 'bone',
          accent: active ? S3_COLORS.gold : S3_COLORS.red,
          fontSize: '12px',
          mono: true,
        });
      });
    }

    toggleSetupCharacter(teamKey, character) {
      this.store.toggleTeamPick(teamKey, character.id);
    }

    renderSetupFeatured(character, index, total, region, teamKey) {
      const team = this.store[teamKey] || [];
      const selectedSlot = team.indexOf(character.id);
      const selected = selectedSlot >= 0;
      const full = !selected && team.length >= 3;
      const accent = teamKey === 'enemyTeam' ? S3_COLORS.red : S3_COLORS.cyan;
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.paper,
        accent: selected ? accent : S3_COLORS.red,
        strokeWidth: selected ? 3 : 2,
        wash: false,
        hatch: false,
        cut: 10,
      });
      this.portraitArtwork(character, region.x + 4, region.y + 4, region.w - 8, region.h - 8, {
        context: 'hero',
        tone: selected ? accent : S3_COLORS.red,
      });

      const identityH = 132;
      const bandY = region.y + region.h - identityH - 4;
      this.overlayRect(region.x + 4, bandY, region.w - 8, identityH, S3_COLORS.bone, 0.95);
      this.overlayRect(region.x + 4, bandY, region.w - 8, 4, selected ? accent : S3_COLORS.red, 0.96);
      this.mono(region.x + 12, region.y + 12, `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, {
        backgroundColor: '#101B36',
        color: S3_COLORS.whiteText,
        fontSize: '12px',
        fontStyle: '900',
        padding: { x: 6, y: 3 },
      });
      if (selected) {
        this.mono(region.x + region.w - 12, region.y + 12, `${teamKey === 'enemyTeam' ? 'CPU' : 'TRIO'} SLOT ${selectedSlot + 1}`, {
          backgroundColor: teamKey === 'enemyTeam' ? '#B91F1A' : '#087D86',
          color: S3_COLORS.whiteText,
          fontSize: '12px',
          fontStyle: '900',
          padding: { x: 6, y: 3 },
        }).setOrigin(1, 0);
      }

      const buttonW = Math.min(128, Math.max(112, region.w * 0.35));
      const textW = region.w - buttonW - 34;
      const name = this.text(region.x + 14, bandY + 10, safeText(character.name, character.id), {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
        color: S3_COLORS.inkText,
        fontSize: region.w <= 340 ? '19px' : '21px',
        fontStyle: '900',
        lineSpacing: -2,
        wordWrap: { width: textW },
      });
      name.setMaxLines(2);
      const role = this.text(region.x + 14, bandY + 52, character.role || 'Starter sorcerer', {
        color: S3_COLORS.inkText,
        fontSize: '12px',
        fontStyle: '800',
        lineSpacing: -1,
        wordWrap: { width: textW },
      });
      role.setMaxLines(2);
      this.mono(region.x + 14, bandY + 89, `STATE / ${safeText(character.state, 'FOUNDATIONS').toUpperCase()}`, {
        color: S3_COLORS.redText,
        fontSize: '11px',
        fontStyle: '900',
      });
      this.mono(region.x + 14, bandY + 111, 'TAP ART FOR STUDY  >', {
        color: S3_COLORS.cyanText,
        fontSize: '11px',
        fontStyle: '900',
      });
      this.registerHitTarget(region.x, region.y, region.w, region.h, `Open character study: ${character.name}`, () => {
        this.openSetupCharacterStudy(character.id);
      });
      drawS3Button(this, region.x + region.w - buttonW - 12, bandY + 38, buttonW, 58, selected ? 'Remove' : full ? 'Trio Full' : 'Add Fighter', () => {
        this.toggleSetupCharacter(teamKey, character);
      }, {
        variant: selected ? 'bone' : full ? 'smoke' : 'primary',
        accent: selected ? S3_COLORS.red : accent,
        disabled: full,
        fontSize: '14px',
      });
    }

    renderSetupRosterBrowser(layout, teamKey) {
      const roster = this.filteredSetupRoster();
      this.creationRosterIndex = clamp(this.creationRosterIndex, 0, Math.max(0, roster.length - 1));
      const character = roster[this.creationRosterIndex];
      this.renderSetupFilters(layout.filters);
      if (character) this.renderSetupFeatured(character, this.creationRosterIndex, roster.length, layout.featured, teamKey);
      const filterName = (TEAM_SETUP_FILTERS.find((entry) => entry.id === this.creationFilter) || TEAM_SETUP_FILTERS[0]).label;
      drawS3Pager(this, layout.pager, `${filterName} / ${this.creationRosterIndex + 1} OF ${Math.max(1, roster.length)}`, () => {
        this.moveSetupRoster(-1);
      }, () => {
        this.moveSetupRoster(1);
      }, {
        prevDisabled: this.creationRosterIndex === 0,
        nextDisabled: this.creationRosterIndex >= roster.length - 1,
        buttonW: 66,
      });
    }

    renderSetupStudyHero(character, selected, region, teamKey) {
      const accent = teamKey === 'enemyTeam' ? S3_COLORS.red : S3_COLORS.cyan;
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.paper,
        accent: selected ? accent : S3_COLORS.red,
        strokeWidth: 2.5,
        wash: false,
        hatch: false,
        cut: 10,
      });
      this.portraitArtwork(character, region.x + 4, region.y + 4, region.w - 8, region.h - 8, {
        context: 'hero',
        tone: selected ? accent : S3_COLORS.red,
      });
      const identityH = 112;
      const bandY = region.y + region.h - identityH - 4;
      this.overlayRect(region.x + 4, bandY, region.w - 8, identityH, S3_COLORS.bone, 0.95);
      this.overlayRect(region.x + 4, bandY, region.w - 8, 4, selected ? accent : S3_COLORS.red, 0.96);
      this.mono(region.x + 12, region.y + 12, `${titleize(character.era || 'student_era').toUpperCase()} / ${safeText(character.difficulty, 'MEDIUM').toUpperCase()}`, {
        backgroundColor: '#101B36',
        color: S3_COLORS.whiteText,
        fontSize: '12px',
        fontStyle: '900',
        padding: { x: 6, y: 3 },
      });
      const profileTags = (character.tags || []).map((tag) => titleize(tag).toUpperCase()).join(' / ') || 'STARTER';
      const tagNode = this.mono(region.x + 12, region.y + 49, `PROFILE / ${profileTags}`, {
        backgroundColor: '#101B36',
        color: S3_COLORS.whiteText,
        fontSize: '11px',
        fontStyle: '800',
        padding: { x: 5, y: 3 },
        lineSpacing: -1,
        wordWrap: { width: region.w - 24 },
      });
      tagNode.setMaxLines(2);
      if (selected) {
        this.mono(region.x + region.w - 12, region.y + 12, teamKey === 'enemyTeam' ? 'CPU TRIO' : 'ACTIVE TRIO', {
          backgroundColor: teamKey === 'enemyTeam' ? '#B91F1A' : '#087D86',
          color: S3_COLORS.whiteText,
          fontSize: '12px',
          fontStyle: '900',
          padding: { x: 6, y: 3 },
        }).setOrigin(1, 0);
      }
      const name = this.text(region.x + 14, bandY + 9, safeText(character.name, character.id), {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
        color: S3_COLORS.inkText,
        fontSize: region.w <= 340 ? '20px' : '22px',
        fontStyle: '900',
        lineSpacing: -2,
        wordWrap: { width: region.w - 28 },
      });
      name.setMaxLines(2);
      const role = this.text(region.x + 14, bandY + 50, character.role || 'Starter sorcerer', {
        color: S3_COLORS.inkText,
        fontSize: '14px',
        fontStyle: '800',
        lineSpacing: -1,
        wordWrap: { width: region.w - 28 },
      });
      role.setMaxLines(2);
      this.mono(region.x + 14, bandY + 88, `TACTICAL IDENTITY / ${safeText(character.state, 'FOUNDATIONS').toUpperCase()}`, {
        color: S3_COLORS.redText,
        fontSize: '12px',
        fontStyle: '900',
      });
    }

    renderSetupAuthoritativeSkill(skill, index, region) {
      this.renderAuthoritativeSkill(skill, index, 4, region);
    }

    renderSetupCharacterStudy(frame, character, teamKey, drawHeader) {
      const layout = this.characterStudyLayout(frame);
      const team = this.store[teamKey] || [];
      const selected = team.includes(character.id);
      const trioFull = !selected && team.length >= 3;
      const skills = character.skills || [];
      if (this.studyCharacterId !== character.id) {
        this.studyCharacterId = character.id;
        this.studySkillIndex = 0;
      }
      this.studySkillIndex = clamp(this.studySkillIndex, 0, Math.max(0, skills.length - 1));
      drawHeader(layout, selected);
      this.renderSetupStudyHero(character, selected, layout.hero, teamKey);
      let skillTargets = [];
      if (skills[this.studySkillIndex]) {
        const skillNodeStart = this.nodes.length;
        this.renderSetupAuthoritativeSkill(skills[this.studySkillIndex], this.studySkillIndex, layout.skill);
        skillTargets = this.nodes.slice(skillNodeStart);
      }
      drawS3Pager(this, layout.pager, `Skill ${this.studySkillIndex + 1} of ${Math.max(1, skills.length)}`, () => {
        this.moveSetupStudySkill(-1, skills.length);
      }, () => {
        this.moveSetupStudySkill(1, skills.length);
      }, {
        prevDisabled: this.studySkillIndex === 0,
        nextDisabled: this.studySkillIndex >= skills.length - 1,
        buttonW: 66,
      });
      const teamLabel = teamKey === 'enemyTeam' ? 'CPU Trio' : 'Active Trio';
      drawS3Button(this, layout.cta.x, layout.cta.y, layout.cta.w, layout.cta.h, selected ? `Remove From ${teamLabel}` : trioFull ? `${teamLabel} Full` : `Add To ${teamLabel}`, () => {
        this.store.toggleTeamPick(teamKey, character.id);
      }, {
        variant: selected ? 'bone' : trioFull ? 'smoke' : 'primary',
        accent: selected ? S3_COLORS.red : teamKey === 'enemyTeam' ? S3_COLORS.red : S3_COLORS.cyan,
        disabled: trioFull,
        fontSize: '17px',
      });
      this.toast(frame, { y: layout.pager.y - 54, theme: 'light' });

      this.animateCharacterStudy(layout, skillTargets);
      return layout;
    }
}
