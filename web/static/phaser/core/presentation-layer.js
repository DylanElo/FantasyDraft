import {
  SKILL_ACTION_ATLAS,
  SKILL_ACTION_ATLASES,
  SKILL_VISUALS,
  SKILL_VISUAL_IDS,
  assertSkillVisualCoverage,
  skillVisualCoverage,
  skillVisualEntries,
  skillVisualFor,
} from './skill-visual-registry.js?v=35';
import {
  InteractionSfx,
  INTERACTION_HAPTIC_CUES,
  INTERACTION_SFX_CUES,
  SFX_MIXER_CONFIG,
  getPersistentInteractionSfx,
} from './interaction-sfx.js?v=35';
import {
  DEFAULT_PRESENTATION_SETTINGS,
  PresentationSettings,
  getPersistentPresentationSettings,
} from './presentation-settings.js?v=35';
import { MotionVfx, MOTION_TIMINGS, prefersReducedMotion } from '../fx/motion-vfx.js?v=35';
import {
  drawSkillArtCrop,
  drawSkillIcon,
  skillArtCropRect,
  skillAtlasFrameRect,
  skillIconFormFamily,
} from '../ui/skill-visuals.js?v=35';

export {
  INTERACTION_SFX_CUES,
  INTERACTION_HAPTIC_CUES,
  SFX_MIXER_CONFIG,
  InteractionSfx,
  MOTION_TIMINGS,
  MotionVfx,
  SKILL_ACTION_ATLAS,
  SKILL_ACTION_ATLASES,
  SKILL_VISUALS,
  SKILL_VISUAL_IDS,
  assertSkillVisualCoverage,
  drawSkillArtCrop,
  drawSkillIcon,
  prefersReducedMotion,
  DEFAULT_PRESENTATION_SETTINGS,
  PresentationSettings,
  getPersistentInteractionSfx,
  getPersistentPresentationSettings,
  skillArtCropRect,
  skillAtlasFrameRect,
  skillIconFormFamily,
  skillVisualCoverage,
  skillVisualEntries,
  skillVisualFor,
};

export function preloadPresentationAssets(scene) {
  if (!scene || !scene.load || !scene.load.image) return false;
  Object.values(SKILL_ACTION_ATLASES).forEach((atlas) => {
    if (scene.textures && scene.textures.exists && scene.textures.exists(atlas.key)) return;
    scene.load.image(atlas.key, atlas.path);
  });
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
  reorder: 'reorder',
  'queue-reorder': 'reorder',
  confirm: 'confirm',
  'queue-confirm': 'confirm',
  'turn-pass': 'turn',
  turn: 'turn',
  error: 'error',
  disabled: 'error',
  skill: 'skill',
  'skill-resolve': 'skill',
  heal: 'heal',
  status: 'status',
  'status-change': 'status',
  reveal: 'reveal',
  impact: 'impact',
  result: 'result',
});

function sceneKey(scene) {
  return String(scene && (scene.keyName || (scene.sys && scene.sys.settings && scene.sys.settings.key)) || '');
}

function semanticCueFor(scene, payload) {
  const requested = typeof payload === 'string' ? payload : payload && payload.cue;
  const context = payload && typeof payload === 'object' ? payload.context : null;
  if (requested === 'queue' && context === 'queue-reorder') return 'reorder';
  // ResultScene historically asked for the generic reveal cue. Keep that call
  // compatible while giving the terminal screen its own calmer cadence.
  if (requested === 'reveal' && sceneKey(scene) === 'ResultScene') return 'result';
  return CUE_ALIASES[requested] || null;
}

export function createPresentationLayer(scene, options = {}) {
  if (scene && scene.presentationLayer && scene.presentationLayer.__jjkPresentationLayer && !scene.presentationLayer.isDestroyed()) {
    return scene.presentationLayer;
  }
  const environment = options.environment || (typeof window !== 'undefined' ? window : globalThis);
  const settings = options.settings
    || (options.audio && options.audio.settings)
    || getPersistentPresentationSettings({ environment, storage: options.audioOptions && options.audioOptions.storage });
  const audio = options.audio || getPersistentInteractionSfx({ ...(options.audioOptions || {}), environment, settings });
  const motionOptions = { ...(options.motionOptions || {}) };
  if (motionOptions.reducedMotion == null) motionOptions.reducedMotion = settings.effectiveReducedMotion(environment);
  const motion = new MotionVfx(scene, motionOptions);
  const hookHandles = new Map();
  let destroyed = false;
  let lastQueueSignature = '';
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
  const applyMotionPreference = () => {
    const reduced = settings.effectiveReducedMotion(environment);
    if (reduced && !motion.reducedMotion) {
      // Immediately halt any active presentation tween when the player or OS
      // switches to reduced motion; existing visuals remain as static state.
      Array.from(motion.tweens || []).forEach((tween) => tween && tween.stop && tween.stop());
      if (motion.tweens && motion.tweens.clear) motion.tweens.clear();
    }
    motion.reducedMotion = reduced;
  };
  const unsubscribeSettings = settings.subscribe(applyMotionPreference);
  let motionMedia = null;
  try {
    motionMedia = environment && environment.matchMedia && environment.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionMedia && motionMedia.addEventListener) motionMedia.addEventListener('change', applyMotionPreference);
    else if (motionMedia && motionMedia.addListener) motionMedia.addListener(applyMotionPreference);
  } catch (_error) {
    motionMedia = null;
  }
  const layer = Object.freeze({
    __jjkPresentationLayer: true,
    audio,
    settings,
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
      // Fighter cards already own authoritative selected/LEGAL borders and
      // labels. A second animated circle over the portrait duplicated that
      // state and obscured faces, so this compatibility hook now only clears
      // any stale handle left by an earlier render.
      return clearHandle(key);
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
      return clearHandle('selected-fighter');
    },
    renderQueueReviewState(_targetScene, payload = {}) {
      const actions = payload.actions || [];
      if (!actions.length) {
        lastQueueSignature = '';
        return [];
      }
      const signature = actions.map((action) => action && action.id).join('|');
      if (signature === lastQueueSignature) return payload.cards || [];
      lastQueueSignature = signature;
      return motion.queueCommit(payload.cards || [], {
        stagger: 82,
        duration: MOTION_TIMINGS.queueStep,
      });
    },
    interactionCue(_targetScene, payload = {}) {
      const cue = semanticCueFor(_targetScene || scene, payload);
      return cue ? (audio.cue ? audio.cue(cue) : audio.play(cue)) : false;
    },
    ambientWorld(_targetScene, payload = {}) {
      const region = payload.region || payload;
      return replaceHandle('ambient-world', motion.ambientWorldTreatment(region, payload.options || payload));
    },
    sceneIntro(_targetScene, payload = {}) {
      return motion.sceneIntro(payload.targets || [], payload.options || payload);
    },
    queueCommit(_targetScene, payload = {}) {
      if (audio.cue) audio.cue('queue');
      else audio.queue();
      return motion.queueCommit(payload.cards || [], payload.options || payload);
    },
    impactFlash(_targetScene, payload = {}) {
      if (audio.cue) audio.cue('impact');
      else audio.impact();
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
      unsubscribeSettings();
      if (motionMedia && motionMedia.removeEventListener) motionMedia.removeEventListener('change', applyMotionPreference);
      else if (motionMedia && motionMedia.removeListener) motionMedia.removeListener(applyMotionPreference);
      motion.destroy();
      if (options.destroyAudio && audio && audio.destroy) await audio.destroy();
    },
  });
  if (scene && scene.events && scene.events.once) scene.events.once('shutdown', () => layer.destroy());
  return layer;
}
