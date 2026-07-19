import { CORE_ENERGY, CULLING_COLORS, ENERGY_COLORS, ENERGY_LABELS, TOKEN_TYPE } from '../core/runtime-config.js?v=35';
import { CombatPlaybackScene } from '../fx/combat-playback-scene.js?v=35';
import { drawCurrentButton, drawCurrentPanel } from '../ui/culling-current-ui.js?v=35';

const SKILL_ART_BY_ENERGY = {
  green: 's3-skill-body',
  blue: 's3-skill-technique',
  white: 's3-skill-focus',
  red: 's3-skill-curse',
};

export class CombatQueueReviewScene extends CombatPlaybackScene {
    presentationLayerCall(method, payload) {
      const layer = this.presentationLayer;
      if (!layer || typeof layer[method] !== 'function') return null;
      return layer[method](this, payload);
    }

    actionMeta(action) {
      const me = this.store.me();
      const foe = this.store.foe();
      const mineId = this.store.mineId();
      const enemyId = this.store.enemyId();
      const caster = me && me.team ? me.team[action.caster_slot] : null;
      const skill = caster ? this.store.skillFor(caster, action.skill_id) : null;
      const playerFor = (playerId) => playerId === mineId ? me : playerId === enemyId ? foe : null;
      const sideFor = (playerId) => playerId === mineId ? 'ALLY' : playerId === enemyId ? 'ENEMY' : 'UNKNOWN';
      const selectedName = (player, slot) => player && player.team && player.team[slot]
        ? player.team[slot].name
        : `Slot ${Number(slot) + 1}`;
      const slotRoute = (playerId, slot) => `${sideFor(playerId)} #${Number(slot) + 1} ${selectedName(playerFor(playerId), slot)}`;
      const targetPlayer = playerFor(action.target_player_id);
      const targetSide = sideFor(action.target_player_id);
      const targetSlots = (action.target_slots || []).filter((slot) => slot != null);
      const targetName = action.target_slot != null
        ? selectedName(targetPlayer, action.target_slot)
        : targetSlots.length
          ? targetSlots.map((slot) => selectedName(targetPlayer, slot)).join(', ')
          : 'Team';
      const targetRoute = action.target_slot != null
        ? slotRoute(action.target_player_id, action.target_slot)
        : targetSlots.length
          ? `${targetSide} ${targetSlots.map((slot) => `#${Number(slot) + 1} ${selectedName(targetPlayer, slot)}`).join(', ')}`
          : `${targetSide} TEAM`;
      const secondaryName = action.secondary_target_slot !== null && action.secondary_target_slot !== undefined
        ? selectedName(targetPlayer, action.secondary_target_slot)
        : null;
      const secondaryRoute = action.secondary_target_slot != null
        ? slotRoute(action.target_player_id, action.secondary_target_slot)
        : null;
      const alternatePlayer = playerFor(action.alternate_target_player_id);
      const alternateName = action.alternate_target_slot !== null && action.alternate_target_slot !== undefined
        ? selectedName(alternatePlayer, action.alternate_target_slot)
        : null;
      const alternateRoute = action.alternate_target_slot != null
        ? slotRoute(action.alternate_target_player_id, action.alternate_target_slot)
        : null;
      return {
        caster,
        skill,
        targetName,
        targetSide,
        targetRoute,
        secondaryName,
        secondaryRoute,
        alternateName,
        alternateRoute,
        cost: skill ? this.store.adjustedCost(caster, skill) : [],
        cooldown: skill && typeof this.store.skillCooldown === 'function' ? this.store.skillCooldown(caster, skill) : 0,
        classes: skill ? (skill.classes || []).map((value) => String(value).replaceAll('_', ' ').toUpperCase()) : [],
        targetLabel: skill && typeof this.store.targetLabel === 'function' ? this.store.targetLabel(skill).toUpperCase() : targetSide,
        summary: skill && typeof this.store.effectLine === 'function' ? this.store.effectLine(skill) : '',
        replacement: !!(skill && skill.effective_skill_id),
      };
    }

    queueReviewLayout(frame) {
      const battle = typeof this.combatLayout === 'function' ? this.combatLayout(frame) : null;
      const fallbackDockY = Math.max(frame.top + 360, frame.bottom - 286);
      const allyBottom = battle ? battle.allyY + battle.cardH : fallbackDockY - 8;
      const sheetY = Math.max(frame.top + 300, Math.min(battle ? battle.dockY : fallbackDockY, allyBottom + 8));
      const footerH = 44;
      const footerY = frame.bottom - footerH;
      const headerH = battle && battle.compressed ? 42 : 46;
      const cardsY = sheetY + headerH + 4;
      const cardsBottom = footerY - 4;
      return {
        battle,
        sheetX: frame.x,
        sheetY,
        sheetW: frame.width,
        sheetH: frame.bottom - sheetY + 22,
        headerH,
        cardsY,
        cardsBottom,
        cardH: Math.max(132, cardsBottom - cardsY),
        footerY,
        footerH,
      };
    }

    renderCostOrbs(x, y, cost, maxOrbs = 5, alignRight = false) {
      const visible = (cost || []).slice(0, maxOrbs);
      const startX = alignRight ? x - Math.max(0, visible.length - 1) * 13 : x;
      visible.forEach((color, index) => {
        const cx = startX + index * 13;
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

    renderEnergyCommitment(frame, layout, queueFit) {
      const me = this.store.me();
      const energy = (me && me.energy) || {};
      const after = queueFit.remaining || {};
      const right = layout.sheetX + layout.sheetW - 12;
      const firstX = right - 78;

      this.mono(right - 88, layout.sheetY + 4, 'POOL / AFTER', {
        color: CULLING_COLORS.mutedText,
        fontSize: '9px',
        fontStyle: '700',
      });
      CORE_ENERGY.forEach((color, index) => {
        const cx = firstX + index * 23;
        const current = Number(energy[color] || 0);
        const remaining = Number(after[color] === undefined ? current : after[color]);
        this.graphics.fillStyle(CULLING_COLORS.ivory, 0.98);
        this.graphics.fillCircle(cx, layout.sheetY + 22, 8);
        this.graphics.fillStyle(ENERGY_COLORS[color], current ? 0.96 : 0.16);
        this.graphics.fillCircle(cx, layout.sheetY + 22, 5.7);
        this.graphics.lineStyle(1, color === 'white' ? CULLING_COLORS.charcoal : ENERGY_COLORS[color], current ? 0.8 : 0.28);
        this.graphics.strokeCircle(cx, layout.sheetY + 22, 7.5);
        this.mono(cx, layout.sheetY + 18.5, ENERGY_LABELS[color], {
          color: color === 'white' ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
          fontSize: '9px',
        }).setOrigin(0.5, 0);
        this.mono(cx, layout.sheetY + 31, `${current}/${remaining}`, {
          color: remaining < 0 ? CULLING_COLORS.redText : CULLING_COLORS.text,
          fontSize: '9px',
          fontStyle: '700',
        }).setOrigin(0.5, 0);
      });
    }

    renderWildPayments(action, meta, x, y, w) {
      const wildCount = meta.cost.filter((color) => color === 'black').length;
      if (!wildCount) {
        this.mono(x + w - 8, y + 9, 'FIXED', {
          color: CULLING_COLORS.mutedText,
          fontSize: '9px',
          fontStyle: '700',
        }).setOrigin(1, 0);
        return 0;
      }

      for (let wildIndex = 0; wildIndex < wildCount; wildIndex += 1) {
        const pay = (this.store.actionWildPays[action.id] || [])[wildIndex] || 'black';
        const col = wildIndex % 2;
        const row = Math.floor(wildIndex / 2);
        const buttonX = x + w - 48 - col * 46;
        const buttonY = y + 4 + row * 46;
        drawCurrentButton(this, buttonX, buttonY, 44, 44, `X>${ENERGY_LABELS[pay] || '?'}`, () => {
          this.presentationLayerCall('interactionCue', { cue: 'select', context: 'wild-cycle', action, wildIndex, pay });
          this.store.cycleWildcardPay(action.id, wildIndex);
        }, {
          fill: pay === 'white' ? CULLING_COLORS.ivory : (ENERGY_COLORS[pay] || CULLING_COLORS.charcoal),
          stroke: pay === 'black' ? CULLING_COLORS.charcoal : (ENERGY_COLORS[pay] || CULLING_COLORS.gold),
          color: pay === 'white' ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
          fontSize: '10px',
          display: false,
          cut: 7,
        });
      }
      return Math.ceil(wildCount / 2);
    }

    renderQueueActionCard(action, index, count, region, queueFit) {
      const { x, y, w, h } = region;
      const nodeStart = this.nodes.length;
      const meta = this.actionMeta(action);
      const tone = index === 0 ? CULLING_COLORS.gold : index === 1 ? CULLING_COLORS.cobalt : CULLING_COLORS.cyan;
      const last = index >= count - 1;
      const rowError = queueFit && !queueFit.ok && queueFit.actionId === action.id ? queueFit.reason : '';
      const validationTone = rowError ? CULLING_COLORS.vermilion : CULLING_COLORS.queued;
      const dense = count === 3 || h < 174;
      const controlSize = 44;
      const controlY = y + h - controlSize;

      const artEnergy = meta.cost.find((color) => color !== 'black');
      const artKey = SKILL_ART_BY_ENERGY[artEnergy] || 's3-skill-focus';
      const artRegion = { x: x + 2, y: y + 36, w: w - 4, h: Math.max(28, controlY - y - 38) };
      const integrated = meta.skill && typeof this.renderIntegratedSkillArtwork === 'function'
        ? this.renderIntegratedSkillArtwork(meta.skill, artRegion, {
          context: 'queue-action',
          slot: index,
          cost: meta.cost,
          caster: meta.caster,
          alpha: rowError ? 0.58 : 0.94,
          depth: 0.5,
          disabled: !!rowError,
          state: rowError ? 'disabled' : 'queued',
          sheen: index === 0 && !rowError,
        })
        : false;
      if (!integrated && this.textures.exists(artKey)) {
        this.coverImage(artKey, artRegion.x, artRegion.y, artRegion.w, artRegion.h, {
          alpha: rowError ? 0.52 : 0.9,
          depth: 0.5,
          focal: { x: 0.5, y: 0.42 },
        });
      } else if (!integrated && meta.caster) {
        this.portraitArtwork(meta.caster, artRegion.x, artRegion.y, artRegion.w, artRegion.h, {
          context: 'combat',
          alpha: 0.78,
          depth: 0.5,
        });
      }
      drawCurrentPanel(this, x, y, w, h, {
        fill: CULLING_COLORS.ivory,
        stroke: rowError ? CULLING_COLORS.vermilion : tone,
        accent: tone,
        alpha: 0.98,
        highlight: false,
        cut: 10,
        strokeWidth: index === 0 ? 2 : 1.25,
        strokeAlpha: index === 0 ? 0.72 : 0.44,
        shadowY: 3,
        shadowAlpha: 0.18,
      });
      this.graphics.fillStyle(CULLING_COLORS.ivory, 0.92);
      this.graphics.fillPoints([
        { x: x + 2, y: y + 49 },
        { x: x + w - 2, y: y + 38 },
        { x: x + w - 2, y: y + h - 48 },
        { x: x + 2, y: y + h - 48 },
      ], true);

      this.graphics.fillStyle(tone, 0.96);
      this.graphics.fillPoints([
        { x: x + 5, y: y + 5 },
        { x: x + 35, y: y + 5 },
        { x: x + 31, y: y + 29 },
        { x: x + 5, y: y + 29 },
      ], true);
      this.mono(x + 20, y + 11, `${index + 1}`, {
        color: index === 0 ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
        fontSize: '12px',
        fontStyle: '900',
      }).setOrigin(0.5, 0);
      this.graphics.fillStyle(validationTone, 0.96);
      this.graphics.fillRect(x + 5, y + 32, 30, 3);

      this.renderCostOrbs(x + 12, y + 41, meta.cost, 5);
      const wildRows = this.renderWildPayments(action, meta, x, y, w);
      const topInset = wildRows > 1 ? 50 + (wildRows - 1) * 44 : 50;
      const skillName = this.text(x + 8, y + topInset, meta.skill ? meta.skill.name : action.skill_id, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: '12px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
        backgroundColor: '#F2E8D5',
        padding: { x: 2, y: 1 },
        lineSpacing: 0,
        wordWrap: { width: w - 20 },
      });
      skillName.setMaxLines(2);
      skillName.setDepth(1);

      const detailParts = [];
      if (meta.secondaryRoute) detailParts.push(`2ND ${meta.secondaryRoute}`);
      if (meta.alternateRoute) detailParts.push(`ALT ${meta.alternateRoute}`);
      if (meta.replacement) detailParts.push('REPLACED SLOT');
      const metaY = y + topInset + (dense ? 29 : 31);
      const classLine = dense
        ? `CD ${meta.cooldown} / ${meta.targetLabel}`
        : `${meta.classes.slice(0, 2).join('/') || 'SKILL'} / CD ${meta.cooldown} / ${meta.targetLabel}`;
      const classNode = this.text(x + 8, metaY, classLine, {
        fontFamily: TOKEN_TYPE.mono || 'monospace',
        fontSize: '9px',
        fontStyle: '700',
        color: CULLING_COLORS.inverseText,
        backgroundColor: '#17191E',
        padding: { x: 2, y: 1 },
        wordWrap: { width: w - 20 },
      });
      classNode.setMaxLines(dense ? 1 : 2);
      classNode.setDepth(1);

      if (meta.summary && !dense) {
        const summaryNode = this.text(x + 8, metaY + 19, meta.summary, {
          fontFamily: TOKEN_TYPE.mono || 'monospace',
          fontSize: '9px',
          fontStyle: '700',
          color: CULLING_COLORS.inverseText,
          backgroundColor: '#17191E',
          padding: { x: 2, y: 1 },
          wordWrap: { width: w - 20 },
        });
        summaryNode.setMaxLines(2);
        summaryNode.setDepth(1);
      }

      const routeParts = [`${meta.caster ? meta.caster.name : 'Unknown'} > ${meta.targetRoute}`];
      routeParts.push(...detailParts);
      const routeY = Math.min(controlY - (dense ? 38 : 40), metaY + (dense ? 18 : 42));
      const route = this.text(x + 8, routeY, rowError || routeParts.join(' / '), {
        fontFamily: TOKEN_TYPE.mono || 'monospace',
        fontSize: dense ? '9px' : '10px',
        fontStyle: '700',
        color: rowError ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
        backgroundColor: '#F2E8D5',
        padding: { x: 2, y: 1 },
        wordWrap: { width: w - 20 },
      });
      route.setMaxLines(3);
      route.setDepth(1);

      drawCurrentButton(this, x + 4, controlY, controlSize, controlSize, '<', () => {
        this.presentationLayerCall('interactionCue', { cue: 'queue', context: 'queue-reorder', action, direction: -1 });
        this.store.moveQueuedAction(action.id, -1);
      }, {
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.cobalt,
        color: CULLING_COLORS.cobaltText,
        fontSize: '17px',
        display: false,
        cut: 7,
        disabled: index === 0,
      });
      drawCurrentButton(this, x + w - controlSize - 4, controlY, controlSize, controlSize, '>', () => {
        this.presentationLayerCall('interactionCue', { cue: 'queue', context: 'queue-reorder', action, direction: 1 });
        this.store.moveQueuedAction(action.id, 1);
      }, {
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.cobalt,
        color: CULLING_COLORS.cobaltText,
        fontSize: '17px',
        display: false,
        cut: 7,
        disabled: last,
      });
      this.mono(x + w / 2, controlY + 15, `Q${index + 1}`, {
        color: tone === CULLING_COLORS.cobalt ? CULLING_COLORS.cobaltText : CULLING_COLORS.text,
        fontSize: '10px',
        fontStyle: '900',
      }).setOrigin(0.5, 0);
      const newNodes = this.nodes.slice(nodeStart);
      return newNodes.find((node) => node && node.type === 'Image')
        || newNodes.find((node) => node && node.type === 'Container')
        || null;
    }

    renderQueueReviewSheet(frame) {
      if (!this.store.queueReviewOpen || !this.store.actions.length) {
        this.presentationLayerCall('renderQueueReviewState', { actions: [], cards: [] });
        return;
      }
      const layout = this.queueReviewLayout(frame);
      const queueFit = this.store.queueReviewFit();
      const me = this.store.me();

      // Queue Review is the final battlefield stage, not a detached modal.
      // Restore the center field and allied lane that CombatScene yields while
      // review is open, then replace only the lower command deck.
      if (layout.battle && typeof this.renderBattlefield === 'function') {
        this.renderBattlefield(frame, layout.battle, 'Lock the left-to-right resolution order');
      }
      if (layout.battle && typeof this.renderFighterLane === 'function') {
        this.renderFighterLane(me && me.team, 'mine', frame, layout.battle);
      }

      // Block the battle controls without dimming or covering the illustrated
      // field. Queue controls are registered after this blocker and win hit tests.
      this.buttons.push({
        x: 0,
        y: 0,
        w: frame.fullWidth,
        h: frame.fullHeight,
        label: 'Queue Review Battlefield Lock',
        onClick: () => {},
        disabled: false,
      });

      // This is a battlefield command cut, not a modal/dashboard panel: one
      // torn paper plane rises from the bottom while the fight stays visible.
      this.graphics.fillStyle(CULLING_COLORS.shadow, 0.22);
      this.graphics.fillPoints([
        { x: layout.sheetX, y: layout.sheetY + 2 },
        { x: layout.sheetX + layout.sheetW * 0.42, y: layout.sheetY - 5 },
        { x: layout.sheetX + layout.sheetW, y: layout.sheetY + 3 },
        { x: layout.sheetX + layout.sheetW, y: layout.sheetY + layout.sheetH },
        { x: layout.sheetX, y: layout.sheetY + layout.sheetH },
      ], true);
      this.graphics.fillStyle(CULLING_COLORS.ivory, 0.985);
      this.graphics.fillPoints([
        { x: layout.sheetX, y: layout.sheetY },
        { x: layout.sheetX + layout.sheetW * 0.42, y: layout.sheetY - 7 },
        { x: layout.sheetX + layout.sheetW, y: layout.sheetY + 1 },
        { x: layout.sheetX + layout.sheetW, y: layout.sheetY + layout.sheetH },
        { x: layout.sheetX, y: layout.sheetY + layout.sheetH },
      ], true);
      this.graphics.fillStyle(CULLING_COLORS.cobalt, 0.92);
      this.graphics.fillTriangle(layout.sheetX, layout.sheetY + 4, layout.sheetX + 152, layout.sheetY + 4, layout.sheetX, layout.sheetY + layout.headerH);
      this.graphics.lineStyle(2, queueFit.ok ? CULLING_COLORS.gold : CULLING_COLORS.vermilion, 0.88);
      this.graphics.beginPath();
      this.graphics.moveTo(layout.sheetX, layout.sheetY + 1);
      this.graphics.lineTo(layout.sheetX + layout.sheetW, layout.sheetY + 1);
      this.graphics.strokePath();

      this.text(layout.sheetX + 12, layout.sheetY + 5, 'FINAL ORDER', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: '18px',
        fontStyle: '900',
        color: CULLING_COLORS.inverseText,
      });
      this.mono(layout.sheetX + 13, layout.sheetY + 29, queueFit.ok ? 'LEFT > RIGHT / READY' : 'PAYMENT INVALID', {
        color: queueFit.ok ? CULLING_COLORS.inverseText : '#FFE4DF',
        fontSize: '9px',
        fontStyle: '800',
      });
      this.renderEnergyCommitment(frame, layout, queueFit);

      const actions = this.store.actions.slice(0, 3);
      const cardGap = 6;
      const cardsX = layout.sheetX + 8;
      const cardsW = layout.sheetW - 16;
      const cardW = (cardsW - cardGap * Math.max(0, actions.length - 1)) / actions.length;
      const motionCards = actions.map((action, index) => (
        this.renderQueueActionCard(action, index, actions.length, {
          x: cardsX + index * (cardW + cardGap),
          y: layout.cardsY,
          w: cardW,
          h: layout.cardH,
        }, queueFit)
      )).filter(Boolean);
      this.presentationLayerCall('renderQueueReviewState', {
        frame,
        layout,
        queueFit,
        actions,
        cards: motionCards,
      });

      const footerGap = 6;
      const backW = 64;
      const clearW = 70;
      const footerX = layout.sheetX + 8;
      const confirmX = footerX + backW + footerGap + clearW + footerGap + 4;
      const confirmW = layout.sheetX + layout.sheetW - 8 - confirmX;
      drawCurrentButton(this, footerX, layout.footerY, backW, layout.footerH, 'BACK', () => {
        this.presentationLayerCall('interactionCue', { cue: 'press', context: 'queue-review-close' });
        this.store.closeQueueReview();
      }, {
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.charcoal,
        color: CULLING_COLORS.text,
        fontSize: '10px',
        display: false,
        cut: 8,
      });
      drawCurrentButton(this, footerX + backW + footerGap, layout.footerY, clearW, layout.footerH, 'CLEAR', () => {
        this.presentationLayerCall('interactionCue', { cue: 'queue-clear' });
        this.store.cancelQueue();
      }, {
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.vermilion,
        color: CULLING_COLORS.redText,
        fontSize: '10px',
        display: false,
        cut: 8,
      });
      drawCurrentButton(this, confirmX, layout.footerY, confirmW, layout.footerH, this.store.queueSubmitting ? 'RESOLVING' : 'CONFIRM QUEUE', () => {
        this.presentationLayerCall('interactionCue', { cue: 'queue-confirm', valid: queueFit.ok });
        this.store.confirmQueue();
      }, {
        fill: queueFit.ok ? CULLING_COLORS.cobalt : CULLING_COLORS.concrete,
        stroke: queueFit.ok ? CULLING_COLORS.gold : CULLING_COLORS.vermilion,
        color: queueFit.ok ? CULLING_COLORS.inverseText : CULLING_COLORS.mutedText,
        fontSize: confirmW < 154 ? '10px' : '12px',
        display: false,
        cut: 10,
        subtitle: 'SERVER VALIDATES',
        subtitleColor: queueFit.ok ? CULLING_COLORS.inverseText : CULLING_COLORS.mutedText,
        disabled: this.store.queueSubmitting || !queueFit.ok,
      });
    }
}
