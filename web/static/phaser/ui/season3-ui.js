import * as Current from './culling-current-ui.js?v=42';
import * as Flow from './season-three-ui.js?v=42';
import * as PostMatch from './season3-master-ui.js?v=42';
import { S3_TOKENS } from './season3-tokens.js?v=42';

// This is the only scene-facing presentation entrypoint. The compatibility
// modules remain private implementation variants so the approved Current,
// Flow, and Post Match compositions keep their exact rendering behavior.
export const Season3UI = Object.freeze({
  tokens: S3_TOKENS,
  current: Object.freeze({
    world: Current.drawCurrentWorld,
    panel: Current.drawCurrentPanel,
    chip: Current.drawCurrentPill,
    button: Current.drawCurrentButton,
    modeCard: Current.drawCurrentModeCard,
    navigation: Current.drawCurrentNav,
  }),
  flow: Object.freeze({
    colors: Flow.S3_COLORS,
    bootLayout: Flow.bootS3Layout,
    draftLayout: Flow.draftS3Layout,
    missionMapLayout: Flow.missionMapS3Layout,
    world: Flow.drawS3World,
    panel: Flow.drawS3Panel,
    chip: Flow.drawS3Chip,
    button: Flow.drawS3Button,
    header: Flow.drawS3Header,
    progress: Flow.drawS3Progress,
    portrait: Flow.drawS3Portrait,
    cost: Flow.drawS3Cost,
    pager: Flow.drawS3Pager,
  }),
  postMatch: Object.freeze({
    colors: PostMatch.S3_COLORS,
    world: PostMatch.drawS3World,
    panel: PostMatch.drawS3Panel,
    chip: PostMatch.drawS3Tag,
    button: PostMatch.drawS3Button,
    progress: PostMatch.drawS3Progress,
    missionRewardModel: PostMatch.missionRewardModel,
    outcomeVisual: PostMatch.outcomeVisual,
    recordsLayout: PostMatch.recordsLayout,
    recordsModel: PostMatch.recordsModel,
    resultLayout: PostMatch.resultLayout,
    resultModel: PostMatch.resultModel,
  }),
});

export { S3_TOKENS } from './season3-tokens.js?v=42';

export const Season3Components = Season3UI;
