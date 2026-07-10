/* Shared roster/dossier pieces: mission preview strip, starter dossier
   cards, and the character detail bottom sheet. Cursed Arena plate
   language throughout. */

import { COLORS } from '../core/runtime-config.js?v=18';
import { shortText, titleize } from '../core/text.js?v=18';
import { BaseScene } from './base-scene.js?v=18';
import { drawBladePlate } from '../components/plate.js?v=18';
import { drawCostPips } from '../components/widgets.js?v=18';

export class DraftRosterScene extends BaseScene {
    renderMissionPreview(frame, y) {
      const mission = this.store.activeMission();
      if (!mission) return 0;
      const x = frame.x + frame.gutter;
      const w = frame.width - frame.gutter * 2;
      this.platePanel(x, y, w, 72);
      this.label(x + 14, y + 10, 'Mission Objective', 8, { color: COLORS.goldTextSoft });
      this.text(x + 14, y + 24, shortText(mission.title || mission.id, 34), { fontSize: '13px', fontStyle: '900' });
      this.text(x + 14, y + 46, shortText((mission.objectives || []).slice(0, 2).join(' / ') || mission.description || 'Win the battle.', 62), {
        fontSize: '10px', fontStyle: '500', color: COLORS.muted,
      });
      return 84;
    }

    renderDetailSkillRow(skill, x, y, w) {
      drawBladePlate(this.graphics, x, y, w, 47, {
        fillTop: COLORS.ink700,
        fillBottom: COLORS.ink700,
        cut: 10,
      });
      this.text(x + 12, y + 7, shortText(skill.name, 24), { fontSize: '11px', fontStyle: '900' });
      const costList = (skill.cost || []).slice(0, 5);
      drawCostPips(this, this.layer(), x + w - 16 - costList.length * 16, y + 15, costList, 12, 4);
      const tags = (skill.classes || []).slice(0, 2).map((tag) => titleize(tag)).join(' / ');
      this.label(x + 12, y + 28, `${titleize((skill.target_rule && skill.target_rule.kind) || 'enemy')} · ${shortText(tags || 'Technique', 24)}`, 8, {
        color: COLORS.dim,
      });
    }

    renderCharacterDetailSheet(frame, teamKey) {
      const character = this.store.detailCharacterId ? this.store.character(this.store.detailCharacterId) : null;
      if (!character || !character.id) return;
      this.hotspot(0, 0, frame.fullWidth, frame.fullHeight, 'Dossier Overlay', () => this.store.closeCharacterDetail());
      const g = this.layer();
      const sheetH = Math.min(470, frame.height - 110);
      const x = frame.x;
      const w = frame.width;
      const y = frame.height - sheetH;
      const selected = this.store[teamKey].includes(character.id);

      g.fillStyle(COLORS.ink950, 0.72);
      g.fillRect(0, 0, frame.fullWidth, frame.fullHeight);
      g.fillStyle(COLORS.keyline, 1);
      g.fillRoundedRect(x, y - 3, w, sheetH + 30, { tl: 24, tr: 24, bl: 0, br: 0 });
      g.fillStyle(COLORS.ink900, 1);
      g.fillRoundedRect(x, y, w, sheetH + 30, { tl: 22, tr: 22, bl: 0, br: 0 });
      g.fillStyle(0xffffff, 0.18);
      g.fillRoundedRect(x + w / 2 - 26, y + 8, 52, 5, 3);
      // Swallow sheet-area taps so the overlay-close doesn't fire through it.
      this.hotspot(x, y, w, sheetH, 'Dossier Sheet', () => {});

      const pad = frame.gutter;
      this.portraitPlate(character, x + pad, y + 22, 92, 118, {
        corners: 'both', rim: selected ? COLORS.curse400 : COLORS.keyline, rimWidth: 3,
      });
      this.display(x + pad + 106, y + 24, shortText(character.name, 18), 20);
      this.text(x + pad + 106, y + 52, shortText(character.role || 'Starter sorcerer', 34), {
        fontSize: '11px', fontStyle: '500', color: COLORS.muted,
      });
      let tagX = x + pad + 106;
      [titleize(character.difficulty || 'Medium'), titleize(character.era || 'Student Era')].forEach((tag) => {
        tagX += this.skewTag(tagX, y + 74, tag, { fontSize: 8, bg: COLORS.ink700, color: COLORS.muted }) + 8;
      });
      this.plateButton(x + w - pad - 40, y + 18, 40, 36, 'x', () => this.store.closeCharacterDetail(), {
        tone: 'ink', fontSize: 13, cut: 8,
      });

      this.label(x + pad, y + 152, 'Technique Dossier', 9, { color: COLORS.goldTextSoft });
      (character.skills || []).slice(0, 4).forEach((skill, index) => {
        this.renderDetailSkillRow(skill, x + pad, y + 170 + index * 53, w - pad * 2);
      });

      const buttonY = y + sheetH - 54;
      this.layer();
      const team = this.store[teamKey] || [];
      this.plateButton(x + pad, buttonY, w - pad * 2, 44, selected ? 'Remove From Trio' : 'Add To Trio', () => {
        if (selected || team.length < 3) {
          this.store.toggleTeamPick(teamKey, character.id);
          this.store.closeCharacterDetail();
        } else {
          this.store.toggleTeamPick(teamKey, character.id);
        }
      }, {
        tone: selected ? 'ink' : 'primary',
        fontSize: 13,
        color: selected ? COLORS.redText : undefined,
      });
    }

    /* Dossier card for First Creation: portrait, name, role, lead technique. */
    renderStarterRosterCard(character, x, y, w, h, teamKey) {
      const selected = this.store[teamKey].includes(character.id);
      drawBladePlate(this.graphics, x, y, w, h, {
        fillTop: COLORS.ink800,
        fillBottom: COLORS.ink900,
        cut: 12,
      });
      this.portraitPlate(character, x + 8, y + 8, h - 16, h - 16, {
        cut: 8, rim: selected ? COLORS.curse400 : COLORS.keyline, rimWidth: 2,
      });
      const infoX = x + h;
      this.text(infoX, y + 9, shortText(character.name, 15), {
        fontSize: '12px', fontStyle: '900', wordWrap: { width: w - h - 8 },
      });
      this.text(infoX, y + 27, shortText(character.role || 'Starter', 22), {
        fontSize: '9px', fontStyle: '500', color: COLORS.muted,
      });
      const lead = (character.skills || [])[0] || {};
      this.label(infoX, y + h - 32, shortText(lead.name || 'Technique', 18), 8, {
        color: selected ? COLORS.goldTextSoft : COLORS.dim,
      });
      drawCostPips(this, this.layer(), infoX, y + h - 12, (lead.cost || []).slice(0, 4), 10, 3);
      if (selected) {
        this.skewTag(x + w - 58, y + 8, 'Trio', { fontSize: 7, height: 15, padX: 6, bg: COLORS.curse600 });
      }
      this.hotspot(x, y, w, h, `Inspect ${character.name}`, () => this.store.openCharacterDetail(character.id));
    }

}
