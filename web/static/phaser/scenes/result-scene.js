import { TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=27';
import { safeText, shortText } from '../core/text.js?v=27';
import {
  S3_COLORS,
  drawS3Button,
  drawS3Panel,
  drawS3Progress,
  drawS3Tag,
  drawS3World,
  missionRewardModel,
  outcomeVisual,
  resultLayout,
  resultModel,
} from '../ui/season3-master-ui.js?v=27';
import { BaseScene } from './base-scene.js?v=27';

const STORM_WORLD_KEY = 'culling-current-rooftop';

export class ResultScene extends BaseScene {
    constructor() {
      super('ResultScene');
    }

    renderHeader(region, model) {
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.bone,
        accent: S3_COLORS.barrier,
        alpha: 0.96,
        cut: 10,
      });
      this.mono(region.x + 14, region.y + 10, 'AFTER ACTION', {
        color: S3_COLORS.barrier,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '800',
      });
      const title = this.text(region.x + 14, region.y + 29, model.label.toUpperCase(), {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: region.h < 70 ? '21px' : '24px',
        fontStyle: '900',
        color: S3_COLORS.text,
        wordWrap: { width: region.w - 104 },
      });
      title.setMaxLines(1);
      drawS3Button(this, region.x + region.w - 76, region.y + 10, 64, 44, 'HOME', () => this.store.resetToLobby(), {
        fill: S3_COLORS.inkBlue,
        accent: S3_COLORS.cyan,
        fontSize: '14px',
      });
    }

    renderHero(region, model, visual) {
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: visual.fill,
        accent: visual.accent,
        alpha: 0.94,
        strokeWidth: 2.8,
        cut: 14,
      });
      drawS3Tag(this, region.x + 14, region.y + 13, visual.neutral ? 'NEUTRAL RESULT' : 'MATCH RESULT', {
        fill: visual.signal,
        color: visual.signal === S3_COLORS.cyan || visual.signal === S3_COLORS.gold ? S3_COLORS.text : S3_COLORS.inverseText,
      });
      this.text(region.x + 16, region.y + 43, model.hero.toUpperCase(), {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        fontSize: region.h < 145 ? '27px' : '31px',
        fontStyle: '900',
        color: S3_COLORS.text,
      });

      const summary = model.winnerName
        ? `${model.winnerName} secured the field.`
        : model.outcome === 'draw'
          ? 'Neither side secured the field.'
          : model.outcome === 'no_contest'
            ? 'The match ended without a winner.'
            : 'No decisive result was recorded.';
      this.text(region.x + 16, region.y + 77, summary, {
        color: S3_COLORS.text,
        fontSize: `${TYPE_SCALE.body}px`,
        fontStyle: '700',
        wordWrap: { width: region.w - 32 },
      });

      if (model.winnerTeam.length && region.h >= 170) {
        const team = this.text(region.x + 16, region.y + 99, model.winnerTeam.join('  /  '), {
          color: S3_COLORS.mutedText,
          fontSize: `${TYPE_SCALE.label}px`,
          wordWrap: { width: region.w - 32 },
        });
        team.setMaxLines(2);
      }

      const routeLine = model.outcome === 'win' ? 'Victory can complete missions.'
        : model.outcome === 'loss' ? 'No mission clear was registered.'
          : model.outcome === 'draw' ? 'Draw recorded — no mission clear.'
            : model.outcome === 'no_contest' ? 'No Contest recorded — no mission clear.'
              : 'Progress state unavailable.';
      this.mono(region.x + 16, region.y + region.h - 22, routeLine.toUpperCase(), {
        color: visual.neutral ? S3_COLORS.mutedText : (model.outcome === 'loss' ? '#9A211A' : '#66501C'),
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '800',
      });
    }

    renderMetrics(region, model, visual) {
      const gap = 8;
      const cellW = (region.w - gap * 2) / 3;
      [
        { label: 'TURN', value: String(model.turns), accent: S3_COLORS.gold },
        { label: 'TOTAL IMPACT', value: String(model.damage), accent: S3_COLORS.vermilion },
        { label: 'OUTCOME', value: model.label.toUpperCase(), accent: visual.accent },
      ].forEach((metric, index) => {
        const x = region.x + index * (cellW + gap);
        drawS3Panel(this, x, region.y, cellW, region.h, {
          fill: index === 2 && visual.neutral ? S3_COLORS.smoke : S3_COLORS.bone,
          accent: metric.accent,
          alpha: 0.95,
          cut: 8,
          strokeWidth: 2,
        });
        this.mono(x + 10, region.y + 11, metric.label, {
          color: S3_COLORS.mutedText,
          fontSize: `${TYPE_SCALE.label}px`,
          fontStyle: '800',
        });
        this.text(x + 10, region.y + 31, metric.value, {
          fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
          fontSize: metric.value.length > 8 ? '13px' : '19px',
          fontStyle: '900',
          color: S3_COLORS.text,
        });
      });
    }

    renderStrikes(region, model) {
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.bone,
        accent: S3_COLORS.vermilion,
        alpha: 0.94,
        cut: 11,
      });
      this.mono(region.x + 14, region.y + 12, 'CURRENT MATCH // BIGGEST IMPACTS', {
        color: S3_COLORS.barrier,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '800',
      });
      if (!model.strikes.length) {
        this.text(region.x + 14, region.y + 44, 'No impact events were recorded.', {
          color: S3_COLORS.mutedText,
          fontSize: `${TYPE_SCALE.body}px`,
        });
        return;
      }
      const rowStep = region.h < 125 ? 26 : 30;
      model.strikes.forEach((event, index) => {
        const y = region.y + 37 + index * rowStep;
        const message = shortText(safeText(event.message), region.w < 350 ? 31 : 38);
        this.text(region.x + 14, y, message, {
          color: S3_COLORS.text,
          fontSize: `${TYPE_SCALE.body}px`,
          fontStyle: index === 0 ? '800' : '600',
        });
        this.mono(region.x + region.w - 66, y + 1, `${event.amount} DMG`, {
          color: '#9A211A',
          fontSize: `${TYPE_SCALE.label}px`,
          fontStyle: '800',
        });
      });
    }

    renderRewards(region, rewards, model) {
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.bone,
        accent: rewards.lastCompleted.length ? S3_COLORS.gold : S3_COLORS.smokeDeep,
        alpha: 0.96,
        cut: 12,
      });
      this.mono(region.x + 14, region.y + 12, 'MISSION DEBRIEF', {
        color: S3_COLORS.barrier,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '800',
      });
      this.mono(region.x + region.w - 82, region.y + 12, `${rewards.completedCount}/${rewards.totalMissions} CLEAR`, {
        color: S3_COLORS.mutedText,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '800',
      });
      drawS3Progress(this, region.x + 14, region.y + 34, region.w - 28, rewards.ratio, {
        fill: rewards.lastCompleted.length ? S3_COLORS.gold : S3_COLORS.smokeDeep,
      });

      const completedLabel = rewards.missionTitles.length
        ? rewards.missionTitles.join(' / ')
        : model.outcome === 'win' ? 'No new mission completed this match.' : 'No mission completion registered.';
      const routeText = this.text(region.x + 14, region.y + 49, completedLabel, {
        color: S3_COLORS.text,
        fontSize: `${TYPE_SCALE.subtitle}px`,
        fontStyle: '900',
        wordWrap: { width: region.w - 28 },
      });
      routeText.setMaxLines(2);

      const rewardTitles = rewards.rewards.map((reward) => reward.title);
      const rewardLabel = rewardTitles.length ? rewardTitles.join(' / ') : 'No new reward unlocked.';
      this.mono(region.x + 14, region.y + (region.h < 155 ? 83 : 91), rewardTitles.length ? 'REWARD SECURED' : 'REWARD STATUS', {
        color: rewardTitles.length ? '#66501C' : S3_COLORS.mutedText,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '800',
      });
      const rewardText = this.text(region.x + 14, region.y + (region.h < 155 ? 100 : 110), rewardLabel, {
        color: S3_COLORS.text,
        fontSize: `${TYPE_SCALE.body}px`,
        fontStyle: rewardTitles.length ? '800' : '600',
        wordWrap: { width: region.w - 28 },
      });
      rewardText.setMaxLines(2);

      if (region.h >= 190 && rewards.rewards[0] && rewards.rewards[0].description) {
        const description = this.text(region.x + 14, region.y + 148, rewards.rewards[0].description, {
          color: S3_COLORS.mutedText,
          fontSize: `${TYPE_SCALE.label}px`,
          wordWrap: { width: region.w - 28 },
        });
        description.setMaxLines(2);
      }
    }

    render() {
      const frame = this.layout.frame();
      const layout = resultLayout(frame);
      this.clearSurface();
      drawS3World(this, frame, STORM_WORLD_KEY, { topAlpha: 0.42, bottomAlpha: 0.79 });

      const state = this.store.state;
      const model = resultModel(state, this.store.mineId());
      const visual = outcomeVisual(model.outcome);
      const rewards = missionRewardModel(state, this.store.firstCreationProfile(), this.store.missions());

      this.renderHeader(layout.header, model);
      this.renderHero(layout.hero, model, visual);
      this.renderMetrics(layout.metrics, model, visual);
      this.renderStrikes(layout.strikes, model);
      this.renderRewards(layout.rewards, rewards, model);

      drawS3Button(this, layout.buttons.rematch.x, layout.buttons.rematch.y, layout.buttons.rematch.w, layout.buttons.rematch.h, 'REMATCH', () => this.store.changeScene('DraftScene'), {
        fill: S3_COLORS.gold,
        accent: S3_COLORS.cyan,
        color: S3_COLORS.text,
      });
      drawS3Button(this, layout.buttons.lobby.x, layout.buttons.lobby.y, layout.buttons.lobby.w, layout.buttons.lobby.h, 'RETURN HOME', () => this.store.resetToLobby(), {
        fill: S3_COLORS.inkBlue,
        accent: S3_COLORS.vermilion,
      });
      this.toast(frame, { y: layout.buttons.rematch.y - 48, theme: 'light' });
    }
  }
