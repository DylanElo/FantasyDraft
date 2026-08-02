import {
  COLORS,
  CORE_ENERGY,
  CULLING_COLORS,
  ENERGY_COLORS,
  ENERGY_LABELS,
  ENERGY_NAMES,
  TOKEN_TYPE,
} from '../core/runtime-config.js?v=57';
import { clockLabel, safeText, shortText, titleize } from '../core/text.js?v=57';
import { eventTone } from '../fx/event-metrics.js?v=57';
import {
  activeStatuses,
  statusDurationText,
  statusEffectSummary,
} from '../core/status-presentation.js?v=57';
import { Season3UI } from '../ui/season3-ui.js?v=57';

const {
  button: drawCurrentButton,
  panel: drawCurrentPanel,
  modalSheet: renderModalSheetChrome,
} = Season3UI.current;

// Each function below is called via `.call(this, ...)` from a one-line
// delegator method on CombatScene (see render()'s dispatch) rather than
// taking `scene` as an explicit parameter. That keeps every `this.store`/
// `this.mono`/etc. reference byte-for-byte identical to the method bodies
// this was extracted from, which matters here specifically because several
// `tests/test_phaser_*.py` checks assert literal substrings (e.g.
// "this.store.transmuteSourceCount(color)") against this file's source
// text -- renaming `this` to a `scene` parameter would have silently broken
// those checks for no behavioral benefit.

export function renderSkillDetailSheet(frame, caster, skill) {
  const adjusted = this.store.adjustedCost(caster, skill);
  const state = this.skillPresentation(skill, caster);
  const reason = state.reason || 'Available now';
  const x = frame.x + 10;
  const y = Math.max(frame.top + 116, frame.height * 0.35);
  const w = frame.width - 20;
  const h = frame.height - y + 18;

  renderModalSheetChrome(this, frame, {
    x,
    y,
    w,
    h,
    dimAlpha: 0.28,
    tone: CULLING_COLORS.gold,
    overlayLabel: 'Skill Detail Overlay',
    onClose: () => this.store.closeSkillDetail(),
    footerLabel: 'RETURN TO BATTLEFIELD',
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
}

export function renderFighterStatusSheet(frame, inspected) {
  const character = inspected.character;
  const statuses = activeStatuses(character);
  const x = frame.x + 10;
  const y = Math.max(frame.top + 92, Math.round(frame.height * 0.23));
  const w = frame.width - 20;
  const h = frame.bottom - y + 14;
  const enemy = inspected.side === 'enemy';
  const tone = enemy ? CULLING_COLORS.vermilion : CULLING_COLORS.cobalt;

  renderModalSheetChrome(this, frame, {
    x,
    y,
    w,
    h,
    dimAlpha: 0.34,
    dimX: 0,
    dimY: 0,
    dimW: frame.fullWidth || frame.width,
    dimH: frame.fullHeight || frame.height,
    tone,
    overlayLabel: 'Status inspection overlay',
    onClose: () => this.store.closeFighterInspection(),
    footerLabel: 'RETURN TO BATTLEFIELD',
    footerX: x + 16,
    footerW: w - 32,
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

  const listY = y + 106;
  const buttonY = frame.bottom - 44;
  const rowGap = 6;
  const availableH = Math.max(0, buttonY - listY - 10);
  const rowStep = 72;
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
    this.graphics.fillRect(x + 16, rowY, w - 32, 68);
    this.graphics.fillStyle(rowTone, 0.9);
    this.graphics.fillRect(x + 16, rowY, 4, 68);
    const exactName = safeText(status.name || status.id || 'Status');
    this.text(x + 28, rowY + 6, exactName, {
      fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
      fontSize: exactName.length > 26 ? '12px' : '13px',
      fontStyle: '900',
      color: CULLING_COLORS.text,
      wordWrap: { width: w - 152 },
    }).setMaxLines(2);
    this.mono(x + w - 18, rowY + 8, statusDurationText(status), {
      color: hostile ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
      fontSize: '12px',
      fontStyle: '700',
    }).setOrigin(1, 0);
    const sourceSkillName = this.statusSourceSkillName(status);
    if (sourceSkillName) {
      const sourceNode = this.mono(x + 28, rowY + 32, `SOURCE SKILL · ${sourceSkillName.toUpperCase()}`, {
        color: hostile ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText,
        fontSize: '10px',
        fontStyle: '700',
        lineSpacing: -2,
        wordWrap: { width: w - 56 },
      });
      sourceNode.setMaxLines(1);
    }
    this.text(x + 28, rowY + (sourceSkillName ? 46 : 28), statusEffectSummary(status), {
      fontSize: '11px',
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
}

export function renderCombatLogSheet(frame) {
  const x = frame.x + 10;
  const y = Math.max(frame.top + 50, Math.round(frame.height * 0.15));
  const w = frame.width - 20;
  const h = frame.bottom - y + 14;

  renderModalSheetChrome(this, frame, {
    x,
    y,
    w,
    h,
    dimAlpha: 0.34,
    tone: CULLING_COLORS.cobalt,
    overlayLabel: 'Combat log overlay',
    onClose: () => this.store.toggleCombatLog(false),
    footerLabel: 'CLOSE LOG',
    footerX: x + 16,
    footerW: w - 32,
  });
  drawCurrentButton(this, x + w - 56, y + 12, 44, 44, '×', () => this.store.toggleCombatLog(false), {
    fill: CULLING_COLORS.vermilion,
    stroke: CULLING_COLORS.charcoal,
    color: CULLING_COLORS.inverseText,
    fontSize: '18px',
    display: false,
    radius: 10,
  });
  this.mono(x + 16, y + 14, 'MATCH HISTORY / SERVER VISIBLE', {
    color: CULLING_COLORS.cobaltText,
    fontSize: '12px',
    fontStyle: '700',
  });
  this.text(x + 16, y + 34, 'Combat Log', {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: '21px',
    fontStyle: '900',
    color: CULLING_COLORS.text,
  });

  const listY = y + 74;
  const buttonY = frame.bottom - 44;
  const rowGap = 2;
  const availableH = Math.max(0, buttonY - listY - 10);
  const rowStep = 32;
  const maxRows = Math.max(1, Math.floor((availableH + rowGap) / rowStep));
  const visibleEvents = this.store.recentEvents.slice(0, maxRows);

  if (!visibleEvents.length) {
    this.graphics.fillStyle(CULLING_COLORS.concrete, 0.54);
    this.graphics.fillRect(x + 16, listY, w - 32, 60);
    this.text(x + 28, listY + 22, 'No events recorded yet.', {
      fontSize: '13px',
      fontStyle: '700',
      color: CULLING_COLORS.text,
    });
  }

  visibleEvents.forEach((event, index) => {
    const rowY = listY + index * rowStep;
    const tone = eventTone(event);
    const isDmg = tone === 'damage';
    const isHeal = tone === 'heal';
    this.graphics.fillStyle(isDmg ? CULLING_COLORS.vermilion : isHeal ? 0x357d4b : CULLING_COLORS.concrete, 0.1);
    this.graphics.fillRect(x + 16, rowY, w - 32, 30);
    this.text(x + 24, rowY + 7, shortText(event.message || event.type, 44), {
      fontSize: '12px',
      fontStyle: '700',
      color: CULLING_COLORS.text,
      wordWrap: { width: w - 48 },
    }).setMaxLines(1);
  });

}

export function renderTransmuteSheet(frame) {
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

export function renderConnecting(frame) {
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
