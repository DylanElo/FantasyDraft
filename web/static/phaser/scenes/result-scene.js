import { COLORS } from '../core/runtime-config.js?v=16';
import { safeText, shortText } from '../core/text.js?v=16';
import { eventAmount } from '../fx/event-metrics.js?v=16';
import { BaseScene } from './base-scene.js?v=16';

export class ResultScene extends BaseScene {
    constructor() {
      super('ResultScene');
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      const state = this.store.state;
      const mine = this.store.mineId();
      const victory = state && state.winner_id === mine;
      this.topBar(frame, victory ? 'Victory' : 'Defeat', () => this.store.resetToLobby());
      const x = frame.x + frame.gutter;
      const compact = frame.height < 730;
      const heroY = compact ? 84 : 108;
      const heroH = compact ? 144 : 180;
      this.cardPanel(x, heroY, frame.width - 32, heroH, victory ? COLORS.gold : COLORS.red, 0.84);
      this.text(frame.x + frame.width / 2, heroY + (compact ? 22 : 26), victory ? 'DOMAIN WON' : 'DOMAIN LOST', {
        fontFamily: 'Cinzel, Inter, serif',
        fontSize: compact ? '27px' : '32px',
        fontStyle: '900',
        color: victory ? '#fde68a' : '#fca5a5',
      }).setOrigin(0.5, 0);
      const winner = state && state.players && state.players[state.winner_id] ? state.players[state.winner_id].name : 'Unknown';
      const last = this.store.records[0] || {};
      this.mono(frame.x + frame.width / 2, heroY + (compact ? 69 : 76), `${winner} controls the domain`, { color: '#cbd5e1' }).setOrigin(0.5, 0);
      this.mono(x + 22, heroY + heroH - 52, `Turns: ${last.turns || (state && state.turn_number) || 0}`, { color: '#e2e8f0' });
      this.mono(x + 160, heroY + heroH - 52, `Damage: ${last.damage || 0}`, { color: '#e2e8f0' });
      this.mono(x + 22, heroY + heroH - 29, victory ? 'Route clear registered.' : 'Route remains uncleared.', {
        color: victory ? '#86efac' : '#fca5a5',
        fontSize: '9px',
      });
      const strikesY = heroY + heroH + (compact ? 16 : 26);
      const strikesH = compact ? 118 : 150;
      this.cardPanel(x, strikesY, frame.width - 32, strikesH, COLORS.line, 0.72);
      this.mono(x + 16, strikesY + 18, 'BIGGEST STRIKES', { color: '#fde68a' });
      const strikes = (last.biggest && last.biggest.length ? last.biggest : ((state && state.event_log) || [])
        .map((event) => ({ message: event.message || event.type, amount: eventAmount(event) }))
        .filter((event) => event.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3));
      if (!strikes.length) {
        this.mono(x + 16, strikesY + 50, 'No strike data recorded.', { color: '#94a3b8' });
      } else {
        strikes.forEach((event, index) => {
          this.mono(x + 16, strikesY + 48 + index * (compact ? 21 : 26), safeText(event.message).slice(0, 44), { color: '#cbd5e1', fontSize: '9px' });
          this.mono(x + frame.width - 86, strikesY + 48 + index * (compact ? 21 : 26), `${event.amount} DMG`, { color: '#fca5a5', fontSize: '9px' });
        });
      }
      const mission = this.store.activeMission();
      const profile = (window.JJK_BOOTSTRAP && window.JJK_BOOTSTRAP.firstCreation && window.JJK_BOOTSTRAP.firstCreation.profile) || {};
      const completed = (profile.completed_missions || []).length;
      const total = this.store.missions().length || 1;
      const missionY = strikesY + strikesH + (compact ? 14 : 22);
      const missionH = compact ? 108 : 116;
      this.cardPanel(x, missionY, frame.width - 32, missionH, COLORS.gold, 0.58);
      this.mono(x + 16, missionY + 15, 'MISSION PROGRESS', { color: '#fde68a', fontSize: '9px' });
      this.text(x + 16, missionY + 32, shortText(mission ? mission.title : 'First Creation Progress', 34), { fontSize: '13px', fontStyle: '900' });
      this.graphics.fillStyle(0x020617, 0.72);
      this.graphics.fillRoundedRect(x + 16, missionY + 58, frame.width - 164, 8, 4);
      this.graphics.fillStyle(COLORS.gold, 0.9);
      this.graphics.fillRoundedRect(x + 16, missionY + 58, (frame.width - 164) * Math.min(1, completed / total), 8, 4);
      this.mono(x + frame.width - 128, missionY + 56, `${completed}/${total} ROUTES`, { color: '#cbd5e1', fontSize: '8px' });
      const unlocks = mission && mission.unlocks && mission.unlocks.length ? `Unlocks: ${mission.unlocks.join(' / ')}` : 'Progress saved to your profile.';
      this.mono(x + 16, missionY + 78, 'REWARD CHECK', { color: '#fde68a', fontSize: '8px' });
      this.mono(x + 16, missionY + 94, shortText(victory ? unlocks : 'Replay the route to clear the objective.', 58), { color: '#cbd5e1', fontSize: '9px' });
      this.button(x, frame.height - 120, frame.width - 32, 44, 'Rematch', () => this.store.changeScene('DraftScene'), {
        fill: COLORS.panel2,
        stroke: COLORS.cyan,
      });
      this.button(x, frame.height - 62, frame.width - 32, 44, 'Lobby', () => this.store.resetToLobby(), {
        fill: COLORS.purple,
        stroke: COLORS.gold,
      });
      this.toast(frame);
    }
  }
