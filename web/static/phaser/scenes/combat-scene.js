import { COLORS, CULLING_COLORS, ENERGY_COLORS, ENERGY_LABELS, TOKEN_TYPE } from '../core/runtime-config.js?v=23';
import { clamp, initials, safeText, shortText, titleize } from '../core/text.js?v=23';
import { eventTone } from '../fx/event-metrics.js?v=23';
import { drawCurrentButton, drawCurrentPanel, drawCurrentWorld } from '../ui/culling-current-ui.js?v=23';
import { CombatQueueReviewScene } from './combat-queue-review-scene.js?v=23';

const WORLD_KEY = 'culling-current-rooftop';
const LOCATION_LINE = 'TOKYO MUNICIPAL ROOFTOP';

export class CombatScene extends CombatQueueReviewScene {
    constructor() {
      super('CombatScene');
    }

    combatLayout(frame) {
      const usableH = frame.bottom - frame.top;
      const compressed = usableH < 730;
      const compact = usableH < 800;
      const dockH = clamp(Math.round(usableH * 0.34), compressed ? 244 : compact ? 260 : 276, 304);
      const dockY = frame.bottom - dockH;
      const cardH = compressed ? 92 : compact ? 100 : frame.height > 900 ? 120 : 112;
      const enemyY = frame.top + (compact ? 122 : 130);
      const fieldTop = enemyY + cardH + 12;
      const laneGap = compressed ? 18 : compact ? 22 : 28;
      const allyY = dockY - cardH - laneGap;
      const fieldBottom = allyY - 12;
      const contentX = frame.x + 14;
      const contentW = frame.width - 28;
      const gap = 8;
      const cardW = (contentW - gap * 2) / 3;
      return {
        compact,
        compressed,
        usableH,
        dockH,
        dockY,
        cardH,
        enemyY,
        allyY,
        fieldTop,
        fieldBottom,
        fieldH: Math.max(0, fieldBottom - fieldTop),
        contentX,
        contentW,
        gap,
        cardW,
      };
    }

    renderWorld(frame) {
      drawCurrentWorld(this, frame, WORLD_KEY, {
        topWash: 0.1,
        bottomWash: 0.82,
        bottomHeight: 342,
        accents: false,
      });
      const g = this.graphics;
      // A restrained printed-energy current ties the tactical overlay to the
      // authored rooftop without turning ordinary play into a dark Domain.
      g.lineStyle(2, CULLING_COLORS.cyan, 0.14);
      for (let index = 0; index < 4; index += 1) {
        const y = frame.top + 92 + index * 36;
        g.beginPath();
        g.moveTo(frame.x - 10, y + 18);
        g.lineTo(frame.x + frame.width * 0.42, y - 4);
        g.lineTo(frame.x + frame.width + 10, y + 8);
        g.strokePath();
      }
    }

    renderTopHud(frame, state, me) {
      const g = this.graphics;
      const x = frame.x + 10;
      const y = frame.top;
      const w = frame.width - 20;
      const mine = this.store.isMyTurn();
      const queueCount = this.store.actions.length;
      const disconnectSeconds = this.store.disconnectSecondsRemaining();
      const connectionWarning = this.store.connectionState === 'disconnected'
        ? 'OFFLINE'
        : disconnectSeconds !== null
          ? `PAUSED ${disconnectSeconds}S`
          : null;
      const statusLabel = connectionWarning
        || (this.store.queueSubmitting
          ? 'RESOLVING'
          : this.store.queueReviewOpen
            ? 'QUEUE REVIEW'
            : this.store.controlsLocked()
              ? 'ENEMY CONTROL'
              : queueCount
                ? 'ORDERS OPEN'
                : 'YOUR MOVE');

      drawCurrentPanel(this, x, y, w, 68, {
        fill: CULLING_COLORS.ivory,
        stroke: mine ? CULLING_COLORS.cobalt : CULLING_COLORS.vermilion,
        accent: mine ? CULLING_COLORS.gold : CULLING_COLORS.vermilion,
        radius: 16,
        alpha: 0.95,
        shadowY: 4,
        shadowAlpha: 0.14,
      });

      this.mono(x + 12, y + 6, LOCATION_LINE, {
        color: CULLING_COLORS.cobaltText,
        fontSize: '10px',
        fontStyle: '700',
      });
      this.text(x + 12, y + 27, `Turn ${state.turn_number || 1}`, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: '20px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
      });
      this.mono(x + 14, y + 52, statusLabel, {
        color: connectionWarning ? CULLING_COLORS.redText : mine ? CULLING_COLORS.cobaltText : CULLING_COLORS.redText,
        fontSize: '10px',
        fontStyle: '700',
      });

      const phase = safeText(state.phase || 'PLANNING').replaceAll('_', ' ');
      const phaseSeconds = Number(state.phase_seconds_remaining);
      this.mono(x + 110, y + 27, phase, {
        color: CULLING_COLORS.mutedText,
        fontSize: '9px',
        fontStyle: '700',
      });
      const clockLabel = Number.isFinite(phaseSeconds) ? `${Math.max(0, Math.ceil(phaseSeconds))}S` : '--';
      this.mono(x + 110, y + 45, `${clockLabel}  ·  Q${queueCount}/3`, {
        color: Number.isFinite(phaseSeconds) && phaseSeconds <= 10 ? CULLING_COLORS.redText : queueCount ? '#357D4B' : CULLING_COLORS.text,
        fontSize: '9px',
        fontStyle: '700',
      });
      this.renderEnergyMeter(x + w - 142, y + 34, me && me.energy);

      drawCurrentButton(this, x + w - 54, y + 13, 44, 44, 'EXIT', () => this.store.resetToLobby(), {
        fill: CULLING_COLORS.vermilion,
        stroke: CULLING_COLORS.charcoal,
        color: CULLING_COLORS.inverseText,
        fontSize: '11px',
        display: false,
        radius: 12,
        brush: 'red',
      });
    }

    renderEnergyMeter(x, y, energy) {
      const slots = [
        { color: 'green', label: 'B' },
        { color: 'blue', label: 'T' },
        { color: 'white', label: 'F' },
        { color: 'red', label: 'C' },
      ];
      slots.forEach((slot, index) => {
        const count = Number((energy && energy[slot.color]) || 0);
        const cx = x + index * 24;
        this.graphics.fillStyle(CULLING_COLORS.ivory, 0.98);
        this.graphics.fillCircle(cx, y, 9);
        this.graphics.fillStyle(ENERGY_COLORS[slot.color], count ? 0.94 : 0.14);
        this.graphics.fillCircle(cx, y, 6.3);
        this.graphics.lineStyle(1, slot.color === 'white' ? CULLING_COLORS.charcoal : ENERGY_COLORS[slot.color], count ? 0.82 : 0.34);
        this.graphics.strokeCircle(cx, y, 8.5);
        this.mono(cx, y - 3.5, slot.label, {
          color: slot.color === 'white' ? CULLING_COLORS.text : '#F7F4EC',
          fontSize: '10px',
        }).setOrigin(0.5, 0);
        this.mono(cx, y + 11, String(count), { color: CULLING_COLORS.text, fontSize: '10px' }).setOrigin(0.5, 0);
      });
    }

    renderPortraitPlate(character, x, y, w, h, options = {}) {
      const dead = !character || !character.alive;
      const id = character && (character.character_id || character.id);
      const key = `${this.store.portraitKey(id)}-card`;
      if (this.textures.exists(key)) {
        const image = this.add.image(x + w / 2, y + h / 2, key);
        image.setDisplaySize(w, h);
        image.setAlpha(dead ? 0.28 : (options.alpha === undefined ? 0.9 : options.alpha));
        image.setDepth(-1);
        this.nodes.push(image);
      } else {
        const tone = this.store.assets.toneFor(id || (character && character.name));
        const mark = initials((character && character.name) || 'Down');
        this.graphics.fillStyle(CULLING_COLORS.ivory, dead ? 0.64 : 0.96);
        this.graphics.fillRect(x, y, w, h);
        this.graphics.fillStyle(tone, dead ? 0.05 : 0.14);
        this.graphics.fillTriangle(x, y, x + w, y, x, y + h);
        this.graphics.fillStyle(CULLING_COLORS.charcoal, dead ? 0.08 : 0.16);
        this.graphics.fillPoints([
          { x: x + w * 0.30, y: y + h },
          { x: x + w * 0.38, y: y + h * 0.45 },
          { x: x + w * 0.48, y: y + h * 0.30 },
          { x: x + w * 0.60, y: y + h * 0.44 },
          { x: x + w * 0.72, y: y + h },
        ], true);
        this.graphics.lineStyle(1, tone, dead ? 0.16 : 0.44);
        this.graphics.beginPath();
        this.graphics.moveTo(x + 8, y + h - 9);
        this.graphics.lineTo(x + w - 8, y + 8);
        this.graphics.strokePath();
        this.text(x + w - 10, y + 7, mark, {
          fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
          fontSize: `${Math.max(14, Math.round(w * 0.18))}px`,
          fontStyle: '900',
          color: dead ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
        }).setOrigin(1, 0);
      }
    }

    renderIdentitySeal(character, x, y, w, h) {
      const tone = this.store.assets.toneFor(character && character.character_id);
      const mark = initials((character && character.name) || '?');
      this.graphics.fillStyle(CULLING_COLORS.ivory, 0.96);
      this.graphics.fillPoints([
        { x: x + 7, y },
        { x: x + w, y },
        { x: x + w, y: y + h - 7 },
        { x: x + w - 7, y: y + h },
        { x, y: y + h },
        { x, y: y + 7 },
      ], true);
      this.graphics.fillStyle(tone, 0.14);
      this.graphics.fillTriangle(x, y, x + w, y, x, y + h);
      this.graphics.lineStyle(1, tone, 0.72);
      this.graphics.strokePoints([
        { x: x + 7, y },
        { x: x + w, y },
        { x: x + w, y: y + h - 7 },
        { x: x + w - 7, y: y + h },
        { x, y: y + h },
        { x, y: y + 7 },
      ], true);
      this.text(x + w / 2, y + h / 2 - 10, mark, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: '17px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
      }).setOrigin(0.5, 0);
    }

    renderFighterPlate(character, side, slot, x, y, w, h) {
      const store = this.store;
      const selected = side === 'mine' && store.selectedCasterSlot === slot;
      const queuedIndex = side === 'mine' ? store.actions.findIndex((action) => Number(action.caster_slot) === slot) : -1;
      const targetable = store.canTarget(character, slot, side);
      const selectedSkill = store.selectedSkill();
      const protectedTarget = !!selectedSkill && store.targetBlocksSkill(character, selectedSkill);
      const dead = !character || !character.alive;
      const baseTone = side === 'enemy' ? CULLING_COLORS.enemy : CULLING_COLORS.cobalt;
      const tone = targetable
        ? CULLING_COLORS.target
        : protectedTarget
          ? CULLING_COLORS.muted
          : selected
            ? CULLING_COLORS.selected
            : queuedIndex >= 0
              ? CULLING_COLORS.queued
              : baseTone;
      const portraitH = h - 35;
      const cx = x + w / 2;
      const cy = y + portraitH / 2;
      const playerId = side === 'mine' ? store.mineId() : store.enemyId();
      if (playerId) {
        this.playbackTargets = this.playbackTargets || {};
        this.playbackTargets[`${playerId}:${slot}`] = { x: cx, y: cy, side, slot, size: Math.min(w, portraitH), tone };
      }

      // World-anchored light fighter card: the art stays visible while every
      // legal/queued/protected state keeps an explicit color and label.
      this.graphics.fillStyle(CULLING_COLORS.shadow, targetable || selected ? 0.18 : 0.11);
      this.graphics.fillPoints([
        { x: x + 7, y: y + 4 },
        { x: x + w, y: y + 4 },
        { x: x + w, y: y + h - 5 },
        { x: x + w - 9, y: y + h + 4 },
        { x, y: y + h + 4 },
        { x, y: y + 11 },
      ], true);
      this.renderPortraitPlate(character, x + 4, y + 4, w - 8, portraitH - 5, { alpha: dead ? 0.3 : targetable ? 1 : 0.96 });
      this.graphics.fillStyle(CULLING_COLORS.ivory, 0.88);
      this.graphics.fillRect(x + 4, y + portraitH - 31, w - 8, 30);
      this.graphics.fillStyle(CULLING_COLORS.ivory, 0.98);
      this.graphics.fillRect(x, y + portraitH, w, h - portraitH);
      this.graphics.fillStyle(tone, dead ? 0.16 : (targetable || selected ? 0.82 : 0.46));
      this.graphics.fillRect(x, y, selected || targetable ? 4 : 2, h);
      this.graphics.lineStyle(selected || targetable ? 2 : 1, tone, dead ? 0.22 : (targetable ? 0.94 : 0.56));
      this.graphics.strokePoints([
        { x: x + 7, y },
        { x: x + w, y },
        { x: x + w, y: y + h - 9 },
        { x: x + w - 9, y: y + h },
        { x, y: y + h },
        { x, y: y + 7 },
      ], true);

      const hp = Number(character && character.hp ? character.hp : 0);
      const maxHp = Math.max(1, Number(character && character.max_hp ? character.max_hp : 1));
      const hpPct = clamp(hp / maxHp, 0, 1);
      const hpTone = hpPct <= 0.3 ? CULLING_COLORS.enemy : hpPct <= 0.6 ? CULLING_COLORS.gold : CULLING_COLORS.queued;
      const barX = x + 7;
      const barY = y + h - 13;
      const barW = w - 14;
      this.graphics.fillStyle(CULLING_COLORS.concrete, 0.98);
      this.graphics.fillRect(barX, barY, barW, 5);
      this.graphics.fillStyle(hpTone, dead ? 0.28 : 0.96);
      this.graphics.fillRect(barX, barY, barW * hpPct, 5);

      const fighterName = (character && character.name) || 'Down';
      const fighterNameNode = this.text(x + 7, y + portraitH - 28, fighterName, {
        fontSize: w < 110 ? '9px' : '10px',
        fontStyle: '800',
        color: dead ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
        backgroundColor: '#F7F4EC',
        padding: { x: 3, y: 1 },
        wordWrap: { width: w - 14 },
      });
      fighterNameNode.setMaxLines(2);
      this.mono(x + 7, y + portraitH + 4, dead ? 'DOWN' : `${hp}/${maxHp}`, {
        color: dead ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
        fontSize: '10px',
      });

      const stateLabel = queuedIndex >= 0
        ? `Q${queuedIndex + 1}`
        : targetable
          ? 'LEGAL'
          : protectedTarget
            ? 'WARD'
            : selected
              ? 'ACTIVE'
              : '';
      if (stateLabel) {
        const chipW = stateLabel.length * 5 + 14;
        this.graphics.fillStyle(tone, targetable || selected || queuedIndex >= 0 ? 0.94 : 0.72);
        this.graphics.fillPoints([
          { x: x + 5, y: y - 8 },
          { x: x + chipW, y: y - 8 },
          { x: x + chipW - 5, y: y + 8 },
          { x: x + 5, y: y + 8 },
        ], true);
        this.mono(x + 9, y - 3, stateLabel, {
          color: protectedTarget ? CULLING_COLORS.inverseText : CULLING_COLORS.text,
          fontSize: '10px',
          fontStyle: '700',
        });
      }

      if (targetable) {
        const bracket = 12;
        const pad = 4;
        this.graphics.lineStyle(2, CULLING_COLORS.target, 0.94);
        [
          [x - pad, y - pad, x - pad + bracket, y - pad, x - pad, y - pad + bracket],
          [x + w + pad, y - pad, x + w + pad - bracket, y - pad, x + w + pad, y - pad + bracket],
          [x - pad, y + h + pad, x - pad + bracket, y + h + pad, x - pad, y + h + pad - bracket],
          [x + w + pad, y + h + pad, x + w + pad - bracket, y + h + pad, x + w + pad, y + h + pad - bracket],
        ].forEach((points) => {
          this.graphics.beginPath();
          this.graphics.moveTo(points[0], points[1]);
          this.graphics.lineTo(points[2], points[3]);
          this.graphics.moveTo(points[0], points[1]);
          this.graphics.lineTo(points[4], points[5]);
          this.graphics.strokePath();
        });
      }

      (character && character.statuses ? character.statuses : []).slice(0, 2).forEach((status, index) => {
        const chipW = 28;
        const sx = x + w - 5 - (index + 1) * (chipW + 3);
        this.graphics.fillStyle(COLORS.domain, 0.86);
        this.graphics.fillRoundedRect(sx, y + 7, chipW, 14, 6);
        this.mono(sx + chipW / 2, y + 9, shortText(status.name || status.id, 3).toUpperCase(), {
          color: '#ffffff',
          fontSize: '9px',
        }).setOrigin(0.5, 0);
      });

      this.buttons.push({
        x: x - 3,
        y: y - 4,
        w: w + 6,
        h: h + 12,
        label: `${side} ${slot}`,
        onClick: () => store.target(side, slot),
        disabled: false,
      });
    }

    renderFighterLane(team, side, frame, layout) {
      const y = side === 'enemy' ? layout.enemyY : layout.allyY;
      const label = side === 'enemy' ? 'HOSTILE SIGNATURES' : 'YOUR FIELD';
      const tone = side === 'enemy' ? CULLING_COLORS.enemy : CULLING_COLORS.cobalt;
      this.mono(layout.contentX + 2, y - 20, label, {
        color: side === 'enemy' ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
        fontSize: '10px',
        fontStyle: '700',
      });
      this.graphics.lineStyle(1, tone, 0.42);
      this.graphics.beginPath();
      this.graphics.moveTo(layout.contentX + 102, y - 15);
      this.graphics.lineTo(layout.contentX + layout.contentW, y - 15);
      this.graphics.strokePath();
      (team || []).forEach((character, slot) => {
        const x = layout.contentX + slot * (layout.cardW + layout.gap);
        this.renderFighterPlate(character, side, slot, x, y, layout.cardW, layout.cardH);
      });
    }

    renderBattlefield(frame, layout, prompt) {
      const g = this.graphics;
      const centerX = frame.x + frame.width / 2;
      const centerY = layout.fieldTop + layout.fieldH * 0.42;
      const selectedSkill = this.store.selectedSkill();

      // The directive floats inside the place; it is not a full battlefield card.
      g.fillStyle(CULLING_COLORS.ivory, 0.88);
      g.fillPoints([
        { x: centerX - 126, y: layout.fieldTop + 7 },
        { x: centerX + 108, y: layout.fieldTop + 7 },
        { x: centerX + 126, y: layout.fieldTop + 25 },
        { x: centerX + 110, y: layout.fieldTop + 43 },
        { x: centerX - 126, y: layout.fieldTop + 43 },
      ], true);
      g.lineStyle(1.5, selectedSkill ? CULLING_COLORS.target : CULLING_COLORS.cobalt, selectedSkill ? 0.82 : 0.34);
      g.strokePoints([
        { x: centerX - 126, y: layout.fieldTop + 7 },
        { x: centerX + 108, y: layout.fieldTop + 7 },
        { x: centerX + 126, y: layout.fieldTop + 25 },
        { x: centerX + 110, y: layout.fieldTop + 43 },
        { x: centerX - 126, y: layout.fieldTop + 43 },
      ], true);
      this.mono(centerX, layout.fieldTop + 15, selectedSkill ? 'TARGET ACQUISITION' : 'TACTICAL DIRECTIVE', {
        color: selectedSkill ? '#007C84' : CULLING_COLORS.cobaltText,
        fontSize: '10px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
      this.text(centerX, layout.fieldTop + 27, prompt, {
        fontSize: layout.compact ? '12px' : '13px',
        fontStyle: '800',
        color: CULLING_COLORS.text,
        align: 'center',
        wordWrap: { width: 226 },
      }).setOrigin(0.5, 0);

      // Cursed cartography and selection line connect the UI to the environment.
      g.lineStyle(1, CULLING_COLORS.domain, 0.2);
      g.strokeCircle(centerX, centerY, Math.min(62, layout.fieldH * 0.32));
      g.lineStyle(1, CULLING_COLORS.cobalt, 0.16);
      g.beginPath();
      g.moveTo(centerX - 78, centerY + 6);
      g.lineTo(centerX + 72, centerY - 11);
      g.moveTo(centerX - 22, centerY - 56);
      g.lineTo(centerX + 18, centerY + 61);
      g.strokePath();
      if (selectedSkill && this.store.selectedCasterSlot !== null) {
        const slot = Number(this.store.selectedCasterSlot);
        const fromX = layout.contentX + slot * (layout.cardW + layout.gap) + layout.cardW / 2;
        const fromY = layout.allyY - 4;
        g.lineStyle(2, CULLING_COLORS.target, 0.44);
        g.beginPath();
        g.moveTo(fromX, fromY);
        g.lineTo(centerX, centerY + 22);
        g.strokePath();
        g.fillStyle(CULLING_COLORS.target, 0.12);
        g.fillCircle(centerX, centerY, 28);
        g.lineStyle(1.5, CULLING_COLORS.target, 0.76);
        g.strokeCircle(centerX, centerY, 34);
      }

      this.renderReplayLine(frame, layout.allyY - 70);
      this.renderQueueChips(frame, layout.allyY - 32);
    }

    renderSkillButton(skill, caster, index, x, y, w, h) {
      const cooldown = this.store.skillCooldown(caster, skill);
      const fit = this.store.skillFit(skill, caster);
      const ruleReason = this.store.statusBlocksSkill(caster, skill);
      const disabled = cooldown > 0 || !!ruleReason || !fit.ok || this.store.queuedSlots().has(Number(this.store.selectedCasterSlot)) || this.store.controlsLocked();
      const selected = this.store.selectedSkillId === skill.id;
      const tone = selected ? CULLING_COLORS.selected : (ENERGY_COLORS[(this.store.adjustedCost(caster, skill) || [])[0]] || CULLING_COLORS.cobalt);
      const reasonLimit = w < 170 ? 15 : 18;
      const reason = cooldown > 0 ? `CD ${cooldown}` : ruleReason ? shortText(ruleReason, reasonLimit) : fit.ok ? shortText(this.store.effectLine(skill), reasonLimit) : shortText(fit.reason, reasonLimit);
      const displayReason = skill.effective_skill_id ? shortText(`REPLACED ${reason}`, reasonLimit + 5) : reason;

      drawCurrentPanel(this, x, y, w, h, {
        fill: CULLING_COLORS.ivory,
        stroke: tone,
        accent: tone,
        radius: 14,
        alpha: disabled ? 0.7 : 0.97,
        accentWidth: selected ? 5 : 3,
        accentAlpha: disabled ? 0.34 : selected ? 0.98 : 0.74,
        shadowAlpha: disabled ? 0.06 : 0.12,
      });

      this.mono(x + 12, y + 8, `0${index + 1}`, {
        color: selected ? '#8A5A00' : CULLING_COLORS.mutedText,
        fontSize: '10px',
        fontStyle: '700',
      });
      this.mono(x + 12, y + h - 17, this.store.targetLabel(skill).slice(0, 5).toUpperCase(), {
        color: disabled ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
        fontSize: '10px',
      });
      const skillName = this.text(x + 40, y + 7, skill.name, {
        fontSize: h < 52 ? '10px' : '11px',
        fontStyle: '800',
        color: disabled ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
        wordWrap: { width: w - 48 },
      });
      skillName.setMaxLines(2);
      this.mono(x + 50, y + h - 18, displayReason, {
        color: cooldown > 0 ? '#8A5A00' : disabled ? CULLING_COLORS.mutedText : CULLING_COLORS.cobaltText,
        fontSize: '10px',
      });
      this.store.adjustedCost(caster, skill).slice(0, 4).forEach((color, costIndex) => {
        const px = x + 13 + costIndex * 12;
        this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.18);
        this.graphics.fillCircle(px, y + 38, 5.2);
        this.graphics.fillStyle(ENERGY_COLORS[color] || COLORS.selection, color === 'white' ? 0.9 : 0.98);
        this.graphics.fillCircle(px, y + 38, 4.3);
        this.mono(px, y + 34.5, ENERGY_LABELS[color] || 'X', {
          color: color === 'white' ? CULLING_COLORS.text : '#F7F4EC',
          fontSize: '8px',
        }).setOrigin(0.5, 0);
      });
      if (selected) {
        this.mono(x + w - 35, y + h - 17, 'INFO', { color: CULLING_COLORS.cobaltText, fontSize: '10px' });
      }

      this.registerHitTarget(x, y, w, h, disabled ? `Inspect disabled skill ${skill.name}` : `Skill ${skill.name}`, () => disabled ? this.store.openSkillDetail(skill.id) : this.store.selectSkill(skill.id));
    }

    renderSkillDetailSheet(frame, caster, skill) {
      const adjusted = this.store.adjustedCost(caster, skill);
      const cooldown = this.store.skillCooldown(caster, skill);
      const blocked = this.store.statusBlocksSkill(caster, skill);
      const fit = this.store.skillFit(skill, caster);
      const reason = cooldown > 0 ? `Cooldown: ${cooldown} turns` : blocked || (!fit.ok ? fit.reason : 'Available now');
      const x = frame.x + 12;
      const y = Math.max(frame.top + 110, frame.height * 0.34);
      const w = frame.width - 24;
      const h = frame.height - y + 18;

      this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.22);
      this.graphics.fillRect(frame.x, 0, frame.width, frame.height);
      drawCurrentPanel(this, x, y, w, h, {
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.gold,
        accent: CULLING_COLORS.gold,
        radius: 22,
        alpha: 0.99,
        shadowY: 0,
        shadowAlpha: 0.26,
      });

      this.buttons.push({
        x: 0,
        y: 0,
        w: frame.fullWidth,
        h: frame.fullHeight,
        label: 'Skill Detail Overlay',
        onClick: () => {},
        disabled: false,
      });

      this.mono(x + 18, y + 18, 'TECHNIQUE DETAIL / AUTHORITATIVE', { color: CULLING_COLORS.cobaltText, fontSize: '10px' });
      this.text(x + 18, y + 40, skill.name, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: '22px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
        wordWrap: { width: w - 88 },
      });
      drawCurrentButton(this, x + w - 58, y + 14, 44, 44, '×', () => this.store.closeSkillDetail(), {
        fill: CULLING_COLORS.vermilion,
        stroke: CULLING_COLORS.charcoal,
        fontSize: '18px',
        display: false,
        radius: 12,
        brush: 'red',
      });
      this.mono(x + 18, y + 94, `${titleize((skill.target_rule && skill.target_rule.kind) || 'enemy')} target`, { color: CULLING_COLORS.text, fontSize: '10px' });
      this.costPips(x + 24, y + 126, adjusted, 15);
      const classLine = (skill.classes || []).map((value) => titleize(value)).join(' / ') || 'Technique';
      const slotLine = skill.effective_skill_id ? `${classLine} / REPLACED IN ORIGINAL SLOT` : classLine;
      this.mono(x + 18, y + 151, slotLine, { color: CULLING_COLORS.cobaltText, fontSize: '10px' });
      this.graphics.fillStyle(reason === 'Available now' ? COLORS.queued : CULLING_COLORS.enemy, 0.14);
      this.graphics.fillRect(x + 18, y + 179, w - 36, 34);
      this.graphics.fillStyle(reason === 'Available now' ? COLORS.queued : CULLING_COLORS.enemy, 0.84);
      this.graphics.fillRect(x + 18, y + 179, 4, 34);
      this.mono(x + 30, y + 190, reason.toUpperCase(), { color: reason === 'Available now' ? '#357D4B' : CULLING_COLORS.redText, fontSize: '10px' });
      this.mono(x + 18, y + 238, 'EFFECT', { color: CULLING_COLORS.cobaltText, fontSize: '10px' });
      this.text(x + 18, y + 260, skill.description || this.store.effectLine(skill), {
        fontSize: '12px',
        color: CULLING_COLORS.text,
        lineSpacing: 5,
        wordWrap: { width: w - 36 },
      });
      drawCurrentButton(this, x + 18, frame.bottom - 44, w - 36, 44, 'RETURN TO BATTLEFIELD', () => this.store.closeSkillDetail(), {
        fill: CULLING_COLORS.cobalt,
        stroke: CULLING_COLORS.charcoal,
        color: CULLING_COLORS.inverseText,
        fontSize: '12px',
        display: false,
        radius: 14,
      });
    }

    renderQueueChips(frame, y) {
      const x = frame.x + 16;
      const count = this.store.actions.length;
      this.mono(x, y - 14, `QUEUE ${this.store.actions.length}/3`, {
        color: count ? '#357D4B' : CULLING_COLORS.mutedText,
        fontSize: '10px',
      });
      const me = this.store.me();
      [0, 1, 2].forEach((index) => {
        const action = this.store.actions[index];
        const slotX = x + 78 + index * 88;
        this.graphics.lineStyle(1, action ? COLORS.queued : CULLING_COLORS.charcoal, action ? 0.8 : 0.22);
        this.graphics.beginPath();
        this.graphics.moveTo(slotX, y);
        this.graphics.lineTo(slotX + 72, y);
        this.graphics.strokePath();
        this.graphics.fillStyle(action ? COLORS.queued : CULLING_COLORS.concrete, action ? 0.9 : 0.94);
        this.graphics.fillTriangle(slotX, y, slotX + 7, y - 7, slotX + 14, y);
        if (!action) {
          this.mono(slotX + 22, y - 10, `Q${index + 1}`, { color: CULLING_COLORS.mutedText, fontSize: '10px' });
          return;
        }
        const caster = me && me.team ? me.team[action.caster_slot] : null;
        const skill = caster ? this.store.skillFor(caster, action.skill_id) : null;
        this.mono(slotX + 20, y - 10, shortText(skill ? skill.name : action.skill_id, 9), { color: CULLING_COLORS.text, fontSize: '10px' });
      });
    }

    renderReplayLine(frame, y) {
      const events = this.store.recentEvents.slice(0, 1);
      if (!events.length) return;
      const event = events[0];
      const tone = eventTone(event);
      const color = tone === 'damage' ? CULLING_COLORS.redText : tone === 'heal' ? '#357D4B' : tone === 'status' ? '#6240A8' : CULLING_COLORS.text;
      const x = frame.x + 22;
      const w = frame.width - 44;
      this.graphics.fillStyle(CULLING_COLORS.ivory, 0.88);
      this.graphics.fillRect(x, y, w, 22);
      this.graphics.fillStyle(tone === 'damage' ? CULLING_COLORS.enemy : tone === 'status' ? COLORS.domain : CULLING_COLORS.cobalt, 0.82);
      this.graphics.fillRect(x, y, 3, 22);
      this.mono(x + 12, y + 6, shortText(event.message || event.type, 44), { color, fontSize: '10px' });
    }

    renderCommandDeck(frame, layout, selected) {
      const g = this.graphics;
      const x = frame.x;
      const y = layout.dockY;
      const w = frame.width;
      const h = layout.dockH;
      const contentX = frame.x + 14;

      drawCurrentPanel(this, x, y, w, h + 24, {
        fill: CULLING_COLORS.ivory,
        stroke: selected ? CULLING_COLORS.gold : CULLING_COLORS.cobalt,
        accent: selected ? CULLING_COLORS.gold : CULLING_COLORS.cobalt,
        accentEdge: false,
        radius: 22,
        alpha: 0.99,
        shadowY: -4,
        shadowAlpha: 0.18,
      });
      g.fillStyle(CULLING_COLORS.sky, 0.28);
      g.fillRoundedRect(x + 4, y + 4, w - 8, 60, 18);
      g.fillStyle(selected ? CULLING_COLORS.gold : CULLING_COLORS.cobalt, 0.82);
      g.fillTriangle(x + 42, y, x + w, y + 18, x + w, y + 36);
      g.lineStyle(2, selected ? CULLING_COLORS.gold : CULLING_COLORS.cobalt, selected ? 0.82 : 0.48);
      g.beginPath();
      g.moveTo(x + 42, y);
      g.lineTo(x + w, y + 18);
      g.strokePath();
      g.lineStyle(1, CULLING_COLORS.charcoal, 0.14);
      g.beginPath();
      g.moveTo(x + 14, y + 65);
      g.lineTo(x + w - 14, y + 65);
      g.strokePath();

      const headerY = y + 12;
      if (selected) {
        this.renderIdentitySeal(selected, contentX, headerY + 1, 44, 52);
        const selectedName = this.text(contentX + 54, headerY + 1, selected.name, {
          fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
          fontSize: '14px',
          fontStyle: '900',
          color: CULLING_COLORS.text,
          wordWrap: { width: Math.max(110, frame.width - 184) },
        });
        selectedName.setMaxLines(2);
        const skills = this.store.skillsFor(selected).slice(0, 4);
        const readyCount = skills.filter((skill) => {
          const cooldown = this.store.skillCooldown(selected, skill);
          return cooldown <= 0 && !this.store.statusBlocksSkill(selected, skill) && this.store.skillFit(skill, selected).ok && !this.store.queuedSlots().has(Number(this.store.selectedCasterSlot)) && !this.store.controlsLocked();
        }).length;
        const instruction = readyCount
          ? (this.store.selectedSkillId ? 'MARK A LEGAL TARGET' : 'SELECT A TECHNIQUE')
          : 'NO TECHNIQUE ONLINE';
        this.mono(contentX + 55, headerY + 32, instruction, {
          color: this.store.selectedSkillId ? '#007C84' : CULLING_COLORS.cobaltText,
          fontSize: '10px',
          fontStyle: '700',
        });
        this.mono(contentX + 55, headerY + 47, `READY ${readyCount}/${skills.length}`, {
          color: readyCount ? '#357D4B' : CULLING_COLORS.redText,
          fontSize: '10px',
        });
        this.mono(frame.x + frame.width - 96, headerY + 5, `ORDER ${this.store.actions.length + 1}`, {
          color: CULLING_COLORS.mutedText,
          fontSize: '10px',
        });

        const cardW = (frame.width - 38) / 2;
        const cardH = layout.compressed ? 60 : layout.compact ? 62 : 64;
        const cardGap = layout.compact ? 6 : 8;
        const gridY = y + (layout.compressed ? 70 : 74);
        skills.forEach((skill, index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          this.renderSkillButton(skill, selected, index, contentX + col * (cardW + 10), gridY + row * (cardH + cardGap), cardW, cardH);
        });
      } else {
        this.mono(contentX, headerY + 3, 'NO ACTIVE FIGHTER', { color: CULLING_COLORS.cobaltText, fontSize: '10px' });
        this.text(contentX, headerY + 21, 'Choose a combatant', { fontSize: '17px', fontStyle: '800', color: CULLING_COLORS.text });
        this.mono(contentX, headerY + 47, 'TAP ONE OF THE THREE ALLY CARDS', { color: CULLING_COLORS.mutedText, fontSize: '10px' });
      }

      const buttonY = frame.bottom - 44;
      drawCurrentButton(this, contentX, buttonY, 82, 44, 'CLEAR QUEUE', () => this.store.cancelQueue(), {
        fill: CULLING_COLORS.concrete,
        stroke: CULLING_COLORS.charcoal,
        color: CULLING_COLORS.text,
        fontSize: '10px',
        display: false,
        radius: 12,
        disabled: !this.store.actions.length || this.store.controlsLocked(),
      });
      drawCurrentButton(this, contentX + 90, buttonY, 62, 44, 'PASS', () => this.store.endTurn(), {
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.cobalt,
        color: CULLING_COLORS.cobaltText,
        fontSize: '10px',
        display: false,
        radius: 12,
        disabled: this.store.controlsLocked(),
      });
      drawCurrentButton(this, frame.x + frame.width - 14 - 128, buttonY, 128, 44, this.store.queueSubmitting ? 'RESOLVING' : `REVIEW ${this.store.actions.length}/3`, () => this.store.openQueueReview(), {
        fill: this.store.actions.length ? CULLING_COLORS.cobalt : CULLING_COLORS.concrete,
        stroke: this.store.actions.length ? CULLING_COLORS.charcoal : CULLING_COLORS.muted,
        color: this.store.actions.length ? CULLING_COLORS.inverseText : CULLING_COLORS.mutedText,
        fontSize: '11px',
        display: false,
        radius: 12,
        disabled: !this.store.actions.length || this.store.controlsLocked(),
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.renderWorld(frame);
      const state = this.store.state;
      if (!state) {
        this.topBar(frame, 'Opening Domain', () => this.store.resetToLobby());
        const waitingLabel = this.store.connectionState === 'disconnected'
          ? 'Reconnecting…'
          : 'Waiting for battle state from server...';
        this.mono(frame.x + frame.gutter, 130, waitingLabel, { color: this.store.connectionState === 'disconnected' ? CULLING_COLORS.redText : CULLING_COLORS.text });
        this.toast(frame, { theme: 'light' });
        return;
      }

      const me = this.store.me();
      const foe = this.store.foe();
      const selected = me && me.team ? me.team[this.store.selectedCasterSlot] : null;
      const layout = this.combatLayout(frame);
      this.playbackTargets = {};
      this.renderTopHud(frame, state, me);

      if (this.store.detailSkillId && selected) {
        const detailSkill = this.store.skillFor(selected, this.store.detailSkillId);
        if (detailSkill) {
          this.renderSkillDetailSheet(frame, selected, detailSkill);
          this.toast(frame, { theme: 'light' });
          return;
        }
        this.store.detailSkillId = null;
      }

      drawCurrentButton(this, frame.x + frame.width - 106, frame.top + 72, 92, 44, 'TRANSMUTE', () => this.store.convertEnergy(), {
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.cyan,
        color: '#007C84',
        fontSize: '10px',
        display: false,
        radius: 12,
        disabled: this.store.controlsLocked() || !!this.store.actions.length || !!(me && me.energy_converted_this_turn),
      });

      const targetStagePrompt = this.store.targetingStage === 'alternate'
        ? 'Choose the alternate redirect target'
        : this.store.targetingStage === 'venom_secondary'
          ? 'Choose the secondary enemy target'
          : this.store.targetingStage === 'venom_primary'
            ? 'Choose the poisoned primary target'
            : 'Mark a highlighted legal target';
      const prompt = state.winner_id
        ? 'Battle finished'
        : this.store.queueReviewOpen
          ? 'Review the order of resolution'
          : this.store.controlsLocked()
            ? 'Hold position — hostile action resolving'
            : this.store.selectedSkillId
              ? targetStagePrompt
              : this.store.selectedCasterSlot !== null
                ? 'Choose technique'
                : 'Select one of your combatants';

      this.renderFighterLane(foe && foe.team, 'enemy', frame, layout);
      if (!this.store.queueReviewOpen) {
        this.renderBattlefield(frame, layout, prompt);
        this.renderFighterLane(me && me.team, 'mine', frame, layout);
        this.renderCommandDeck(frame, layout, selected);
      }
      this.renderQueueReviewSheet(frame);
      this.toast(frame, { theme: 'light' });
      this.playEvents(frame);
    }
  }
