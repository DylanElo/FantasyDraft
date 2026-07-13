import { COLORS, ENERGY_COLORS } from '../core/runtime-config.js?v=17';
import { clamp, shortText, titleize } from '../core/text.js?v=17';
import { eventTone } from '../fx/event-metrics.js?v=17';
import { CombatQueueReviewScene } from './combat-queue-review-scene.js?v=17';

export class CombatScene extends CombatQueueReviewScene {
    constructor() {
      super('CombatScene');
    }

    renderTopHud(frame, state, me) {
      const x = frame.x + frame.gutter;
      const g = this.graphics;
      const hud = this.layout.topHud();
      g.fillStyle(COLORS.surfaceDeep, 0.96);
      g.fillRoundedRect(hud.x, hud.y, hud.width, hud.height, 18);
      g.fillStyle(this.store.isMyTurn() ? COLORS.talismanDim : COLORS.enemy, this.store.isMyTurn() ? 0.1 : 0.12);
      g.fillRoundedRect(hud.x + 3, hud.y + 3, hud.width - 6, 17, 14);
      g.lineStyle(2, this.store.isMyTurn() ? COLORS.selection : COLORS.enemy, 0.56);
      g.strokeRoundedRect(hud.x, hud.y, hud.width, hud.height, 18);
      g.lineStyle(1, COLORS.talismanDim, 0.22);
      g.beginPath();
      g.moveTo(hud.x + 14, hud.y + hud.height - 10);
      g.lineTo(hud.x + hud.width - 14, hud.y + hud.height - 10);
      g.strokePath();
      this.mono(x, 23, `TURN ${state.turn_number || 1}`, { color: COLORS.paperText, fontSize: '10px' });
      this.text(x, 37, this.store.isMyTurn() ? 'Your Domain' : 'Enemy Domain', {
        fontFamily: 'Cinzel, Inter, serif',
        fontSize: '19px',
        fontStyle: '900',
      });
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
            ? 'REVIEW'
            : this.store.controlsLocked()
              ? 'LOCKED'
              : queueCount
                ? 'PLANNING'
                : 'READY');
      const badgeFill = connectionWarning ? COLORS.enemy : queueCount ? COLORS.queued : COLORS.panel2;
      const badgeAlpha = connectionWarning ? 0.9 : queueCount ? 0.86 : 0.72;
      this.graphics.fillStyle(badgeFill, badgeAlpha);
      this.graphics.fillRoundedRect(x + 144, 43, 86, 20, 10);
      this.graphics.lineStyle(1, badgeFill, connectionWarning ? 0.95 : queueCount ? 0.78 : 0.5);
      this.graphics.strokeRoundedRect(x + 144, 43, 86, 20, 10);
      this.mono(x + 187, 48, `QUEUE ${queueCount}/3`, {
        color: queueCount ? '#d8f0dc' : COLORS.muted,
        fontSize: '7px',
      }).setOrigin(0.5, 0);
      this.mono(x + 144, 63, statusLabel, {
        color: connectionWarning ? '#ffe0e0' : statusLabel === 'READY' ? '#b7dbc0' : COLORS.paperText,
        fontSize: '7px',
      });
      this.renderEnergyMeter(frame.x + frame.width - 150, 24, me && me.energy);
      this.button(frame.x + frame.width - frame.gutter - 40, 26, 40, 32, 'Exit', () => this.store.resetToLobby(), {
        fill: COLORS.surfaceRaised,
        stroke: COLORS.enemy,
        fontSize: '9px',
        mono: true,
        radius: 16,
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
        const cx = x + index * 27;
        this.graphics.fillStyle(COLORS.inkBlack, 0.9);
        this.graphics.fillCircle(cx, y, 11);
        this.graphics.fillStyle(ENERGY_COLORS[slot.color], count ? 0.95 : 0.14);
        this.graphics.fillCircle(cx, y, 8);
        this.graphics.lineStyle(1.5, slot.color === 'white' ? COLORS.talismanPaper : ENERGY_COLORS[slot.color], 0.82);
        this.graphics.strokeCircle(cx, y, 10);
        this.mono(cx, y - 3, slot.label, { color: slot.color === 'white' ? '#08080a' : COLORS.text, fontSize: '7px' }).setOrigin(0.5, 0);
        this.mono(cx, y + 13, String(count), { color: COLORS.text, fontSize: '8px' }).setOrigin(0.5, 0);
      });
    }

    fighterLayout(frame, dockY) {
      const compact = frame.height < 730;
      const token = compact ? 58 : 66;
      const enemyY = compact ? 86 : 92;
      const allyY = Math.max(enemyY + token + 128, dockY - token - (compact ? 44 : 54));
      const centerY = enemyY + token + 42;
      return {
        token,
        enemyY,
        allyY,
        centerY,
        centerH: Math.max(88, allyY - centerY - 28),
      };
    }

    renderCombatantToken(character, side, slot, x, y, size) {
      const store = this.store;
      const selected = side === 'mine' && store.selectedCasterSlot === slot;
      const queuedIndex = side === 'mine' ? store.actions.findIndex((action) => Number(action.caster_slot) === slot) : -1;
      const targetable = store.canTarget(character, slot, side);
      const protectedTarget = store.targetHasInvulnerability(character) && !store.skillBypassesInvulnerability(store.selectedSkill(), character);
      const dead = !character || !character.alive;
      const tone = targetable ? COLORS.target : protectedTarget ? COLORS.protected : selected ? COLORS.selection : queuedIndex >= 0 ? COLORS.queued : side === 'enemy' ? COLORS.enemy : COLORS.ally;
      const cx = x + size / 2;
      const cy = y + size / 2;
      const playerId = side === 'mine' ? store.mineId() : store.enemyId();
      if (playerId) {
        this.playbackTargets = this.playbackTargets || {};
        this.playbackTargets[`${playerId}:${slot}`] = { x: cx, y: cy, side, slot, size, tone };
      }
      this.graphics.fillStyle(COLORS.inkBlack, 0.9);
      this.graphics.fillCircle(cx, cy, size / 2 + 10);
      this.graphics.lineStyle(selected || targetable ? 3 : 1.5, tone, dead ? 0.28 : 0.82);
      this.graphics.strokeCircle(cx, cy, size / 2 + 8);
      if (targetable) {
        this.graphics.lineStyle(2, COLORS.target, 0.86);
        this.graphics.beginPath();
        this.graphics.moveTo(cx - size / 2 - 16, cy);
        this.graphics.lineTo(cx - size / 2 - 2, cy);
        this.graphics.moveTo(cx + size / 2 + 2, cy);
        this.graphics.lineTo(cx + size / 2 + 16, cy);
        this.graphics.moveTo(cx, cy - size / 2 - 16);
        this.graphics.lineTo(cx, cy - size / 2 - 2);
        this.graphics.moveTo(cx, cy + size / 2 + 2);
        this.graphics.lineTo(cx, cy + size / 2 + 16);
        this.graphics.strokePath();
      }
      this.portrait(character || { name: 'Down' }, x + 4, y + 4, size - 8, { tone, dead, selected, targetable, noRing: true });
      const hp = Number(character && character.hp ? character.hp : 0);
      const maxHp = Math.max(1, Number(character && character.max_hp ? character.max_hp : 1));
      const hpPct = clamp(hp / maxHp, 0, 1);
      const barY = y + size + 10;
      const barW = size + 20;
      this.graphics.fillStyle(COLORS.inkBlack, 0.92);
      this.graphics.fillRoundedRect(cx - barW / 2, barY, barW, 7, 4);
      this.graphics.fillStyle(hpPct <= 0.3 ? COLORS.enemy : hpPct <= 0.6 ? COLORS.selection : COLORS.queued, dead ? 0.35 : 1);
      this.graphics.fillRoundedRect(cx - barW / 2, barY, barW * hpPct, 7, 4);
      this.text(cx, barY + 9, (character && character.name) || 'Down', {
        fontSize: '8px',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: size + 40 },
      }).setOrigin(0.5, 0);
      this.mono(cx, barY + 31, dead ? 'DOWN' : `${hp}/${maxHp}`, {
        color: dead ? COLORS.dim : targetable ? COLORS.paperText : COLORS.text,
        fontSize: '8px',
      }).setOrigin(0.5, 0);
      if (queuedIndex >= 0 || targetable || selected || protectedTarget) {
        const chip = queuedIndex >= 0 ? `Q${queuedIndex + 1}` : targetable ? 'TARGET' : protectedTarget ? 'INVULN' : 'READY';
        const chipW = targetable ? 52 : protectedTarget ? 50 : 36;
        this.graphics.fillStyle(queuedIndex >= 0 ? COLORS.queued : targetable ? COLORS.target : protectedTarget ? COLORS.protected : COLORS.selection, 0.95);
        this.graphics.fillRoundedRect(cx - chipW / 2, y - 10, chipW, 18, 9);
        this.mono(cx, y - 5, chip, { color: protectedTarget ? COLORS.text : '#08080a', fontSize: '8px' }).setOrigin(0.5, 0);
      }
      (character && character.statuses ? character.statuses : []).slice(0, 2).forEach((status, index) => {
        this.graphics.fillStyle(COLORS.domain, 0.82);
        this.graphics.fillCircle(x + size - 3 - index * 14, y + 6, 6);
        this.mono(x + size - 3 - index * 14, y + 1, shortText(status.name || status.id, 1).toUpperCase(), {
          color: '#ffffff',
          fontSize: '7px',
        }).setOrigin(0.5, 0);
      });
      this.buttons.push({ x: x - 10, y: y - 12, w: size + 20, h: size + 58, label: `${side} ${slot}`, onClick: () => store.target(side, slot), disabled: false });
    }

    renderTokenRow(team, side, frame, y, size) {
      const x = frame.x + frame.gutter;
      const laneW = frame.width - 32;
      const gap = (laneW - size * 3) / 2;
      this.talismanLabel(x, y - 26, side === 'enemy' ? 'ENEMY FIELD' : 'YOUR FIELD', side === 'enemy' ? COLORS.enemy : COLORS.ally);
      (team || []).forEach((character, slot) => {
        this.renderCombatantToken(character, side, slot, x + slot * (size + gap), y, size);
      });
    }

    renderBattlefield(frame, layout, prompt) {
      const x = frame.x + frame.gutter;
      const y = layout.centerY;
      const w = frame.width - 32;
      const h = layout.centerH;
      this.graphics.fillStyle(COLORS.inkBlack, 0.78);
      this.graphics.fillRoundedRect(x, y, w, h, 20);
      this.graphics.fillStyle(COLORS.talismanDim, 0.055);
      this.graphics.fillRoundedRect(x + 4, y + 4, w - 8, Math.max(20, h * 0.28), 16);
      this.graphics.fillStyle(COLORS.domain, 0.035);
      this.graphics.fillCircle(x + w / 2, y + h / 2, Math.min(w, h) * 0.42);
      [0.34, 0.52, 0.72].forEach((scale, index) => {
        this.graphics.lineStyle(index === 1 ? 1.5 : 1, index === 1 ? COLORS.talismanDim : COLORS.surfaceLine, index === 1 ? 0.2 : 0.12);
        this.graphics.strokeCircle(x + w / 2, y + h / 2, Math.min(w, h) * scale);
      });
      this.graphics.lineStyle(1.5, COLORS.line, 0.65);
      this.graphics.strokeRoundedRect(x, y, w, h, 18);
      for (let i = 0; i < 5; i += 1) {
        const laneY = y + 18 + i * Math.max(14, h / 5);
        this.graphics.lineStyle(1, i === 2 ? COLORS.talismanDim : 0xffffff, i === 2 ? 0.22 : 0.035);
        this.graphics.beginPath();
        this.graphics.moveTo(x + 16, laneY);
        this.graphics.lineTo(x + w - 16, laneY + (i % 2 ? -12 : 12));
        this.graphics.strokePath();
      }
      this.text(x + w / 2, y + 16, prompt, {
        fontSize: frame.height < 730 ? '15px' : '17px',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: w - 52 },
      }).setOrigin(0.5, 0);
      if (this.store.selectedSkillId && this.store.selectedCasterSlot !== null) {
        const laneTone = COLORS.target;
        const slot = Number(this.store.selectedCasterSlot);
        const laneW = frame.width - 32;
        const gap = (laneW - layout.token * 3) / 2;
        const fromX = frame.x + frame.gutter + slot * (layout.token + gap) + layout.token / 2;
        const fromY = layout.allyY + layout.token / 2;
        const toY = y + h * 0.48;
        this.graphics.lineStyle(2, laneTone, 0.44);
        this.graphics.beginPath();
        this.graphics.moveTo(fromX, fromY - 10);
        this.graphics.lineTo(x + w / 2, toY);
        this.graphics.strokePath();
        this.graphics.fillStyle(laneTone, 0.18);
        this.graphics.fillCircle(x + w / 2, toY, 22);
        this.graphics.lineStyle(1.5, laneTone, 0.58);
        this.graphics.strokeCircle(x + w / 2, toY, 28);
        this.mono(x + w / 2, toY - 4, 'TARGETING', { color: COLORS.paperText, fontSize: '8px' }).setOrigin(0.5, 0);
      }
      if (!this.store.queueReviewOpen) {
        this.renderQueueChips(frame, y + h - 38);
        this.renderReplayLine(frame, y + h - 66);
      }
    }

    renderSkillButton(skill, caster, x, y, w, h) {
      const cooldown = this.store.skillCooldown(caster, skill);
      const fit = this.store.skillFit(skill, caster);
      const ruleReason = this.store.statusBlocksSkill(caster, skill);
      const disabled = cooldown > 0 || !!ruleReason || !fit.ok || this.store.queuedSlots().has(Number(this.store.selectedCasterSlot)) || this.store.controlsLocked();
      const selected = this.store.selectedSkillId === skill.id;
      const tone = selected ? COLORS.selection : (ENERGY_COLORS[(skill.cost || [])[0]] || COLORS.talismanDim);
      this.graphics.fillStyle(selected ? 0x221a0c : COLORS.surfaceRaised, disabled ? 0.42 : 0.96);
      this.graphics.fillRoundedRect(x, y, w, h, 14);
      this.graphics.fillStyle(selected ? COLORS.talismanDim : COLORS.surfaceDeep, disabled ? 0.16 : 0.28);
      this.graphics.fillRoundedRect(x + 4, y + 4, w - 8, 16, 10);
      this.graphics.lineStyle(selected ? 3 : 1.5, tone, disabled ? 0.38 : 0.88);
      this.graphics.strokeRoundedRect(x, y, w, h, 14);
      this.graphics.fillStyle(tone, disabled ? 0.16 : 0.32);
      this.graphics.fillRoundedRect(x + 8, y + 8, 36, h - 16, 10);
      this.graphics.lineStyle(1, tone, disabled ? 0.28 : 0.65);
      this.graphics.strokeRoundedRect(x + 8, y + 8, 36, h - 16, 10);
      this.mono(x + 26, y + 15, this.store.targetLabel(skill).slice(0, 3).toUpperCase(), {
        color: selected ? COLORS.paperText : COLORS.text,
        fontSize: '8px',
      }).setOrigin(0.5, 0);
      this.store.adjustedCost(caster, skill).slice(0, 4).forEach((color, index) => {
        const orbX = x + 15 + index * 8;
        this.graphics.fillStyle(COLORS.inkBlack, 0.9);
        this.graphics.fillCircle(orbX, y + h - 15, 4.5);
        this.graphics.fillStyle(ENERGY_COLORS[color] || COLORS.selection, 0.98);
        this.graphics.fillCircle(orbX, y + h - 15, 3.2);
      });
      this.text(x + 52, y + 9, skill.name, {
        fontSize: '11px',
        fontStyle: '900',
        wordWrap: { width: w - 58 },
      });
      if (selected) this.mono(x + w - 34, y + 8, 'INFO', { color: COLORS.paperText, fontSize: '7px' });
      this.mono(x + 52, y + h - 19, cooldown > 0 ? `CD ${cooldown}` : ruleReason ? shortText(ruleReason, 23) : fit.ok ? shortText(this.store.effectLine(skill), 23) : shortText(fit.reason, 23), {
        color: cooldown > 0 ? '#e6b84a' : disabled ? COLORS.muted : COLORS.paperText,
        fontSize: '8px',
      });
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
      const x = frame.x + 14;
      const y = 118;
      const w = frame.width - 28;
      const h = frame.height - y - 16;
      const adjusted = this.store.adjustedCost(caster, skill);
      const cooldown = this.store.skillCooldown(caster, skill);
      const blocked = this.store.statusBlocksSkill(caster, skill);
      const fit = this.store.skillFit(skill, caster);
      const reason = cooldown > 0 ? `Cooldown: ${cooldown} turns` : blocked || (!fit.ok ? fit.reason : 'Available now');
      this.cardPanel(x, y, w, h, COLORS.selection, 0.98);
      this.mono(x + 18, y + 18, 'TECHNIQUE DETAIL', { color: COLORS.paperText, fontSize: '9px' });
      this.text(x + 18, y + 40, skill.name, {
        fontFamily: 'Cinzel, Inter, serif',
        fontSize: '22px',
        fontStyle: '900',
        wordWrap: { width: w - 78 },
      });
      this.iconButton(x + w - 52, y + 18, 36, 34, 'x', () => this.store.closeSkillDetail(), { stroke: COLORS.enemy, fontSize: '13px' });
      this.mono(x + 18, y + 96, `${titleize((skill.target_rule && skill.target_rule.kind) || 'enemy')} target`, { color: COLORS.text, fontSize: '10px' });
      this.costPips(x + 22, y + 132, adjusted, 16);
      this.mono(x + 18, y + 153, `ADJUSTED COST / BASE ${(skill.cost || []).length}`, { color: COLORS.paperText, fontSize: '8px' });
      const classLine = (skill.classes || []).map((value) => titleize(value)).join(' / ') || 'Technique';
      this.mono(x + 18, y + 184, classLine, { color: COLORS.text, fontSize: '9px' });
      this.graphics.fillStyle(reason === 'Available now' ? COLORS.queued : COLORS.enemy, 0.16);
      this.graphics.fillRoundedRect(x + 16, y + 212, w - 32, 40, 12);
      this.graphics.lineStyle(1, reason === 'Available now' ? COLORS.queued : COLORS.enemy, 0.62);
      this.graphics.strokeRoundedRect(x + 16, y + 212, w - 32, 40, 12);
      this.mono(x + 28, y + 226, reason.toUpperCase(), { color: reason === 'Available now' ? '#b7dbc0' : '#f1a0a0', fontSize: '9px' });
      this.mono(x + 18, y + 278, 'AUTHORITATIVE EFFECT', { color: COLORS.paperText, fontSize: '9px' });
      this.text(x + 18, y + 300, skill.description || this.store.effectLine(skill), {
        fontSize: '13px',
        color: COLORS.text,
        lineSpacing: 6,
        wordWrap: { width: w - 36 },
      });
      this.mono(x + 18, y + h - 78, 'Tap Close, then select a legal target.', { color: COLORS.muted, fontSize: '9px' });
      this.button(x + 16, y + h - 54, w - 32, 38, 'Close Detail', () => this.store.closeSkillDetail(), {
        fill: COLORS.selection,
        gradientTop: COLORS.talismanDim,
        stroke: COLORS.talismanPaper,
        color: '#08080a',
        fontSize: '11px',
      });
    }

    renderQueueChips(frame, y) {
      const x = frame.x + frame.gutter;
      const chipW = (frame.width - 44) / 3;
      this.mono(x, y - 18, `QUEUE ${this.store.actions.length}/3`, {
        color: this.store.actions.length ? '#b7dbc0' : COLORS.dim,
        fontSize: '8px',
      });
      if (!this.store.actions.length) {
        this.mono(x + 10, y + 8, 'Queue empty: pick a fighter, technique, then target.', { color: COLORS.muted, fontSize: '9px' });
        return;
      }
      const me = this.store.me();
      [0, 1, 2].forEach((index) => {
        const action = this.store.actions[index];
        const chipX = x + index * (chipW + 6);
        this.graphics.fillStyle(action ? 0x111b13 : COLORS.inkBlack, action ? 0.9 : 0.52);
        this.graphics.fillRoundedRect(chipX, y, chipW, 30, 12);
        if (action) {
          this.graphics.fillStyle(COLORS.queued, 0.18);
          this.graphics.fillRoundedRect(chipX + 3, y + 3, chipW - 6, 9, 8);
        }
        this.graphics.lineStyle(1, action ? COLORS.queued : COLORS.line, action ? 0.72 : 0.4);
        this.graphics.strokeRoundedRect(chipX, y, chipW, 30, 12);
        if (!action) {
          this.mono(chipX + chipW / 2, y + 9, `Q${index + 1}`, { color: COLORS.dim, fontSize: '8px' }).setOrigin(0.5, 0);
          return;
        }
        const caster = me && me.team ? me.team[action.caster_slot] : null;
        const skill = caster ? this.store.skillFor(caster, action.skill_id) : null;
        this.mono(chipX + 8, y + 5, `Q${index + 1}`, { color: '#d8f0dc', fontSize: '8px' });
        this.mono(chipX + 28, y + 5, shortText(skill ? skill.name : action.skill_id, 12), { color: COLORS.text, fontSize: '8px' });
      });
    }

    renderReplayLine(frame, y) {
      const events = this.store.recentEvents.slice(0, 1);
      if (!events.length) return;
      const x = frame.x + frame.gutter;
      const event = events[0];
      const tone = eventTone(event);
      const color = tone === 'damage' ? '#f1a0a0' : tone === 'heal' ? '#b7dbc0' : tone === 'status' ? '#cbbdff' : COLORS.text;
      this.graphics.fillStyle(COLORS.inkBlack, 0.72);
      this.graphics.fillRoundedRect(x + 14, y, frame.width - 60, 22, 11);
      this.mono(x + 28, y + 6, shortText(event.message || event.type, 42), {
        color,
        fontSize: '8px',
      });
    }

    renderCommandDeck(frame, dockY, selected) {
      const x = frame.x + frame.gutter;
      const h = frame.height - dockY;
      this.graphics.fillStyle(COLORS.surfaceDeep, 0.99);
      this.graphics.fillRoundedRect(frame.x, dockY, frame.width, h + 18, 26);
      this.graphics.fillStyle(COLORS.surfaceRaised, 0.5);
      this.graphics.fillRoundedRect(frame.x + 6, dockY + 6, frame.width - 12, 58, 22);
      this.graphics.fillStyle(selected ? COLORS.selection : COLORS.talismanDim, selected ? 0.13 : 0.08);
      this.graphics.fillRoundedRect(frame.x + 12, dockY + 8, frame.width - 24, 46, 18);
      this.graphics.lineStyle(2, selected ? COLORS.selection : COLORS.line, 0.72);
      this.graphics.strokeRoundedRect(frame.x + 1, dockY + 1, frame.width - 2, h + 16, 26);
      this.graphics.fillStyle(0xffffff, 0.14);
      this.graphics.fillRoundedRect(frame.x + frame.width / 2 - 28, dockY + 8, 56, 4, 3);
      if (selected) {
        const tone = this.store.assets.toneFor(selected.character_id);
        const skills = this.store.skillsFor(selected).slice(0, 4);
        const readyCount = skills.filter((skill) => {
          const cooldown = this.store.skillCooldown(selected, skill);
          return cooldown <= 0 && !this.store.statusBlocksSkill(selected, skill) && this.store.skillFit(skill, selected).ok && !this.store.queuedSlots().has(Number(this.store.selectedCasterSlot)) && !this.store.controlsLocked();
        }).length;
        this.portrait(selected, x, dockY + 16, 54, { tone, selected: true });
        this.text(x + 66, dockY + 15, shortText(selected.name, 24), { fontSize: '16px', fontStyle: '900' });
        const instruction = readyCount
          ? (this.store.selectedSkillId ? 'Pick a glowing target' : 'Choose technique')
          : 'No technique online';
        this.mono(x + 66, dockY + 38, instruction.toUpperCase(), { color: COLORS.paperText, fontSize: '9px' });
        this.mono(frame.x + frame.width - frame.gutter - 76, dockY + 38, `READY ${readyCount}/${skills.length}`, {
          color: readyCount ? '#b7dbc0' : '#f1a0a0',
          fontSize: '8px',
        }).setOrigin(0.5, 0);
        const cardW = (frame.width - 44) / 2;
        const cardH = frame.height < 730 ? 50 : 56;
        skills.forEach((skill, index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          this.renderSkillButton(skill, selected, x + col * (cardW + 12), dockY + 82 + row * (cardH + 8), cardW, cardH);
        });
      } else {
        this.text(x, dockY + 22, 'Select A Fighter', { fontSize: '18px', fontStyle: '900' });
        this.mono(x, dockY + 50, 'READY TOKENS GLOW IN YOUR FIELD', { color: COLORS.muted, fontSize: '9px' });
      }
      const buttonY = frame.height - 48;
      this.button(x, buttonY, 76, 34, 'Cancel', () => this.store.cancelQueue(), {
        fill: COLORS.surfaceRaised,
        stroke: COLORS.line,
        mono: true,
        fontSize: '10px',
        disabled: !this.store.actions.length || this.store.controlsLocked(),
      });
      this.button(x + 84, buttonY, 64, 34, 'End', () => this.store.endTurn(), {
        fill: COLORS.surfaceRaised,
        stroke: COLORS.line,
        mono: true,
        fontSize: '10px',
        disabled: this.store.controlsLocked(),
      });
      this.button(frame.x + frame.width - frame.gutter - 106, buttonY, 106, 34, this.store.queueSubmitting ? 'Resolving' : `Review ${this.store.actions.length}/3`, () => this.store.openQueueReview(), {
        fill: this.store.actions.length ? COLORS.selection : COLORS.surfaceRaised,
        gradientTop: this.store.actions.length ? COLORS.talismanDim : COLORS.surfaceRaised,
        stroke: this.store.actions.length ? COLORS.talismanPaper : COLORS.line,
        mono: true,
        fontSize: '10px',
        disabled: !this.store.actions.length || this.store.controlsLocked(),
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
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
      const dockH = frame.height < 730 ? 248 : 268;
      const dockY = frame.height - dockH;
      const layout = this.fighterLayout(frame, dockY);
      this.playbackTargets = {};
      this.renderTopHud(frame, state, me);
      if (this.store.detailSkillId && selected) {
        const detailSkill = this.store.skillFor(selected, this.store.detailSkillId);
        if (detailSkill) {
          this.renderSkillDetailSheet(frame, selected, detailSkill);
          return;
        }
        this.store.detailSkillId = null;
      }
      this.button(frame.x + frame.width - frame.gutter - 88, 72, 88, 28, 'Convert', () => this.store.convertEnergy(), {
        fill: COLORS.surfaceRaised,
        stroke: COLORS.ally,
        fontSize: '10px',
        mono: true,
        disabled: this.store.controlsLocked() || !!this.store.actions.length || !!(me && me.energy_converted_this_turn),
      });
      const prompt = state.winner_id
        ? 'Battle finished'
        : this.store.queueReviewOpen
          ? 'Review queued techniques'
          : this.store.controlsLocked()
          ? 'Waiting for resolution'
          : this.store.selectedSkillId
            ? 'Tap a glowing target'
          : this.store.selectedCasterSlot !== null
              ? 'Choose technique'
              : 'Tap an ally fighter';
      this.renderTokenRow(foe && foe.team, 'enemy', frame, layout.enemyY, layout.token);
      this.renderBattlefield(frame, layout, prompt);
      if (!this.store.queueReviewOpen) {
        this.renderTokenRow(me && me.team, 'mine', frame, layout.allyY, layout.token);
        this.renderCommandDeck(frame, dockY, selected);
      }
      this.renderQueueReviewSheet(frame);
      this.toast(frame);
      this.playEvents(frame);
    }
  }
