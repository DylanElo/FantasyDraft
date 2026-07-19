// Reusable presentation motion. These helpers animate already-authoritative
// state; they never advance phases, choose targets, or resolve effects.

export const MOTION_TIMINGS = Object.freeze({
  press: 90,
  select: 180,
  targetPulse: 760,
  cardLift: 140,
  queueStep: 150,
  impact: 240,
  sceneIntro: 360,
  fighterIdle: 1900,
});

export function prefersReducedMotion(environment = globalThis) {
  try {
    return Boolean(environment && environment.matchMedia && environment.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_error) {
    return false;
  }
}

export function resolvedMotionDuration(duration, reducedMotion, minimum = 0) {
  if (reducedMotion) return minimum;
  return Math.max(minimum, Number(duration) || 0);
}

function asTargets(targets) {
  return (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
}

function setAlpha(target, value) {
  if (target && target.setAlpha) target.setAlpha(value);
  else if (target) target.alpha = value;
}

function setScale(target, x, y = x) {
  if (target && target.setScale) target.setScale(x, y);
  else if (target) {
    target.scaleX = x;
    target.scaleY = y;
  }
}

function seededUnit(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export class MotionVfx {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.reducedMotion = options.reducedMotion == null ? prefersReducedMotion(options.environment || globalThis) : Boolean(options.reducedMotion);
    this.motionScale = Math.max(0.25, Number(options.motionScale) || 1);
    this.tweens = new Set();
    this.cleanups = new Set();
    this.nodes = new Set();
    this.destroyed = false;
    if (scene && scene.events && scene.events.once) scene.events.once('shutdown', () => this.destroy());
  }

  duration(value, reducedMinimum = 0) {
    return resolvedMotionDuration(Math.round(value * this.motionScale), this.reducedMotion, reducedMinimum);
  }

  tween(config) {
    if (this.destroyed || !this.scene || !this.scene.tweens || !this.scene.tweens.add) return null;
    const tween = this.scene.tweens.add(config);
    if (tween) {
      this.tweens.add(tween);
      if (tween.once) {
        const discard = () => this.tweens.delete(tween);
        ['complete', 'stop', 'destroy', 'remove'].forEach((eventName) => tween.once(eventName, discard));
      }
    }
    return tween;
  }

  ambientWorldTreatment(region, options = {}) {
    if (!region || !this.scene || !this.scene.add || !this.scene.add.circle || !this.scene.add.container) return null;
    const count = this.reducedMotion ? Math.min(3, Number(options.count) || 8) : Math.max(3, Number(options.count) || 8);
    const width = Number(region.w == null ? region.width : region.w) || 390;
    const height = Number(region.h == null ? region.height : region.h) || 844;
    const left = Number(region.x) || 0;
    const top = Number(region.y) || 0;
    const colors = options.colors || [0x17191e, 0x35dde8, 0x101b36];
    const motes = [];
    const localTweens = [];
    for (let index = 0; index < count; index += 1) {
      // Bias motes toward the outer thirds so they remain atmosphere rather
      // than a moving veil over skill rules or character names.
      const side = index % 2;
      const xBand = side ? 0.68 : 0.04;
      const x = left + width * (xBand + (seededUnit(index + 2) * 0.27));
      const y = top + height * (0.08 + (seededUnit(index + 17) * 0.84));
      const radius = 1.5 + (seededUnit(index + 31) * 3.2);
      const color = colors[index % colors.length];
      const alpha = color === 0x35dde8 ? 0.2 : 0.11;
      const mote = this.scene.add.circle(x, y, radius, color, alpha);
      motes.push(mote);
    }
    const container = this.scene.add.container(0, 0, motes);
    if (container.setDepth) container.setDepth(options.depth == null ? 1 : options.depth);
    if (!this.reducedMotion) {
      motes.forEach((mote, index) => {
        localTweens.push(this.tween({
          targets: mote,
          x: mote.x + ((index % 2 ? 1 : -1) * (4 + seededUnit(index + 47) * 9)),
          y: mote.y - (12 + seededUnit(index + 59) * 24),
          alpha: Math.min(0.26, mote.alpha + 0.07),
          duration: this.duration(2600 + (seededUnit(index + 71) * 2200)),
          delay: seededUnit(index + 83) * 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }));
      });
    }
    const input = this.scene.input;
    const pointerMove = (pointer) => {
      if (this.reducedMotion || !pointer || container.active === false) return;
      const normalizedX = Math.max(-1, Math.min(1, ((Number(pointer.x) || width / 2) - (width / 2)) / (width / 2)));
      const normalizedY = Math.max(-1, Math.min(1, ((Number(pointer.y) || height / 2) - (height / 2)) / (height / 2)));
      container.x = normalizedX * (Number(options.parallax) || 3);
      container.y = normalizedY * (Number(options.parallax) || 3) * 0.55;
    };
    if (input && input.on && !this.reducedMotion) input.on('pointermove', pointerMove);
    if (options.entryTargets) this.sceneIntro(options.entryTargets, options.entry || {});
    let removed = false;
    const destroy = () => {
      if (removed) return;
      removed = true;
      localTweens.filter(Boolean).forEach((tween) => tween.stop && tween.stop());
      if (input && input.off) input.off('pointermove', pointerMove);
      if (container && container.destroy) container.destroy(true);
      this.nodes.delete(container);
      this.cleanups.delete(destroy);
    };
    this.nodes.add(container);
    this.cleanups.add(destroy);
    return Object.freeze({ container, motes, destroy });
  }

  sceneIntro(targets, options = {}) {
    const list = asTargets(targets);
    const distance = Number(options.distance == null ? 18 : options.distance);
    const stagger = Number(options.stagger == null ? 54 : options.stagger);
    const direction = options.direction === 'down' ? -1 : 1;
    list.forEach((target, index) => {
      const finalY = Number(target.y) || 0;
      if (this.reducedMotion) {
        target.y = finalY;
        setAlpha(target, 1);
        return;
      }
      target.y = finalY + (distance * direction);
      setAlpha(target, 0);
      this.tween({
        targets: target,
        y: finalY,
        alpha: 1,
        delay: index * stagger,
        duration: this.duration(options.duration || MOTION_TIMINGS.sceneIntro),
        ease: options.ease || 'Cubic.easeOut',
      });
    });
    return list;
  }

  fighterIdleParallax(target, options = {}) {
    if (!target) return Object.freeze({ destroy() {} });
    const baseX = Number(target.x) || 0;
    const baseY = Number(target.y) || 0;
    const baseRotation = Number(target.rotation) || 0;
    const amplitude = Math.max(1, Number(options.amplitude) || 3);
    let idleTween = null;
    if (!this.reducedMotion) {
      idleTween = this.tween({
        targets: target,
        y: baseY - amplitude,
        duration: this.duration(options.duration || MOTION_TIMINGS.fighterIdle),
        delay: Number(options.phase) || 0,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    const input = this.scene && this.scene.input;
    const parallax = Math.max(0, Number(options.parallax == null ? 4 : options.parallax));
    const pointerMove = (pointer) => {
      if (this.reducedMotion || !pointer || target.active === false) return;
      const width = Number(this.scene && this.scene.scale && this.scene.scale.width) || 390;
      const normalized = Math.max(-1, Math.min(1, ((Number(pointer.x) || width / 2) - (width / 2)) / (width / 2)));
      target.x = baseX + (normalized * parallax);
      target.rotation = baseRotation + (normalized * 0.008);
    };
    if (input && input.on && parallax > 0 && !this.reducedMotion) input.on('pointermove', pointerMove);
    let removed = false;
    const destroy = () => {
      if (removed) return;
      removed = true;
      if (idleTween && idleTween.stop) idleTween.stop();
      if (input && input.off) input.off('pointermove', pointerMove);
      if (target.active !== false) {
        target.x = baseX;
        target.y = baseY;
        target.rotation = baseRotation;
      }
      this.cleanups.delete(destroy);
    };
    this.cleanups.add(destroy);
    return Object.freeze({ destroy, target });
  }

  selectionCommitment(target, options = {}) {
    if (!target) return null;
    const baseX = Number(target.scaleX) || 1;
    const baseY = Number(target.scaleY) || 1;
    if (this.reducedMotion) {
      setScale(target, baseX * 1.035, baseY * 1.035);
      return null;
    }
    return this.tween({
      targets: target,
      scaleX: baseX * (options.scale || 1.08),
      scaleY: baseY * (options.scale || 1.08),
      duration: this.duration(options.duration || MOTION_TIMINGS.select),
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => setScale(target, baseX, baseY),
    });
  }

  legalTargetCue(x, y, radius, options = {}) {
    if (!this.scene || !this.scene.add || !this.scene.add.graphics || !this.scene.add.container) return null;
    const tone = options.tone == null ? 0x35dde8 : options.tone;
    const ring = this.scene.add.graphics();
    ring.lineStyle(Math.max(2, radius * 0.065), tone, 0.98);
    ring.strokeCircle(0, 0, radius);
    ring.lineStyle(Math.max(1, radius * 0.025), 0xf2e8d5, 0.74);
    ring.strokeCircle(0, 0, radius * 0.78);
    const arrow = this.scene.add.triangle
      ? this.scene.add.triangle(0, -radius - 15, 0, 0, 12, 0, 6, 10, tone, 1).setOrigin(0.5)
      : null;
    const label = options.label && this.scene.add.text
      ? this.scene.add.text(0, radius + 8, options.label, {
        fontFamily: options.fontFamily || 'Arial, sans-serif',
        fontSize: `${Math.max(11, Number(options.fontSize) || 11)}px`,
        fontStyle: 'bold',
        color: options.labelColor || '#101B36',
        backgroundColor: options.labelBackground || '#35DDE8',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5, 0)
      : null;
    const children = [ring, arrow, label].filter(Boolean);
    const container = this.scene.add.container(x, y, children);
    if (container.setDepth) container.setDepth(options.depth == null ? 80 : options.depth);
    const localTweens = [];
    if (!this.reducedMotion) {
      localTweens.push(this.tween({
        targets: ring,
        scaleX: 1.1,
        scaleY: 1.1,
        alpha: 0.52,
        duration: this.duration(options.duration || MOTION_TIMINGS.targetPulse),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));
      if (arrow) localTweens.push(this.tween({
        targets: arrow,
        y: arrow.y + 6,
        duration: this.duration((options.duration || MOTION_TIMINGS.targetPulse) * 0.72),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));
    }
    let removed = false;
    const destroy = () => {
      if (removed) return;
      removed = true;
      localTweens.filter(Boolean).forEach((tween) => tween.stop && tween.stop());
      if (container && container.destroy) container.destroy(true);
      this.nodes.delete(container);
      this.cleanups.delete(destroy);
    };
    this.nodes.add(container);
    this.cleanups.add(destroy);
    return Object.freeze({ container, ring, arrow, label, destroy });
  }

  skillCardSheen(card, options = {}) {
    if (this.reducedMotion || !card || !this.scene || !this.scene.add || !this.scene.add.graphics) return null;
    const width = Math.max(24, Number(options.width) || Number(card.displayWidth) || 92);
    const height = Math.max(32, Number(options.height) || Number(card.displayHeight) || 132);
    const sheen = this.scene.add.graphics();
    sheen.fillStyle(options.color == null ? 0xf2e8d5 : options.color, options.alpha == null ? 0.3 : options.alpha);
    sheen.beginPath();
    sheen.moveTo(-width * 0.2, -height * 0.55);
    sheen.lineTo(width * 0.12, -height * 0.55);
    sheen.lineTo(width * 0.42, height * 0.55);
    sheen.lineTo(width * 0.1, height * 0.55);
    sheen.closePath();
    sheen.fillPath();
    sheen.x = (Number(card.x) || 0) - width;
    sheen.y = Number(card.y) || 0;
    if (sheen.setDepth) sheen.setDepth((Number(card.depth) || 0) + 1);
    this.nodes.add(sheen);
    this.tween({
      targets: sheen,
      x: (Number(card.x) || 0) + width,
      duration: this.duration(options.duration || 260),
      ease: 'Quad.easeInOut',
      onComplete: () => {
        this.nodes.delete(sheen);
        if (sheen.destroy) sheen.destroy();
      },
    });
    return sheen;
  }

  bindSkillCard(card, options = {}) {
    if (!card || !card.on) return Object.freeze({ destroy() {} });
    if (card.setInteractive && options.interactive !== false) card.setInteractive(options.hitArea, options.hitAreaCallback);
    const baseY = Number(card.y) || 0;
    const baseScaleX = Number(card.scaleX) || 1;
    const baseScaleY = Number(card.scaleY) || 1;
    const restore = () => {
      card.y = baseY;
      setScale(card, baseScaleX, baseScaleY);
    };
    const over = () => {
      if (this.reducedMotion) return;
      this.tween({ targets: card, y: baseY - (options.lift || 6), duration: this.duration(MOTION_TIMINGS.cardLift), ease: 'Quad.easeOut' });
      this.skillCardSheen(card, options);
    };
    const out = () => {
      if (this.reducedMotion) restore();
      else this.tween({ targets: card, y: baseY, scaleX: baseScaleX, scaleY: baseScaleY, duration: this.duration(MOTION_TIMINGS.cardLift), ease: 'Quad.easeOut' });
    };
    const down = () => {
      setScale(card, baseScaleX * 0.96, baseScaleY * 0.96);
      if (options.onPress) options.onPress();
    };
    const up = () => {
      setScale(card, baseScaleX, baseScaleY);
      if (options.onSelect) options.onSelect();
    };
    card.on('pointerover', over);
    card.on('pointerout', out);
    card.on('pointerdown', down);
    card.on('pointerup', up);
    let removed = false;
    const destroy = () => {
      if (removed) return;
      removed = true;
      if (card.off) {
        card.off('pointerover', over);
        card.off('pointerout', out);
        card.off('pointerdown', down);
        card.off('pointerup', up);
      }
      restore();
      this.cleanups.delete(destroy);
    };
    this.cleanups.add(destroy);
    return Object.freeze({ destroy, card });
  }

  queueCommit(cards, options = {}) {
    const ordered = asTargets(cards);
    if (!ordered.length) {
      if (options.onComplete) options.onComplete();
      return ordered;
    }
    if (this.reducedMotion) {
      ordered.forEach((card) => {
        setAlpha(card, 1);
        setScale(card, 1.025);
      });
      if (options.onComplete) options.onComplete();
      return ordered;
    }
    ordered.forEach((card, index) => {
      const baseX = Number(card.scaleX) || 1;
      const baseY = Number(card.scaleY) || 1;
      setAlpha(card, 0.64);
      this.tween({
        targets: card,
        alpha: 1,
        scaleX: baseX * 1.06,
        scaleY: baseY * 1.06,
        delay: index * (options.stagger || 88),
        duration: this.duration(options.duration || MOTION_TIMINGS.queueStep),
        yoyo: true,
        ease: 'Back.easeOut',
        onComplete: index === ordered.length - 1 ? options.onComplete : undefined,
      });
    });
    return ordered;
  }

  impactFlash(x, y, options = {}) {
    if (!this.scene || !this.scene.add || !this.scene.add.graphics) return null;
    const tone = options.tone == null ? 0xe32620 : options.tone;
    const radius = Math.max(16, Number(options.radius) || 42);
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(tone, this.reducedMotion ? 0.36 : 0.52);
    graphics.fillCircle(0, 0, radius * 0.38);
    graphics.lineStyle(Math.max(2, radius * 0.065), tone, 0.96);
    const rays = Math.max(6, Number(options.rays) || 9);
    for (let index = 0; index < rays; index += 1) {
      const angle = (Math.PI * 2 * index) / rays;
      const inner = radius * (index % 2 ? 0.3 : 0.46);
      const outer = radius * (index % 2 ? 0.78 : 1);
      graphics.beginPath();
      graphics.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      graphics.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      graphics.strokePath();
    }
    graphics.x = x;
    graphics.y = y;
    if (graphics.setDepth) graphics.setDepth(options.depth == null ? 120 : options.depth);
    this.nodes.add(graphics);
    const finish = () => {
      this.nodes.delete(graphics);
      if (graphics.destroy) graphics.destroy();
      if (options.onComplete) options.onComplete();
    };
    if (this.reducedMotion) {
      const delayed = this.scene.time && this.scene.time.delayedCall
        ? this.scene.time.delayedCall(90, finish)
        : null;
      if (!delayed) finish();
    } else {
      setScale(graphics, 0.72);
      this.tween({
        targets: graphics,
        scaleX: 1.18,
        scaleY: 1.18,
        alpha: 0,
        duration: this.duration(options.duration || MOTION_TIMINGS.impact),
        ease: 'Quad.easeOut',
        onComplete: finish,
      });
    }
    return graphics;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    Array.from(this.cleanups).forEach((cleanup) => cleanup());
    this.cleanups.clear();
    this.tweens.forEach((tween) => tween && tween.stop && tween.stop());
    this.tweens.clear();
    this.nodes.forEach((node) => node && node.destroy && node.destroy(true));
    this.nodes.clear();
  }
}
