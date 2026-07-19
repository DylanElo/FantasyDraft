import * as Current from './culling-current-ui.js?v=38';
import * as Flow from './season-three-ui.js?v=38';
import * as PostMatch from './season3-master-ui.js?v=38';
import { S3_TOKENS } from './season3-tokens.js?v=38';

// New presentation code imports this facade. The named compatibility modules
// remain available because the approved scenes already depend on their exact
// layout and rendering variants. The facade makes those variants explicit
// instead of allowing three unrelated "S3" APIs to grow independently.
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
    world: PostMatch.drawS3World,
    panel: PostMatch.drawS3Panel,
    chip: PostMatch.drawS3Tag,
    button: PostMatch.drawS3Button,
    progress: PostMatch.drawS3Progress,
  }),
});

export { S3_TOKENS } from './season3-tokens.js?v=38';

export const Season3Components = Season3UI;
