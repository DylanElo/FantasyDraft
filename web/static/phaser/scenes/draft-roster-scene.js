import { COLORS } from '../core/runtime-config.js?v=19';
import { shortText, titleize } from '../core/text.js?v=19';
import { BaseScene } from './base-scene.js?v=19';

export class DraftRosterScene extends BaseScene {
    renderRosterCard(character, x, y, w, h, teamKey) {
      const selected = this.store[teamKey].includes(character.id);
      const tone = selected ? (teamKey === 'playerTeam' ? COLORS.ally : COLORS.enemy) : this.store.assets.toneFor(character.id);
      this.platePanel(x, y, w, h, tone, { alpha: selected ? 0.94 : 0.74, edgeBar: 'left' });
      this.platePortrait(character, x + 10, y + 12, 48, { tone, selected });
      this.text(x + 68, y + 10, shortText(character.name, 18), {
        fontSize: '12px',
        fontStyle: '800',
        wordWrap: { width: w - 78 },
      });
      this.mono(x + 68, y + 40, shortText(character.role || 'Fighter', 23), { fontSize: '8px', color: COLORS.text });
      this.mono(x + 10, y + 72, ((character.skills || [])[0] || {}).name || 'Skill kit', {
        fontSize: '9px',
        color: selected ? COLORS.paperText : COLORS.muted,
      });
      if (selected) {
        this.dossierTag(x + w - 56, y + 16, 'IN', teamKey === 'playerTeam' ? COLORS.ally : COLORS.enemy, { color: '#08080a' });
      }
      this.buttons.push({ x, y, w, h, label: `Roster ${character.name}`, onClick: () => this.store.toggleTeamPick(this.store.draftTarget, character.id) });
    }

    renderMissionPreview(frame, y) {
      const mission = this.store.activeMission();
      if (!mission) return 0;
      const x = frame.x + frame.gutter;
      this.platePanel(x, y, frame.width - 32, 76, COLORS.selection, { edgeBar: 'left' });
      this.railLabel(x + 12, y + 10, 'MISSION OBJECTIVE', COLORS.selection, { width: frame.width - 64 });
      this.text(x + 12, y + 27, mission.title || mission.id, { fontSize: '13px', fontStyle: '900' });
      this.mono(x + 12, y + 50, (mission.objectives || []).slice(0, 2).join(' / ') || mission.description || 'Win the domain.', {
        color: COLORS.text,
        fontSize: '8px',
      });
      return 88;
    }

    renderDetailSkillRow(skill, x, y, w) {
      this.platePanel(x, y, w, 54, COLORS.line, { cut: 5, fill: 0x0e1215, accentTriangle: false, highlight: false });
      this.text(x + 10, y + 7, skill.name, {
        fontSize: '11px',
        fontStyle: '900',
        wordWrap: { width: w - 98 },
      });
      this.costPips(x + w - 78, y + 15, skill.cost || [], 12);
      const tags = (skill.classes || []).slice(0, 2).map((tag) => titleize(tag)).join(' / ');
      this.mono(x + 10, y + 36, `${titleize((skill.target_rule && skill.target_rule.kind) || 'enemy')} - ${shortText(tags || 'Technique', 34)}`, {
        color: COLORS.text,
        fontSize: '8px',
      });
    }

    renderCharacterDetailSheet(frame, teamKey) {
      const character = this.store.detailCharacterId ? this.store.character(this.store.detailCharacterId) : null;
      if (!character || !character.id) return;
      const tone = this.store.assets.toneFor(character.id);
      const selected = this.store[teamKey].includes(character.id);
      const content = this.dossierSheet(frame, {
        eyebrow: 'CHARACTER DOSSIER',
        title: character.name,
        tone,
        onClose: () => this.store.closeCharacterDetail(),
      });

      this.platePortrait(character, content.x, content.y, 64, { tone, selected });
      this.mono(content.x + 76, content.y + 4, shortText(character.role || 'Starter sorcerer', 36), { color: COLORS.text, fontSize: '9px' });
      this.mono(content.x + 76, content.y + 22, `${titleize(character.difficulty || 'Medium')} / ${titleize(character.era || 'Student Era')}`, {
        color: COLORS.paperText,
        fontSize: '8px',
      });

      let tagX = content.x;
      (character.tags || []).slice(0, 4).forEach((tag, index) => {
        const tagW = this.dossierTag(tagX, content.y + 84, shortText(titleize(tag), 11).toUpperCase(), index % 2 ? COLORS.ally : COLORS.selection);
        tagX += tagW + 8;
      });

      this.mono(content.x, content.y + 106, 'TECHNIQUE DOSSIER', { color: COLORS.paperText, fontSize: '9px' });
      (character.skills || []).slice(0, 3).forEach((skill, index) => {
        this.renderDetailSkillRow(skill, content.x, content.y + 122 + index * 58, content.w);
      });

      const buttonY = content.sheetY + content.sheetH - 54;
      this.button(content.x, buttonY, content.w, 38, selected ? 'Remove From Trio' : 'Add To Trio', () => {
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
        fontSize: '11px',
      });
    }

    renderStarterRosterCard(character, x, y, w, h, teamKey) {
      const selected = this.store[teamKey].includes(character.id);
      const tone = selected ? COLORS.selection : this.store.assets.toneFor(character.id);
      this.platePanel(x, y, w, h, tone, { alpha: selected ? 0.94 : 0.72, edgeBar: 'left' });
      this.platePortrait(character, x + 10, y + 12, 50, { tone, selected });
      this.text(x + 68, y + 8, character.name, {
        fontSize: '11px',
        fontStyle: '900',
        wordWrap: { width: w - 76 },
      });
      this.mono(x + 68, y + 43, shortText(character.role || 'Starter', 24), { color: COLORS.text, fontSize: '8px' });
      this.costPips(x + 18, y + h - 16, (((character.skills || [])[0] || {}).cost || []), 11);
      this.mono(x + 68, y + h - 22, shortText(((character.skills || [])[0] || {}).name || 'Technique', 21), {
        color: selected ? COLORS.paperText : COLORS.muted,
        fontSize: '8px',
      });
      if (selected) this.dossierTag(x + w - 56, y + 18, 'TRIO', COLORS.selection);
      this.buttons.push({ x, y, w, h, label: `Inspect ${character.name}`, onClick: () => this.store.openCharacterDetail(character.id) });
    }

}
