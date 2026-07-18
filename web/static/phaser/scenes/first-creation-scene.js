import { TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=27';
import { clamp, titleize } from '../core/text.js?v=27';
import {
  S3_COLORS,
  drawS3Button,
  drawS3Chip,
  drawS3Cost,
  drawS3Header,
  drawS3Pager,
  drawS3Panel,
  drawS3Portrait,
  drawS3Progress,
  drawS3World,
  firstCreationS3Layout,
} from '../ui/season-three-ui.js?v=27';
import { DraftScene } from './draft-scene.js?v=27';

const FIRST_CREATION_WORLD_KEY = 'culling-current-campus';

export class FirstCreationScene extends DraftScene {
    constructor() {
      super('FirstCreationScene');
    }

    renderS3Section(x, y, label, right, accent = S3_COLORS.red) {
      this.mono(x, y, label, {
        color: S3_COLORS.inkText,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '900',
      });
      const lineStart = Math.min(right - 18, x + Math.max(96, label.length * 7 + 18));
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
      this.renderS3Section(x, layout.trioLabelY, `YOUR FIRST TRIO ${ready}/3`, x + w, ready === 3 ? S3_COLORS.cyan : S3_COLORS.red);
      [0, 1, 2].forEach((index) => {
        const id = this.store.playerTeam[index];
        const sx = x + index * (slotW + gap);
        drawS3Panel(this, sx, y, slotW, h, {
          fill: id ? S3_COLORS.paper : S3_COLORS.smoke,
          accent: id ? S3_COLORS.cyan : S3_COLORS.red,
          strokeWidth: id ? 2.5 : 1.5,
          washAlpha: id ? 0.22 : 0.4,
          cut: 6,
        });
        this.mono(sx + 7, y + 6, `S${index + 1}`, {
          color: id ? S3_COLORS.cyanText : S3_COLORS.mutedText,
          fontSize: `${TYPE_SCALE.micro}px`,
          fontStyle: '900',
        });
        if (!id) {
          this.text(sx + slotW / 2, y + 39, 'OPEN SLOT', {
            fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
            color: S3_COLORS.mutedText,
            fontSize: `${TYPE_SCALE.label}px`,
            fontStyle: '900',
          }).setOrigin(0.5, 0);
          return;
        }
        const character = this.store.character(id);
        drawS3Portrait(this, character, sx + slotW / 2 - 17, y + 7, 34, 34, {
          accent: S3_COLORS.cyan,
          selected: true,
        });
        const name = this.text(sx + slotW / 2, y + 46, character.name, {
          color: S3_COLORS.inkText,
          fontSize: '12px',
          fontStyle: '900',
          align: 'center',
          lineSpacing: 0,
          wordWrap: { width: slotW - 10 },
        }).setOrigin(0.5, 0);
        name.setMaxLines(3);
      });
    }

    renderPresetTile(entry, x, y, w, h) {
      const active = entry.team.length === 3 && entry.team.every((id) => this.store.playerTeam.includes(id));
      const presetStateLabel = active ? 'ACTIVE TRIO' : 'USE PRESET';
      drawS3Panel(this, x, y, w, h, {
        fill: active ? 0xe1eee9 : S3_COLORS.paper,
        accent: active ? S3_COLORS.cyan : S3_COLORS.gold,
        strokeWidth: active ? 2.5 : 1.5,
        cut: 6,
        washAlpha: 0.2,
      });
      const title = this.text(x + 8, y + 7, entry.title, {
        color: S3_COLORS.inkText,
        fontSize: '12px',
        fontStyle: '900',
        lineSpacing: 0,
        wordWrap: { width: w - 16 },
      });
      title.setMaxLines(2);
      entry.team.slice(0, 3).forEach((id, index) => {
        drawS3Portrait(this, this.store.character(id), x + 8 + index * 26, y + 41, 22, 22, {
          accent: active ? S3_COLORS.cyan : S3_COLORS.gold,
          selected: active,
        });
      });
      drawS3Chip(this, x + w - 76, y + 43, active ? 'ACTIVE' : 'USE TRIO', {
        w: 68,
        h: 20,
        fill: active ? S3_COLORS.cyanDeep : S3_COLORS.ink,
        stroke: active ? S3_COLORS.cyan : S3_COLORS.gold,
        fontSize: '12px',
      });
      this.registerHitTarget(x, y, w, h, `${presetStateLabel}: ${entry.title}`, () => this.store.applyPreset(entry.id, 'playerTeam'));
    }

    renderMissionHeader(layout) {
      const { x, y, w, h } = layout.mission;
      const mission = this.store.activeMission();
      const profile = this.store.firstCreationProfile();
      const completed = (profile.completed_missions || []).length;
      const total = this.store.missions().length || 1;
      const pct = clamp(completed / total, 0, 1);
      drawS3Panel(this, x, y, w, h, {
        fill: S3_COLORS.bone,
        accent: S3_COLORS.red,
        cut: 8,
        washAlpha: 0.32,
      });
      this.text(x + 12, y + 8, 'WELCOME TO JUJUTSU HIGH', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
        color: S3_COLORS.inkText,
        fontSize: '17px',
        fontStyle: '900',
      });
      const routeName = this.text(x + 12, y + 35, mission ? mission.title : 'Starter route ready', {
        color: S3_COLORS.mutedText,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '800',
        wordWrap: { width: w - 132 },
      });
      routeName.setMaxLines(2);
      drawS3Button(this, x + w - 112, y + 10, 104, 44, 'Mission Map', () => this.store.changeScene('MissionMapScene'), {
        variant: 'bone',
        accent: S3_COLORS.red,
        fontSize: '12px',
        mono: true,
      });
      drawS3Progress(this, x + 12, y + 66, w - 116, 7, pct, { fill: S3_COLORS.cyan });
      this.mono(x + w - 96, y + 63, `${completed}/${total} ROUTES`, {
        color: S3_COLORS.inkText,
        fontSize: '12px',
        fontStyle: '900',
      });
    }

    renderStarterRosterCard(character, x, y, w, h, teamKey) {
      const selected = this.store[teamKey].includes(character.id);
      drawS3Panel(this, x, y, w, h, {
        fill: selected ? 0xe1eee9 : S3_COLORS.paper,
        accent: selected ? S3_COLORS.cyan : S3_COLORS.red,
        strokeWidth: selected ? 3 : 1.5,
        cut: 7,
        washAlpha: selected ? 0.14 : 0.25,
      });
      drawS3Portrait(this, character, x + 8, y + 8, 40, 40, {
        accent: selected ? S3_COLORS.cyan : S3_COLORS.gold,
        selected,
      });
      const name = this.text(x + 55, y + 6, character.name, {
        color: S3_COLORS.inkText,
        fontSize: w < 175 ? '12px' : '13px',
        fontStyle: '900',
        lineSpacing: 0,
        wordWrap: { width: w - 62 },
      });
      name.setMaxLines(2);
      const role = this.text(x + 9, y + 51, character.role || 'Starter sorcerer', {
        color: S3_COLORS.mutedText,
        fontSize: `${TYPE_SCALE.label}px`,
        lineSpacing: 0,
        wordWrap: { width: w - 18 },
      });
      role.setMaxLines(2);
      const firstSkill = ((character.skills || [])[0] || {});
      drawS3Cost(this, x + 17, y + h - 14, firstSkill.cost || [], { size: 12, gap: 4 });
      const skillName = this.text(x + 50, y + h - 32, firstSkill.name || 'Technique', {
        color: selected ? S3_COLORS.cyanText : S3_COLORS.inkText,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '800',
        lineSpacing: 0,
        wordWrap: { width: w - 58 },
      });
      skillName.setMaxLines(2);
      this.registerHitTarget(x, y, w, h, `Inspect ${character.name}`, () => this.store.openCharacterDetail(character.id));
    }

    renderDetailSkillRow(skill, x, y, w, h) {
      drawS3Panel(this, x, y, w, h, {
        fill: S3_COLORS.bone,
        accent: S3_COLORS.cyan,
        cut: 5,
        hatch: false,
        washAlpha: 0.15,
        shadowAlpha: 0.06,
        strokeWidth: 1.5,
      });
      const skillName = this.text(x + 9, y + 6, skill.name, {
        color: S3_COLORS.inkText,
        fontSize: `${TYPE_SCALE.body}px`,
        fontStyle: '900',
        lineSpacing: 0,
        wordWrap: { width: w - 100 },
      });
      skillName.setMaxLines(2);
      drawS3Cost(this, x + w - 78, y + 16, skill.cost || [], { size: 12, gap: 4 });
      const classes = (skill.classes || []).slice(0, 2).map((tag) => titleize(tag)).join(' / ') || 'Technique';
      const target = titleize((skill.target_rule && skill.target_rule.kind) || 'enemy');
      const meta = this.text(x + 9, y + h - 20, `${target} - ${classes}`, {
        color: S3_COLORS.mutedText,
        fontSize: `${TYPE_SCALE.label}px`,
        wordWrap: { width: w - 18 },
      });
      meta.setMaxLines(1);
    }

    renderCharacterDetailSheet(frame, teamKey) {
      const character = this.store.detailCharacterId ? this.store.character(this.store.detailCharacterId) : null;
      if (!character || !character.id) return;
      const selected = this.store[teamKey].includes(character.id);
      const sheetY = Math.max(frame.top + 86, Math.min(Math.round(frame.height * 0.27), frame.bottom - 574));
      const x = frame.x + 12;
      const y = sheetY;
      const w = frame.width - 24;
      const h = frame.bottom - y + 6;
      this.graphics.fillStyle(S3_COLORS.ink, 0.46);
      this.graphics.fillRect(0, 0, frame.fullWidth, frame.fullHeight);
      this.buttons.push({ x: 0, y: 0, w: frame.fullWidth, h: frame.fullHeight, label: 'Character detail overlay', onClick: () => {}, disabled: false });
      drawS3Panel(this, x, y, w, h, {
        fill: S3_COLORS.paper,
        accent: selected ? S3_COLORS.cyan : S3_COLORS.red,
        cut: 12,
        strokeWidth: 2.5,
        washAlpha: 0.3,
      });
      this.mono(x + 14, y + 12, 'CHARACTER PROFILE', {
        color: S3_COLORS.redText,
        fontSize: '12px',
        fontStyle: '900',
      });
      const title = this.text(x + 14, y + 29, character.name, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
        color: S3_COLORS.inkText,
        fontSize: '20px',
        fontStyle: '900',
        lineSpacing: 0,
        wordWrap: { width: w - 82 },
      });
      title.setMaxLines(2);
      drawS3Button(this, x + w - 54, y + 10, 44, 44, '×', () => this.store.closeCharacterDetail(), {
        variant: 'bone',
        accent: S3_COLORS.red,
        fontSize: '16px',
      });

      const identityY = y + 58;
      drawS3Portrait(this, character, x + 14, identityY, 62, 62, {
        accent: selected ? S3_COLORS.cyan : S3_COLORS.gold,
        selected,
      });
      const role = this.text(x + 88, identityY + 1, character.role || 'Starter sorcerer', {
        color: S3_COLORS.inkText,
        fontSize: `${TYPE_SCALE.body}px`,
        fontStyle: '800',
        lineSpacing: 0,
        wordWrap: { width: w - 104 },
      });
      role.setMaxLines(2);
      this.text(x + 88, identityY + 43, `${titleize(character.difficulty || 'Medium')} / ${titleize(character.era || 'Student Era')}`, {
        color: S3_COLORS.mutedText,
        fontSize: `${TYPE_SCALE.label}px`,
      });

      let tagX = x + 14;
      let tagY = y + 126;
      const tagRight = x + w - 14;
      (character.tags || []).slice(0, 4).forEach((tag) => {
        const label = titleize(tag).toUpperCase();
        const tagW = Math.min(tagRight - (x + 14), Math.max(54, label.length * 7 + 20));
        if (tagX + tagW > tagRight) {
          tagX = x + 14;
          tagY += 26;
        }
        drawS3Chip(this, tagX, tagY, label, {
          w: tagW,
          h: 22,
          fill: S3_COLORS.ink,
          stroke: S3_COLORS.cyan,
          fontSize: '12px',
        });
        tagX += tagW + 6;
      });

      const techniqueLabelY = Math.max(y + 156, tagY + 30);
      this.renderS3Section(x + 14, techniqueLabelY, 'TECHNIQUE DOSSIER', x + w - 14, S3_COLORS.cyan);
      const skillStart = techniqueLabelY + 18;
      const skillGap = 4;
      const buttonY = frame.bottom - 50;
      const skillH = Math.max(50, Math.min(58, Math.floor((buttonY - skillStart - 12 - skillGap * 3) / 4)));
      (character.skills || []).slice(0, 4).forEach((skill, index) => {
        this.renderDetailSkillRow(skill, x + 14, skillStart + index * (skillH + skillGap), w - 28, skillH);
      });
      drawS3Button(this, x + 14, buttonY, w - 28, 50, selected ? 'Remove From Trio' : 'Add To Trio', () => {
        const team = this.store[teamKey] || [];
        if (selected || team.length < 3) {
          this.store.toggleTeamPick(teamKey, character.id);
          this.store.closeCharacterDetail();
        } else {
          this.store.toggleTeamPick(teamKey, character.id);
        }
      }, {
        variant: selected ? 'bone' : 'primary',
        accent: selected ? S3_COLORS.red : S3_COLORS.cyan,
        fontSize: '17px',
      });
    }

    render() {
      const frame = this.layout.frame();
      const layout = firstCreationS3Layout(frame);
      this.clearSurface();
      drawS3World(this, frame, FIRST_CREATION_WORLD_KEY, { imageAlpha: 0.38, washAlpha: 0.7 });
      drawS3Header(this, frame, {
        eyebrow: 'STUDENT ERA / FIRST CREATION',
        title: 'First Creation',
        backHandler: () => this.store.resetToLobby(),
      });
      if (this.store.detailCharacterId) {
        this.renderCharacterDetailSheet(frame, 'playerTeam');
        this.toast(frame, { y: frame.bottom - 110, theme: 'light' });
        return;
      }

      this.renderMissionHeader(layout);
      this.renderTrioSlots(layout);

      const presets = this.store.presetEntries();
      const presetPageSize = 2;
      const presetMax = Math.max(0, Math.ceil(presets.length / presetPageSize) - 1);
      this.store.creationPresetPage = clamp(this.store.creationPresetPage, 0, presetMax);
      const presetPage = presets.slice(this.store.creationPresetPage * presetPageSize, this.store.creationPresetPage * presetPageSize + presetPageSize);
      this.renderS3Section(layout.presets.x, layout.presetLabelY + 16, 'STARTER PRESETS', layout.presets.x + layout.presets.w - 82, S3_COLORS.gold);
      const presetGap = 8;
      const presetW = (layout.presets.w - presetGap) / 2;
      presetPage.forEach((entry, index) => {
        this.renderPresetTile(entry, layout.presets.x + index * (presetW + presetGap), layout.presets.y, presetW, layout.presets.h);
      });
      if (presetMax > 0) {
        drawS3Button(this, layout.presets.x + layout.presets.w - 72, layout.presetLabelY, 72, 44, `Set ${this.store.creationPresetPage + 1}`, () => {
          this.store.creationPresetPage = this.store.creationPresetPage >= presetMax ? 0 : this.store.creationPresetPage + 1;
          this.store.notify();
        }, { variant: 'bone', accent: S3_COLORS.gold, mono: true, fontSize: '12px' });
      }

      this.renderS3Section(layout.roster.x, layout.rosterLabelY, 'INSPECT THE 19 STARTERS', layout.roster.x + layout.roster.w, S3_COLORS.red);
      const roster = this.store.rosterEntries();
      const cardGap = layout.roster.gap;
      const navH = 44;
      const available = layout.pager.y - layout.roster.y;
      const rowsThatFit = Math.max(0, Math.floor((available + cardGap) / (layout.roster.cardH + cardGap)));
      const rows = Math.min(frame.width >= 430 ? 2 : 1, rowsThatFit);
      const pageSize = Math.max(2, rows * 2);
      const pageMax = Math.max(0, Math.ceil(roster.length / pageSize) - 1);
      this.store.draftPage = clamp(this.store.draftPage, 0, pageMax);
      const page = rows > 0 ? roster.slice(this.store.draftPage * pageSize, this.store.draftPage * pageSize + pageSize) : [];
      const cardW = (layout.roster.w - 8) / 2;
      page.forEach((character, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        this.renderStarterRosterCard(character, layout.roster.x + col * (cardW + 8), layout.roster.y + row * (layout.roster.cardH + cardGap), cardW, layout.roster.cardH, 'playerTeam');
      });

      drawS3Pager(this, { ...layout.pager, h: navH }, `Roster ${this.store.draftPage + 1}/${pageMax + 1}`, () => {
        this.store.draftPage = Math.max(0, this.store.draftPage - 1);
        this.store.notify();
      }, () => {
        this.store.draftPage = Math.min(pageMax, this.store.draftPage + 1);
        this.store.notify();
      }, {
        prevDisabled: this.store.draftPage === 0,
        nextDisabled: this.store.draftPage === pageMax,
      });

      const ready = this.store.playerTeam.length === 3;
      drawS3Button(this, layout.cta.x, layout.cta.y, layout.cta.w, layout.cta.h, ready ? 'Enter Domain' : `Choose ${3 - this.store.playerTeam.length} More`, () => this.store.startMatch(), {
        variant: ready ? 'primary' : 'smoke',
        accent: ready ? S3_COLORS.cyan : S3_COLORS.red,
        disabled: !ready,
        fontSize: '18px',
      });
      this.toast(frame, { y: layout.toastY, theme: 'light' });
    }
  }
