import { CORE_ENERGY, CULLING_COLORS, ENERGY_COLORS, ENERGY_LABELS, ENERGY_NAMES, TOKEN_TYPE } from '../core/runtime-config.js?v=58';
import { SKILL_ART_BY_ENERGY } from '../core/asset-registry.js?v=58';
import { CombatPlaybackScene } from '../fx/combat-playback-scene.js?v=58';
import { Season3UI } from '../ui/season3-ui.js?v=58';

const {
  button: drawCurrentButton,
  panel: drawCurrentPanel,
  energyPip: drawEnergyPip,
} = Season3UI.current;

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
      const sheetH = Math.min(310, Math.round((frame.bottom - frame.top) * 0.35));
      const sheetY = frame.bottom - sheetH;
      const footerH = 52;
      const footerY = frame.bottom - footerH;
      const headerH = 54;
      const cardsY = sheetY + headerH + 5;
      const cardsBottom = footerY - 8;
      return {
        battle,
        sheetX: frame.x,
        sheetY,
        sheetW: frame.width,
        sheetH,
        headerH,
        cardsY,
        cardsBottom,
        footerY,
        footerH,
      };
    }

    renderCostOrbs(x, y, cost, maxOrbs = 5, alignRight = false) {
      const visible = (cost || []).slice(0, maxOrbs);
      const startX = alignRight ? x - Math.max(0, visible.length - 1) * 13 : x;
      visible.forEach((color, index) => {
        const cx = startX + index * 13;
        drawEnergyPip(this, cx, y, color, {
          backingRadius: 6,
          radius: 4.2,
          fillAlpha: color === 'black' ? 0.76 : 0.96,
          strokeRadius: 5.5,
          strokeColor: color === 'black' ? CULLING_COLORS.charcoal : (ENERGY_COLORS[color] || CULLING_COLORS.charcoal),
          strokeAlpha: 0.74,
          label: ENERGY_LABELS[color] || '?',
          labelOffsetY: -4,
        });
      });
    }

    renderEnergyCommitment(frame, layout, queueFit) {
      const me = this.store.me();
      const energy = (me && me.energy) || {};
      const after = queueFit.remaining || {};
      const right = layout.sheetX + layout.sheetW - 12;
      const firstX = right - 78;

      this.mono(right - 158, layout.sheetY + 4, 'ENERGY  NOW > AFTER', {
        color: CULLING_COLORS.inverseText,
        fontSize: '12px',
        fontStyle: '700',
      });
      CORE_ENERGY.forEach((color, index) => {
        const cx = firstX + index * 23;
        const current = Number(energy[color] || 0);
        const remaining = Number(after[color] === undefined ? current : after[color]);
        drawEnergyPip(this, cx, layout.sheetY + 26, color, {
          backingRadius: 8,
          radius: 5.7,
          fillAlpha: current ? 0.96 : 0.16,
          strokeRadius: 7.5,
          strokeAlpha: current ? 0.8 : 0.28,
          label: ENERGY_LABELS[color],
          labelOffsetY: -3.5,
          below: `${current}/${remaining}`,
          belowColor: remaining < 0 ? '#FF938C' : CULLING_COLORS.inverseText,
          belowFontStyle: '900',
          belowOffsetY: 10,
        });
      });
    }

    renderWildPayments(action, meta, x, y, w) {
      const wildCount = meta.cost.filter((color) => color === 'black').length;
      if (!wildCount) {
        this.mono(x + w - 8, y + 9, 'FIXED', {
          color: CULLING_COLORS.mutedText,
          fontSize: '10px',
          fontStyle: '700',
        }).setOrigin(1, 0);
        return 0;
      }

      // Gap 5: Wild payment label — clarify what the X buttons are for.
      this.mono(x + 8, y + 4, 'WILD PAYMENT', {
        color: CULLING_COLORS.mutedText,
        fontSize: '10px',
        fontStyle: '700',
      });

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
          accessibilityLabel: `Assign Wild payment ${wildIndex + 1} for ${meta.skill ? meta.skill.name : 'queued action'}: ${ENERGY_NAMES[pay] || 'Unassigned'}`,
          accessibilityId: `queue-wild-${action.id}-${wildIndex}`,
          fill: pay === 'white' ? CULLING_COLORS.ivory : (ENERGY_COLORS[pay] || CULLING_COLORS.charcoal),
          stroke: pay === 'black' ? CULLING_COLORS.charcoal : (ENERGY_COLORS[pay] || CULLING_COLORS.gold),
          color: pay === 'white' ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
          fontSize: '12px',
          display: false,
          cut: 7,
        });
      }
      return Math.ceil(wildCount / 2);
    }

    renderQueueActionCard(action, index, count, region, queueFit, queueValidation = {}) {
      const { x, y, w, h } = region;
      const nodeStart = this.nodes.length;
      const meta = this.actionMeta(action);
      const tone = index === 0 ? CULLING_COLORS.gold : index === 1 ? CULLING_COLORS.cobalt : CULLING_COLORS.cyan;
      const last = index >= count - 1;
      const actionValidationReason = queueValidation && queueValidation[action.id] ? String(queueValidation[action.id]) : '';
      const rowError = actionValidationReason || (queueFit && !queueFit.ok && queueFit.actionId === action.id ? queueFit.reason : '');
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

      // metaY anchors the class/detail line below the skill name block.
      const metaY = y + topInset + (dense ? 29 : 31);
      const classLine = dense
        ? `CD ${meta.cooldown} / ${meta.targetLabel}`
        : `${meta.classes.slice(0, 2).join('/') || 'SKILL'} / CD ${meta.cooldown} / ${meta.targetLabel}`;
      const classNode = this.text(x + 6, metaY, classLine, {
        fontFamily: dense ? (TOKEN_TYPE.ui || 'Arial, sans-serif') : (TOKEN_TYPE.mono || 'monospace'),
        fontSize: '12px',
        fontStyle: '700',
        color: CULLING_COLORS.inverseText,
        backgroundColor: '#17191E',
        padding: { x: 2, y: 1 },
        lineSpacing: -2,
        wordWrap: { width: w - 12 },
      });
      classNode.setMaxLines(dense ? 1 : 2);
      classNode.setDepth(1);

      if (meta.summary && !dense) {
        const summaryNode = this.text(x + 8, metaY + 22, meta.summary, {
          fontFamily: TOKEN_TYPE.mono || 'monospace',
          fontSize: '12px',
          fontStyle: '700',
          color: CULLING_COLORS.inverseText,
          backgroundColor: '#17191E',
          padding: { x: 2, y: 1 },
          lineSpacing: -2,
          wordWrap: { width: w - 20 },
        });
        summaryNode.setMaxLines(2);
        summaryNode.setDepth(1);
      }

      // Gap 4: Structured target rows — each target type (1ST/2ND/ALT) gets its
      // own labeled chip row so narrow 3-action cards remain readable at 390px.
      // Replacement is already conveyed by the artwork ribbon; omit it from routes.
      const targetRows = [];
      if (meta.targetRoute) targetRows.push({ label: '1ST', route: meta.targetRoute, tone: CULLING_COLORS.cobalt });
      if (meta.secondaryRoute) targetRows.push({ label: '2ND', route: meta.secondaryRoute, tone: CULLING_COLORS.gold });
      if (meta.alternateRoute) targetRows.push({ label: 'ALT', route: meta.alternateRoute, tone: CULLING_COLORS.cyan });

      const routeY = Math.min(controlY - (dense ? 30 : 46), metaY + (dense ? 18 : 50));
      const routeLineH = 16;

      if (rowError) {
        const errorNode = this.text(x + 8, routeY, rowError, {
          fontFamily: TOKEN_TYPE.mono || 'monospace',
          fontSize: '12px',
          fontStyle: '700',
          color: CULLING_COLORS.redText,
          backgroundColor: '#F2E8D5',
          padding: { x: 2, y: 1 },
          lineSpacing: -2,
          wordWrap: { width: w - 20 },
        });
        errorNode.setMaxLines(dense ? 2 : 3);
        errorNode.setDepth(1);
      } else {
        targetRows.slice(0, dense ? 1 : 3).forEach((row, rowIdx) => {
          const rowY = routeY + rowIdx * routeLineH;
          const chipW = 22;
          const chipH = 13;
          this.graphics.fillStyle(row.tone, 0.86);
          this.graphics.fillRect(x + 6, rowY + 1, chipW, chipH);
          this.mono(x + 6 + chipW / 2, rowY + 1, row.label, {
            color: row.tone === CULLING_COLORS.gold ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
            fontSize: '10px',
            fontStyle: '900',
          }).setOrigin(0.5, 0).setDepth(1);
          const nameX = x + 6 + chipW + 3;
          const nameW = w - (nameX - x) - 6;
          const nameNode = this.text(nameX, rowY, row.route, {
            fontFamily: TOKEN_TYPE.mono || 'monospace',
            fontSize: '12px',
            fontStyle: '700',
            color: CULLING_COLORS.cobaltText,
            backgroundColor: '#F2E8D5',
            padding: { x: 2, y: 1 },
            lineSpacing: -2,
            wordWrap: { width: nameW },
          });
          nameNode.setMaxLines(1);
          nameNode.setDepth(1);
        });
      }

      if (count > 1) drawCurrentButton(this, x + 4, controlY, controlSize, controlSize, '<', () => {
        this.presentationLayerCall('interactionCue', { cue: 'queue', context: 'queue-reorder', action, direction: -1 });
        this.store.moveQueuedAction(action.id, -1);
      }, {
        accessibilityLabel: `Move ${meta.skill ? meta.skill.name : 'queued action'} earlier in the queue`,
        accessibilityId: `queue-move-earlier-${action.id}`,
        disabledReason: 'This action is already first in the queue.',
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.cobalt,
        color: CULLING_COLORS.cobaltText,
        fontSize: '17px',
        display: false,
        cut: 7,
        disabled: index === 0,
      });
      if (count > 1) drawCurrentButton(this, x + w - controlSize - 4, controlY, controlSize, controlSize, '>', () => {
        this.presentationLayerCall('interactionCue', { cue: 'queue', context: 'queue-reorder', action, direction: 1 });
        this.store.moveQueuedAction(action.id, 1);
      }, {
        accessibilityLabel: `Move ${meta.skill ? meta.skill.name : 'queued action'} later in the queue`,
        accessibilityId: `queue-move-later-${action.id}`,
        disabledReason: 'This action is already last in the queue.',
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

    renderQueueActionRow(action, index, count, region, queueFit, queueValidation = {}) {
      const { x, y, w, h } = region;
      const nodeStart = this.nodes.length;
      const meta = this.actionMeta(action);
      const rowError = String(queueValidation[action.id]
        || (queueFit && !queueFit.ok && queueFit.actionId === action.id ? queueFit.reason : '')
        || '');
      const tone = rowError ? CULLING_COLORS.vermilion : index === 0 ? CULLING_COLORS.gold : CULLING_COLORS.cobalt;
      const controlSize = 44;
      const controlsX = x + w - controlSize - 6;
      const artX = x + 42;
      const artW = Math.min(78, Math.round(w * 0.22));
      const textX = artX + artW + 8;
      const textW = Math.max(96, controlsX - textX - 6);
      const artRegion = { x: artX, y: y + 6, w: artW, h: h - 12 };

      drawCurrentPanel(this, x, y, w, h, {
        fill: CULLING_COLORS.ivory,
        stroke: tone,
        accent: tone,
        alpha: 0.98,
        cut: 10,
        strokeWidth: index === 0 ? 2 : 1.5,
        shadowY: 3,
        shadowAlpha: 0.18,
      });
      if (meta.skill && typeof this.renderIntegratedSkillArtwork === 'function') {
        this.renderIntegratedSkillArtwork(meta.skill, artRegion, {
          context: 'queue-action',
          slot: index,
          cost: meta.cost,
          caster: meta.caster,
          alpha: rowError ? 0.48 : 0.94,
          depth: 0.5,
          disabled: !!rowError,
          state: rowError ? 'disabled' : 'queued',
        });
      }
      this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.72);
      this.graphics.fillRect(artX, y + h - 27, artW, 21);
      this.renderCostOrbs(artX + 10, y + h - 17, meta.cost, 5);

      this.graphics.fillStyle(tone, 0.98);
      this.graphics.fillPoints([
        { x: x + 4, y: y + 4 },
        { x: x + 36, y: y + 4 },
        { x: x + 32, y: y + 38 },
        { x: x + 4, y: y + 38 },
      ], true);
      this.text(x + 19, y + 9, String(index + 1), {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: '20px',
        fontStyle: '900',
        color: index === 0 && !rowError ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
      }).setOrigin(0.5, 0);

      const title = this.text(textX, y + 8, meta.skill ? meta.skill.name : action.skill_id, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: '15px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
        wordWrap: { width: textW },
        lineSpacing: -2,
      });
      title.setMaxLines(2);
      this.mono(textX, y + 43, meta.replacement ? `REPLACED · ${meta.targetLabel}` : meta.targetLabel, {
        color: meta.replacement ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
        fontSize: '10px',
        fontStyle: '900',
      });

      const routes = [
        ['1ST', meta.targetRoute],
        ['2ND', meta.secondaryRoute],
        ['ALT', meta.alternateRoute],
      ].filter(([, route]) => route);
      if (rowError) {
        this.text(textX, y + 61, rowError, {
          fontFamily: TOKEN_TYPE.mono || 'monospace',
          fontSize: '12px',
          fontStyle: '800',
          color: CULLING_COLORS.redText,
          wordWrap: { width: textW },
          lineSpacing: -2,
        }).setMaxLines(3);
      } else {
        routes.slice(0, 3).forEach(([label, route], routeIndex) => {
          this.mono(textX, y + 61 + routeIndex * 17, `${label}  ${route}`, {
            color: CULLING_COLORS.text,
            fontSize: '10px',
            fontStyle: routeIndex === 0 ? '900' : '700',
            wordWrap: { width: textW },
          }).setMaxLines(1);
        });
      }

      const wildCount = meta.cost.filter((color) => color === 'black').length;
      if (wildCount) {
        this.mono(textX, y + h - 46, 'WILD PAYMENT', {
          color: CULLING_COLORS.mutedText,
          fontSize: '10px',
          fontStyle: '900',
        });
        for (let wildIndex = 0; wildIndex < wildCount; wildIndex += 1) {
          const pay = (this.store.actionWildPays[action.id] || [])[wildIndex] || 'black';
          drawCurrentButton(this, textX + 78 + (wildIndex % 2) * 46, y + h - 48 - Math.floor(wildIndex / 2) * 46, 44, 44, `X>${ENERGY_LABELS[pay] || '?'}`, () => {
            this.store.cycleWildcardPay(action.id, wildIndex);
          }, {
            accessibilityLabel: `Assign Wild payment ${wildIndex + 1} for ${meta.skill ? meta.skill.name : 'queued action'}`,
            accessibilityId: `queue-wild-${action.id}-${wildIndex}`,
            fill: pay === 'white' ? CULLING_COLORS.ivory : (ENERGY_COLORS[pay] || CULLING_COLORS.charcoal),
            stroke: ENERGY_COLORS[pay] || CULLING_COLORS.gold,
            color: pay === 'white' ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
            fontSize: '10px',
            display: false,
            cut: 7,
          });
        }
      } else {
        this.mono(textX, y + h - 23, meta.summary || 'FIXED COST', {
          color: CULLING_COLORS.mutedText,
          fontSize: '10px',
          fontStyle: '700',
          wordWrap: { width: textW },
        }).setMaxLines(1);
      }

      drawCurrentButton(this, controlsX, y + 6, controlSize, controlSize, '↑', () => {
        this.store.moveQueuedAction(action.id, -1);
      }, {
        accessibilityLabel: `Move ${meta.skill ? meta.skill.name : 'queued action'} earlier`,
        accessibilityId: `queue-move-earlier-${action.id}`,
        disabled: index === 0,
        disabledReason: 'This action is already first.',
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.cobalt,
        color: CULLING_COLORS.cobaltText,
        fontSize: '18px',
        display: false,
        cut: 7,
      });
      drawCurrentButton(this, controlsX, y + h - controlSize - 6, controlSize, controlSize, '↓', () => {
        this.store.moveQueuedAction(action.id, 1);
      }, {
        accessibilityLabel: `Move ${meta.skill ? meta.skill.name : 'queued action'} later`,
        accessibilityId: `queue-move-later-${action.id}`,
        disabled: index >= count - 1,
        disabledReason: 'This action is already last.',
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.cobalt,
        color: CULLING_COLORS.cobaltText,
        fontSize: '18px',
        display: false,
        cut: 7,
      });
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
      const queueValidation = this.store.queueReviewValidationMap();

      this.buttons.push({
        x: 0,
        y: 0,
        w: frame.fullWidth,
        h: frame.fullHeight,
        label: 'Queue Review Battlefield Lock',
        onClick: () => {},
        disabled: false,
      });

      this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.78);
      this.graphics.fillRect(layout.sheetX, layout.sheetY, layout.sheetW, layout.sheetH);
      this.graphics.fillStyle(CULLING_COLORS.ivory, 0.98);
      this.graphics.fillRect(layout.sheetX, layout.cardsY - 4, layout.sheetW, layout.sheetH - layout.headerH + 4);
      this.graphics.fillStyle(CULLING_COLORS.cobalt, 0.96);
      this.graphics.fillTriangle(layout.sheetX, layout.sheetY, layout.sheetX + 176, layout.sheetY, layout.sheetX, layout.sheetY + layout.headerH);
      this.graphics.lineStyle(3, queueFit.ok ? CULLING_COLORS.gold : CULLING_COLORS.vermilion, 0.94);
      this.graphics.beginPath();
      this.graphics.moveTo(layout.sheetX, layout.cardsY - 5);
      this.graphics.lineTo(layout.sheetX + layout.sheetW, layout.cardsY - 5);
      this.graphics.strokePath();

      this.text(layout.sheetX + 12, layout.sheetY + 8, 'FINAL ORDER', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: '18px',
        fontStyle: '900',
        color: CULLING_COLORS.inverseText,
      });
      const actions = this.store.actions.slice(0, 3);
      const resolutionOrder = actions.map((_, index) => index + 1).join(' > ');
      this.mono(layout.sheetX + 13, layout.sheetY + 35, queueFit.ok ? `RESOLVES ${resolutionOrder}` : 'PAYMENT INVALID', {
        color: queueFit.ok ? CULLING_COLORS.inverseText : '#FFE4DF',
        fontSize: '12px',
        fontStyle: '800',
      });
      this.renderEnergyCommitment(frame, layout, queueFit);

      const cardGap = 5;
      const cardsX = layout.sheetX + 8;
      const cardsW = layout.sheetW - 16;
      const cardW = (cardsW - cardGap * Math.max(0, actions.length - 1)) / actions.length;
      const cardH = layout.cardsBottom - layout.cardsY;
      const motionCards = actions.map((action, index) => (
        this.renderQueueActionCard(action, index, actions.length, {
          x: cardsX + index * (cardW + cardGap),
          y: layout.cardsY,
          w: cardW,
          h: cardH,
        }, queueFit, queueValidation)
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
        accessibilityLabel: 'Return to Orders Open and add or revise fighter actions',
        accessibilityId: 'queue-review-back',
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.charcoal,
        color: CULLING_COLORS.text,
        fontSize: '12px',
        display: false,
        cut: 8,
      });
      drawCurrentButton(this, footerX + backW + footerGap, layout.footerY, clearW, layout.footerH, 'CLEAR', () => {
        this.presentationLayerCall('interactionCue', { cue: 'queue-clear' });
        this.store.cancelQueue();
      }, {
        accessibilityLabel: 'Clear all queued actions',
        accessibilityId: 'queue-review-clear',
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.vermilion,
        color: CULLING_COLORS.redText,
        fontSize: '12px',
        display: false,
        cut: 8,
      });
      drawCurrentButton(this, confirmX, layout.footerY, confirmW, layout.footerH, this.store.queueSubmitting ? 'CONFIRMING' : 'CONFIRM QUEUE', () => {
        this.presentationLayerCall('interactionCue', { cue: 'queue-confirm', valid: queueFit.ok });
        this.store.confirmQueue();
      }, {
        accessibilityLabel: this.store.queueSubmitting ? 'Queue is being validated by the server' : 'Confirm queue',
        accessibilityId: 'queue-review-confirm',
        disabledReason: this.store.queueSubmitting
          ? 'Queue confirmation is already being submitted.'
          : (queueFit.reason || 'The queue cannot be confirmed yet.'),
        fill: queueFit.ok ? CULLING_COLORS.cobalt : CULLING_COLORS.concrete,
        stroke: queueFit.ok ? CULLING_COLORS.gold : CULLING_COLORS.vermilion,
        color: queueFit.ok ? CULLING_COLORS.inverseText : CULLING_COLORS.mutedText,
        fontSize: confirmW < 154 ? '12px' : '14px',
        display: false,
        cut: 10,
        subtitle: 'SERVER VALIDATES',
        subtitleColor: queueFit.ok ? CULLING_COLORS.inverseText : CULLING_COLORS.mutedText,
        disabled: this.store.queueSubmitting || !queueFit.ok,
      });
    }
}
