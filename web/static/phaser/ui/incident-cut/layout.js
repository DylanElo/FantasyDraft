function region(x, y, w, h) {
  return { x, y, w, h, bottom: y + h };
}

export function incidentHomeLayout(frame) {
  const compact = frame.height < 830;
  const top = region(frame.x + 10, frame.top, frame.width - 20, 52);
  const railW = compact ? 82 : 88;
  const rail = region(frame.x + frame.width - railW - 8, top.bottom + 128, railW, compact ? 190 : 208);
  const deploy = region(frame.x + 14, frame.bottom - (compact ? 94 : 104), frame.width - railW - 34, compact ? 78 : 86);
  return {
    frame,
    top,
    title: region(frame.x + 16, top.bottom + 10, frame.width - 32, 82),
    stage: region(frame.x, top.bottom + 70, frame.width, deploy.y - top.bottom - 70),
    rail,
    deploy,
  };
}

export function incidentMatchupLayout(frame) {
  const x = frame.x + 10;
  const w = frame.width - 20;
  const ctaH = 52;
  const cta = region(x, frame.bottom - ctaH, w, ctaH);
  const status = region(x, cta.y - 48, w, 42);
  const header = region(x, frame.top, w, 54);
  return {
    frame,
    header,
    confrontation: region(frame.x, header.bottom + 4, frame.width, status.y - header.bottom - 10),
    status,
    cta,
  };
}

export function incidentCombatLayout(frame) {
  const usableH = frame.bottom - frame.top;
  const compact = usableH < 830;
  const hudH = compact ? 66 : 72;
  const actionH = compact ? 48 : 52;
  const commandH = compact ? 196 : 208;
  const actionY = frame.bottom - actionH;
  const commandY = actionY - commandH;
  const skillY = commandY + (compact ? 10 : 14);
  const identityY = skillY;
  const identityH = 0;
  const stageTop = frame.top + hudH;
  const stageBottom = commandY;
  const x = frame.x + 8;
  const w = frame.width - 16;
  return {
    usableH,
    compact,
    topH: hudH,
    contentX: x,
    contentW: w,
    stageTop,
    stageBottom,
    stageH: stageBottom - stageTop,
    fieldTop: stageTop,
    fieldBottom: stageBottom,
    fieldH: stageBottom - stageTop,
    enemyY: stageTop + (compact ? 64 : 68),
    allyY: stageBottom - (compact ? 174 : 188),
    cardH: compact ? 118 : 126,
    gap: 8,
    cardW: (w - 16) / 3,
    timelineY: stageTop + 4,
    timelineH: compact ? 48 : 52,
    identityY,
    identityH,
    identityW: compact ? 62 : 68,
    skillX: x,
    skillY,
    skillW: (w - 9) / 4,
    skillH: commandY + commandH - skillY - 6,
    skillCardH: commandY + commandH - skillY - 6,
    skillColumns: 4,
    skillRows: 1,
    skillGap: 3,
    commandY,
    commandH,
    reviewY: actionY,
    reviewH: actionH,
  };
}
