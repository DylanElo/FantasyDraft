import {
  COLORS,
  CORE_ENERGY,
  CULLING_COLORS,
  ENERGY_COLORS,
  ENERGY_LABELS,
  ENERGY_NAMES,
  TOKEN_TYPE,
} from '../core/runtime-config.js?v=42';
import { clamp, initials, safeText, shortText, titleize } from '../core/text.js?v=42';
import { eventTone } from '../fx/event-metrics.js?v=42';
import { Season3UI } from '../ui/season3-ui.js?v=42';
import { CombatQueueReviewScene } from './combat-queue-review-scene.js?v=42';

const {
  button: drawCurrentButton,
  panel: drawCurrentPanel,
  world: drawCurrentWorld,
} = Season3UI.current;

const WORLD_KEY = 'culling-current-rooftop';
const LOCATION_LINE = 'TOKYO MUNICIPAL ROOFTOP';

const COMPACT_DISABLED_REASONS = Object.freeze([
  [': this skill class is disabled.', 'Skill class disabled.'],
  [': harmful skills are disabled.', 'Harmful skills disabled.'],
  [': ally skills are disabled.', 'Ally skills disabled.'],
  [': non-damaging skills are disabled.', 'Non-damaging skills disabled.'],
  [': counters are disabled.', 'Counters disabled.'],
]);

export function compactSkillCardDisabledReason(reason) {
  const fullReason = safeText(reason, 'Unavailable.');
  const compact = COMPACT_DISABLED_REASONS.find(([suffix]) => fullReason.endsWith(suffix));
  return compact ? compact[1] : fullReason;
}

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

  syncButtonDebug() {
    if (this.domUI && typeof this.domUI.setCombatState === 'function') {
      const snapshot = this.store && typeof this.store.combatAccessibilitySnapshot === 'function'
        ? this.store.combatAccessibilitySnapshot()
        : null;
      this.domUI.setCombatState(snapshot);
    }
    super.syncButtonDebug();
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
    const skillX = contentX;
    const skillGap = frame.width < 380 ? 7 : 9;
    const skillColumns = 2;
    const skillRows = 2;
    const skillW = (contentW - skillGap) / skillColumns;
    const skillCardH = (skillH - skillGap) / skillRows;
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
      skillCardH,
      skillColumns,
      skillRows,
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
    const interactionStage = this.store.interactionStage();
    const authoritativeSeconds = Number(state.phase_seconds_remaining);
    const phaseSeconds = typeof this.store.phaseSecondsRemaining === 'function'
      ? this.store.phaseSecondsRemaining()
      : authoritativeSeconds;
    const disconnectSeconds = this.store.disconnectSecondsRemaining();
    const connection = this.store.combatConnectionStatus();
    const warning = connection.key === 'resuming'
      ? 'RESTORING'
      : this.store.connectionState !== 'connected'
        ? 'RECONNECTING'
      : disconnectSeconds !== null
        ? `PAUSED ${disconnectSeconds}S`
        : null;
    const moveLabel = warning || interactionStage.hudLabel;

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
      fontSize: '10px',
      fontStyle: '700',
    });
    this.text(x + 10, y + 18, String(state.turn_number || 1), {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: h < 60 ? '25px' : '27px',
      fontStyle: '900',
      color: CULLING_COLORS.text,
    });

    this.mono(moveX + 8, y + 5, interactionStage.label.toUpperCase(), {
      color: CULLING_COLORS.inverseText,
      fontSize: '12px',
      fontStyle: '700',
    });
    this.text(moveX + 8, y + 22, moveLabel, {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: frame.width < 380 ? '13px' : '15px',
      fontStyle: '900',
      color: CULLING_COLORS.inverseText,
    });
    this.mono(moveX + 9, y + h - 15, `QUEUE ${this.store.actions.length}/3`, {
      color: queueCount ? '#BCEECB' : '#D4D8E0',
      fontSize: '12px',
      fontStyle: '700',
    });

    const controlsLocked = this.store.controlsLocked();
    const transmuteDisabled = controlsLocked
      || !!this.store.actions.length
      || !!(me && me.energy_converted_this_turn);
    const transmuteDisabledReason = controlsLocked
      ? 'Transmutation is available only during unlocked Planning.'
      : this.store.actions.length
        ? 'Clear the queued actions before transmuting energy.'
        : me && me.energy_converted_this_turn
          ? 'Transmutation has already been used this player turn.'
          : '';
    this.renderEnergyMeter(energyX + 4, y + 4, Math.max(62, energyW - 7), h - 8, me && me.energy, transmuteDisabled);
    this.registerHitTarget(energyX, y, energyW, h, 'Transmute energy', () => this.store.convertEnergy(), {
      disabled: transmuteDisabled,
      disabledReason: transmuteDisabledReason,
      accessibilityId: 'transmute-energy',
    });

    const urgent = !warning && Number.isFinite(phaseSeconds) && phaseSeconds <= 10;
    const warningTime = !warning && Number.isFinite(phaseSeconds) && phaseSeconds <= 20;
    if (warningTime) {
      g.fillStyle(urgent ? CULLING_COLORS.vermilion : CULLING_COLORS.gold, urgent ? 0.2 : 0.12);
      g.fillPoints([
        { x: clockX + 8, y: y + 2 },
        { x: x + w - 2, y: y + 2 },
        { x: x + w - 2, y: y + h - 9 },
        { x: x + w - 9, y: y + h - 2 },
        { x: clockX - 3, y: y + h - 2 },
      ], true);
      g.lineStyle(2, urgent ? CULLING_COLORS.vermilion : CULLING_COLORS.gold, urgent ? 0.96 : 0.72);
      g.strokePoints(clippedPoints(clockX - 4, y + 2, clockW + 4, h - 4, 7), true);
    }
    const timerHeading = warning
      ? connection.key === 'resuming' ? 'RESTORE' : disconnectSeconds !== null ? 'PAUSED' : 'OFFLINE'
      : urgent ? 'HURRY' : interactionStage.timerLabel;
    this.mono(clockX + clockW / 2, y + 5, timerHeading, {
      color: urgent ? '#FF938C' : warningTime ? '#FFE19A' : '#DDE2EA',
      fontSize: '12px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
    this.text(clockX + clockW / 2, y + 19, clockLabel(phaseSeconds), {
      fontFamily: TOKEN_TYPE.mono || 'monospace',
      fontSize: frame.width < 380 ? '14px' : '15px',
      fontStyle: '900',
      color: urgent ? '#FF938C' : warningTime ? '#FFE19A' : CULLING_COLORS.inverseText,
    }).setOrigin(0.5, 0);
    const presentationSettings = this.presentationLayer && this.presentationLayer.settings
      ? this.presentationLayer.settings.snapshot()
      : null;
    this.mono(clockX + clockW / 2, y + h - 15, presentationSettings && presentationSettings.muted ? 'MUTED' : 'SOUND', {
      color: '#C9CBD1',
      fontSize: '12px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
    this.registerHitTarget(clockX, y, clockW, h, 'Open sound and battle settings', () => this.togglePresentationSettings(true));
  }

  renderEnergyMeter(x, y, w, h, energy, disabled = false) {
    const slots = CORE_ENERGY.map((color) => ({ color, label: ENERGY_LABELS[color] }));
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
        fontSize: '10px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
      this.mono(cx, cy + 9, String(count), {
        color: disabled ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
        fontSize: '12px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
    });
    this.mono(x + w / 2, y + h - 13, 'TRANSMUTE 5:1', {
      color: disabled ? CULLING_COLORS.mutedText : '#007C84',
      fontSize: '12px',
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

  activeStatuses(character) {
    return [...((character && character.statuses) || [])]
      .filter((status) => Number(status.duration || 0) !== 0)
      .sort((left, right) => {
        const control = (status) => Number(Boolean(
          status && status.payload
          && (status.payload.stun_harmful || (status.payload.stun_classes || []).length),
        ));
        return control(right) - control(left)
          || Number(Boolean(right.invisible || right.revealed)) - Number(Boolean(left.invisible || left.revealed));
      });
  }

  statusCardLabel(status) {
    const payload = (status && status.payload) || {};
    const families = ((status && status.families) || []).map((family) => safeText(family).toLowerCase());
    const id = safeText(status && status.id).toLowerCase();
    const name = safeText(status && (status.name || status.id), 'Effect').toUpperCase();
    let label = name.length <= 13 ? name : '';
    if (status && status.revealed) label = 'REVEALED';
    else if (status && status.invisible) label = 'HIDDEN';
    else if (payload.stun_harmful || (payload.stun_classes || []).length || families.includes('stun')) label = 'STUN';
    else if (id.includes('poison') || families.includes('affliction')) label = id.includes('poison') ? 'POISON' : 'AFFLICTION';
    else if (payload.invulnerable) label = 'WARD';
    else if (payload.destructible_defense) label = 'SHIELD';
    else if (Number(payload.damage_output_delta || 0) < 0) label = 'DAMAGE DOWN';
    else if (Number(payload.damage_output_delta || 0) > 0) label = 'POWER UP';
    else if (families.includes('mark')) label = 'MARK';
    else if (families.includes('buff')) label = 'BUFF';
    else if (families.includes('debuff')) label = 'DEBUFF';
    else if (families.includes('soul')) label = 'SOUL';
    if (!label) label = 'STATUS';
    const duration = Number(status && status.duration);
    return Number.isFinite(duration) && duration > 0 ? `${label} ${duration}` : label;
  }

  statusTone(status) {
    const payload = (status && status.payload) || {};
    const families = ((status && status.families) || []).map((family) => safeText(family).toLowerCase());
    const hostileSource = status && status.source_player_id && status.target_player_id
      && status.source_player_id !== status.target_player_id;
    const harmful = hostileSource
      || payload.stun_harmful
      || (payload.stun_classes || []).length
      || Number(payload.damage_output_delta || 0) < 0
      || Number(payload.turn_end_damage || 0) > 0
      || families.some((family) => ['affliction', 'debuff', 'stun', 'control'].includes(family));
    if (harmful) return CULLING_COLORS.vermilion;
    if (families.includes('buff') || payload.invulnerable || payload.destructible_defense) return CULLING_COLORS.queued;
    return CULLING_COLORS.cobalt;
  }

  visibleStatusLabels(character) {
    return this.activeStatuses(character).slice(0, 2).map((status) => this.statusCardLabel(status));
  }

  statusSourceSkillName(status) {
    const payload = (status && status.payload) || {};
    const sourceSkillId = payload.source_skill_id || status.source_skill_id;
    if (!sourceSkillId) return '';
    const state = this.store.state || {};
    const sourcePlayer = state.players && state.players[status.source_player_id];
    const source = sourcePlayer && sourcePlayer.team ? sourcePlayer.team[status.source_slot] : null;
    const catalog = source && state.skill_catalog && state.skill_catalog[source.character_id];
    const skill = catalog && (catalog.skills || []).find((entry) => (
      entry.id === sourceSkillId || entry.original_slot_id === sourceSkillId
    ));
    return safeText((skill && skill.name) || payload.source_skill_name || sourceSkillId).replaceAll('_', ' ');
  }

  activeVisibleSkillForFighter(side, slot) {
    const sourcePlayerId = side === 'enemy' ? this.store.enemyId() : this.store.mineId();
    const state = this.store.state || {};
    for (const player of Object.values(state.players || {})) {
      for (const character of (player && player.team) || []) {
        for (const status of this.activeStatuses(character)) {
          if (status.source_player_id !== sourcePlayerId || Number(status.source_slot) !== Number(slot)) continue;
          const sourceSkillName = this.statusSourceSkillName(status);
          if (sourceSkillName) return sourceSkillName;
        }
      }
    }
    return '';
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
    const visibleAction = typeof store.currentVisibleAction === 'function' ? store.currentVisibleAction() : null;
    const visiblePayload = (visibleAction && visibleAction.payload) || {};
    const visibleCaster = visiblePayload.player_id === (side === 'mine' ? store.mineId() : store.enemyId())
      && Number(visiblePayload.caster_slot) === Number(slot);
    const activeSkillName = this.activeVisibleSkillForFighter(side, slot);
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
                : selected
                  ? 'ACTIVE'
                  : dead
                    ? 'DOWN'
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
      color: dead ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
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

    const activeStatuses = this.activeStatuses(character);
    const visibleStatusLabels = this.visibleStatusLabels(character);
    visibleStatusLabels.forEach((label, index) => {
      const renderedLabel = selectedSkill ? label : `${label} >`;
      const chipW = Math.min(w - 8, Math.max(52, renderedLabel.length * 6.6 + 12));
      const chipX = x + w - chipW - 4;
      const chipY = y + 27 + index * 20;
      this.graphics.fillStyle(this.statusTone(activeStatuses[index]), 0.9);
      this.graphics.fillRect(chipX, chipY, chipW, 18);
      this.mono(chipX + chipW / 2, chipY + 2, renderedLabel, {
        color: CULLING_COLORS.inverseText,
        fontSize: '12px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
    });
    if (activeStatuses.length > 2) {
      const moreLabel = `+${activeStatuses.length - 2} MORE`;
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
        store.target(side, slot);
      },
      disabled: false,
    });
    if (activeStatuses.length && !selectedSkill) {
      this.registerHitTarget(
        x + w - Math.min(72, w - 8),
        y + 20,
        Math.min(72, w - 8),
        Math.min(58, 18 * Math.min(3, activeStatuses.length)),
        `Inspect ${fighterName} statuses`,
        () => store.inspectFighter(side, slot),
        { cue: 'reveal' },
      );
    }
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
    const replayY = Math.min(layout.fieldBottom - 34, layout.fieldTop + 30);
    const replayW = Math.min(308, frame.width - 52);
    this.graphics.fillStyle(CULLING_COLORS.ivory, 0.82);
    this.graphics.fillRect(frame.x + (frame.width - replayW) / 2, replayY, replayW, 18);
    this.mono(frame.x + frame.width / 2, replayY + 2, shortText(event.message || event.type, 38), {
      color,
      fontSize: '12px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
  }

  renderVisibleActionBanner(frame, layout) {
    const action = typeof this.store.currentVisibleAction === 'function'
      ? this.store.currentVisibleAction()
      : null;
    if (!action) return;
    const payload = action.payload || {};
    const opponent = payload.player_id === this.store.enemyId();
    const tone = opponent ? CULLING_COLORS.vermilion : CULLING_COLORS.cobalt;
    const x = layout.contentX;
    const y = frame.top + layout.topH + 4;
    const w = layout.contentW;
    const h = Math.max(20, Math.min(28, layout.enemyY - y - 4));
    const headingW = frame.width < 380 ? 110 : 118;
    this.graphics.fillStyle(CULLING_COLORS.ivory, 0.96);
    this.graphics.fillPoints(clippedPoints(x, y, w, h, 5), true);
    this.graphics.fillStyle(tone, 0.92);
    this.graphics.fillPoints(clippedPoints(x, y, headingW, h, 5), true);
    this.graphics.lineStyle(1.5, tone, 0.82);
    this.graphics.strokePoints(clippedPoints(x, y, w, h, 5), true);
    this.mono(x + 8, y + Math.max(3, (h - 14) / 2), opponent ? 'OPPONENT USED' : 'YOU USED', {
      color: CULLING_COLORS.inverseText,
      fontSize: '12px',
      fontStyle: '700',
    });
    this.text(x + headingW + 8, y + Math.max(2, (h - 16) / 2), shortText(action.message || 'Visible skill resolved', 42), {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      color: CULLING_COLORS.text,
      fontSize: h <= 21 ? '12px' : '13px',
      fontStyle: '900',
      wordWrap: { width: w - headingW - 14 },
    }).setMaxLines(1);
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
    this.graphics.fillStyle(selected ? CULLING_COLORS.gold : CULLING_COLORS.charcoal, 0.96);
    this.graphics.fillPoints([
      { x: numberX, y: numberY - 9 },
      { x: numberX + 9, y: numberY },
      { x: numberX, y: numberY + 9 },
      { x: numberX - 9, y: numberY },
    ], true);
    this.mono(numberX, numberY - 5, String(index + 1), {
      color: selected ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
      fontSize: '10px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);

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

    const statusLine = state.disabled
      ? compactSkillCardDisabledReason(state.reason)
      : selected
        ? 'SELECTED / TAP AGAIN FOR INFO'
        : `${this.store.targetLabel(skill).toUpperCase()} / READY`;
    const statusTone = state.disabled
      ? CULLING_COLORS.redText
      : selected
        ? CULLING_COLORS.text
        : CULLING_COLORS.cobaltText;
    if (selected && !state.disabled) {
      this.graphics.fillStyle(CULLING_COLORS.gold, 0.22);
      this.graphics.fillRect(contentX - 3, y + 31, contentW + 3, Math.max(22, h - 48));
    }
    const reasonNode = this.text(contentX, y + 31, statusLine, {
      fontFamily: TOKEN_TYPE.mono || 'monospace',
      fontSize: '12px',
      fontStyle: '800',
      color: statusTone,
      align: 'left',
      lineSpacing: state.disabled ? -4 : -2,
      wordWrap: { width: contentW },
    });
    reasonNode.setMaxLines(state.disabled ? 4 : 3);

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
      const pipTone = ENERGY_COLORS[color] || CULLING_COLORS.charcoal;
      this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.22);
      this.graphics.fillCircle(px, pipY, 6);
      this.graphics.fillStyle(pipTone, state.disabled ? 0.34 : color === 'white' ? 0.94 : 0.98);
      this.graphics.fillCircle(px, pipY, 4.8);
      this.graphics.lineStyle(1, color === 'white' ? CULLING_COLORS.charcoal : pipTone, 0.82);
      this.graphics.strokeCircle(px, pipY, 5.6);
      this.mono(px, pipY - 4.7, ENERGY_LABELS[color] || 'X', {
        color: color === 'white' ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
        fontSize: '10px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
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
    );
  }

  renderIdentityStrip(frame, layout, selected) {
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

  renderBottomActions(frame, layout) {
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

  renderCommandDeck(frame, layout, selected) {
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
      fontSize: '12px',
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
      fontSize: '12px',
    });
    const detailSeconds = typeof this.store.phaseSecondsRemaining === 'function'
      ? this.store.phaseSecondsRemaining()
      : Number(this.store.state && this.store.state.phase_seconds_remaining);
    const detailStage = this.store.interactionStage();
    this.mono(x + w - 17, y + 92, `${detailStage.timerLabel} ${clockLabel(detailSeconds)}`, {
      color: Number.isFinite(detailSeconds) && detailSeconds <= 10 ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
      fontSize: '12px',
      fontStyle: '700',
    }).setOrigin(1, 0);
    this.costPips(x + 23, y + 123, adjusted, 15);
    const classLine = (skill.classes || []).map((value) => titleize(value)).join(' / ') || 'Technique';
    const slotLine = skill.effective_skill_id ? `${classLine} / REPLACED IN ORIGINAL SLOT` : classLine;
    const slotNode = this.mono(x + 17, y + 148, slotLine, {
      color: CULLING_COLORS.cobaltText,
      fontSize: '12px',
      lineSpacing: -2,
      wordWrap: { width: w - 34 },
    });
    slotNode.setMaxLines(2);
    const available = reason === 'Available now';
    this.graphics.fillStyle(available ? COLORS.queued : CULLING_COLORS.enemy, 0.14);
    this.graphics.fillRect(x + 17, y + 175, w - 34, 38);
    this.graphics.fillStyle(available ? COLORS.queued : CULLING_COLORS.enemy, 0.86);
    this.graphics.fillRect(x + 17, y + 175, 4, 38);
    this.text(x + 29, y + 186, reason, {
      fontFamily: TOKEN_TYPE.mono || 'monospace',
      fontSize: '12px',
      fontStyle: '700',
      color: available ? '#357D4B' : CULLING_COLORS.redText,
      wordWrap: { width: w - 62 },
    }).setMaxLines(2);
    this.mono(x + 17, y + 234, 'AUTHORITATIVE EFFECT', {
      color: CULLING_COLORS.cobaltText,
      fontSize: '12px',
      fontStyle: '700',
    });
    this.text(x + 17, y + 256, skill.description || this.store.effectLine(skill), {
      fontSize: '14px',
      color: CULLING_COLORS.text,
      lineSpacing: 3,
      wordWrap: { width: w - 34 },
    });
    drawCurrentButton(this, x + 17, frame.bottom - 44, w - 34, 44, 'RETURN TO BATTLEFIELD', () => this.store.closeSkillDetail(), {
      fill: CULLING_COLORS.cobalt,
      stroke: CULLING_COLORS.charcoal,
      color: CULLING_COLORS.inverseText,
      fontSize: '14px',
      display: false,
      radius: 12,
    });
  }

  statusDurationText(status) {
    const duration = Number(status && status.duration);
    const clock = titleize(safeText(status && status.duration_clock, 'round').replaceAll('_', ' '));
    if (!Number.isFinite(duration) || duration < 0) return 'PERSISTENT';
    return `${duration} ${clock}${duration === 1 ? '' : 's'}`.toUpperCase();
  }

  statusEffectSummary(status) {
    const payload = (status && status.payload) || {};
    const details = [];
    const stunned = (payload.stun_classes || []).map((value) => titleize(value));
    if (payload.stun_harmful) details.push('Harmful skills disabled');
    if (stunned.length) details.push(stunned.includes('All') ? 'All skill classes disabled' : `${stunned.join(' / ')} skills disabled`);
    if (payload.cannot_target_allies) details.push('Ally-targeting skills disabled');
    if (payload.block_non_damaging_skills) details.push('Non-damaging skills disabled');
    if (payload.block_counters) details.push('Counter skills disabled');
    if (payload.invulnerable_to_all) details.push('Cannot be targeted by any skill');
    else if (payload.invulnerable) details.push('Cannot be targeted by harmful skills');
    if (payload.anti_domain) details.push('Converts sure-hit to normal damage');
    if (Number(payload.destructible_defense || 0)) details.push(`${payload.destructible_defense} destructible defense`);
    if (Number(payload.damage_reduction || 0)) details.push(`${payload.damage_reduction} damage reduction`);
    if (Number(payload.damage_output_delta || 0)) {
      const delta = Number(payload.damage_output_delta);
      details.push(`${delta > 0 ? '+' : ''}${delta} outgoing damage`);
    }
    if (Number(payload.turn_end_damage || 0)) {
      details.push(`${payload.turn_end_damage} ${titleize(payload.turn_end_damage_type || 'normal')} damage at turn end`);
    }
    if (Number(payload.turn_end_heal || 0)) details.push(`Heals ${payload.turn_end_heal} at turn end`);
    if (payload.counter) details.push('Counter armed');
    if (payload.reflect) details.push('Reflect armed');
    if (!details.length) {
      const families = ((status && status.families) || []).map((family) => titleize(family));
      details.push(families.length ? `${families.join(' / ')} status active` : 'Status effect active');
    }
    return details.slice(0, 2).join(' · ');
  }

  renderFighterStatusSheet(frame, inspected) {
    const character = inspected.character;
    const statuses = this.activeStatuses(character);
    const x = frame.x + 10;
    const y = Math.max(frame.top + 92, Math.round(frame.height * 0.23));
    const w = frame.width - 20;
    const h = frame.bottom - y + 14;
    const enemy = inspected.side === 'enemy';
    const tone = enemy ? CULLING_COLORS.vermilion : CULLING_COLORS.cobalt;

    this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.34);
    this.graphics.fillRect(0, 0, frame.fullWidth || frame.width, frame.fullHeight || frame.height);
    drawCurrentPanel(this, x, y, w, h, {
      fill: CULLING_COLORS.ivory,
      stroke: tone,
      accent: tone,
      radius: 18,
      alpha: 0.995,
      shadowY: 0,
      shadowAlpha: 0.28,
    });
    this.buttons.push({
      x: 0,
      y: 0,
      w: frame.fullWidth || frame.width,
      h: frame.fullHeight || frame.height,
      label: 'Status inspection overlay',
      onClick: () => {},
      disabled: false,
    });

    this.mono(x + 16, y + 14, `${enemy ? 'ENEMY' : 'ALLY'} / STATUS & AILMENTS / SERVER VISIBLE`, {
      color: enemy ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
      fontSize: '12px',
      fontStyle: '700',
    });
    this.text(x + 16, y + 34, character.name || 'Fighter', {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: '21px',
      fontStyle: '900',
      color: CULLING_COLORS.text,
      wordWrap: { width: w - 98 },
    }).setMaxLines(2);
    this.mono(x + 16, y + 79, `${Number(character.hp || 0)}/${Number(character.max_hp || 0)} HP · ${statuses.length} ACTIVE ${statuses.length === 1 ? 'STATUS' : 'STATUSES'}`, {
      color: CULLING_COLORS.text,
      fontSize: '12px',
      fontStyle: '700',
    });
    const sheetSeconds = typeof this.store.phaseSecondsRemaining === 'function'
      ? this.store.phaseSecondsRemaining()
      : Number(this.store.state && this.store.state.phase_seconds_remaining);
    const sheetStage = this.store.interactionStage();
    this.mono(x + w - 16, y + 79, `${sheetStage.timerLabel} ${clockLabel(sheetSeconds)}`, {
      color: Number.isFinite(sheetSeconds) && sheetSeconds <= 10 ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
      fontSize: '12px',
      fontStyle: '700',
    }).setOrigin(1, 0);
    drawCurrentButton(this, x + w - 56, y + 12, 44, 44, '×', () => this.store.closeFighterInspection(), {
      fill: CULLING_COLORS.vermilion,
      stroke: CULLING_COLORS.charcoal,
      color: CULLING_COLORS.inverseText,
      fontSize: '18px',
      display: false,
      radius: 10,
      brush: 'red',
    });

    const listY = y + 106;
    const buttonY = frame.bottom - 44;
    const rowGap = 6;
    const availableH = Math.max(0, buttonY - listY - 10);
    const rowStep = 94;
    const maxRows = Math.max(1, Math.floor((availableH + rowGap) / rowStep));
    const visibleStatuses = statuses.slice(0, maxRows);
    if (!visibleStatuses.length) {
      this.graphics.fillStyle(CULLING_COLORS.concrete, 0.54);
      this.graphics.fillRect(x + 16, listY, w - 32, 76);
      this.text(x + 28, listY + 19, 'No active visible status or ailment.', {
        fontSize: '13px',
        fontStyle: '700',
        color: CULLING_COLORS.text,
      });
      this.mono(x + 28, listY + 46, 'HIDDEN ENEMY INFORMATION REMAINS PRIVATE', {
        color: CULLING_COLORS.mutedText,
        fontSize: '12px',
        wordWrap: { width: w - 56 },
      });
    }
    visibleStatuses.forEach((status, index) => {
      const rowY = listY + index * rowStep;
      const hostile = status.source_player_id && status.target_player_id
        && status.source_player_id !== status.target_player_id;
      const rowTone = hostile ? CULLING_COLORS.vermilion : CULLING_COLORS.cobalt;
      this.graphics.fillStyle(CULLING_COLORS.concrete, 0.46);
      this.graphics.fillRect(x + 16, rowY, w - 32, 88);
      this.graphics.fillStyle(rowTone, 0.9);
      this.graphics.fillRect(x + 16, rowY, 4, 88);
      const exactName = safeText(status.name || status.id || 'Status');
      this.text(x + 28, rowY + 7, exactName, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: exactName.length > 26 ? '12px' : '13px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
        wordWrap: { width: w - 152 },
      }).setMaxLines(2);
      this.mono(x + w - 18, rowY + 8, this.statusDurationText(status), {
        color: hostile ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
        fontSize: '12px',
        fontStyle: '700',
      }).setOrigin(1, 0);
      const sourceSkillName = this.statusSourceSkillName(status);
      if (sourceSkillName) {
        const sourceNode = this.mono(x + 28, rowY + 35, `SOURCE SKILL · ${sourceSkillName.toUpperCase()}`, {
          color: hostile ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
          fontSize: '12px',
          fontStyle: '700',
          lineSpacing: -2,
          wordWrap: { width: w - 56 },
        });
        sourceNode.setMaxLines(2);
      }
      this.text(x + 28, rowY + (sourceSkillName ? 64 : 35), this.statusEffectSummary(status), {
        fontSize: '12px',
        color: CULLING_COLORS.text,
        lineSpacing: -2,
        wordWrap: { width: w - 58 },
      }).setMaxLines(sourceSkillName ? 1 : 2);
    });
    if (statuses.length > visibleStatuses.length) {
      this.mono(x + w / 2, buttonY - 19, `+${statuses.length - visibleStatuses.length} MORE ACTIVE STATUSES`, {
        color: CULLING_COLORS.mutedText,
        fontSize: '12px',
        fontStyle: '700',
      }).setOrigin(0.5, 0);
    }
    drawCurrentButton(this, x + 16, buttonY, w - 32, 44, 'RETURN TO BATTLEFIELD', () => this.store.closeFighterInspection(), {
      fill: CULLING_COLORS.cobalt,
      stroke: CULLING_COLORS.charcoal,
      color: CULLING_COLORS.inverseText,
      fontSize: '14px',
      display: false,
      radius: 12,
    });
  }

  renderTransmuteSheet(frame) {
    const me = this.store.me();
    const energy = (me && me.energy) || {};
    const selectedCount = this.store.transmuteSources.length;
    const x = frame.x + 8;
    const y = frame.top + 66;
    const w = frame.width - 16;
    const h = frame.bottom - y - 6;
    const sourceStartY = y + 124;
    const rowH = 50;
    const rowGap = 5;

    this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.62);
    this.graphics.fillRect(0, 0, frame.fullWidth || frame.width, frame.fullHeight || frame.height);
    drawCurrentPanel(this, x, y, w, h, {
      fill: CULLING_COLORS.ivory,
      stroke: CULLING_COLORS.cyan,
      accent: CULLING_COLORS.cobalt,
      radius: 18,
      alpha: 0.998,
      shadowY: 0,
      shadowAlpha: 0.3,
    });

    // The blocker is registered before sheet controls because pointer hits are
    // resolved in reverse order. Nothing on the battlefield remains tappable.
    this.registerHitTarget(
      0,
      0,
      frame.fullWidth || frame.width,
      frame.fullHeight || frame.height,
      'Transmutation overlay',
      () => {},
    );

    this.mono(x + 16, y + 13, 'OPTIONAL / ONCE PER TURN / BEFORE QUEUE', {
      color: CULLING_COLORS.cobaltText,
      fontSize: '12px',
      fontStyle: '700',
    });
    this.text(x + 16, y + 33, 'ENERGY TRANSMUTATION', {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: frame.width < 380 ? '20px' : '23px',
      fontStyle: '900',
      color: CULLING_COLORS.text,
    });
    drawCurrentButton(this, x + w - 56, y + 10, 44, 44, 'X', () => this.store.closeTransmute(), {
      fill: CULLING_COLORS.vermilion,
      stroke: CULLING_COLORS.charcoal,
      color: CULLING_COLORS.inverseText,
      fontSize: '15px',
      display: false,
      radius: 10,
      brush: 'red',
    });
    this.text(x + 16, y + 66, 'Sacrifice exactly 5 energy pips, in any mix, to create 1 energy of your choice.', {
      fontSize: '13px',
      fontStyle: '700',
      color: CULLING_COLORS.text,
      lineSpacing: 2,
      wordWrap: { width: w - 32 },
    }).setMaxLines(2);

    this.mono(x + 16, y + 100, `1 / CHOOSE SACRIFICE  ${selectedCount}/5`, {
      color: selectedCount === 5 ? '#357D4B' : CULLING_COLORS.redText,
      fontSize: '12px',
      fontStyle: '800',
    });

    CORE_ENERGY.forEach((color, index) => {
      const rowY = sourceStartY + index * (rowH + rowGap);
      const available = Number(energy[color] || 0);
      const chosen = this.store.transmuteSourceCount(color);
      const tone = ENERGY_COLORS[color];
      this.graphics.fillStyle(CULLING_COLORS.concrete, chosen ? 0.55 : 0.34);
      this.graphics.fillRect(x + 14, rowY, w - 28, rowH);
      this.graphics.fillStyle(tone, color === 'white' ? 0.82 : 0.96);
      this.graphics.fillCircle(x + 34, rowY + rowH / 2, 12);
      this.graphics.lineStyle(1.5, color === 'white' ? CULLING_COLORS.charcoal : tone, 0.92);
      this.graphics.strokeCircle(x + 34, rowY + rowH / 2, 13);
      this.mono(x + 34, rowY + 18, ENERGY_LABELS[color], {
        color: color === 'white' ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
        fontSize: '10px',
        fontStyle: '900',
      }).setOrigin(0.5, 0);
      this.text(x + 54, rowY + 7, ENERGY_NAMES[color], {
        fontSize: '12px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
      });
      this.mono(x + 54, rowY + 28, `OWNED ${available} / CHOSEN ${chosen}`, {
        color: chosen ? CULLING_COLORS.cobaltText : CULLING_COLORS.mutedText,
        fontSize: '12px',
        fontStyle: '700',
      });
      const minusX = x + w - 112;
      const plusX = x + w - 62;
      drawCurrentButton(this, minusX, rowY + 3, 44, 44, '-', () => this.store.removeTransmuteSource(color), {
        disabled: chosen <= 0,
        disabledReason: `No ${ENERGY_NAMES[color]} energy is selected for sacrifice.`,
        accessibilityLabel: `Remove one ${ENERGY_NAMES[color]} energy from sacrifice`,
        accessibilityId: `transmute-remove-${color}`,
        fill: CULLING_COLORS.ivory,
        stroke: CULLING_COLORS.cobalt,
        color: CULLING_COLORS.cobaltText,
        fontSize: '18px',
        display: false,
        radius: 8,
      });
      drawCurrentButton(this, plusX, rowY + 3, 44, 44, '+', () => this.store.addTransmuteSource(color), {
        disabled: selectedCount >= 5 || chosen >= available,
        disabledReason: selectedCount >= 5
          ? 'Exactly five sacrifice pips are already selected.'
          : `No more ${ENERGY_NAMES[color]} energy is available.`,
        accessibilityLabel: `Add one ${ENERGY_NAMES[color]} energy to sacrifice`,
        accessibilityId: `transmute-add-${color}`,
        fill: CULLING_COLORS.cobalt,
        stroke: CULLING_COLORS.charcoal,
        color: CULLING_COLORS.inverseText,
        fontSize: '18px',
        display: false,
        radius: 8,
      });
    });

    const targetLabelY = sourceStartY + CORE_ENERGY.length * (rowH + rowGap) + 5;
    this.mono(x + 16, targetLabelY, '2 / CHOOSE THE 1 ENERGY TO CREATE', {
      color: this.store.transmuteTarget ? '#357D4B' : CULLING_COLORS.redText,
      fontSize: '12px',
      fontStyle: '800',
    });
    const targetY = targetLabelY + 20;
    const targetGap = 6;
    const targetW = (w - 28 - targetGap * 3) / 4;
    CORE_ENERGY.forEach((color, index) => {
      const selected = this.store.transmuteTarget === color;
      const targetX = x + 14 + index * (targetW + targetGap);
      drawCurrentButton(this, targetX, targetY, targetW, 68, ENERGY_LABELS[color], () => this.store.selectTransmuteTarget(color), {
        accessibilityLabel: `Create one ${ENERGY_NAMES[color]} energy`,
        accessibilityId: `transmute-create-${color}`,
        fill: selected ? ENERGY_COLORS[color] : CULLING_COLORS.ivory,
        stroke: selected ? CULLING_COLORS.gold : ENERGY_COLORS[color],
        color: selected && color !== 'white' ? CULLING_COLORS.inverseText : CULLING_COLORS.text,
        fontSize: '16px',
        display: false,
        radius: 8,
      });
      this.mono(targetX + targetW / 2, targetY + 49, ENERGY_NAMES[color].toUpperCase(), {
        color: selected && color !== 'white' ? CULLING_COLORS.inverseText : CULLING_COLORS.mutedText,
        fontSize: '12px',
        fontStyle: '800',
      }).setOrigin(0.5, 0);
    });

    const resultY = targetY + 77;
    const targetName = this.store.transmuteTarget ? ENERGY_NAMES[this.store.transmuteTarget] : 'not chosen';
    this.graphics.fillStyle(CULLING_COLORS.cobalt, 0.08);
    this.graphics.fillRect(x + 14, resultY, w - 28, 38);
    this.mono(x + w / 2, resultY + 13, `RESULT  ${selectedCount}/5 SPENT  ->  1 ${String(targetName).toUpperCase()}`, {
      color: selectedCount === 5 && this.store.transmuteTarget ? CULLING_COLORS.cobaltText : CULLING_COLORS.mutedText,
      fontSize: '12px',
      fontStyle: '800',
    }).setOrigin(0.5, 0);

    const actionY = frame.bottom - 52;
    const actionGap = 8;
    const cancelW = Math.min(104, Math.round((w - 40) * 0.32));
    drawCurrentButton(this, x + 14, actionY, cancelW, 44, 'CANCEL', () => this.store.closeTransmute(), {
      accessibilityLabel: 'Cancel transmutation',
      accessibilityId: 'transmute-cancel',
      fill: CULLING_COLORS.ivory,
      stroke: CULLING_COLORS.vermilion,
      color: CULLING_COLORS.redText,
      fontSize: '12px',
      display: false,
      radius: 9,
    });
    drawCurrentButton(this, x + 14 + cancelW + actionGap, actionY, w - 42 - cancelW - actionGap, 44, 'CONFIRM 5 -> 1', () => this.store.confirmTransmute(), {
      disabled: selectedCount !== 5 || !this.store.transmuteTarget,
      disabledReason: selectedCount !== 5
        ? `Select exactly five sacrifice pips; ${selectedCount} selected.`
        : 'Choose the energy type to create.',
      accessibilityLabel: 'Confirm five-to-one transmutation',
      accessibilityId: 'transmute-confirm',
      fill: CULLING_COLORS.cobalt,
      stroke: CULLING_COLORS.gold,
      color: CULLING_COLORS.inverseText,
      fontSize: '14px',
      display: false,
      radius: 9,
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
      fontSize: '12px',
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
    this.renderVisibleActionBanner(frame, layout);

    if (this.store.transmuteOpen) {
      this.renderTransmuteSheet(frame);
      this.toast(frame, { theme: 'light' });
      this.renderPresentationSettingsSheet(frame, {
        onExit: () => this.store.resetToLobby(),
        exitLabel: 'EXIT BATTLE',
      });
      this.syncButtonDebug();
      return;
    }

    const inspected = typeof this.store.inspectedFighterState === 'function'
      ? this.store.inspectedFighterState()
      : null;
    if (inspected) {
      this.renderFighterStatusSheet(frame, inspected);
      this.renderPresentationSettingsSheet(frame, {
        onExit: () => this.store.resetToLobby(),
        exitLabel: 'EXIT BATTLE',
      });
      this.syncButtonDebug();
      return;
    }

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
      ? 'TAP A CYAN ALTERNATE TARGET'
      : this.store.targetingStage === 'venom_secondary'
        ? 'TAP A CYAN SECONDARY TARGET'
        : this.store.targetingStage === 'venom_primary'
          ? 'TAP A CYAN POISONED TARGET'
          : 'TAP A CYAN FIGHTER TO TARGET';
    const connection = this.store.combatConnectionStatus();
    const lockedPrompt = connection.key === 'resuming'
      ? 'RESTORING BATTLE SESSION'
      : ['connecting', 'reconnecting'].includes(connection.key)
        ? 'RECONNECTING TO ARENA'
        : connection.key === 'paused_for_reconnect'
          ? 'BATTLE PAUSED FOR RECONNECT'
          : this.store.queueSubmitting
            ? this.store.pendingCommand && this.store.pendingCommand.kind === 'end_turn'
              ? 'PASSING TURN'
              : 'SERVER VALIDATING QUEUE'
            : this.store.pendingCommand
              ? 'SERVER VALIDATING ACTION'
              : !this.store.isMyTurn()
                ? 'OPPONENT TURN IN PROGRESS'
                : me && me.queue_confirmed
                  ? 'QUEUE CONFIRMED / WAITING'
                  : 'WAITING FOR SERVER';
    const prompt = state.winner_id
      ? 'BATTLE FINISHED'
      : this.store.controlsLocked()
        ? lockedPrompt
        : this.store.queueReviewOpen
          ? 'REVIEW RESOLUTION ORDER'
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
