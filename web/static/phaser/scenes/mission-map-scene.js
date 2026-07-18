import { TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=32';
import { titleize } from '../core/text.js?v=32';
import {
  S3_COLORS,
  drawS3Button,
  drawS3Header,
  drawS3Panel,
  drawS3Portrait,
  drawS3Progress,
  drawS3World,
} from '../ui/season-three-ui.js?v=32';
import { BaseScene } from './base-scene.js?v=32';

const MISSION_WORLD_KEY = 'culling-current-map';
const ROUTE_X = Object.freeze([0.22, 0.69, 0.31, 0.72, 0.25, 0.67, 0.48]);

function missionMapComposition(frame) {
  const gutter = frame.width <= 360 ? 10 : 12;
  const x = frame.x + gutter;
  const w = frame.width - gutter * 2;
  const headerH = 62;
  const detailH = frame.bottom - frame.top < 735 ? 174 : 184;
  const detail = { x, y: frame.bottom - detailH, w, h: detailH };
  const map = {
    x,
    y: frame.top + headerH + 8,
    w,
    h: detail.y - (frame.top + headerH + 8) - 8,
  };
  return { map, detail };
}

export class MissionMapScene extends BaseScene {
    constructor() {
      super('MissionMapScene');
      this.detailMissionId = null;
      this.routeEntrancePlayed = false;
    }

    missionStatus(mission) {
      const completed = new Set(this.store.firstCreationProfile().completed_missions || []);
      const active = this.store.activeMission();
      if (completed.has(mission.id)) return { label: 'CLEARED', fill: S3_COLORS.green, accent: S3_COLORS.cyan };
      if (active && active.id === mission.id) return { label: 'ACTIVE', fill: S3_COLORS.cyan, accent: S3_COLORS.gold };
      return { label: 'OPEN', fill: S3_COLORS.bone, accent: S3_COLORS.red };
    }

    routePoints(region, count) {
      const top = region.y + 52;
      const bottom = region.y + region.h - 30;
      const step = count > 1 ? (bottom - top) / (count - 1) : 0;
      return Array.from({ length: count }, (_unused, index) => ({
        x: region.x + region.w * (ROUTE_X[index] ?? (index % 2 ? 0.68 : 0.3)),
        y: top + index * step,
      }));
    }

    renderRoute(region, missions, selectedMission) {
      const g = this.graphics;
      const points = this.routePoints(region, missions.length);
      g.fillStyle(S3_COLORS.ink, 0.18);
      g.fillRect(region.x, region.y, region.w, region.h);
      g.lineStyle(10, S3_COLORS.ink, 0.18);
      g.beginPath();
      points.forEach((point, index) => {
        if (index === 0) g.moveTo(point.x, point.y);
        else g.lineTo(point.x, point.y);
      });
      g.strokePath();
      g.lineStyle(3, S3_COLORS.cyan, 0.82);
      g.beginPath();
      points.forEach((point, index) => {
        if (index === 0) g.moveTo(point.x, point.y);
        else g.lineTo(point.x, point.y);
      });
      g.strokePath();

      const introNodes = [];
      missions.forEach((mission, index) => {
        const point = points[index];
        const status = this.missionStatus(mission);
        const selected = selectedMission && selectedMission.id === mission.id;
        const radius = selected ? 26 : 23;
        g.fillStyle(S3_COLORS.ink, 0.5);
        g.fillCircle(point.x + 3, point.y + 4, radius + 4);
        g.fillStyle(status.fill, 0.98);
        g.fillCircle(point.x, point.y, radius);
        g.lineStyle(selected ? 4 : 2.5, selected ? S3_COLORS.gold : status.accent, 0.98);
        g.strokeCircle(point.x, point.y, radius);
        g.lineStyle(1, S3_COLORS.ink, 0.36);
        g.strokeCircle(point.x, point.y, Math.max(10, radius - 8));
        const number = this.text(point.x, point.y - 12, String(index + 1).padStart(2, '0'), {
          fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
          color: status.label === 'CLEARED' ? '#FFFFFF' : S3_COLORS.inkText,
          fontSize: '17px',
          fontStyle: '900',
        }).setOrigin(0.5, 0).setDepth(7);
        introNodes.push(number);

        const labelW = Math.min(132, region.w * 0.39);
        const labelX = point.x < region.x + region.w / 2
          ? point.x + radius + 7
          : point.x - radius - 7 - labelW;
        const labelY = point.y - 21;
        g.fillStyle(S3_COLORS.bone, selected ? 0.98 : 0.86);
        g.fillRect(labelX, labelY, labelW, 42);
        g.fillStyle(selected ? S3_COLORS.gold : status.accent, 0.96);
        g.fillRect(labelX, labelY, 4, 42);
        this.mono(labelX + 8, labelY + 4, status.label, {
          color: S3_COLORS.redText,
          fontSize: '9px',
          fontStyle: '900',
        });
        this.text(labelX + 8, labelY + 16, mission.title || mission.id, {
          color: S3_COLORS.inkText,
          fontSize: '9px',
          fontStyle: selected ? '900' : '700',
          lineSpacing: -1,
          wordWrap: { width: labelW - 12 },
        }).setMaxLines(2);
        this.registerHitTarget(point.x - 26, point.y - 26, 52, 52, `Select mission ${mission.title || mission.id}`, () => {
          this.detailMissionId = mission.id;
        }, { cue: 'select' });
      });

      const finalPoint = points[points.length - 1];
      if (finalPoint) {
        const sealX = region.x + 8;
        const sealY = region.y + region.h - 12;
        g.lineStyle(2, S3_COLORS.red, 0.55);
        g.beginPath();
        g.moveTo(finalPoint.x, finalPoint.y + 25);
        g.lineTo(sealX, sealY);
        g.strokePath();
        this.mono(sealX, sealY - 5, 'LATER INCIDENTS // SEALED', {
          color: '#FFF4ED',
          fontSize: '9px',
          fontStyle: '900',
          stroke: '#101828',
          strokeThickness: 3,
        });
      }

      if (!this.routeEntrancePlayed && this.presentationLayer) {
        this.routeEntrancePlayed = true;
        this.presentationLayer.sceneIntro(this, {
          targets: introNodes,
          options: { distance: 16, stagger: 55, duration: 260 },
        });
      }
    }

    renderSelectedMission(region, mission, missionIndex, totalMissions) {
      const status = this.missionStatus(mission);
      drawS3Panel(this, region.x, region.y, region.w, region.h, {
        fill: S3_COLORS.paper,
        accent: status.accent,
        cut: 12,
        strokeWidth: 2.5,
        washAlpha: 0.12,
      });
      this.mono(region.x + 13, region.y + 9, `ROUTE ${String(missionIndex + 1).padStart(2, '0')} / ${String(totalMissions).padStart(2, '0')} // ${status.label}`, {
        color: S3_COLORS.redText,
        fontSize: '10px',
        fontStyle: '900',
      });
      const title = this.text(region.x + 13, region.y + 25, mission.title || mission.id, {
        fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
        color: S3_COLORS.inkText,
        fontSize: region.w <= 340 ? '17px' : '19px',
        fontStyle: '900',
        wordWrap: { width: region.w - 26 },
      });
      title.setMaxLines(1);
      const description = this.text(region.x + 13, region.y + 50, mission.description || 'Clear this route to reveal the next mission file.', {
        color: S3_COLORS.mutedText,
        fontSize: '11px',
        lineSpacing: 1,
        wordWrap: { width: region.w - 26 },
      });
      description.setMaxLines(2);

      const objectives = (mission.objectives || []).slice();
      this.mono(region.x + 13, region.y + 87, `${objectives.length} OBJECTIVES // ${titleize((mission.unlocks || [])[0] || 'profile progress').toUpperCase()}`, {
        color: '#9A211A',
        fontSize: '9px',
        fontStyle: '900',
      });
      this.mono(region.x + 13, region.y + 107, 'RECOMMENDED TRIO', {
        color: S3_COLORS.inkText,
        fontSize: '9px',
        fontStyle: '900',
      });
      const portraitY = region.y + region.h - 48;
      (mission.recommended_team || []).slice(0, 3).forEach((id, index) => {
        drawS3Portrait(this, this.store.character(id), region.x + 13 + index * 42, portraitY, 38, 38, {
          accent: status.accent,
        });
      });
      const actionW = Math.min(166, region.w * 0.46);
      drawS3Button(this, region.x + region.w - actionW - 12, region.y + region.h - 50, actionW, 44, 'SELECT THIS TRIO', () => this.store.applyRecommendedTeam(mission), {
        variant: 'primary',
        accent: S3_COLORS.cyan,
        fontSize: region.w <= 340 ? '13px' : '14px',
      });
    }

    render() {
      const frame = this.layout.frame();
      const layout = missionMapComposition(frame);
      this.clearSurface();
      drawS3World(this, frame, MISSION_WORLD_KEY, { imageAlpha: 0.94, washAlpha: 0.12 });
      drawS3Header(this, frame, {
        eyebrow: 'Student Era Route // Colony Map',
        title: 'Mission Map',
        accent: S3_COLORS.cyan,
        backHandler: () => this.store.changeScene('LobbyScene'),
      });
      drawS3Button(this, frame.x + frame.width - 110, frame.top + 9, 44, 44, 'TEAM', () => this.store.openFirstCreation(), {
        variant: 'bone',
        accent: S3_COLORS.gold,
        fontSize: '9px',
        mono: true,
      });

      const missions = this.store.missions();
      const completed = (this.store.firstCreationProfile().completed_missions || []).length;
      const active = this.store.activeMission();
      const selected = missions.find((mission) => mission.id === this.detailMissionId) || active || missions[0];
      if (!this.detailMissionId && selected) this.detailMissionId = selected.id;

      this.mono(layout.map.x + 8, layout.map.y + 7, `${completed}/${missions.length} ROUTES CLEARED`, {
        color: '#FFFFFF',
        fontSize: '10px',
        fontStyle: '900',
        stroke: '#101828',
        strokeThickness: 3,
      }).setDepth(9);
      drawS3Progress(this, layout.map.x + 8, layout.map.y + 24, Math.min(118, layout.map.w * 0.36), 6, completed / Math.max(1, missions.length), {
        fill: S3_COLORS.cyan,
      });
      this.renderRoute(layout.map, missions, selected);
      if (selected) this.renderSelectedMission(layout.detail, selected, Math.max(0, missions.indexOf(selected)), missions.length);
      this.toast(frame, { y: layout.detail.y - 46, theme: 'light' });
      this.renderPresentationSettingsSheet(frame);
    }
  }
