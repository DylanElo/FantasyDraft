import { COLORS } from '../core/runtime-config.js?v=18';
import { clamp, shortText, titleize } from '../core/text.js?v=18';
import { BaseScene } from './base-scene.js?v=18';

export class MissionMapScene extends BaseScene {
    constructor() {
      super('MissionMapScene');
    }

    renderMissionCard(mission, x, y, w, h, index) {
      const tone = index === 0 ? COLORS.selection : COLORS.talismanDim;
      this.cardPanel(x, y, w, h, tone, 0.74);
      this.mono(x + 14, y + 12, titleize(mission.tier || 'starter').toUpperCase(), { color: COLORS.paperText, fontSize: '8px' });
      this.text(x + 14, y + 29, shortText(mission.title || mission.id, 31), { fontSize: '15px', fontStyle: '900' });
      this.mono(x + 14, y + 56, shortText(mission.description || 'Clear this route to unlock the next dossier.', 58), {
        color: COLORS.text,
        fontSize: '8px',
      });
      (mission.objectives || []).slice(0, 2).forEach((objective, objectiveIndex) => {
        this.mono(x + 16, y + 82 + objectiveIndex * 18, `- ${shortText(objective, 44)}`, { color: COLORS.muted, fontSize: '8px' });
      });
      this.mono(x + 14, y + h - 51, 'RECOMMENDED TEAM', { color: COLORS.paperText, fontSize: '8px' });
      (mission.recommended_team || []).slice(0, 3).forEach((id, portraitIndex) => {
        this.portrait(this.store.character(id), x + 14 + portraitIndex * 39, y + h - 36, 30, { tone });
      });
      this.button(x + w - 114, y + h - 42, 96, 30, 'Use Team', () => this.store.applyRecommendedTeam(mission), {
        fill: COLORS.surfaceRaised,
        stroke: tone,
        mono: true,
        fontSize: '8px',
      });
    }

    renderLockedRoutes(frame, y) {
      const x = frame.x + frame.gutter;
      this.cardPanel(x, y, frame.width - 32, 92, COLORS.line, 0.58);
      this.mono(x + 14, y + 12, 'LOCKED ROUTES', { color: COLORS.muted, fontSize: '8px' });
      ['Shibuya Incident', 'Culling Game', 'Shinjuku Showdown'].forEach((route, index) => {
        const rx = x + 14 + index * ((frame.width - 60) / 3);
        this.graphics.fillStyle(COLORS.inkBlack, 0.76);
        this.graphics.fillRoundedRect(rx, y + 35, (frame.width - 76) / 3, 36, 12);
        this.graphics.lineStyle(1, COLORS.line, 0.54);
        this.graphics.strokeRoundedRect(rx, y + 35, (frame.width - 76) / 3, 36, 12);
        this.mono(rx + 8, y + 47, shortText(route, 13), { color: COLORS.dim, fontSize: '7px' });
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      this.topBar(frame, 'Mission Map', () => this.store.changeScene('LobbyScene'));
      const x = frame.x + frame.gutter;
      const missions = this.store.missions();
      const pageSize = frame.height < 790 ? 1 : 2;
      const maxPage = Math.max(0, Math.ceil(missions.length / pageSize) - 1);
      this.store.missionPage = clamp(this.store.missionPage, 0, maxPage);
      const page = missions.slice(this.store.missionPage * pageSize, this.store.missionPage * pageSize + pageSize);
      let y = 92;
      this.cardPanel(x, y, frame.width - 32, 74, COLORS.selection, 0.66);
      this.text(x + 16, y + 13, 'Student Era Route', {
        fontFamily: '"Lilita One", Inter, sans-serif',
        fontSize: '18px',
        fontStyle: '900',
      });
      this.mono(x + 18, y + 44, 'Clear starter missions to reveal later arcs.', { color: COLORS.text, fontSize: '9px' });
      y += 94;
      page.forEach((mission, index) => {
        this.renderMissionCard(mission, x, y + index * 158, frame.width - 32, 142, this.store.missionPage * pageSize + index);
      });
      y += page.length * 158 + 4;
      this.renderLockedRoutes(frame, Math.min(y, frame.height - 212));

      this.button(x, frame.height - 106, 78, 34, 'Prev', () => {
        this.store.missionPage = Math.max(0, this.store.missionPage - 1);
        this.store.notify();
      }, { disabled: this.store.missionPage === 0, fill: COLORS.surfaceRaised, mono: true, fontSize: '9px' });
      this.mono(x + 94, frame.height - 96, `Route ${this.store.missionPage + 1}/${maxPage + 1}`, { color: COLORS.muted, fontSize: '9px' });
      this.button(x + frame.width - 108, frame.height - 106, 76, 34, 'Next', () => {
        this.store.missionPage = Math.min(maxPage, this.store.missionPage + 1);
        this.store.notify();
      }, { disabled: this.store.missionPage === maxPage, fill: COLORS.surfaceRaised, mono: true, fontSize: '9px' });
      this.button(x, frame.height - 58, frame.width - 32, 42, 'First Creation', () => this.store.changeScene('FirstCreationScene'), {
        fill: COLORS.selection,
        gradientTop: COLORS.talismanDim,
        stroke: COLORS.talismanPaper,
        color: '#08080a',
        fontSize: '13px',
      });
      this.toast(frame);
    }
  }
