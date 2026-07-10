/* QUEUE REVIEW — bottom sheet: numbered rows (order · portrait · skill →
   target · cost pips), wildcard payment pickers, wild-payment note, and a
   full-width Confirm Queue. */

import { COLORS, CORE_ENERGY, ENERGY_COLORS, ENERGY_LABELS } from '../core/runtime-config.js?v=18';
import { shortText } from '../core/text.js?v=18';
import { CombatPlaybackScene } from '../fx/combat-playback-scene.js?v=18';
import { drawBladePlate } from '../components/plate.js?v=18';
import { drawCostPips, drawEnergyPip } from '../components/widgets.js?v=18';

export class CombatQueueReviewScene extends CombatPlaybackScene {
    actionMeta(action) {
      const me = this.store.me();
      const foe = this.store.foe();
      const caster = me && me.team ? me.team[action.caster_slot] : null;
      const skill = caster ? this.store.skillFor(caster, action.skill_id) : null;
      const targetPlayer = action.target_player_id === this.store.mineId() ? me : foe;
      let targetName = 'Team';
      if (action.target_slot !== null && action.target_slot !== undefined && targetPlayer && targetPlayer.team && targetPlayer.team[action.target_slot]) {
        targetName = targetPlayer.team[action.target_slot].name;
      } else if ((action.target_slots || []).length) {
        targetName = `${action.target_slots.length} targets`;
      }
      const slotName = (player, slot) => (player && player.team && player.team[slot] ? player.team[slot].name : `Slot ${Number(slot) + 1}`);
      const secondaryName = action.secondary_target_slot !== null && action.secondary_target_slot !== undefined
        ? slotName(targetPlayer, action.secondary_target_slot)
        : null;
      const alternatePlayer = action.alternate_target_player_id === this.store.mineId() ? me : foe;
      const alternateName = action.alternate_target_slot !== null && action.alternate_target_slot !== undefined
        ? slotName(alternatePlayer, action.alternate_target_slot)
        : null;
      return {
        caster,
        skill,
        targetName,
        secondaryName,
        alternateName,
        cost: skill ? this.store.adjustedCost(caster, skill) : [],
      };
    }

    renderQueueReviewRow(frame, action, index, rowY, x, rowW) {
      const meta = this.actionMeta(action);
      const wildCount = meta.cost.filter((color) => color === 'black').length;
      const hasSecondaryLine = !!(meta.secondaryName || meta.alternateName);
      const extraH = hasSecondaryLine ? 14 : 0;
      const rowH = (wildCount ? 92 : 66) + extraH;
      drawBladePlate(this.graphics, x, rowY, rowW, rowH, {
        fillTop: COLORS.ink700,
        fillBottom: COLORS.ink700,
        cut: 12,
      });
      // Order numeral.
      this.stat(x + 16, rowY + 30, String(index + 1), 15, { color: COLORS.goldText }).setOrigin(0.5, 0.5);
      // Caster portrait chip.
      this.portrait(meta.caster || action.caster_slot, x + 30, rowY + 13, 34, {});
      // Skill → target.
      this.text(x + 74, rowY + 12, shortText(meta.skill ? meta.skill.name : action.skill_id, 22), {
        fontSize: '12px', fontStyle: '900',
      });
      this.text(x + 74, rowY + 31, `→ ${shortText(meta.targetName, 20)}`, {
        fontSize: '11px', fontStyle: '500', color: COLORS.muted,
      });
      if (meta.secondaryName || meta.alternateName) {
        const suffixLabel = meta.secondaryName ? `+ ${meta.secondaryName}` : `⤷ ${meta.alternateName}`;
        this.label(x + 74, rowY + 45, shortText(suffixLabel, 20), 8, { color: COLORS.goldTextSoft });
      }
      // Cost pips, right-aligned.
      const costList = meta.cost.slice(0, 5);
      drawCostPips(this, this.layer(), x + rowW - 82 - costList.length * 8, rowY + 24, costList, 13, 3);
      // Reorder.
      this.plateButton(x + rowW - 74, rowY + 10, 30, 28, `up ${index}`, () => this.store.moveQueuedAction(action.id, -1), {
        tone: 'ink', fontSize: 11, disabled: index === 0, showLabel: false, cut: 6,
      });
      this.text(x + rowW - 59, rowY + 24, '▲', { fontSize: '10px', color: index === 0 ? COLORS.dim : COLORS.text }).setOrigin(0.5, 0.5);
      this.plateButton(x + rowW - 38, rowY + 10, 30, 28, `down ${index}`, () => this.store.moveQueuedAction(action.id, 1), {
        tone: 'ink', fontSize: 11, disabled: index >= this.store.actions.length - 1, showLabel: false, cut: 6,
      });
      this.text(x + rowW - 23, rowY + 24, '▼', { fontSize: '10px', color: index >= this.store.actions.length - 1 ? COLORS.dim : COLORS.text }).setOrigin(0.5, 0.5);

      // Wildcard payment pickers.
      if (wildCount) {
        this.label(x + 16, rowY + 60 + extraH, 'Pay X with', 8, { color: COLORS.dim });
        for (let wildIndex = 0; wildIndex < wildCount; wildIndex += 1) {
          const pay = (this.store.actionWildPays[action.id] || [])[wildIndex] || 'black';
          const px = x + 92 + wildIndex * 40;
          this.plateButton(px, rowY + 52 + extraH, 34, 30, `wild ${action.id} ${wildIndex}`, () => this.store.cycleWildcardPay(action.id, wildIndex), {
            tone: 'ink', showLabel: false, cut: 6,
            fillTop: pay === 'black' ? COLORS.ink700 : ENERGY_COLORS[pay],
            fillBottom: pay === 'black' ? COLORS.ink700 : ENERGY_COLORS[pay],
          });
          this.stat(px + 17, rowY + 67 + extraH, ENERGY_LABELS[pay] || 'X', 11, {
            color: pay === 'black' ? COLORS.muted : '#0E0B16',
          }).setOrigin(0.5, 0.5);
        }
      }
      return rowH;
    }

    renderQueueReviewSheet(frame) {
      if (!this.store.queueReviewOpen || !this.store.actions.length) return;
      // Swallow taps outside the sheet.
      this.hotspot(0, 0, frame.fullWidth, frame.fullHeight, 'Queue Review Overlay', () => {});

      const g = this.layer();
      const wildRows = this.store.actions.filter((action) => (this.actionMeta(action).cost || []).some((c) => c === 'black')).length;
      const plainRows = Math.min(3, this.store.actions.length) - wildRows;
      const rowsH = wildRows * 100 + plainRows * 74;
      const sheetH = Math.min(frame.height - 90, 188 + rowsH);
      const sheetY = frame.height - sheetH;
      const x = frame.x;
      const w = frame.width;

      g.fillStyle(COLORS.ink950, 0.72);
      g.fillRect(0, 0, frame.fullWidth, frame.fullHeight);
      g.fillStyle(COLORS.keyline, 1);
      g.fillRoundedRect(x, sheetY - 3, w, sheetH + 30, { tl: 24, tr: 24, bl: 0, br: 0 });
      g.fillStyle(COLORS.ink900, 1);
      g.fillRoundedRect(x, sheetY, w, sheetH + 30, { tl: 22, tr: 22, bl: 0, br: 0 });
      // Grab handle.
      g.fillStyle(0xffffff, 0.18);
      g.fillRoundedRect(x + w / 2 - 26, sheetY + 8, 52, 5, 3);

      this.display(x + 18, sheetY + 22, 'Queue Review', 20);
      // Remaining energy pips.
      const me = this.store.me();
      const energy = (me && me.energy) || {};
      CORE_ENERGY.forEach((color, index) => {
        const cx = x + w - 26 - (CORE_ENERGY.length - 1 - index) * 30;
        drawEnergyPip(this, this.graphics, cx, sheetY + 34, color, 16, { filled: Number(energy[color] || 0) > 0 });
        this.stat(cx, sheetY + 48, String(Number(energy[color] || 0)), 8, { color: COLORS.dim }).setOrigin(0.5, 0);
      });
      this.hotspot(x + w - 130, sheetY, 130, 44, 'Close Review', () => this.store.closeQueueReview());

      const rowX = x + 14;
      const rowW = w - 28;
      let rowY = sheetY + 62;
      this.store.actions.slice(0, 3).forEach((action, index) => {
        rowY += this.renderQueueReviewRow(frame, action, index, rowY, rowX, rowW) + 8;
      });

      this.text(rowX + 2, rowY + 2, 'Wild costs are paid from remaining energy, left to right.', {
        fontSize: '11px', fontStyle: '500', color: COLORS.muted,
      });

      const queueFit = this.store.queueReviewFit();
      const footerY = frame.height - 56;
      if (!queueFit.ok) {
        this.label(rowX + 2, footerY - 16, shortText(queueFit.reason, 52), 8, { color: COLORS.redText });
      }
      this.plateButton(rowX, footerY, 68, 42, 'Back', () => this.store.closeQueueReview(), {
        tone: 'ghost', fontSize: 11,
      });
      this.plateButton(rowX + 76, footerY, 74, 42, 'Cancel', () => this.store.cancelQueue(), {
        tone: 'ink', fontSize: 11, color: COLORS.redText,
      });
      this.plateButton(rowX + 158, footerY, rowW - 158, 42, this.store.queueSubmitting ? 'Resolving…' : 'Confirm Queue', () => this.store.confirmQueue(), {
        tone: 'primary', fontSize: 13,
        disabled: this.store.queueSubmitting || !queueFit.ok,
      });
    }

}
