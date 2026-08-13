import { CULLING_COLORS, ENERGY_LABELS, TOKEN_TYPE } from '../core/runtime-config.js?v=58';
import { clockLabel, safeText, shortText } from '../core/text.js?v=58';
import { clippedPoints } from '../core/shape.js?v=58';

// Called via `.call(this, ...)` from a one-line delegator method on
// CombatScene -- see web/static/phaser/scenes/combat-sheets.js's docstring
// for why (keeps every `this.store`/`this.mono` reference identical to the
// method bodies this was extracted from, which several
// `tests/test_phaser_*.py` checks assert as literal source text).

export function renderTopHud(frame, state, me, layout) {
  const g = this.graphics;
  const x = frame.x;
  const y = frame.top;
  const w = frame.width;
  const h = layout.topH;
  const mine = this.store.isMyTurn();
  const queueCount = this.store.actions.length;
  const interactionStage = this.store.interactionStage();
  const visiblePlayback = typeof this.store.currentVisibleAction === 'function'
    && !!this.store.currentVisibleAction();
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
  const moveLabel = warning || (visiblePlayback ? 'PLAYBACK' : interactionStage.hudLabel);

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

  this.mono(x + 6, y + 7, 'ROUND', {
    color: CULLING_COLORS.mutedText,
    fontSize: '10px',
    fontStyle: '700',
  });
  this.text(x + 10, y + 18, String(Math.ceil((state.turn_number || 1) / 2)), {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: h < 60 ? '25px' : '27px',
    fontStyle: '900',
    color: CULLING_COLORS.text,
  });

  this.mono(moveX + 8, y + 5, visiblePlayback ? 'RESOLUTION' : interactionStage.label.toUpperCase(), {
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
  const queueSubmitStatus = this.store.queueSubmitStatusLine();
  const queueStatusText = queueSubmitStatus || `QUEUE ${this.store.actions.length}/3`;
  const queueStatusColor = queueSubmitStatus
    ? CULLING_COLORS.gold
    : queueCount ? '#BCEECB' : '#D4D8E0';
  this.mono(moveX + 8, y + h - 15, queueStatusText, {
    color: queueStatusColor,
    fontSize: queueSubmitStatus ? '10px' : '12px',
    fontStyle: '700',
    align: 'left',
    wordWrap: { width: moveW - 10 },
  }).setMaxLines(1);

  const controlsLocked = this.store.controlsLocked() || visiblePlayback;
  const transmuteDisabled = controlsLocked
    || !!this.store.actions.length
    || !!(me && me.energy_converted_this_turn);
  const transmuteDisabledReason = controlsLocked
    ? visiblePlayback
      ? 'Transmutation is unavailable during resolution playback.'
      : 'Transmutation is available only during unlocked Planning.'
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

export function renderCompactStatusHud(frame, state, me, layout) {
  const x = frame.x;
  const y = frame.top;
  const w = frame.width;
  const h = layout.topH;
  const phase = this.store.interactionStage();
  const connection = this.store.combatConnectionStatus();
  const seconds = typeof this.store.phaseSecondsRemaining === 'function'
    ? this.store.phaseSecondsRemaining()
    : Number(state.phase_seconds_remaining);
  const urgent = Number.isFinite(seconds) && seconds <= 10;
  const offline = connection.key !== 'connected';
  const soundW = 58;
  const energyW = Math.min(196, w - soundW - 20);
  const energyX = x + (w - energyW) / 2;

  this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.9);
  this.graphics.fillPoints(clippedPoints(x, y, w, h, 8), true);
  this.graphics.fillStyle(this.store.isMyTurn() ? CULLING_COLORS.gold : CULLING_COLORS.vermilion, 0.96);
  this.graphics.fillRect(x, y + h - 3, w, 3);
  this.graphics.lineStyle(1, CULLING_COLORS.ivory, 0.24);
  this.graphics.strokePoints(clippedPoints(x, y, w, h, 8), true);

  const phaseLabel = offline ? 'RECONNECTING' : phase.label.toUpperCase();
  this.text(x + w / 2, y + 7, `TURN ${String(state.turn_number || 1).padStart(2, '0')}  ·  ${phaseLabel}  ·  ${clockLabel(seconds)}`, {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: frame.width < 380 ? '12px' : '13px',
    fontStyle: '900',
    color: urgent ? '#FF938C' : offline ? '#FFE19A' : CULLING_COLORS.inverseText,
  }).setOrigin(0.5, 0);

  const colors = ['green', 'blue', 'white', 'red'];
  const step = energyW / colors.length;
  colors.forEach((color, index) => {
    const count = Number((me && me.energy && me.energy[color]) || 0);
    const cx = energyX + step * (index + 0.5);
    this.mono(cx, y + 34, `${ENERGY_LABELS[color]}  ${count}`, {
      color: color === 'white' ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
      backgroundColor: color === 'green' ? '#3F8B53' : color === 'blue' ? '#3576B8' : color === 'red' ? '#B6423C' : '#F2E8D5',
      fontSize: '12px',
      fontStyle: '900',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 0);
  });
  const controlsLocked = this.store.controlsLocked();
  const transmuteDisabled = controlsLocked || !!this.store.actions.length || !!(me && me.energy_converted_this_turn);
  this.registerHitTarget(energyX, y, energyW, h, 'Transmute energy 5 to 1', () => this.store.convertEnergy(), {
    disabled: transmuteDisabled,
    disabledReason: controlsLocked
      ? 'Transmutation is available only during unlocked Planning.'
      : this.store.actions.length
        ? 'Clear the queued actions before transmuting energy.'
        : 'Transmutation has already been used this player turn.',
    accessibilityId: 'transmute-energy',
  });

  const presentationSettings = this.presentationLayer && this.presentationLayer.settings;
  const soundLabel = presentationSettings && presentationSettings.muted ? 'MUTED' : 'SOUND';
  this.mono(x + w - soundW / 2 - 4, y + 36, soundLabel, {
    color: CULLING_COLORS.inverseText,
    fontSize: '12px',
    fontStyle: '900',
  }).setOrigin(0.5, 0);
  this.registerHitTarget(x + w - soundW, y + 24, soundW, h - 24, 'Open sound and battle settings', () => this.togglePresentationSettings(true));
}

export function visibleActionSummary(action) {
  const payload = action && action.payload ? action.payload : {};
  const payloadActionId = safeText(payload.action_id);
  const payloadPlayerId = safeText(payload.player_id || payload.source_player_id);
  const store = this.store;
  if (!store) return { message: action && action.message ? action.message : 'Visible skill resolved' };
  const mineId = typeof store.mineId === 'function' ? store.mineId() : null;
  const foe = typeof store.foe === 'function' ? store.foe() : null;
  const me = typeof store.me === 'function' ? store.me() : null;
  const localPending = (store.state && store.state.pending_actions && store.state.pending_actions[payloadPlayerId || mineId]) || [];
  const matchAction = (store.actions || []).find((entry) => entry && entry.id === payloadActionId)
    || (Array.isArray(localPending) ? localPending.find((entry) => entry && entry.id === payloadActionId) : null);
  const actionMessage = safeText(action && action.message);
  const opponentNamed = ((foe && foe.team) || []).some((fighter) => (
    fighter && actionMessage.startsWith(`${safeText(fighter.name)} used `)
  ));
  const isOpponent = payloadPlayerId ? payloadPlayerId !== mineId : opponentNamed;
  if (!matchAction) return { message: action && action.message ? action.message : 'Visible skill resolved', isOpponent };
  const casterPool = isOpponent ? foe : me;
  const caster = casterPool && casterPool.team ? casterPool.team[matchAction.caster_slot] : null;
  const skill = caster ? store.skillFor(caster, matchAction.skill_id) : null;
  const casterName = caster ? safeText(caster.name, safeText(skill && skill.id, 'Unknown caster')) : safeText(skill && skill.id, 'Unknown caster');
  const skillName = safeText(skill && skill.name, safeText(payload.skill_id, 'Unknown technique'));
  const target = store.actionTargetAccessibility
    ? store.actionTargetAccessibility(matchAction)
    : null;
  const cost = caster && skill ? safeText(store.adjustedCost(caster, skill).map((color) => ENERGY_LABELS[color] || safeText(color)).join(''), 'free') : 'free';
  const detailBits = [];
  if (casterName) detailBits.push(`${casterName} used ${skillName}`);
  if (target) detailBits.push(`Target ${target}`);
  detailBits.push(`Cost ${cost}`);
  const wildcardPays = (Array.isArray(matchAction.wildcard_pays) ? matchAction.wildcard_pays : []).map((value) => ENERGY_LABELS[value] || safeText(value));
  if (wildcardPays.length) detailBits.push(`Wild ${wildcardPays.join(', ')}`);
  return {
    message: detailBits.length ? detailBits.join(' • ') : (action && action.message ? action.message : 'Visible skill resolved'),
    isOpponent,
  };
}

export function renderVisibleActionBanner(frame, layout) {
  const action = typeof this.store.currentVisibleAction === 'function'
    ? this.store.currentVisibleAction()
    : null;
  if (!action) return;
  const payload = action.payload || {};
  const summary = this.visibleActionSummary(action);
  const opponent = summary.isOpponent;
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
  this.text(x + headingW + 8, y + Math.max(2, (h - 16) / 2), shortText(summary.message || 'Visible skill resolved', 42), {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    color: CULLING_COLORS.text,
    fontSize: h <= 21 ? '12px' : '13px',
    fontStyle: '900',
    wordWrap: { width: w - headingW - 14 },
  }).setMaxLines(1);
}

export function renderResolutionReceipt(frame, layout) {
  const action = typeof this.store.currentVisibleAction === 'function' ? this.store.currentVisibleAction() : null;
  const summary = action ? this.visibleActionSummary(action) : null;
  const events = [];
  const seenMessages = new Set();
  for (const event of this.store.recentEvents || []) {
    const message = safeText(event && (event.message || event.type)).trim();
    const damage = message.match(/^(.+?) dealt (\d+) damage to (.+)$/i);
    const label = damage
      ? `${shortText(damage[1], 18)} -${damage[2]} → ${shortText(damage[3], 14)}`
      : shortText(message, 42);
    if (!label || seenMessages.has(label)) continue;
    seenMessages.add(label);
    events.push({ event, label });
    if (events.length === 3) break;
  }
  const x = layout.contentX + 8;
  const y = layout.commandY + 12;
  const w = layout.contentW - 16;
  const h = layout.commandH - 24;
  const tone = summary && summary.isOpponent ? CULLING_COLORS.vermilion : CULLING_COLORS.target;

  this.graphics.fillStyle(CULLING_COLORS.charcoal, 0.96);
  this.graphics.fillPoints(clippedPoints(x, y, w, h, 14), true);
  this.graphics.lineStyle(2, tone, 0.92);
  this.graphics.strokePoints(clippedPoints(x, y, w, h, 14), true);
  this.mono(x + 16, y + 12, 'TURN RECEIPT', { color: tone, fontSize: '12px', fontStyle: '900' });
  this.text(x + 16, y + 35, summary ? summary.message : 'Resolving queued actions', {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    color: CULLING_COLORS.inverseText,
    fontSize: '17px',
    fontStyle: '900',
    wordWrap: { width: w - 32 },
    lineSpacing: -2,
  }).setMaxLines(2);
  events.forEach(({ event, label }, index) => {
    const eventToneKey = safeText(event && event.type).includes('damage') ? CULLING_COLORS.redText : CULLING_COLORS.inverseText;
    this.mono(x + 16, y + 88 + index * 24, `0${index + 1}  ${label.toUpperCase()}`, {
      color: eventToneKey,
      fontSize: '12px',
      fontStyle: index === 0 ? '900' : '700',
      wordWrap: { width: w - 32 },
    }).setMaxLines(1);
  });
}
