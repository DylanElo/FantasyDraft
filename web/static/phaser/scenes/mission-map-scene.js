import { TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=28';
import { clamp, titleize } from '../core/text.js?v=28';
import {
  S3_COLORS,
  drawS3Button,
  drawS3Chip,
  drawS3Header,
  drawS3Pager,
  drawS3Panel,
  drawS3Portrait,
  drawS3Progress,
  drawS3World,
  missionMapS3Layout,
} from '../ui/season-three-ui.js?v=28';
import { BaseScene } from './base-scene.js?v=28';

const MISSION_WORLD_KEY = 'culling-current-map';

export class MissionMapScene extends BaseScene {
    constructor() {
      super('MissionMapScene');
      this.detailMissionId = null;
    }

    renderS3Section(x, y, label, right, accent = S3_COLORS.red) {
      this.mono(x, y, label, {
        color: S3_COLORS.inkText,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '900',
      });
      const lineStart = Math.min(right - 18, x + Math.max(94, label.length * 7 + 16));
      this.graphics.lineStyle(2, accent, 0.72);
      this.graphics.beginPath();
      this.graphics.moveTo(lineStart, y + 6);
      this.graphics.lineTo(right, y + 6);
      this.graphics.strokePath();
    }

    missionStatus(mission) {
      const profile = this.store.firstCreationProfile();
      const completed = new Set(profile.completed_missions || []);
      const active = this.store.activeMission();
      if (completed.has(mission.id)) {
        return { label: 'CLEARED', fill: S3_COLORS.green, accent: S3_COLORS.cyan };
      }
      if (active && active.id === mission.id) {
        return { label: 'ACTIVE ROUTE', fill: S3_COLORS.cyanDeep, accent: S3_COLORS.cyan };
      }
      return { label: titleize(mission.tier || 'starter').toUpperCase(), fill: S3_COLORS.ink, accent: S3_COLORS.gold };
    }

    renderMissionCard(mission, x, y, w, h) {
      const status = this.missionStatus(mission);
      drawS3Panel(this, x, y, w, h, {
        fill: status.label === 'CLEARED' ? 0xe2ece2 : S3_COLORS.paper,
        accent: status.accent,
        strokeWidth: status.label === 'ACTIVE ROUTE' ? 3 : 2,
        cut: 9,
        washAlpha: 0.24,
      });
      this.registerHitTarget(x, y, w, h, `Inspect mission ${mission.title || mission.id}`, () => {
        this.detailMissionId = mission.id;
      });
      drawS3Chip(this, x + 12, y + 10, status.label, {
        fill: status.fill,
        stroke: status.accent,
        fontSize: '12px',
      });
      drawS3Chip(this, x + w - 116, y + 10, `${(mission.objectives || []).length} OBJECTIVES`, {
        w: 104,
        fill: S3_COLORS.bone,
        color: S3_COLORS.inkText,
        stroke: S3_COLORS.red,
        fontSize: '12px',
      });
      const title = this.text(x + 12, y + 38, mission.title || mission.id, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
        color: S3_COLORS.inkText,
        fontSize: '17px',
        fontStyle: '900',
        lineSpacing: 0,
        wordWrap: { width: w - 24 },
      });
      title.setMaxLines(2);
      const description = this.text(x + 12, y + 63, mission.description || 'Clear this route to reveal the next path.', {
        color: S3_COLORS.mutedText,
        fontSize: `${TYPE_SCALE.label}px`,
        lineSpacing: 1,
        wordWrap: { width: w - 24 },
      });
      description.setMaxLines(2);
      (mission.objectives || []).slice(0, 2).forEach((objective, objectiveIndex) => {
        const objectiveNode = this.text(x + 14, y + 98 + objectiveIndex * 27, `— ${objective}`, {
          color: S3_COLORS.inkText,
          fontSize: `${TYPE_SCALE.label}px`,
          lineSpacing: 0,
          wordWrap: { width: w - 28 },
        });
        objectiveNode.setMaxLines(1);
      });
      const teamY = y + h - 48;
      this.mono(x + 12, teamY - 15, 'RECOMMENDED TRIO', {
        color: S3_COLORS.inkText,
        fontSize: '12px',
        fontStyle: '900',
      });
      (mission.recommended_team || []).slice(0, 3).forEach((id, portraitIndex) => {
        drawS3Portrait(this, this.store.character(id), x + 12 + portraitIndex * 32, teamY, 27, 27, {
          accent: status.accent,
        });
      });
      drawS3Button(this, x + w - 108, y + h - 52, 96, 44, 'Use Team', () => this.store.applyRecommendedTeam(mission), {
        variant: status.label === 'ACTIVE ROUTE' ? 'primary' : 'bone',
        accent: status.accent,
        fontSize: '12px',
        mono: true,
      });
    }

    renderLockedRoutes(layout) {
      const { x, y, w, h } = layout.locked;
      drawS3Panel(this, x, y, w, h, {
        fill: S3_COLORS.smoke,
        accent: S3_COLORS.red,
        alpha: 0.95,
        cut: 7,
        washAlpha: 0.28,
      });
      this.mono(x + 11, y + 8, 'LATER INCIDENT FILES / LOCKED', {
        color: S3_COLORS.redText,
        fontSize: '12px',
        fontStyle: '900',
      });
      const gap = 6;
      const halfW = (w - 28 - gap) / 2;
      [
        { label: 'Shibuya Incident', x: x + 11, y: y + 30, w: halfW },
        { label: 'Culling Game', x: x + 11 + halfW + gap, y: y + 30, w: halfW },
        { label: 'Shinjuku Showdown', x: x + 11, y: y + 58, w: w - 22 },
      ].forEach((route) => {
        drawS3Chip(this, route.x, route.y, route.label, {
          w: route.w,
          h: 23,
          fill: S3_COLORS.paper,
          color: S3_COLORS.mutedText,
          stroke: S3_COLORS.ink,
          fontSize: '12px',
        });
      });
    }

    renderMissionDetail(frame, mission) {
      const status = this.missionStatus(mission);
      const x = frame.x + 12;
      const y = Math.max(frame.top + 80, Math.min(Math.round(frame.height * 0.22), frame.bottom - 610));
      const w = frame.width - 24;
      const h = frame.bottom - y + 6;
      this.graphics.fillStyle(S3_COLORS.ink, 0.46);
      this.graphics.fillRect(0, 0, frame.fullWidth, frame.fullHeight);
      this.buttons.push({ x: 0, y: 0, w: frame.fullWidth, h: frame.fullHeight, label: 'Mission detail overlay', onClick: () => {}, disabled: false });
      drawS3Panel(this, x, y, w, h, {
        fill: S3_COLORS.paper,
        accent: status.accent,
        cut: 12,
        strokeWidth: 2.5,
        washAlpha: 0.3,
      });
      this.mono(x + 14, y + 12, 'AUTHORITATIVE ROUTE FILE', {
        color: S3_COLORS.redText,
        fontSize: '12px',
        fontStyle: '900',
      });
      const title = this.text(x + 14, y + 31, mission.title || mission.id, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
        color: S3_COLORS.inkText,
        fontSize: '20px',
        fontStyle: '900',
        lineSpacing: 0,
        wordWrap: { width: w - 84 },
      });
      title.setMaxLines(2);
      drawS3Button(this, x + w - 54, y + 10, 44, 44, '×', () => {
        this.detailMissionId = null;
      }, { variant: 'bone', accent: S3_COLORS.red, fontSize: '16px' });
      drawS3Chip(this, x + 14, y + 61, status.label, {
        fill: status.fill,
        stroke: status.accent,
        fontSize: '12px',
      });
      const description = this.text(x + 14, y + 88, mission.description || 'Clear this route to reveal the next path.', {
        color: S3_COLORS.inkText,
        fontSize: `${TYPE_SCALE.body}px`,
        lineSpacing: 1,
        wordWrap: { width: w - 28 },
      });
      description.setMaxLines(3);

      const objectiveLabelY = y + 143;
      this.renderS3Section(x + 14, objectiveLabelY, 'MISSION OBJECTIVES', x + w - 14, S3_COLORS.cyan);
      const objectives = (mission.objectives || []).slice();
      const buttonY = frame.bottom - 50;
      const rewardY = buttonY - 126;
      const objectiveStart = objectiveLabelY + 18;
      const objectiveGap = 4;
      const objectiveH = Math.max(34, Math.min(46, Math.floor((rewardY - objectiveStart - 8 - objectiveGap * Math.max(0, objectives.length - 1)) / Math.max(1, objectives.length))));
      objectives.forEach((objective, index) => {
        const rowY = objectiveStart + index * (objectiveH + objectiveGap);
        drawS3Panel(this, x + 14, rowY, w - 28, objectiveH, {
          fill: S3_COLORS.bone,
          accent: S3_COLORS.red,
          hatch: false,
          wash: false,
          cut: 4,
          strokeWidth: 1.25,
          shadowAlpha: 0.04,
        });
        const node = this.text(x + 23, rowY + 7, `${index + 1}. ${objective}`, {
          color: S3_COLORS.inkText,
          fontSize: `${TYPE_SCALE.label}px`,
          lineSpacing: 0,
          wordWrap: { width: w - 46 },
        });
        node.setMaxLines(2);
      });

      this.mono(x + 14, rewardY, 'ROUTE REWARDS', {
        color: S3_COLORS.redText,
        fontSize: '12px',
        fontStyle: '900',
      });
      const rewards = (mission.unlocks || []).map((unlock) => titleize(unlock)).join(' / ') || 'Profile progress';
      const rewardNode = this.text(x + 14, rewardY + 18, rewards, {
        color: S3_COLORS.inkText,
        fontSize: `${TYPE_SCALE.label}px`,
        fontStyle: '800',
        wordWrap: { width: w - 28 },
      });
      rewardNode.setMaxLines(2);
      const teamY = buttonY - 72;
      this.mono(x + 14, teamY, 'RECOMMENDED TRIO', {
        color: S3_COLORS.inkText,
        fontSize: '12px',
        fontStyle: '900',
      });
      (mission.recommended_team || []).slice(0, 3).forEach((id, index) => {
        drawS3Portrait(this, this.store.character(id), x + 14 + index * 34, teamY + 17, 29, 29, {
          accent: status.accent,
        });
      });
      drawS3Button(this, x + 14, buttonY, w - 28, 50, 'Use Recommended Trio', () => this.store.applyRecommendedTeam(mission), {
        variant: 'primary',
        accent: S3_COLORS.cyan,
        fontSize: '17px',
      });
    }

    render() {
      const frame = this.layout.frame();
      const layout = missionMapS3Layout(frame);
      this.clearSurface();
      drawS3World(this, frame, MISSION_WORLD_KEY, { imageAlpha: 0.44, washAlpha: 0.72 });
      drawS3Header(this, frame, {
        eyebrow: 'STUDENT ERA / MISSION ARCHIVE',
        title: 'Mission Map',
        backHandler: () => this.store.changeScene('LobbyScene'),
      });
      const detailMission = this.detailMissionId
        ? this.store.missions().find((mission) => mission.id === this.detailMissionId)
        : null;
      if (detailMission) {
        this.renderMissionDetail(frame, detailMission);
        this.toast(frame, { y: frame.bottom - 110, theme: 'light' });
        return;
      }

      const missions = this.store.missions();
      const profile = this.store.firstCreationProfile();
      const completed = (profile.completed_missions || []).length;
      const maxPage = Math.max(0, Math.ceil(missions.length / layout.cards.pageSize) - 1);
      this.store.missionPage = clamp(this.store.missionPage, 0, maxPage);
      const page = missions.slice(
        this.store.missionPage * layout.cards.pageSize,
        this.store.missionPage * layout.cards.pageSize + layout.cards.pageSize,
      );

      drawS3Panel(this, layout.route.x, layout.route.y, layout.route.w, layout.route.h, {
        fill: S3_COLORS.bone,
        accent: S3_COLORS.red,
        cut: 8,
        washAlpha: 0.3,
      });
      this.text(layout.route.x + 12, layout.route.y + 7, 'Student Era Route', {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
        color: S3_COLORS.inkText,
        fontSize: '18px',
        fontStyle: '900',
      });
      this.text(layout.route.x + 12, layout.route.y + 32, 'Win with the listed trio. Every clear remains server-owned.', {
        color: S3_COLORS.mutedText,
        fontSize: '12px',
        wordWrap: { width: layout.route.w - 112 },
      }).setMaxLines(2);
      drawS3Progress(this, layout.route.x + 12, layout.route.y + 53, layout.route.w - 108, 6, completed / Math.max(1, missions.length), {
        fill: S3_COLORS.cyan,
      });
      this.mono(layout.route.x + layout.route.w - 86, layout.route.y + 49, `${completed}/${missions.length} CLEAR`, {
        color: S3_COLORS.inkText,
        fontSize: '12px',
        fontStyle: '900',
      });

      page.forEach((mission, index) => {
        this.renderMissionCard(
          mission,
          layout.cards.x,
          layout.cards.y + index * (layout.cards.h + layout.cards.gap),
          layout.cards.w,
          layout.cards.h,
        );
      });
      this.renderLockedRoutes(layout);
      drawS3Pager(this, layout.pager, `Route ${this.store.missionPage + 1}/${maxPage + 1}`, () => {
        this.store.missionPage = Math.max(0, this.store.missionPage - 1);
        this.store.notify();
      }, () => {
        this.store.missionPage = Math.min(maxPage, this.store.missionPage + 1);
        this.store.notify();
      }, {
        prevDisabled: this.store.missionPage === 0,
        nextDisabled: this.store.missionPage === maxPage,
        buttonW: 76,
      });
      drawS3Button(this, layout.cta.x, layout.cta.y, layout.cta.w, layout.cta.h, 'First Creation', () => this.store.openFirstCreation(), {
        variant: 'primary',
        accent: S3_COLORS.cyan,
        fontSize: '18px',
      });
      this.toast(frame, { y: layout.toastY, theme: 'light' });
    }
  }
