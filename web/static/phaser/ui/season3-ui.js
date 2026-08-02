import * as PostMatch from './season3-master-ui.js?v=57';
import { drawEnergyPip } from './energy-pip.js?v=57';
import { renderModalSheetChrome } from './modal-sheet.js?v=57';
import { S3_TOKENS } from './season3-tokens.js?v=57';
import { bootS3Layout } from './season-three-ui.js?v=57';
import { INCIDENT } from './incident-cut/tokens.js?v=57';
import { incidentCombatLayout, incidentHomeLayout, incidentMatchupLayout } from './incident-cut/layout.js?v=57';
import {
  drawIncidentButton,
  drawIncidentChip,
  drawIncidentCost,
  drawIncidentHeader,
  drawIncidentPager,
  drawIncidentPortrait,
  drawIncidentProgress,
  drawIncidentSurface,
  drawIncidentWorld,
} from './incident-cut/presentation.js?v=57';

// This is the only scene-facing presentation entrypoint. The compatibility
// modules remain private implementation variants so the approved Current,
// Flow, and Post Match compositions keep their exact rendering behavior.
export const IncidentCutUI = Object.freeze({
  tokens: S3_TOKENS,
  current: Object.freeze({
    world: drawIncidentWorld,
    panel: drawIncidentSurface,
    button: drawIncidentButton,
    energyPip: drawEnergyPip,
    modalSheet: renderModalSheetChrome,
  }),
  flow: Object.freeze({
    colors: INCIDENT,
    bootLayout: bootS3Layout,
    world: drawIncidentWorld,
    panel: drawIncidentSurface,
    chip: drawIncidentChip,
    button: drawIncidentButton,
    header: drawIncidentHeader,
    progress: drawIncidentProgress,
    portrait: drawIncidentPortrait,
    cost: drawIncidentCost,
    pager: drawIncidentPager,
  }),
  postMatch: Object.freeze({
    colors: INCIDENT,
    world: drawIncidentWorld,
    panel: drawIncidentSurface,
    button: drawIncidentButton,
    progress: drawIncidentProgress,
    missionRewardModel: PostMatch.missionRewardModel,
    outcomeVisual: PostMatch.outcomeVisual,
    recordsLayout: PostMatch.recordsLayout,
    recordsModel: PostMatch.recordsModel,
    resultLayout: PostMatch.resultLayout,
    resultModel: PostMatch.resultModel,
  }),
});

// Compatibility export while scenes migrate; only Incident Cut renders.
export const Season3UI = IncidentCutUI;

export const IncidentCutLayouts = Object.freeze({
  combat: incidentCombatLayout,
  home: incidentHomeLayout,
  matchup: incidentMatchupLayout,
});

export { S3_TOKENS } from './season3-tokens.js?v=57';

export const Season3Components = Season3UI;
