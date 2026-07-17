import { COLORS, TYPE_SCALE } from '../core/runtime-config.js?v=22';
import { shortText, titleize } from '../core/text.js?v=22';
import { BaseScene } from './base-scene.js?v=22';

export class DraftRosterScene extends BaseScene {
    renderRosterCard(character, x, y, w, h, teamKey) {
      const selected = this.store[teamKey].includes(character.id);
      const tone = selected ? (teamKey === 'playerTeam' ? COLORS.ally : COLORS.enemy) : this.store.assets.toneFor(character.id);
      this.platePanel(x, y, w, h, tone, { alpha: selected ? 0.94 : 0.74, edgeBar: 'left' });
      this.platePortrait(character, x + 10, y + 10, 38, { tone, selected });
      const name = this.text(x + 56, y + 7, character.name, {
        fontSize: '13px',
        fontStyle: '800',
        wordWrap: { width: w - 64 },
      });
      name.setMaxLines(2);
      const role = this.text(x + 10, y + 64, character.role || 'Fighter', {
        fontSize: `${TYPE_SCALE.label}px`,
        color: COLORS.muted,
        wordWrap: { width: w - 20 },
      });
      role.setMaxLines(2);
      this.costPips(x + 18, y + h - 16, (((character.skills || [])[0] || {}).cost || []), 11);
      const skillName = this.text(x + 60, y + h - 33, ((character.skills || [])[0] || {}).name || 'Skill kit', {
        fontSize: `${TYPE_SCALE.label}px`,
        color: selected ? COLORS.paperText : COLORS.muted,
        wordWrap: { width: w - 70 },
      });
      skillName.setMaxLines(2);
      if (selected) {
        this.dossierTag(x + w - 44, y + 52, 'IN', teamKey === 'playerTeam' ? COLORS.ally : COLORS.enemy, { color: '#08080a' });
      }
      this.buttons.push({ x, y, w, h, label: `Roster ${character.name}`, onClick: () => this.store.toggleTeamPick(this.store.draftTarget, character.id) });
    }

    renderMissionPreview(frame, y) {
      const mission = this.store.activeMission();
      if (!mission) return 0;
      const x = frame.x + frame.gutter;
      this.platePanel(x, y, frame.width - 32, 84, COLORS.selection, { edgeBar: 'left' });
      this.railLabel(x + 12, y + 12, 'MISSION OBJECTIVE', COLORS.selection, { width: frame.width - 64 });
      this.text(x + 12, y + 30, mission.title || mission.id, { fontSize: `${TYPE_SCALE.subtitle}px`, fontStyle: '900' });
      this.text(x + 12, y + 56, (mission.objectives || []).slice(0, 2).join(' / ') || mission.description || 'Win the domain.', {
        color: COLORS.text,
        fontSize: `${TYPE_SCALE.body}px`,
      });
      return 96;
    }

    renderDetailSkillRow(skill, x, y, w) {
      this.platePanel(x, y, w, 64, COLORS.line, { cut: 5, fill: 0x0e1215, accentTriangle: false, highlight: false });
      const skillName = this.text(x + 10, y + 6, skill.name, {
        fontSize: `${TYPE_SCALE.body}px`,
        fontStyle: '900',
        wordWrap: { width: w - 98 },
      });
      skillName.setMaxLines(2);
      this.costPips(x + w - 78, y + 17, skill.cost || [], 12);
      const tags = (skill.classes || []).slice(0, 2).map((tag) => titleize(tag)).join(' / ');
      this.text(x + 10, y + 44, `${titleize((skill.target_rule && skill.target_rule.kind) || 'enemy')} - ${shortText(tags || 'Technique', 34)}`, {
        color: COLORS.muted,
        fontSize: `${TYPE_SCALE.body}px`,
      });
    }

    renderCharacterDetailSheet(frame, teamKey) {
      const character = this.store.detailCharacterId ? this.store.character(this.store.detailCharacterId) : null;
      if (!character || !character.id) return;
      const tone = this.store.assets.toneFor(character.id);
      const selected = this.store[teamKey].includes(character.id);
      // Four 64px skill rows plus the safe-area CTA need 504px from the
      // sheet origin. Lift only as far as required on the 360x800 target.
      const sheetY = Math.max(150, Math.min(Math.max(168, frame.height * 0.34), frame.bottom - 504));
      const content = this.dossierSheet(frame, {
        eyebrow: 'CHARACTER DOSSIER',
        title: character.name,
        tone,
        y: sheetY,
        onClose: () => this.store.closeCharacterDetail(),
      });

      this.platePortrait(character, content.x, content.y, 64, { tone, selected });
      const role = this.text(content.x + 76, content.y + 2, character.role || 'Starter sorcerer', {
        color: COLORS.text,
        fontSize: `${TYPE_SCALE.body}px`,
        wordWrap: { width: content.w - 76 },
      });
      role.setMaxLines(2);
      this.text(content.x + 76, content.y + 38, `${titleize(character.difficulty || 'Medium')} / ${titleize(character.era || 'Student Era')}`, {
        color: COLORS.paperText,
        fontSize: `${TYPE_SCALE.label}px`,
      });

      let tagX = content.x;
      (character.tags || []).slice(0, 4).forEach((tag, index) => {
        const tagW = this.dossierTag(tagX, content.y + 88, shortText(titleize(tag), 11).toUpperCase(), index % 2 ? COLORS.ally : COLORS.selection);
        tagX += tagW + 8;
      });

      this.mono(content.x, content.y + 112, 'TECHNIQUE DOSSIER', { color: COLORS.paperText, fontSize: `${TYPE_SCALE.label}px` });
      (character.skills || []).slice(0, 4).forEach((skill, index) => {
        this.renderDetailSkillRow(skill, content.x, content.y + 130 + index * 66, content.w);
      });

      const buttonY = frame.bottom - 44;
      this.button(content.x, buttonY, content.w, 44, selected ? 'Remove From Trio' : 'Add To Trio', () => {
        const team = this.store[teamKey] || [];
        if (selected || team.length < 3) {
          this.store.toggleTeamPick(teamKey, character.id);
          this.store.closeCharacterDetail();
        } else {
          this.store.toggleTeamPick(teamKey, character.id);
        }
      }, {
        fill: selected ? COLORS.surfaceRaised : COLORS.selection,
        gradientTop: selected ? COLORS.surfaceRaised : COLORS.talismanDim,
        stroke: selected ? COLORS.enemy : COLORS.talismanPaper,
        color: selected ? COLORS.text : '#08080a',
        mono: true,
        fontSize: `${TYPE_SCALE.body}px`,
      });
    }

    renderStarterRosterCard(character, x, y, w, h, teamKey) {
      const selected = this.store[teamKey].includes(character.id);
      const tone = selected ? COLORS.selection : this.store.assets.toneFor(character.id);
      this.platePanel(x, y, w, h, tone, { alpha: selected ? 0.94 : 0.72, edgeBar: 'left' });
      this.platePortrait(character, x + 10, y + 10, 38, { tone, selected });
      const name = this.text(x + 56, y + 7, character.name, {
        fontSize: '13px',
        fontStyle: '900',
        wordWrap: { width: w - 64 },
      });
      name.setMaxLines(2);
      const role = this.text(x + 10, y + 64, character.role || 'Starter', {
        color: COLORS.muted,
        fontSize: `${TYPE_SCALE.label}px`,
        wordWrap: { width: w - 20 },
      });
      role.setMaxLines(2);
      this.costPips(x + 18, y + h - 16, (((character.skills || [])[0] || {}).cost || []), 11);
      const skillName = this.text(x + 60, y + h - 33, ((character.skills || [])[0] || {}).name || 'Technique', {
        color: selected ? COLORS.paperText : COLORS.muted,
        fontSize: `${TYPE_SCALE.label}px`,
        wordWrap: { width: w - 70 },
      });
      skillName.setMaxLines(2);
      if (selected) this.dossierTag(x + w - 56, y + 52, 'TRIO', COLORS.selection);
      this.buttons.push({ x, y, w, h, label: `Inspect ${character.name}`, onClick: () => this.store.openCharacterDetail(character.id) });
    }

}
