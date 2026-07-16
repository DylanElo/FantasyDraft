import { COLORS, TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=21';
import { safeText, shortText } from '../core/text.js?v=21';
import { eventAmount } from '../fx/event-metrics.js?v=21';
import { BaseScene } from './base-scene.js?v=21';

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
      this.text(frame.x + frame.width / 2, heroY + (compact ? 69 : 76), summaryLine, { color: COLORS.text, fontSize: `${TYPE_SCALE.body}px` }).setOrigin(0.5, 0);
      this.text(x + 22, heroY + heroH - 54, `Turns: ${last.turns || (state && state.turn_number) || 0}`, { color: COLORS.text, fontSize: `${TYPE_SCALE.body}px` });
      this.text(x + 170, heroY + heroH - 54, `Damage: ${last.damage || 0}`, { color: COLORS.text, fontSize: `${TYPE_SCALE.body}px` });
      const routeLine = victory ? 'Route clear registered.'
        : outcome === 'loss' ? 'Route remains uncleared.'
        : outcome === 'draw' ? 'Route contested — no clear registered.'
        : 'No route progress registered.';
      this.text(x + 22, heroY + heroH - 30, routeLine, {
        color: victory ? '#b7dbc0' : outcome === 'loss' ? '#f1a0a0' : COLORS.muted,
        fontSize: `${TYPE_SCALE.label}px`,
      });
      const strikesY = heroY + heroH + (compact ? 18 : 28);
      const strikesH = compact ? 132 : 164;
      this.platePanel(x, strikesY, frame.width - 32, strikesH, COLORS.line, { alpha: 0.88 });
      this.railLabel(x + 16, strikesY + 18, 'BIGGEST STRIKES', COLORS.line);
      const strikes = (last.biggest && last.biggest.length ? last.biggest : ((state && state.event_log) || [])
        .map((event) => ({ message: event.message || event.type, amount: eventAmount(event) }))
        .filter((event) => event.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3));
      if (!strikes.length) {
        this.text(x + 16, strikesY + 50, 'No strike data recorded.', { color: COLORS.muted, fontSize: `${TYPE_SCALE.body}px` });
      } else {
        strikes.forEach((event, index) => {
          this.text(x + 16, strikesY + 48 + index * (compact ? 26 : 32), safeText(event.message).slice(0, 44), { color: COLORS.text, fontSize: `${TYPE_SCALE.body}px` });
          this.text(x + frame.width - 92, strikesY + 48 + index * (compact ? 26 : 32), `${event.amount} DMG`, { color: '#f1a0a0', fontSize: `${TYPE_SCALE.body}px` });
        });
      }
      const mission = this.store.activeMission();
      const profile = this.store.firstCreationProfile();
      const completed = (profile.completed_missions || []).length;
      const total = this.store.missions().length || 1;
      const missionY = strikesY + strikesH + (compact ? 16 : 24);
      const missionH = compact ? 122 : 130;
      this.platePanel(x, missionY, frame.width - 32, missionH, COLORS.line, { edgeBar: 'left' });
      this.mono(x + 16, missionY + 15, 'MISSION PROGRESS', { color: COLORS.paperText, fontSize: `${TYPE_SCALE.label}px` });
      this.text(x + 16, missionY + 33, shortText(mission ? mission.title : 'First Creation Progress', 34), { fontSize: `${TYPE_SCALE.subtitle}px`, fontStyle: '900' });
      this.progressRail(x + 16, missionY + 62, frame.width - 172, 8, completed / total, COLORS.selection);
      this.mono(x + frame.width - 138, missionY + 60, `${completed}/${total} ROUTES`, { color: COLORS.text, fontSize: `${TYPE_SCALE.label}px` });
      const unlocks = mission && mission.unlocks && mission.unlocks.length ? `Unlocks: ${mission.unlocks.join(' / ')}` : 'Progress saved to your profile.';
      this.mono(x + 16, missionY + 84, 'REWARD CHECK', { color: COLORS.paperText, fontSize: `${TYPE_SCALE.label}px` });
      this.text(x + 16, missionY + 100, shortText(victory ? unlocks : 'Replay the route to clear the objective.', 58), { color: COLORS.text, fontSize: `${TYPE_SCALE.body}px` });
      this.button(x, frame.height - 120, frame.width - 32, 44, 'Rematch', () => this.store.changeScene('DraftScene'), {
        fill: COLORS.selection,
        gradientTop: COLORS.talismanDim,
        stroke: COLORS.talismanPaper,
        color: '#08080a',
      });
      this.button(x, frame.height - 62, frame.width - 32, 44, 'Lobby', () => this.store.resetToLobby(), {
        fill: COLORS.panel2,
        stroke: COLORS.line,
      });
      this.toast(frame);
    }
  }
