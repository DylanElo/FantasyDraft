import { COLORS, TOKEN_TYPE } from '../core/runtime-config.js?v=20';
import { safeText, shortText } from '../core/text.js?v=20';
import { eventAmount } from '../fx/event-metrics.js?v=20';
import { BaseScene } from './base-scene.js?v=20';

export class ResultScene extends BaseScene {
    constructor() {
      super('ResultScene');
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.worldBackdrop(frame, { textureKey: null, ambient: 'motes' });
      const state = this.store.state;
      const mine = this.store.mineId();
      // WIN/FORFEIT both resolve to a decisive winner_id; DRAW/NO_CONTEST
      // have none and must be shown as their own outcome, not defaulted to
      // "Defeat".
      const outcome = !state ? 'unknown'
        : state.winner_id === mine ? 'win'
        : state.winner_id ? 'loss'
        : String(state.result_type || '').toUpperCase() === 'DRAW' ? 'draw'
        : 'no_contest';
      const victory = outcome === 'win';
      const outcomeLabel = { win: 'Victory', loss: 'Defeat', draw: 'Draw', no_contest: 'No Contest', unknown: 'Result' }[outcome];
      const heroLabel = { win: 'DOMAIN WON', loss: 'DOMAIN LOST', draw: 'DOMAIN CONTESTED', no_contest: 'NO CONTEST' }[outcome] || 'RESULT';
      const heroColor = victory ? COLORS.selection : outcome === 'loss' ? COLORS.enemy : COLORS.line;
      const heroTextColor = victory ? COLORS.paperText : outcome === 'loss' ? '#f1a0a0' : COLORS.text;
      this.dossierHeader(frame, { eyebrow: 'CURSED CLASH', title: outcomeLabel, tone: heroColor, backHandler: () => this.store.resetToLobby() });
      const x = frame.x + frame.gutter;
      const compact = frame.height < 730;
      const heroY = compact ? 84 : 108;
      const heroH = compact ? 144 : 180;
      this.platePanel(x, heroY, frame.width - 32, heroH, heroColor, { alpha: 0.9, edgeBar: 'left' });
      this.text(frame.x + frame.width / 2, heroY + (compact ? 22 : 26), heroLabel, {
        fontFamily: TOKEN_TYPE.display || 'Georgia, serif',
        fontSize: compact ? '27px' : '32px',
        fontStyle: '900',
        color: heroTextColor,
      }).setOrigin(0.5, 0);
      const winnerName = state && state.players && state.players[state.winner_id] ? state.players[state.winner_id].name : null;
      const summaryLine = winnerName ? `${winnerName} controls the domain`
        : outcome === 'draw' ? 'Neither side controls the domain'
        : 'No result was recorded for this domain';
      const last = this.store.records[0] || {};
      this.mono(frame.x + frame.width / 2, heroY + (compact ? 69 : 76), summaryLine, { color: COLORS.text }).setOrigin(0.5, 0);
      this.mono(x + 22, heroY + heroH - 52, `Turns: ${last.turns || (state && state.turn_number) || 0}`, { color: COLORS.text });
      this.mono(x + 160, heroY + heroH - 52, `Damage: ${last.damage || 0}`, { color: COLORS.text });
      const routeLine = victory ? 'Route clear registered.'
        : outcome === 'loss' ? 'Route remains uncleared.'
        : outcome === 'draw' ? 'Route contested — no clear registered.'
        : 'No route progress registered.';
      this.mono(x + 22, heroY + heroH - 29, routeLine, {
        color: victory ? '#b7dbc0' : outcome === 'loss' ? '#f1a0a0' : COLORS.muted,
        fontSize: '10px',
      });
      const strikesY = heroY + heroH + (compact ? 16 : 26);
      const strikesH = compact ? 118 : 150;
      this.platePanel(x, strikesY, frame.width - 32, strikesH, COLORS.line, { alpha: 0.88 });
      this.railLabel(x + 16, strikesY + 18, 'BIGGEST STRIKES', COLORS.line);
      const strikes = (last.biggest && last.biggest.length ? last.biggest : ((state && state.event_log) || [])
        .map((event) => ({ message: event.message || event.type, amount: eventAmount(event) }))
        .filter((event) => event.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3));
      if (!strikes.length) {
        this.mono(x + 16, strikesY + 50, 'No strike data recorded.', { color: COLORS.muted });
      } else {
        strikes.forEach((event, index) => {
          this.mono(x + 16, strikesY + 48 + index * (compact ? 21 : 26), safeText(event.message).slice(0, 44), { color: COLORS.text, fontSize: '10px' });
          this.mono(x + frame.width - 86, strikesY + 48 + index * (compact ? 21 : 26), `${event.amount} DMG`, { color: '#f1a0a0', fontSize: '10px' });
        });
      }
      const mission = this.store.activeMission();
      const profile = this.store.firstCreationProfile();
      const completed = (profile.completed_missions || []).length;
      const total = this.store.missions().length || 1;
      const missionY = strikesY + strikesH + (compact ? 14 : 22);
      const missionH = compact ? 108 : 116;
      this.platePanel(x, missionY, frame.width - 32, missionH, COLORS.selection, { edgeBar: 'left' });
      this.mono(x + 16, missionY + 15, 'MISSION PROGRESS', { color: COLORS.paperText, fontSize: '10px' });
      this.text(x + 16, missionY + 32, shortText(mission ? mission.title : 'First Creation Progress', 34), { fontSize: '13px', fontStyle: '900' });
      this.progressRail(x + 16, missionY + 58, frame.width - 164, 8, completed / total, COLORS.selection);
      this.mono(x + frame.width - 128, missionY + 56, `${completed}/${total} ROUTES`, { color: COLORS.text, fontSize: '9px' });
      const unlocks = mission && mission.unlocks && mission.unlocks.length ? `Unlocks: ${mission.unlocks.join(' / ')}` : 'Progress saved to your profile.';
      this.mono(x + 16, missionY + 78, 'REWARD CHECK', { color: COLORS.paperText, fontSize: '10px' });
      this.mono(x + 16, missionY + 94, shortText(victory ? unlocks : 'Replay the route to clear the objective.', 58), { color: COLORS.text, fontSize: '10px' });
      this.button(x, frame.height - 120, frame.width - 32, 44, 'Rematch', () => this.store.changeScene('DraftScene'), {
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
