import { CULLING_COLORS, TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=23';
import { safeText, shortText } from '../core/text.js?v=23';
import {
  drawCurrentButton,
  drawCurrentModeCard,
  drawCurrentNav,
  drawCurrentPanel,
  drawCurrentPill,
  drawCurrentWorld,
} from '../ui/culling-current-ui.js?v=23';
import { BaseScene } from './base-scene.js?v=23';

const HOME_WORLD_KEY = 'culling-current-home';

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

    renderProfileStrip(region) {
      drawCurrentPanel(this, region.x, region.y, region.w, region.h, {
        fill: CULLING_COLORS.ivory,
        accent: CULLING_COLORS.cobalt,
        radius: 18,
        alpha: 0.94,
        shadowAlpha: 0.12,
      });
      const avatarX = region.x + 31;
      const avatarY = region.y + region.h / 2;
      this.graphics.fillStyle(CULLING_COLORS.cobalt, 0.96);
      this.graphics.fillCircle(avatarX, avatarY, 18);
      this.graphics.fillStyle(CULLING_COLORS.gold, 0.92);
      this.graphics.fillCircle(avatarX + 10, avatarY - 11, 5);
      const initial = safeText(this.store.playerName, 'P').slice(0, 1).toUpperCase();
      this.text(avatarX, avatarY - 10, initial, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui,
        fontSize: '18px',
        fontStyle: '900',
        color: CULLING_COLORS.inverseText,
      }).setOrigin(0.5, 0);
      this.mono(region.x + 58, region.y + 9, 'PLAYER', {
        color: CULLING_COLORS.cobaltText,
        fontSize: '10px',
        fontStyle: '700',
      });

      // Identity values remain untouched in the store; only their compact Home
      // presentation is shortened so the editable room pill and player name
      // can never paint over one another.
      const roomCode = safeText(this.store.roomId, 'lobby').toUpperCase();
      const roomLabel = `ROOM ${shortText(roomCode, 14)}`;
      const roomW = Math.min(132, Math.max(82, roomLabel.length * 6 + 20));
      const roomX = region.x + region.w - roomW - 12;
      const nameX = region.x + 58;
      const nameW = Math.max(58, roomX - nameX - 10);
      const nameLimit = Math.max(6, Math.floor(nameW / 8.5));
      const name = this.text(nameX, region.y + 26, shortText(this.store.playerName, nameLimit), {
        fontSize: `${TYPE_SCALE.subtitle}px`,
        fontStyle: '900',
        color: CULLING_COLORS.text,
        wordWrap: { width: nameW },
      });
      name.setMaxLines(1);

      drawCurrentPill(this, roomX, region.y + 16, roomLabel, {
        w: roomW,
        fill: CULLING_COLORS.charcoal,
        color: CULLING_COLORS.inverseText,
        fontSize: '10px',
      });
      this.registerHitTarget(region.x + 48, region.y + 4, Math.max(44, roomX - region.x - 54), region.h - 8, `Edit player name ${this.store.playerName}`, () => this.editIdentity('name'));
      this.registerHitTarget(roomX, region.y + 6, roomW, 44, `Edit room code ${this.store.roomId}`, () => this.editIdentity('room'));
    }

    renderHeroTrio(region) {
      this.mono(region.x + 8, region.y + 2, 'YOUR ACTIVE TRIO', {
        color: CULLING_COLORS.cobaltText,
        fontSize: '11px',
        fontStyle: '700',
      });
      const activeMission = this.store.activeMission();
      if (activeMission) {
        const missionLabel = safeText(activeMission.title || activeMission.name || 'First Creation');
        this.text(region.x + 8, region.y + 20, missionLabel, {
          color: CULLING_COLORS.text,
          fontSize: `${TYPE_SCALE.label}px`,
          fontStyle: '800',
        });
      }

      const trio = this.store.playerTeam.slice(0, 3);
      const gap = 8;
      const cardW = (region.w - gap * 2 - 12) / 3;
      const cardH = Math.min(236, Math.max(174, region.h - 68));
      const baseY = region.y + region.h - cardH - 4;
      trio.forEach((characterId, index) => {
        const character = this.store.character(characterId);
        const x = region.x + 6 + index * (cardW + gap);
        const y = baseY + (index === 1 ? -10 : 0);
        const tone = index === 0 ? CULLING_COLORS.vermilion : index === 1 ? CULLING_COLORS.cobalt : CULLING_COLORS.gold;
        drawCurrentPanel(this, x, y, cardW, cardH, {
          fill: CULLING_COLORS.ivory,
          accent: tone,
          radius: 16,
          alpha: 0.91,
          shadowAlpha: 0.16,
          highlight: false,
        });
        const key = `${this.store.portraitKey(characterId)}-card`;
        const portraitH = cardH - 49;
        if (this.textures.exists(key)) {
          const image = this.add.image(x + cardW / 2, y + portraitH / 2 + 4, key);
          image.setDisplaySize(cardW - 10, portraitH - 8);
          image.setDepth(0);
          image.setAlpha(0.97);
          this.nodes.push(image);
        } else {
          this.platePortrait(character, x + 7, y + 7, cardW - 14, { h: portraitH - 10, tone });
        }
        this.graphics.fillStyle(CULLING_COLORS.ivory, 0.97);
        this.graphics.fillRoundedRect(x + 4, y + cardH - 47, cardW - 8, 43, 11);
        const characterName = this.text(x + cardW / 2, y + cardH - 40, character.name, {
          fontFamily: TOKEN_TYPE.ui || 'Inter, Arial, sans-serif',
          fontSize: cardW < 104 ? '10px' : '11px',
          fontStyle: '900',
          color: CULLING_COLORS.text,
          align: 'center',
          lineSpacing: 1,
          wordWrap: { width: cardW - 12 },
        }).setOrigin(0.5, 0);
        characterName.setMaxLines(2);
      });
    }

    renderQuickMatch(region) {
      drawCurrentButton(this, region.x, region.y, region.w, region.h, 'READY FOR BATTLE', () => {
        this.store.setMatchMode('cpu');
        this.store.changeScene('DraftScene');
      }, {
        fill: CULLING_COLORS.cobalt,
        stroke: CULLING_COLORS.charcoal,
        subtitle: 'QUICK MATCH  ·  CPU PRACTICE',
        fontSize: region.h < 80 ? '22px' : '25px',
        brush: 'red',
      });
    }

    renderModeCards(region) {
      const gap = 8;
      const cardW = (region.w - gap * 2) / 3;
      drawCurrentModeCard(this, region.x, region.y, cardW, region.h, 'Private Room', 'PVP', () => {
        this.store.setMatchMode('pvp');
        this.store.changeScene('DraftScene');
      }, { accent: CULLING_COLORS.vermilion, accentText: CULLING_COLORS.redText });
      drawCurrentModeCard(this, region.x + cardW + gap, region.y, cardW, region.h, 'First Creation', 'ROSTER', () => {
        this.store.setMatchMode('cpu');
        this.store.changeScene('FirstCreationScene');
      }, { accent: CULLING_COLORS.cobalt });
      drawCurrentModeCard(this, region.x + (cardW + gap) * 2, region.y, cardW, region.h, 'Mission Map', 'STORY', () => {
        this.store.changeScene('MissionMapScene');
      }, { accent: CULLING_COLORS.gold, accentText: '#8A5A00' });
    }

    renderBottomNav(region) {
      drawCurrentNav(this, region, [
        { label: 'Home', active: true, disabled: true, onClick: () => {} },
        { label: 'Roster', onClick: () => {
          this.store.setMatchMode('cpu');
          this.store.changeScene('FirstCreationScene');
        } },
        { label: 'Records', onClick: () => this.store.changeScene('RecordsScene') },
      ]);
    }

    render() {
      const layout = this.layout.homeScreen();
      const frame = layout.frame;
      this.clearSurface();
      drawCurrentWorld(this, frame, HOME_WORLD_KEY, {
        topWash: 0.14,
        bottomWash: 0.18,
        bottomHeight: frame.height - layout.hero.y - 24,
      });
      this.renderProfileStrip(layout.profile);
      this.renderHeroTrio(layout.hero);
      this.renderQuickMatch(layout.primary);
      this.renderModeCards(layout.modes);
      this.renderBottomNav(layout.nav);
      this.toast(frame, { y: layout.primary.y - 54, theme: 'light' });
    }
  }
