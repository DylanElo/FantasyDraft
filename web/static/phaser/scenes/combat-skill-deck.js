import { CULLING_COLORS, ENERGY_COLORS, ENERGY_LABELS, TOKEN_TYPE } from '../core/runtime-config.js?v=43';
import { clamp, safeText } from '../core/text.js?v=43';
import { clippedPoints } from '../core/shape.js?v=43';
import { SKILL_ART_BY_ENERGY } from '../core/asset-registry.js?v=43';
import { Season3UI } from '../ui/season3-ui.js?v=43';

const {
  button: drawCurrentButton,
  energyPip: drawEnergyPip,
} = Season3UI.current;

const COMPACT_DISABLED_REASONS = Object.freeze([
  [': this skill class is disabled.', 'Skill class disabled.'],
  [': harmful skills are disabled.', 'Harmful skills disabled.'],
  [': ally skills are disabled.', 'Ally skills disabled.'],
  [': non-damaging skills are disabled.', 'Non-damaging skills disabled.'],
  [': counters are disabled.', 'Counters disabled.'],
]);

// Re-exported from combat-scene.js (`export { compactSkillCardDisabledReason }
// from './combat-skill-deck.js?v=43';`) because
// tests/test_phaser_authority_readability.py dynamically imports the
// combat-scene module itself and destructures this function off it.
export function compactSkillCardDisabledReason(reason) {
  const fullReason = safeText(reason, 'Unavailable.');
  const compact = COMPACT_DISABLED_REASONS.find(([suffix]) => fullReason.endsWith(suffix));
  return compact ? compact[1] : fullReason;
}

function stableHash(value) {
  return safeText(value).split('').reduce((total, char) => ((total * 33) ^ char.charCodeAt(0)) >>> 0, 2166136261);
}

// Called via `.call(this, ...)` from a one-line delegator method on
// CombatScene -- see web/static/phaser/scenes/combat-sheets.js's docstring
// for why (keeps every `this.store`/`this.mono` reference identical to the
// method bodies this was extracted from, which several
// `tests/test_phaser_*.py` checks assert as literal source text).

export function renderIntegratedSkillArtwork(skill, region, options = {}) {
  const layer = this.presentationLayer;
  if (!layer || typeof layer.skillVisualFor !== 'function') return false;
  const visual = layer.skillVisualFor(skill, {
    context: options.context || 'combat-card',
    slot: options.slot,
    cost: options.cost || [],
    caster: options.caster || null,
  });
  if (!visual) return false;
  if (typeof layer.renderSkillVisual === 'function') {
    const artDepth = options.depth === undefined ? -1 : options.depth;
    const iconDepth = options.iconDepth == null
      ? (artDepth >= 0 ? Math.min(0.9, artDepth + 0.25) : 0)
      : options.iconDepth;
    return layer.renderSkillVisual(this, visual, region, {
      ...options,
      depth: artDepth,
      iconDepth,
    }) !== false;
  }
  const textureKey = typeof visual === 'string' ? visual : visual.textureKey;
  if (!textureKey || !this.textures.exists(textureKey)) return false;
  this.coverImage(textureKey, region.x, region.y, region.w, region.h, {
    focal: visual.focal || options.focal || { x: 0.5, y: 0.45 },
    depth: options.depth === undefined ? -1 : options.depth,
    alpha: options.alpha === undefined ? 1 : options.alpha,
  });
  return true;
}

export function renderTechniqueArtwork(skill, index, x, y, w, h, tone, disabled, cost, selected = false) {
  const g = this.graphics;
  const seed = stableHash(skill.id || skill.name || String(index));
  const cx = x + w / 2;
  const cy = y + h * 0.52;
  const semanticCost = (cost || []).find((color) => color !== 'black') || 'white';
  const integrated = this.renderIntegratedSkillArtwork(skill, { x, y, w, h }, {
    context: 'planning-card',
    slot: index,
    cost,
    focal: { x: 0.5, y: 0.45 },
    depth: -1,
    alpha: disabled ? 0.42 : 1,
    disabled,
    state: disabled ? 'disabled' : selected ? 'selected' : 'available',
    sheen: selected,
  });
  if (integrated) {
    g.fillStyle(CULLING_COLORS.cobalt, disabled ? 0.3 : 0.06);
    g.fillRect(x, y, w, h);
    g.lineStyle(1.5, tone, disabled ? 0.18 : 0.72);
    g.beginPath();
    g.moveTo(x + 4, y + h - 5);
    g.lineTo(x + w - 4, y + 5);
    g.strokePath();
    return;
  }
  const textureKey = SKILL_ART_BY_ENERGY[semanticCost] || 's3-skill-focus';
  if (this.textures.exists(textureKey)) {
    this.coverImage(textureKey, x, y, w, h, {
      focal: { x: 0.5, y: 0.43 },
      depth: -1,
      alpha: disabled ? 0.42 : 0.98,
    });
    g.fillStyle(CULLING_COLORS.cobalt, disabled ? 0.28 : 0.08);
    g.fillRect(x, y, w, h);
    g.lineStyle(1.5, tone, disabled ? 0.18 : 0.58);
    g.beginPath();
    g.moveTo(x + 5, y + h - 7);
    g.lineTo(x + w - 5, y + 7);
    g.strokePath();
    return;
  }
  g.fillStyle(CULLING_COLORS.cobalt, disabled ? 0.42 : 0.96);
  g.fillRect(x, y, w, h);
  g.fillStyle(tone, disabled ? 0.1 : 0.18);
  if (seed % 3 === 0) g.fillCircle(cx, cy, Math.min(w, h) * 0.38);
  else if (seed % 3 === 1) g.fillTriangle(x, y + h, x + w, y + h * 0.18, x + w, y + h);
  else g.fillTriangle(x, y, x + w, y, x + w * 0.2, y + h);

  const strokeCount = 4 + (seed % 3);
  for (let line = 0; line < strokeCount; line += 1) {
    const drift = ((seed >>> (line * 3)) & 7) - 3;
    const startX = x + 8 + line * ((w - 16) / Math.max(1, strokeCount - 1));
    g.lineStyle(line % 2 ? 1 : 2, line % 2 ? CULLING_COLORS.ivory : tone, disabled ? 0.14 : 0.68);
    g.beginPath();
    g.moveTo(startX, y + h - 8);
    g.lineTo(cx + drift * 2, cy + drift);
    g.lineTo(x + w - 7 - line * 3, y + 7 + line * 2);
    g.strokePath();
  }
  g.lineStyle(2, tone, disabled ? 0.18 : 0.82);
  g.strokeCircle(cx, cy, Math.min(22, w * 0.24));
  g.lineStyle(1, CULLING_COLORS.ivory, disabled ? 0.12 : 0.44);
  g.strokeCircle(cx, cy, Math.min(30, w * 0.32));
  this.text(cx, cy - 16, ENERGY_LABELS[(this.store.adjustedCost(null, skill) || [])[0]] || String(index + 1), {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: `${Math.max(24, Math.round(w * 0.34))}px`,
    fontStyle: '900',
    color: disabled ? '#9A9DA3' : CULLING_COLORS.inverseText,
  }).setOrigin(0.5, 0);
}

export function skillPresentation(skill, caster) {
  const cooldown = this.store.skillCooldown(caster, skill);
  const ruleReason = this.store.skillDisabledReason(caster, skill);
  const fit = { ok: !ruleReason, reason: ruleReason };
  const queuedIndex = this.store.actions.findIndex((action) => Number(action.caster_slot) === Number(this.store.selectedCasterSlot));
  const casterQueued = queuedIndex >= 0;
  const locked = this.store.controlsLocked();
  const disabled = !!ruleReason || casterQueued || locked;
  let reason = '';
  if (cooldown > 0) reason = `COOLDOWN ${cooldown}`;
  else if (ruleReason) reason = ruleReason;
  else if (casterQueued) reason = 'FIGHTER QUEUED';
  else if (locked) reason = 'CONTROLS LOCKED';
  return { cooldown, fit, ruleReason, casterQueued, queuedIndex, locked, disabled, reason };
}

export function renderSkillButton(skill, caster, index, x, y, w, h) {
  const state = this.skillPresentation(skill, caster);
  const selected = this.store.selectedSkillId === skill.id;
  const cost = this.store.adjustedCost(caster, skill);
  const firstCost = cost[0];
  const tone = selected ? CULLING_COLORS.selected : (ENERGY_COLORS[firstCost] || CULLING_COLORS.cobalt);
  const artW = clamp(Math.round(w * 0.3), 48, 58);
  const contentX = x + artW + 7;
  const contentW = Math.max(72, w - artW - 12);

  this.graphics.fillStyle(CULLING_COLORS.shadow, selected ? 0.28 : 0.16);
  this.graphics.fillPoints(clippedPoints(x + 2, y + 4, w, h, 7), true);
  this.graphics.fillStyle(CULLING_COLORS.ivory, state.disabled ? 0.82 : 0.98);
  this.graphics.fillPoints(clippedPoints(x, y, w, h, 7), true);
  this.renderTechniqueArtwork(skill, index, x + 2, y + 2, artW, h - 4, tone, state.disabled, cost, selected);
  this.graphics.fillStyle(CULLING_COLORS.ivory, state.disabled ? 0.88 : 0.97);
  this.graphics.fillPoints([
    { x: x + artW - 4, y: y + 2 },
    { x: x + w - 2, y: y + 2 },
    { x: x + w - 2, y: y + h - 2 },
    { x: x + artW + 3, y: y + h - 2 },
  ], true);
  this.graphics.fillStyle(tone, selected ? 0.98 : state.disabled ? 0.3 : 0.76);
  this.graphics.fillRect(x + artW, y + 2, 3, h - 4);
  this.graphics.lineStyle(selected ? 3 : 1.25, tone, state.disabled ? 0.34 : selected ? 1 : 0.86);
  this.graphics.strokePoints(clippedPoints(x, y, w, h, 7), true);

  const numberX = x + 12;
  const numberY = y + 12;
  // Gap 1: cooldown badge — Aged Gold CD chip replaces the plain diamond fill
  // when the skill is on cooldown so players can scan remaining turns at a glance.
  const hasCooldown = state.cooldown > 0;
  this.graphics.fillStyle(
    hasCooldown ? CULLING_COLORS.gold : (selected ? CULLING_COLORS.gold : CULLING_COLORS.charcoal),
    0.96,
  );
  this.graphics.fillPoints([
    { x: numberX, y: numberY - 9 },
    { x: numberX + 9, y: numberY },
    { x: numberX, y: numberY + 9 },
    { x: numberX - 9, y: numberY },
  ], true);
  if (hasCooldown) {
    // Two-line CD badge inside the Aged Gold diamond: "CD" label + count.
    // Both lines must be ≥ 10px per the mobile typography contract.
    this.mono(numberX, numberY - 9, 'CD', {
      color: CULLING_COLORS.text,
      fontSize: '10px',
      fontStyle: '900',
    }).setOrigin(0.5, 0);
    this.mono(numberX, numberY - 1, String(state.cooldown), {
      color: CULLING_COLORS.text,
      fontSize: '10px',
      fontStyle: '900',
    }).setOrigin(0.5, 0);
  } else {
    this.mono(numberX, numberY - 5, String(index + 1), {
      color: selected ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
      fontSize: '10px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
  }

  if (skill.effective_skill_id || state.casterQueued) {
    const ribbonW = artW - 4;
    const ribbonLabel = skill.effective_skill_id
      ? state.casterQueued ? `REPLACED / Q${state.queuedIndex + 1}` : 'REPLACED'
      : `QUEUED Q${state.queuedIndex + 1}`;
    this.graphics.fillStyle(skill.effective_skill_id ? CULLING_COLORS.vermilion : CULLING_COLORS.queued, 0.94);
    this.graphics.fillRect(x + 2, y + h - 37, ribbonW, 17);
    const ribbonNode = this.text(x + 2 + ribbonW / 2, y + h - 35, ribbonLabel, {
      fontFamily: TOKEN_TYPE.mono || 'monospace',
      color: CULLING_COLORS.inverseText,
      fontSize: '10px',
      fontStyle: '700',
      align: 'center',
      wordWrap: { width: ribbonW - 4 },
    }).setOrigin(0.5, 0);
    ribbonNode.setMaxLines(1);
  }

  const skillName = this.text(contentX, y + 5, skill.name, {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: '12px',
    fontStyle: '900',
    color: state.disabled ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
    align: 'left',
    lineSpacing: -1,
    wordWrap: { width: contentW },
  });
  skillName.setMaxLines(2);

  // Gap 2: class tags — show up to 2 abbreviated class names on available cards
  // so players can quickly identify PIERCING, COUNTER, DOMAIN, etc. in the grid.
  const classTags = (skill.classes || []).slice(0, 2);
  if (classTags.length && !state.disabled && !selected && h >= 158) {
    const tagLine = classTags.map((c) => String(c).toUpperCase()).join('  ·  ');
    this.mono(contentX, y + 29, tagLine, {
      color: CULLING_COLORS.mutedText,
      fontSize: '10px',
      fontStyle: '700',
      wordWrap: { width: contentW },
    }).setMaxLines(1);
  }
  // Gap 3: split "StatusName: reason." into two card lines.
  const ruleReasonParts = (state.ruleReason && state.ruleReason.includes(': ')) ? state.ruleReason.split(': ') : null;
  const statusLine2 = ruleReasonParts ? compactSkillCardDisabledReason(state.ruleReason) : '';
  const statusTone = state.disabled ? (ruleReasonParts ? '#C8B07A' : CULLING_COLORS.redText) : selected ? CULLING_COLORS.text : CULLING_COLORS.cobaltText;
  const statusRowY = state.disabled ? y + 31 : (classTags.length && !selected && h >= 158) ? y + 41 : y + 31;
  const statusLine = state.disabled
    ? ruleReasonParts ? ruleReasonParts[0].toUpperCase() : compactSkillCardDisabledReason(state.reason)
    : selected ? 'SELECTED / TAP AGAIN FOR INFO' : `${this.store.targetLabel(skill).toUpperCase()} / READY`;
  const reasonNode = this.text(contentX, statusRowY, statusLine, {
    fontFamily: TOKEN_TYPE.mono || 'monospace',
    fontSize: '12px',
    fontStyle: '800',
    color: statusTone,
    align: 'left',
    lineSpacing: state.disabled ? -4 : -2,
    wordWrap: { width: contentW },
  });
  reasonNode.setMaxLines(state.disabled ? 4 : 3);
  // Selection highlight drawn after the text node so it appears behind it.
  if (selected && !state.disabled) {
    this.graphics.fillStyle(CULLING_COLORS.gold, 0.22);
    this.graphics.fillRect(contentX - 3, statusRowY - 2, contentW + 3, Math.max(22, h - statusRowY + y - 16));
  }
  if (statusLine2) {
    const reason2Node = this.text(contentX, statusRowY + 14, statusLine2, {
      fontFamily: TOKEN_TYPE.mono || 'monospace',
      fontSize: '12px',
      fontStyle: '800',
      color: CULLING_COLORS.redText,
      align: 'left',
      lineSpacing: -4,
      wordWrap: { width: contentW },
    });
    reason2Node.setMaxLines(3);
  }

  const pipY = y + h - 10;
  const pipCount = Math.max(1, cost.length);
  const pipGap = Math.min(12, (artW - 14) / pipCount);
  const pipStart = x + 2 + artW / 2 - ((pipCount - 1) * pipGap) / 2;
  this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.78);
  this.graphics.fillRect(x + 2, y + h - 20, artW, 18);
  if (!cost.length) {
    this.mono(x + 2 + artW / 2, pipY - 4, 'FREE', {
      color: CULLING_COLORS.inverseText,
      fontSize: '10px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
  }
  cost.forEach((color, costIndex) => {
    const px = pipStart + costIndex * pipGap;
    drawEnergyPip(this, px, pipY, color, {
      backingColor: CULLING_COLORS.charcoal,
      backingAlpha: 0.22,
      backingRadius: 6,
      radius: 4.8,
      fillAlpha: state.disabled ? 0.34 : color === 'white' ? 0.94 : 0.98,
      strokeRadius: 5.6,
      strokeAlpha: 0.82,
      label: ENERGY_LABELS[color] || 'X',
      labelFontStyle: '700',
      labelOffsetY: -4.7,
    });
  });

  const costLabel = cost.length ? cost.map((color) => ENERGY_LABELS[color] || 'X').join(' ') : 'FREE';

  this.registerHitTarget(
    x,
    y,
    w,
    h,
    state.disabled
      ? `Inspect technique slot ${index + 1}, ${skill.name}, cost ${costLabel}: ${state.reason}`
      : `Technique slot ${index + 1}, ${skill.name}, cost ${costLabel}`,
    () => {
      this.presentationLayerCall('interactionCue', {
        cue: selected || state.disabled ? 'skill-inspect' : 'skill-select',
        skill,
        caster,
        slot: index,
      });
      if (selected || state.disabled) this.store.openSkillDetail(skill.id);
      else this.store.selectSkill(skill.id);
    },

    {
      onLongPress: () => {
        this.presentationLayerCall('interactionCue', {
          cue: 'skill-inspect',
          skill,
          caster,
          slot: index,
        });
        this.store.openSkillDetail(skill.id);
      },
    },
  );

  drawCurrentButton(this, x + w - 28, y - 2, 26, 26, 'i', () => this.store.openSkillDetail(skill.id), {
    fill: CULLING_COLORS.concrete,
    stroke: tone,
    color: CULLING_COLORS.text,
    fontSize: '14px',
    radius: 13,
  });
}

export function renderBottomActions(frame, layout) {
  const x = frame.x + 6;
  const y = layout.reviewY;
  const h = layout.reviewH;
  const sideW = frame.width < 380 ? 50 : 54;
  const gap = 4;
  const reviewX = x + sideW + gap;
  const reviewW = frame.width - 12 - sideW * 2 - gap * 2;
  const passX = reviewX + reviewW + gap;
  const controlsLocked = this.store.controlsLocked();
  const clearDisabled = !this.store.actions.length || controlsLocked;
  const reviewDisabled = !this.store.actions.length || controlsLocked;
  const passDisabled = controlsLocked;
  const lockedReason = 'Planning controls are locked during the current phase.';

  const drawAction = (bx, bw, label, tone, disabled, disabledReason, onClick, hitLabel) => {
    this.graphics.fillStyle(CULLING_COLORS.shadow, disabled ? 0.06 : 0.16);
    this.graphics.fillPoints(clippedPoints(bx + 1, y + 3, bw, h - 3, 7), true);
    this.graphics.fillStyle(disabled ? CULLING_COLORS.concrete : CULLING_COLORS.ivory, disabled ? 0.74 : 0.97);
    this.graphics.fillPoints(clippedPoints(bx, y, bw, h - 4, 7), true);
    this.graphics.lineStyle(1.5, disabled ? CULLING_COLORS.muted : tone, disabled ? 0.3 : 0.88);
    this.graphics.strokePoints(clippedPoints(bx, y, bw, h - 4, 7), true);
    this.mono(bx + bw / 2, y + 15, label, {
      color: disabled ? CULLING_COLORS.mutedText : tone === CULLING_COLORS.vermilion ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
      fontSize: '12px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
    this.registerHitTarget(bx, y, bw, h - 4, hitLabel, onClick, {
      disabled,
      disabledReason,
      accessibilityId: `combat-${hitLabel.toLowerCase().replaceAll(' ', '-')}`,
    });
  };

  drawAction(x, sideW, 'CLEAR', CULLING_COLORS.vermilion, clearDisabled, controlsLocked ? lockedReason : 'There are no queued actions to clear.', () => {
    this.presentationLayerCall('interactionCue', { cue: 'queue-clear' });
    this.store.cancelQueue();
  }, 'Clear queue');
  drawAction(passX, sideW, 'PASS', CULLING_COLORS.cobalt, passDisabled, lockedReason, () => {
    this.presentationLayerCall('interactionCue', { cue: 'turn-pass' });
    this.store.endTurn();
  }, 'Pass turn');

  const reviewTone = this.store.actions.length ? CULLING_COLORS.cobalt : CULLING_COLORS.concrete;
  this.graphics.fillStyle(CULLING_COLORS.shadow, reviewDisabled ? 0.08 : 0.22);
  this.graphics.fillPoints([
    { x: reviewX + 12, y: y + 3 },
    { x: reviewX + reviewW - 12, y: y + 3 },
    { x: reviewX + reviewW, y: y + h / 2 + 2 },
    { x: reviewX + reviewW - 12, y: y + h - 1 },
    { x: reviewX + 12, y: y + h - 1 },
    { x: reviewX, y: y + h / 2 + 2 },
  ], true);
  this.graphics.fillStyle(reviewDisabled ? CULLING_COLORS.ivory : CULLING_COLORS.cobalt, 0.98);
  this.graphics.fillPoints([
    { x: reviewX + 12, y },
    { x: reviewX + reviewW - 12, y },
    { x: reviewX + reviewW, y: y + h / 2 },
    { x: reviewX + reviewW - 12, y: y + h - 4 },
    { x: reviewX + 12, y: y + h - 4 },
    { x: reviewX, y: y + h / 2 },
  ], true);
  this.graphics.lineStyle(2, reviewDisabled ? CULLING_COLORS.muted : reviewTone, reviewDisabled ? 0.34 : 0.96);
  this.graphics.strokePoints([
    { x: reviewX + 12, y },
    { x: reviewX + reviewW - 12, y },
    { x: reviewX + reviewW, y: y + h / 2 },
    { x: reviewX + reviewW - 12, y: y + h - 4 },
    { x: reviewX + 12, y: y + h - 4 },
    { x: reviewX, y: y + h / 2 },
  ], true);
  this.graphics.fillStyle(reviewDisabled ? CULLING_COLORS.muted : CULLING_COLORS.gold, reviewDisabled ? 0.2 : 0.96);
  this.graphics.fillTriangle(reviewX + 16, y + h / 2, reviewX + 25, y + 11, reviewX + 25, y + h - 15);
  this.graphics.fillTriangle(reviewX + reviewW - 16, y + h / 2, reviewX + reviewW - 25, y + 11, reviewX + reviewW - 25, y + h - 15);
  this.text(reviewX + reviewW / 2, y + 10, this.store.queueSubmitting ? 'RESOLVING' : `REVIEW ${this.store.actions.length}/3`, {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: frame.width < 380 ? '17px' : '19px',
    fontStyle: '900',
    color: reviewDisabled ? CULLING_COLORS.mutedText : CULLING_COLORS.inverseText,
  }).setOrigin(0.5, 0);
  this.mono(reviewX + reviewW / 2, y + h - 17, 'ORDER / WILD / CONFIRM', {
    color: reviewDisabled ? CULLING_COLORS.mutedText : '#CDE6FF',
    fontSize: '12px',
    fontStyle: '700',
  }).setOrigin(0.5, 0);
  this.registerHitTarget(reviewX, y, reviewW, h - 4, 'Review queue', () => {
    this.presentationLayerCall('interactionCue', { cue: 'queue-review-open', queueSize: this.store.actions.length });
    this.store.openQueueReview();
  }, {
    disabled: reviewDisabled,
    disabledReason: controlsLocked ? lockedReason : 'Queue at least one action before review.',
    accessibilityId: 'review-queue',
  });
}

export function renderMiniTimeline(frame, layout) {
  const state = this.store.state;
  if (!state || !['planning', 'queue_review'].includes(state.phase)) return;

  const actions = this.store.actions || [];
  if (actions.length === 0) return;

  const me = state.players[this.store.mineId()];
  if (!me || !me.team) return;

  const y = layout.timelineY;
  const h = layout.timelineH;
  const chipW = 76;
  const gap = 12;
  const totalW = actions.length * chipW + (actions.length - 1) * gap;
  const startX = frame.x + (frame.width - totalW) / 2;

  this.mono(frame.x + frame.width / 2, y - 6, 'QUEUE', {
    color: CULLING_COLORS.mutedText,
    fontSize: '10px',
    fontStyle: '700',
  }).setOrigin(0.5, 1);

  actions.forEach((action, index) => {
    const x = startX + index * (chipW + gap);
    const caster = me.team[action.caster_slot];
    const skill = this.store.skillFor(caster, action.skill_id);

    const tone = skill ? (ENERGY_COLORS[skill.cost ? skill.cost[0] : 'white'] || CULLING_COLORS.cobalt) : CULLING_COLORS.cobalt;

    this.graphics.fillStyle(CULLING_COLORS.shadow, 0.2);
    this.graphics.fillPoints(clippedPoints(x + 2, y + 2, chipW, h, 6), true);

    this.graphics.fillStyle(tone, 0.15);
    this.graphics.fillPoints(clippedPoints(x, y, chipW, h, 6), true);
    this.graphics.lineStyle(1.5, tone, 0.6);
    this.graphics.strokePoints(clippedPoints(x, y, chipW, h, 6), true);

    if (caster) {
      this.renderPortraitPlate(caster, x + 4, y + 4, h - 8, h - 8, { alpha: 0.9, context: 'thumb' });
    }

    this.graphics.fillStyle(tone, 0.8);
    this.graphics.fillCircle(x + h, y + h / 2, 2.5);
    this.graphics.lineStyle(1.5, tone, 0.8);
    this.graphics.beginPath();
    this.graphics.moveTo(x + h + 2, y + h / 2);
    this.graphics.lineTo(x + h + 10, y + h / 2);
    this.graphics.strokePath();
    this.graphics.beginPath();
    this.graphics.moveTo(x + h + 7, y + h / 2 - 3);
    this.graphics.lineTo(x + h + 10, y + h / 2);
    this.graphics.lineTo(x + h + 7, y + h / 2 + 3);
    this.graphics.strokePath();

    if (action.target_player_id && action.target_slot !== undefined && action.target_slot !== null) {
      const targetSide = action.target_player_id === this.store.mineId() ? 'mine' : 'enemy';
      const targetState = targetSide === 'mine' ? me : state.players[this.store.enemyId()];
      if (targetState && targetState.team) {
        const target = targetState.team[action.target_slot];
        if (target) {
          this.renderPortraitPlate(target, x + chipW - h + 4, y + 4, h - 8, h - 8, { alpha: 0.9, context: 'thumb' });
        }
      }
    } else {
      this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.5);
      this.graphics.fillCircle(x + chipW - h / 2, y + h / 2, Math.max(6, (h - 8) / 2));
    }

    this.registerHitTarget(x, y, chipW, h, 'Review queue', () => {
      this.presentationLayerCall('interactionCue', { cue: 'target-select' });
      this.store.openQueueReview();
    });
  });
}

export function renderCommandDeck(frame, layout, selected) {
  this.renderIdentityStrip(frame, layout, selected);
  if (selected) {
    this.store.skillsFor(selected).slice(0, 4).forEach((skill, index) => {
      const column = index % layout.skillColumns;
      const row = Math.floor(index / layout.skillColumns);
      const x = layout.skillX + column * (layout.skillW + layout.skillGap);
      const y = layout.skillY + row * (layout.skillCardH + layout.skillGap);
      this.renderSkillButton(skill, selected, index, x, y, layout.skillW, layout.skillCardH);
    });
  } else {
    [0, 1, 2, 3].forEach((index) => {
      const column = index % layout.skillColumns;
      const row = Math.floor(index / layout.skillColumns);
      const x = layout.skillX + column * (layout.skillW + layout.skillGap);
      const y = layout.skillY + row * (layout.skillCardH + layout.skillGap);
      this.graphics.fillStyle(CULLING_COLORS.ivory, 0.74);
      this.graphics.fillPoints(clippedPoints(x, y, layout.skillW, layout.skillCardH, 8), true);
      this.graphics.lineStyle(1, CULLING_COLORS.charcoal, 0.2);
      this.graphics.strokePoints(clippedPoints(x, y, layout.skillW, layout.skillCardH, 8), true);
      this.mono(x + layout.skillW / 2, y + layout.skillCardH / 2 - 5, `SLOT ${index + 1}`, {
        color: CULLING_COLORS.mutedText,
        fontSize: '10px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
    });
  }
  this.renderBottomActions(frame, layout);
}
