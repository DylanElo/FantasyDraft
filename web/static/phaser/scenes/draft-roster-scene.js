import { COLORS } from '../core/runtime-config.js?v=17';
import { shortText, titleize } from '../core/text.js?v=17';
import { BaseScene } from './base-scene.js?v=17';

export class DraftRosterScene extends BaseScene {
    renderRosterCard(character, x, y, w, h, teamKey) {
      const selected = this.store[teamKey].includes(character.id);
      const tone = selected ? (teamKey === 'playerTeam' ? COLORS.ally : COLORS.enemy) : this.store.assets.toneFor(character.id);
      this.cardPanel(x, y, w, h, tone, selected ? 0.94 : 0.74);
      this.portrait(character, x + 10, y + 12, 48, { tone, selected });
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
        this.graphics.fillStyle(teamKey === 'playerTeam' ? COLORS.ally : COLORS.enemy, 0.9);
        this.graphics.fillRoundedRect(x + w - 52, y + 8, 40, 16, 8);
        this.mono(x + w - 32, y + 12, 'IN', { color: '#08080a', fontSize: '8px' }).setOrigin(0.5, 0);
      }
      this.buttons.push({ x, y, w, h, label: `Roster ${character.name}`, onClick: () => this.store.toggleTeamPick(this.store.draftTarget, character.id) });
    }

    renderMissionPreview(frame, y) {
      const mission = this.store.activeMission();
      if (!mission) return 0;
      const x = frame.x + frame.gutter;
      this.cardPanel(x, y, frame.width - 32, 76, COLORS.selection, 0.62);
      this.mono(x + 12, y + 10, 'MISSION OBJECTIVE', { color: COLORS.paperText, fontSize: '9px' });
      this.text(x + 12, y + 27, mission.title || mission.id, { fontSize: '13px', fontStyle: '900' });
      this.mono(x + 12, y + 50, (mission.objectives || []).slice(0, 2).join(' / ') || mission.description || 'Win the domain.', {
        color: COLORS.text,
        fontSize: '8px',
      });
      return 88;
    }

    renderDetailSkillRow(skill, x, y, w) {
      this.graphics.fillStyle(COLORS.surfaceRaised, 0.82);
      this.graphics.fillRoundedRect(x, y, w, 54, 12);
      this.graphics.lineStyle(1, COLORS.line, 0.44);
      this.graphics.strokeRoundedRect(x, y, w, 54, 12);
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
      const sheetH = Math.min(500, frame.height - 96);
      const x = frame.x + 14;
      const y = frame.height - sheetH - 12;
      const w = frame.width - 28;
      const tone = this.store.assets.toneFor(character.id);
      const selected = this.store[teamKey].includes(character.id);
      this.graphics.fillStyle(COLORS.voidBlack, 0.72);
      this.graphics.fillRect(frame.x, 0, frame.width, frame.height);
      this.graphics.fillStyle(COLORS.surfaceDeep, 1);
      this.graphics.fillRoundedRect(x, y, w, sheetH, 18);
      this.cardPanel(x, y, w, sheetH, tone, 1);
      this.portrait(character, x + 16, y + 20, 76, { tone, selected });
      this.text(x + 104, y + 20, character.name, {
        fontFamily: 'Cinzel, Inter, serif',
        fontSize: '18px',
        fontStyle: '900',
        wordWrap: { width: w - 154 },
      });
      this.mono(x + 106, y + 49, shortText(character.role || 'Starter sorcerer', 36), { color: COLORS.text, fontSize: '9px' });
      this.mono(x + 106, y + 69, `${titleize(character.difficulty || 'Medium')} / ${titleize(character.era || 'Student Era')}`, {
        color: COLORS.paperText,
        fontSize: '8px',
      });
      this.iconButton(x + w - 48, y + 18, 34, 30, 'x', () => this.store.closeCharacterDetail(), {
        stroke: COLORS.enemy,
        fontSize: '13px',
      });

      const tags = (character.tags || []).slice(0, 4);
      tags.forEach((tag, index) => this.talismanLabel(x + 16 + index * 76, y + 108, shortText(titleize(tag), 11).toUpperCase(), index % 2 ? COLORS.ally : COLORS.selection));

      this.mono(x + 16, y + 140, 'TECHNIQUE DOSSIER', { color: COLORS.paperText, fontSize: '9px' });
      (character.skills || []).slice(0, 4).forEach((skill, index) => {
        this.renderDetailSkillRow(skill, x + 16, y + 156 + index * 58, w - 32);
      });

      const buttonY = y + sheetH - 54;
      this.button(x + 16, buttonY, w - 32, 38, selected ? 'Remove From Trio' : 'Add To Trio', () => {
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
      this.cardPanel(x, y, w, h, tone, selected ? 0.94 : 0.72);
      this.portrait(character, x + 10, y + 12, 50, { tone, selected });
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
      if (selected) this.talismanLabel(x + w - 56, y + 10, 'TRIO', COLORS.selection);
      this.buttons.push({ x, y, w, h, label: `Inspect ${character.name}`, onClick: () => this.store.openCharacterDetail(character.id) });
    }

}
