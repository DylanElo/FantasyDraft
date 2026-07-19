import { TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=36';
import { firstCreationRoster } from '../core/roster.js?v=36';
import { skillVisualFor } from '../core/skill-visual-registry.js?v=36';
import { clamp, safeText, titleize } from '../core/text.js?v=36';
import {
  S3_COLORS,
  drawS3Button,
  drawS3Cost,
  drawS3Pager,
  drawS3Panel,
} from '../ui/season-three-ui.js?v=36';
import { BaseScene } from './base-scene.js?v=36';

export const TEAM_SETUP_FILTERS = Object.freeze([
  Object.freeze({ id: 'all', label: 'ALL 19' }),
  Object.freeze({ id: 'tokyo', label: 'TOKYO' }),
  Object.freeze({ id: 'kyoto', label: 'KYOTO' }),
  Object.freeze({ id: 'special', label: 'SPECIAL' }),
]);

const SPECIAL_TAGS = new Set(['hidden_inventory', 'jjk0', 'outsider']);

const FIRST_CREATION_ORDER = Object.freeze([
  'yuji_itadori',
  'megumi_fushiguro',
  'nobara_kugisaki',
  'maki_zenin',
  'toge_inumaki',
  'panda',
  'aoi_todo',
  'noritoshi_kamo',
  'momo_nishimiya',
  'mai_zenin',
  'kasumi_miwa',
  'kokichi_muta_mechamaru',
  'junpei_yoshino',
  'satoru_gojo_young',
  'suguru_geto_young',
  'shoko_ieiri_young',
  'utahime_iori_young',
  'mei_mei_young',
  'yuta_okkotsu_jjk0',
]);

export class DraftRosterScene extends BaseScene {
    constructor(key = 'DraftScene') {
      super(key);
      this.setupFilter = 'all';
      this.setupRosterIndex = 0;
      this.setupSkillIndex = 0;
      this.setupStudyCharacterId = null;
      this.setupStudyEntryRenders = 0;
      this.setupSkillTransition = 0;
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

    characterStudyLayout(frame) {
      const x = frame.x + 10;
      const w = frame.width - 20;
      const header = { x, y: frame.top, w, h: 62 };
      header.bottom = header.y + header.h;
      const cta = { x, y: frame.bottom - 50, w, h: 50 };
      const pager = { x, y: cta.y - 52, w, h: 44 };
      const contentY = header.bottom + 8;
      const contentBottom = pager.y - 8;
      const contentH = contentBottom - contentY;
      const skillMinH = 252;
      const heroH = clamp(
        Math.min(Math.round(contentH * 0.52), contentH - skillMinH - 8),
        248,
        320,
      );
      const hero = { x, y: contentY, w, h: heroH };
      const skill = { x, y: hero.y + hero.h + 8, w, h: contentBottom - hero.y - hero.h - 8 };
      return { frame, header, hero, skill, pager, cta };
    }

    overlayRect(x, y, w, h, color, alpha = 1) {
      const node = this.add.rectangle(x, y, w, h, color, alpha).setOrigin(0, 0);
      this.nodes.push(node);
      return node;
    }

    canonicalRoster() {
      const roster = firstCreationRoster();
      return FIRST_CREATION_ORDER.map((characterId) => roster[characterId]).filter(Boolean);
    }

    filteredSetupRoster() {
      const roster = this.canonicalRoster();
      if (this.setupFilter === 'tokyo') {
        return roster.filter((character) => (character.tags || []).includes('tokyo_student'));
      }
      if (this.setupFilter === 'kyoto') {
        return roster.filter((character) => (character.tags || []).includes('kyoto_student'));
      }
      if (this.setupFilter === 'special') {
        return roster.filter((character) => (character.tags || []).some((tag) => SPECIAL_TAGS.has(tag)));
      }
      return roster;
    }

    activeTeamKey() {
      return this.store.matchMode === 'cpu' && this.store.draftTarget === 'enemyTeam'
        ? 'enemyTeam'
        : 'playerTeam';
    }

    setSetupFilter(filterId) {
      if (!TEAM_SETUP_FILTERS.some((entry) => entry.id === filterId)) return;
      this.setupFilter = filterId;
      this.setupRosterIndex = 0;
    }

    moveSetupRoster(delta) {
      const roster = this.filteredSetupRoster();
      this.setupRosterIndex = clamp(this.setupRosterIndex + delta, 0, Math.max(0, roster.length - 1));
    }

    openSetupCharacterStudy(characterId) {
      this.setupSkillIndex = 0;
      this.setupStudyCharacterId = characterId;
      this.setupStudyEntryRenders = 2;
      this.store.openCharacterDetail(characterId);
    }

    moveSetupStudySkill(delta, skillCount) {
      const next = clamp(this.setupSkillIndex + delta, 0, Math.max(0, skillCount - 1));
      if (next === this.setupSkillIndex) return;
      this.setupSkillIndex = next;
      this.setupSkillTransition = delta < 0 ? -1 : 1;
    }

    targetRulePresentation(skill) {
      const rule = (skill && skill.target_rule) || {};
      const kind = titleize(rule.kind || 'enemy').toUpperCase();
      const minTargets = Math.max(0, Number(rule.min_targets) || 0);
      const maxTargets = Math.max(minTargets, Number(rule.max_targets) || minTargets);
      const count = minTargets === maxTargets ? `${maxTargets} TARGET` : `${minTargets}-${maxTargets} TARGETS`;
      const flags = [
        `SELF ${rule.allow_self ? 'YES' : 'NO'}`,
        `DOWNED ${rule.allow_dead ? 'YES' : 'NO'}`,
      ];
      if (rule.required_status) flags.push(`REQ ${titleize(rule.required_status).toUpperCase()}`);
      return { summary: `${kind} / ${count}`, flags: flags.join(' / ') };
    }

    renderSetupSection(x, y, label, right, accent = S3_COLORS.red) {
      this.mono(x, y, label, {
        color: S3_COLORS.inkText,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '900',
      });
      const lineStart = Math.min(right - 18, x + Math.max(112, label.length * 7 + 18));
      this.graphics.lineStyle(2, accent, 0.72);
      this.graphics.beginPath();
      this.graphics.moveTo(lineStart, y + 6);
      this.graphics.lineTo(right, y + 6);
      this.graphics.strokePath();
    }

    renderSetupTrio(layout, teamKey) {
      const { x, y, w, h } = layout.trio;
      const gap = 7;
      const slotW = (w - gap * 2) / 3;
      const team = this.store[teamKey] || [];
      const accent = teamKey === 'enemyTeam' ? S3_COLORS.red : S3_COLORS.cyan;
      this.renderSetupSection(
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
        const active = this.setupFilter === entry.id;
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
      this.setupRosterIndex = clamp(this.setupRosterIndex, 0, Math.max(0, roster.length - 1));
      const character = roster[this.setupRosterIndex];
      this.renderSetupFilters(layout.filters);
      if (character) this.renderSetupFeatured(character, this.setupRosterIndex, roster.length, layout.featured, teamKey);
      const filterName = (TEAM_SETUP_FILTERS.find((entry) => entry.id === this.setupFilter) || TEAM_SETUP_FILTERS[0]).label;
      drawS3Pager(this, layout.pager, `${filterName} / ${this.setupRosterIndex + 1} OF ${Math.max(1, roster.length)}`, () => {
        this.moveSetupRoster(-1);
      }, () => {
        this.moveSetupRoster(1);
      }, {
        prevDisabled: this.setupRosterIndex === 0,
        nextDisabled: this.setupRosterIndex >= roster.length - 1,
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
      const visual = skillVisualFor(skill);
      const replacement = visual && visual.kind === 'replacement';
      const originalSlot = visual && Number.isInteger(visual.slot) ? visual.slot : Math.min(index, 3);
      const artWidth = Math.min(112, Math.max(96, region.w * 0.29));
      const artRegion = { x: region.x + 4, y: region.y + 4, w: artWidth, h: 106 };
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.paper,
        accent: replacement ? S3_COLORS.gold : S3_COLORS.cyan,
        strokeWidth: 2,
        washAlpha: 0.16,
        hatch: false,
        cut: 8,
      });
      if (this.presentationLayer) {
        this.presentationLayer.renderSkillVisual(this, skill, artRegion, {
          depth: 1,
          iconDepth: 3,
          alpha: 0.9,
          state: this.setupStudyEntryRenders === 1 || this.setupSkillTransition ? 'selected' : 'available',
          sheen: this.setupStudyEntryRenders === 1 || Boolean(this.setupSkillTransition),
        });
      }
      const textX = artRegion.x + artRegion.w + 10;
      const metaY = region.y + 10;
      this.mono(textX, metaY, `SLOT ${originalSlot + 1} / ${replacement ? 'REPLACEMENT' : 'PRIMARY'}`, {
        color: replacement ? '#8A6416' : S3_COLORS.cyanText,
        fontSize: '12px',
        fontStyle: '900',
      });
      const name = this.text(textX, metaY + 21, safeText(skill.name, 'Technique'), {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
        color: S3_COLORS.inkText,
        fontSize: region.w <= 340 ? '17px' : '18px',
        fontStyle: '900',
        lineSpacing: -2,
        wordWrap: { width: Math.max(112, region.x + region.w - textX - 76) },
      });
      name.setMaxLines(2);
      drawS3Cost(this, region.x + region.w - 86, metaY + 39, skill.cost || [], { size: 14, gap: 4 });
      const targetRule = this.targetRulePresentation(skill);
      this.mono(textX, metaY + 67, `CD ${Number(skill.cooldown) || 0} / ${targetRule.summary}`, {
        color: S3_COLORS.inkText,
        fontSize: '11px',
        fontStyle: '900',
      });
      this.mono(textX, metaY + 85, targetRule.flags, {
        color: S3_COLORS.mutedText,
        fontSize: '11px',
        fontStyle: '800',
      });
      const classes = (skill.classes || []).map((entry) => titleize(entry).toUpperCase()).join(' / ') || 'TECHNIQUE';
      const classNode = this.mono(region.x + 12, region.y + 118, `CLASSES / ${classes}`, {
        color: S3_COLORS.mutedText,
        fontSize: '12px',
        fontStyle: '800',
        lineSpacing: -1,
        wordWrap: { width: region.w - 24 },
      });
      classNode.setMaxLines(2);
      const description = this.text(region.x + 12, region.y + 150, safeText(skill.text, 'No description available.'), {
        color: S3_COLORS.inkText,
        fontSize: '14px',
        fontStyle: '700',
        lineSpacing: 1,
        wordWrap: { width: region.w - 24 },
      });
      description.setMaxLines(6);
    }

    renderSetupCharacterStudy(frame, character, teamKey, drawHeader) {
      const layout = this.characterStudyLayout(frame);
      const team = this.store[teamKey] || [];
      const selected = team.includes(character.id);
      const trioFull = !selected && team.length >= 3;
      const skills = character.skills || [];
      if (this.setupStudyCharacterId !== character.id) {
        this.setupStudyCharacterId = character.id;
        this.setupSkillIndex = 0;
      }
      this.setupSkillIndex = clamp(this.setupSkillIndex, 0, Math.max(0, skills.length - 1));
      drawHeader(layout, selected);
      this.renderSetupStudyHero(character, selected, layout.hero, teamKey);
      let skillTargets = [];
      if (skills[this.setupSkillIndex]) {
        const skillNodeStart = this.nodes.length;
        this.renderSetupAuthoritativeSkill(skills[this.setupSkillIndex], this.setupSkillIndex, layout.skill);
        skillTargets = this.nodes.slice(skillNodeStart);
      }
      drawS3Pager(this, layout.pager, `Skill ${this.setupSkillIndex + 1} of ${Math.max(1, skills.length)}`, () => {
        this.moveSetupStudySkill(-1, skills.length);
      }, () => {
        this.moveSetupStudySkill(1, skills.length);
      }, {
        prevDisabled: this.setupSkillIndex === 0,
        nextDisabled: this.setupSkillIndex >= skills.length - 1,
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

      if (this.setupStudyEntryRenders > 0) {
        this.setupStudyEntryRenders -= 1;
        if (this.setupStudyEntryRenders === 0 && this.presentationLayer) {
          const profileTargets = this.nodes
            .filter((node) => node && node.setAlpha && Number(node.y) >= layout.hero.y && Number(node.y) < layout.pager.y)
            .slice(0, 6);
          this.presentationLayer.sceneIntro(this, {
            targets: profileTargets,
            options: { distance: 16, stagger: 4, duration: 140 },
          });
        }
      } else if (this.setupSkillTransition && this.presentationLayer) {
        this.presentationLayer.sceneIntro(this, {
          targets: skillTargets.filter((node) => node && node.setAlpha).slice(0, 6),
          options: {
            distance: this.setupSkillTransition < 0 ? -10 : 10,
            stagger: 4,
            duration: 140,
          },
        });
        this.setupSkillTransition = 0;
      }
      return layout;
    }
}
