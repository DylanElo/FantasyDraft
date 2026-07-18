import {
  SKILL_ACTION_ATLAS,
  SKILL_VISUALS,
  SKILL_VISUAL_IDS,
  assertSkillVisualCoverage,
  skillVisualCoverage,
  skillVisualEntries,
  skillVisualFor,
} from './skill-visual-registry.js?v=28';
import { InteractionSfx, INTERACTION_SFX_CUES } from './interaction-sfx.js?v=28';
import { MotionVfx, MOTION_TIMINGS, prefersReducedMotion } from '../fx/motion-vfx.js?v=28';
import {
  drawSkillArtCrop,
  drawSkillIcon,
  skillArtCropRect,
  skillAtlasFrameRect,
  skillIconFormFamily,
} from '../ui/skill-visuals.js?v=28';

export {
  INTERACTION_SFX_CUES,
  InteractionSfx,
  MOTION_TIMINGS,
  MotionVfx,
  SKILL_ACTION_ATLAS,
  SKILL_VISUALS,
  SKILL_VISUAL_IDS,
  assertSkillVisualCoverage,
  drawSkillArtCrop,
  drawSkillIcon,
  prefersReducedMotion,
  skillArtCropRect,
  skillAtlasFrameRect,
  skillIconFormFamily,
  skillVisualCoverage,
  skillVisualEntries,
  skillVisualFor,
};

export function preloadPresentationAssets(scene) {
  if (!scene || !scene.load || !scene.load.image) return false;
  if (scene.textures && scene.textures.exists && scene.textures.exists(SKILL_ACTION_ATLAS.key)) return true;
  scene.load.image(SKILL_ACTION_ATLAS.key, SKILL_ACTION_ATLAS.path);
  return true;
}

const CUE_ALIASES = Object.freeze({
  press: 'press',
  'fighter-tap': 'press',
  'skill-inspect': 'press',
  'queue-clear': 'press',
  select: 'select',
  'fighter-select': 'select',
  'skill-select': 'select',
  target: 'target',
  'target-lock': 'target',
  queue: 'queue',
  'queue-add': 'queue',
  'queue-review-open': 'queue',
  confirm: 'confirm',
  'queue-confirm': 'confirm',
  'turn-pass': 'confirm',
  error: 'error',
  disabled: 'error',
  reveal: 'reveal',
  impact: 'impact',
});

export function createPresentationLayer(scene, options = {}) {
  if (scene && scene.presentationLayer && scene.presentationLayer.__jjkPresentationLayer && !scene.presentationLayer.isDestroyed()) {
    return scene.presentationLayer;
  }
  const ownsAudio = !options.audio;
  const audio = options.audio || new InteractionSfx(options.audioOptions || {});
  const motion = new MotionVfx(scene, options.motionOptions || {});
  const hookHandles = new Map();
  let destroyed = false;
  let gestureUnlock = null;
  if (scene && scene.input && scene.input.once) {
    gestureUnlock = () => audio.unlockFromGesture();
    scene.input.once('pointerdown', gestureUnlock);
  }
  const replaceHandle = (key, nextHandle) => {
    const previous = hookHandles.get(key);
    if (previous && previous.destroy) previous.destroy();
    if (nextHandle) hookHandles.set(key, nextHandle);
    else hookHandles.delete(key);
    return nextHandle;
  };
  const clearHandle = (key) => replaceHandle(key, null);
  const layer = Object.freeze({
    __jjkPresentationLayer: true,
    audio,
    motion,
    isDestroyed: () => destroyed,
    skillVisualFor,
    renderSkillVisual(targetScene, visualOrSkill, region, drawOptions = {}) {
      const visual = visualOrSkill && visualOrSkill.art ? visualOrSkill : skillVisualFor(visualOrSkill);
      if (!visual || !region) return false;
      const activeScene = targetScene || scene;
      const art = drawSkillArtCrop(activeScene, visual.id, region.x, region.y, region.w, region.h, {
        ...drawOptions,
        depth: drawOptions.depth == null ? -1 : drawOptions.depth,
      });
      if (!art) return false;
      if (drawOptions.icon !== false) {
        const iconSize = Math.max(28, Math.min(48, region.w * 0.46, region.h * 0.32));
        drawSkillIcon(
          activeScene,
          visual.id,
          region.x + region.w * 0.5,
          region.y + region.h * 0.48,
          iconSize,
          {
            depth: drawOptions.iconDepth == null ? 2 : drawOptions.iconDepth,
            surfaceAlpha: drawOptions.disabled ? 0.54 : 0.82,
            state: drawOptions.disabled ? 'disabled' : drawOptions.state,
          },
        );
      }
      if (drawOptions.state === 'selected') {
        motion.selectionCommitment(art.image, { duration: MOTION_TIMINGS.select });
      }
      if (drawOptions.sheen) {
        motion.skillCardSheen(art.image, {
          width: region.w,
          height: region.h,
          duration: drawOptions.sheenDuration || 280,
        });
      }
      return true;
    },
    renderFighterState(_targetScene, payload = {}) {
      const key = `fighter:${payload.side || 'side'}:${Number(payload.slot) || 0}`;
      if (!payload.region || payload.dead || (!payload.targetable && !payload.selected)) return clearHandle(key);
      const { x, y, w, h } = payload.region;
      const targetTone = payload.targetable ? 0x35dde8 : 0xd8bf68;
      return replaceHandle(key, motion.legalTargetCue(
        x + w / 2,
        y + h / 2,
        Math.max(18, Math.min(w, h) * 0.43),
        {
          tone: targetTone,
          label: payload.targetable ? 'LEGAL' : '',
          depth: 76,
          duration: payload.targetable ? 700 : 980,
        },
      ));
    },
    renderTargetLane(_targetScene, payload = {}) {
      const key = 'target-lane';
      if (!payload.selectedSkill) return clearHandle(key);
      return replaceHandle(key, motion.legalTargetCue(
        payload.centerX,
        payload.centerY,
        Math.max(24, Number(payload.ringRadius) || 38),
        { tone: 0x35dde8, depth: 74, duration: 820 },
      ));
    },
    renderSelectedFighter(_targetScene, payload = {}) {
      const key = 'selected-fighter';
      if (!payload.character || !payload.region) return clearHandle(key);
      const { x, y, w, h } = payload.region;
      return replaceHandle(key, motion.legalTargetCue(
        x + Math.min(w * 0.45, 48),
        y + Math.min(h * 0.23, 48),
        Math.max(20, Math.min(36, w * 0.28)),
        { tone: payload.queued ? 0x4fb06d : 0xd8bf68, depth: 75, duration: 1100 },
      ));
    },
    interactionCue(_targetScene, payload = {}) {
      const requested = typeof payload === 'string' ? payload : payload.cue;
      const cue = CUE_ALIASES[requested] || null;
      return cue ? audio.play(cue) : false;
    },
    ambientWorld(_targetScene, payload = {}) {
      const region = payload.region || payload;
      return replaceHandle('ambient-world', motion.ambientWorldTreatment(region, payload.options || payload));
    },
    sceneIntro(_targetScene, payload = {}) {
      return motion.sceneIntro(payload.targets || [], payload.options || payload);
    },
    queueCommit(_targetScene, payload = {}) {
      audio.queue();
      return motion.queueCommit(payload.cards || [], payload.options || payload);
    },
    impactFlash(_targetScene, payload = {}) {
      audio.impact();
      return motion.impactFlash(payload.x, payload.y, payload.options || payload);
    },
    skill: Object.freeze({
      visualFor: skillVisualFor,
      entries: skillVisualEntries,
      coverage: skillVisualCoverage,
      assertCoverage: assertSkillVisualCoverage,
      drawIcon: (skillOrId, x, y, size, drawOptions) => drawSkillIcon(scene, skillOrId, x, y, size, drawOptions),
      drawArt: (skillOrId, x, y, width, height, drawOptions) => drawSkillArtCrop(scene, skillOrId, x, y, width, height, drawOptions),
    }),
    async destroy() {
      if (destroyed) return;
      destroyed = true;
      if (gestureUnlock && scene && scene.input && scene.input.off) scene.input.off('pointerdown', gestureUnlock);
      hookHandles.forEach((handle) => handle && handle.destroy && handle.destroy());
      hookHandles.clear();
      motion.destroy();
      if (ownsAudio) await audio.destroy();
    },
  });
  if (scene && scene.events && scene.events.once) scene.events.once('shutdown', () => layer.destroy());
  return layer;
}
