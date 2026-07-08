import { COLORS, CORE_ENERGY, ENERGY_COLORS, ENERGY_LABELS } from '../core/runtime-config.js?v=17';
import { shortText } from '../core/text.js?v=17';
import { CombatPlaybackScene } from '../fx/combat-playback-scene.js?v=17';

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
      return {
        caster,
        skill,
        targetName,
        cost: (skill && skill.cost) || [],
      };
    }

    renderCostOrbs(x, y, cost, maxOrbs) {
      (cost || []).slice(0, maxOrbs || 5).forEach((color, index) => {
        const cx = x + index * 13;
        const tone = ENERGY_COLORS[color] || COLORS.black;
        this.graphics.fillStyle(COLORS.inkBlack, 0.9);
        this.graphics.fillCircle(cx, y, 6);
        this.graphics.fillStyle(tone, color === 'black' ? 0.54 : 0.96);
        this.graphics.fillCircle(cx, y, 4.4);
        this.graphics.lineStyle(1, color === 'black' ? COLORS.talismanPaper : tone, 0.72);
        this.graphics.strokeCircle(cx, y, 5.6);
        this.mono(cx, y - 4, ENERGY_LABELS[color] || '?', {
          color: color === 'white' ? '#08080a' : COLORS.text,
          fontSize: '6px',
        }).setOrigin(0.5, 0);
      });
    }

    renderQueueReviewRow(frame, action, index, rowY, rowW) {
      const x = frame.x + frame.gutter + 10;
      const meta = this.actionMeta(action);
      const rowH = 70;
      const tone = index === 0 ? COLORS.selection : index === 1 ? COLORS.ally : COLORS.talismanDim;
      this.graphics.fillStyle(COLORS.surfaceRaised, 0.95);
      this.graphics.fillRoundedRect(x, rowY, rowW, rowH, 16);
      this.graphics.fillStyle(tone, 0.08);
      this.graphics.fillRoundedRect(x + 4, rowY + 4, rowW - 8, 18, 12);
      this.graphics.lineStyle(1.5, tone, 0.46);
      this.graphics.strokeRoundedRect(x, rowY, rowW, rowH, 16);

      this.graphics.fillStyle(tone, 0.9);
      this.graphics.fillRoundedRect(x + 10, rowY + 10, 26, 22, 11);
      this.mono(x + 23, rowY + 16, `Q${index + 1}`, { color: '#08080a', fontSize: '8px' }).setOrigin(0.5, 0);
      this.text(x + 44, rowY + 9, shortText(meta.skill ? meta.skill.name : action.skill_id, 22), {
        fontSize: '11px',
        fontStyle: '900',
      });
      this.mono(x + 44, rowY + 28, `${shortText(meta.caster && meta.caster.name, 15)} -> ${shortText(meta.targetName, 15)}`, {
        color: COLORS.text,
        fontSize: '8px',
      });
      this.renderCostOrbs(x + 48, rowY + 55, meta.cost, 5);

      this.button(x + rowW - 74, rowY + 9, 28, 26, '^', () => this.store.moveQueuedAction(action.id, -1), {
        fill: COLORS.surfaceDeep,
        stroke: index === 0 ? COLORS.line : COLORS.selection,
        mono: true,
        fontSize: '11px',
        disabled: index === 0,
      });
      this.button(x + rowW - 38, rowY + 9, 28, 26, 'v', () => this.store.moveQueuedAction(action.id, 1), {
        fill: COLORS.surfaceDeep,
        stroke: index >= this.store.actions.length - 1 ? COLORS.line : COLORS.selection,
        mono: true,
        fontSize: '11px',
        disabled: index >= this.store.actions.length - 1,
      });

      const wildCount = meta.cost.filter((color) => color === 'black').length;
      if (!wildCount) {
        this.mono(x + rowW - 122, rowY + 51, 'NO RANDOM', { color: COLORS.dim, fontSize: '8px' });
        return;
      }
      this.mono(x + rowW - 132, rowY + 44, 'X PAY', { color: COLORS.paperText, fontSize: '7px' });
      for (let wildIndex = 0; wildIndex < wildCount; wildIndex += 1) {
        const pay = (this.store.actionWildPays[action.id] || [])[wildIndex] || 'black';
        this.button(x + rowW - 86 + wildIndex * 34, rowY + 42, 28, 24, ENERGY_LABELS[pay] || 'X', () => this.store.cycleWildcardPay(action.id, wildIndex), {
          fill: pay === 'white' ? COLORS.focusIvory : (ENERGY_COLORS[pay] || COLORS.black),
          stroke: pay === 'black' ? COLORS.talismanPaper : (ENERGY_COLORS[pay] || COLORS.selection),
          color: pay === 'white' ? '#08080a' : COLORS.text,
          mono: true,
          fontSize: '10px',
          radius: 12,
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

      const x = frame.x + frame.gutter;
      const sheetY = Math.max(172, frame.height - 456);
      const sheetH = frame.height - sheetY + 10;
      const sheetW = frame.width - 32;
      this.graphics.fillStyle(COLORS.voidBlack, 0.7);
      this.graphics.fillRect(0, 0, frame.fullWidth, frame.fullHeight);
      this.graphics.fillStyle(COLORS.surfaceDeep, 0.99);
      this.graphics.fillRoundedRect(x, sheetY, sheetW, sheetH, 24);
      this.graphics.fillStyle(COLORS.talismanDim, 0.1);
      this.graphics.fillRoundedRect(x + 8, sheetY + 8, sheetW - 16, 52, 18);
      this.graphics.lineStyle(2, COLORS.selection, 0.72);
      this.graphics.strokeRoundedRect(x, sheetY, sheetW, sheetH, 24);
      this.graphics.fillStyle(0xffffff, 0.16);
      this.graphics.fillRoundedRect(x + sheetW / 2 - 30, sheetY + 10, 60, 4, 3);

      this.text(x + 18, sheetY + 24, 'Queue Review', {
        fontFamily: 'Cinzel, Inter, serif',
        fontSize: '20px',
        fontStyle: '900',
      });
      this.mono(x + 18, sheetY + 50, 'CHOOSE RANDOM ENERGY / RESOLVE LEFT TO RIGHT', {
        color: COLORS.paperText,
        fontSize: '8px',
      });

      const me = this.store.me();
      const energy = (me && me.energy) || {};
      CORE_ENERGY.forEach((color, index) => {
        const cx = x + sheetW - 112 + index * 26;
        const count = Number(energy[color] || 0);
        this.graphics.fillStyle(COLORS.inkBlack, 0.9);
        this.graphics.fillCircle(cx, sheetY + 38, 10);
        this.graphics.fillStyle(ENERGY_COLORS[color], count ? 0.95 : 0.14);
        this.graphics.fillCircle(cx, sheetY + 38, 7);
        this.graphics.lineStyle(1, ENERGY_COLORS[color], 0.78);
        this.graphics.strokeCircle(cx, sheetY + 38, 9);
        this.mono(cx, sheetY + 49, String(count), { color: COLORS.text, fontSize: '7px' }).setOrigin(0.5, 0);
      });

      const rowW = sheetW - 20;
      this.store.actions.slice(0, 3).forEach((action, index) => {
        this.renderQueueReviewRow(frame, action, index, sheetY + 78 + index * 78, rowW);
      });

      const footerY = frame.height - 50;
      this.button(x + 10, footerY, 78, 34, 'Cancel', () => this.store.cancelQueue(), {
        fill: COLORS.surfaceRaised,
        stroke: COLORS.enemy,
        mono: true,
        fontSize: '9px',
      });
      this.button(x + 98, footerY, 70, 34, 'Back', () => this.store.closeQueueReview(), {
        fill: COLORS.surfaceRaised,
        stroke: COLORS.line,
        mono: true,
        fontSize: '9px',
      });
      this.button(x + sheetW - 130, footerY, 120, 34, this.store.queueSubmitting ? 'Resolving' : 'Confirm Queue', () => this.store.confirmQueue(), {
        fill: COLORS.selection,
        gradientTop: COLORS.talismanDim,
        stroke: COLORS.talismanPaper,
        mono: true,
        fontSize: '9px',
        disabled: this.store.queueSubmitting,
      });
    }

}
