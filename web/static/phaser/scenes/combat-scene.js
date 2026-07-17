import { COLORS, ENERGY_COLORS, TOKEN_TYPE } from '../core/runtime-config.js?v=22';
import { clamp, initials, shortText, titleize } from '../core/text.js?v=22';
import { eventTone } from '../fx/event-metrics.js?v=22';
import { CombatQueueReviewScene } from './combat-queue-review-scene.js?v=22';

const WORLD_KEY = 'combat-underpass-night';
const LOCATION_LINE = 'KASUMIGAOKA MUNICIPAL UNDERPASS';

export class CombatScene extends CombatQueueReviewScene {
    constructor() {
      super('CombatScene');
    }

    combatLayout(frame) {
      const compact = frame.height < 830;
      const dockH = clamp(Math.round(frame.height * 0.34), compact ? 270 : 286, 304);
      const dockY = frame.bottom - dockH;
      const cardH = compact ? 108 : frame.height > 900 ? 120 : 112;
      const enemyY = frame.top + (compact ? 122 : 130);
      const fieldTop = enemyY + cardH + 12;
      // The tactical-directive panel drawn at fieldTop is ~43px tall; at
      // short viewports dockH clamps to its minimum and dockY-cardH-28
      // alone can land above that, overlapping the ally lane into it.
      const allyY = Math.max(fieldTop + 46, dockY - cardH - 28);
      const fieldBottom = allyY - 12;
      const contentX = frame.x + 14;
      const contentW = frame.width - 28;
      const gap = 8;
      const cardW = (contentW - gap * 2) / 3;
      return {
        compact,
        dockH,
        dockY,
        cardH,
        enemyY,
        allyY,
        fieldTop,
        fieldBottom,
        fieldH: Math.max(116, fieldBottom - fieldTop),
        contentX,
        contentW,
        gap,
        cardW,
      };
    }

    renderWorld(frame) {
      if (this.textures.exists(WORLD_KEY)) {
        const world = this.add.image(frame.x + frame.width / 2, frame.height / 2, WORLD_KEY);
        world.setDisplaySize(frame.width, frame.height);
        world.setDepth(-30);
        this.nodes.push(world);
      } else {
        this.graphics.fillGradientStyle(0x07131c, 0x0b1820, 0x03070b, 0x020406, 1);
        this.graphics.fillRect(frame.x, 0, frame.width, frame.height);
      }

      const g = this.graphics;
      // Local grading preserves the environment instead of burying it beneath a global panel.
      // Canvas mode does not reliably preserve per-corner gradient alpha.
      // Use explicit translucent local grades so the authored environment remains visible.
      g.fillStyle(0x020507, 0.14);
      g.fillRect(frame.x, 0, frame.width, frame.height);
      g.fillStyle(0x071016, 0.12);
      g.fillRect(frame.x, 0, frame.width, 94);
      g.fillStyle(0x020506, 0.24);
      g.fillRect(frame.x, frame.height - 332, frame.width, 332);

      // Rain and cursed residue remain restrained and spatially tied to the location.
      for (let index = 0; index < 22; index += 1) {
        const x = frame.x + 10 + ((index * 47) % Math.max(40, frame.width - 20));
        const y = 66 + ((index * 83) % Math.max(120, frame.height - 160));
        const length = 14 + (index % 4) * 7;
        g.lineStyle(index % 5 === 0 ? 1.4 : 1, 0xb7d5dc, index % 5 === 0 ? 0.18 : 0.09);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 4, y + length);
        g.strokePath();
      }
      [0.22, 0.48, 0.73].forEach((progress, index) => {
        const cx = frame.x + frame.width * (0.28 + progress * 0.42);
        const cy = frame.height * (0.26 + progress * 0.43);
        g.fillStyle(COLORS.domain, 0.028 + index * 0.012);
        g.fillCircle(cx, cy, 58 + index * 34);
      });
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

      g.fillStyle(0x05090d, 0.78);
      g.fillPoints([
        { x, y },
        { x: x + w - 48, y },
        { x: x + w, y: y + 22 },
        { x: x + w, y: y + 68 },
        { x: x + 18, y: y + 68 },
        { x, y: y + 50 },
      ], true);
      g.fillStyle(mine ? COLORS.selection : COLORS.enemy, 0.12);
      g.fillTriangle(x, y, x + 122, y, x, y + 58);
      g.lineStyle(1.5, mine ? COLORS.selection : COLORS.enemy, 0.52);
      g.strokePoints([
        { x, y },
        { x: x + w - 48, y },
        { x: x + w, y: y + 22 },
        { x: x + w, y: y + 68 },
        { x: x + 18, y: y + 68 },
        { x, y: y + 50 },
      ], true);
      g.lineStyle(1, 0xd8c28a, 0.18);
      g.beginPath();
      g.moveTo(x + 12, y + 21);
      g.lineTo(x + w - 66, y + 21);
      g.strokePath();

      this.mono(x + 12, y + 6, LOCATION_LINE, {
        color: COLORS.paperText,
        fontSize: '10px',
        fontStyle: '700',
      });
      this.text(x + 12, y + 27, `Turn ${state.turn_number || 1}`, {
        fontFamily: TOKEN_TYPE.display || 'Georgia, serif',
        fontSize: '20px',
        fontStyle: '700',
      });
      this.mono(x + 14, y + 52, statusLabel, {
        color: connectionWarning ? '#ffb3b3' : mine ? COLORS.paperText : '#f1a0a0',
        fontSize: '10px',
        fontStyle: '700',
      });

      this.renderEnergyMeter(x + w - 142, y + 35, me && me.energy);
      this.mono(x + 151, y + 53, `QUEUE ${queueCount}/3`, {
        color: queueCount ? '#b7dbc0' : COLORS.dim,
        fontSize: '10px',
      });
      for (let index = 0; index < 3; index += 1) {
        const active = index < queueCount;
        const px = x + 217 + index * 14;
        g.fillStyle(active ? COLORS.queued : COLORS.surfaceRaised, active ? 0.92 : 0.62);
        g.fillTriangle(px, y + 54, px + 6, y + 48, px + 12, y + 54);
        g.lineStyle(1, active ? COLORS.queued : COLORS.line, active ? 0.8 : 0.42);
        g.strokeTriangle(px, y + 54, px + 6, y + 48, px + 12, y + 54);
      }

      this.button(x + w - 54, y + 16, 44, 44, 'II', () => this.store.resetToLobby(), {
        fill: 0x0d1114,
        stroke: COLORS.enemy,
        fontSize: '11px',
        mono: true,
        radius: 5,
        strokeAlpha: 0.72,
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
        this.graphics.fillStyle(0x030507, 0.86);
        this.graphics.fillCircle(cx, y, 9);
        this.graphics.fillStyle(ENERGY_COLORS[slot.color], count ? 0.94 : 0.14);
        this.graphics.fillCircle(cx, y, 6.3);
        this.graphics.lineStyle(1, slot.color === 'white' ? COLORS.talismanPaper : ENERGY_COLORS[slot.color], count ? 0.82 : 0.34);
        this.graphics.strokeCircle(cx, y, 8.5);
        this.mono(cx, y - 3.5, slot.label, {
          color: slot.color === 'white' ? '#08080a' : COLORS.text,
          fontSize: '10px',
        }).setOrigin(0.5, 0);
        this.mono(cx, y + 11, String(count), { color: COLORS.text, fontSize: '10px' }).setOrigin(0.5, 0);
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
        this.graphics.fillStyle(0x071016, dead ? 0.48 : 0.9);
        this.graphics.fillRect(x, y, w, h);
        this.graphics.fillStyle(tone, dead ? 0.05 : 0.18);
        this.graphics.fillTriangle(x, y, x + w, y, x, y + h);
        this.graphics.fillStyle(0x020508, dead ? 0.26 : 0.78);
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
          fontFamily: TOKEN_TYPE.display || 'Georgia, serif',
          fontSize: `${Math.max(14, Math.round(w * 0.18))}px`,
          fontStyle: '700',
          color: dead ? COLORS.dim : COLORS.text,
        }).setOrigin(1, 0);
      }
    }

    renderIdentitySeal(character, x, y, w, h) {
      const tone = this.store.assets.toneFor(character && character.character_id);
      const mark = initials((character && character.name) || '?');
      this.graphics.fillStyle(0x05090c, 0.94);
      this.graphics.fillPoints([
        { x: x + 7, y },
        { x: x + w, y },
        { x: x + w, y: y + h - 7 },
        { x: x + w - 7, y: y + h },
        { x, y: y + h },
        { x, y: y + 7 },
      ], true);
      this.graphics.fillStyle(tone, 0.22);
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
        fontFamily: TOKEN_TYPE.display || 'Georgia, serif',
        fontSize: '17px',
        fontStyle: '700',
        color: COLORS.text,
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
      const baseTone = side === 'enemy' ? COLORS.enemy : COLORS.ally;
      const tone = targetable
        ? COLORS.target
        : protectedTarget
          ? COLORS.protected
          : selected
            ? COLORS.selection
            : queuedIndex >= 0
              ? COLORS.queued
              : baseTone;
      const portraitH = h - 35;
      const cx = x + w / 2;
      const cy = y + portraitH / 2;
      const playerId = side === 'mine' ? store.mineId() : store.enemyId();
      if (playerId) {
        this.playbackTargets = this.playbackTargets || {};
        this.playbackTargets[`${playerId}:${slot}`] = { x: cx, y: cy, side, slot, size: Math.min(w, portraitH), tone };
      }

      // World-anchored dossier plate: hard cuts, a single local scrim, no floating circle.
      this.graphics.fillStyle(0x030609, targetable || selected ? 0.34 : 0.18);
      this.graphics.fillPoints([
        { x: x + 7, y },
        { x: x + w, y },
        { x: x + w, y: y + h - 9 },
        { x: x + w - 9, y: y + h },
        { x, y: y + h },
        { x, y: y + 7 },
      ], true);
      this.renderPortraitPlate(character, x + 4, y + 4, w - 8, portraitH - 5, { alpha: dead ? 0.3 : targetable ? 1 : 0.96 });
      this.graphics.fillStyle(0x020405, 0.72);
      this.graphics.fillRect(x + 4, y + portraitH - 31, w - 8, 30);
      this.graphics.fillStyle(0x030609, 0.95);
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
      const hpTone = hpPct <= 0.3 ? COLORS.enemy : hpPct <= 0.6 ? COLORS.selection : COLORS.queued;
      const barX = x + 7;
      const barY = y + h - 13;
      const barW = w - 14;
      this.graphics.fillStyle(0x020405, 0.96);
      this.graphics.fillRect(barX, barY, barW, 5);
      this.graphics.fillStyle(hpTone, dead ? 0.28 : 0.96);
      this.graphics.fillRect(barX, barY, barW * hpPct, 5);

      const fighterName = (character && character.name) || 'Down';
      const fighterNameNode = this.text(x + 7, y + portraitH - 28, fighterName, {
        fontSize: w < 110 ? '9px' : '10px',
        fontStyle: '800',
        color: dead ? COLORS.dim : COLORS.text,
        wordWrap: { width: w - 14 },
      });
      fighterNameNode.setMaxLines(2);
      this.mono(x + 7, y + portraitH + 4, dead ? 'DOWN' : `${hp}/${maxHp}`, {
        color: dead ? COLORS.dim : COLORS.paperText,
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
          color: protectedTarget ? COLORS.text : '#07090a',
          fontSize: '10px',
          fontStyle: '700',
        });
      }

      if (targetable) {
        const bracket = 12;
        const pad = 4;
        this.graphics.lineStyle(2, COLORS.target, 0.94);
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
        const sx = x + w - 9 - index * 14;
        this.graphics.fillStyle(COLORS.domain, 0.86);
        this.graphics.fillRect(sx - 5, y + 7, 10, 10);
        this.mono(sx, y + 7.5, shortText(status.name || status.id, 1).toUpperCase(), {
          color: '#ffffff',
          fontSize: '10px',
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
      const tone = side === 'enemy' ? COLORS.enemy : COLORS.ally;
      this.mono(layout.contentX + 2, y - 20, label, {
        color: side === 'enemy' ? '#e9a0a0' : '#9fe0d4',
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
      g.fillStyle(0x020507, 0.58);
      g.fillPoints([
        { x: centerX - 126, y: layout.fieldTop + 7 },
        { x: centerX + 108, y: layout.fieldTop + 7 },
        { x: centerX + 126, y: layout.fieldTop + 25 },
        { x: centerX + 110, y: layout.fieldTop + 43 },
        { x: centerX - 126, y: layout.fieldTop + 43 },
      ], true);
      g.lineStyle(1, selectedSkill ? COLORS.target : COLORS.talismanDim, selectedSkill ? 0.72 : 0.34);
      g.strokePoints([
        { x: centerX - 126, y: layout.fieldTop + 7 },
        { x: centerX + 108, y: layout.fieldTop + 7 },
        { x: centerX + 126, y: layout.fieldTop + 25 },
        { x: centerX + 110, y: layout.fieldTop + 43 },
        { x: centerX - 126, y: layout.fieldTop + 43 },
      ], true);
      this.mono(centerX, layout.fieldTop + 15, selectedSkill ? 'TARGET ACQUISITION' : 'TACTICAL DIRECTIVE', {
        color: selectedSkill ? '#9fe0d4' : COLORS.paperText,
        fontSize: '10px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
      this.text(centerX, layout.fieldTop + 27, prompt, {
        fontSize: layout.compact ? '12px' : '13px',
        fontStyle: '800',
        align: 'center',
        wordWrap: { width: 226 },
      }).setOrigin(0.5, 0);

      // Cursed cartography and selection line connect the UI to the environment.
      g.lineStyle(1, COLORS.domain, 0.18);
      g.strokeCircle(centerX, centerY, Math.min(62, layout.fieldH * 0.32));
      g.lineStyle(1, COLORS.talismanDim, 0.19);
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
        g.lineStyle(2, COLORS.target, 0.38);
        g.beginPath();
        g.moveTo(fromX, fromY);
        g.lineTo(centerX, centerY + 22);
        g.strokePath();
        g.fillStyle(COLORS.target, 0.12);
        g.fillCircle(centerX, centerY, 28);
        g.lineStyle(1.5, COLORS.target, 0.68);
        g.strokeCircle(centerX, centerY, 34);
      }

      this.renderReplayLine(frame, layout.fieldBottom - 62);
      this.renderQueueChips(frame, layout.fieldBottom - 30);
    }

    renderSkillButton(skill, caster, index, x, y, w, h) {
      const cooldown = this.store.skillCooldown(caster, skill);
      const fit = this.store.skillFit(skill, caster);
      const ruleReason = this.store.statusBlocksSkill(caster, skill);
      const disabled = cooldown > 0 || !!ruleReason || !fit.ok || this.store.queuedSlots().has(Number(this.store.selectedCasterSlot)) || this.store.controlsLocked();
      const selected = this.store.selectedSkillId === skill.id;
      const tone = selected ? COLORS.selection : (ENERGY_COLORS[(this.store.adjustedCost(caster, skill) || [])[0]] || COLORS.talismanDim);
      const reasonLimit = w < 170 ? 15 : 18;
      const reason = cooldown > 0 ? `CD ${cooldown}` : ruleReason ? shortText(ruleReason, reasonLimit) : fit.ok ? shortText(this.store.effectLine(skill), reasonLimit) : shortText(fit.reason, reasonLimit);

      this.graphics.fillStyle(0x080c0f, disabled ? 0.48 : 0.82);
      this.graphics.fillPoints([
        { x: x + 7, y },
        { x: x + w, y },
        { x: x + w, y: y + h - 7 },
        { x: x + w - 7, y: y + h },
        { x, y: y + h },
        { x, y: y + 7 },
      ], true);
      this.graphics.fillStyle(tone, selected ? 0.22 : disabled ? 0.04 : 0.085);
      this.graphics.fillTriangle(x, y, x + 54, y, x, y + h);
      this.graphics.fillStyle(tone, disabled ? 0.22 : selected ? 0.96 : 0.62);
      this.graphics.fillRect(x, y, selected ? 5 : 3, h);
      this.graphics.lineStyle(selected ? 2 : 1, tone, disabled ? 0.3 : selected ? 0.9 : 0.56);
      this.graphics.strokePoints([
        { x: x + 7, y },
        { x: x + w, y },
        { x: x + w, y: y + h - 7 },
        { x: x + w - 7, y: y + h },
        { x, y: y + h },
        { x, y: y + 7 },
      ], true);

      this.mono(x + 12, y + 8, `0${index + 1}`, {
        color: selected ? COLORS.paperText : COLORS.muted,
        fontSize: '10px',
        fontStyle: '700',
      });
      this.mono(x + 12, y + h - 17, this.store.targetLabel(skill).slice(0, 5).toUpperCase(), {
        color: disabled ? COLORS.dim : COLORS.text,
        fontSize: '10px',
      });
      const skillName = this.text(x + 40, y + 7, skill.name, {
        fontSize: h < 52 ? '10px' : '11px',
        fontStyle: '800',
        wordWrap: { width: w - 48 },
      });
      skillName.setMaxLines(2);
      this.mono(x + 50, y + h - 18, reason, {
        color: cooldown > 0 ? '#e6b84a' : disabled ? COLORS.dim : COLORS.paperText,
        fontSize: '10px',
      });
      this.store.adjustedCost(caster, skill).slice(0, 4).forEach((color, costIndex) => {
        const px = x + 13 + costIndex * 10;
        this.graphics.fillStyle(0x020405, 0.9);
        this.graphics.fillCircle(px, y + 38, 4.5);
        this.graphics.fillStyle(ENERGY_COLORS[color] || COLORS.selection, color === 'white' ? 0.9 : 0.98);
        this.graphics.fillCircle(px, y + 38, 3.1);
      });
      if (selected) {
        this.mono(x + w - 35, y + h - 17, 'INFO', { color: COLORS.paperText, fontSize: '10px' });
      }

      this.buttons.push({
        x,
        y,
        w,
        h,
        label: disabled ? `Inspect disabled skill ${skill.name}` : `Skill ${skill.name}`,
        disabled: false,
        onClick: () => disabled ? this.store.openSkillDetail(skill.id) : this.store.selectSkill(skill.id),
      });
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

      this.graphics.fillStyle(0x010305, 0.5);
      this.graphics.fillRect(frame.x, 0, frame.width, frame.height);
      this.graphics.fillStyle(0x080c0f, 0.97);
      this.graphics.fillPoints([
        { x: x + 18, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
        { x, y: y + 18 },
      ], true);
      this.graphics.fillStyle(COLORS.selection, 0.12);
      this.graphics.fillTriangle(x + 18, y, x + 178, y, x, y + 168);
      this.graphics.lineStyle(2, COLORS.selection, 0.68);
      this.graphics.strokePoints([
        { x: x + 18, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
        { x, y: y + 18 },
      ], true);

      this.buttons.push({
        x: 0,
        y: 0,
        w: frame.fullWidth,
        h: frame.fullHeight,
        label: 'Skill Detail Overlay',
        onClick: () => {},
        disabled: false,
      });

      this.mono(x + 18, y + 18, 'TECHNIQUE DOSSIER / AUTHORITATIVE', { color: COLORS.paperText, fontSize: '10px' });
      this.text(x + 18, y + 40, skill.name, {
        fontFamily: TOKEN_TYPE.display || 'Georgia, serif',
        fontSize: '22px',
        fontStyle: '700',
        wordWrap: { width: w - 88 },
      });
      this.iconButton(x + w - 58, y + 14, 44, 44, '×', () => this.store.closeSkillDetail(), { stroke: COLORS.enemy, fontSize: '14px', radius: 5 });
      this.mono(x + 18, y + 94, `${titleize((skill.target_rule && skill.target_rule.kind) || 'enemy')} target`, { color: COLORS.text, fontSize: '10px' });
      this.costPips(x + 24, y + 126, adjusted, 15);
      const classLine = (skill.classes || []).map((value) => titleize(value)).join(' / ') || 'Technique';
      this.mono(x + 18, y + 151, classLine, { color: COLORS.paperText, fontSize: '10px' });
      this.graphics.fillStyle(reason === 'Available now' ? COLORS.queued : COLORS.enemy, 0.14);
      this.graphics.fillRect(x + 18, y + 179, w - 36, 34);
      this.graphics.fillStyle(reason === 'Available now' ? COLORS.queued : COLORS.enemy, 0.84);
      this.graphics.fillRect(x + 18, y + 179, 4, 34);
      this.mono(x + 30, y + 190, reason.toUpperCase(), { color: reason === 'Available now' ? '#b7dbc0' : '#f1a0a0', fontSize: '10px' });
      this.mono(x + 18, y + 238, 'EFFECT', { color: COLORS.paperText, fontSize: '10px' });
      this.text(x + 18, y + 260, skill.description || this.store.effectLine(skill), {
        fontSize: '12px',
        color: COLORS.text,
        lineSpacing: 5,
        wordWrap: { width: w - 36 },
      });
      this.button(x + 18, frame.bottom - 44, w - 36, 44, 'Return to Battlefield', () => this.store.closeSkillDetail(), {
        fill: COLORS.selection,
        gradientTop: COLORS.talismanDim,
        stroke: COLORS.talismanPaper,
        color: '#08080a',
        fontSize: '10px',
        radius: 5,
      });
    }

    renderQueueChips(frame, y) {
      const x = frame.x + 16;
      const count = this.store.actions.length;
      this.mono(x, y - 14, `QUEUE ${this.store.actions.length}/3`, {
        color: count ? '#b7dbc0' : COLORS.dim,
        fontSize: '10px',
      });
      const me = this.store.me();
      [0, 1, 2].forEach((index) => {
        const action = this.store.actions[index];
        const slotX = x + 78 + index * 88;
        this.graphics.lineStyle(1, action ? COLORS.queued : COLORS.line, action ? 0.8 : 0.36);
        this.graphics.beginPath();
        this.graphics.moveTo(slotX, y);
        this.graphics.lineTo(slotX + 72, y);
        this.graphics.strokePath();
        this.graphics.fillStyle(action ? COLORS.queued : COLORS.surfaceRaised, action ? 0.9 : 0.54);
        this.graphics.fillTriangle(slotX, y, slotX + 7, y - 7, slotX + 14, y);
        if (!action) {
          this.mono(slotX + 22, y - 10, `Q${index + 1}`, { color: COLORS.dim, fontSize: '10px' });
          return;
        }
        const caster = me && me.team ? me.team[action.caster_slot] : null;
        const skill = caster ? this.store.skillFor(caster, action.skill_id) : null;
        this.mono(slotX + 20, y - 10, shortText(skill ? skill.name : action.skill_id, 9), { color: COLORS.text, fontSize: '10px' });
      });
    }

    renderReplayLine(frame, y) {
      const events = this.store.recentEvents.slice(0, 1);
      if (!events.length) return;
      const event = events[0];
      const tone = eventTone(event);
      const color = tone === 'damage' ? '#f1a0a0' : tone === 'heal' ? '#b7dbc0' : tone === 'status' ? '#cbbdff' : COLORS.text;
      const x = frame.x + 22;
      const w = frame.width - 44;
      this.graphics.fillStyle(0x020507, 0.62);
      this.graphics.fillRect(x, y, w, 22);
      this.graphics.fillStyle(tone === 'damage' ? COLORS.enemy : tone === 'status' ? COLORS.domain : COLORS.talismanDim, 0.82);
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

      g.fillStyle(0x05080a, 0.94);
      g.fillPoints([
        { x: x + 42, y },
        { x: x + w, y: y + 18 },
        { x: x + w, y: y + h },
        { x, y: y + h },
        { x, y: y + 24 },
      ], true);
      g.fillStyle(0x1a2530, 0.34);
      g.fillTriangle(x + 42, y, x + w, y + 18, x + w, y + 62);
      g.lineStyle(2, selected ? COLORS.selection : COLORS.talismanDim, selected ? 0.72 : 0.38);
      g.beginPath();
      g.moveTo(x + 42, y);
      g.lineTo(x + w, y + 18);
      g.strokePath();
      g.lineStyle(1, 0xd8c28a, 0.14);
      g.beginPath();
      g.moveTo(x + 14, y + 65);
      g.lineTo(x + w - 14, y + 65);
      g.strokePath();

      const headerY = y + 12;
      if (selected) {
        this.renderIdentitySeal(selected, contentX, headerY + 1, 44, 52);
        this.text(contentX + 54, headerY + 1, shortText(selected.name, 24), {
          fontFamily: TOKEN_TYPE.display || 'Georgia, serif',
          fontSize: '16px',
          fontStyle: '700',
        });
        const skills = this.store.skillsFor(selected).slice(0, 4);
        const readyCount = skills.filter((skill) => {
          const cooldown = this.store.skillCooldown(selected, skill);
          return cooldown <= 0 && !this.store.statusBlocksSkill(selected, skill) && this.store.skillFit(skill, selected).ok && !this.store.queuedSlots().has(Number(this.store.selectedCasterSlot)) && !this.store.controlsLocked();
        }).length;
        const instruction = readyCount
          ? (this.store.selectedSkillId ? 'MARK A LEGAL TARGET' : 'SELECT A TECHNIQUE')
          : 'NO TECHNIQUE ONLINE';
        this.mono(contentX + 55, headerY + 26, instruction, {
          color: this.store.selectedSkillId ? '#9fe0d4' : COLORS.paperText,
          fontSize: '10px',
          fontStyle: '700',
        });
        this.mono(contentX + 55, headerY + 42, `READY ${readyCount}/${skills.length}`, {
          color: readyCount ? '#b7dbc0' : '#f1a0a0',
          fontSize: '10px',
        });
        this.mono(frame.x + frame.width - 96, headerY + 5, `ORDER ${this.store.actions.length + 1}`, {
          color: COLORS.muted,
          fontSize: '10px',
        });

        const cardW = (frame.width - 38) / 2;
        const cardH = 64;
        const gridY = y + 74;
        skills.forEach((skill, index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          this.renderSkillButton(skill, selected, index, contentX + col * (cardW + 10), gridY + row * (cardH + 8), cardW, cardH);
        });
      } else {
        this.mono(contentX, headerY + 3, 'NO ACTIVE SIGNATURE', { color: COLORS.paperText, fontSize: '10px' });
        this.text(contentX, headerY + 21, 'Choose a combatant', { fontSize: '17px', fontStyle: '800' });
        this.mono(contentX, headerY + 47, 'TAP ONE OF THE THREE ALLY PLATES', { color: COLORS.muted, fontSize: '10px' });
      }

      const buttonY = frame.bottom - 44;
      this.button(contentX, buttonY, 82, 44, 'Withdraw', () => this.store.cancelQueue(), {
        fill: 0x0a0e11,
        stroke: COLORS.line,
        mono: true,
        fontSize: '10px',
        radius: 5,
        disabled: !this.store.actions.length || this.store.controlsLocked(),
      });
      this.button(contentX + 90, buttonY, 62, 44, 'Pass', () => this.store.endTurn(), {
        fill: 0x0a0e11,
        stroke: COLORS.line,
        mono: true,
        fontSize: '10px',
        radius: 5,
        disabled: this.store.controlsLocked(),
      });
      this.button(frame.x + frame.width - 14 - 128, buttonY, 128, 44, this.store.queueSubmitting ? 'Resolving' : `Review ${this.store.actions.length}/3`, () => this.store.openQueueReview(), {
        fill: this.store.actions.length ? COLORS.selection : 0x0a0e11,
        gradientTop: this.store.actions.length ? COLORS.talismanDim : 0x0a0e11,
        stroke: this.store.actions.length ? COLORS.talismanPaper : COLORS.line,
        color: this.store.actions.length ? '#08080a' : COLORS.dim,
        mono: true,
        fontSize: '10px',
        radius: 5,
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
        this.mono(frame.x + frame.gutter, 130, waitingLabel, { color: this.store.connectionState === 'disconnected' ? COLORS.enemy : COLORS.text });
        this.toast(frame);
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
          this.toast(frame);
          return;
        }
        this.store.detailSkillId = null;
      }

      this.button(frame.x + frame.width - 106, frame.top + 72, 92, 44, 'Transmute', () => this.store.convertEnergy(), {
        fill: 0x071417,
        stroke: COLORS.ally,
        color: '#bcebe2',
        fontSize: '10px',
        mono: true,
        radius: 4,
        disabled: this.store.controlsLocked() || !!this.store.actions.length || !!(me && me.energy_converted_this_turn),
      });

      const prompt = state.winner_id
        ? 'Battle finished'
        : this.store.queueReviewOpen
          ? 'Review the order of resolution'
          : this.store.controlsLocked()
            ? 'Hold position — hostile action resolving'
            : this.store.selectedSkillId
              ? 'Mark a highlighted legal target'
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
      this.toast(frame);
      this.playEvents(frame);
    }
  }
