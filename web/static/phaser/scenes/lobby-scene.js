import { CULLING_COLORS, TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=28';
import { safeText, shortText } from '../core/text.js?v=28';
import { drawCurrentWorld } from '../ui/culling-current-ui.js?v=28';
import { BaseScene } from './base-scene.js?v=28';

const HOME_WORLD_KEY = 'culling-current-home-hero';

function clippedSlab(x, y, w, h, cut = 12) {
  const safeCut = Math.max(0, Math.min(cut, w / 5, h / 3));
  return [
    { x: x + safeCut, y },
    { x: x + w, y },
    { x: x + w, y: y + h - safeCut },
    { x: x + w - safeCut, y: y + h },
    { x, y: y + h },
    { x, y: y + safeCut },
  ];
}

export class LobbyScene extends BaseScene {
    constructor() {
      super('LobbyScene');
    }

    editIdentity(type) {
      const current = type === 'name' ? this.store.playerName : this.store.roomId;
      const label = type === 'name' ? 'Player name' : 'Room code';
      const next = window.prompt(label, current);
      if (next !== null) this.store.setIdentity(type, next);
    }

    homeLayout(frame) {
      const profileH = 56;
      const navH = 64;
      const featureH = frame.height < 830 ? 88 : 94;
      const battleH = frame.height < 830 ? 88 : 96;
      const profileY = frame.top;
      const navY = frame.bottom - navH;
      const featureY = navY - featureH - 8;
      const battleY = featureY - battleH - 8;
      const titleY = profileY + profileH + 9;
      const heroY = titleY + 64;
      return {
        frame,
        profile: { x: frame.x + 8, y: profileY, w: frame.width - 16, h: profileH },
        title: { x: frame.x + 16, y: titleY, w: frame.width - 32, h: 76 },
        hero: {
          x: frame.x,
          y: heroY,
          w: frame.width,
          h: Math.max(284, battleY - heroY + 18),
        },
        battle: { x: frame.x + 8, y: battleY, w: frame.width - 16, h: battleH },
        features: { x: frame.x + 8, y: featureY, w: frame.width - 16, h: featureH },
        nav: { x: frame.x, y: navY, w: frame.width, h: navH },
      };
    }

    drawClippedSurface(x, y, w, h, options) {
      const opts = options || {};
      const points = clippedSlab(x, y, w, h, opts.cut === undefined ? 12 : opts.cut);
      this.graphics.fillStyle(opts.shadow || CULLING_COLORS.shadow, opts.shadowAlpha === undefined ? 0.18 : opts.shadowAlpha);
      this.graphics.fillPoints(clippedSlab(x + (opts.shadowX || 0), y + (opts.shadowY === undefined ? 4 : opts.shadowY), w, h, opts.cut === undefined ? 12 : opts.cut), true);
      this.graphics.fillStyle(opts.fill === undefined ? CULLING_COLORS.ivory : opts.fill, opts.alpha === undefined ? 0.96 : opts.alpha);
      this.graphics.fillPoints(points, true);
      this.graphics.lineStyle(opts.strokeWidth || 1.25, opts.stroke === undefined ? CULLING_COLORS.charcoal : opts.stroke, opts.strokeAlpha === undefined ? 0.28 : opts.strokeAlpha);
      this.graphics.strokePoints(points, true);
      return points;
    }

    renderProfileStrip(region) {
      this.drawClippedSurface(region.x, region.y, region.w, region.h, {
        fill: CULLING_COLORS.cobalt,
        alpha: 0.78,
        stroke: CULLING_COLORS.ivory,
        strokeAlpha: 0.34,
        shadowAlpha: 0.12,
        cut: 10,
      });

      const avatarSize = 44;
      const avatarX = region.x + 6;
      const avatarY = region.y + 6;
      const leadId = this.store.playerTeam[0];
      if (leadId) {
        this.portraitArtwork(leadId, avatarX, avatarY, avatarSize, avatarSize, {
          context: 'square',
          depth: 1,
          alpha: 1,
        });
      } else {
        this.graphics.fillStyle(CULLING_COLORS.ivory, 0.94);
        this.graphics.fillRect(avatarX, avatarY, avatarSize, avatarSize);
      }
      const avatarFrame = this.add.graphics().setDepth(2);
      avatarFrame.lineStyle(2, CULLING_COLORS.cyan, 0.92);
      avatarFrame.strokeRect(avatarX, avatarY, avatarSize, avatarSize);
      avatarFrame.lineStyle(1, CULLING_COLORS.ivory, 0.72);
      avatarFrame.strokeCircle(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 3);
      this.nodes.push(avatarFrame);

      const nameX = avatarX + avatarSize + 10;
      const statusW = 52;
      const roomW = Math.min(112, Math.max(88, region.w * 0.29));
      const roomX = region.x + region.w - statusW - roomW - 10;
      const nameW = Math.max(72, roomX - nameX - 8);
      const nameLimit = Math.max(7, Math.floor(nameW / 8));
      this.text(nameX, region.y + 7, shortText(this.store.playerName, nameLimit), {
        fontFamily: TOKEN_TYPE.ui || 'Inter, Arial, sans-serif',
        fontSize: `${TYPE_SCALE.subtitle}px`,
        fontStyle: '900',
        color: CULLING_COLORS.inverseText,
      }).setMaxLines(1);
      this.mono(nameX, region.y + 32, `${this.store.playerTeam.length}/3 ACTIVE`, {
        fontSize: '10px',
        fontStyle: '700',
        color: CULLING_COLORS.cyan,
      });

      this.graphics.lineStyle(1, CULLING_COLORS.ivory, 0.22);
      this.graphics.beginPath();
      this.graphics.moveTo(roomX - 4, region.y + 9);
      this.graphics.lineTo(roomX - 4, region.y + region.h - 9);
      this.graphics.strokePath();
      this.mono(roomX + 3, region.y + 8, 'PRIVATE ROOM', {
        fontSize: '9px',
        fontStyle: '700',
        color: CULLING_COLORS.concrete,
      });
      const roomCode = safeText(this.store.roomId, 'lobby').toUpperCase();
      this.text(roomX + 3, region.y + 27, shortText(roomCode, 14), {
        fontSize: '12px',
        fontStyle: '900',
        color: CULLING_COLORS.inverseText,
      }).setMaxLines(1);

      const live = this.store.connectionState === 'connected';
      const statusX = region.x + region.w - statusW + 2;
      this.graphics.fillStyle(live ? CULLING_COLORS.cyan : CULLING_COLORS.vermilion, 0.92);
      this.graphics.fillPoints([
        { x: statusX + 17, y: region.y + 10 },
        { x: statusX + 27, y: region.y + 20 },
        { x: statusX + 17, y: region.y + 30 },
        { x: statusX + 7, y: region.y + 20 },
      ], true);
      this.mono(statusX + 2, region.y + 36, live ? 'LIVE' : 'OFF', {
        fontSize: '9px',
        fontStyle: '900',
        color: live ? CULLING_COLORS.cyan : CULLING_COLORS.vermilion,
      });

      this.registerHitTarget(region.x + 2, region.y + 2, Math.max(44, roomX - region.x - 8), region.h - 4, `Edit player name ${this.store.playerName}`, () => this.editIdentity('name'));
      this.registerHitTarget(roomX - 2, region.y + 2, roomW, region.h - 4, `Edit room code ${this.store.roomId}`, () => this.editIdentity('room'));
    }

    renderEditorialTitle(region) {
      const isSmall = region.w < 370;
      this.text(region.x + 2, region.y - 2, 'JJK', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.display || 'Impact, sans-serif',
        fontSize: isSmall ? '39px' : '44px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
        stroke: CULLING_COLORS.ivory,
        strokeThickness: 2,
      }).setAngle(-2);
      this.text(region.x + (isSmall ? 90 : 100), region.y - 5, 'ARENA', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.display || 'Impact, sans-serif',
        fontSize: isSmall ? '45px' : '52px',
        fontStyle: '900',
        color: CULLING_COLORS.cobaltText,
        stroke: CULLING_COLORS.ivory,
        strokeThickness: 2,
      }).setAngle(-2);
      this.graphics.fillStyle(CULLING_COLORS.vermilion, 0.9);
      this.graphics.fillTriangle(region.x + 14, region.y + 51, region.x + region.w - 14, region.y + 43, region.x + 91, region.y + 58);
      this.graphics.fillStyle(CULLING_COLORS.ivory, 0.88);
      this.graphics.fillRect(region.x + 84, region.y + 54, Math.min(216, region.w - 102), 18);
      this.mono(region.x + 98, region.y + 56, 'CURSED CLASH  //  3V3 TACTICAL', {
        fontSize: isSmall ? '9px' : '10px',
        fontStyle: '900',
        color: CULLING_COLORS.cobaltText,
      });
    }

    renderHeroComposition(region) {
      const team = this.store.playerTeam.slice(0, 3);
      const sideW = Math.round(region.w * 0.45);
      const centerW = Math.round(region.w * 0.53);
      const sideH = Math.round(region.h * 0.78);
      const centerH = Math.round(region.h * 0.94);
      const sideY = region.y + region.h - sideH - 2;
      const centerY = region.y + region.h - centerH - 4;
      const placements = [
        { x: region.x - 3, y: sideY, w: sideW, h: sideH, depth: -4, tone: CULLING_COLORS.cyan },
        { x: region.x + (region.w - centerW) / 2, y: centerY, w: centerW, h: centerH, depth: -3, tone: CULLING_COLORS.cobalt },
        { x: region.x + region.w - sideW + 3, y: sideY, w: sideW, h: sideH, depth: -4, tone: CULLING_COLORS.vermilion },
      ];

      const backing = this.add.graphics().setDepth(-6);
      backing.fillStyle(CULLING_COLORS.ivory, 0.58);
      backing.fillTriangle(region.x - 18, region.y + region.h, region.x + region.w * 0.46, region.y + 18, region.x + region.w * 0.38, region.y + region.h);
      backing.fillStyle(CULLING_COLORS.cobalt, 0.2);
      backing.fillTriangle(region.x + region.w * 0.3, region.y + region.h, region.x + region.w * 0.72, region.y, region.x + region.w + 10, region.y + region.h);
      backing.fillStyle(CULLING_COLORS.vermilion, 0.18);
      backing.fillTriangle(region.x + region.w * 0.78, region.y + 12, region.x + region.w + 12, region.y + region.h * 0.74, region.x + region.w, region.y + region.h);
      this.nodes.push(backing);

      team.forEach((characterId, index) => {
        const place = placements[index];
        if (!place) return;
        this.portraitArtwork(characterId, place.x, place.y, place.w, place.h, {
          context: 'hero',
          depth: place.depth,
          alpha: 0.99,
          tone: place.tone,
        });
      });

      this.graphics.lineStyle(3, CULLING_COLORS.cyan, 0.56);
      this.graphics.beginPath();
      this.graphics.moveTo(region.x - 10, region.y + region.h - 24);
      this.graphics.lineTo(region.x + region.w * 0.39, region.y + 34);
      this.graphics.strokePath();
      this.graphics.lineStyle(3, CULLING_COLORS.vermilion, 0.52);
      this.graphics.beginPath();
      this.graphics.moveTo(region.x + region.w * 0.64, region.y + 18);
      this.graphics.lineTo(region.x + region.w + 12, region.y + region.h - 34);
      this.graphics.strokePath();
      this.graphics.fillStyle(CULLING_COLORS.ivory, 0.58);
      this.graphics.fillTriangle(region.x, region.y + region.h - 52, region.x + region.w * 0.28, region.y + region.h, region.x, region.y + region.h);
      this.graphics.fillTriangle(region.x + region.w, region.y + region.h - 62, region.x + region.w * 0.73, region.y + region.h, region.x + region.w, region.y + region.h);
    }

    renderBattleSlab(region) {
      const points = this.drawClippedSurface(region.x, region.y, region.w, region.h, {
        fill: CULLING_COLORS.ivory,
        alpha: 0.98,
        stroke: CULLING_COLORS.vermilion,
        strokeWidth: 2.5,
        strokeAlpha: 0.86,
        shadow: CULLING_COLORS.cobalt,
        shadowX: -3,
        shadowY: 6,
        shadowAlpha: 0.72,
        cut: 16,
      });
      this.graphics.fillStyle(CULLING_COLORS.vermilion, 0.96);
      this.graphics.fillTriangle(region.x, region.y + 8, region.x + 68, region.y, region.x, region.y + region.h - 5);
      this.graphics.fillTriangle(region.x + region.w - 72, region.y + region.h, region.x + region.w, region.y + 15, region.x + region.w, region.y + region.h);
      this.graphics.lineStyle(2, CULLING_COLORS.vermilion, 0.46);
      this.graphics.strokeCircle(region.x + 39, region.y + region.h / 2, 20);
      this.graphics.strokeCircle(region.x + 39, region.y + region.h / 2, 11);
      this.graphics.beginPath();
      this.graphics.moveTo(region.x + 15, region.y + region.h / 2);
      this.graphics.lineTo(region.x + 63, region.y + region.h / 2);
      this.graphics.moveTo(region.x + 39, region.y + region.h / 2 - 24);
      this.graphics.lineTo(region.x + 39, region.y + region.h / 2 + 24);
      this.graphics.strokePath();

      const compact = region.w < 370;
      this.text(region.x + region.w / 2 + 16, region.y + 10, 'READY FOR BATTLE', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.display || 'Impact, sans-serif',
        fontSize: compact ? '24px' : '28px',
        fontStyle: '900',
        color: CULLING_COLORS.redText,
      }).setOrigin(0.5, 0);
      this.text(region.x + region.w / 2 + 3, region.y + 50, 'QUICK MATCH', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: compact ? '18px' : '20px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
      }).setOrigin(0.5, 0);
      this.text(region.x + region.w - 35, region.y + 44, '›', {
        fontFamily: TOKEN_TYPE.ui || 'Arial, sans-serif',
        fontSize: '34px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
      }).setOrigin(0.5, 0.5);
      this.registerHitTarget(region.x, region.y, region.w, region.h, 'Ready for battle: Quick Match', () => {
        this.store.setMatchMode('cpu');
        this.store.changeScene('DraftScene');
      });
      return points;
    }

    featureIcon(x, y, w, tone, type) {
      const cx = x + w / 2;
      const cy = y + 24;
      this.graphics.lineStyle(2, tone, 0.88);
      if (type === 'creation') {
        this.graphics.strokeCircle(cx, cy, 13);
        this.graphics.strokeCircle(cx, cy, 7);
        this.graphics.beginPath();
        this.graphics.moveTo(cx - 18, cy + 11);
        this.graphics.lineTo(cx + 18, cy - 11);
        this.graphics.strokePath();
      } else if (type === 'missions') {
        this.graphics.strokeCircle(cx, cy, 13);
        this.graphics.beginPath();
        this.graphics.moveTo(cx, cy - 18);
        this.graphics.lineTo(cx + 5, cy - 3);
        this.graphics.lineTo(cx + 18, cy);
        this.graphics.lineTo(cx + 5, cy + 3);
        this.graphics.lineTo(cx, cy + 18);
        this.graphics.lineTo(cx - 5, cy + 3);
        this.graphics.lineTo(cx - 18, cy);
        this.graphics.lineTo(cx - 5, cy - 3);
        this.graphics.closePath();
        this.graphics.strokePath();
      } else {
        this.graphics.strokePoints([
          { x: cx, y: cy - 17 },
          { x: cx + 16, y: cy - 8 },
          { x: cx + 16, y: cy + 11 },
          { x: cx, y: cy + 18 },
          { x: cx - 16, y: cy + 11 },
          { x: cx - 16, y: cy - 8 },
        ], true);
        this.graphics.strokeCircle(cx, cy, 5);
      }
    }

    renderFeatureTile(x, y, w, h, label, kicker, type, tone, onClick) {
      this.drawClippedSurface(x, y, w, h, {
        fill: CULLING_COLORS.ivory,
        alpha: 0.95,
        stroke: tone,
        strokeAlpha: 0.38,
        shadowAlpha: 0.13,
        cut: 9,
      });
      this.graphics.fillStyle(tone, 0.12);
      this.graphics.fillTriangle(x, y, x + w * 0.72, y, x, y + h * 0.74);
      this.featureIcon(x, y + 1, w, tone, type);
      this.mono(x + 9, y + 45, kicker, {
        fontSize: '9px',
        fontStyle: '900',
        color: tone === CULLING_COLORS.gold ? '#7A5200' : (tone === CULLING_COLORS.vermilion ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText),
      });
      const title = this.text(x + 9, y + 60, label, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: w < 116 ? '12px' : '13px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
        lineSpacing: -2,
        wordWrap: { width: w - 25 },
      });
      title.setMaxLines(2);
      this.text(x + w - 12, y + h - 24, '›', {
        fontSize: '22px',
        fontStyle: '900',
        color: tone === CULLING_COLORS.gold ? '#7A5200' : (tone === CULLING_COLORS.vermilion ? CULLING_COLORS.redText : CULLING_COLORS.cobaltText),
      }).setOrigin(0.5, 0);
      this.registerHitTarget(x, y, w, h, label, onClick);
    }

    renderFeatureTiles(region) {
      const gap = 7;
      const tileW = (region.w - gap * 2) / 3;
      this.renderFeatureTile(region.x, region.y, tileW, region.h, 'First Creation', 'ROSTER', 'creation', CULLING_COLORS.cobalt, () => {
        this.store.openFirstCreation();
      });
      this.renderFeatureTile(region.x + tileW + gap, region.y, tileW, region.h, 'Missions', 'STORY', 'missions', CULLING_COLORS.gold, () => {
        this.store.changeScene('MissionMapScene');
      });
      this.renderFeatureTile(region.x + (tileW + gap) * 2, region.y, tileW, region.h, 'Private Room', 'PVP', 'room', CULLING_COLORS.vermilion, () => {
        this.store.setMatchMode('pvp');
        this.store.changeScene('DraftScene');
      });
    }

    renderNavIcon(cx, y, type, tone) {
      this.graphics.lineStyle(2.5, tone, 0.9);
      if (type === 'home') {
        this.graphics.beginPath();
        this.graphics.moveTo(cx - 12, y + 11);
        this.graphics.lineTo(cx, y);
        this.graphics.lineTo(cx + 12, y + 11);
        this.graphics.moveTo(cx - 8, y + 9);
        this.graphics.lineTo(cx - 8, y + 21);
        this.graphics.lineTo(cx + 8, y + 21);
        this.graphics.lineTo(cx + 8, y + 9);
        this.graphics.strokePath();
      } else if (type === 'roster') {
        this.graphics.strokeCircle(cx, y + 6, 5);
        this.graphics.strokeCircle(cx - 11, y + 10, 4);
        this.graphics.strokeCircle(cx + 11, y + 10, 4);
        this.graphics.beginPath();
        this.graphics.moveTo(cx - 10, y + 22);
        this.graphics.lineTo(cx - 7, y + 15);
        this.graphics.lineTo(cx + 7, y + 15);
        this.graphics.lineTo(cx + 10, y + 22);
        this.graphics.strokePath();
      } else {
        this.graphics.strokeRect(cx - 12, y + 3, 24, 18);
        this.graphics.beginPath();
        this.graphics.moveTo(cx - 7, y + 16);
        this.graphics.lineTo(cx - 2, y + 10);
        this.graphics.lineTo(cx + 3, y + 13);
        this.graphics.lineTo(cx + 8, y + 7);
        this.graphics.strokePath();
      }
    }

    renderBottomNav(region) {
      this.graphics.fillStyle(CULLING_COLORS.ivory, 0.98);
      this.graphics.fillRect(region.x, region.y, region.w, region.h + 36);
      this.graphics.lineStyle(1.5, CULLING_COLORS.cobalt, 0.38);
      this.graphics.beginPath();
      this.graphics.moveTo(region.x, region.y);
      this.graphics.lineTo(region.x + region.w, region.y);
      this.graphics.strokePath();
      const items = [
        { label: 'Home', type: 'home', active: true, disabled: true, onClick: () => {} },
        { label: 'Roster', type: 'roster', onClick: () => this.store.openFirstCreation() },
        { label: 'Records', type: 'records', onClick: () => this.store.changeScene('RecordsScene') },
      ];
      const itemW = region.w / items.length;
      items.forEach((item, index) => {
        const x = region.x + itemW * index;
        const tone = item.active ? CULLING_COLORS.cobalt : CULLING_COLORS.muted;
        if (item.active) {
          this.graphics.fillStyle(CULLING_COLORS.cobalt, 0.1);
          this.graphics.fillRect(x + 9, region.y + 4, itemW - 18, region.h - 8);
          this.graphics.fillStyle(CULLING_COLORS.cobalt, 0.92);
          this.graphics.fillRect(x + 18, region.y, itemW - 36, 3);
        }
        this.renderNavIcon(x + itemW / 2, region.y + 5, item.type, tone);
        this.text(x + itemW / 2, region.y + 35, item.label, {
          fontFamily: TOKEN_TYPE.ui || 'Inter, Arial, sans-serif',
          fontSize: `${TYPE_SCALE.label}px`,
          fontStyle: item.active ? '900' : '700',
          color: item.active ? CULLING_COLORS.cobaltText : CULLING_COLORS.mutedText,
        }).setOrigin(0.5, 0);
        this.registerHitTarget(x + 4, region.y + 3, itemW - 8, region.h - 6, item.label, item.onClick, { disabled: !!item.disabled });
      });
    }

    render() {
      const frame = this.layout.frame();
      const layout = this.homeLayout(frame);
      this.clearSurface();
      drawCurrentWorld(this, frame, HOME_WORLD_KEY, {
        topWash: 0.08,
        bottomWash: 0.05,
        bottomHeight: frame.height * 0.48,
      });
      this.renderEditorialTitle(layout.title);
      this.renderProfileStrip(layout.profile);
      this.renderBattleSlab(layout.battle);
      this.renderFeatureTiles(layout.features);
      this.renderBottomNav(layout.nav);
      this.toast(frame, { y: layout.battle.y - 54, theme: 'light' });
      this.presentSurface(frame, { moteCount: 8, parallax: 4 });
    }
  }
