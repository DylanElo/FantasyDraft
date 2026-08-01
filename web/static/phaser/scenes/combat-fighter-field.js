import { CULLING_COLORS, TOKEN_TYPE } from '../core/runtime-config.js?v=43';
import { clamp, initials, shortText } from '../core/text.js?v=43';
import { clippedPoints } from '../core/shape.js?v=43';
import { eventTone } from '../fx/event-metrics.js?v=43';
import { activeStatuses, statusTone } from '../core/status-presentation.js?v=43';

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
      else if (!selectedSkill && side === 'mine') store.selectFighter(slot);
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
  const y = side === 'enemy' ? layout.enemyY : layout.allyY;
  (team || []).slice(0, 3).forEach((character, slot) => {
    const x = layout.contentX + slot * (layout.cardW + layout.gap);
    this.renderFighterPlate(character, side, slot, x, y, layout.cardW, layout.cardH);
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
  const g = this.graphics;
  const centerX = frame.x + frame.width / 2;
  const centerY = layout.fieldTop + layout.fieldH * 0.62;
  const selectedSkill = this.store.selectedSkill();
  const laneTone = CULLING_COLORS.target;
  const laneAlpha = selectedSkill ? 0.94 : 0.58;
  const laneTop = layout.fieldTop + 31;
  const laneBottom = layout.allyY - 5;
  const ringRadius = Math.min(42, Math.max(24, (layout.fieldH - 40) * 0.3));

  // Keep the center readable while making the combat route unmistakable:
  // a translucent cyan current rises from the active trio into a target
  // sigil, matching the vertical decision flow of the mobile reference.
  g.fillStyle(laneTone, selectedSkill ? 0.2 : 0.12);
  g.fillPoints([
    { x: centerX - 30, y: laneBottom },
    { x: centerX + 30, y: laneBottom },
    { x: centerX + 10, y: laneTop },
    { x: centerX - 10, y: laneTop },
  ], true);
  g.lineStyle(selectedSkill ? 3.5 : 2.5, laneTone, laneAlpha);
  g.beginPath();
  g.moveTo(centerX, laneBottom);
  g.lineTo(centerX, laneTop);
  g.strokePath();
  // The presentation layer owns the animated target sigil when a skill is
  // active. Keep only a quiet static center marker before targeting so the
  // same ring/arrow is never drawn twice over the battlefield.
  if (!selectedSkill) {
    g.fillStyle(CULLING_COLORS.ivory, 0.14);
    g.fillCircle(centerX, centerY, ringRadius + 7);
    g.lineStyle(2, laneTone, laneAlpha);
    g.strokeCircle(centerX, centerY, ringRadius);
    g.lineStyle(1, laneTone, laneAlpha * 0.62);
    g.strokeCircle(centerX, centerY, ringRadius + 8);
  }

  // The instruction floats in the world instead of sitting in a legacy
  // prompt panel. A short ink underline keeps it legible over the rooftop.
  const promptW = Math.min(292, frame.width - 44);
  const promptY = layout.fieldTop + 4;
  g.lineStyle(3, CULLING_COLORS.ivory, 0.72);
  g.beginPath();
  g.moveTo(centerX - promptW * 0.38, promptY + 18);
  g.lineTo(centerX + promptW * 0.38, promptY + 14);
  g.strokePath();
  g.lineStyle(1.5, laneTone, selectedSkill ? 0.98 : 0.72);
  g.beginPath();
  g.moveTo(centerX - promptW * 0.34, promptY + 20);
  g.lineTo(centerX + promptW * 0.34, promptY + 16);
  g.strokePath();
  this.text(centerX, promptY, prompt, {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: layout.compressed ? '13px' : '14px',
    fontStyle: '900',
    color: selectedSkill ? '#006B75' : CULLING_COLORS.cobaltText,
    stroke: CULLING_COLORS.inverseText,
    strokeThickness: 3,
    align: 'center',
    wordWrap: { width: promptW - 24 },
  }).setOrigin(0.5, 0);

  this.presentationLayerCall('renderTargetLane', {
    frame,
    layout,
    prompt,
    selectedSkill,
    centerX,
    centerY,
    ringRadius,
  });
  this.renderReplayLine(frame, layout);
  // Keep Q1/Q2/Q3 above fighter state chips, which occupy the band beginning
  // at allyY - 20. This gap remains readable in both Planning and Review.
  this.renderQueueMarks(frame, layout, layout.fieldBottom - 42);
}

export function renderIdentityStrip(frame, layout, selected) {
  const x = frame.x;
  const y = layout.identityY;
  const w = frame.width;
  const h = layout.identityH;
  const tone = selected ? CULLING_COLORS.gold : CULLING_COLORS.cobalt;
  const identityW = layout.identityW;
  const identityArtH = layout.identityH;

  if (selected) {
    this.portraitArtwork(selected, x - 8, y + 1, identityW + 35, identityArtH - 2, {
      context: 'hero',
      depth: -2,
      alpha: 0.98,
    });
    this.graphics.fillStyle(CULLING_COLORS.cobalt, 0.38);
    this.graphics.fillTriangle(x, y + 5, x + identityW + 18, y + identityArtH, x, y + identityArtH);
    this.graphics.fillStyle(CULLING_COLORS.cobalt, 0.9);
    this.graphics.fillPoints([
      { x, y: y + 8 },
      { x: x + identityW + 12, y: y + 2 },
      { x: x + identityW + 4, y: y + identityArtH },
      { x, y: y + identityArtH },
    ], true);
  } else {
    this.graphics.fillStyle(CULLING_COLORS.cobalt, 0.72);
    this.graphics.fillTriangle(x, y, x + identityW + 18, y + identityArtH, x, y + identityArtH);
  }

  // A single editorial slash carries selection guidance. There is no
  // full-width command panel behind the character art or technique cards.
  this.graphics.fillStyle(CULLING_COLORS.ivory, 0.93);
  this.graphics.fillPoints([
    { x: x + identityW - 10, y: y + 8 },
    { x: x + w, y },
    { x: x + w, y: y + h - 6 },
    { x: x + identityW + 3, y: y + h },
  ], true);
  this.graphics.fillStyle(tone, 0.86);
  this.graphics.fillRect(x + identityW - 4, y + h - 4, w - identityW + 4, 3);

  if (!selected) {
    this.text(x + identityW + 10, y + 10, 'SELECT A FIGHTER', {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: '16px',
      fontStyle: '900',
      color: CULLING_COLORS.cobaltText,
    });
    this.mono(x + identityW + 11, y + 31, 'TAP ONE OF THE THREE ALLY PORTRAITS', {
      color: CULLING_COLORS.cobaltText,
      fontSize: '12px',
      fontStyle: '700',
    });
    return;
  }

  this.mono(x + 8, y + 5, 'SELECTED FIGHTER', {
    color: '#CDE6FF',
    fontSize: '10px',
    fontStyle: '700',
  });
  const identityName = this.text(x + 8, y + 19, selected.name, {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: frame.width < 380 ? '12px' : '13px',
    fontStyle: '900',
    color: CULLING_COLORS.inverseText,
    lineSpacing: -2,
    wordWrap: { width: identityW - 12 },
  });
  identityName.setMaxLines(2);
  const selectedSkill = this.store.selectedSkill();
  const instruction = selectedSkill
    ? `TARGET / ${this.store.targetLabel(selectedSkill).toUpperCase()}`
    : this.store.queuedSlots().has(Number(this.store.selectedCasterSlot))
      ? 'ORDER COMMITTED'
      : 'CHOOSE TECHNIQUE';
  this.text(x + identityW + 8, y + 11, instruction, {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    color: selectedSkill ? '#007C84' : CULLING_COLORS.cobaltText,
    fontSize: frame.width < 380 ? '12px' : '14px',
    fontStyle: '900',
    wordWrap: { width: frame.width - identityW - 108 },
  });

  const queueX = x + w - 82;
  this.mono(queueX, y + 5, 'ORDER', {
    color: CULLING_COLORS.mutedText,
    fontSize: '10px',
    fontStyle: '700',
  });
  [0, 1, 2].forEach((index) => {
    const filled = index < this.store.actions.length;
    const cx = queueX + 9 + index * 22;
    const cy = y + 29;
    this.graphics.fillStyle(filled ? CULLING_COLORS.queued : CULLING_COLORS.concrete, filled ? 0.94 : 0.62);
    this.graphics.fillPoints([
      { x: cx, y: cy - 8 },
      { x: cx + 10, y: cy },
      { x: cx, y: cy + 8 },
      { x: cx - 10, y: cy },
    ], true);
    this.mono(cx, cy - 4, String(index + 1), {
      color: filled ? CULLING_COLORS.inverseText : CULLING_COLORS.mutedText,
      fontSize: '10px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
  });

  this.presentationLayerCall('renderSelectedFighter', {
    character: selected,
    region: { x, y, w: identityW + 18, h: identityArtH },
    selectedSkill,
    queued: this.store.queuedSlots().has(Number(this.store.selectedCasterSlot)),
  });
}
