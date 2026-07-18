import { SKILL_ACTION_ATLAS, skillVisualFor } from '../core/skill-visual-registry.js?v=32';

const FORM_FAMILIES = Object.freeze({
  fist: 'impact', palm: 'impact', burst: 'impact', core: 'impact', drum: 'impact', clap: 'impact', blood: 'impact', vortex: 'impact', rhythm: 'impact', venom: 'impact',
  blade: 'blade', sweep: 'blade', parry: 'blade', arsenal: 'blade', scalpel: 'blade', katana: 'blade',
  projectile: 'projectile', arrow: 'projectile', firearm: 'projectile', bullet: 'projectile', beam: 'projectile', cannon: 'projectile', wind: 'projectile',
  beast: 'spirit', wing: 'spirit', doll: 'spirit', jellyfish: 'spirit', swarm: 'spirit', dragon: 'spirit', crow: 'spirit', spirit: 'spirit',
  binding: 'control', voice: 'control', swap: 'control', eye: 'control', net: 'control', signal: 'control', talisman: 'control', chant: 'control',
  ward: 'ward', shadow: 'ward', vial: 'ward', barrier: 'ward', step: 'ward', veil: 'ward', heal: 'ward', cleanse: 'ward',
});

function line(graphics, x1, y1, x2, y2) {
  graphics.beginPath();
  graphics.moveTo(x1, y1);
  graphics.lineTo(x2, y2);
  graphics.strokePath();
}

function drawImpact(graphics, x, y, radius, accent, visual) {
  const spokes = visual.icon.spokes;
  graphics.lineStyle(Math.max(2, radius * 0.09), accent, 0.96);
  for (let index = 0; index < spokes; index += 1) {
    const angle = ((Math.PI * 2 * index) / spokes) + ((visual.icon.rotation * Math.PI) / 180);
    const inner = radius * (index % 2 ? 0.2 : 0.34);
    line(
      graphics,
      x + Math.cos(angle) * inner,
      y + Math.sin(angle) * inner,
      x + Math.cos(angle) * radius * 0.74,
      y + Math.sin(angle) * radius * 0.74,
    );
  }
  graphics.fillStyle(accent, 0.92);
  graphics.fillCircle(x, y, radius * 0.22);
}

function drawBlade(graphics, x, y, radius, accent, visual) {
  const direction = visual.motion.direction;
  graphics.lineStyle(Math.max(2, radius * 0.1), accent, 0.98);
  line(graphics, x - radius * 0.58 * direction, y + radius * 0.66, x + radius * 0.5 * direction, y - radius * 0.6);
  graphics.lineStyle(Math.max(1, radius * 0.045), visual.palette.paper, 0.88);
  line(graphics, x - radius * 0.38 * direction, y + radius * 0.6, x + radius * 0.62 * direction, y - radius * 0.56);
  graphics.lineStyle(Math.max(2, radius * 0.08), accent, 0.94);
  line(graphics, x - radius * 0.42, y + radius * 0.18, x + radius * 0.42, y + radius * 0.18);
}

function drawProjectile(graphics, x, y, radius, accent, visual) {
  const direction = visual.motion.direction;
  graphics.lineStyle(Math.max(2, radius * 0.09), accent, 0.98);
  line(graphics, x - radius * 0.66 * direction, y + radius * 0.24, x + radius * 0.62 * direction, y - radius * 0.26);
  line(graphics, x + radius * 0.62 * direction, y - radius * 0.26, x + radius * 0.2 * direction, y - radius * 0.5);
  line(graphics, x + radius * 0.62 * direction, y - radius * 0.26, x + radius * 0.34 * direction, y + radius * 0.14);
  graphics.lineStyle(Math.max(1, radius * 0.045), visual.palette.flare, 0.82);
  line(graphics, x - radius * 0.58 * direction, y + radius * 0.45, x + radius * 0.12 * direction, y + radius * 0.18);
}

function drawSpirit(graphics, x, y, radius, accent, visual) {
  graphics.lineStyle(Math.max(2, radius * 0.075), accent, 0.96);
  graphics.strokeCircle(x, y - radius * 0.08, radius * 0.38);
  const direction = visual.motion.direction;
  line(graphics, x - radius * 0.34, y + radius * 0.05, x - radius * 0.7 * direction, y + radius * 0.54);
  line(graphics, x + radius * 0.34, y + radius * 0.05, x + radius * 0.7 * direction, y + radius * 0.54);
  graphics.fillStyle(visual.palette.flare, 0.96);
  graphics.fillCircle(x - radius * 0.14, y - radius * 0.12, radius * 0.06);
  graphics.fillCircle(x + radius * 0.14, y - radius * 0.12, radius * 0.06);
}

function drawControl(graphics, x, y, radius, accent, visual) {
  graphics.lineStyle(Math.max(2, radius * 0.07), accent, 0.94);
  for (let ring = 1; ring <= visual.icon.rings; ring += 1) {
    graphics.strokeCircle(x, y, radius * (0.22 + ring * 0.16));
  }
  const spokes = Math.min(6, visual.icon.spokes);
  for (let index = 0; index < spokes; index += 1) {
    const angle = (Math.PI * 2 * index) / spokes;
    line(graphics, x + Math.cos(angle) * radius * 0.16, y + Math.sin(angle) * radius * 0.16, x + Math.cos(angle) * radius * 0.68, y + Math.sin(angle) * radius * 0.68);
  }
}

function drawWard(graphics, x, y, radius, accent, visual) {
  const cut = visual.icon.cut;
  const width = radius * (0.62 + cut);
  graphics.lineStyle(Math.max(2, radius * 0.08), accent, 0.98);
  graphics.beginPath();
  graphics.moveTo(x, y - radius * 0.72);
  graphics.lineTo(x + width, y - radius * 0.3);
  graphics.lineTo(x + radius * 0.46, y + radius * 0.42);
  graphics.lineTo(x, y + radius * 0.72);
  graphics.lineTo(x - radius * 0.46, y + radius * 0.42);
  graphics.lineTo(x - width, y - radius * 0.3);
  graphics.closePath();
  graphics.strokePath();
  graphics.lineStyle(Math.max(1, radius * 0.045), visual.palette.flare, 0.84);
  line(graphics, x - radius * 0.27, y, x + radius * 0.27, y);
  line(graphics, x, y - radius * 0.27, x, y + radius * 0.27);
}

function drawForm(graphics, visual, x, y, radius) {
  const family = FORM_FAMILIES[visual.icon.form] || 'control';
  if (family === 'impact') drawImpact(graphics, x, y, radius, visual.palette.accent, visual);
  else if (family === 'blade') drawBlade(graphics, x, y, radius, visual.palette.accent, visual);
  else if (family === 'projectile') drawProjectile(graphics, x, y, radius, visual.palette.accent, visual);
  else if (family === 'spirit') drawSpirit(graphics, x, y, radius, visual.palette.accent, visual);
  else if (family === 'ward') drawWard(graphics, x, y, radius, visual.palette.accent, visual);
  else drawControl(graphics, x, y, radius, visual.palette.accent, visual);
}

export function skillAtlasFrameRect(skillOrId, sourceWidth, sourceHeight) {
  const visual = skillVisualFor(skillOrId);
  if (!visual || sourceWidth <= 0 || sourceHeight <= 0) return null;
  const left = Math.round((visual.art.column * sourceWidth) / SKILL_ACTION_ATLAS.columns);
  const top = Math.round((visual.art.row * sourceHeight) / SKILL_ACTION_ATLAS.rows);
  const right = Math.round(((visual.art.column + 1) * sourceWidth) / SKILL_ACTION_ATLAS.columns);
  const bottom = Math.round(((visual.art.row + 1) * sourceHeight) / SKILL_ACTION_ATLAS.rows);
  return Object.freeze({ x: left, y: top, width: right - left, height: bottom - top });
}

export function skillArtCropRect(skillOrId, sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const visual = skillVisualFor(skillOrId);
  const frame = skillAtlasFrameRect(skillOrId, sourceWidth, sourceHeight);
  if (!visual || !frame || targetWidth <= 0 || targetHeight <= 0) return null;
  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = frame.width / frame.height;
  let cropWidth;
  let cropHeight;
  if (sourceRatio > targetRatio) {
    cropHeight = frame.height / visual.art.zoom;
    cropWidth = cropHeight * targetRatio;
  } else {
    cropWidth = frame.width / visual.art.zoom;
    cropHeight = cropWidth / targetRatio;
  }
  cropWidth = Math.min(frame.width, cropWidth);
  cropHeight = Math.min(frame.height, cropHeight);
  const localX = Math.max(0, Math.min(frame.width - cropWidth, (visual.art.focalX * frame.width) - (cropWidth / 2)));
  const localY = Math.max(0, Math.min(frame.height - cropHeight, (visual.art.focalY * frame.height) - (cropHeight / 2)));
  const cropX = frame.x + localX;
  const cropY = frame.y + localY;
  return Object.freeze({ x: cropX, y: cropY, width: cropWidth, height: cropHeight });
}

export function drawSkillArtCrop(scene, skillOrId, x, y, width, height, options = {}) {
  const visual = skillVisualFor(skillOrId);
  if (!visual || !scene || !scene.textures || !scene.add || !scene.textures.exists(visual.art.textureKey)) return null;
  const texture = scene.textures.get(visual.art.textureKey);
  const source = texture && texture.getSourceImage ? texture.getSourceImage() : null;
  const crop = skillArtCropRect(visual.id, Number(source && source.width), Number(source && source.height), width, height);
  if (!crop) return null;
  const image = scene.add.image(x + width / 2, y + height / 2, visual.art.textureKey);
  image.setOrigin(
    (crop.x + crop.width / 2) / Number(source.width),
    (crop.y + crop.height / 2) / Number(source.height),
  );
  image.setCrop(crop.x, crop.y, crop.width, crop.height);
  image.setScale(width / crop.width, height / crop.height);
  image.setAlpha(options.alpha == null ? 1 : options.alpha);
  if (options.depth != null && image.setDepth) image.setDepth(options.depth);
  if (visual.art.mirror && options.allowMirror !== false) image.setFlipX(true);
  if (options.tint != null) image.setTint(options.tint);
  if (Array.isArray(scene.nodes)) scene.nodes.push(image);
  return Object.freeze({ image, crop, visual });
}

export function drawSkillIcon(scene, skillOrId, x, y, size, options = {}) {
  const visual = skillVisualFor(skillOrId);
  if (!visual || !scene || !scene.add || !scene.add.graphics || !scene.add.container) return null;
  const radius = Math.max(10, size / 2);
  const graphics = scene.add.graphics();
  graphics.fillStyle(options.surface == null ? visual.palette.surface : options.surface, options.surfaceAlpha == null ? 0.94 : options.surfaceAlpha);
  graphics.fillCircle(0, 0, radius);
  graphics.lineStyle(Math.max(2, radius * 0.08), options.accent == null ? visual.palette.accent : options.accent, 0.98);
  graphics.strokeCircle(0, 0, radius - 1);
  graphics.lineStyle(Math.max(1, radius * 0.035), visual.palette.flare, 0.44);
  for (let ring = 1; ring <= visual.icon.rings; ring += 1) {
    graphics.strokeCircle(0, 0, radius * (0.64 - (ring * 0.09)));
  }
  drawForm(graphics, visual, 0, 0, radius * 0.72);
  const container = scene.add.container(x, y, [graphics]);
  if (options.depth != null && container.setDepth) container.setDepth(options.depth);
  if (Array.isArray(scene.nodes)) scene.nodes.push(container);
  const setState = (state = 'available') => {
    const disabled = state === 'disabled';
    const committed = state === 'selected' || state === 'queued';
    if (container.setAlpha) container.setAlpha(disabled ? 0.44 : 1);
    if (container.setScale) container.setScale(committed ? 1.06 : 1);
    return container;
  };
  setState(options.state);
  return Object.freeze({ container, graphics, visual, setState, destroy: () => container.destroy(true) });
}

export function skillIconFormFamily(form) {
  return FORM_FAMILIES[form] || 'control';
}
