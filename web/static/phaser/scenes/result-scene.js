import { COLORS } from '../core/runtime-config.js?v=17';
import { safeText, shortText } from '../core/text.js?v=17';
import { eventAmount } from '../fx/event-metrics.js?v=17';
import { BaseScene } from './base-scene.js?v=17';

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
      const resultType = String((state && state.result_type) || (state && state.winner_id ? 'WIN' : 'DRAW')).toUpperCase();
      const neutral = resultType === 'DRAW' || resultType === 'NO_CONTEST';
      const heading = resultType === 'NO_CONTEST' ? 'No Contest' : (resultType === 'DRAW' ? 'Draw' : (victory ? 'Victory' : 'Defeat'));
      this.topBar(frame, heading, () => this.store.resetToLobby());
      const x = frame.x + frame.gutter;
      const compact = frame.height < 730;
      const heroY = compact ? 84 : 108;
      const heroH = compact ? 144 : 180;
      this.cardPanel(x, heroY, frame.width - 32, heroH, victory ? COLORS.selection : COLORS.enemy, 0.84);
      this.text(frame.x + frame.width / 2, heroY + (compact ? 22 : 26), neutral ? heading.toUpperCase() : (victory ? 'DOMAIN WON' : 'DOMAIN LOST'), {
        fontFamily: 'Cinzel, Inter, serif',
        fontSize: compact ? '27px' : '32px',
        fontStyle: '900',
        color: victory ? COLORS.paperText : '#f1a0a0',
      }).setOrigin(0.5, 0);
      const winner = state && state.winner_id && state.players && state.players[state.winner_id] ? state.players[state.winner_id].name : null;
      const damage = ((state && state.event_log) || []).reduce((total, event) => total + eventAmount(event), 0);
      this.mono(frame.x + frame.width / 2, heroY + (compact ? 69 : 76), winner ? `${winner} controls the domain` : safeText((state && state.result_reason) || heading), { color: COLORS.text }).setOrigin(0.5, 0);
      this.mono(x + 22, heroY + heroH - 52, `Turns: ${(state && state.turn_number) || 0}`, { color: COLORS.text });
      this.mono(x + 160, heroY + heroH - 52, `Damage: ${damage}`, { color: COLORS.text });
      this.mono(x + 22, heroY + heroH - 29, victory ? 'Route clear registered.' : 'Route remains uncleared.', {
        color: victory ? '#b7dbc0' : '#f1a0a0',
        fontSize: '9px',
      });
      const strikesY = heroY + heroH + (compact ? 16 : 26);
      const strikesH = compact ? 118 : 150;
      this.cardPanel(x, strikesY, frame.width - 32, strikesH, COLORS.line, 0.72);
      this.mono(x + 16, strikesY + 18, 'BIGGEST STRIKES', { color: COLORS.paperText });
      const strikes = ((state && state.event_log) || [])
        .map((event) => ({ message: event.message || event.type, amount: eventAmount(event) }))
        .filter((event) => event.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3));
      if (!strikes.length) {
        this.mono(x + 16, strikesY + 50, 'No strike data recorded.', { color: COLORS.muted });
      } else {
        strikes.forEach((event, index) => {
          this.mono(x + 16, strikesY + 48 + index * (compact ? 21 : 26), safeText(event.message).slice(0, 44), { color: COLORS.text, fontSize: '9px' });
          this.mono(x + frame.width - 86, strikesY + 48 + index * (compact ? 21 : 26), `${event.amount} DMG`, { color: '#f1a0a0', fontSize: '9px' });
        });
      }
      const mission = this.store.activeMission();
      const profile = (window.JJK_BOOTSTRAP && window.JJK_BOOTSTRAP.firstCreation && window.JJK_BOOTSTRAP.firstCreation.profile) || {};
      const completed = (profile.completed_missions || []).length;
      const total = this.store.missions().length || 1;
      const missionY = strikesY + strikesH + (compact ? 14 : 22);
      const missionH = compact ? 108 : 116;
      this.cardPanel(x, missionY, frame.width - 32, missionH, COLORS.selection, 0.58);
      this.mono(x + 16, missionY + 15, 'MISSION PROGRESS', { color: COLORS.paperText, fontSize: '9px' });
      this.text(x + 16, missionY + 32, shortText(mission ? mission.title : 'First Creation Progress', 34), { fontSize: '13px', fontStyle: '900' });
      this.graphics.fillStyle(COLORS.inkBlack, 0.72);
      this.graphics.fillRoundedRect(x + 16, missionY + 58, frame.width - 164, 8, 4);
      this.graphics.fillStyle(COLORS.selection, 0.9);
      this.graphics.fillRoundedRect(x + 16, missionY + 58, (frame.width - 164) * Math.min(1, completed / total), 8, 4);
      this.mono(x + frame.width - 128, missionY + 56, `${completed}/${total} ROUTES`, { color: COLORS.text, fontSize: '8px' });
      const unlocks = mission && mission.unlocks && mission.unlocks.length ? `Unlocks: ${mission.unlocks.join(' / ')}` : 'Progress saved to your profile.';
      this.mono(x + 16, missionY + 78, 'REWARD CHECK', { color: COLORS.paperText, fontSize: '8px' });
      this.mono(x + 16, missionY + 94, shortText(victory ? unlocks : 'Replay the route to clear the objective.', 58), { color: COLORS.text, fontSize: '9px' });
      this.button(x, frame.height - 120, frame.width - 32, 44, 'Rematch', () => this.store.requestRematch(), {
        fill: COLORS.panel2,
        stroke: COLORS.ally,
      });
      this.button(x, frame.height - 62, frame.width - 32, 44, 'Lobby', () => this.store.resetToLobby(), {
        fill: COLORS.selection,
        gradientTop: COLORS.talismanDim,
        stroke: COLORS.talismanPaper,
        color: '#08080a',
      });
      this.toast(frame);
    }
  }
