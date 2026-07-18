import { COLORS, CULLING_COLORS, ENERGY_COLORS, ENERGY_LABELS, TOKEN_TYPE } from '../core/runtime-config.js?v=32';
import { clamp, initials, safeText, shortText, titleize } from '../core/text.js?v=32';
import { eventTone } from '../fx/event-metrics.js?v=32';
import { drawCurrentButton, drawCurrentPanel, drawCurrentWorld } from '../ui/culling-current-ui.js?v=32';
import { CombatQueueReviewScene } from './combat-queue-review-scene.js?v=32';

const WORLD_KEY = 'culling-current-rooftop';
const LOCATION_LINE = 'TOKYO MUNICIPAL ROOFTOP';

function clippedPoints(x, y, w, h, cut = 8) {
  return [
    { x: x + cut, y },
    { x: x + w, y },
    { x: x + w, y: y + h - cut },
    { x: x + w - cut, y: y + h },
    { x, y: y + h },
    { x, y: y + cut },
  ];
}

function clockLabel(seconds) {
  if (!Number.isFinite(seconds)) return '--:--';
  const remaining = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(remaining / 60);
  return `${String(minutes).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
}

function stableHash(value) {
  return safeText(value).split('').reduce((total, char) => ((total * 33) ^ char.charCodeAt(0)) >>> 0, 2166136261);
}

export class CombatScene extends CombatQueueReviewScene {
  constructor() {
    super('CombatScene');
  }

  renderIntegratedSkillArtwork(skill, region, options = {}) {
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

  combatLayout(frame) {
    const usableH = frame.bottom - frame.top;
    const compressed = usableH < 740;
    const compact = usableH < 830;
    const topH = compressed ? 54 : 56;
    const reviewH = compressed ? 50 : 54;
    const reviewY = frame.bottom - reviewH;
    const skillH = clamp(Math.round(usableH * 0.21), compressed ? 158 : 164, frame.height > 900 ? 194 : 178);
    const skillY = reviewY - skillH - 6;
    const identityH = 48;
    const identityY = skillY - identityH;
    const cardH = clamp(Math.round(usableH * 0.16), compressed ? 118 : 126, frame.height > 900 ? 148 : 138);
    const enemyY = frame.top + topH + (compressed ? 28 : compact ? 58 : 68);
    const allyY = identityY - cardH - 6;
    const contentX = frame.x + (frame.width < 380 ? 12 : 15);
    const contentW = frame.width - (contentX - frame.x) * 2;
    const gap = frame.width < 380 ? 7 : 9;
    const cardW = (contentW - gap * 2) / 3;
    const identityW = clamp(Math.round(frame.width * 0.245), 86, 106);
    const skillX = frame.x + identityW - 7;
    const skillGap = 4;
    const skillRight = frame.x + frame.width - 8;
    const skillW = (skillRight - skillX - skillGap * 3) / 4;
    return {
      usableH,
      compressed,
      compact,
      topH,
      contentX,
      contentW,
      gap,
      cardW,
      cardH,
      enemyY,
      allyY,
      fieldTop: enemyY + cardH + 2,
      fieldBottom: allyY - 2,
      fieldH: Math.max(96, allyY - enemyY - cardH - 4),
      identityY,
      identityH,
      identityW,
      dockY: identityY,
      skillX,
      skillY,
      skillW,
      skillH,
      skillGap,
      reviewY,
      reviewH,
    };
  }

  renderWorld(frame) {
    drawCurrentWorld(this, frame, WORLD_KEY, {
      topWash: 0.04,
      bottomWash: 0.42,
      bottomHeight: Math.round(frame.height * 0.32),
      accents: false,
    });
    const g = this.graphics;
    // A few raw print cuts bind the controls to the painted rooftop without
    // covering the open targeting lane.
    g.lineStyle(2, CULLING_COLORS.cyan, 0.12);
    g.beginPath();
    g.moveTo(frame.x - 8, frame.top + 92);
    g.lineTo(frame.x + frame.width * 0.48, frame.top + 76);
    g.lineTo(frame.x + frame.width + 8, frame.top + 90);
    g.strokePath();
    g.lineStyle(2, CULLING_COLORS.vermilion, 0.1);
    g.beginPath();
    g.moveTo(frame.x + frame.width * 0.58, frame.top + 116);
    g.lineTo(frame.x + frame.width + 12, frame.top + 104);
    g.strokePath();
  }

  renderTopHud(frame, state, me, layout) {
    const g = this.graphics;
    const x = frame.x;
    const y = frame.top;
    const w = frame.width;
    const h = layout.topH;
    const mine = this.store.isMyTurn();
    const queueCount = this.store.actions.length;
    const phaseSeconds = Number(state.phase_seconds_remaining);
    const disconnectSeconds = this.store.disconnectSecondsRemaining();
    const warning = this.store.connectionState === 'disconnected'
      ? 'OFFLINE'
      : disconnectSeconds !== null
        ? `PAUSED ${disconnectSeconds}S`
        : null;
    const moveLabel = warning
      || (this.store.queueSubmitting
        ? 'RESOLVING'
        : this.store.queueReviewOpen
          ? 'QUEUE REVIEW'
          : this.store.controlsLocked()
            ? 'ENEMY MOVE'
            : queueCount
              ? 'ORDERS OPEN'
              : 'YOUR MOVE');

    const turnW = frame.width < 380 ? 68 : 76;
    const moveW = frame.width < 380 ? 94 : 106;
    const clockW = frame.width < 380 ? 78 : 86;
    const energyW = w - turnW - moveW - clockW;
    const moveX = x + turnW;
    const energyX = moveX + moveW;
    const clockX = x + w - clockW;

    g.fillStyle(CULLING_COLORS.shadow, 0.2);
    g.fillPoints(clippedPoints(x, y + 4, w, h, 9), true);
    g.fillStyle(CULLING_COLORS.ivory, 0.97);
    g.fillPoints(clippedPoints(x, y, turnW + 7, h, 8), true);
    g.fillStyle(mine ? CULLING_COLORS.cobalt : CULLING_COLORS.vermilion, 0.94);
    g.fillPoints([
      { x: moveX + 7, y },
      { x: energyX + 9, y },
      { x: energyX - 5, y: y + h },
      { x: moveX - 7, y: y + h },
    ], true);
    g.fillStyle(CULLING_COLORS.ivory, 0.95);
    g.fillPoints([
      { x: energyX + 7, y },
      { x: clockX + 8, y },
      { x: clockX - 6, y: y + h },
      { x: energyX - 7, y: y + h },
    ], true);
    g.fillStyle(CULLING_COLORS.charcoal, 0.94);
    g.fillPoints([
      { x: clockX + 8, y },
      { x: x + w, y },
      { x: x + w, y: y + h - 8 },
      { x: x + w - 8, y: y + h },
      { x: clockX - 6, y: y + h },
    ], true);
    g.lineStyle(1.5, mine ? CULLING_COLORS.cobalt : CULLING_COLORS.vermilion, 0.86);
    g.strokePoints(clippedPoints(x, y, w, h, 8), true);
    g.lineStyle(1, CULLING_COLORS.charcoal, 0.18);
    g.beginPath();
    g.moveTo(x + 7, y + 5);
    g.lineTo(x + turnW - 4, y + 5);
    g.strokePath();

    this.mono(x + 9, y + 7, 'TURN', {
      color: CULLING_COLORS.mutedText,
      fontSize: '9px',
      fontStyle: '700',
    });
    this.text(x + 10, y + 18, String(state.turn_number || 1), {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: h < 60 ? '25px' : '27px',
      fontStyle: '900',
      color: CULLING_COLORS.text,
    });

    this.mono(moveX + 8, y + 7, safeText(state.phase || 'PLANNING').replaceAll('_', ' '), {
      color: CULLING_COLORS.inverseText,
      fontSize: '9px',
      fontStyle: '700',
    });
    this.text(moveX + 8, y + 22, moveLabel, {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: frame.width < 380 ? '13px' : '15px',
      fontStyle: '900',
      color: CULLING_COLORS.inverseText,
    });
    this.mono(moveX + 9, y + h - 13, `QUEUE ${this.store.actions.length}/3`, {
      color: queueCount ? '#BCEECB' : '#D4D8E0',
      fontSize: '9px',
      fontStyle: '700',
    });

    const transmuteDisabled = this.store.controlsLocked()
      || !!this.store.actions.length
      || !!(me && me.energy_converted_this_turn);
    this.renderEnergyMeter(energyX + 4, y + 4, Math.max(62, energyW - 7), h - 8, me && me.energy, transmuteDisabled);
    this.registerHitTarget(energyX, y, energyW, h, 'Transmute energy', () => this.store.convertEnergy(), {
      disabled: transmuteDisabled,
    });

    const urgent = Number.isFinite(phaseSeconds) && phaseSeconds <= 10;
    this.mono(clockX + clockW / 2, y + 7, 'TIME', {
      color: urgent ? '#FF938C' : '#DDE2EA',
      fontSize: '9px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
    this.text(clockX + clockW / 2, y + 19, clockLabel(phaseSeconds), {
      fontFamily: TOKEN_TYPE.mono || 'monospace',
      fontSize: frame.width < 380 ? '14px' : '15px',
      fontStyle: '900',
      color: urgent ? '#FF938C' : CULLING_COLORS.inverseText,
    }).setOrigin(0.5, 0);
    const presentationSettings = this.presentationLayer && this.presentationLayer.settings
      ? this.presentationLayer.settings.snapshot()
      : null;
    this.mono(clockX + clockW / 2, y + h - 13, presentationSettings && presentationSettings.muted ? 'MUTED' : 'SOUND', {
      color: '#C9CBD1',
      fontSize: '9px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
    this.registerHitTarget(clockX, y, clockW, h, 'Open sound and battle settings', () => this.togglePresentationSettings(true));
  }

  renderEnergyMeter(x, y, w, h, energy, disabled = false) {
    const slots = [
      { color: 'green', label: 'B' },
      { color: 'blue', label: 'T' },
      { color: 'white', label: 'F' },
      { color: 'red', label: 'C' },
    ];
    const step = w / 4;
    slots.forEach((slot, index) => {
      const count = Number((energy && energy[slot.color]) || 0);
      const cx = x + step * (index + 0.5);
      const cy = y + 14;
      this.graphics.fillStyle(CULLING_COLORS.charcoal, disabled ? 0.08 : 0.14);
      this.graphics.fillCircle(cx, cy, 9);
      this.graphics.fillStyle(ENERGY_COLORS[slot.color], disabled ? 0.3 : count ? 0.96 : 0.13);
      this.graphics.fillCircle(cx, cy, 7);
      this.graphics.lineStyle(1, slot.color === 'white' ? CULLING_COLORS.charcoal : ENERGY_COLORS[slot.color], disabled ? 0.28 : 0.72);
      this.graphics.strokeCircle(cx, cy, 8.5);
      this.mono(cx, cy - 5, slot.label, {
        color: slot.color === 'white' ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
        fontSize: '9px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
      this.mono(cx, cy + 10, String(count), {
        color: disabled ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
        fontSize: '9px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
    });
    this.mono(x + w / 2, y + h - 11, 'TRANSMUTE', {
      color: disabled ? CULLING_COLORS.mutedText : '#007C84',
      fontSize: '9px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
  }

  renderPortraitPlate(character, x, y, w, h, options = {}) {
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

  actionTargetMark(side, slot) {
    const playerId = side === 'mine' ? this.store.mineId() : this.store.enemyId();
    const pending = this.store.pendingPrimaryTarget;
    if (pending && pending.playerId === playerId && pending.slot != null && Number(pending.slot) === Number(slot)) return 'PRIMARY';
    for (let index = this.store.actions.length - 1; index >= 0; index -= 1) {
      const action = this.store.actions[index];
      if (action.alternate_target_player_id === playerId && action.alternate_target_slot != null && Number(action.alternate_target_slot) === Number(slot)) return `Q${index + 1} ALT`;
      if (action.target_player_id !== playerId) continue;
      if (action.secondary_target_slot != null && Number(action.secondary_target_slot) === Number(slot)) return `Q${index + 1} SEC`;
      if (action.target_slot != null && Number(action.target_slot) === Number(slot)) return `Q${index + 1} PRI`;
      if ((action.target_slots || []).map(Number).includes(Number(slot))) return `Q${index + 1} AOE`;
    }
    return '';
  }

  visibleStatusLabels(character) {
    const statuses = [...((character && character.statuses) || [])];
    statuses.sort((left, right) => Number(!!(right.invisible || right.revealed)) - Number(!!(left.invisible || left.revealed)));
    return statuses.slice(0, 2).map((status) => {
      const name = safeText(status.name || status.id || 'Effect').toUpperCase();
      if (status.revealed) return `REVEALED ${name}`;
      if (status.invisible) return `HIDDEN ${name}`;
      return shortText(status.name || status.id, 5).toUpperCase();
    });
  }

  renderFighterPlate(character, side, slot, x, y, w, h) {
    const store = this.store;
    const selected = side === 'mine' && store.selectedCasterSlot === slot;
    const queuedIndex = side === 'mine' ? store.actions.findIndex((action) => Number(action.caster_slot) === slot) : -1;
    const targetable = store.canTarget(character, slot, side);
    const selectedSkill = store.selectedSkill();
    const protectedTarget = !!selectedSkill && store.targetBlocksSkill(character, selectedSkill);
    const dead = !character || !character.alive;
    const targetMark = this.actionTargetMark(side, slot);
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

    // The portrait owns the card. Paper is limited to a slashed name plate
    // and the HP track, matching the art-first battle reference.
    this.graphics.fillStyle(CULLING_COLORS.ivory, 0.98);
    this.graphics.fillTriangle(x, y, x + 11, y, x, y + 11);
    this.graphics.fillTriangle(x + w, y + h, x + w - 11, y + h, x + w, y + h - 11);
    this.graphics.fillPoints([
      { x: x + 2, y: nameBandY + 7 },
      { x: x + w - 2, y: nameBandY },
      { x: x + w - 2, y: y + h - 10 },
      { x: x + 2, y: y + h - 10 },
    ], true);
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
      fontSize: '9px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);

    const stateLabel = targetMark
      || (queuedIndex >= 0
        ? `Q${queuedIndex + 1}`
        : targetable
          ? 'LEGAL'
          : protectedTarget
            ? 'WARD'
            : selected
              ? 'ACTIVE'
              : dead
                ? 'DOWN'
                : '');
    if (stateLabel) {
      const chipW = clamp(stateLabel.length * 5 + 12, 30, w - 27);
      const chipX = x + w - chipW - 4;
      this.graphics.fillStyle(tone, protectedTarget ? 0.74 : 0.94);
      this.graphics.fillPoints(clippedPoints(chipX, y + 3, chipW, 17, 4), true);
      this.mono(chipX + chipW / 2, y + 7, stateLabel, {
        color: protectedTarget || tone === CULLING_COLORS.cobalt ? CULLING_COLORS.inverseText : CULLING_COLORS.text,
        fontSize: '9px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
    }

    const fighterName = (character && character.name) || 'Down';
    const nameNode = this.text(x + 28, nameBandY + 3, fighterName, {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: fighterName.length > 22 ? '10px' : w < 110 ? '10px' : '11px',
      fontStyle: '900',
      color: dead ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
      lineSpacing: -1,
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
    const hpLabelW = Math.min(w - 8, Math.max(34, hpLabel.length * 5 + 9));
    this.graphics.fillStyle(CULLING_COLORS.ivory, 0.9);
    this.graphics.fillPoints(clippedPoints(x + 3, y + 3, hpLabelW, 18, 4), true);
    this.mono(x + 7, y + 6, hpLabel, {
      color: dead ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
      fontSize: '9px',
      fontStyle: '700',
    });
    this.graphics.fillStyle(CULLING_COLORS.concrete, 0.96);
    this.graphics.fillRect(barX, barY, barW, 5);
    this.graphics.fillStyle(hpTone, dead ? 0.25 : 0.98);
    this.graphics.fillRect(barX, barY, barW * hpPct, 5);

    this.visibleStatusLabels(character).forEach((label, index) => {
      const visibility = label.startsWith('HIDDEN ') || label.startsWith('REVEALED ');
      const chipW = Math.min(w - 8, visibility ? Math.max(68, label.length * 5.2) : 38);
      const chipLabel = visibility ? shortText(label, Math.max(12, Math.floor((chipW - 6) / 5.2))) : label;
      const chipX = x + w - chipW - 4;
      const chipY = y + 24 + index * 18;
      this.graphics.fillStyle(visibility ? COLORS.domain : CULLING_COLORS.charcoal, 0.82);
      this.graphics.fillRect(chipX, chipY, chipW, 16);
      this.mono(chipX + chipW / 2, chipY + 3, chipLabel, {
        color: CULLING_COLORS.inverseText,
        fontSize: '9px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
    });

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

    this.buttons.push({
      x: x - 2,
      y: y - 3,
      w: w + 4,
      h: h + 6,
      label: `${side} fighter ${slot + 1}`,
      onClick: () => {
        this.presentationLayerCall('interactionCue', {
          cue: targetable ? 'target-lock' : side === 'mine' ? 'fighter-select' : 'fighter-tap',
          character,
          side,
          slot,
          targetable,
        });
        store.target(side, slot);
      },
      disabled: false,
    });
  }

  renderFighterLane(team, side, frame, layout) {
    const y = side === 'enemy' ? layout.enemyY : layout.allyY;
    (team || []).slice(0, 3).forEach((character, slot) => {
      const x = layout.contentX + slot * (layout.cardW + layout.gap);
      this.renderFighterPlate(character, side, slot, x, y, layout.cardW, layout.cardH);
    });
  }

  renderQueueMarks(frame, layout, y) {
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
        this.mono(cx, y - 4, `Q${index + 1}`, { color: CULLING_COLORS.mutedText, fontSize: '9px' }).setOrigin(0.5, 0);
        return;
      }
      const caster = me && me.team ? me.team[action.caster_slot] : null;
      this.mono(cx, y - 4, caster ? initials(caster.name) : `Q${index + 1}`, {
        color: '#275F39',
        fontSize: '9px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
    });
  }

  renderReplayLine(frame, layout) {
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
    this.mono(frame.x + frame.width / 2, layout.fieldTop + 3, shortText(event.message || event.type, 38), {
      color,
      fontSize: '9px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
  }

  renderBattlefield(frame, layout, prompt) {
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
      fontSize: layout.compressed ? '10px' : '11px',
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
    this.renderQueueMarks(frame, layout, layout.fieldBottom - 13);
  }

  renderTechniqueArtwork(skill, index, x, y, w, h, tone, disabled, cost, selected = false) {
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
    const textureKey = {
      green: 's3-skill-body',
      blue: 's3-skill-technique',
      white: 's3-skill-focus',
      red: 's3-skill-curse',
    }[semanticCost] || 's3-skill-focus';
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

  skillPresentation(skill, caster) {
    const cooldown = this.store.skillCooldown(caster, skill);
    const fit = this.store.skillFit(skill, caster);
    const ruleReason = this.store.statusBlocksSkill(caster, skill);
    const queuedIndex = this.store.actions.findIndex((action) => Number(action.caster_slot) === Number(this.store.selectedCasterSlot));
    const casterQueued = queuedIndex >= 0;
    const locked = this.store.controlsLocked();
    const disabled = cooldown > 0 || !!ruleReason || !fit.ok || casterQueued || locked;
    let reason = '';
    if (cooldown > 0) reason = `COOLDOWN ${cooldown}`;
    else if (ruleReason) reason = ruleReason;
    else if (!fit.ok) reason = fit.reason;
    else if (casterQueued) reason = 'FIGHTER QUEUED';
    else if (locked) reason = 'CONTROLS LOCKED';
    return { cooldown, fit, ruleReason, casterQueued, queuedIndex, locked, disabled, reason };
  }

  renderSkillButton(skill, caster, index, x, y, w, h) {
    const state = this.skillPresentation(skill, caster);
    const selected = this.store.selectedSkillId === skill.id;
    const cost = this.store.adjustedCost(caster, skill);
    const firstCost = cost[0];
    const tone = selected ? CULLING_COLORS.selected : (ENERGY_COLORS[firstCost] || CULLING_COLORS.cobalt);
    const artH = Math.max(92, Math.round(h * 0.58));

    this.graphics.fillStyle(CULLING_COLORS.shadow, selected ? 0.28 : 0.16);
    this.graphics.fillPoints(clippedPoints(x + 2, y + 4, w, h, 7), true);
    this.renderTechniqueArtwork(skill, index, x + 2, y + 2, w - 4, artH - 1, tone, state.disabled, cost, selected);
    this.graphics.fillStyle(CULLING_COLORS.ivory, 0.98);
    this.graphics.fillTriangle(x, y, x + 8, y, x, y + 8);
    this.graphics.fillTriangle(x + w, y + h, x + w - 8, y + h, x + w, y + h - 8);
    this.graphics.fillStyle(CULLING_COLORS.ivory, state.disabled ? 0.82 : 0.98);
    this.graphics.fillPoints([
      { x: x + 2, y: y + artH + 7 },
      { x: x + w - 2, y: y + artH },
      { x: x + w - 2, y: y + h - 2 },
      { x: x + 2, y: y + h - 2 },
    ], true);
    this.graphics.fillStyle(tone, selected ? 0.98 : state.disabled ? 0.28 : 0.74);
    this.graphics.fillRect(x + 2, y + artH, w - 4, 3);
    this.graphics.lineStyle(selected ? 3 : 1.25, tone, state.disabled ? 0.34 : selected ? 1 : 0.86);
    this.graphics.strokePoints(clippedPoints(x, y, w, h, 7), true);

    const numberX = x + 11;
    const numberY = y + 11;
    this.graphics.fillStyle(selected ? CULLING_COLORS.gold : CULLING_COLORS.charcoal, 0.96);
    this.graphics.fillPoints([
      { x: numberX, y: numberY - 9 },
      { x: numberX + 9, y: numberY },
      { x: numberX, y: numberY + 9 },
      { x: numberX - 9, y: numberY },
    ], true);
    this.mono(numberX, numberY - 5, String(index + 1), {
      color: selected ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
      fontSize: '9px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);

    if (skill.effective_skill_id || state.casterQueued) {
      const ribbonW = Math.max(34, w - 25);
      const ribbonLabel = skill.effective_skill_id
        ? state.casterQueued ? `REPLACED / Q${state.queuedIndex + 1}` : 'REPLACED'
        : `QUEUED Q${state.queuedIndex + 1}`;
      this.graphics.fillStyle(skill.effective_skill_id ? CULLING_COLORS.vermilion : CULLING_COLORS.queued, 0.94);
      this.graphics.fillRect(x + w - ribbonW - 2, y + 3, ribbonW, 17);
      this.mono(x + w - ribbonW / 2 - 2, y + 6, ribbonLabel, {
        color: CULLING_COLORS.inverseText,
        fontSize: '9px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
    }

    // Compact cards follow the approved illustrated-card grammar. Detailed
    // classes, cooldown rules, and effect prose remain in the second-tap
    // technique dossier instead of becoming unreadable six-pixel overlays.
    if (state.disabled) {
      const reasonY = y + artH - 24;
      this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.88);
      this.graphics.fillRect(x + 2, reasonY, w - 4, 22);
      const reasonNode = this.text(x + w / 2, reasonY + 3, state.reason, {
        fontFamily: TOKEN_TYPE.mono || 'monospace',
        fontSize: w < 70 ? '9px' : '10px',
        fontStyle: '800',
        color: '#F2C5C1',
        align: 'center',
        wordWrap: { width: w - 8 },
      }).setOrigin(0.5, 0);
      reasonNode.setMaxLines(2);
    }

    if (selected && !state.disabled) {
      this.graphics.fillStyle(CULLING_COLORS.gold, 0.96);
      this.graphics.fillRect(x + 2, y + artH - 19, w - 4, 17);
      this.mono(x + w / 2, y + artH - 15, 'TAP AGAIN / INFO', {
        color: CULLING_COLORS.text,
        fontSize: '9px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
    }

    const skillName = this.text(x + w / 2, y + artH + 7, skill.name, {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: skill.name.length > 22 ? '10px' : '12px',
      fontStyle: '900',
      color: state.disabled ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
      align: 'center',
      lineSpacing: -1,
      wordWrap: { width: w - 8 },
    }).setOrigin(0.5, 0);
    skillName.setMaxLines(3);

    const targetNode = this.text(x + w / 2, y + h - 34, this.store.targetLabel(skill).toUpperCase(), {
      fontFamily: TOKEN_TYPE.mono || 'monospace',
      color: state.disabled ? CULLING_COLORS.mutedText : CULLING_COLORS.cobaltText,
      fontSize: w < 70 ? '9px' : '10px',
      fontStyle: '700',
      align: 'center',
      wordWrap: { width: w - 8 },
    }).setOrigin(0.5, 0);
    targetNode.setMaxLines(2);

    const pipY = y + h - 13;
    const pipCount = Math.max(1, cost.length);
    const pipGap = Math.min(12, (w - 16) / pipCount);
    const pipStart = x + w / 2 - ((pipCount - 1) * pipGap) / 2;
    if (!cost.length) {
      this.mono(x + w / 2, pipY - 4, 'FREE', {
        color: state.disabled ? CULLING_COLORS.mutedText : CULLING_COLORS.cobaltText,
        fontSize: '9px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
    }
    cost.forEach((color, costIndex) => {
      const px = pipStart + costIndex * pipGap;
      const pipTone = ENERGY_COLORS[color] || CULLING_COLORS.charcoal;
      this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.22);
      this.graphics.fillCircle(px, pipY, 6);
      this.graphics.fillStyle(pipTone, state.disabled ? 0.34 : color === 'white' ? 0.94 : 0.98);
      this.graphics.fillCircle(px, pipY, 4.8);
      this.graphics.lineStyle(1, color === 'white' ? CULLING_COLORS.charcoal : pipTone, 0.82);
      this.graphics.strokeCircle(px, pipY, 5.6);
      this.mono(px, pipY - 4.7, ENERGY_LABELS[color] || 'X', {
        color: color === 'white' ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
        fontSize: '9px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
    });

    this.registerHitTarget(
      x,
      y,
      w,
      h,
      state.disabled ? `Inspect disabled skill ${skill.name}: ${state.reason}` : `Skill ${skill.name}`,
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
    );
  }

  renderIdentityStrip(frame, layout, selected) {
    const x = frame.x;
    const y = layout.identityY;
    const w = frame.width;
    const h = layout.identityH;
    const tone = selected ? CULLING_COLORS.gold : CULLING_COLORS.cobalt;
    const identityW = layout.identityW;
    const identityArtH = layout.identityH + layout.skillH;

    if (selected) {
      this.portraitArtwork(selected, x - 8, y + 2, identityW + 35, identityArtH - 3, {
        context: 'hero',
        depth: -2,
        alpha: 0.98,
      });
      this.graphics.fillStyle(CULLING_COLORS.cobalt, 0.38);
      this.graphics.fillTriangle(x, y + 12, x + identityW + 18, y + identityArtH, x, y + identityArtH);
      this.graphics.fillStyle(CULLING_COLORS.cobalt, 0.9);
      this.graphics.fillPoints([
        { x, y: y + identityArtH - 58 },
        { x: x + identityW + 12, y: y + identityArtH - 72 },
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
        fontSize: '9px',
        fontStyle: '700',
      });
      return;
    }

    this.mono(x + 8, y + identityArtH - 52, 'SELECTED FIGHTER', {
      color: '#CDE6FF',
      fontSize: '9px',
      fontStyle: '700',
    });
    const identityName = this.text(x + 8, y + identityArtH - 38, selected.name, {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: selected.name.length > 20 ? '9px' : frame.width < 380 ? '11px' : '12px',
      fontStyle: '900',
      color: CULLING_COLORS.inverseText,
      lineSpacing: -1,
      wordWrap: { width: identityW - 12 },
    });
    identityName.setMaxLines(3);
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
      fontSize: '9px',
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
        fontSize: '9px',
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

  renderBottomActions(frame, layout) {
    const x = frame.x + 6;
    const y = layout.reviewY;
    const h = layout.reviewH;
    const sideW = frame.width < 380 ? 50 : 54;
    const gap = 4;
    const reviewX = x + sideW + gap;
    const reviewW = frame.width - 12 - sideW * 2 - gap * 2;
    const passX = reviewX + reviewW + gap;
    const clearDisabled = !this.store.actions.length || this.store.controlsLocked();
    const reviewDisabled = !this.store.actions.length || this.store.controlsLocked();
    const passDisabled = this.store.controlsLocked();

    const drawAction = (bx, bw, label, tone, disabled, onClick, hitLabel) => {
      this.graphics.fillStyle(CULLING_COLORS.shadow, disabled ? 0.06 : 0.16);
      this.graphics.fillPoints(clippedPoints(bx + 1, y + 3, bw, h - 3, 7), true);
      this.graphics.fillStyle(disabled ? CULLING_COLORS.concrete : CULLING_COLORS.ivory, disabled ? 0.74 : 0.97);
      this.graphics.fillPoints(clippedPoints(bx, y, bw, h - 4, 7), true);
      this.graphics.lineStyle(1.5, disabled ? CULLING_COLORS.muted : tone, disabled ? 0.3 : 0.88);
      this.graphics.strokePoints(clippedPoints(bx, y, bw, h - 4, 7), true);
      this.mono(bx + bw / 2, y + 17, label, {
        color: disabled ? CULLING_COLORS.mutedText : tone === CULLING_COLORS.vermilion ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
        fontSize: '9px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
      this.registerHitTarget(bx, y, bw, h - 4, hitLabel, onClick, { disabled });
    };

    drawAction(x, sideW, 'CLEAR', CULLING_COLORS.vermilion, clearDisabled, () => {
      this.presentationLayerCall('interactionCue', { cue: 'queue-clear' });
      this.store.cancelQueue();
    }, 'Clear queue');
    drawAction(passX, sideW, 'PASS', CULLING_COLORS.cobalt, passDisabled, () => {
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
    this.mono(reviewX + reviewW / 2, y + h - 15, 'ORDER / WILD / CONFIRM', {
      color: reviewDisabled ? CULLING_COLORS.mutedText : '#CDE6FF',
      fontSize: '9px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
    this.registerHitTarget(reviewX, y, reviewW, h - 4, 'Review queue', () => {
      this.presentationLayerCall('interactionCue', { cue: 'queue-review-open', queueSize: this.store.actions.length });
      this.store.openQueueReview();
    }, {
      disabled: reviewDisabled,
    });
  }

  renderCommandDeck(frame, layout, selected) {
    this.renderIdentityStrip(frame, layout, selected);
    if (selected) {
      this.store.skillsFor(selected).slice(0, 4).forEach((skill, index) => {
        const x = layout.skillX + index * (layout.skillW + layout.skillGap);
        this.renderSkillButton(skill, selected, index, x, layout.skillY, layout.skillW, layout.skillH);
      });
    } else {
      [0, 1, 2, 3].forEach((index) => {
        const x = layout.skillX + index * (layout.skillW + layout.skillGap);
        this.graphics.fillStyle(CULLING_COLORS.ivory, 0.74);
        this.graphics.fillPoints(clippedPoints(x, layout.skillY, layout.skillW, layout.skillH, 8), true);
        this.graphics.lineStyle(1, CULLING_COLORS.charcoal, 0.2);
        this.graphics.strokePoints(clippedPoints(x, layout.skillY, layout.skillW, layout.skillH, 8), true);
        this.mono(x + layout.skillW / 2, layout.skillY + layout.skillH / 2 - 5, `SLOT ${index + 1}`, {
          color: CULLING_COLORS.mutedText,
          fontSize: '9px',
          fontStyle: '700',
        }).setOrigin(0.5, 0);
      });
    }
    this.renderBottomActions(frame, layout);
  }

  renderSkillDetailSheet(frame, caster, skill) {
    const adjusted = this.store.adjustedCost(caster, skill);
    const state = this.skillPresentation(skill, caster);
    const reason = state.reason || 'Available now';
    const x = frame.x + 10;
    const y = Math.max(frame.top + 116, frame.height * 0.35);
    const w = frame.width - 20;
    const h = frame.height - y + 18;

    this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.28);
    this.graphics.fillRect(frame.x, 0, frame.width, frame.height);
    drawCurrentPanel(this, x, y, w, h, {
      fill: CULLING_COLORS.ivory,
      stroke: CULLING_COLORS.gold,
      accent: CULLING_COLORS.gold,
      radius: 18,
      alpha: 0.995,
      shadowY: 0,
      shadowAlpha: 0.28,
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

    this.mono(x + 17, y + 16, 'TECHNIQUE DETAIL / SERVER STATE', {
      color: CULLING_COLORS.cobaltText,
      fontSize: '9px',
      fontStyle: '700',
    });
    this.text(x + 17, y + 36, skill.name, {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: '22px',
      fontStyle: '900',
      color: CULLING_COLORS.text,
      wordWrap: { width: w - 88 },
    }).setMaxLines(2);
    drawCurrentButton(this, x + w - 56, y + 12, 44, 44, '×', () => this.store.closeSkillDetail(), {
      fill: CULLING_COLORS.vermilion,
      stroke: CULLING_COLORS.charcoal,
      color: CULLING_COLORS.inverseText,
      fontSize: '18px',
      display: false,
      radius: 10,
      brush: 'red',
    });

    this.mono(x + 17, y + 92, `${titleize((skill.target_rule && skill.target_rule.kind) || 'enemy')} target`, {
      color: CULLING_COLORS.text,
      fontSize: '10px',
    });
    this.costPips(x + 23, y + 123, adjusted, 15);
    const classLine = (skill.classes || []).map((value) => titleize(value)).join(' / ') || 'Technique';
    const slotLine = skill.effective_skill_id ? `${classLine} / REPLACED IN ORIGINAL SLOT` : classLine;
    this.mono(x + 17, y + 148, slotLine, {
      color: CULLING_COLORS.cobaltText,
      fontSize: '9px',
    });
    const available = reason === 'Available now';
    this.graphics.fillStyle(available ? COLORS.queued : CULLING_COLORS.enemy, 0.14);
    this.graphics.fillRect(x + 17, y + 175, w - 34, 38);
    this.graphics.fillStyle(available ? COLORS.queued : CULLING_COLORS.enemy, 0.86);
    this.graphics.fillRect(x + 17, y + 175, 4, 38);
    this.text(x + 29, y + 186, reason, {
      fontFamily: TOKEN_TYPE.mono || 'monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: available ? '#357D4B' : CULLING_COLORS.redText,
      wordWrap: { width: w - 62 },
    }).setMaxLines(2);
    this.mono(x + 17, y + 234, 'AUTHORITATIVE EFFECT', {
      color: CULLING_COLORS.cobaltText,
      fontSize: '9px',
      fontStyle: '700',
    });
    this.text(x + 17, y + 256, skill.description || this.store.effectLine(skill), {
      fontSize: '12px',
      color: CULLING_COLORS.text,
      lineSpacing: 5,
      wordWrap: { width: w - 34 },
    });
    drawCurrentButton(this, x + 17, frame.bottom - 44, w - 34, 44, 'RETURN TO BATTLEFIELD', () => this.store.closeSkillDetail(), {
      fill: CULLING_COLORS.cobalt,
      stroke: CULLING_COLORS.charcoal,
      color: CULLING_COLORS.inverseText,
      fontSize: '12px',
      display: false,
      radius: 12,
    });
  }

  renderConnecting(frame) {
    const x = frame.x + 10;
    const y = frame.top;
    const w = frame.width - 20;
    drawCurrentPanel(this, x, y, w, 66, {
      fill: CULLING_COLORS.ivory,
      stroke: CULLING_COLORS.cobalt,
      accent: CULLING_COLORS.gold,
      radius: 14,
      alpha: 0.96,
      shadowY: 4,
      shadowAlpha: 0.14,
    });
    this.mono(x + 12, y + 8, 'JJK ARENA / CONNECTING', {
      color: CULLING_COLORS.cobaltText,
      fontSize: '10px',
      fontStyle: '700',
    });
    this.text(x + 12, y + 28, 'Opening Battlefield', {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: '20px',
      fontStyle: '900',
      color: CULLING_COLORS.text,
    });
    drawCurrentButton(this, x + w - 54, y + 11, 44, 44, 'EXIT', () => this.store.resetToLobby(), {
      fill: CULLING_COLORS.vermilion,
      stroke: CULLING_COLORS.charcoal,
      color: CULLING_COLORS.inverseText,
      fontSize: '10px',
      display: false,
      radius: 10,
      brush: 'red',
    });
    const waitingLabel = this.store.connectionState === 'disconnected'
      ? 'Reconnecting…'
      : 'Waiting for battle state from server…';
    this.mono(frame.x + frame.gutter, y + 84, waitingLabel, {
      color: this.store.connectionState === 'disconnected' ? CULLING_COLORS.redText : CULLING_COLORS.text,
    });
  }

  render() {
    const frame = this.layout.frame();
    this.clearSurface();
    this.renderWorld(frame);
    const state = this.store.state;
    if (!state) {
      this.renderConnecting(frame);
      this.toast(frame, { theme: 'light' });
      this.syncButtonDebug();
      return;
    }

    const me = this.store.me();
    const foe = this.store.foe();
    const selected = me && me.team ? me.team[this.store.selectedCasterSlot] : null;
    const layout = this.combatLayout(frame);
    this.playbackTargets = {};
    this.renderTopHud(frame, state, me, layout);

    if (this.store.detailSkillId && selected) {
      const detailSkill = this.store.skillFor(selected, this.store.detailSkillId);
      if (detailSkill) {
        this.renderSkillDetailSheet(frame, selected, detailSkill);
        this.toast(frame, { theme: 'light' });
        this.renderPresentationSettingsSheet(frame, {
          onExit: () => this.store.resetToLobby(),
          exitLabel: 'EXIT BATTLE',
        });
        this.syncButtonDebug();
        return;
      }
      this.store.detailSkillId = null;
    }

    const targetStagePrompt = this.store.targetingStage === 'alternate'
      ? 'CHOOSE ALTERNATE REDIRECT TARGET'
      : this.store.targetingStage === 'venom_secondary'
        ? 'CHOOSE SECONDARY ENEMY TARGET'
        : this.store.targetingStage === 'venom_primary'
          ? 'CHOOSE POISONED PRIMARY TARGET'
          : 'CHOOSE A CYAN LEGAL TARGET';
    const prompt = state.winner_id
      ? 'BATTLE FINISHED'
      : this.store.queueReviewOpen
        ? 'REVIEW RESOLUTION ORDER'
        : this.store.controlsLocked()
          ? 'HOSTILE ACTION IN PROGRESS'
          : this.store.selectedSkillId
            ? targetStagePrompt
            : this.store.selectedCasterSlot !== null
              ? 'SELECT ONE OF FOUR TECHNIQUES'
              : 'SELECT ONE OF YOUR FIGHTERS';

    if (this.store.queueReviewOpen) {
      // Queue Review replaces the planning command deck. Clear any persistent
      // planning-only ring handles so they cannot drift over FINAL ORDER.
      this.presentationLayerCall('renderTargetLane', { selectedSkill: null });
      this.presentationLayerCall('renderSelectedFighter', { character: null });
    }

    this.renderFighterLane(foe && foe.team, 'enemy', frame, layout);
    if (!this.store.queueReviewOpen) {
      this.renderBattlefield(frame, layout, prompt);
      this.renderFighterLane(me && me.team, 'mine', frame, layout);
      this.renderCommandDeck(frame, layout, selected);
    }
    this.renderQueueReviewSheet(frame);
    this.toast(frame, { theme: 'light' });
    this.playEvents(frame);
    this.renderPresentationSettingsSheet(frame, {
      onExit: () => this.store.resetToLobby(),
      exitLabel: 'EXIT BATTLE',
    });
    this.syncButtonDebug();
  }
}
