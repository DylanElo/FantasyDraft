import { TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=36';
import { safeText, titleize } from '../core/text.js?v=36';
import { damageEventAmount } from '../fx/event-metrics.js?v=36';
import { stageEnvironmentTexture } from '../core/asset-registry.js?v=36';
import {
  S3_PALETTE,
  S3_TEXT_COLORS,
  season3ClipPoints,
} from './season3-tokens.js?v=36';

// Compatibility view. New code should import Season3UI from season3-ui.js.
export const S3_COLORS = Object.freeze({
  bone: S3_PALETTE.bone,
  boneBright: S3_PALETTE.boneBright,
  smoke: S3_PALETTE.smoke,
  smokeDeep: S3_PALETTE.smokeDeep,
  ink: S3_PALETTE.ink,
  inkBlue: S3_PALETTE.indigo,
  barrier: S3_PALETTE.red,
  cyan: S3_PALETTE.cyan,
  gold: S3_PALETTE.gold,
  vermilion: S3_PALETTE.red,
  shadow: S3_PALETTE.indigo,
  text: S3_TEXT_COLORS.ink,
  mutedText: '#5B6168',
  inverseText: S3_TEXT_COLORS.inverse,
});

function cutRectPoints(x, y, w, h, cut = 12) {
  return season3ClipPoints(x, y, w, h, cut);
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

export function drawS3World(scene, frame, textureKey, options = {}) {
  const g = scene.graphics;
  stageEnvironmentTexture(scene, textureKey);
  const world = scene.coverImage(textureKey, frame.x, 0, frame.width, frame.height, {
    depth: -30,
    alpha: options.imageAlpha === undefined ? 0.78 : options.imageAlpha,
  });
  if (!world) {
    g.fillGradientStyle(S3_COLORS.boneBright, S3_COLORS.smoke, S3_COLORS.bone, S3_COLORS.boneBright, 1);
    g.fillRect(frame.x, 0, frame.width, frame.height);
  }

  // Preserve the storm-city plate while grading the whole routine post-match
  // surface into bone and smoke. Dark ink remains a structural accent instead
  // of becoming the lower half of the screen.
  g.fillGradientStyle(
    S3_COLORS.boneBright,
    S3_COLORS.smoke,
    S3_COLORS.bone,
    S3_COLORS.boneBright,
    options.topAlpha === undefined ? 0.34 : options.topAlpha,
    options.topAlpha === undefined ? 0.34 : options.topAlpha,
    options.bottomAlpha === undefined ? 0.74 : options.bottomAlpha,
    options.bottomAlpha === undefined ? 0.74 : options.bottomAlpha,
  );
  g.fillRect(frame.x, 0, frame.width, frame.height);

  // Torn bone-paper caps keep the interface light without flattening the city.
  g.fillStyle(S3_COLORS.bone, 0.82);
  g.fillPoints([
    { x: frame.x, y: 0 },
    { x: frame.x + frame.width, y: 0 },
    { x: frame.x + frame.width, y: frame.top + 76 },
    { x: frame.x + frame.width * 0.66, y: frame.top + 63 },
    { x: frame.x + frame.width * 0.34, y: frame.top + 82 },
    { x: frame.x, y: frame.top + 68 },
  ], true);
  g.fillStyle(S3_COLORS.bone, 0.62);
  g.fillPoints([
    { x: frame.x, y: frame.height - 112 },
    { x: frame.x + frame.width * 0.42, y: frame.height - 126 },
    { x: frame.x + frame.width, y: frame.height - 104 },
    { x: frame.x + frame.width, y: frame.height },
    { x: frame.x, y: frame.height },
  ], true);

  // Red barrier coordinates continue across every post-match screen as world
  // geometry, not decoration attached to individual cards.
  const barrierY = frame.top + Math.min(154, Math.max(112, frame.height * 0.16));
  g.lineStyle(1.5, S3_COLORS.barrier, 0.72);
  for (let index = 0; index < 3; index += 1) {
    const y = barrierY + index * 13;
    g.beginPath();
    g.moveTo(frame.x - 12, y + 12);
    g.lineTo(frame.x + frame.width + 12, y - 9);
    g.strokePath();
  }
  [0.18, 0.52, 0.82].forEach((ratio, index) => {
    const x = frame.x + frame.width * ratio;
    g.lineStyle(index === 1 ? 2 : 1, S3_COLORS.barrier, index === 1 ? 0.64 : 0.4);
    g.beginPath();
    g.moveTo(x, barrierY - 29);
    g.lineTo(x + (index - 1) * 10, barrierY + 48);
    g.strokePath();
  });

  // Restrained ink cuts echo the master board without obscuring content.
  g.fillStyle(S3_COLORS.ink, 0.7);
  g.fillTriangle(frame.x, frame.top + 186, frame.x + 20, frame.top + 176, frame.x, frame.top + 222);
  g.fillTriangle(frame.x + frame.width, frame.height - 232, frame.x + frame.width - 24, frame.height - 206, frame.x + frame.width, frame.height - 182);
}

export function drawS3Panel(scene, x, y, w, h, options = {}) {
  const g = scene.graphics;
  const cut = options.cut === undefined ? 12 : options.cut;
  const points = cutRectPoints(x, y, w, h, cut);
  const shadowPoints = cutRectPoints(x + 3, y + 5, w, h, cut);
  const fill = options.fill === undefined ? S3_COLORS.bone : options.fill;
  const accent = options.accent === undefined ? S3_COLORS.barrier : options.accent;

  g.fillStyle(S3_COLORS.shadow, options.shadowAlpha === undefined ? 0.25 : options.shadowAlpha);
  g.fillPoints(shadowPoints, true);
  g.fillStyle(fill, options.alpha === undefined ? 0.94 : options.alpha);
  g.fillPoints(points, true);

  if (options.paperWash !== false) {
    const washH = Math.min(16, Math.max(7, h * 0.18));
    g.fillStyle(S3_COLORS.boneBright, options.washAlpha === undefined ? 0.34 : options.washAlpha);
    g.fillPoints(cutRectPoints(x + 4, y + 4, w - 8, washH, Math.max(3, cut - 5)), true);
  }

  g.lineStyle(options.strokeWidth === undefined ? 2.2 : options.strokeWidth, options.stroke || S3_COLORS.ink, options.strokeAlpha === undefined ? 0.9 : options.strokeAlpha);
  g.strokePoints(points, true);
  g.lineStyle(1, S3_COLORS.boneBright, 0.42);
  g.strokePoints(cutRectPoints(x + 3, y + 3, w - 6, h - 6, Math.max(3, cut - 4)), true);

  if (options.accentEdge !== false) {
    g.lineStyle(options.accentWidth || 4, accent, options.accentAlpha === undefined ? 0.94 : options.accentAlpha);
    g.beginPath();
    g.moveTo(x + cut, y + 1);
    g.lineTo(x + Math.min(w - cut, Math.max(cut + 36, w * 0.36)), y + 1);
    g.strokePath();
    g.fillStyle(accent, 0.92);
    g.fillTriangle(x + w - cut - 24, y, x + w - cut, y, x + w, y + cut + 8);
  }
}

export function drawS3Tag(scene, x, y, label, options = {}) {
  const h = options.h || 22;
  const w = options.w || Math.max(58, safeText(label).length * 6.5 + 20);
  const points = cutRectPoints(x, y, w, h, Math.min(6, h / 3));
  scene.graphics.fillStyle(options.fill === undefined ? S3_COLORS.ink : options.fill, options.alpha === undefined ? 0.94 : options.alpha);
  scene.graphics.fillPoints(points, true);
  scene.graphics.lineStyle(1, options.stroke === undefined ? S3_COLORS.boneBright : options.stroke, 0.55);
  scene.graphics.strokePoints(points, true);
  scene.text(x + w / 2, y + h / 2 - 7, label, {
    fontFamily: TOKEN_TYPE.ui || 'Inter, Arial, sans-serif',
    fontSize: options.fontSize || '10px',
    fontStyle: '800',
    color: options.color || S3_COLORS.inverseText,
  }).setOrigin(0.5, 0);
  return w;
}

export function drawS3Button(scene, x, y, w, h, label, onClick, options = {}) {
  const disabled = !!options.disabled;
  const fill = options.fill === undefined ? S3_COLORS.inkBlue : options.fill;
  const accent = options.accent === undefined ? S3_COLORS.gold : options.accent;
  drawS3Panel(scene, x, y, w, h, {
    fill: disabled ? S3_COLORS.smoke : fill,
    accent,
    alpha: disabled ? 0.78 : 0.98,
    cut: options.cut === undefined ? 9 : options.cut,
    shadowAlpha: disabled ? 0.1 : 0.28,
    washAlpha: disabled ? 0.08 : 0.13,
    strokeWidth: 2.4,
  });
  scene.text(x + w / 2, y + h / 2 - 11, label, {
    fontFamily: options.display === false ? (TOKEN_TYPE.ui || 'Inter, Arial, sans-serif') : (TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif'),
    fontSize: options.fontSize || `${Math.min(22, Math.max(14, Math.round(h * 0.36)))}px`,
    fontStyle: '900',
    color: disabled ? S3_COLORS.mutedText : (options.color || S3_COLORS.inverseText),
    align: 'center',
  }).setOrigin(0.5, 0);
  scene.registerHitTarget(x, y, w, h, options.accessibilityLabel || label, onClick, {
    disabled,
    disabledReason: options.disabledReason || options.reason,
    accessibilityId: options.accessibilityId,
    cue: options.cue,
  });
}

export function drawS3Progress(scene, x, y, w, value, options = {}) {
  const h = options.h || 8;
  const ratio = clamp(Number(value) || 0, 0, 1);
  scene.graphics.fillStyle(S3_COLORS.ink, 0.9);
  scene.graphics.fillRect(x, y, w, h);
  scene.graphics.fillStyle(options.fill === undefined ? S3_COLORS.gold : options.fill, 0.98);
  scene.graphics.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * ratio), Math.max(1, h - 4));
  scene.graphics.lineStyle(1, S3_COLORS.boneBright, 0.56);
  scene.graphics.strokeRect(x, y, w, h);
}

export function resultModel(state, mineId) {
  const resultType = safeText(state && state.result_type).toUpperCase();
  const winnerId = state && state.winner_id;
  const outcome = !state ? 'unknown'
    : winnerId === mineId ? 'win'
      : winnerId ? 'loss'
        : resultType === 'DRAW' ? 'draw'
          : resultType === 'NO_CONTEST' ? 'no_contest'
            : 'unknown';
  const events = Array.isArray(state && state.event_log) ? state.event_log : [];
  const strikes = events
    .map((event) => ({
      message: safeText(event && (event.message || event.type), 'Combat event'),
      amount: damageEventAmount(event),
      type: safeText(event && event.type),
    }))
    .filter((event) => event.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  const winner = state && state.players && winnerId ? state.players[winnerId] : null;
  return {
    outcome,
    resultType,
    label: { win: 'Victory', loss: 'Defeat', draw: 'Draw', no_contest: 'No Contest', unknown: 'Result' }[outcome],
    hero: { win: 'Decisive Win', loss: 'Match Lost', draw: 'Stalemate', no_contest: 'Match Void', unknown: 'Result Pending' }[outcome],
    winnerName: safeText(winner && winner.name),
    winnerTeam: (winner && Array.isArray(winner.team) ? winner.team : []).map((fighter) => safeText(fighter && (fighter.name || fighter.character_id))).filter(Boolean),
    turns: Number(state && state.turn_number) || 0,
    damage: events.reduce((total, event) => total + damageEventAmount(event), 0),
    strikes,
  };
}

export function outcomeVisual(outcome) {
  const visual = {
    win: { accent: S3_COLORS.gold, signal: S3_COLORS.cyan, fill: S3_COLORS.bone, neutral: false },
    loss: { accent: S3_COLORS.vermilion, signal: S3_COLORS.vermilion, fill: S3_COLORS.bone, neutral: false },
    draw: { accent: S3_COLORS.cyan, signal: S3_COLORS.cyan, fill: S3_COLORS.bone, neutral: true },
    no_contest: { accent: S3_COLORS.smokeDeep, signal: S3_COLORS.ink, fill: S3_COLORS.smoke, neutral: true },
    unknown: { accent: S3_COLORS.smokeDeep, signal: S3_COLORS.ink, fill: S3_COLORS.smoke, neutral: true },
  };
  return visual[outcome] || visual.unknown;
}

export function missionRewardModel(state, profile, missions) {
  const progress = (state && state.first_creation_progress) || {};
  const lastCompleted = Array.isArray(progress.last_completed)
    ? progress.last_completed.map((id) => safeText(id)).filter(Boolean)
    : [];
  const completedSet = new Set(lastCompleted);
  const missionList = Array.isArray(missions) ? missions : [];
  const missionById = new Map(missionList.map((mission) => [safeText(mission && mission.id), mission]));
  const missionTitles = lastCompleted.map((id) => safeText((missionById.get(id) || {}).title, titleize(id)));
  const details = Array.isArray(profile && profile.unlock_details) ? profile.unlock_details : [];
  const rewards = details
    .filter((detail) => detail && (detail.owned || detail.status === 'owned') && completedSet.has(safeText(detail.unlocks_after)))
    .map((detail) => ({
      id: safeText(detail.id),
      title: safeText(detail.title, titleize(detail.id)),
      kind: safeText(detail.kind, 'reward'),
      description: safeText(detail.description),
      status: safeText(detail.status, detail.owned ? 'owned' : ''),
    }));
  const completedCount = Array.isArray(profile && profile.completed_missions) ? profile.completed_missions.length : 0;
  const totalMissions = missionList.length;
  return {
    lastCompleted,
    missionTitles,
    rewards,
    completedCount,
    totalMissions,
    ratio: totalMissions ? completedCount / totalMissions : 0,
  };
}

function recordOutcome(record) {
  const result = safeText(record && record.result).toLowerCase();
  if (result === 'victory') return 'win';
  if (result === 'defeat') return 'loss';
  if (result === 'draw') return 'draw';
  if (result === 'no contest') return 'no_contest';
  return 'unknown';
}

export function recordsModel(records) {
  const list = Array.isArray(records) ? records : [];
  const counts = { win: 0, loss: 0, draw: 0, no_contest: 0, unknown: 0 };
  list.forEach((record) => { counts[recordOutcome(record)] += 1; });
  const fastestWin = list
    .filter((record) => recordOutcome(record) === 'win' && Number(record.turns || 0) > 0)
    .sort((a, b) => Number(a.turns || 0) - Number(b.turns || 0))[0];
  const biggestHit = list
    .flatMap((record) => Array.isArray(record.biggest) ? record.biggest : [])
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];
  return {
    records: list.map((record) => ({ ...record, outcome: recordOutcome(record) })),
    counts,
    total: list.length,
    totalDamage: list.reduce((total, record) => total + Math.max(0, Number(record.damage || 0)), 0),
    fastestWin: fastestWin ? Number(fastestWin.turns || 0) : null,
    biggestHit: biggestHit ? Number(biggestHit.amount || 0) : 0,
  };
}

export function resultLayout(frame) {
  const gutter = frame.gutter || 16;
  const x = frame.x + gutter;
  const w = frame.width - gutter * 2;
  const usable = frame.bottom - frame.top;
  const compact = usable < 760;
  const gap = compact ? 10 : 12;
  const headerH = compact ? 64 : 72;
  const lobbyY = frame.bottom - 44;
  const rematchY = lobbyY - 52;
  const heroH = compact ? 132 : clamp(Math.round(usable * 0.2), 152, 174);
  const metricsH = compact ? 62 : 68;
  const strikesH = compact ? 116 : 132;
  const header = { x, y: frame.top, w, h: headerH };
  const hero = { x, y: header.y + header.h + gap, w, h: heroH };
  const metrics = { x, y: hero.y + hero.h + gap, w, h: metricsH };
  const strikes = { x, y: metrics.y + metrics.h + gap, w, h: strikesH };
  const rewardsY = strikes.y + strikes.h + gap;
  const rewards = { x, y: rewardsY, w, h: Math.max(112, rematchY - gap - rewardsY) };
  return {
    frame,
    compact,
    header,
    hero,
    metrics,
    strikes,
    rewards,
    buttons: {
      rematch: { x, y: rematchY, w, h: 44 },
      lobby: { x, y: lobbyY, w, h: 44 },
    },
  };
}

export function recordsLayout(frame) {
  const gutter = frame.gutter || 16;
  const x = frame.x + gutter;
  const w = frame.width - gutter * 2;
  const usable = frame.bottom - frame.top;
  const compact = usable < 760;
  const gap = compact ? 10 : 12;
  const headerH = compact ? 64 : 72;
  const overviewH = compact ? 74 : 82;
  const statsH = compact ? 68 : 74;
  const rowH = compact ? 52 : 56;
  const rowGap = 6;
  const lobbyY = frame.bottom - 44;
  const pagerY = lobbyY - 52;
  const header = { x, y: frame.top, w, h: headerH };
  const overview = { x, y: header.y + header.h + gap, w, h: overviewH };
  const stats = { x, y: overview.y + overview.h + gap, w, h: statsH };
  const listY = stats.y + stats.h + (compact ? 30 : 34);
  const available = Math.max(0, pagerY - 12 - listY);
  const maxRows = Math.max(0, Math.min(7, Math.floor((available + rowGap) / (rowH + rowGap))));
  return {
    frame,
    compact,
    header,
    overview,
    stats,
    list: { x, y: listY, w, rowH, rowGap, maxRows },
    pager: { x, y: pagerY, w, h: 44 },
    lobby: { x, y: lobbyY, w, h: 44 },
  };
}

export const S3_TYPE = { TOKEN_TYPE, TYPE_SCALE };
