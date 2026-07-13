import { COLORS, ENERGY_COLORS, ENERGY_LABELS, TOKEN_TOUCH, TOKEN_TYPE } from '../core/runtime-config.js?v=28';
import { initials, shortText, titleize } from '../core/text.js?v=28';
import { costColors } from '../core/roster.js?v=28';
import { bladePath, drawBladePlate, drawInsetWell } from './plate.js?v=28';

export const COMPONENT_INVENTORY = [
  'SceneBackdrop',
  'HeroActionButton',
  'CharacterShowcaseCard',
  'TeamTray',
  'BattlefieldStage',
  'SkillActionCard',
  'QueueTimeline',
  'StatusRibbon',
  'ResultPoster',
  'GameButton',
  'IconButton',
  'Panel',
  'BottomSheet',
  'FighterToken',
  'SkillCard',
  'EnergyOrb',
  'StatusChip',
  'QueueActionCard',
  'CharacterRosterCard',
  'CharacterDetailSheet',
  'Toast',
  'DamageNumber',
  'PhaseBanner',
];

export class MobileGameUI {
  constructor(scene) {
    this.scene = scene;
  }

  hit(x, y, w, h, label, onClick, disabled) {
    const minTarget = TOKEN_TOUCH.minTarget || 46;
    const hitW = Math.max(w, minTarget);
    const hitH = Math.max(h, minTarget);
    this.scene.buttons.push({
      x: x - (hitW - w) / 2,
      y: y - (hitH - h) / 2,
      w: hitW,
      h: hitH,
      label,
      onClick,
      disabled: !!disabled,
    });
  }

  slantedPath(g, x, y, w, h, slant = 14) {
    bladePath(g, x, y, w, h, Math.abs(slant) || 14, 'both');
  }

  fillSlantedPlate(x, y, w, h, options = {}) {
    drawBladePlate(this.scene, x, y, w, h, {
      cut: Math.abs(options.slant === undefined ? 16 : options.slant),
      fill: options.fill || COLORS.ink800,
      stroke: options.stroke || COLORS.ink950,
      ledge: options.ledge || options.stroke || COLORS.curse600,
      alpha: options.alpha === undefined ? 0.98 : options.alpha,
      lineWidth: options.strokeWidth || 3,
      ledgeOffset: options.ledgeOffset,
      strokeAlpha: options.strokeAlpha,
      keylineAlpha: options.keylineAlpha,
      highlight: options.highlight,
    });
  }

  SceneBackdrop(frame, options = {}) {
    const g = this.scene.graphics;
    const asset = options.asset || null;
    const key = asset && this.scene.store.assets.keyFor(asset.id);
    if (key && this.scene.textures.exists(key)) {
      const image = this.scene.add.image(frame.x + frame.width / 2, frame.y + frame.height / 2, key);
      image.setDisplaySize(frame.width, frame.height);
      image.setAlpha(options.alpha === undefined ? 1 : options.alpha);
      image.setDepth(-20);
      this.scene.nodes.push(image);
    } else {
      g.fillGradientStyle(COLORS.curse900, COLORS.ink950, COLORS.ink950, COLORS.ink900, 1);
      g.fillRect(frame.x, frame.y, frame.width, frame.height);
    }
    g.fillStyle(COLORS.ink950, options.veilAlpha === undefined ? 0.22 : options.veilAlpha);
    g.fillRect(frame.x, frame.y, frame.width, frame.height);
    g.fillGradientStyle(COLORS.ink950, COLORS.ink950, COLORS.ink950, COLORS.ink950, 0.0, 0.0, 0.56, 0.96);
    g.fillRect(frame.x, frame.y + frame.height * 0.56, frame.width, frame.height * 0.44);
  }

  Panel(x, y, w, h, options = {}) {
    const tone = options.tone || COLORS.lineWarm;
    drawBladePlate(this.scene, x, y, w, h, {
      cut: options.cut || 16,
      fill: options.fill || COLORS.ink800,
      stroke: tone,
      ledge: tone,
      alpha: options.alpha === undefined ? 0.94 : options.alpha,
      lineWidth: options.strokeWidth || 3,
      ledgeOffset: options.ledgeOffset === undefined ? 3 : options.ledgeOffset,
      strokeAlpha: options.strokeAlpha,
    });
  }

  BottomSheet(frame, y, h, options = {}) {
    const x = options.x === undefined ? frame.x : options.x;
    const w = options.w === undefined ? frame.width : options.w;
    const g = this.scene.graphics;
    if (options.scrim) {
      g.fillStyle(COLORS.inkDeep, options.scrimAlpha === undefined ? 0.38 : options.scrimAlpha);
      g.fillRect(0, 0, frame.fullWidth, frame.fullHeight);
    }
    this.Panel(x, y, w, h + 20, {
      fill: COLORS.ink800,
      tone: options.tone || COLORS.sunGold,
      radius: 24,
      alpha: 0.98,
      accentAlpha: 0.2,
    });
    g.fillStyle(COLORS.inkDeep, 0.15);
    g.fillRoundedRect(x + w / 2 - 30, y + 10, 60, 4, 3);
  }

  GameButton(x, y, w, h, label, onClick, options = {}) {
    const g = this.scene.graphics;
    const disabled = !!options.disabled;
    const fill = options.fill === undefined ? COLORS.ink800 : options.fill;
    const stroke = options.stroke === undefined ? COLORS.lineWarm : options.stroke;
    this.fillSlantedPlate(x, y, w, h, {
      fill,
      stroke,
      alpha: disabled ? 0.48 : (options.alpha === undefined ? 0.98 : options.alpha),
      strokeAlpha: disabled ? 0.28 : (options.strokeAlpha === undefined ? 0.82 : options.strokeAlpha),
      slant: options.slant === undefined ? 12 : options.slant,
      strokeWidth: options.strokeWidth || 1.8,
      shadowAlpha: disabled ? 0.05 : 0.2,
      ledge: options.ledge || stroke,
      ledgeOffset: disabled ? 1 : 4,
    });
    if (options.notch !== false) {
      g.fillStyle(stroke, disabled ? 0.12 : 0.32);
      this.slantedPath(g, x + 8, y + h - 12, Math.min(42, w * 0.28), 5, options.slant === undefined ? 10 : options.slant * 0.5);
      g.fillPath();
    }
    this.scene.text(x + w / 2, y + h / 2 - 8, label, {
      fontFamily: options.mono ? (TOKEN_TYPE.mono || '"JetBrains Mono", monospace') : (TOKEN_TYPE.ui || 'Inter, Arial, sans-serif'),
      fontSize: options.fontSize || '13px',
      fontStyle: options.fontStyle || '900',
      color: options.color || COLORS.text,
      align: 'center',
    }).setOrigin(0.5, 0);
    this.hit(x, y, w, h, label, onClick, disabled);
  }

  HeroActionButton(x, y, w, h, label, onClick, options = {}) {
    this.fillSlantedPlate(x, y, w, h, {
      fill: options.disabled ? COLORS.ink700 : (options.fill || COLORS.gold400),
      stroke: COLORS.inkDeep,
      alpha: options.disabled ? 0.52 : 0.98,
      slant: options.slant || 20,
      strokeWidth: 2.8,
      shadowAlpha: 0.28,
      flashAlpha: 0.38,
      ledge: options.ledge || COLORS.gold800,
    });
    if (!options.disabled) {
      this.scene.graphics.fillStyle(COLORS.inkDeep, 0.18);
      this.slantedPath(this.scene.graphics, x + w - 64, y + 9, 46, h - 18, -12);
      this.scene.graphics.fillPath();
    }
    this.scene.text(x + w / 2, y + h / 2 - 10, label, {
      fontFamily: TOKEN_TYPE.ui || 'Inter, Arial, sans-serif',
      fontSize: options.fontSize || '18px',
      fontStyle: '900',
      color: options.color || '#0e0b16',
      align: 'center',
    }).setOrigin(0.5, 0);
    this.hit(x, y, w, h, label, onClick, options.disabled);
  }

  IconButton(x, y, w, h, label, onClick, options = {}) {
    this.GameButton(x, y, w, h, label, onClick, {
      fill: options.fill || COLORS.cardWhite,
      stroke: options.stroke || COLORS.lineWarm,
      fontSize: options.fontSize || '15px',
      mono: true,
      radius: options.radius || Math.min(w, h) / 2,
      ...options,
    });
  }

  EnergyOrb(x, y, color, count, options = {}) {
    const g = this.scene.graphics;
    const radius = options.radius || 10;
    const tone = ENERGY_COLORS[color] || COLORS.sunGold;
    g.fillStyle(COLORS.ink950, 0.95);
    g.fillCircle(x, y, radius + 3);
    g.fillStyle(tone, Number(count || 0) ? 0.96 : 0.2);
    g.fillCircle(x, y, radius);
    g.lineStyle(1.4, color === 'white' ? COLORS.lineWarm : tone, 0.9);
    g.strokeCircle(x, y, radius + 2);
    this.scene.mono(x, y - 4, ENERGY_LABELS[color] || '?', {
      color: color === 'black' ? COLORS.text : '#0e0b16',
      fontSize: options.labelSize || '7px',
    }).setOrigin(0.5, 0);
    if (options.showCount !== false) {
      this.scene.mono(x, y + radius + 4, String(Number(count || 0)), {
        color: COLORS.text,
        fontSize: options.countSize || '8px',
      }).setOrigin(0.5, 0);
    }
  }

  CostOrbs(x, y, cost, options = {}) {
    const size = options.size || 11;
    const step = options.step || (size + 5);
    const colors = costColors(cost);
    if (!colors.length) {
      this.EnergyOrb(x, y, 'green', 1, { radius: size / 2 + 1, showCount: false, labelSize: '7px' });
      this.scene.mono(x, y - 4, '0', { color: '#142033', fontSize: '7px' }).setOrigin(0.5, 0);
      return;
    }
    colors.slice(0, options.max || 5).forEach((color, index) => {
      this.EnergyOrb(x + index * step, y, color, 1, { radius: size / 2 + 1, showCount: false, labelSize: '7px' });
    });
  }

  StatusChip(x, y, label, options = {}) {
    const text = shortText(label, options.maxChars || 14).toUpperCase();
    const w = Math.max(options.minWidth || 44, text.length * 6.4 + 18);
    const h = options.height || 20;
    const tone = options.tone || COLORS.auraBlue;
    this.scene.graphics.fillStyle(options.fill || COLORS.ink900, options.alpha === undefined ? 0.96 : options.alpha);
    this.scene.graphics.fillRoundedRect(x, y, w, h, h / 2);
    this.scene.graphics.fillStyle(tone, 0.16);
    this.scene.graphics.fillRoundedRect(x + 2, y + 2, w - 4, h - 4, h / 2 - 2);
    this.scene.graphics.lineStyle(1, tone, 0.58);
    this.scene.graphics.strokeRoundedRect(x, y, w, h, h / 2);
    this.scene.mono(x + w / 2, y + Math.max(5, h / 2 - 5), text, {
      color: options.color || COLORS.text,
      fontSize: options.fontSize || '7px',
    }).setOrigin(0.5, 0);
    return w;
  }

  StatusRibbon(x, y, w, label, tone, options = {}) {
    this.scene.graphics.fillStyle(COLORS.cardWhite, 0.88);
    this.scene.graphics.fillRoundedRect(x, y, w, options.height || 26, 13);
    this.scene.graphics.fillStyle(tone || COLORS.sunGold, 0.18);
    this.scene.graphics.fillRoundedRect(x + 3, y + 3, w - 6, (options.height || 26) - 6, 10);
    this.scene.mono(x + 12, y + 8, shortText(label, options.maxChars || 34), {
      color: options.color || COLORS.text,
      fontSize: options.fontSize || '8px',
    });
  }

  PhaseBanner(frame, title, subtitle, options = {}) {
    const w = Math.min(frame.width - 32, options.width || 338);
    const x = frame.x + (frame.width - w) / 2;
    const y = options.y || 84;
    const tone = options.tone || COLORS.sunGold;
    this.Panel(x, y, w, options.height || 58, { tone, alpha: 0.96, fill: COLORS.paperLight, radius: 18 });
    this.scene.text(x + 16, y + 11, shortText(title, 28), {
      fontFamily: TOKEN_TYPE.display || 'Cinzel, Inter, serif',
      fontSize: options.titleSize || '17px',
      fontStyle: '900',
      color: COLORS.text,
    });
    if (subtitle) {
      this.scene.mono(x + 16, y + 35, shortText(subtitle, 46), {
        color: COLORS.muted,
        fontSize: '8px',
      });
    }
  }

  drawCharacterSilhouette(character, x, y, w, h, tone, options = {}) {
    const g = this.scene.graphics;
    const cx = x + w / 2;
    const head = Math.min(w, h) * 0.14;
    const dim = options.dead ? 0.32 : 1;
    g.fillStyle(COLORS.cardWhite, 0.32 * dim);
    this.slantedPath(g, x + w * 0.08, y + h * 0.16, w * 0.72, h * 0.56, -18);
    g.fillPath();
    g.fillStyle(tone, 0.2 * dim);
    g.fillCircle(cx + w * 0.04, y + h * 0.35, Math.min(w, h) * 0.42);
    g.fillStyle(tone, 0.42 * dim);
    this.slantedPath(g, x + w * 0.16, y + h * 0.58, w * 0.72, h * 0.18, 16);
    g.fillPath();
    g.fillStyle(COLORS.inkDeep, options.dead ? 0.32 : 0.84);
    g.fillCircle(cx, y + h * 0.24, head);
    this.slantedPath(g, cx - w * 0.22, y + h * 0.38, w * 0.44, h * 0.38, -10);
    g.fillPath();
    g.fillStyle(COLORS.cardWhite, 0.28 * dim);
    this.slantedPath(g, cx - w * 0.3, y + h * 0.42, w * 0.18, h * 0.32, 8);
    g.fillPath();
    this.slantedPath(g, cx + w * 0.12, y + h * 0.42, w * 0.18, h * 0.32, -8);
    g.fillPath();
    g.lineStyle(2, tone, 0.52 * dim);
    g.beginPath();
    g.moveTo(x + w * 0.18, y + h * 0.86);
    g.lineTo(x + w * 0.82, y + h * 0.76);
    g.strokePath();
  }

  FighterToken(character, side, slot, x, y, size, options = {}) {
    const scene = this.scene;
    const g = scene.graphics;
    const dead = !character || !character.alive;
    const tone = options.tone || (side === 'enemy' ? COLORS.enemy : COLORS.ally);
    const cx = x + size / 2;
    const cardH = size + 54;
    this.fillSlantedPlate(x - 9, y - 8, size + 18, cardH, {
      fill: dead ? COLORS.cardCream : COLORS.paperLight,
      stroke: tone,
      slant: side === 'enemy' ? -13 : 13,
      strokeWidth: options.selected || options.targetable ? 2.8 : 2,
      shadowAlpha: options.selected ? 0.3 : 0.18,
      flashAlpha: dead ? 0.08 : 0.22,
      alpha: dead ? 0.62 : 0.96,
    });
    g.fillStyle(tone, dead ? 0.08 : 0.22);
    this.slantedPath(g, x - 2, y + 4, size + 4, size + 3, side === 'enemy' ? -10 : 10);
    g.fillPath();
    if (options.selected || options.targetable) {
      g.lineStyle(3, options.targetable ? COLORS.spiritPink : COLORS.sunGold, 0.9);
      this.slantedPath(g, x - 13, y - 13, size + 26, cardH + 10, side === 'enemy' ? -16 : 16);
      g.strokePath();
    }
    scene.characterArt(character || { name: 'Down' }, x + 3, y + 0, size - 6, size + 8, {
      tone,
      dead,
      selected: options.selected,
      label: false,
    });
    const hp = Number(character && character.hp ? character.hp : 0);
    const maxHp = Math.max(1, Number(character && character.max_hp ? character.max_hp : 1));
    const hpPct = Math.max(0, Math.min(1, hp / maxHp));
    const barW = size + 10;
    g.fillStyle(COLORS.warmIvory, 0.9);
    g.fillRoundedRect(cx - barW / 2, y + size + 7, barW, 8, 4);
    g.fillStyle(hpPct <= 0.3 ? COLORS.enemy : hpPct <= 0.6 ? COLORS.sunGold : COLORS.queued, dead ? 0.35 : 1);
    g.fillRoundedRect(cx - barW / 2, y + size + 7, barW * hpPct, 8, 4);
    scene.text(cx, y + size + 19, shortText(character && character.name, 12), {
      fontSize: '10px',
      fontStyle: '900',
      align: 'center',
    }).setOrigin(0.5, 0);
    scene.mono(cx, y + size + 34, dead ? 'DOWN' : `${hp}/${maxHp}`, {
      color: dead ? COLORS.dim : COLORS.text,
      fontSize: '8px',
    }).setOrigin(0.5, 0);
    if (options.badge) this.StatusChip(cx - 29, y - 16, options.badge, { tone: options.badgeTone || tone, minWidth: 58 });
    (character && character.statuses ? character.statuses : []).slice(0, 2).forEach((status, index) => {
      const chip = shortText(status.name || status.id || 'FX', 8);
      this.StatusChip(x - 4 + index * 34, y + size + 52, chip, { tone: COLORS.domain, minWidth: 30, maxChars: 4, height: 16, fontSize: '6px' });
    });
    this.hit(x - 10, y - 12, size + 20, cardH + 12, `${side} ${slot}`, options.onClick || (() => {}), options.disabled);
  }

  SkillActionCard(skill, caster, x, y, w, h, options = {}) {
    const g = this.scene.graphics;
    const selected = !!options.selected;
    const disabled = !!options.disabled;
    const compact = h < 50;
    const command = !!options.command;
    const tone = selected ? COLORS.spiritPink : (ENERGY_COLORS[((skill && skill.cost) || [])[0]] || COLORS.auraBlue);
    const cd = Number(options.cooldown || 0);
    const target = options.targetLabel || 'Target';
    const cost = (skill && skill.cost) || [];
    const fullEnergy = {
      green: 'Body',
      blue: 'Technique',
      white: 'Focus',
      red: 'Curse',
      black: 'Wild',
    };
    const costText = cost.length
      ? cost.map((color) => fullEnergy[color] || ENERGY_LABELS[color] || color).join(' + ')
      : 'Free';
    const costShortText = cost.length
      ? cost.map((color) => ENERGY_LABELS[color] || color.slice(0, 1).toUpperCase()).join(' + ')
      : '0';
    this.fillSlantedPlate(x, y, w, h, {
      fill: disabled ? COLORS.cardCream : (command ? COLORS.cardWhite : COLORS.paperLight),
      stroke: tone,
      alpha: disabled ? 0.62 : 0.98,
      slant: selected ? 16 : 12,
      strokeWidth: selected ? 3 : 2,
      shadowAlpha: selected ? 0.32 : 0.18,
      flashAlpha: disabled ? 0.12 : command ? 0.22 : 0.32,
    });
    if (command && !compact) {
      if (selected) {
        g.fillStyle(tone, 0.2);
        this.slantedPath(g, x + 46, y + 5, w - 96, h - 10, -12);
        g.fillPath();
      }
      g.fillStyle(tone, disabled ? 0.16 : 0.9);
      this.slantedPath(g, x + 10, y + 9, 38, h - 18, 9);
      g.fillPath();
      g.fillStyle(COLORS.inkDeep, disabled ? 0.18 : 0.72);
      this.slantedPath(g, x + 16, y + 18, 26, 24, 6);
      g.fillPath();
      this.scene.mono(x + 29, y + 12, 'COST', {
        color: COLORS.cardWhite,
        fontSize: '6px',
      }).setOrigin(0.5, 0);
      this.scene.mono(x + 29, y + 25, costShortText, {
        color: COLORS.cardWhite,
        fontSize: costShortText.length > 5 ? '6px' : '8px',
      }).setOrigin(0.5, 0);
      this.scene.text(x + 56, y + 8, shortText(skill.name, 26), {
        fontSize: '13px',
        fontStyle: '900',
        wordWrap: { width: w - 166 },
      });
      this.StatusChip(x + w - 126, y + 8, target, {
        tone,
        minWidth: 58,
        maxChars: 9,
        height: 20,
        fontSize: '7px',
      });
      this.StatusChip(x + w - 60, y + 8, `CD ${skill.cooldown || cd || 0}`, {
        tone: cd > 0 ? COLORS.enemy : COLORS.sunGold,
        minWidth: 48,
        maxChars: 5,
        height: 20,
        fontSize: '7px',
      });
      const summary = options.summary || 'Tactical effect';
      this.scene.text(x + 56, y + 31, shortText(summary, 62), {
        fontSize: '9px',
        fontStyle: '700',
        color: COLORS.text,
      });
      this.CostOrbs(x + 57, y + h - 12, cost, { size: 10, step: 13, max: 6 });
      const rules = disabled && options.disabledReason
        ? `${costText.toUpperCase()} / ${options.disabledReason}`
        : cd > 0
        ? `Cooldown ${cd} turn${cd === 1 ? '' : 's'}`
        : `${target.toUpperCase()} / ${costText.toUpperCase()} / READY`;
      this.scene.mono(x + 136, y + h - 18, shortText(rules, 32), {
        color: disabled ? '#a73434' : COLORS.muted,
        fontSize: '7px',
      });
      this.IconButton(x + w - 34, y + h - 31, 24, 22, 'i', options.onDetails || (() => {}), {
        stroke: tone,
        fontSize: '10px',
        disabled: false,
        radius: 10,
      });
      this.hit(x, y, w - 38, h, `Skill ${skill.name}`, options.onClick || (() => {}), disabled);
      return;
    }
    if (command && selected) {
      g.fillStyle(tone, 0.2);
      this.slantedPath(g, x + 38, y + 4, w - 82, h - 8, -10);
      g.fillPath();
    }
    g.fillStyle(tone, disabled ? 0.12 : 0.88);
    this.slantedPath(g, x + 8, y + 6, compact ? 34 : 38, h - 12, 9);
    g.fillPath();
    g.fillStyle(COLORS.inkDeep, disabled ? 0.18 : 0.72);
    this.slantedPath(g, x + 14, y + (compact ? 12 : 15), 24, compact ? 18 : 21, 6);
    g.fillPath();
    this.scene.mono(x + 27, y + (compact ? 16 : 21), (ENERGY_LABELS[((skill && skill.cost) || [])[0]] || 'S'), {
      color: COLORS.cardWhite,
      fontSize: compact ? '10px' : '12px',
    }).setOrigin(0.5, 0);
    this.scene.text(x + 52, y + (compact ? 6 : 9), shortText(skill.name, compact ? 24 : 17), {
      fontSize: compact ? '11px' : '12px',
      fontStyle: '900',
      wordWrap: { width: compact ? w - 128 : w - 92 },
    });
    this.StatusChip(x + w - 68, y + (compact ? 8 : 10), options.targetLabel || 'Target', { tone, minWidth: 50, maxChars: 7, height: compact ? 18 : 20 });
    if (!compact) this.CostOrbs(x + 56, y + 42, skill.cost || [], { size: 11, step: 14, max: 5 });
    this.scene.mono(x + (compact ? 52 : 12), y + (compact ? 23 : h - 28), cd > 0 ? `COOLDOWN ${cd}` : shortText(options.summary || 'Tactical effect', compact ? 39 : 30), {
      color: cd > 0 || disabled ? COLORS.muted : COLORS.text,
      fontSize: compact ? '7px' : '8px',
    });
    const tags = (skill.classes || []).slice(0, 2).map((tag) => titleize(tag)).join(' / ');
    this.scene.mono(x + (compact ? w - 126 : 12), y + h - (compact ? 12 : 14), disabled && options.disabledReason ? shortText(options.disabledReason, compact ? 20 : 25) : shortText(tags || 'Technique', compact ? 18 : 25), {
      color: disabled ? '#a73434' : COLORS.muted,
      fontSize: '7px',
    });
    this.hit(x, y, w, h, `Skill ${skill.name}`, options.onClick || (() => {}), disabled);
    this.IconButton(x + w - 34, y + h - (compact ? 28 : 31), 24, compact ? 20 : 22, 'i', options.onDetails || (() => {}), {
      stroke: tone,
      fontSize: '10px',
      disabled: false,
      radius: 10,
    });
  }

  SkillCard(skill, caster, x, y, w, h, options = {}) {
    this.SkillActionCard(skill, caster, x, y, w, h, options);
  }

  QueueActionCard(action, meta, x, y, w, h, options = {}) {
    const tone = options.tone || COLORS.sunGold;
    this.fillSlantedPlate(x, y, w, h, {
      fill: COLORS.paperLight,
      stroke: tone,
      alpha: 0.98,
      slant: 18,
      strokeWidth: 2.4,
      shadowAlpha: 0.22,
    });
    this.scene.graphics.fillStyle(tone, 0.96);
    this.slantedPath(this.scene.graphics, x + 10, y + 10, 38, 30, 8);
    this.scene.graphics.fillPath();
    if (meta.caster) {
      this.scene.characterArt(meta.caster, x + 9, y + 42, 42, 30, { tone, label: false });
    }
    this.scene.mono(x + 27, y + 19, `Q${options.index + 1}`, { color: '#142033', fontSize: '9px' }).setOrigin(0.5, 0);
    this.scene.text(x + 54, y + 9, shortText(meta.skill ? meta.skill.name : action.skill_id, 23), {
      fontSize: '12px',
      fontStyle: '900',
    });
    this.scene.mono(x + 54, y + 31, `${shortText(meta.caster && meta.caster.name, 15)} -> ${shortText(meta.targetName, 17)}`, {
      color: COLORS.text,
      fontSize: '8px',
    });
    this.CostOrbs(x + 58, y + 58, meta.cost || [], { size: 11, step: 14, max: 5 });
    this.GameButton(x + w - 78, y + 9, 30, 28, '^', options.onMoveUp || (() => {}), {
      fill: COLORS.paperLight,
      stroke: options.index === 0 ? COLORS.lineWarm : COLORS.sunGold,
      mono: true,
      fontSize: '12px',
      disabled: options.index === 0,
      radius: 12,
    });
    this.GameButton(x + w - 40, y + 9, 30, 28, 'v', options.onMoveDown || (() => {}), {
      fill: COLORS.paperLight,
      stroke: options.isLast ? COLORS.lineWarm : COLORS.sunGold,
      mono: true,
      fontSize: '12px',
      disabled: options.isLast,
      radius: 12,
    });
  }

  CharacterShowcaseCard(character, x, y, w, h, options = {}) {
    const selected = !!options.selected;
    const locked = !!options.locked;
    const tone = selected ? (options.selectedTone || COLORS.sunGold) : (options.tone || this.scene.store.assets.toneFor(character && character.id));
    this.fillSlantedPlate(x, y, w, h, {
      fill: locked ? COLORS.ink900 : COLORS.ink800,
      stroke: tone,
      alpha: locked ? 0.62 : 0.98,
      slant: 14,
      strokeWidth: selected ? 2.8 : 2,
      shadowAlpha: 0.22,
      flashAlpha: 0.24,
    });
    this.scene.graphics.fillStyle(tone, locked ? 0.12 : 0.22);
    this.slantedPath(this.scene.graphics, x + 8, y + 8, w - 16, h * 0.54, 12);
    this.scene.graphics.fillPath();
    this.scene.graphics.fillStyle(tone, 0.88);
    this.slantedPath(this.scene.graphics, x + w - 48, y + 10, 32, 18, -7);
    this.scene.graphics.fillPath();
    this.scene.mono(x + w - 32, y + 15, ((character && character.difficulty) || 'R').slice(0, 2).toUpperCase(), {
      color: COLORS.text,
      fontSize: '7px',
    }).setOrigin(0.5, 0);
    this.scene.characterArt(character, x + 8, y + 10, w - 16, h * 0.55, { tone, dead: locked, selected, label: false });
    this.scene.text(x + 12, y + h * 0.6, shortText(character && character.name, 20), {
      fontSize: '13px',
      fontStyle: '900',
      wordWrap: { width: w - 24 },
    });
    this.scene.mono(x + 12, y + h * 0.6 + 24, shortText((character && character.role) || 'Fighter', 28), {
      color: COLORS.muted,
      fontSize: '8px',
    });
    const tag = ((character && character.tags) || [])[0] || ((character && character.skills) || [])[0]?.name || 'Technique';
    this.fillSlantedPlate(x + 10, y + h - 31, Math.min(w - 20, selected ? 62 : 84), 22, {
      fill: selected ? COLORS.queued : COLORS.cardWhite,
      stroke: selected ? COLORS.queued : tone,
      slant: 8,
      strokeWidth: 1.4,
      shadowAlpha: 0.08,
      flashAlpha: 0.18,
    });
    this.scene.mono(x + 21, y + h - 24, selected ? 'TRIO' : shortText(tag, 11).toUpperCase(), {
      color: COLORS.text,
      fontSize: '7px',
    });
    if (locked) this.StatusChip(x + w - 70, y + 12, 'LOCKED', { tone: COLORS.enemy, minWidth: 58 });
    this.hit(x, y, w, h, options.label || `Showcase ${character && character.name}`, options.onClick || (() => {}), locked && !options.onClick);
  }

  CharacterRosterCard(character, x, y, w, h, options = {}) {
    this.CharacterShowcaseCard(character, x, y, w, h, options);
  }

  TeamTray(x, y, w, teamIds, options = {}) {
    const slotW = (w - 16) / 3;
    [0, 1, 2].forEach((index) => {
      const id = teamIds && teamIds[index];
      const sx = x + index * (slotW + 8);
      const character = id ? this.scene.store.character(id) : null;
      this.fillSlantedPlate(sx, y, slotW, options.height || 82, {
        stroke: id ? (options.tone || COLORS.auraBlue) : COLORS.lineWarm,
        fill: id ? COLORS.paperLight : COLORS.cardCream,
        alpha: id ? 0.96 : 0.76,
        slant: index === 1 ? 0 : index === 0 ? 12 : -12,
        strokeWidth: 2,
        shadowAlpha: 0.18,
      });
      if (id) {
        this.scene.characterArt(character, sx + 6, y + 8, 42, 52, { tone: options.tone || COLORS.auraBlue, label: false });
        this.scene.text(sx + 52, y + 13, shortText(character.name, 13), { fontSize: '10px', fontStyle: '900', wordWrap: { width: slotW - 58 } });
        this.scene.mono(sx + 52, y + 45, shortText(character.role || 'Starter', 13), { color: COLORS.muted, fontSize: '7px' });
      } else {
        this.scene.mono(sx + 12, y + 28, `S${index + 1}`, { color: COLORS.dim, fontSize: '8px' });
        this.scene.text(sx + 12, y + 44, 'Open', { color: COLORS.muted, fontSize: '10px', fontStyle: '800' });
      }
    });
  }

  CharacterDetailSheet(frame, character, options = {}) {
    if (!character) return;
    const h = Math.min(440, frame.height - 104);
    const x = frame.x + 14;
    const y = frame.height - h - 10;
    const w = frame.width - 28;
    const tone = options.tone || COLORS.sunGold;
    this.BottomSheet(frame, y, h, { x, w, tone, scrim: true });
    this.scene.characterArt(character, x + 18, y + 26, 92, 126, { tone, selected: options.selected });
    this.scene.text(x + 126, y + 28, shortText(character.name, 24), {
      fontFamily: TOKEN_TYPE.display || 'Cinzel, Inter, serif',
      fontSize: '19px',
      fontStyle: '900',
      wordWrap: { width: w - 178 },
    });
    this.scene.mono(x + 128, y + 65, shortText(character.role || 'Starter sorcerer', 34), { color: COLORS.muted, fontSize: '9px' });
    this.scene.mono(x + 128, y + 87, `${titleize(character.difficulty || 'Medium')} / ${(character.tags || []).slice(0, 2).map(titleize).join(' / ') || 'Starter'}`, {
      color: COLORS.text,
      fontSize: '8px',
    });
    this.IconButton(x + w - 48, y + 20, 34, 30, 'x', options.onClose || (() => {}), { stroke: COLORS.enemy, fontSize: '13px' });
  }

  Toast(frame, message) {
    if (!message) return;
    const x = frame.x + 18;
    const y = frame.height - 108;
    const w = frame.width - 36;
    this.Panel(x, y, w, 50, { tone: COLORS.sunGold, alpha: 0.97, radius: 16, fill: COLORS.ink800 });
    this.scene.mono(x + 15, y + 17, shortText(message, 54), { color: COLORS.text, fontSize: '11px' });
  }

  DamageNumber(x, y, value, options = {}) {
    const node = this.scene.add.text(x, y, value, {
      fontFamily: TOKEN_TYPE.display || 'Cinzel, Inter, serif',
      fontSize: options.fontSize || '28px',
      fontStyle: '900',
      color: options.color || '#e4494f',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 0.5).setDepth(options.depth || 30);
    this.scene.tweens.add({
      targets: node,
      y: y - (options.rise || 42),
      alpha: 0,
      duration: options.duration || 900,
      ease: 'Cubic.easeOut',
      onComplete: () => node.destroy(),
    });
    return node;
  }
}
