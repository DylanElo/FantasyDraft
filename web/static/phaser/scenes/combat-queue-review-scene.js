import { COLORS, CORE_ENERGY, ENERGY_COLORS, ENERGY_LABELS, TOKEN_TYPE } from '../core/runtime-config.js?v=20';
import { shortText } from '../core/text.js?v=20';
import { CombatPlaybackScene } from '../fx/combat-playback-scene.js?v=20';

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
      const selectedName = (player, slot) => player && player.team && player.team[slot] ? player.team[slot].name : `Slot ${Number(slot) + 1}`;
      const secondaryName = action.secondary_target_slot !== null && action.secondary_target_slot !== undefined
        ? selectedName(targetPlayer, action.secondary_target_slot)
        : null;
      const alternatePlayer = action.alternate_target_player_id === this.store.mineId() ? me : foe;
      const alternateName = action.alternate_target_slot !== null && action.alternate_target_slot !== undefined
        ? selectedName(alternatePlayer, action.alternate_target_slot)
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

    renderCostOrbs(x, y, cost, maxOrbs) {
      (cost || []).slice(0, maxOrbs || 5).forEach((color, index) => {
        const cx = x + index * 13;
        const tone = ENERGY_COLORS[color] || COLORS.black;
        this.graphics.fillStyle(0x020405, 0.94);
        this.graphics.fillCircle(cx, y, 6);
        this.graphics.fillStyle(tone, color === 'black' ? 0.54 : 0.96);
        this.graphics.fillCircle(cx, y, 4.2);
        this.graphics.lineStyle(1, color === 'black' ? COLORS.talismanPaper : tone, 0.74);
        this.graphics.strokeCircle(cx, y, 5.5);
        this.mono(cx, y - 4, ENERGY_LABELS[color] || '?', {
          color: color === 'white' ? '#08080a' : COLORS.text,
          fontSize: '7px',
        }).setOrigin(0.5, 0);
      });
    }

    renderQueueReviewRow(frame, action, index, rowY, rowW) {
      const x = frame.x + 20;
      const meta = this.actionMeta(action);
      const rowH = 76;
      const tone = index === 0 ? COLORS.selection : index === 1 ? COLORS.ally : COLORS.talismanDim;
      const last = index >= this.store.actions.length - 1;

      // Tactical order strip: angular, compact, and deliberately less app-like.
      this.graphics.fillStyle(0x060a0d, 0.92);
      this.graphics.fillPoints([
        { x: x + 10, y: rowY },
        { x: x + rowW, y: rowY },
        { x: x + rowW, y: rowY + rowH - 9 },
        { x: x + rowW - 9, y: rowY + rowH },
        { x, y: rowY + rowH },
        { x, y: rowY + 10 },
      ], true);
      this.graphics.fillStyle(tone, 0.08);
      this.graphics.fillTriangle(x, rowY, x + 112, rowY, x, rowY + rowH);
      this.graphics.fillStyle(tone, 0.84);
      this.graphics.fillRect(x, rowY, 4, rowH);
      this.graphics.lineStyle(index === 0 ? 2 : 1, tone, index === 0 ? 0.82 : 0.48);
      this.graphics.strokePoints([
        { x: x + 10, y: rowY },
        { x: x + rowW, y: rowY },
        { x: x + rowW, y: rowY + rowH - 9 },
        { x: x + rowW - 9, y: rowY + rowH },
        { x, y: rowY + rowH },
        { x, y: rowY + 10 },
      ], true);

      this.graphics.fillStyle(tone, 0.92);
      this.graphics.fillPoints([
        { x: x + 10, y: rowY + 9 },
        { x: x + 38, y: rowY + 9 },
        { x: x + 33, y: rowY + 31 },
        { x: x + 10, y: rowY + 31 },
      ], true);
      this.mono(x + 21, rowY + 15, `Q${index + 1}`, {
        color: '#07090a',
        fontSize: '9px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);

      this.text(x + 46, rowY + 7, shortText(meta.skill ? meta.skill.name : action.skill_id, 26), {
        fontSize: '11px',
        fontStyle: '900',
        wordWrap: { width: rowW - 154 },
      });
      this.mono(x + 46, rowY + 26, `CASTER / ${shortText(meta.caster ? meta.caster.name : 'Unknown', 18).toUpperCase()}`, {
        color: COLORS.paperText,
        fontSize: '9px',
      });
      this.mono(x + 46, rowY + 40, `TARGET / ${shortText(meta.targetName, 20).toUpperCase()}`, {
        color: COLORS.text,
        fontSize: '9px',
      });
      if (meta.secondaryName || meta.alternateName) {
        this.mono(x + 46, rowY + 54, shortText(meta.secondaryName ? `SECOND / ${meta.secondaryName}` : `FALLBACK / ${meta.alternateName}`, 31).toUpperCase(), {
          color: COLORS.muted,
          fontSize: '8px',
        });
      } else {
        this.renderCostOrbs(x + 50, rowY + 61, meta.cost, 5);
      }

      this.button(x + rowW - 94, rowY + 9, 38, 28, '↑', () => this.store.moveQueuedAction(action.id, -1), {
        fill: 0x05090c,
        stroke: index === 0 ? COLORS.line : COLORS.selection,
        color: index === 0 ? COLORS.dim : COLORS.text,
        mono: true,
        fontSize: '12px',
        radius: 3,
        disabled: index === 0,
      });
      this.button(x + rowW - 46, rowY + 9, 38, 28, '↓', () => this.store.moveQueuedAction(action.id, 1), {
        fill: 0x05090c,
        stroke: last ? COLORS.line : COLORS.selection,
        color: last ? COLORS.dim : COLORS.text,
        mono: true,
        fontSize: '12px',
        radius: 3,
        disabled: last,
      });

      const wildCount = meta.cost.filter((color) => color === 'black').length;
      if (!wildCount) {
        this.mono(x + rowW - 102, rowY + 58, 'FIXED COST', { color: COLORS.dim, fontSize: '8px' });
        return;
      }
      this.mono(x + rowW - 112, rowY + 49, 'WILD PAY', { color: COLORS.paperText, fontSize: '8px' });
      for (let wildIndex = 0; wildIndex < wildCount; wildIndex += 1) {
        const pay = (this.store.actionWildPays[action.id] || [])[wildIndex] || 'black';
        this.button(x + rowW - 64 + wildIndex * 32, rowY + 45, 28, 24, ENERGY_LABELS[pay] || 'X', () => this.store.cycleWildcardPay(action.id, wildIndex), {
          fill: pay === 'white' ? COLORS.focusIvory : (ENERGY_COLORS[pay] || COLORS.black),
          stroke: pay === 'black' ? COLORS.talismanPaper : (ENERGY_COLORS[pay] || COLORS.selection),
          color: pay === 'white' ? '#08080a' : COLORS.text,
          mono: true,
          fontSize: '9px',
          radius: 3,
        });
      }
    }

    renderQueueReviewSheet(frame) {
      if (!this.store.queueReviewOpen || !this.store.actions.length) return;
      this.buttons.push({
        x: 0,
        y: 0,
        w: frame.fullWidth,
        h: frame.fullHeight,
        label: 'Queue Review Overlay',
        onClick: () => {},
        disabled: false,
      });

      const x = frame.x + 10;
      const sheetY = Math.max(164, frame.height - 582);
      const sheetH = frame.height - sheetY + 10;
      const sheetW = frame.width - 20;
      const right = x + sheetW;

      // Keep the underpass and hostile lane visible above the tactical sheet.
      this.graphics.fillStyle(0x010305, 0.38);
      this.graphics.fillRect(0, 0, frame.fullWidth, frame.fullHeight);
      this.graphics.fillStyle(0x05090c, 0.975);
      this.graphics.fillPoints([
        { x: x + 28, y: sheetY },
        { x: right, y: sheetY + 14 },
        { x: right, y: sheetY + sheetH },
        { x, y: sheetY + sheetH },
        { x, y: sheetY + 28 },
      ], true);
      this.graphics.fillStyle(COLORS.domain, 0.075);
      this.graphics.fillTriangle(x + 28, sheetY, right, sheetY + 14, right, sheetY + 116);
      this.graphics.lineStyle(2, COLORS.selection, 0.72);
      this.graphics.strokePoints([
        { x: x + 28, y: sheetY },
        { x: right, y: sheetY + 14 },
        { x: right, y: sheetY + sheetH },
        { x, y: sheetY + sheetH },
        { x, y: sheetY + 28 },
      ], true);
      this.graphics.lineStyle(1, COLORS.talismanPaper, 0.16);
      this.graphics.beginPath();
      this.graphics.moveTo(x + 18, sheetY + 78);
      this.graphics.lineTo(right - 18, sheetY + 78);
      this.graphics.strokePath();

      this.mono(x + 18, sheetY + 17, 'BATTLEFIELD COMMAND / RESOLUTION', {
        color: COLORS.paperText,
        fontSize: '9px',
        fontStyle: '700',
      });
      this.text(x + 18, sheetY + 33, 'Resolution Order', {
        fontFamily: TOKEN_TYPE.display || 'Georgia, serif',
        fontSize: '20px',
        fontStyle: '700',
      });
      this.mono(x + 20, sheetY + 62, 'ORDERS RESOLVE FROM Q1 TO Q3', {
        color: COLORS.muted,
        fontSize: '9px',
      });

      const me = this.store.me();
      const energy = (me && me.energy) || {};
      CORE_ENERGY.forEach((color, index) => {
        const cx = right - 116 + index * 26;
        const count = Number(energy[color] || 0);
        this.graphics.fillStyle(0x020405, 0.92);
        this.graphics.fillCircle(cx, sheetY + 38, 9);
        this.graphics.fillStyle(ENERGY_COLORS[color], count ? 0.95 : 0.14);
        this.graphics.fillCircle(cx, sheetY + 38, 6.2);
        this.graphics.lineStyle(1, color === 'white' ? COLORS.talismanPaper : ENERGY_COLORS[color], count ? 0.78 : 0.3);
        this.graphics.strokeCircle(cx, sheetY + 38, 8.3);
        this.mono(cx, sheetY + 49, String(count), { color: COLORS.text, fontSize: '8px' }).setOrigin(0.5, 0);
      });

      const rowW = sheetW - 40;
      this.store.actions.slice(0, 3).forEach((action, index) => {
        this.renderQueueReviewRow(frame, action, index, sheetY + 92 + index * 84, rowW);
      });

      const queueFit = this.store.queueReviewFit();
      const summaryY = sheetY + 92 + this.store.actions.slice(0, 3).length * 84 + 5;
      this.graphics.lineStyle(1, queueFit.ok ? COLORS.queued : COLORS.enemy, 0.44);
      this.graphics.beginPath();
      this.graphics.moveTo(x + 18, summaryY);
      this.graphics.lineTo(right - 18, summaryY);
      this.graphics.strokePath();
      this.mono(x + 20, summaryY + 10, queueFit.ok ? 'ENERGY COMMITMENT VALID' : shortText(queueFit.reason, 46).toUpperCase(), {
        color: queueFit.ok ? '#b7dbc0' : '#f1a0a0',
        fontSize: '9px',
        fontStyle: '700',
      });

      const footerY = frame.height - 50;
      this.button(x + 12, footerY, 78, 36, 'Cancel', () => this.store.cancelQueue(), {
        fill: 0x080b0e,
        stroke: COLORS.enemy,
        mono: true,
        fontSize: '10px',
        radius: 3,
      });
      this.button(x + 100, footerY, 68, 36, 'Back', () => this.store.closeQueueReview(), {
        fill: 0x080b0e,
        stroke: COLORS.line,
        mono: true,
        fontSize: '10px',
        radius: 3,
      });
      this.button(right - 146, footerY, 134, 36, this.store.queueSubmitting ? 'Resolving' : 'Confirm Queue', () => this.store.confirmQueue(), {
        fill: COLORS.selection,
        gradientTop: COLORS.talismanDim,
        stroke: COLORS.talismanPaper,
        color: '#08080a',
        mono: true,
        fontSize: '10px',
        radius: 3,
        disabled: this.store.queueSubmitting || !queueFit.ok,
      });
    }

}
