import { TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=42';
import { safeText } from '../core/text.js?v=42';
import { Season3UI } from '../ui/season3-ui.js?v=42';
import { BaseScene } from './base-scene.js?v=42';

const {
  colors: S3_COLORS,
  button: drawS3Button,
  panel: drawS3Panel,
  progress: drawS3Progress,
  world: drawS3World,
  missionRewardModel,
  outcomeVisual,
  resultModel,
} = Season3UI.postMatch;

const STORM_WORLD_KEY = 'culling-current-rooftop';

function resultComposition(frame) {
  const compact = frame.bottom - frame.top < 735;
  const gutter = frame.width <= 360 ? 10 : 12;
  const gap = compact ? 7 : 9;
  const x = frame.x + gutter;
  const w = frame.width - gutter * 2;
  const header = { x, y: frame.top, w, h: compact ? 54 : 58 };
  const actions = { x, y: frame.bottom - 50, w, h: 50 };
  const debriefH = compact ? 112 : 124;
  const impactsH = compact ? 126 : 146;
  const heroY = header.y + header.h + gap;
  const heroH = Math.max(268, actions.y - gap - impactsH - gap - debriefH - gap - heroY);
  const hero = { x, y: heroY, w, h: heroH };
  const debriefY = hero.y + hero.h + gap;
  const debrief = { x, y: debriefY, w, h: debriefH };
  const impactsY = debrief.y + debrief.h + gap;
  const impacts = { x, y: impactsY, w, h: impactsH };
  return { compact, header, hero, debrief, impacts, actions, gap };
}

function fighterIdentity(fighter) {
  return safeText(fighter && (fighter.character_id || fighter.id));
}

export class ResultScene extends BaseScene {
    constructor() {
      super('ResultScene');
      this.resultEntrancePlayed = false;
    }

    resultTeam(state, model) {
      const winner = state && state.players && state.winner_id ? state.players[state.winner_id] : null;
      const mine = state && state.players ? state.players[this.store.mineId()] : null;
      const team = winner && Array.isArray(winner.team)
        ? winner.team
        : mine && Array.isArray(mine.team) ? mine.team : [];
      return team.slice(0, 3).map((fighter, index) => ({
        fighter,
        id: fighterIdentity(fighter),
        name: safeText(fighter && (fighter.name || fighter.character_id), model.winnerTeam[index] || `Fighter ${index + 1}`),
      }));
    }

    renderHeader(region, model, visual) {
      this.graphics.fillStyle(S3_COLORS.bone, 0.88);
      this.graphics.fillPoints([
        { x: region.x, y: region.y },
        { x: region.x + region.w - 50, y: region.y },
        { x: region.x + region.w - 30, y: region.y + region.h },
        { x: region.x, y: region.y + region.h },
      ], true);
      this.graphics.lineStyle(2, visual.accent, 0.92);
      this.graphics.beginPath();
      this.graphics.moveTo(region.x, region.y + region.h);
      this.graphics.lineTo(region.x + region.w - 30, region.y + region.h);
      this.graphics.strokePath();
      this.mono(region.x + 12, region.y + 7, 'CULLING CURRENT // AFTER ACTION', {
        color: S3_COLORS.barrier,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '900',
      });
      this.text(region.x + 12, region.y + 22, model.label.toUpperCase(), {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        color: S3_COLORS.text,
        fontSize: region.h < 58 ? '23px' : '26px',
        fontStyle: '900',
      });
      drawS3Button(this, region.x + region.w - 46, region.y + 5, 44, 44, 'HOME', () => this.store.resetToLobby(), {
        variant: 'primary',
        accent: visual.accent,
        fontSize: '10px',
        mono: true,
      });
    }

    renderHero(region, model, visual, team) {
      const g = this.graphics;
      const nodes = [];
      g.fillStyle(S3_COLORS.ink, 0.3);
      g.fillRect(region.x, region.y, region.w, region.h);
      g.fillStyle(visual.signal, model.outcome === 'loss' ? 0.18 : 0.12);
      g.fillTriangle(region.x, region.y, region.x + region.w, region.y, region.x, region.y + region.h * 0.72);
      g.lineStyle(3, visual.accent, 0.94);
      g.beginPath();
      g.moveTo(region.x, region.y + 4);
      g.lineTo(region.x + region.w, region.y + 4);
      g.strokePath();

      const resultTitle = this.text(region.x + region.w / 2, region.y + 8, model.hero.toUpperCase(), {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        color: model.outcome === 'loss' ? '#FFF4ED' : '#FFFFFF',
        fontSize: region.w <= 360 ? '35px' : '40px',
        fontStyle: '900',
        stroke: '#101828',
        strokeThickness: 5,
        letterSpacing: 1,
      }).setOrigin(0.5, 0).setDepth(9);
      nodes.push(resultTitle);
      this.mono(region.x + region.w / 2, region.y + 51, model.winnerName
        ? `${model.winnerName.toUpperCase()} SECURED THE FIELD`
        : model.outcome === 'draw' ? 'THE FIELD REMAINS UNCLAIMED' : 'NO WINNER RECORDED', {
        color: '#F7F4EC',
        fontSize: '11px',
        fontStyle: '900',
        stroke: '#101828',
        strokeThickness: 3,
      }).setOrigin(0.5, 0).setDepth(9);

      const portraitTop = region.y + 72;
      const portraitBottom = region.y + region.h - 43;
      const portraitH = Math.max(126, portraitBottom - portraitTop);
      const overlap = region.w <= 360 ? 10 : 13;
      const portraitW = Math.min(132, (region.w - 20 + overlap * 2) / 3);
      const totalW = portraitW * 3 - overlap * 2;
      const startX = region.x + (region.w - totalW) / 2;
      team.forEach((member, index) => {
        const x = startX + index * (portraitW - overlap);
        const y = portraitTop + (index === 1 ? -5 : 6);
        const h = portraitH + (index === 1 ? 5 : -6);
        g.fillStyle(S3_COLORS.ink, 0.5);
        g.fillRect(x + 4, y + 5, portraitW, h);
        g.lineStyle(index === 1 ? 3 : 2, index === 1 ? visual.accent : S3_COLORS.bone, 0.96);
        g.strokeRect(x, y, portraitW, h);
        g.fillStyle(index === 1 ? visual.accent : S3_COLORS.barrier, 0.96);
        g.fillTriangle(x, y, x + 27, y, x, y + 27);
        const art = this.portraitArtwork(member.fighter || member.id, x + 3, y + 3, portraitW - 6, h - 6, {
          context: 'hero',
          tone: visual.accent,
          alpha: 1,
        });
        if (art) {
          art.setDepth(2 + index);
          nodes.push(art);
        }
        const name = safeText(member.name).toUpperCase();
        const nameNode = this.text(x + portraitW / 2, region.y + region.h - 41, name, {
          fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
          color: '#FFFFFF',
          fontSize: name.length > 18 ? `${TYPE_SCALE.micro}px` : region.w <= 360 ? '11px' : '12px',
          fontStyle: '900',
          stroke: '#101828',
          strokeThickness: 4,
          align: 'center',
          lineSpacing: -1,
          wordWrap: { width: portraitW - 6 },
        }).setOrigin(0.5, 0).setDepth(8);
        nameNode.setMaxLines(2);
      });

      if (!this.resultEntrancePlayed && this.presentationLayer) {
        this.resultEntrancePlayed = true;
        this.presentationLayer.interactionCue(this, { cue: 'reveal' });
        this.presentationLayer.sceneIntro(this, {
          targets: nodes,
          options: { distance: 24, stagger: 90, duration: 360 },
        });
      }
    }

    renderDebrief(region, model, rewards, visual) {
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.bone,
        accent: rewards.lastCompleted.length ? S3_COLORS.gold : visual.accent,
        alpha: 0.97,
        cut: 10,
        washAlpha: 0.14,
      });
      this.mono(region.x + 12, region.y + 9, 'MISSION DEBRIEF // REWARD STATUS', {
        color: S3_COLORS.barrier,
        fontSize: '11px',
        fontStyle: '900',
      });
      this.mono(region.x + region.w - 12, region.y + 9, `${rewards.completedCount}/${rewards.totalMissions} CLEARED`, {
        color: S3_COLORS.mutedText,
        fontSize: '10px',
        fontStyle: '900',
      }).setOrigin(1, 0);
      drawS3Progress(this, region.x + 12, region.y + 28, region.w - 24, 7, rewards.ratio, {
        fill: rewards.lastCompleted.length ? S3_COLORS.gold : S3_COLORS.cyan,
      });
      const headline = rewards.missionTitles.length
        ? `ROUTE CLEARED // ${rewards.missionTitles.join(' / ')}`
        : model.outcome === 'win' ? 'VICTORY RECORDED // NO NEW ROUTE CLEAR' : 'NO MISSION CLEAR THIS MATCH';
      this.text(region.x + 12, region.y + 45, headline, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        color: S3_COLORS.text,
        fontSize: '15px',
        fontStyle: '900',
        wordWrap: { width: region.w - 24 },
      }).setMaxLines(2);
      const reward = rewards.rewards[0];
      this.mono(region.x + 12, region.y + region.h - 25, reward
        ? `REWARD REVEALED // ${safeText(reward.title).toUpperCase()}`
        : `TURN ${model.turns} // ${model.damage} TOTAL DAMAGE`, {
        color: reward ? '#66501C' : S3_COLORS.mutedText,
        fontSize: '10px',
        fontStyle: '900',
      });
    }

    renderImpacts(region, model, visual) {
      this.mono(region.x, region.y + 2, 'CURRENT MATCH // BIGGEST IMPACTS', {
        color: '#FFFFFF',
        fontSize: '11px',
        fontStyle: '900',
        stroke: '#101828',
        strokeThickness: 3,
      });
      const events = model.strikes.length ? model.strikes.slice(0, 2) : [{ message: 'No damage event recorded.', amount: 0 }];
      const rowY = region.y + 22;
      const rowH = Math.max(44, (region.h - 24) / events.length);
      events.forEach((event, index) => {
        const y = rowY + index * rowH;
        this.graphics.fillStyle(S3_COLORS.bone, 0.88);
        this.graphics.fillRect(region.x, y, region.w, rowH - 4);
        this.graphics.fillStyle(index === 0 ? visual.accent : S3_COLORS.cyan, 0.95);
        this.graphics.fillRect(region.x, y, 5, rowH - 4);
        this.text(region.x + 12, y + 6, safeText(event.message), {
          color: S3_COLORS.text,
          fontSize: region.w <= 360 ? '10px' : '11px',
          fontStyle: index === 0 ? '800' : '600',
          lineSpacing: -1,
          wordWrap: { width: region.w - 96 },
        }).setMaxLines(2);
        this.mono(region.x + region.w - 10, y + 8, event.amount ? `${event.amount} DMG` : '--', {
          color: event.amount ? '#9A211A' : S3_COLORS.mutedText,
          fontSize: '10px',
          fontStyle: '900',
        }).setOrigin(1, 0);
      });
    }

    render() {
      const frame = this.layout.frame();
      const layout = resultComposition(frame);
      this.clearSurface();
      drawS3World(this, frame, STORM_WORLD_KEY, { imageAlpha: 0.72, washAlpha: 0.22 });

      const state = this.store.state;
      const model = resultModel(state, this.store.mineId());
      const rewards = missionRewardModel(state, this.store.firstCreationProfile(), this.store.missions());
      const visual = outcomeVisual(model.outcome);
      const team = this.resultTeam(state, model);

      this.renderHeader(layout.header, model, visual);
      this.renderHero(layout.hero, model, visual, team);
      this.renderDebrief(layout.debrief, model, rewards, visual);
      this.renderImpacts(layout.impacts, model, visual);

      const buttonGap = 8;
      const buttonW = (layout.actions.w - buttonGap) / 2;
      drawS3Button(this, layout.actions.x, layout.actions.y, buttonW, layout.actions.h, 'REMATCH', () => this.store.changeScene('DraftScene'), {
        variant: 'primary',
        accent: S3_COLORS.gold,
        fontSize: '17px',
      });
      drawS3Button(this, layout.actions.x + buttonW + buttonGap, layout.actions.y, buttonW, layout.actions.h, 'RETURN HOME', () => this.store.resetToLobby(), {
        variant: 'primary',
        accent: S3_COLORS.vermilion,
        fontSize: '15px',
      });
      this.toast(frame, { y: layout.actions.y - 48, theme: 'light' });
      this.renderPresentationSettingsSheet(frame, { onExit: () => this.store.resetToLobby() });
    }
  }
