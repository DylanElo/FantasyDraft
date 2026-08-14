import { CULLING_COLORS, ENERGY_LABELS, TOKEN_TYPE } from '../core/runtime-config.js?v=58';
import { clamp, initials, shortText } from '../core/text.js?v=58';
import { clippedPoints } from '../core/shape.js?v=58';
import { eventTone } from '../fx/event-metrics.js?v=58';
import { activeStatuses, statusTone } from '../core/status-presentation.js?v=58';

// Called via `.call(this, ...)` from a one-line delegator method on
// CombatScene -- see web/static/phaser/scenes/combat-sheets.js's docstring
// for why (keeps every `this.store`/`this.mono` reference identical to the
// method bodies this was extracted from, which several
// `tests/test_phaser_*.py` checks assert as literal source text).

export function renderPortraitPlate(character, x, y, w, h, options = {}) {
  const dead = !character || !character.alive;
  const id = character && (character.character_id || character.id);
  const key = this.store.portraitKey(id);
  if (this.textures.exists(key)) {
    this.portraitArtwork(character || id || '', x, y, w, h, {
      context: options.context || 'hero',
      dead,
      alpha: options.alpha === undefined ? 0.98 : options.alpha,
      depth: -1,
    });
    return;
  }
  const tone = this.store.assets.toneFor(id || (character && character.name));
  this.graphics.fillStyle(CULLING_COLORS.ivory, dead ? 0.56 : 0.96);
  this.graphics.fillRect(x, y, w, h);
  this.graphics.fillStyle(tone, dead ? 0.06 : 0.18);
  this.graphics.fillTriangle(x, y, x + w, y, x, y + h);
  this.graphics.fillStyle(CULLING_COLORS.charcoal, dead ? 0.08 : 0.15);
  this.graphics.fillCircle(x + w * 0.54, y + h * 0.42, Math.min(w, h) * 0.24);
  this.text(x + w / 2, y + h * 0.36, initials((character && character.name) || 'Down'), {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: `${Math.max(18, Math.round(w * 0.22))}px`,
    fontStyle: '900',
    color: dead ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
  }).setOrigin(0.5, 0);
}

export function actionTargetMark(side, slot) {
  const playerId = side === 'mine' ? this.store.mineId() : this.store.enemyId();
  const pending = this.store.pendingPrimaryTarget;
  if (pending && pending.playerId === playerId && pending.slot != null && Number(pending.slot) === Number(slot)) return '1ST TARGET';
  for (let index = this.store.actions.length - 1; index >= 0; index -= 1) {
    const action = this.store.actions[index];
    if (action.alternate_target_player_id === playerId && action.alternate_target_slot != null && Number(action.alternate_target_slot) === Number(slot)) return `Q${index + 1} ALT`;
    if (action.target_player_id !== playerId) continue;
    if (action.secondary_target_slot != null && Number(action.secondary_target_slot) === Number(slot)) return `Q${index + 1} 2ND`;
    if (action.target_slot != null && Number(action.target_slot) === Number(slot)) return `Q${index + 1} TARGET`;
    if ((action.target_slots || []).map(Number).includes(Number(slot))) return `Q${index + 1} TEAM`;
  }
  return '';
}

export function renderFighterPlate(character, side, slot, x, y, w, h) {
  const store = this.store;
  const selected = side === 'mine' && store.selectedCasterSlot === slot;
  const queuedIndex = side === 'mine' ? store.actions.findIndex((action) => Number(action.caster_slot) === slot) : -1;
  const targetable = store.canTarget(character, slot, side);
  const selectedSkill = store.selectedSkill();
  const protectedTarget = !!selectedSkill && store.targetBlocksSkill(character, selectedSkill);
  const dead = !character || !character.alive;
  const targetMark = this.actionTargetMark(side, slot);
  const visibleAction = typeof store.currentVisibleAction === 'function' ? store.currentVisibleAction() : null;
  const visiblePayload = (visibleAction && visibleAction.payload) || {};
  const visibleCaster = visiblePayload.player_id === (side === 'mine' ? store.mineId() : store.enemyId())
    && Number(visiblePayload.caster_slot) === Number(slot);
  const activeSkillName = this.activeVisibleSkillForFighter(side, slot);
  const fullyStunnedBy = store.fighterFullyStunnedBy(character);
  const baseTone = side === 'enemy' ? CULLING_COLORS.enemy : CULLING_COLORS.cobalt;
  const tone = targetable
    ? CULLING_COLORS.target
    : protectedTarget
      ? CULLING_COLORS.muted
      : selected
        ? CULLING_COLORS.selected
        : queuedIndex >= 0
          ? CULLING_COLORS.queued
          : fullyStunnedBy
            ? CULLING_COLORS.enemy
            : baseTone;
  const artH = h - 8;
  const nameBandY = y + h - 42;
  const playerId = side === 'mine' ? store.mineId() : store.enemyId();
  if (playerId) {
    this.playbackTargets = this.playbackTargets || {};
    this.playbackTargets[`${playerId}:${slot}`] = {
      x: x + w / 2,
      y: y + (nameBandY - y) / 2,
      side,
      slot,
      size: Math.min(w, artH),
      tone,
    };
  }

  this.graphics.fillStyle(CULLING_COLORS.shadow, targetable || selected ? 0.26 : 0.13);
  this.graphics.fillPoints(clippedPoints(x + 2, y + 4, w, h, 10), true);
  this.renderPortraitPlate(character, x + 2, y + 2, w - 4, artH - 2, {
    alpha: dead ? 0.3 : targetable ? 1 : 0.98,
    context: 'hero',
  });

  // The portrait owns the card. Instead of ivory paper, use a rich dark gradient overlay
  // at the bottom to ensure text readability without hiding the artwork.
  this.graphics.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.85, 0.85);
  this.graphics.fillRect(x + 2, y + h * 0.5, w - 4, h * 0.5 - 2);

  this.graphics.fillStyle(tone, dead ? 0.15 : selected || targetable ? 0.98 : 0.72);
  this.graphics.fillRect(x + 2, y + h - 10, w - 4, 3);
  this.graphics.lineStyle(selected || targetable ? 3 : 1.4, tone, dead ? 0.24 : 0.92);
  this.graphics.strokePoints(clippedPoints(x, y, w, h, 10), true);

  const markerX = x + 14;
  const markerY = nameBandY + 13;
  this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.9);
  this.graphics.fillPoints([
    { x: markerX, y: markerY - 9 },
    { x: markerX + 9, y: markerY },
    { x: markerX, y: markerY + 9 },
    { x: markerX - 9, y: markerY },
  ], true);
  this.graphics.lineStyle(1, tone, 0.96);
  this.graphics.strokePoints([
    { x: markerX, y: markerY - 9 },
    { x: markerX + 9, y: markerY },
    { x: markerX, y: markerY + 9 },
    { x: markerX - 9, y: markerY },
  ], true);
  this.mono(markerX, markerY - 5, String(slot + 1), {
    color: CULLING_COLORS.inverseText,
    fontSize: '10px',
    fontStyle: '700',
  }).setOrigin(0.5, 0);

  const stateLabel = targetMark
    || (queuedIndex >= 0
      ? `Q${queuedIndex + 1}`
      : targetable
        ? 'TAP TARGET'
        : protectedTarget
          ? 'BLOCKED'
          : visibleCaster
            ? 'USING SKILL'
            : activeSkillName
              ? 'ACTIVE SKILL'
              : dead
                ? 'DOWN'
                : fullyStunnedBy
                  ? fullyStunnedBy.toUpperCase()
                  : selected
                    ? 'ACTIVE'
                    : '');
  if (stateLabel) {
    const chipW = clamp(stateLabel.length * 7 + 14, 54, w);
    const chipX = x + (w - chipW) / 2;
    const chipY = y - 20;
    this.graphics.fillStyle(tone, protectedTarget ? 0.74 : 0.94);
    this.graphics.fillPoints(clippedPoints(chipX, chipY, chipW, 22, 4), true);
    this.mono(chipX + chipW / 2, chipY + 4, stateLabel, {
      color: protectedTarget || tone === CULLING_COLORS.cobalt ? CULLING_COLORS.inverseText : CULLING_COLORS.text,
      fontSize: '12px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
  }

  const fighterName = (character && character.name) || 'Down';
  const nameNode = this.text(x + 28, nameBandY + 3, fighterName, {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: '12px',
    fontStyle: '900',
    color: dead ? CULLING_COLORS.mutedText : CULLING_COLORS.inverseText,
    lineSpacing: -2,
    wordWrap: { width: w - 34 },
  });
  nameNode.setMaxLines(2);

  const hp = Number(character && character.hp ? character.hp : 0);
  const maxHp = Math.max(1, Number(character && character.max_hp ? character.max_hp : 1));
  const hpPct = clamp(hp / maxHp, 0, 1);
  const hpTone = hpPct <= 0.3 ? CULLING_COLORS.enemy : hpPct <= 0.6 ? CULLING_COLORS.gold : CULLING_COLORS.queued;
  const barX = x + 4;
  const barY = y + h - 7;
  const barW = w - 8;
  const hpLabel = dead ? 'DOWN' : `${hp}/${maxHp}`;
  const hpLabelW = Math.min(w - 8, Math.max(40, hpLabel.length * 7 + 12));
  this.graphics.fillStyle(CULLING_COLORS.ivory, 0.9);
  this.graphics.fillPoints(clippedPoints(x + 3, y + 3, hpLabelW, 22, 4), true);
  this.mono(x + 7, y + 6, hpLabel, {
    color: dead ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
    fontSize: '12px',
    fontStyle: '700',
  });
  this.graphics.fillStyle(CULLING_COLORS.concrete, 0.96);
  this.graphics.fillRect(barX, barY, barW, 5);
  this.graphics.fillStyle(hpTone, dead ? 0.25 : 0.98);
  this.graphics.fillRect(barX, barY, barW * hpPct, 5);

  const characterStatuses = activeStatuses(character);
  const visibleStatusLabels = this.visibleStatusLabels(character);
  visibleStatusLabels.forEach((label, index) => {
    const renderedLabel = selectedSkill ? label : `${label} >`;
    const chipW = Math.min(w - 8, Math.max(52, renderedLabel.length * 6.6 + 12));
    const chipX = x + w - chipW - 4;
    const chipY = y + 27 + index * 20;
    this.graphics.fillStyle(statusTone(characterStatuses[index]), 0.9);
    this.graphics.fillRect(chipX, chipY, chipW, 18);
    this.mono(chipX + chipW / 2, chipY + 2, renderedLabel, {
      color: CULLING_COLORS.inverseText,
      fontSize: '12px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
  });
  if (characterStatuses.length > 2) {
    const moreLabel = `+${characterStatuses.length - 2} MORE`;
    const chipW = Math.max(46, moreLabel.length * 5 + 9);
    const chipX = x + w - chipW - 4;
    const chipY = y + 67;
    this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.88);
    this.graphics.fillRect(chipX, chipY, chipW, 14);
    this.mono(chipX + chipW / 2, chipY + 1, moreLabel, {
      color: CULLING_COLORS.inverseText,
      fontSize: '10px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
  }

  if (targetable) {
    this.graphics.lineStyle(2, CULLING_COLORS.target, 0.98);
    const pad = 4;
    const corner = 12;
    [
      [x - pad, y - pad, 1, 1],
      [x + w + pad, y - pad, -1, 1],
      [x - pad, y + h + pad, 1, -1],
      [x + w + pad, y + h + pad, -1, -1],
    ].forEach(([cx, cy, sx, sy]) => {
      this.graphics.beginPath();
      this.graphics.moveTo(cx, cy + corner * sy);
      this.graphics.lineTo(cx, cy);
      this.graphics.lineTo(cx + corner * sx, cy);
      this.graphics.strokePath();
    });
  }

  this.presentationLayerCall('renderFighterState', {
    character,
    side,
    slot,
    region: { x, y, w, h },
    selected,
    targetable,
    protected: protectedTarget,
    queuedIndex,
    targetMark,
    dead,
  });

  const sideLabel = side === 'mine' ? 'Ally' : 'Enemy';
  const interactionLabel = targetable
    ? 'Select legal target'
    : side === 'mine' ? 'Select fighter' : 'Inspect fighter';
  const fighterState = [stateLabel, ...visibleStatusLabels].filter(Boolean).join(', ');
  this.buttons.push({
    x: x - 2,
    y: y - 3,
    w: w + 4,
    h: h + 6,
    label: `${interactionLabel}: ${sideLabel} ${slot + 1}, ${fighterName}, ${hpLabel}${fighterState ? `, ${fighterState}` : ''}`,
    accessibilityKey: `fighter-${side}-${slot}`,
    onClick: () => {
      this.presentationLayerCall('interactionCue', {
        cue: targetable ? 'target-lock' : side === 'mine' ? 'fighter-select' : 'fighter-tap',
        character,
        side,
        slot,
        targetable,
      });
      if (targetable) store.target(side, slot);
      else if (!selectedSkill && side === 'mine') store.selectCaster(slot);
      else if (!selectedSkill) store.inspectFighter(side, slot);
    },
    onLongPress: () => {
      this.presentationLayerCall('interactionCue', {
        cue: 'fighter-tap',
        character,
        side,
        slot,
      });
      store.inspectFighter(side, slot);
    },
    disabled: false,
  });
}

export function renderFighterLane(team, side, frame, layout) {
  const baseY = side === 'enemy' ? layout.enemyY : layout.allyY;
  (team || []).slice(0, 3).forEach((character, slot) => {
    const selected = side === 'mine' && Number(this.store.selectedCasterSlot) === slot;
    const centerX = layout.contentX + slot * (layout.cardW + layout.gap) + layout.cardW / 2;
    const tokenW = selected ? Math.min(layout.cardW + 8, 126) : Math.min(layout.cardW - 12, 104);
    const tokenH = selected ? layout.cardH + 42 : layout.cardH;
    const x = centerX - tokenW / 2;
    const y = baseY + (slot === 1 ? -8 : 5) - (selected ? 48 : 0);
    renderSquadToken.call(this, character, side, slot, x, y, tokenW, tokenH);
  });
}

function renderSquadToken(character, side, slot, x, y, w, h) {
  const store = this.store;
  const selected = side === 'mine' && store.selectedCasterSlot === slot;
  const queuedIndex = side === 'mine'
    ? store.actions.findIndex((action) => Number(action.caster_slot) === slot)
    : -1;
  const selectedSkill = store.selectedSkill();
  const targetable = store.canTarget(character, slot, side);
  const protectedTarget = !!selectedSkill && store.targetBlocksSkill(character, selectedSkill);
  const targetMark = this.actionTargetMark(side, slot);
  const dead = !character || !character.alive;
  const fullyStunnedBy = store.fighterFullyStunnedBy(character);
  const tone = targetable
    ? CULLING_COLORS.target
    : protectedTarget
      ? CULLING_COLORS.muted
      : selected
        ? CULLING_COLORS.selected
        : queuedIndex >= 0
          ? CULLING_COLORS.queued
          : fullyStunnedBy
            ? CULLING_COLORS.enemy
            : side === 'enemy' ? CULLING_COLORS.enemy : CULLING_COLORS.cobalt;
  const portraitSize = Math.min(w + 4, h - 10);
  const portraitX = x + (w - portraitSize) / 2;
  const portraitY = y;

  this.graphics.fillStyle(CULLING_COLORS.shadow, selected || targetable ? 0.3 : 0.16);
  this.graphics.fillPoints(clippedPoints(portraitX + 2, portraitY + 3, portraitSize, portraitSize, 12), true);
  this.renderPortraitPlate(character, portraitX, portraitY, portraitSize, portraitSize, {
    alpha: dead ? 0.28 : protectedTarget ? 0.46 : 1,
    context: 'thumb',
  });
  this.graphics.lineStyle(selected || targetable ? 3 : 1.5, tone, dead ? 0.3 : 0.96);
  this.graphics.strokePoints(clippedPoints(portraitX, portraitY, portraitSize, portraitSize, 12), true);

  const hp = Number(character && character.hp ? character.hp : 0);
  const maxHp = Math.max(1, Number(character && character.max_hp ? character.max_hp : 1));
  const hpPct = clamp(hp / maxHp, 0, 1);
  const hpTone = hpPct <= 0.3 ? CULLING_COLORS.enemy : hpPct <= 0.6 ? CULLING_COLORS.gold : CULLING_COLORS.queued;
  this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.84);
  this.graphics.fillRect(x + 3, y + h - 17, w - 6, 7);
  this.graphics.fillStyle(hpTone, dead ? 0.25 : 0.98);
  this.graphics.fillRect(x + 3, y + h - 17, (w - 6) * hpPct, 7);
  this.mono(x + w / 2, y + h - 11, dead ? 'DOWN' : `${hp}/${maxHp}`, {
    color: dead ? CULLING_COLORS.mutedText : CULLING_COLORS.inverseText,
    backgroundColor: '#17191E',
    fontSize: '12px',
    fontStyle: '900',
    padding: { x: 3, y: 1 },
  }).setOrigin(0.5, 0);
  this.text(x + w / 2, y + h - 31, (character && character.name) || 'Down', {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: '12px', fontStyle: '900', color: CULLING_COLORS.inverseText,
    stroke: CULLING_COLORS.charcoal, strokeThickness: 4, align: 'center',
  }).setOrigin(0.5, 0).setMaxLines(1);
  const stateLabel = targetMark
    || (queuedIndex >= 0
      ? `Q${queuedIndex + 1}`
      : targetable
        ? 'LEGAL'
        : protectedTarget
          ? 'INVULNERABLE'
          : fullyStunnedBy
            ? 'STUNNED'
            : selected
              ? 'SELECTED'
              : '');
  if (stateLabel) {
    this.mono(x + w / 2, y - 5, stateLabel, {
      color: tone === CULLING_COLORS.selected ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
      backgroundColor: tone,
      fontSize: '12px',
      fontStyle: '900',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 0.5).setDepth(2);
  }

  const statuses = activeStatuses(character);
  const visibleStatuses = this.visibleStatusLabels(character);
  if (visibleStatuses.length) {
    this.mono(x + w / 2, y + h - 49, shortText(visibleStatuses[0], 16).toUpperCase(), {
      color: CULLING_COLORS.inverseText,
      backgroundColor: statusTone(statuses[0]),
      fontSize: '12px',
      fontStyle: '900',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 0).setDepth(2);
  }

  const playerId = side === 'mine' ? store.mineId() : store.enemyId();
  if (playerId) {
    this.playbackTargets = this.playbackTargets || {};
    this.playbackTargets[`${playerId}:${slot}`] = {
      x: portraitX + portraitSize / 2,
      y: portraitY + portraitSize / 2,
      side,
      slot,
      size: portraitSize,
      tone,
    };
  }
  this.presentationLayerCall('renderFighterState', {
    character,
    side,
    slot,
    region: { x: portraitX, y: portraitY, w: portraitSize, h: portraitSize },
    selected,
    targetable,
    protected: protectedTarget,
    queuedIndex,
    targetMark,
    dead,
  });

  const fighterName = (character && character.name) || 'Down';
  const interactionLabel = targetable
    ? 'Select legal target'
    : side === 'mine' ? 'Select fighter' : 'Inspect fighter';
  this.registerHitTarget(x, y - 4, w, h + 4, `${interactionLabel}: ${fighterName}, ${dead ? 'Down' : `${hp}/${maxHp}`}`, () => {
    this.presentationLayerCall('interactionCue', {
      cue: targetable ? 'target-lock' : side === 'mine' ? 'fighter-select' : 'fighter-tap',
      character,
      side,
      slot,
      targetable,
    });
    if (targetable) store.target(side, slot);
    else if (!selectedSkill && side === 'mine') store.selectCaster(slot);
    else if (!selectedSkill) store.inspectFighter(side, slot);
  }, {
    onLongPress: () => store.inspectFighter(side, slot),
    accessibilityId: `fighter-${side}-${slot}`,
  });
}

export function renderQueueMarks(frame, layout, y) {
  const centerX = frame.x + frame.width / 2;
  const me = this.store.me();
  const spacing = 42;
  [-1, 0, 1].forEach((offset, index) => {
    const action = this.store.actions[index];
    const cx = centerX + offset * spacing;
    const tone = action ? CULLING_COLORS.queued : CULLING_COLORS.charcoal;
    this.graphics.fillStyle(CULLING_COLORS.ivory, action ? 0.96 : 0.68);
    this.graphics.fillPoints([
      { x: cx, y: y - 10 },
      { x: cx + 18, y },
      { x: cx, y: y + 10 },
      { x: cx - 18, y },
    ], true);
    this.graphics.lineStyle(1.5, tone, action ? 0.9 : 0.28);
    this.graphics.strokePoints([
      { x: cx, y: y - 10 },
      { x: cx + 18, y },
      { x: cx, y: y + 10 },
      { x: cx - 18, y },
    ], true);
    if (!action) {
      this.mono(cx, y - 5, `Q${index + 1}`, { color: CULLING_COLORS.mutedText, fontSize: '10px' }).setOrigin(0.5, 0);
      return;
    }
    const caster = me && me.team ? me.team[action.caster_slot] : null;
    this.mono(cx, y - 5, caster ? initials(caster.name) : `Q${index + 1}`, {
      color: '#275F39',
      fontSize: '10px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
  });
}

export function renderReplayLine(frame, layout) {
  if (typeof this.store.currentVisibleAction === 'function' && this.store.currentVisibleAction()) return;
  const events = this.store.recentEvents.slice(0, 1);
  if (!events.length || layout.fieldH <= 150) return;
  const event = events[0];
  const tone = eventTone(event);
  const color = tone === 'damage'
    ? CULLING_COLORS.redText
    : tone === 'heal'
      ? '#357D4B'
      : tone === 'status'
        ? '#6240A8'
        : CULLING_COLORS.text;
  const replayY = Math.min(layout.fieldBottom - 34, layout.fieldTop + 30);
  const replayW = Math.min(308, frame.width - 52);
  const rx = frame.x + (frame.width - replayW) / 2;
  this.graphics.fillStyle(CULLING_COLORS.ivory, 0.82);
  this.graphics.fillRect(rx, replayY, replayW, 18);
  this.mono(frame.x + frame.width / 2, replayY + 2, shortText(event.message || event.type, 38), {
    color,
    fontSize: '12px',
    fontStyle: '700',
  }).setOrigin(0.5, 0);
  this.registerHitTarget(rx, replayY - 4, replayW, 26, 'Open combat log', () => {
    this.store.toggleCombatLog(true);
  });
}

export function renderBattlefield(frame, layout, prompt) {
  const selectedSkill = this.store.selectedSkill();
  const casterSlot = Number(this.store.selectedCasterSlot);
  const hasCaster = Number.isInteger(casterSlot) && casterSlot >= 0;
  const casterX = layout.contentX + casterSlot * (layout.cardW + layout.gap) + layout.cardW / 2;
  const casterY = layout.allyY + layout.cardH * 0.38;
  const teams = [
    ['enemy', this.store.foe() && this.store.foe().team, layout.enemyY],
    ['mine', this.store.me() && this.store.me().team, layout.allyY],
  ];

  if (selectedSkill && hasCaster) {
    teams.forEach(([side, team, y]) => {
      (team || []).slice(0, 3).forEach((character, slot) => {
        if (!this.store.canTarget(character, slot, side)) return;
        const targetX = layout.contentX + slot * (layout.cardW + layout.gap) + layout.cardW / 2;
        const targetY = y + layout.cardH * 0.38;
        const bendY = casterY + (targetY - casterY) * 0.52;
        this.graphics.lineStyle(2, CULLING_COLORS.target, 0.82);
        this.graphics.beginPath();
        this.graphics.moveTo(casterX, casterY);
        this.graphics.lineTo((casterX + targetX) / 2 + (slot - 1) * 8, bendY);
        this.graphics.lineTo(targetX, targetY);
        this.graphics.strokePath();
        this.graphics.fillStyle(CULLING_COLORS.target, 0.94);
        this.graphics.fillCircle(targetX, targetY, 4);
      });
    });
  }

  const y = layout.stageTop + layout.stageH * 0.5 - 11;
  this.text(frame.x + frame.width / 2, y, prompt, {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: layout.compact ? '13px' : '15px',
    fontStyle: '900',
    color: selectedSkill ? '#9AF7FF' : CULLING_COLORS.inverseText,
    stroke: CULLING_COLORS.charcoal,
    strokeThickness: 5,
    align: 'center',
    wordWrap: { width: layout.contentW - 32 },
  }).setOrigin(0.5, 0);
  this.graphics.lineStyle(1.5, selectedSkill ? CULLING_COLORS.target : CULLING_COLORS.ivory, selectedSkill ? 0.72 : 0.22);
  this.graphics.beginPath();
  this.graphics.moveTo(frame.x + 28, y + 26);
  this.graphics.lineTo(frame.x + frame.width - 28, y + 26);
  this.graphics.strokePath();
  this.presentationLayerCall('renderTargetLane', { frame, layout, prompt, selectedSkill, centerX: frame.x + frame.width / 2, centerY: y });
  this.renderReplayLine(frame, layout);
}

function renderBattlefieldLegacy(frame, layout, prompt) {
  const g = this.graphics;
  const centerX = frame.x + frame.width / 2;
  const centerY = layout.fieldTop + layout.fieldH / 2;
  const selectedSkill = this.store.selectedSkill();
  const selected = this.store.me() && this.store.me().team
    ? this.store.me().team[this.store.selectedCasterSlot]
    : null;
  const focusAction = [...(this.store.actions || [])].reverse().find((action) => (
    Number(action.caster_slot) === Number(this.store.selectedCasterSlot)
  ));
  const pending = this.store.pendingPrimaryTarget;
  const targetPlayerId = pending ? pending.playerId : focusAction && focusAction.target_player_id;
  const targetSlot = pending ? pending.slot : focusAction && focusAction.target_slot;
  const targetPlayer = targetPlayerId && this.store.state.players[targetPlayerId];
  const target = targetPlayer && targetPlayer.team && targetSlot != null
    ? targetPlayer.team[targetSlot]
    : null;
  const stageX = layout.contentX;
  const stageY = layout.fieldTop;
  const stageW = layout.contentW;
  const stageH = layout.fieldH;
  const splitX = stageX + stageW * 0.52;
  const portraitW = Math.min(150, stageW * 0.43);
  const portraitH = stageH - 46;

  g.fillStyle(CULLING_COLORS.shadow, 0.22);
  g.fillPoints(clippedPoints(stageX + 3, stageY + 5, stageW, stageH, 12), true);
  g.fillStyle(CULLING_COLORS.charcoal, 0.78);
  g.fillPoints(clippedPoints(stageX, stageY, stageW, stageH, 12), true);
  g.fillStyle(CULLING_COLORS.cobalt, 0.24);
  g.fillTriangle(stageX, stageY, splitX + 22, stageY, stageX, stageY + stageH);
  g.fillStyle(selectedSkill ? CULLING_COLORS.target : CULLING_COLORS.ivory, selectedSkill ? 0.14 : 0.07);
  g.fillTriangle(stageX + stageW, stageY, splitX - 10, stageY + stageH, stageX + stageW, stageY + stageH);
  g.lineStyle(2, selectedSkill ? CULLING_COLORS.target : CULLING_COLORS.gold, selectedSkill ? 0.92 : 0.52);
  g.strokePoints(clippedPoints(stageX, stageY, stageW, stageH, 12), true);
  g.lineStyle(2, CULLING_COLORS.ivory, 0.3);
  g.beginPath();
  g.moveTo(splitX + 18, stageY + 8);
  g.lineTo(splitX - 18, stageY + stageH - 8);
  g.strokePath();

  if (selected) {
    this.renderPortraitPlate(selected, stageX + 4, stageY + 30, portraitW, portraitH, {
      alpha: 0.98,
      context: 'hero',
    });
    this.text(stageX + 10, stageY + stageH - 25, selected.name, {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: layout.compressed ? '14px' : '16px',
      fontStyle: '900',
      color: CULLING_COLORS.inverseText,
      stroke: CULLING_COLORS.charcoal,
      strokeThickness: 4,
      wordWrap: { width: portraitW - 8 },
    }).setMaxLines(2);
  } else {
    this.mono(stageX + stageW * 0.25, centerY - 7, 'CHOOSE ALLY', {
      color: '#CDE6FF',
      fontSize: '12px',
      fontStyle: '900',
    }).setOrigin(0.5, 0);
  }

  const targetX = splitX + 8;
  const targetW = stageX + stageW - targetX - 5;
  if (target) {
    this.renderPortraitPlate(target, targetX, stageY + 30, targetW, portraitH, {
      alpha: 0.98,
      context: 'hero',
    });
    this.text(targetX + targetW - 6, stageY + stageH - 25, target.name, {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: layout.compressed ? '14px' : '16px',
      fontStyle: '900',
      color: CULLING_COLORS.inverseText,
      stroke: CULLING_COLORS.charcoal,
      strokeThickness: 4,
      align: 'right',
      wordWrap: { width: targetW - 8 },
    }).setOrigin(1, 0).setMaxLines(2);
  } else {
    const reticleX = targetX + targetW / 2;
    g.lineStyle(2, selectedSkill ? CULLING_COLORS.target : CULLING_COLORS.ivory, selectedSkill ? 0.96 : 0.26);
    g.strokeCircle(reticleX, centerY + 4, 28);
    g.beginPath();
    g.moveTo(reticleX - 38, centerY + 4);
    g.lineTo(reticleX - 18, centerY + 4);
    g.moveTo(reticleX + 18, centerY + 4);
    g.lineTo(reticleX + 38, centerY + 4);
    g.strokePath();
    this.mono(reticleX, centerY + 40, selectedSkill ? 'LEGAL TARGET' : 'TARGET', {
      color: selectedSkill ? CULLING_COLORS.target : '#D4D8E0',
      fontSize: '10px',
      fontStyle: '900',
    }).setOrigin(0.5, 0);
  }

  this.text(centerX, stageY + 7, prompt, {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: layout.compressed ? '13px' : '14px',
    fontStyle: '900',
    color: selectedSkill ? '#9AF7FF' : CULLING_COLORS.inverseText,
    stroke: CULLING_COLORS.charcoal,
    strokeThickness: 4,
    align: 'center',
    wordWrap: { width: stageW - 24 },
  }).setOrigin(0.5, 0);

  this.presentationLayerCall('renderTargetLane', {
    frame,
    layout,
    prompt,
    selectedSkill,
    centerX,
    centerY,
    ringRadius: 28,
  });
  this.renderReplayLine(frame, layout);
}

export function renderIdentityStrip(frame, layout, selected) {
  const x = layout.contentX;
  const y = layout.identityY;
  const w = layout.contentW;
  const h = layout.identityH;
  const selectedSkill = this.store.selectedSkill();
  const tone = selectedSkill ? CULLING_COLORS.target : selected ? CULLING_COLORS.gold : CULLING_COLORS.cobalt;
  const identityW = layout.identityW;
  const textX = x + identityW + 10;
  const textW = w - identityW - 18;

  this.graphics.fillStyle(CULLING_COLORS.shadow, 0.2);
  this.graphics.fillPoints(clippedPoints(x + 2, y + 3, w, h, 9), true);
  this.graphics.fillStyle(CULLING_COLORS.ivory, 0.97);
  this.graphics.fillPoints(clippedPoints(x, y, w, h, 9), true);
  this.graphics.fillStyle(CULLING_COLORS.cobalt, 0.94);
  this.graphics.fillPoints([
    { x, y },
    { x: x + identityW + 10, y },
    { x: x + identityW - 4, y: y + h },
    { x, y: y + h },
  ], true);
  this.graphics.fillStyle(tone, 0.96);
  this.graphics.fillRect(textX, y + h - 5, textW, 3);
  this.graphics.lineStyle(1.5, tone, 0.82);
  this.graphics.strokePoints(clippedPoints(x, y, w, h, 9), true);

  if (!selected) {
    this.text(textX, y + 12, 'CHOOSE YOUR FIGHTER', {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: '17px',
      fontStyle: '900',
      color: CULLING_COLORS.cobaltText,
    });
    this.mono(textX, y + 39, 'THEN CHOOSE ONE OF FOUR TECHNIQUES', {
      color: CULLING_COLORS.mutedText,
      fontSize: '12px',
      fontStyle: '700',
    });
    return;
  }

  this.renderPortraitPlate(selected, x + 3, y + 3, identityW - 8, h - 6, {
    alpha: 0.98,
    context: 'thumb',
  });
  this.mono(x + 7, y + 5, 'ACTIVE', {
    color: '#CDE6FF',
    fontSize: '10px',
    fontStyle: '900',
    backgroundColor: CULLING_COLORS.cobalt,
    padding: { x: 3, y: 2 },
  });

  const heading = selectedSkill ? selectedSkill.name : selected.name;
  const headingNode = this.text(textX, y + 7, heading, {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    color: selectedSkill ? '#007C84' : CULLING_COLORS.cobaltText,
    fontSize: frame.width < 380 ? '14px' : '16px',
    fontStyle: '900',
    lineSpacing: -2,
    wordWrap: { width: textW },
  });
  headingNode.setMaxLines(2);

  if (selectedSkill) {
    const cost = this.store.adjustedCost(selected, selectedSkill);
    const costLabel = cost.length ? cost.map((color) => ENERGY_LABELS[color] || 'X').join(' ') : 'FREE';
    const reason = this.store.skillDisabledReason(selected, selectedSkill);
    this.mono(textX, y + h - 24, reason
      ? reason.toUpperCase()
      : `${costLabel}  /  ${this.store.targetLabel(selectedSkill).toUpperCase()}  /  TAP CYAN TARGET`, {
      color: reason ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
      fontSize: frame.width < 380 ? '10px' : '12px',
      fontStyle: '900',
      wordWrap: { width: textW },
    }).setMaxLines(2);
  } else {
    this.mono(textX, y + h - 24, this.store.queuedSlots().has(Number(this.store.selectedCasterSlot))
      ? 'ACTION QUEUED / SELECT ANOTHER FIGHTER'
      : 'CHOOSE A TECHNIQUE BELOW', {
      color: CULLING_COLORS.mutedText,
      fontSize: '12px',
      fontStyle: '900',
    });
  }

  this.presentationLayerCall('renderSelectedFighter', {
    character: selected,
    region: { x, y, w: identityW, h },
    selectedSkill,
    queued: this.store.queuedSlots().has(Number(this.store.selectedCasterSlot)),
  });
}
