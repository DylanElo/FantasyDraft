import { TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=32';
import { firstCreationRoster } from '../core/roster.js?v=32';
import { skillVisualFor } from '../core/skill-visual-registry.js?v=32';
import { clamp, safeText, titleize } from '../core/text.js?v=32';
import {
  S3_COLORS,
  drawS3Button,
  drawS3Cost,
  drawS3Header,
  drawS3Pager,
  drawS3Panel,
  drawS3World,
} from '../ui/season-three-ui.js?v=32';
import { BaseScene } from './base-scene.js?v=32';

const FIRST_CREATION_WORLD_KEY = 'culling-current-campus';

const CREATION_FILTERS = Object.freeze([
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

export class FirstCreationScene extends BaseScene {
    constructor() {
      super('FirstCreationScene');
      this.creationFilter = 'all';
      this.creationRosterIndex = 0;
      this.studySkillIndex = 0;
      this.studyCharacterId = null;
      this.studyEntryRenders = 0;
      this.studySkillTransition = 0;
    }

    firstCreationLayout(frame) {
      const x = frame.x + 10;
      const w = frame.width - 20;
      const header = { x, y: frame.top, w, h: 62 };
      header.bottom = header.y + header.h;
      const cta = { x, y: frame.bottom - 50, w, h: 50 };
      const pager = { x, y: cta.y - 52, w, h: 44 };
      const trioLabelY = header.bottom + 8;
      const trio = { x, y: trioLabelY + 18, w, h: 98 };
      const filters = { x, y: trio.y + trio.h + 8, w, h: 44 };
      const featured = {
        x,
        y: filters.y + filters.h + 8,
        w,
        h: Math.max(230, pager.y - filters.y - filters.h - 16),
      };
      return {
        frame,
        header,
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
      // Reserve enough room for six authoritative description lines on the
      // smallest supported safe-area viewport. The character art remains the
      // dominant profile element without forcing technique text under pager.
      const skillMinH = 252;
      const heroH = clamp(
        Math.min(Math.round(contentH * 0.52), contentH - skillMinH - 8),
        248,
        320,
      );
      const hero = { x, y: contentY, w, h: heroH };
      const skill = {
        x,
        y: hero.y + hero.h + 8,
        w,
        h: contentBottom - hero.y - hero.h - 8,
      };
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

    filteredRoster() {
      const roster = this.canonicalRoster();
      if (this.creationFilter === 'tokyo') {
        return roster.filter((character) => (character.tags || []).includes('tokyo_student'));
      }
      if (this.creationFilter === 'kyoto') {
        return roster.filter((character) => (character.tags || []).includes('kyoto_student'));
      }
      if (this.creationFilter === 'special') {
        return roster.filter((character) => (character.tags || []).some((tag) => SPECIAL_TAGS.has(tag)));
      }
      return roster;
    }

    setCreationFilter(filterId) {
      if (!CREATION_FILTERS.some((entry) => entry.id === filterId)) return;
      this.creationFilter = filterId;
      this.creationRosterIndex = 0;
    }

    moveCreationRoster(delta) {
      const roster = this.filteredRoster();
      this.creationRosterIndex = clamp(this.creationRosterIndex + delta, 0, Math.max(0, roster.length - 1));
    }

    openCharacterStudy(characterId) {
      this.studySkillIndex = 0;
      this.studyCharacterId = characterId;
      // Store notification renders once inside this callback and BaseScene
      // renders once more after the pointer handler. Animate that second,
      // stable composition rather than nodes that are immediately cleared.
      this.studyEntryRenders = 2;
      this.store.openCharacterDetail(characterId);
    }

    moveStudySkill(delta, skillCount) {
      const next = clamp(this.studySkillIndex + delta, 0, Math.max(0, skillCount - 1));
      if (next === this.studySkillIndex) return;
      this.studySkillIndex = next;
      this.studySkillTransition = delta < 0 ? -1 : 1;
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

    renderSectionLabel(x, y, label, right, accent = S3_COLORS.red) {
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

    renderTrioSlots(layout) {
      const { x, y, w, h } = layout.trio;
      const gap = 7;
      const slotW = (w - gap * 2) / 3;
      const ready = this.store.playerTeam.length;
      this.renderSectionLabel(
        x,
        layout.trioLabelY,
        `ACTIVE TRIO ${ready}/3`,
        x + w,
        ready === 3 ? S3_COLORS.cyan : S3_COLORS.red,
      );

      [0, 1, 2].forEach((index) => {
        const id = this.store.playerTeam[index];
        const sx = x + index * (slotW + gap);
        drawS3Panel(this, sx, y, slotW, h, {
          fill: id ? S3_COLORS.paper : S3_COLORS.smoke,
          accent: id ? S3_COLORS.cyan : S3_COLORS.red,
          strokeWidth: id ? 2.5 : 1.5,
          wash: false,
          hatch: false,
          cut: 6,
        });

        if (!id) {
          this.text(sx + slotW / 2, y + 18, '+', {
            fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
            color: S3_COLORS.redText,
            fontSize: '28px',
            fontStyle: '900',
          }).setOrigin(0.5, 0);
          this.mono(sx + slotW / 2, y + 57, `SLOT ${index + 1}`, {
            color: S3_COLORS.mutedText,
            fontSize: '12px',
            fontStyle: '900',
          }).setOrigin(0.5, 0);
          return;
        }

        const character = this.store.character(id);
        this.portraitArtwork(character, sx + 3, y + 3, slotW - 6, h - 6, {
          context: 'hero',
          tone: S3_COLORS.cyan,
        });
        const bandH = 46;
        this.overlayRect(sx + 3, y + h - bandH - 3, slotW - 6, bandH, S3_COLORS.bone, 0.94);
        this.overlayRect(sx + 3, y + h - bandH - 3, slotW - 6, 3, S3_COLORS.cyan, 0.92);
        this.mono(sx + 7, y + 7, `0${index + 1}`, {
          backgroundColor: '#101B36',
          color: S3_COLORS.whiteText,
          fontSize: '10px',
          fontStyle: '900',
          padding: { x: 4, y: 2 },
        });
        const name = this.text(sx + slotW / 2, y + h - bandH + 1, character.name, {
          color: S3_COLORS.inkText,
          fontSize: '13px',
          fontStyle: '900',
          align: 'center',
          lineSpacing: -1,
          wordWrap: { width: slotW - 10 },
        }).setOrigin(0.5, 0);
        name.setMaxLines(3);
        this.registerHitTarget(sx, y, slotW, h, `Study ${character.name}`, () => this.openCharacterStudy(character.id));
      });
    }

    renderFilters(region) {
      const gap = 5;
      const buttonW = (region.w - gap * (CREATION_FILTERS.length - 1)) / CREATION_FILTERS.length;
      CREATION_FILTERS.forEach((entry, index) => {
        const active = this.creationFilter === entry.id;
        drawS3Button(
          this,
          region.x + index * (buttonW + gap),
          region.y,
          buttonW,
          region.h,
          entry.label,
          () => this.setCreationFilter(entry.id),
          {
            variant: active ? 'primary' : 'bone',
            accent: active ? S3_COLORS.gold : S3_COLORS.red,
            fontSize: '12px',
            mono: true,
          },
        );
      });
    }

    renderFeaturedCharacter(character, index, total, region) {
      const selectedSlot = this.store.playerTeam.indexOf(character.id);
      const selected = selectedSlot >= 0;
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.paper,
        accent: selected ? S3_COLORS.cyan : S3_COLORS.red,
        strokeWidth: selected ? 3 : 2,
        wash: false,
        hatch: false,
        cut: 10,
      });
      this.portraitArtwork(character, region.x + 4, region.y + 4, region.w - 8, region.h - 8, {
        context: 'hero',
        tone: selected ? S3_COLORS.cyan : S3_COLORS.red,
      });

      const identityH = 128;
      const bandY = region.y + region.h - identityH - 4;
      this.overlayRect(region.x + 4, bandY, region.w - 8, identityH, S3_COLORS.bone, 0.95);
      this.overlayRect(region.x + 4, bandY, region.w - 8, 4, selected ? S3_COLORS.cyan : S3_COLORS.red, 0.96);

      this.mono(region.x + 12, region.y + 12, `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, {
        backgroundColor: '#101B36',
        color: S3_COLORS.whiteText,
        fontSize: '12px',
        fontStyle: '900',
        padding: { x: 6, y: 3 },
      });
      if (selected) {
        this.mono(region.x + region.w - 12, region.y + 12, `TRIO SLOT ${selectedSlot + 1}`, {
          backgroundColor: '#087D86',
          color: S3_COLORS.whiteText,
          fontSize: '12px',
          fontStyle: '900',
          padding: { x: 6, y: 3 },
        }).setOrigin(1, 0);
      }

      const name = this.text(region.x + 14, bandY + 10, character.name, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
        color: S3_COLORS.inkText,
        fontSize: region.w <= 340 ? '21px' : '23px',
        fontStyle: '900',
        lineSpacing: -2,
        wordWrap: { width: region.w - 28 },
      });
      name.setMaxLines(2);
      const role = this.text(region.x + 14, bandY + 49, character.role || 'Starter sorcerer', {
        color: S3_COLORS.inkText,
        fontSize: '14px',
        fontStyle: '800',
        lineSpacing: -1,
        wordWrap: { width: region.w - 28 },
      });
      role.setMaxLines(2);
      this.mono(region.x + 14, bandY + 85, `CORE STATE / ${safeText(character.state, 'FOUNDATIONS').toUpperCase()}`, {
        color: S3_COLORS.redText,
        fontSize: '12px',
        fontStyle: '900',
      });
      this.mono(region.x + 14, bandY + 106, 'TAP FOR FULL CHARACTER STUDY  >', {
        color: S3_COLORS.cyanText,
        fontSize: '12px',
        fontStyle: '900',
      });
      this.registerHitTarget(region.x, region.y, region.w, region.h, `Open character study: ${character.name}`, () => this.openCharacterStudy(character.id));
    }

    renderRosterBrowser(frame, layout) {
      const roster = this.filteredRoster();
      this.creationRosterIndex = clamp(this.creationRosterIndex, 0, Math.max(0, roster.length - 1));
      const character = roster[this.creationRosterIndex];
      this.renderFilters(layout.filters);
      if (character) this.renderFeaturedCharacter(character, this.creationRosterIndex, roster.length, layout.featured);

      const filterName = (CREATION_FILTERS.find((entry) => entry.id === this.creationFilter) || CREATION_FILTERS[0]).label;
      drawS3Pager(this, layout.pager, `${filterName} / ${this.creationRosterIndex + 1} OF ${Math.max(1, roster.length)}`, () => {
        this.moveCreationRoster(-1);
      }, () => {
        this.moveCreationRoster(1);
      }, {
        prevDisabled: this.creationRosterIndex === 0,
        nextDisabled: this.creationRosterIndex >= roster.length - 1,
        buttonW: 66,
      });

      const ready = this.store.playerTeam.length === 3;
      drawS3Button(
        this,
        layout.cta.x,
        layout.cta.y,
        layout.cta.w,
        layout.cta.h,
        ready ? 'Review Matchup' : `Choose ${3 - this.store.playerTeam.length} More`,
        () => this.store.startMatch(),
        {
          variant: ready ? 'primary' : 'smoke',
          accent: ready ? S3_COLORS.cyan : S3_COLORS.red,
          disabled: !ready,
          fontSize: '18px',
        },
      );
      this.toast(frame, { y: layout.toastY, theme: 'light' });
    }

    renderStudyHero(character, selected, region) {
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.paper,
        accent: selected ? S3_COLORS.cyan : S3_COLORS.red,
        strokeWidth: 2.5,
        wash: false,
        hatch: false,
        cut: 10,
      });
      this.portraitArtwork(character, region.x + 4, region.y + 4, region.w - 8, region.h - 8, {
        context: 'hero',
        tone: selected ? S3_COLORS.cyan : S3_COLORS.red,
      });

      const identityH = 112;
      const bandY = region.y + region.h - identityH - 4;
      this.overlayRect(region.x + 4, bandY, region.w - 8, identityH, S3_COLORS.bone, 0.95);
      this.overlayRect(region.x + 4, bandY, region.w - 8, 4, selected ? S3_COLORS.cyan : S3_COLORS.red, 0.96);
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
        fontSize: '10px',
        fontStyle: '800',
        padding: { x: 5, y: 3 },
        lineSpacing: -1,
        wordWrap: { width: region.w - 24 },
      });
      tagNode.setMaxLines(2);
      if (selected) {
        this.mono(region.x + region.w - 12, region.y + 12, 'ACTIVE TRIO', {
          backgroundColor: '#087D86',
          color: S3_COLORS.whiteText,
          fontSize: '12px',
          fontStyle: '900',
          padding: { x: 6, y: 3 },
        }).setOrigin(1, 0);
      }

      const name = this.text(region.x + 14, bandY + 9, character.name, {
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

    renderAuthoritativeSkill(skill, index, total, region) {
      const visual = skillVisualFor(skill);
      const replacement = visual && visual.kind === 'replacement';
      const originalSlot = visual && Number.isInteger(visual.slot) ? visual.slot : Math.min(index, 3);
      const artWidth = Math.min(112, Math.max(96, region.w * 0.29));
      const artRegion = {
        x: region.x + 4,
        y: region.y + 4,
        w: artWidth,
        h: 106,
      };
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
          state: this.studyEntryRenders === 1 || this.studySkillTransition ? 'selected' : 'available',
          sheen: this.studyEntryRenders === 1 || Boolean(this.studySkillTransition),
        });
      }
      const textX = artRegion.x + artRegion.w + 10;
      const metaY = region.y + 10;
      this.mono(textX, metaY, `SLOT ${originalSlot + 1} / ${replacement ? 'REPLACEMENT' : 'PRIMARY'}`, {
        color: replacement ? '#8A6416' : S3_COLORS.cyanText,
        fontSize: '12px',
        fontStyle: '900',
      });
      if (replacement) {
        this.mono(region.x + region.w - 12, metaY, 'REPLACEMENT', {
          backgroundColor: '#D8BF68',
          color: S3_COLORS.inkText,
          fontSize: '12px',
          fontStyle: '900',
          padding: { x: 5, y: 2 },
        }).setOrigin(1, 0);
      }

      const name = this.text(textX, metaY + 21, skill.name, {
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
        fontSize: '9px',
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

      const descriptionY = region.y + 150;
      const description = this.text(region.x + 12, descriptionY, skill.text, {
        color: S3_COLORS.inkText,
        fontSize: '14px',
        fontStyle: '700',
        lineSpacing: 1,
        wordWrap: { width: region.w - 24 },
      });
      description.setMaxLines(6);
    }

    renderCharacterStudy(frame, character) {
      const layout = this.characterStudyLayout(frame);
      const selected = this.store.playerTeam.includes(character.id);
      const trioFull = !selected && this.store.playerTeam.length >= 3;
      const skills = character.skills || [];
      if (this.studyCharacterId !== character.id) {
        this.studyCharacterId = character.id;
        this.studySkillIndex = 0;
      }
      this.studySkillIndex = clamp(this.studySkillIndex, 0, Math.max(0, skills.length - 1));

      drawS3Header(this, frame, {
        eyebrow: 'FIRST CREATION / CHARACTER STUDY',
        title: 'Character Study',
        accent: selected ? S3_COLORS.cyan : S3_COLORS.red,
        backHandler: () => this.store.closeCharacterDetail(),
      });
      this.renderStudyHero(character, selected, layout.hero);
      let skillTargets = [];
      if (skills[this.studySkillIndex]) {
        const skillNodeStart = this.nodes.length;
        this.renderAuthoritativeSkill(skills[this.studySkillIndex], this.studySkillIndex, skills.length, layout.skill);
        skillTargets = this.nodes.slice(skillNodeStart);
      }
      drawS3Pager(this, layout.pager, `Skill ${this.studySkillIndex + 1} of ${Math.max(1, skills.length)}`, () => {
        this.moveStudySkill(-1, skills.length);
      }, () => {
        this.moveStudySkill(1, skills.length);
      }, {
        prevDisabled: this.studySkillIndex === 0,
        nextDisabled: this.studySkillIndex >= skills.length - 1,
        buttonW: 66,
      });
      drawS3Button(this, layout.cta.x, layout.cta.y, layout.cta.w, layout.cta.h, selected ? 'Remove From Active Trio' : trioFull ? 'Active Trio Full' : 'Add To Active Trio', () => {
        this.store.toggleTeamPick('playerTeam', character.id);
      }, {
        variant: selected ? 'bone' : trioFull ? 'smoke' : 'primary',
        accent: selected ? S3_COLORS.red : S3_COLORS.cyan,
        disabled: trioFull,
        fontSize: '17px',
      });
      this.toast(frame, { y: layout.pager.y - 54, theme: 'light' });

      if (this.studyEntryRenders > 0) {
        this.studyEntryRenders -= 1;
        if (this.studyEntryRenders === 0 && this.presentationLayer) {
          const profileTargets = this.nodes
            .filter((node) => node && node.setAlpha && Number(node.y) >= layout.hero.y && Number(node.y) < layout.pager.y)
            .slice(0, 6);
          this.presentationLayer.sceneIntro(this, {
            targets: profileTargets,
            options: { distance: 16, stagger: 4, duration: 140 },
          });
        }
      } else if (this.studySkillTransition && this.presentationLayer) {
        this.presentationLayer.sceneIntro(this, {
          targets: skillTargets.filter((node) => node && node.setAlpha).slice(0, 6),
          options: {
            distance: this.studySkillTransition < 0 ? -10 : 10,
            stagger: 4,
            duration: 140,
          },
        });
        this.studySkillTransition = 0;
      }
    }

    render() {
      const frame = this.layout.frame();
      const detail = this.store.detailCharacterId ? this.store.character(this.store.detailCharacterId) : null;
      this.clearSurface();
      drawS3World(this, frame, FIRST_CREATION_WORLD_KEY, {
        imageAlpha: detail ? 0.34 : 0.54,
        washAlpha: detail ? 0.58 : 0.48,
      });

      if (detail && detail.id) {
        this.renderCharacterStudy(frame, detail);
        this.presentSurface(frame, { moteCount: 6, parallax: 2 });
        return;
      }

      const layout = this.firstCreationLayout(frame);
      drawS3Header(this, frame, {
        eyebrow: 'STUDENT ERA / BUILD YOUR TEAM',
        title: 'First Creation',
        backHandler: () => this.store.resetToLobby(),
      });
      this.renderTrioSlots(layout);
      this.renderRosterBrowser(frame, layout);
      this.presentSurface(frame, { moteCount: 7, parallax: 3 });
    }
  }
