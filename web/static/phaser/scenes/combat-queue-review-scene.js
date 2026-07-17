import { COLORS, CORE_ENERGY, CULLING_COLORS, ENERGY_COLORS, ENERGY_LABELS, TOKEN_TYPE } from '../core/runtime-config.js?v=23';
import { shortText } from '../core/text.js?v=23';
import { CombatPlaybackScene } from '../fx/combat-playback-scene.js?v=23';
import { drawCurrentButton, drawCurrentPanel } from '../ui/culling-current-ui.js?v=23';

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
        const tone = ENERGY_COLORS[color] || CULLING_COLORS.charcoal;
        this.graphics.fillStyle(CULLING_COLORS.ivory, 0.98);
        this.graphics.fillCircle(cx, y, 6);
        this.graphics.fillStyle(tone, color === 'black' ? 0.76 : 0.96);
        this.graphics.fillCircle(cx, y, 4.2);
        this.graphics.lineStyle(1, color === 'black' ? CULLING_COLORS.charcoal : tone, 0.74);
        this.graphics.strokeCircle(cx, y, 5.5);
        this.mono(cx, y - 4, ENERGY_LABELS[color] || '?', {
          color: color === 'white' ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
          fontSize: '10px',
        }).setOrigin(0.5, 0);
      });
    }

    renderQueueReviewRow(frame, action, index, rowY, rowW, queueFit, compact) {
      const x = frame.x + 20;
      const meta = this.actionMeta(action);
      const rowH = compact ? 100 : 112;
      const tone = index === 0 ? CULLING_COLORS.gold : index === 1 ? CULLING_COLORS.cobalt : CULLING_COLORS.cyan;
      const last = index >= this.store.actions.length - 1;
      const detailW = Math.max(128, rowW - 154);

      drawCurrentPanel(this, x, rowY, rowW, rowH, {
        fill: CULLING_COLORS.ivory,
        stroke: tone,
        accent: tone,
        radius: 16,
        alpha: 0.98,
        accentWidth: 4,
        shadowY: 4,
        shadowAlpha: 0.12,
      });

      this.graphics.fillStyle(tone, 0.94);
      this.graphics.fillRoundedRect(x + 10, rowY + 9, 30, 22, 7);
      this.mono(x + 25, rowY + 15, `Q${index + 1}`, {
        color: CULLING_COLORS.text,
        fontSize: '10px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);

      const skillName = this.text(x + 46, rowY + 6, meta.skill ? meta.skill.name : action.skill_id, {
        fontSize: '11px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
        wordWrap: { width: detailW },
      });
      skillName.setMaxLines(2);

      const casterLine = this.text(x + 46, rowY + (compact ? 30 : 32), `CASTER / ${meta.caster ? meta.caster.name : 'Unknown'}`, {
        fontFamily: TOKEN_TYPE.mono || 'monospace',
        fontSize: '9px',
        fontStyle: '700',
        color: CULLING_COLORS.cobaltText,
        wordWrap: { width: detailW },
      });
      casterLine.setMaxLines(2);
      const targetLine = this.text(x + 46, rowY + (compact ? 48 : 53), `PRIMARY / ${meta.targetName}`, {
        fontFamily: TOKEN_TYPE.mono || 'monospace',
        fontSize: '9px',
        fontStyle: '700',
        color: CULLING_COLORS.text,
        wordWrap: { width: detailW },
      });
      targetLine.setMaxLines(2);
      if (meta.secondaryName) {
        this.mono(x + 46, rowY + (compact ? 66 : 73), `SECONDARY / ${meta.secondaryName}`, {
          color: CULLING_COLORS.mutedText,
          fontSize: '9px',
        });
      }
      if (meta.alternateName) {
        this.mono(x + 46, rowY + (compact ? 78 : 85), `ALTERNATE / ${meta.alternateName}`, {
          color: '#6240A8',
          fontSize: '9px',
        });
      }
      this.renderCostOrbs(x + 50, rowY + (compact ? 91 : 101), meta.cost, 5);

      const controlSize = 44;
      const controlGap = 6;
      const controlRight = x + rowW - 8;
      drawCurrentButton(this, controlRight - controlSize * 2 - controlGap, rowY, controlSize, controlSize, '↑', () => this.store.moveQueuedAction(action.id, -1), {
        fill: CULLING_COLORS.concrete,
        stroke: CULLING_COLORS.cobalt,
        color: CULLING_COLORS.cobaltText,
        fontSize: '16px',
        display: false,
        radius: 12,
        disabled: index === 0,
      });
      drawCurrentButton(this, controlRight - controlSize, rowY, controlSize, controlSize, '↓', () => this.store.moveQueuedAction(action.id, 1), {
        fill: CULLING_COLORS.concrete,
        stroke: CULLING_COLORS.cobalt,
        color: CULLING_COLORS.cobaltText,
        fontSize: '16px',
        display: false,
        radius: 12,
        disabled: last,
      });

      const wildCount = meta.cost.filter((color) => color === 'black').length;
      const rowError = queueFit && !queueFit.ok && queueFit.actionId === action.id ? queueFit.reason : '';
      if (!wildCount) {
        this.mono(x + rowW - 100, rowY + (compact ? 88 : 98), 'FIXED COST', { color: CULLING_COLORS.mutedText, fontSize: '9px' });
      } else {
        const wildButtonsLeft = controlRight - controlSize - (wildCount - 1) * (controlSize + controlGap);
        const wildCaption = rowError
          ? rowError === 'Assign every Wild payment.'
            ? 'ASSIGN WILD'
            : shortText(rowError, 28).toUpperCase()
          : 'WILD PAY';
        this.mono(Math.max(x + 116, wildButtonsLeft - (rowError ? 154 : 72)), rowY + (compact ? 88 : 98), wildCaption, {
          color: rowError ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
          fontSize: '9px',
          fontStyle: '700',
        });
        for (let wildIndex = 0; wildIndex < wildCount; wildIndex += 1) {
          const pay = (this.store.actionWildPays[action.id] || [])[wildIndex] || 'black';
          drawCurrentButton(this, controlRight - controlSize - wildIndex * (controlSize + controlGap), rowY + controlSize + 4, controlSize, controlSize, ENERGY_LABELS[pay] || 'X', () => this.store.cycleWildcardPay(action.id, wildIndex), {
            fill: pay === 'white' ? COLORS.focusIvory : (ENERGY_COLORS[pay] || CULLING_COLORS.charcoal),
            stroke: pay === 'black' ? CULLING_COLORS.charcoal : (ENERGY_COLORS[pay] || CULLING_COLORS.gold),
            color: pay === 'white' ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
            fontSize: '12px',
            display: false,
            radius: 12,
          });
        }
      }

      if (rowError && !wildCount) {
        this.mono(x + 46, rowY + (compact ? 77 : 87), shortText(rowError, 24).toUpperCase(), {
          color: CULLING_COLORS.redText,
          fontSize: '9px',
          fontStyle: '700',
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
      const usableH = frame.bottom - frame.top;
      const laneCompressed = usableH < 730;
      const laneCompact = usableH < 800;
      const enemyCardH = laneCompressed ? 92 : laneCompact ? 100 : frame.height > 900 ? 120 : 112;
      const enemyY = frame.top + (laneCompact ? 122 : 130);
      const defaultSheetY = Math.max(164, frame.height - 582);
      const sheetY = Math.max(defaultSheetY, enemyY + enemyCardH + 8);
      const compactRows = frame.bottom - sheetY < 540;
      const sheetH = frame.height - sheetY + 10;
      const sheetW = frame.width - 20;
      const right = x + sheetW;
      const queueFit = this.store.queueReviewFit();

      // Keep the rooftop and hostile lane visible above the tactile command sheet.
      this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.2);
      this.graphics.fillRect(0, 0, frame.fullWidth, frame.fullHeight);
      drawCurrentPanel(this, x, sheetY, sheetW, sheetH, {
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.gold,
        accent: CULLING_COLORS.gold,
        radius: 22,
        alpha: 0.995,
        shadowY: 0,
        shadowAlpha: 0.24,
      });
      this.graphics.fillStyle(CULLING_COLORS.sky, 0.26);
      this.graphics.fillRoundedRect(x + 4, sheetY + 4, sheetW - 8, 72, 18);

      this.mono(x + 18, sheetY + 14, 'BATTLEFIELD COMMAND / RESOLUTION', {
        color: CULLING_COLORS.cobaltText,
        fontSize: '10px',
        fontStyle: '700',
      });
      this.text(x + 18, sheetY + 30, 'Resolution Order', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: '21px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
      });
      this.mono(x + 20, sheetY + 58, 'ORDERS RESOLVE FROM Q1 TO Q3', {
        color: CULLING_COLORS.mutedText,
        fontSize: '10px',
      });

      const me = this.store.me();
      const energy = (me && me.energy) || {};
      CORE_ENERGY.forEach((color, index) => {
        const cx = right - 116 + index * 26;
        const count = Number(energy[color] || 0);
        this.graphics.fillStyle(CULLING_COLORS.ivory, 0.96);
        this.graphics.fillCircle(cx, sheetY + 34, 9);
        this.graphics.fillStyle(ENERGY_COLORS[color], count ? 0.95 : 0.14);
        this.graphics.fillCircle(cx, sheetY + 34, 6.2);
        this.graphics.lineStyle(1, color === 'white' ? CULLING_COLORS.charcoal : ENERGY_COLORS[color], count ? 0.78 : 0.3);
        this.graphics.strokeCircle(cx, sheetY + 34, 8.3);
        this.mono(cx, sheetY + 45, String(count), { color: CULLING_COLORS.text, fontSize: '10px' }).setOrigin(0.5, 0);
      });
      const after = queueFit.remaining;
      if (after) {
        this.mono(right - 120, sheetY + 59, `AFTER  B${after.green} T${after.blue} F${after.white} C${after.red}`, {
          color: queueFit.ok ? '#357D4B' : CULLING_COLORS.redText,
          fontSize: '9px',
          fontStyle: '700',
        });
      }

      const rowW = sheetW - 40;
      const rowStart = sheetY + (compactRows ? 72 : 84);
      const rowStep = compactRows ? 104 : 118;
      this.store.actions.slice(0, 3).forEach((action, index) => {
        this.renderQueueReviewRow(frame, action, index, rowStart + index * rowStep, rowW, queueFit, compactRows);
      });

      const summaryY = rowStart + this.store.actions.slice(0, 3).length * rowStep + 4;
      this.graphics.lineStyle(1, queueFit.ok ? COLORS.queued : CULLING_COLORS.enemy, 0.5);
      this.graphics.beginPath();
      this.graphics.moveTo(x + 18, summaryY);
      this.graphics.lineTo(right - 18, summaryY);
      this.graphics.strokePath();
      this.mono(x + 20, summaryY + 9, queueFit.ok ? 'ENERGY COMMITMENT VALID' : shortText(queueFit.reason, 46).toUpperCase(), {
        color: queueFit.ok ? '#357D4B' : CULLING_COLORS.redText,
        fontSize: '10px',
        fontStyle: '700',
      });

      const footerY = frame.bottom - 44;
      drawCurrentButton(this, x + 12, footerY, 78, 44, 'CLEAR', () => this.store.cancelQueue(), {
        fill: CULLING_COLORS.concrete,
        stroke: CULLING_COLORS.vermilion,
        color: CULLING_COLORS.redText,
        fontSize: '11px',
        display: false,
        radius: 12,
      });
      drawCurrentButton(this, x + 100, footerY, 68, 44, 'BACK', () => this.store.closeQueueReview(), {
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.charcoal,
        color: CULLING_COLORS.text,
        fontSize: '11px',
        display: false,
        radius: 12,
      });
      drawCurrentButton(this, right - 146, footerY, 134, 44, this.store.queueSubmitting ? 'RESOLVING' : 'CONFIRM QUEUE', () => this.store.confirmQueue(), {
        fill: CULLING_COLORS.cobalt,
        stroke: CULLING_COLORS.charcoal,
        color: CULLING_COLORS.inverseText,
        fontSize: '11px',
        display: false,
        radius: 12,
        disabled: this.store.queueSubmitting || !queueFit.ok,
      });
    }

}
